---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: frontend-vercel-to-cloudrun
---

# Epic: Frontend off Vercel — Cloud Run behind a Cloudflare edge

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
| 3 | 3.1 Cron swap — Cloud Scheduler OIDC, rehearsed, exactly-once | high |
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
records. Live tenant custom domains keep pointing at Vercel (whose prod deploys stay ON) until S4.3
migrates them post-soak; S4.5 sunsets Vercel prod only after Daniel calls the soak done.
Kill-switch decision (Stage 6b): **carve-out** — the gate is DNS/edge routing, no runtime flag seam;
rollback = record flip back + re-enable vercel.json crons / disable Scheduler.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated (deploy topology note: frontend rail changes!)
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** carve-out recorded at grooming (DNS seam, no runtime flag) — verify the
      rollback path stayed real through S4.5 (Vercel prod re-enable documented in the runbook)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
