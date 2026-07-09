---
title: "Frontend off Vercel — Cloud Run behind a Cloudflare edge"
slug: frontend-vercel-to-cloudrun
status: scaffolded
area: "09"
type: chore
priority: "Next up"
risk: high
epic: "09-platform-infra/frontend-vercel-to-cloudrun"
build_order: null
updated: 2026-07-09
---

# Frontend off Vercel — Cloud Run behind a Cloudflare edge

**Class:** Chore / **Maintainer** (mature-system infra; no user-facing change when done right).
**Stage-2.5 bucket:** genuinely new — no existing capability serves this; but the *driver* was
re-validated during grooming (see below) because the PRD's original egress rationale is partly stale.

## Overview — what and why

Migrate `apps/miyagisanchez` (Next.js 16 App Router) from Vercel to **Cloud Run (us-east4)**, the
same rail `apps/backend` already ships on, behind a **Cloudflare edge that fronts everything**
(apex, `*.miyagisanchez.com` wildcard, tenant custom domains via Cloudflare for SaaS, CDN, bot
protection). Vercel is retained **only** as the per-PR preview + CI target.

**Driver (Daniel, groom session 2026-07-09):** control/timeouts (Vercel function limits — the
~4.5 MB body ceiling and function timeouts have bitten features repeatedly, see LEARNINGS), 
latency/locality (frontend + backend + Cloud SQL in one VPC/region), and strategic consolidation
(one deploy rail, less vendor surface). **Not primarily cost** — the historic egress root cause
(Neon-AWS ↔ GCP) was already solved by `postgres-neon-to-cloudsql`, and
`vercel-function-cost-reduction` + `marketplace-static-shell` already cut the Vercel compute bill.

## Architecture decision (grooming outcome)

Chosen base: **"Cloudflare fronts everything"** — a lighter variant than the PRD's hybrid
(PRD kept GCP Global LB + Cloud CDN + Certificate Manager for apex/wildcard, Cloudflare only for
tenant domains). Instead:

```
Buyer/tenant DNS ──► Cloudflare (DNS zone · CDN · WAF/bot · Universal SSL · SSL-for-SaaS)
                        │  proxied, Host passed through
                        ▼
                GCP External ALB (serverless NEG, NO Cloud CDN, one-time origin certs)
                        ▼
                Cloud Run `miyagi-web` (Next.js standalone + sharp, min instances TBD)
```

- **One edge, not two.** Cloudflare replaces Vercel's CDN **and** its Bot Protection/firewall
  (which currently mitigates probe traffic — LEARNINGS `x-vercel-mitigated`). No Cloud CDN, no
  programmatic Certificate Manager / URL-map manipulation — the PRD's "heavy lift" Path B work
  disappears entirely.
- **Tenant custom domains = Cloudflare for SaaS custom hostnames.** Mirrors today's Vercel API
  pattern (create hostname → poll validation → delete). Pricing confirmed current 2026-07-09:
  first 100 hostnames free, then $0.10/hostname/mo, PAYG cap now 50k
  ([Cloudflare docs](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/)).
- **The ALB stays** (thin): Cloudflare needs a stable origin IP; the LB terminates TLS with
  one-time certs (Cloudflare Origin CA covering apex + wildcard + the SSL-for-SaaS fallback
  origin) and passes `Host`/`X-Forwarded-*` through so `lib/channel.ts` keeps routing white-label
  shops. No per-tenant LB mutation ever.
- **DNS zone moves NS Vercel → Cloudflare.** Staged exactly per the LEARNINGS subdomains-epic
  scar tissue: export the real zone (Clerk + 3 email systems live in it), stage every record in
  the Cloudflare zone first, verify by querying Cloudflare's NS directly, then flip NS — with
  records still pointing at Vercel, so the NS move is decoupled from the traffic cutover.
