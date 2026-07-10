---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: frontend-vercel-to-cloudrun
---

# Epic: Frontend off Vercel — Cloud Run behind a Cloudflare edge ✅ SHIPPED 2026-07-10

> **Area:** 09-platform-infra · **Risk:** high · **Scope seed:** [`00-ideas/seeds/frontend-vercel-to-cloudrun.md`](../../00-ideas/seeds/frontend-vercel-to-cloudrun.md) · **Archetype:** Maintainer

## Why

Move `apps/miyagisanchez` (Next.js 16) off Vercel onto Cloud Run us-east4 — the rail the backend
already ships on — behind a Cloudflare edge that fronts everything (apex, wildcard, tenant custom
domains via SSL for SaaS, CDN, bot protection). Drivers (validated at grooming, 2026-07-09):
control over the runtime (Vercel timeouts + ~4.5 MB body ceiling keep biting), latency/locality
(frontend + backend + Cloud SQL in one VPC/region), and strategic consolidation (one deploy rail).
Not primarily cost — the historic egress root cause was already fixed by `postgres-neon-to-cloudsql`.
Vercel survives **only** as the per-PR preview + CI target. Zero user-facing change when done right.

**Cross-agent planning panel:** run 2026-07-09 (Codex, both lenses, complementary). Its re-slice is
baked in: canonical cutover first (S3) with live tenant domains staying on Vercel through the soak;
tenant-domain rewrite (S4) earned after platform proof; cron swap as its own rehearsed release.

## Medusa-first note

Pure infra chore — no commerce modeling changes. Verified at grooming: `order-autoconfirm` (the one
money-path cron) delegates all Medusa order mutation to the backend-owned
`POST ${MEDUSA_BASE}/internal/autoconfirm-delivered`; the other crons touch Supabase-only concerns.
Rule 1 holds untouched. The tenant-domain seam swap (Vercel API → Cloudflare custom hostnames) keeps
the same public API shape; domain state stays where it is (`marketplace_shops`, Supabase — it is
non-commerce channel plumbing, not commerce data).

## What already exists (reuse, don't rebuild)

- `infra/gcp/` — `deploy.sh`, `cicd-setup.sh`, `provision-monitoring.sh`, staging scripts, the
  `deploy-invariants.test.js` drift-guard pattern. Clone the backend Cloud Build trigger shape.
- `apps/backend/cloudbuild.yaml` — the image-only deploy rail to mirror (LEARNINGS: config set once
  by script, preserved across deploys; Secret Manager `:latest` traps).
- `lib/vercel-domains.ts` (223 L) + `app/api/sell/shop/domain/route.ts` + `lib/domain-utils.ts`
  (`CNAME_TARGET`, `dnsRecordFor`) + `lib/domain-lapse-server.ts` — the seam to swap; public API
  shape (add/status/remove + `DomainConflictError` 409) survives, only the provider changes.
- `app/api/sell/shop/domain/cloudflare/route.ts` — tenant-side one-click DNS; only its CNAME
  target changes.
- `lib/channel.ts` + `middleware.ts` — untouched logic; S2 proves header passthrough end-to-end.
- In-house flags (`platform_flags` / `isEnabled()`) — Edge-Config-free since `feature-flags-inhouse`.
- Monitoring provisioning (backend-prod-readiness S4) + Cloud Build Pub/Sub Telegram rail.
- `scripts/vercel-prune-previews.mjs` dry-run-by-default pattern (reused for the S4 domain migration).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Edge→Node route conversion (`/api/splash`, `/api/icon`) | low |
| 1 | 1.2 Standalone build + Dockerfile (sharp) | low |
| 1 | 1.3 Cloud Build → Artifact Registry → Cloud Run `miyagi-web` + secrets re-mint | high |
| 1 | 1.4 Shadow soak: suite vs dark URL (+ UCP routes, ISR watch) | low |
| 2 | 2.1 Cloudflare zone staged from Vercel export → NS flip (records still → Vercel) | high |
| 2 | 2.2 External ALB + serverless NEG + Origin CA certs + header passthrough | high |
| 2 | 2.3 WAF/bot parity with Vercel Bot Protection | low |
| 3 | 3.1 Cron swap — Cloud Scheduler (reuses the existing `CRON_SECRET` shared-secret, not OIDC — decided 2026-07-10), rehearsed, exactly-once | high |
| 3 | 3.2 Webhook/CORS allow-lists + full-path staging smoke (Stripe test checkout) | high |
| 3 | 3.3 UCP/MCP cutover checklist (manifest, base URLs, checkout-session, CORS) | high |
| 3 | 3.4 Cutover: apex + wildcard + `mschz.org` → ALB (tenant domains stay on Vercel) | high |
| 3 | 3.5 Monitoring + deploy-finish Telegram on the new rail | low |
| 4 | 4.1 `lib/cloudflare-domains.ts` (custom hostnames; provider-state mapping) | high |
| 4 | 4.2 `CNAME_TARGET`/`dnsRecordFor` + one-click route + es-MX copy | high |
| 4 | 4.3 Migrate live tenant domains (dry-run-first script + report) | high |
| 4 | 4.4 Lapse-sweep + DNS-doctor read Cloudflare status API | low |
| 4 | 4.5 Vercel sunset (prod deploys off, previews kept; docs updated) | low |

## Deploy order

Shadow-first: S1–S2 are additive and dark (Vercel serves all traffic). S3.1 (crons) ships as its
own release before DNS cutover day; S3.4 is the traffic flip — reversible in minutes via Cloudflare
records. Live tenant custom domains kept pointing at Vercel (whose prod deploys stayed ON) until
S4.3 migrated them post-soak; **S4.5 sunset Vercel prod 2026-07-10**, the same day Daniel called
the soak done and authorized it.
Kill-switch decision (Stage 6b): **carve-out** — the gate is DNS/edge routing, no runtime flag seam;
rollback = record flip back + re-enable vercel.json crons / disable Scheduler (or, post-S4.5,
re-enable `vercel.json`'s `git.deploymentEnabled.main` too).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — S1-S4 all merged; gaps stated
      per-sprint (panfleto.com.mx's own DNS repoint, `VERCEL_API_TOKEN` de-scoping, no fresh-domain
      UI click-through — all in RETROSPECTIVE.md's Gaps section)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated — Recent highlights entry added 2026-07-10
- [x] Team memory + `MEMORY.md` index updated (deploy topology note: frontend rail changes!) —
      `frontend-vercel-to-cloudrun-epic.md` + `deploy-topology.md` updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append) — the
      `www`-gap lesson, the provider-swap status-signal lesson, the tenant-DNS-can't-be-migrated
      lesson, the Vercel-token-scope lesson, and the broad-authorization-scope corollary
- [x] **Kill-switch:** carve-out recorded at grooming (DNS seam, no runtime flag) — rollback path
      confirmed real through S4.5: re-enabling Vercel prod deploys is a one-line `vercel.json`
      revert (`git.deploymentEnabled.main: true`), and every domain removed from the Vercel project
      was confirmed already fully served elsewhere before removal (reversible by re-adding)
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
