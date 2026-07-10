# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 3: Canonical cutover (crons, UCP checklist, apex/wildcard)

**Status:** 🚧 in progress

The skateboard ships: apex + wildcard + UCP + crons move to the new rail. **Live tenant custom
domains stay on Vercel** (whose prod deploys stay ON) until Sprint 4 — the panel re-slice.

## Stories

### Story 3.1 — Cron swap: Cloud Scheduler, rehearsed, exactly-once
**As a** platform operator, **I want** the 4 vercel.json crons (`order-autoconfirm`,
`print-pending`, `domain-lapse-sweep`, `launchpad-campaigns`) as Cloud Scheduler jobs invoking the
same `/api/cron/*` routes **directly against the dark Cloud Run URL** (outside the public edge
path), created paused, each manually triggered + idempotency re-checked against the dark URL, then
swapped in **one change** (vercel.json cron block removed + jobs enabled), **so that** every cron —
especially the money-path `order-autoconfirm` — fires exactly once throughout.
**Auth decision (confirmed with Daniel 2026-07-10):** reuse the existing, host-agnostic
`CRON_SECRET` shared-secret each route already validates — not OIDC. No OIDC-verification code
exists anywhere in this repo for a Cloud Run *service* (only an unrelated OAuth-to-Cloud-Run-Jobs
pattern for DB backups); `miyagi-web` stays `--allow-unauthenticated` (needed for the Sprint 1.4
shadow-soak) and Cloud Run IAM is service-wide, so per-route lockdown isn't possible anyway. Zero
new dependency, zero route rewrites, same trust model Vercel Cron already uses today.
**Acceptance:** manual-trigger rehearsal green for all 4 (Scheduler fires on demand — LEARNINGS);
after the swap, `order-autoconfirm` observed firing exactly once per schedule (Cloud Run logs +
absence of a Vercel cron invocation). Rollback documented: re-add vercel.json block + pause jobs.
**Risk:** high (money-path cron; ships as its own release before cutover day)

**In progress 2026-07-10** — `infra/gcp/provision-scheduler-frontend.sh` (idempotent create/update,
every job auto-paused right after provisioning; `--enable`/`--disable` flags are the only path to
change state, kept apart from the one swap commit) + drift guard
`infra/gcp/test/scheduler-invariants.test.mjs` (14/14 green) committed to root `main` (`2dfaf1c`).
**Blocked on Daniel:** `CRON_SECRET` is confirmed still an empty Secret Manager shell (0 versions)
— populate it before the manual-trigger rehearsal can run for real.

### Story 3.2 — Webhook/CORS allow-lists + full-path staging smoke
**As a** platform operator, **I want** Clerk, Stripe and MercadoPago webhook/CORS settings
allow-listing the new infrastructure, proven by a full-path staging smoke on
`gcp.miyagisanchez.com` including a Stripe test-card checkout, **so that** money and auth flows are
verified on the new path before any real traffic rides it.
**Acceptance:** test-card checkout completes on the staging hostname; the Stripe webhook lands and
the order reaches the seller's order screen; Clerk session works through the full path.
**Risk:** high (payments/auth)

### Story 3.3 — UCP/MCP cutover checklist (named, asserted — not smoke luck)
**As an** AI agent shopping the marketplace, **I want** the UCP surface fully correct on the new
rail — capability manifest accurate, advertised base/origin URLs, checkout-session links, CORS,
canonical-domain behavior — **so that** Rule 3 (agents are first-class) survives the migration.
**Acceptance:** api specs assert `/api/ucp/manifest` contents (URLs point at the canonical domain,
not `*.run.app`), a `/api/ucp/mcp` JSON-RPC round-trip, and a checkout-session creation through the
new path; CORS headers verified for agent origins.
**Risk:** high (load-bearing agent surface)