- **Previews stay on Vercel** (Daniel's call): per-PR SSO-gated previews + the CI Playwright
  gate keep working unchanged (`*.vercel.app` URLs don't depend on the domain or NS). Trade-off
  accepted: preview no longer proves the container/edge topology → S4 adds one pre-cutover
  staging smoke against the full Cloudflare→LB→Cloud Run path.
- **Crons → Cloud Scheduler hitting the same `/api/cron/*` routes**, via **OIDC direct to the
  Cloud Run service URL** — deliberately outside the public edge path (one ingress posture per
  consumer: humans/agents come through Cloudflare, Scheduler comes through IAM). Zero route
  rewrites; matches the LEARNINGS "internal auth, not public edge cron" rule. Ownership verified
  during grooming: `order-autoconfirm` delegates all Medusa order mutation to
  `apps/backend`'s `/internal/autoconfirm-delivered`; the other three touch Supabase-only
  concerns (Rule 1 holds — no commerce logic re-homed). **Double-fire hazard:** the vercel.json
  cron block is removed in the same change that arms Cloud Scheduler — `order-autoconfirm` is a
  money path and must fire exactly once. The swap ships as **its own rehearsed release** (S3),
  decoupled from DNS cutover day.

> **Cross-agent planning panel — run 2026-07-09 (Codex, both lenses; complementary, no
> contradictions).** Outcomes folded into this seed:
> - **Purist:** cron ownership validated by direct read — `order-autoconfirm` delegates order
>   mutation to the backend-owned Medusa route (`POST ${MEDUSA_BASE}/internal/autoconfirm-delivered`);
>   its residual Supabase leg touches only legacy *manual* orders (pre-existing behavior, out of
>   scope here). UCP/MCP acceptance thickened into a named cutover checklist (below). Provider-
>   shaped state found and scoped: `marketplace_shops.custom_domain_vercel_ok` (see S4.1).
> - **Pragmatist:** re-sliced — the skateboard is **canonical cutover first** (apex/wildcard/UCP/
>   crons on Cloud Run while live tenant domains stay on Vercel through the soak); tenant-domain
>   migration is earned after platform proof. Cron swap is its own rehearsed money-path release,
>   not bundled into DNS cutover day. One boring ingress rule: **Cloud Scheduler → OIDC direct to
>   Cloud Run, explicitly outside the public edge path**; the ALB stays Cloudflare-only.

## What already exists (reuse, don't rebuild)

- **`infra/gcp/`** — `deploy.sh`, `cicd-setup.sh`, `provision-monitoring.sh`, staging scripts,
  `test/deploy-invariants.test.js` (drift guard pattern). Clone the backend's Cloud Build trigger
  shape (`backend-main-deploy`, us-east4) as the PRD suggests; extend the drift-guard pattern to
  the new service.
- **`apps/backend/cloudbuild.yaml`** — the image-only deploy rail to mirror (LEARNINGS: env/
  secrets/SA set once via script, preserved across deploys; Secret Manager `:latest` traps).
- **`lib/vercel-domains.ts` (223 L) + `app/api/sell/shop/domain/route.ts` + `lib/domain-utils.ts`
  (`CNAME_TARGET`, `dnsRecordFor`) + `lib/domain-lapse-server.ts`** — the seam to swap. The
  public API shape (add/status/remove + `DomainConflictError` 409 mapping) survives; only the
  provider behind it changes.
- **`app/api/sell/shop/domain/cloudflare/route.ts`** — tenant-side one-click DNS automation
  (tenant's own CF token). Survives; only its CNAME target changes.
- **`lib/channel.ts` + `middleware.ts`** — hostname/channel detection; untouched logic, but S2
  must prove header passthrough end-to-end.
- **In-house flags (`platform_flags` / `isEnabled()`)** — Edge-Config-free since
  `feature-flags-inhouse`; middleware has no Vercel-only flag dependency to unwind.
- **Monitoring** — uptime checks + alert policies provisioning script (backend-prod-readiness S4)
  extends to the new service; Error Reporting is already the GCP-native pattern.
- **CI/CD Telegram** — backend deploy-finish already flows via Cloud Build Pub/Sub; the frontend
  prod-deploy notification moves onto that existing rail (the Vercel poll stays for previews).

## In scope (v1)

1. Containerize the frontend (`output: 'standalone'`, Dockerfile with sharp, multi-stage, copy
   `public/` + `.next/static`), convert the two `runtime='edge'` routes (`/api/splash`,
   `/api/icon`) to Node.
2. Cloud Build CI/CD for the frontend → Artifact Registry → Cloud Run `miyagi-web`, shadow-mode
   (dark URL) alongside Vercel; env/secret migration to Secret Manager — **Vercel Sensitive vars
   are write-only (LEARNINGS), so secrets are re-minted from provider dashboards, never "copied".**
3. Cloudflare zone (staged from the real Vercel zone export incl. Clerk + email), NS flip,
   external ALB + serverless NEG + origin certs, header-passthrough proof, WAF/bot config.
4. `lib/vercel-domains.ts` → `lib/cloudflare-domains.ts` (custom hostnames API, fallback origin),
   `CNAME_TARGET`/`dnsRecordFor` update, migration of every existing live tenant custom domain,
   `dns-doctor`-style verification against Cloudflare's status API instead of Vercel's.
5. Crons → Cloud Scheduler (armed at cutover, vercel.json crons removed same change).
6. Canonical cutover **before** tenant-domain migration (panel re-slice): Clerk/Stripe/
   MercadoPago webhook + CORS allow-lists, a named UCP/MCP cutover checklist (manifest, base
   URLs, checkout-session links, CORS, agent-facing canonical domain), apex/wildcard flip,
   `mschz.org` redirector, monitoring; tenant domains migrate after the soak proves the rail;
   then Vercel prod-deploy disable (previews kept) + docs update (AGENTS.md deploy topology,
   WAYS-OF-WORKING deploy sections).

## Out of scope (v1)

- Any change to Medusa backend, Supabase, Clerk, R2 (PRD exclusions stand).
- Replacing Vercel previews (kept deliberately — revisit only if the preview/prod gap bites).
- Moving cron *logic* into Medusa scheduled jobs (Scheduler → same routes chosen; per-cron
  re-homing is a later chore if wanted).
- Image-CDN offload (sharp in-container first; revisit if CPU cost shows up).
- Cloud CDN / Certificate Manager per-tenant automation (Path B — explicitly rejected).
- Multi-region. us-east4 only, like the backend.

## Sprints & stories (skateboard → car; re-sliced per the planning panel)

**S1 — Containerize + shadow rail (all deployable dark; Vercel untouched)**
1. Convert `/api/splash` + `/api/icon` edge→Node — LOW, **first story deliberately**: reversible,
   Vercel-compatible, flushes hidden Vercel-runtime assumptions before any infra spend (panel).
   QA: api spec asserting both routes' bytes/headers.
2. Standalone build + Dockerfile (sharp in runner stage; deps/builder/runner) — LOW. QA: image
   builds + boots locally; `next build` parity in CI.
3. Cloud Build trigger + Artifact Registry + Cloud Run `miyagi-web` + secrets re-mint (script'd,
   idempotent, drift-guarded like `deploy.sh`) — HIGH (shared infra). QA: `node:test` config
   guard (deploy-invariants pattern); dark-URL browser smoke.
4. Shadow soak: every merge deploys both rails; **existing Playwright/API suite against the dark
   URL with canonical host headers, plus `/api/ucp/mcp` + `/api/ucp/manifest`** (the panel's
   checkable claim, run as a suite) — LOW. QA: the suite itself; ISR'd pages watched explicitly.

**S2 — Cloudflare edge + GCP origin (traffic still on Vercel)**
1. Cloudflare zone staged from real Vercel zone export (Clerk + 3 email systems verified record-
   by-record), verify via direct NS query, then NS flip with records still targeting Vercel —
   HIGH (DNS, auth/email blast radius). QA: scripted zone-diff (export vs staged) + post-flip
   `dig @cloudflare-ns` checks; Daniel eyeballs Clerk login + a test email round-trip.
2. External ALB + serverless NEG + Cloudflare Origin CA certs + `gcp.miyagisanchez.com` proxied
   end-to-end — HIGH (shared infra). QA: header-passthrough api spec (Host, XFF, proto →
   `detectChannel` correct on all channels); ALB ingress locked to Cloudflare only.
3. WAF/bot rules ≈ parity with Vercel Bot Protection (probe paths 403 at edge) — LOW. QA: spec
   updated for the new mitigation header (the old `x-vercel-mitigated` spec shape).

**S3 — Canonical cutover (the skateboard ships; tenant domains stay on Vercel)**
1. **Cron swap as its own rehearsed money-path release** (panel): Cloud Scheduler jobs (OIDC →
   Cloud Run URL, created disabled), each manually triggered + idempotency re-checked against
   the dark URL, then **one change**: vercel.json cron block removed + jobs enabled — HIGH.
   QA: manual-trigger rehearsal (Scheduler fires on demand — LEARNINGS); `order-autoconfirm`
   observed firing exactly once per schedule across the swap.
2. Webhook/CORS allow-lists (Clerk, Stripe, MercadoPago) + full-path staging smoke
   (Cloudflare→ALB→Cloud Run incl. a Stripe test-card checkout) — HIGH. QA: the smoke itself.
3. **UCP/MCP cutover checklist as a named story** (panel): capability manifest accurate,
   advertised base/origin URLs, checkout-session links, CORS, canonical-domain behavior for
   agents — all asserted post-cutover, not left to smoke luck — HIGH (Rule 3 load-bearing).
   QA: api specs against `/api/ucp/manifest`, `/api/ucp/mcp`, a checkout-session round-trip.
4. Cutover: apex + wildcard proxied to the ALB; `mschz.org` redirector — HIGH (the flip).
   **Live tenant custom domains keep pointing at Vercel; Vercel prod deploys stay ON through
   the soak so those domains keep serving current code.** QA: cutover-day walkthrough with real
   URLs across all channels.
5. Monitoring: uptime checks + alert policies on the new path (provision script extension),
   frontend deploy-finish Telegram via Cloud Build Pub/Sub — LOW. QA: config-guard `node:test`.

**S4 — Tenant domain rewrite + migration + Vercel sunset (earned after platform proof)**
1. `lib/cloudflare-domains.ts`: create/status/delete custom hostnames + fallback origin, same
   exported API incl. `DomainConflictError` 409 mapping — HIGH (money SKU). **Provider-state
   mapping decided here** (panel): `marketplace_shops.custom_domain_vercel_ok` is the one
   Vercel-shaped column — repoint its semantics to "provider validation ok" (or additive-rename)
   and look hostnames up by name (no Cloudflare hostname IDs persisted) so no provider shape
   leaks into the public API. QA: pure-logic specs on the response-mapping seam + api spec on
   the domain route.
2. `CNAME_TARGET`/`dnsRecordFor` + tenant one-click CF route + seller-facing copy point at the
   new target — HIGH. Copy is **es-MX only** (seller portal is not on the bilingual allow-list —
   Rule 5 as written; the panel's "both locales" note doesn't apply here). QA: api spec + copy
   completeness check.
3. Migrate every live tenant custom domain: enumerate from Vercel project → pre-provision as
   custom hostnames → per-domain validation report → flip per domain — HIGH. QA: migration
   script dry-run-by-default (vercel-prune pattern); report reviewed by Daniel before `--apply`.
4. `domain-lapse-server.ts` + DNS-doctor checks read Cloudflare status API — LOW. QA: pure spec.
5. Sunset after soak: Vercel prod deploys disabled (previews kept), prod domains removed from
   the Vercel project, `VERCEL_API_TOKEN` scope reduced, docs updated (AGENTS.md §workflow,
   WAYS-OF-WORKING deploy/merge sections, memory deploy-topology note) — LOW. QA: doc-hygiene
   run + grep for stale "Vercel prod" claims.

## Kill-switch decision (Stage 6b — required for risk: high)

**Is there a runtime seam a kill-switch can gate? No — carve-out.** The gate is DNS/edge routing,
not app code: no `lib/flags.ts` flag can move traffic between Vercel and Cloud Run. The rollback
mechanism *is the plan's shape instead*: shadow mode keeps Vercel prod fully deployable until
sunset; cutover is a Cloudflare record flip (TTL-fast) reversible in minutes; crons are the one
non-DNS seam and get an explicit exactly-once swap story (S3.1) whose rollback is re-enabling the
vercel.json block and disabling Scheduler. Vercel sunset (S4.5) only happens after a soak window
Daniel calls.

## Open risks

- **ISR/data-cache is per-instance on self-hosted Next** — with >1 Cloud Run instance, revalidate
  fans out inconsistently. The static shell (`/`) + Cloudflare edge caching absorbs most of it;
  S1's dark-URL soak must specifically watch ISR'd pages. If it bites: min-instances=1 or a
  custom cache handler (decide in-sprint, escalate if it grows).
- **NS flip blast radius** (Clerk + 3 email systems) — mitigated by the staged-zone story, but
  it's the highest-consequence single step; Daniel executes/verifies that story's walkthrough.
- **Preview ≠ prod platform** after migration — accepted; the S4 staging smoke + post-merge prod
  smoke are the compensating controls.
- **Cloudflare 3rd-party dependency** (PRD's own noted trade-off) — accepted for velocity;
  Path B remains the documented fallback if Cloudflare ever becomes the problem.
- **Vercel spend during shadow mode** doubles rails temporarily — bounded by the soak window.

## Research citations (present-day, verified 2026-07-09)

- Cloudflare for SaaS: 100 custom hostnames free, $0.10/mo after, PAYG cap 50k —
  [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/)
- Next.js standalone on Cloud Run: sharp must be installed in the runner stage (native bindings,
  arch-matched); `public/` + `.next/static` copied explicitly —
  [nextjs.org sharp-missing-in-production](https://nextjs.org/docs/messages/sharp-missing-in-production)

## Acceptance (how Daniel tests the epic)

1. `miyagisanchez.com`, a `*.miyagisanchez.com` subdomain, a live tenant custom domain, the embed
   widget, and `/api/ucp/*` all serve from Cloud Run through Cloudflare — channel detection
   correct on each (the S4 walkthrough proves all five channels).
2. A seller adds a brand-new custom domain end-to-end (provision → validate → live with SSL)
   with no Vercel involvement.
3. A Stripe test-card checkout completes on the new path; webhooks land.
4. All four crons fire exactly once per schedule, on the new rail.
5. Merging a PR still produces a Vercel preview and the CI Playwright gate still runs against it.
6. Vercel project shows zero production domains; prod deploys disabled.
