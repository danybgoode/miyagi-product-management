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
**`CRON_SECRET` populated 2026-07-10** (Daniel authorized, agent-generated `openssl rand -hex 32`,
value never printed — Secret Manager version 1). **Next:** run the manual-trigger rehearsal
(script section above) against the dark URL, review the idempotency-recheck output with Daniel,
then the one swap commit.

### Story 3.2 — Webhook/CORS allow-lists + full-path staging smoke
**As a** platform operator, **I want** Clerk, Stripe and MercadoPago webhook/CORS settings
allow-listing the new infrastructure, proven by a full-path staging smoke on
`gcp.miyagisanchez.com` including a Stripe test-card checkout, **so that** money and auth flows are
verified on the new path before any real traffic rides it.
**Acceptance:** test-card checkout completes on the staging hostname; the Stripe webhook lands and
the order reaches the seller's order screen; Clerk session works through the full path.
**Risk:** high (payments/auth)

**Findings 2026-07-10 (research done; the live smoke stays Daniel's, per the gate):**
- Stripe/MP webhook handlers are host-agnostic by construction (Stripe verifies by HMAC
  signature over the raw body; MP re-fetches the payment/preapproval by ID from MP's own API) —
  neither reads `Host`. Clerk's dashboard domain allow-list already covers `miyagisanchez.com`,
  proven live in Sprint 2.1. Backend `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` already include
  `https://miyagisanchez.com` (confirmed live) — no change needed for the canonical domain, since
  it never changes this sprint.
- **Correction to this story's original framing:** Sprint 1's doc assumed
  `STRIPE_WEBHOOK_SECRET` needs "its own webhook endpoint registered against the Cloud Run URL
  first." That's not right — Stripe's webhook signing secret is tied to the *registered public
  URL* (`https://miyagisanchez.com/api/webhooks/stripe`), which **does not change** in this
  migration (only the infra serving it does). No new Stripe webhook endpoint registration is
  needed at all. The only real open question: does the value already bound to `miyagi-web`'s
  `STRIPE_WEBHOOK_SECRET` (confirmed live: 3 enabled versions, oldest from 2026-05-29, predating
  this epic) match what's actually live/working on Vercel today? Can't verify by reading the
  secret (would print it) — **owed to Daniel to confirm** before/at cutover.
- **CORS gap confirmed live** (read, not written): `gcp.miyagisanchez.com` is NOT in the
  backend's live `STORE_CORS`. If the staging smoke drives a real *browser* checkout on
  `gcp.miyagisanchez.com` (Stripe Checkout session creation calls Medusa's Store API with that
  page's Origin), it needs a temporary allowance. This is a live PRODUCTION backend env change
  (money-path shared infra) — not run by the agent; prepared here for Daniel to run as part of
  his own smoke:
  ```
  # before the smoke:
  gcloud run services update medusa-web --region=us-east4 --project=miyagisanchezback-497722 \
    --update-env-vars="STORE_CORS=https://miyagisanchez.com,https://www.miyagisanchez.com,https://gcp.miyagisanchez.com"
  # after the smoke passes, revert:
  gcloud run services update medusa-web --region=us-east4 --project=miyagisanchezback-497722 \
    --update-env-vars="STORE_CORS=https://miyagisanchez.com,https://www.miyagisanchez.com"
  ```

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

**PR #203 merged 2026-07-10** (frontend repo) after 4 rounds of Codex cross-review, each finding
real, fixed issues: missing success-status assertions before the negative (`no run.app`) checks;
a checkout-session test that made zero assertions when `payment_options` came back empty
(silently passing on a broken response); the staging spec not verifying it was actually pointed
at `gcp.miyagisanchez.com` (fixed with a file-wide `beforeEach` guard, live-verified to fail loud
on the wrong host); and `expectedOrigin()` trusting `baseURL`'s literal protocol instead of
mirroring the route's own `host.includes('localhost')` derivation exactly. Final pass clean
(CI green: type-check + build + Playwright `api` all pass).

### Story 3.4 — Cutover: apex + wildcard + `mschz.org` → the new rail
**As a** platform operator, **I want** `miyagisanchez.com`, `*.miyagisanchez.com` and the
`mschz.org` redirector flipped to proxied records targeting the ALB, **so that** canonical traffic
serves from Cloud Run through Cloudflare.
**Acceptance:** all channels serve from the new rail (marketplace, subdomain shop, embed, `/api/ucp/*`);
tenant custom domains still serve from Vercel untouched; rollback = flip the records back (minutes).
**Risk:** high (the flip — Daniel merges + runs the walkthrough)

**Groundwork done 2026-07-10 (Daniel still executes the flip itself):**
- **New gap found + closed:** `mschz.org` is a separate Cloudflare zone, uncovered by Sprint 2's
  Origin CA cert (hardcoded to `miyagisanchez.com`). `infra/gcp/cloudflare-origin-cert.mjs` now
  takes `--domain`/`--hostnames` (default unchanged — regression-guarded); request the second
  cert with `node infra/gcp/cloudflare-origin-cert.mjs --domain mschz.org --hostnames
  mschz.org,www.mschz.org --out-dir .cf-origin-cert-mschz`, then attach it alongside the existing
  cert on `miyagi-web-https-proxy` (`--ssl-certificates=<existing>,<new>`, comma-separated SNI
  list) **before** flipping `mschz.org`'s DNS record — otherwise visitors get a cert mismatch.
- New `infra/gcp/cloudflare-cutover-flip.mjs` — dry-run by default, flips the apex + wildcard
  A records from Vercel's IPs → the ALB's static IP (resolved live) + `proxied: true`; writes a
  pre-flip JSON snapshot so `--rollback <file>` restores content+proxied+type exactly, not just
  the proxied flag.
- **Real near-miss, caught by the dry-run default before any live edit:** the first version
  selected cutover records by `name` alone (matching `miyagisanchez.com`/`*.miyagisanchez.com`),
  which also matched **3 CAA records + 1 TXT (google-site-verification) record** sharing the same
  apex name — `--apply` would have silently overwritten those with an A record pointing at the
  ALB, breaking cert-issuance authorization and Google's site verification. Fixed by also
  filtering on record type (`A`/`AAAA`/`CNAME` only); regression-tested; re-verified live via
  dry-run — now correctly finds exactly the 4 real A records (apex ×2, wildcard ×2, Vercel's
  dual-IP setup).

### Story 3.5 — Monitoring + deploy-finish Telegram on the new rail
**As a** platform operator, **I want** uptime checks + alert policies on the canonical path
(extending the idempotent provisioning script) and the frontend deploy-finish Telegram ping moved
onto the Cloud Build Pub/Sub rail the backend already uses, **so that** the new rail is observable
before the soak starts.
**Acceptance:** `node:test` config guard green (provision script vs live config); a merge produces
the deploy-finish Telegram for the frontend.
**Risk:** low

**Done 2026-07-10** — `infra/gcp/provision-monitoring.sh` extended with a `SERVICE_NAME=backend|
frontend` axis, orthogonal to the existing `TARGET=staging|prod` one; every existing helper
reused verbatim. Real drift point caught + locked in the guard: the frontend's health path is
`/api/health`, not `/health` like the backend. Backend behavior confirmed byte-for-byte
unchanged (default `SERVICE_NAME=backend`). Config guard `infra/gcp/test/provision-monitoring-
frontend.test.mjs` green (full suite 96/96). Telegram notifier: rather than generalizing
`shouldNotifyBuild()`'s filter to a list, deployed a wrapper
(`apps/backend/infra/gcp/deploy-cicd-telegram-notifier-frontend.sh`) that reuses the SAME,
unmodified `index.js` with different env vars (`FUNCTION_NAME=cicd-telegram-build-notifier-
frontend`, pointed at `frontend-main-deploy`) — zero code changes to a working notifier, matches
the existing script's own parametrization. **PR #75 merged 2026-07-10** (backend repo) after
Codex cross-review found a real bug: `BACKEND_TRIGGER_ID`'s default in the shared script is a
live lookup, but a value left exported in the calling shell from an earlier backend-deploy
invocation would silently win over the lookup and point the frontend-named function at the
BACKEND's trigger instead — fixed with an explicit `unset BACKEND_TRIGGER_ID` before invocation,
regression-tested. Also fixed a stale `apps/backend/`-prefixed path in both files' usage comments
(misleading since they live inside that repo, where the correct relative path has no prefix).
**Still owed:** actually run `bash infra/gcp/deploy-cicd-telegram-notifier-frontend.sh` live —
provisions a real, billable Cloud Function + service account, not yet executed.

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
   → Redirects exactly as before. Also check the cert actually serving is the new one, not a
   mismatch/fallback: `curl -vI https://mschz.org/ 2>&1 | grep -i "subject\|issuer"`.
5. Open https://miyagisanchez.com/api/ucp/manifest.
   → URLs inside point at miyagisanchez.com (not `*.run.app`, not Vercel). Automated form:
   `npx playwright test ucp-cutover-api --project=api` (`PLAYWRIGHT_BASE_URL` defaults to prod).
   Also confirm agent-origin CORS survived the new edge/ALB hop:
   `curl -X OPTIONS -H "Origin: https://claude.ai" https://miyagisanchez.com/api/ucp/mcp -i`
   → `Access-Control-Allow-Origin: *`.
6. **(money path — Daniel)** Add an item to cart → checkout as guest → pay with Stripe test card 4242….
   → Order confirmation email arrives; the seller's order screen shows the order.
7. Next morning: check Cloud Run logs for `order-autoconfirm` fired exactly once, at the
   scheduled time:
   ```
   gcloud logging read '
     resource.type="cloud_run_revision" AND resource.labels.service_name="miyagi-web"
     AND resource.labels.location="us-east4"
     AND httpRequest.requestUrl:"/api/cron/order-autoconfirm"
     AND timestamp>="<date>T08:55:00Z" AND timestamp<="<date>T09:10:00Z"
   ' --project=miyagisanchezback-497722 \
     --format='table(timestamp, httpRequest.status, httpRequest.requestUrl, resource.labels.revision_name)'
   ```
   → Expect exactly one `200` row at `09:00 UTC`. Cross-check Vercel's dashboard (Cron Jobs →
   Execution history for `order-autoconfirm`) shows **zero** invocations after the swap.

If any step fails, note the step number + what you saw — that's the bug report.