**Done 2026-07-10** — `e2e/ucp-cutover-api.spec.ts` (8 tests, run against prod: manifest
`base_url`/every endpoint URL share one origin + never contain `run.app`, MCP `tools/list`
round-trip + `initialize` has no stray host reference, checkout-session `checkout_url` origins
[fixture-gated on `MS_TEST_PDP_LISTING_ID`], agent-origin CORS on all three routes — all 8
assertable tests passed live, the fixture-gated one skipped gracefully) + a
`.staging.spec.ts` companion for `gcp.miyagisanchez.com`. Live staging run found this session's
local DNS resolver was stale (resolved to Vercel, not Cloudflare) — cross-checked via a
`--resolve`-forced request to the real, publicly-resolved Cloudflare IP: `server: cloudflare`,
`cf-ray` present, `via: 1.1 google` (confirms the full edge→ALB path) — so the spec logic is
correct; the one locally-failing assertion (`cf-ray` via the plain hostname) is this sandbox's DNS
cache, the same caveat Sprint 1/2 already documented, not a regression.

### Story 3.4 — Cutover: apex + wildcard + `mschz.org` → the new rail
**As a** platform operator, **I want** `miyagisanchez.com`, `*.miyagisanchez.com` and the
`mschz.org` redirector flipped to proxied records targeting the ALB, **so that** canonical traffic
serves from Cloud Run through Cloudflare.
**Acceptance:** all channels serve from the new rail (marketplace, subdomain shop, embed, `/api/ucp/*`);
tenant custom domains still serve from Vercel untouched; rollback = flip the records back (minutes).
**Risk:** high (the flip — Daniel merges + runs the walkthrough)

### Story 3.5 — Monitoring + deploy-finish Telegram on the new rail
**As a** platform operator, **I want** uptime checks + alert policies on the canonical path
(extending the idempotent provisioning script) and the frontend deploy-finish Telegram ping moved
onto the Cloud Build Pub/Sub rail the backend already uses, **so that** the new rail is observable
before the soak starts.
**Acceptance:** `node:test` config guard green (provision script vs live config); a merge produces
the deploy-finish Telegram for the frontend.
**Risk:** low

## Sprint QA
- **api spec(s):** 3.3 → `e2e/ucp-cutover-api.spec.ts` (flat convention, not a nonexistent
  `e2e/api/` subdir — manifest `base_url`/endpoint-origin correctness, MCP JSON-RPC round-trip,
  checkout-session `checkout_url` origins, agent-origin CORS) + a `.staging.spec.ts` companion
  run manually against `gcp.miyagisanchez.com` pre-cutover; 3.1 → no route-level Playwright spec
  (decided with Daniel: cron auth reuses the existing host-agnostic `CRON_SECRET` shared-secret
  check already in each route, not new OIDC-verification code — zero route changes, so nothing
  new to assert at the route level) — instead gated by `infra/gcp/test/scheduler-invariants.test.mjs`
  (drift guard on the provisioning script) + the manual-trigger rehearsal described in Story 3.1.
- **browser smoke owed:** **yes, to Daniel — 3.2's test-card checkout and 3.4's cutover walkthrough
  are the money/auth path.**
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green; infra by
  config-guard `node:test`.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (now on the new rail)

1. Open https://miyagisanchez.com in a private window.
   → Marketplace renders; response carries a `cf-ray` header (Cloudflare edge, not Vercel).
2. Open a shop subdomain, e.g. https://<test-shop>.miyagisanchez.com.
   → White-label shop renders, no platform chrome.
3. Open a live tenant custom domain (e.g. the busiest seller's).
   → Still serves — **from Vercel** (unchanged this sprint).
4. Open https://mschz.org/<a-known-short-link>.
   → Redirects exactly as before.
5. Open https://miyagisanchez.com/api/ucp/manifest.
   → URLs inside point at miyagisanchez.com (not `*.run.app`, not Vercel).
6. **(money path — Daniel)** Add an item to cart → checkout as guest → pay with Stripe test card 4242….
   → Order confirmation email arrives; the seller's order screen shows the order.
7. Next morning: check Cloud Run logs for `order-autoconfirm`.
   → Exactly one invocation at the scheduled time; no Vercel cron fired.

If any step fails, note the step number + what you saw — that's the bug report.
