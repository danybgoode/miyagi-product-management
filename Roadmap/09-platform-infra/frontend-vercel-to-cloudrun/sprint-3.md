# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 3: Canonical cutover (crons, UCP checklist, apex/wildcard)

**Status:** ✅ **All 5 stories shipped 2026-07-10.** Cutover is live: `miyagisanchez.com`,
`*.miyagisanchez.com`, and `mschz.org` serve from Cloud Run through Cloudflare; the 4 crons run
on Cloud Scheduler (Vercel's crons removed). Cross-review + CI green on every PR (#203, #204,
#75, #76, #205). Three real bugs and one unrelated prod bug were found and fixed live along the
way (detailed per-story below). Owed forward: Daniel's live walkthrough below — the money-path
checkout (step 6), a real shop-subdomain + live-tenant-domain spot check (steps 2–3), and
tomorrow's exactly-once cron check (step 7) — none of these are agent-completable.

The skateboard ships: apex + wildcard + UCP + crons move to the new rail. **Live tenant custom
domains stay on Vercel** (whose prod deploys stay ON) until Sprint 4 — the panel re-slice.

## Stories

### Story 3.1 — Cron swap: Cloud Scheduler, rehearsed, exactly-once ✅
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

**Built 2026-07-10** — `infra/gcp/provision-scheduler-frontend.sh` (idempotent create/update,
every job auto-paused right after provisioning; `--enable`/`--disable` flags are the only path to
change state, kept apart from the one swap commit) + drift guard
`infra/gcp/test/scheduler-invariants.test.mjs` (14/14 green) committed to root `main` (`2dfaf1c`).
**`CRON_SECRET` populated 2026-07-10** (Daniel authorized, agent-generated `openssl rand -hex 32`).

**Rehearsal run 2026-07-10 — three real findings along the way, all fixed:**
1. **`openssl rand -hex 32`'s trailing newline got baked into the stored secret** (65 bytes, not
   64) — bash's `$(...)` capture strips it when the provisioning script reads the value back, but
   Cloud Run's env-var binding doesn't, so the Scheduler-sent header never matched what the app
   compared against → first trigger 401'd. Fixed by re-adding the secret via
   `openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add ...` (confirmed 64 bytes) and
   force-deploying a new Cloud Run revision (`:latest` only re-resolves on a fresh revision, not
   an existing warm instance — LEARNINGS scar tissue, reconfirmed live).
2. **`gcloud scheduler jobs update http` takes `--update-headers`, not `--headers`** (that flag
   name is `create`-only) — passing the wrong one on the update path errored "unrecognized
   arguments" and **gcloud echoed the full invocation, including the secret value, back in that
   error text** — a real credential-exposure footgun, not just a functionality bug. The exposed
   secret version was immediately rotated (destroyed) before continuing. Fixed:
   `provision-scheduler-frontend.sh` now switches the flag name based on create-vs-update;
   regression-tested (`infra/gcp/test/scheduler-invariants.test.mjs`, now 109/109 across the
   suite).
3. **Unrelated production bug surfaced by the rehearsal itself**: `order-autoconfirm` 500'd on
   `column marketplace_orders.return_requested_at does not exist`. Investigation (Supabase MCP,
   read-only) found the `20260526100000_return_requests` migration is recorded as **applied** in
   Supabase's migration history, but its DDL never actually landed — neither the column nor
   `marketplace_return_requests` existed. Likely cause: the migration file was edited *after*
   being marked applied (Supabase dedupes by version, not content, so `migration up` silently
   skipped it). This means `order-autoconfirm` has likely been failing the same way in
   **production on Vercel** since late May, unrelated to this migration. Fixed with a new,
   freshly-timestamped migration (`20260710154932_return_requests_backfill.sql`, all
   `IF NOT EXISTS`/idempotent) applied live via the Supabase MCP; confirmed both the column and
   table now exist. Migration file committed to the repo separately — **frontend PR #204 merged
   2026-07-10** (cross-review clean; Daniel merged given DB-migration risk).

**Rehearsal result, post-fixes — all 4 routes 200, idempotency confirmed via identical repeat
responses** (direct curl with the correct secret, never printed):
```
order-autoconfirm   (1st) {"confirmed":0,"medusaConfirmed":0,"message":"No Supabase orders to auto-confirm."}
order-autoconfirm   (2nd) {"confirmed":0,"medusaConfirmed":0,"message":"No Supabase orders to auto-confirm."}
domain-lapse-sweep  (1st) {"ok":true,"released":0}
domain-lapse-sweep  (2nd) {"ok":true,"released":0}
launchpad-campaigns (1st) {"ok":true,"scanned":0,"met":0,"unmet":0,"errors":0}
launchpad-campaigns (2nd) {"ok":true,"scanned":0,"met":0,"unmet":0,"errors":0}
print-pending        (1x) {"ok":true,"released":0,"reminded":0,"scanned":0}
```
All 4 jobs left `PAUSED` after rehearsal (safe state).

**Swap executed 2026-07-10 (Daniel authorized).** `vercel.json`'s `crons` block removed
(frontend PR #205, cross-review clean — one advisory finding, correctly scoped to the
cross-repo dependency the reviewer couldn't see from this repo's diff alone; addressed via a PR
comment, not a code change — merged after CI green), deployed to Vercel prod (confirmed `READY`
via the Vercel API), then all 4 Scheduler jobs enabled in the same window
(`provision-scheduler-frontend.sh --enable`) — done at 16:17 UTC, well clear of any of the 4
scheduled times (06:00–09:00 UTC), so there was zero risk of a double-fire or a missed fire
during the transition. Vercel's crons are now fully retired; Cloud Scheduler is the sole source
of truth going forward. **Owed to Daniel:** tomorrow morning's exactly-once check (walkthrough
step 7) — the first real unattended firing hasn't happened yet.

### Story 3.2 — Webhook/CORS allow-lists + full-path staging smoke ✅ (research done; live smoke owed)
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

### Story 3.3 — UCP/MCP cutover checklist (named, asserted — not smoke luck) ✅
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

### Story 3.4 — Cutover: apex + wildcard + `mschz.org` → the new rail ✅ (walkthrough owed)
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

**Cutover executed live 2026-07-10 (Daniel authorized):**
- `mschz.org` Origin CA cert requested + attached alongside the existing cert on
  `miyagi-web-https-proxy` (both certs live, SNI-selected).
- **Second real bug, caught live mid-flip**: Vercel's real zone export carries **two A records
  per name** (dual-IP redundancy — confirmed for both the apex and the wildcard). Retargeting
  every record in a name-group to the same new ALB IP hit Cloudflare's API rejection ("An
  identical record already exists", error 81058) on the second record — the script had no
  per-name grouping, so this aborted mid-run and left a genuinely inconsistent split state (one
  record correctly proxied to the ALB, its sibling still pointing at Vercel, unproxied) for a
  few minutes until diagnosed against the live zone and fixed. Fix: group records by name, PATCH
  only the first record in each group to the new target, DELETE the rest (never patch two
  records to an identical value); the pre-flip snapshot now records each entry's action
  (`patch`/`delete`) so `--rollback` re-CREATEs deleted records instead of PATCHing a since-gone
  ID. Regression-tested (12/12 green), re-applied cleanly — final live state confirmed via a
  direct Cloudflare API read: exactly one `A` record per name, both `136.68.90.56`, both proxied.
- **Live verification** (via `curl --resolve` forcing the real Cloudflare edge IP, since this
  session's local DNS resolver lags, same known caveat as Sprint 1/2/S3.3):
  - `https://miyagisanchez.com/` → `200`, `server: cloudflare`, `via: 1.1 google` (confirms the
    ALB path), `x-cloud-trace-context` present (confirms Cloud Run served it).
  - `https://miyagisanchez.com/api/health` → `200`.
  - `https://miyagisanchez.com/api/ucp/manifest` → `200`, `base_url: "https://miyagisanchez.com"`
    (not a `*.run.app` URL), CORS headers present.
  - `https://mschz.org/` → `301` → `https://miyagisanchez.com/`, `cf-ray` present, no 526
    cert-mismatch error (the real proof the Origin CA cert attach worked — a client curl can
    only ever see Cloudflare's own edge cert, never the origin cert, so a normal response is the
    correct signal, not a subject/issuer match — walkthrough step 4 corrected below).
  - `https://mschz.org/nonexistent-test-slug` → `301` → `https://miyagisanchez.com/404` (the
    short-link-not-found path, confirmed working through the new rail).
- **Still owed to Daniel**: the full walkthrough below on real production URLs, including the
  money-path checkout (step 6) and a real shop-subdomain + live tenant-custom-domain spot check
  (steps 2–3) — not run by the agent.

### Story 3.5 — Monitoring + deploy-finish Telegram on the new rail ✅
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
**Deployed live 2026-07-10** — first run hit a real bug: `SERVICE_ACCOUNT_NAME="cicd-telegram-
notifier-frontend"` is 31 characters, exceeding GCP's 30-char service-account-ID limit
(`gcloud iam service-accounts create` returned `INVALID_ARGUMENT`). Shortened to
`cicd-telegram-notif-frontend` (28 chars), a length assertion added to the drift guard, fixed
live and PR'd separately (backend PR #76, cross-review clean, merged). Function
`cicd-telegram-build-notifier-frontend` is now `ACTIVE`, correctly bound to the
`frontend-main-deploy` trigger (`BACKEND_TRIGGER_ID` resolved dynamically and correctly,
confirming PR #75's env-leak fix works as intended). Story 3.5 is fully done.

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
   → Redirects exactly as before, no cert-error interstitial. (Note: a client-side
   `curl -vI | grep subject/issuer` only ever shows **Cloudflare's own edge cert**, never the
   Origin CA cert — that leg is Cloudflare→ALB, invisible to the client. The real proof the
   origin cert is correctly attached is the ABSENCE of a 526 "Invalid SSL Certificate" error;
   a normal 301/200 response is the confirmation.)
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
