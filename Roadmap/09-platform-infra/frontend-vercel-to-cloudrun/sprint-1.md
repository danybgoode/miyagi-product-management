# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 1: Containerize + shadow rail

**Status:** ✅ **SHIPPED 2026-07-09.** All 4 stories merged (PR #201, `d2266db`, cross-review clean —
1 nit fixed, no blockers). `miyagi-web` live (dark) on Cloud Run; the `frontend-main-deploy` Cloud
Build trigger is wired and fired automatically on this exact merge (no console step remained — the
existing backend GitHub connection already covered this repo). `launchpad.enabled`'s live-ON state
(S1.4) confirmed intentional by Daniel; `MEMORY.md` updated. Owed forward: 4 pending secret values
(Daniel populates when reached), Daniel's browser/money smoke on the live URLs below.

All stories deployable dark — Vercel keeps serving 100% of traffic this sprint.

## Stories

### Story 1.1 — Convert the two edge-runtime routes to Node ✅
**As a** platform operator, **I want** `/api/splash` and `/api/icon` off `runtime = 'edge'`,
**so that** no route depends on a Vercel-only runtime before the container ships.
**Acceptance:** both routes return byte-identical output (headers included) on the Vercel preview;
`grep -rn "runtime = 'edge'" app/` is clean.
**Risk:** low
*(Deliberately first: reversible, Vercel-compatible, flushes hidden runtime assumptions before any
infra spend — planning-panel note.)*

**Done 2026-07-09** — commit `e906e74` on `feat/frontend-vercel-to-cloudrun` (PR #201, draft). Both
routes only used `next/og` `ImageResponse` + `NextRequest` — nothing edge-exclusive — so the runtime
line was dropped with no other code change. `grep -rn "runtime = 'edge'" app/` confirmed clean.
Since removing the line leaves no edge deployment to diff byte-for-byte against, the acceptance was
interpreted (confirmed with Daniel) as: PNG validity + correct `content-type`, requested `w`/`h`/`size`
dimensions honored, and two consecutive requests to the same URL producing byte-identical output
(deterministic Node rendering) — asserted in new spec `e2e/edge-route-parity.spec.ts`. Verified
locally (`tsc --noEmit`, `npm run build`, `npm run test:e2e` — 6/6 passed against a local `next start`
on the built output) and again in CI against the live Vercel preview (`Type-check + build` +
`Playwright vs preview` both green, PR #201).

### Story 1.2 — Standalone build + Dockerfile ✅
**As a** platform operator, **I want** `output: 'standalone'` + a multi-stage Dockerfile
(deps/builder/runner; `sharp` installed in the runner stage, arch-matched; `public/` +
`.next/static` copied explicitly), **so that** the frontend runs as a self-contained container.
**Acceptance:** `docker build` + `docker run` locally serves the app incl. an optimized
`/_next/image` request; `next build` still green on Vercel (standalone must not break the preview rail).
**Risk:** low

**Done 2026-07-09.** `output: 'standalone'` added to `next.config.ts` (no-op on Vercel — confirmed
`next build` still green). New `Dockerfile` (deps/builder/runner, `node:20-slim` to match the
backend's existing image convention) + `.dockerignore`. `sharp` added as a `package.json` dependency
so the standalone dependency-tracer includes it — but the trace only copies stub files for it (no
native binary, no JS lib: Next's image optimizer requires `sharp` dynamically at runtime, which
static tracing can't see), so the runner stage explicitly reinstalls it fresh (`npm install sharp`,
verified with a direct `sharp()` call inside the running container). `docker build` + `docker run`
locally serve `/`, `/api/splash`, `/api/icon` correctly (200s, real bytes) with `.env.local`-sourced
env vars (same file local `npm run dev` already uses).

**Acceptance amended (confirmed with Daniel):** dropped the "optimized `/_next/image` request" check.
Every relative-path `/_next/image` request (tested against both `/api/icon` and a plain static
`public/next.svg`) 500/400s with `isn't a valid image… received null` — traced to a confirmed, open
upstream Next.js regression in `output: 'standalone'` mode ([vercel/next.js#82610](https://github.com/vercel/next.js/issues/82610),
from PR #82114/#82175): the optimizer's internal self-fetch for a relative image path doesn't replay
correctly through middleware. Not our code's bug and not actually reachable in this app — `grep -rn
"from 'next/image'"` across the codebase returns zero hits; real product images go through
`images.remotePatterns` (external R2/https URLs), a completely different, unaffected fetch path. The
one available workaround (excluding the affected paths from `middleware.ts`'s matcher, per the
upstream issue) would touch a cross-cutting file — LEARNINGS flags `middleware.ts` as
announce-before-changing — for a code path nothing in this app calls. Left as a documented open item,
not a middleware change.

### Story 1.3 — Cloud Build → Artifact Registry → Cloud Run `miyagi-web` ✅
**As a** platform operator, **I want** a `cloudbuild.yaml` in `apps/miyagisanchez` (cloned from the
backend trigger shape) deploying to a Cloud Run service `miyagi-web` in us-east4, with env/secrets
provisioned by an idempotent script + a `node:test` drift guard (the `deploy-invariants` pattern),
**so that** every merge to `main` deploys both rails.
**Acceptance:** merge → image in Artifact Registry → new Cloud Run revision serving on the dark
`*.run.app` URL. Secrets re-minted from provider dashboards (Vercel Sensitive vars are write-only —
LEARNINGS), never "copied". Drift-guard test green.
**Risk:** high (shared infra — announce; new deploy rail)

**Done 2026-07-09.** Announced + confirmed with Daniel before any live provisioning (per the
escalation rule). Design decisions confirmed: new dedicated Artifact Registry repo `frontend`
(matches the per-service convention `medusa`/`medusa-ops`/`print` already use); ~7 secrets
**reused** from the backend's existing GCP Secret Manager entries via an IAM grant on the new
`miyagi-web-run` service account (same live Clerk/Stripe/Supabase/MercadoPago/Telegram-bot/ML-app
credential — no new value, no "copying," genuinely the same secret both services now read); ~15
new secret shells created for frontend-only credentials.

Live now: Artifact Registry repo `frontend`, service account `miyagi-web-run`, Cloud Run service
`miyagi-web` (us-east4, same GCP project as the backend, `--min-instances=0`, no VPC connector —
the frontend never talks to Cloud SQL/Redis directly). New `app/api/health` route (dependency-free)
backs the startup/liveness probes so a missing secret never masquerades as a bad image.

**Secret handling, in detail:**
- Fresh VAPID keypair generated this session (Daniel's call — existing push subscriptions can't
  survive a rotation regardless, so a placeholder value would be no better; this is the one
  deliberate exception to "always re-mint, never copy").
- R2 image-bucket + digital-bucket credentials (2 separate Cloudflare accounts), Resend, Upstash,
  Vercel API token, and the admin/claim/encryption secrets (`ADMIN_SECRET`, `CLAIM_JWT_SECRET`,
  `ENCRYPTION_KEY`, `ENCRYPTION_SECRET`) all populated with values Daniel confirmed are identical
  to what's live on Vercel today (explicitly confirmed before writing — these four were flagged in
  `provision-frontend.sh` as not safely auto-rotatable, since a fresh value could invalidate
  outstanding claim links or corrupt already-encrypted data).
- **Owed — still empty secret shells, no live traffic depends on them yet:** `SERPAPI_KEY`,
  `STRIPE_WEBHOOK_SECRET` (needs its own webhook endpoint registered against the Cloud Run URL
  first — chicken-and-egg with the URL existing), `CRON_SECRET`, `TELEGRAM_CHAT_ID_APP` (a separate
  Telegram chat from the backend's CI/CD notification chat). The live deploy currently omits these
  4 bindings; `infra/gcp/deploy-frontend.sh`'s committed shape still references all of them (the
  intended end-state, matching `provision-frontend.sh`'s full secret list) — re-run it once these
  4 have real values.

**Two bugs found + fixed live while verifying the first deploy** (both committed):
1. `deploy-frontend.sh`'s `--set-env-vars` used the backend's `^@^` delimiter, which collided with
   the literal `@` in `VAPID_SUBJECT` (a `mailto:` URI) and `MIYAGI_ADMIN_EMAIL` — `gcloud` split
   mid-value ("Bad syntax for dict arg"). Switched the delimiter to `~`.
2. Every request to the dark URL 404'd with "Shop not found" — `middleware.ts`'s `isPlatformHost()`
   allowlists `*.vercel.app` as a platform-served preview host (not a tenant custom domain) but
   didn't know about `*.run.app`, so it fell through to the custom-domain lookup path. Added the
   identical allowance for `.run.app`, same reasoning as the existing `.vercel.app` line.

**Verified live** (curled directly against `https://miyagi-web-91083034475.us-east4.run.app`):
`/api/health` → `{"ok":true}`; `/` → 200 (homepage renders); `/api/splash` + `/api/icon` → 200,
`image/png`; `/api/ucp/manifest` → 200. Drift-guard `infra/gcp/test/deploy-invariants-frontend.test.js`
green (6/6), full `infra/gcp/test/` suite green (35/35 incl. the backend's existing guard).

**CI/CD trigger wired 2026-07-09.** Turned out no manual console OAuth step was needed — the
backend's existing 2nd-gen `github` Cloud Build connection already covers the whole `danybgoode`
account, so `gcloud builds repositories create` added `miyagisanchezcommerce` to it directly.
`cicd-setup-frontend.sh` then ran with `GH_CONNECTION`/`GH_REPO` pointed at that repository resource
— new SA `miyagi-web-cicd`, trigger `frontend-main-deploy` (push to `main` → `cloudbuild.yaml`).
**Verified live**: merging PR #201 fired it automatically alongside the Vercel prod deploy — both
rails now fire from a single push, closing out this story's full acceptance.

### Story 1.4 — Shadow soak: the suite against the dark URL ✅
**As a** platform operator, **I want** the existing Playwright/API suite run against the dark URL
with canonical host headers, plus `/api/ucp/manifest` + `/api/ucp/mcp` probes, **so that** the
panel's checkable claim ("canonical app, subdomains, checkout, UCP and crons can run from Cloud
Run") is proven before any DNS work.
**Acceptance:** suite green vs the dark URL; ISR'd pages behave across ≥2 concurrent instances
(known self-hosted ISR risk — watch explicitly, escalate if inconsistent); findings written into
this doc.
**Risk:** low

**Done 2026-07-09.** Full `npm run test:e2e` (`api` project, 1759 tests) run with
`PLAYWRIGHT_BASE_URL=https://miyagi-web-oehqqtyoia-uk.a.run.app` — **1754 passed, 5 failed, 19
skipped** (the same fixture-gated skips CI shows). No canonical-Host-header trick was needed: S1.3's
`isPlatformHost()` fix already makes the real `*.run.app` hostname resolve as `marketplace` on its
own (a Host-header override against the bare `*.run.app` URL doesn't even reach the container —
Google's front-end 404s it before the request arrives, since Cloud Run's default domain enforces
Host/SNI matching; confirmed live while investigating the S1.3 middleware fix).

**The 5 failures are a genuine, valuable finding — not a Cloud Run bug.** All 5 are
`launchpad-campaign-vote.spec.ts` / `launchpad-submission.spec.ts`'s "public routes are dark while
the flag is OFF" assertions, expecting 423 but getting 404 (shop-not-found, i.e. the code ran PAST
the flag check). Traced to the actual live Supabase row: `select * from platform_flags where key =
'launchpad.enabled'` → `{enabled: true, updated_at: 2026-07-08, updated_by: user_3EO7iwpx1mG4aIKF0N5qq8glAA0}`
— **the flag was flipped ON in prod 2 days ago**, contradicting both this test's own docstring
("dark while the flag is OFF") and `MEMORY.md`'s epic note ("Behind `launchpad.enabled` (OFF)").
Cross-checking why CI's Vercel-preview run passes the identical assertion: per the
`ci-preview-bypass` team memory, `SUPABASE_SERVICE_ROLE_KEY` is **deliberately kept prod-only**,
never widened to `preview` scope — so the Vercel preview can never actually read the live flag row;
every preview run only ever exercises `lib/flags.ts`'s fail-open-to-`DEFAULT_FLAGS` path
(`launchpad.enabled: false`), regardless of what's really live. Cloud Run reused the backend's real
`SUPABASE_SERVICE_ROLE_KEY` (S1.3, by design), so it's the more faithful signal here — a CI-preview
blind spot for any similarly-shaped flag-off assertion, not a Cloud Run regression. **Owed:** confirm
with Daniel whether `launchpad.enabled` was deliberately flipped live (Launchpad epic's own owed
money-smoke?) — if so, update the stale `MEMORY.md` line and this test's assumption; if not, it's a
live incident to investigate separately from this migration.

**UCP/MCP probes:** `GET /api/ucp/manifest` → 200, valid manifest JSON. `POST /api/ucp/mcp`
(`tools/list`) → 200, valid JSON-RPC 2.0 response listing `search_listings` and siblings with full
`inputSchema`s.

**ISR concurrency check:** 8 concurrent `GET /` requests → all 200, byte-identical bodies (105280
bytes each, no divergence). Caveat: with `--min-instances=0` and a small quick burst, these likely
all landed on one warm instance rather than genuinely exercising ≥2 concurrent instances — a
conclusive multi-instance ISR test would need sustained concurrent load to force Cloud Run's
autoscaler to spin up a second instance. No inconsistency observed in this lighter-weight pass;
flagging the caveat rather than claiming full coverage.

## Sprint QA
- **api spec(s):** 1.1 → `e2e/edge-route-parity.spec.ts` (bytes/headers of `/api/splash`,
  `/api/icon`). 1.4 needed no new spec — the existing suite already has broad UCP/MCP coverage
  (`agent-discovery.spec.ts`, `mcp-tool-dispatch-parity.spec.ts`, `agent-connector.spec.ts`, and
  others), all of which passed running against the dark URL; a manual curl of `/api/ucp/manifest`
  + `/api/ucp/mcp` cross-checked the same result directly.
- **browser smoke owed:** no (all dark; no money/auth surface changes)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge;
  1.3 additionally: the `node:test` deploy-invariants guard (`deploy-invariants-frontend.test.js`).

## Sprint 1 — Smoke walkthrough (do these in order)
**Current state (2026-07-09, post-merge):** PR #201 merged to `main` (`d2266db`) — cross-review
(Codex) clean, CI green. Vercel prod (`miyagisanchez.com`) deployed as normal from this merge; it is
now serving Sprint 1's code (the edge→Node conversion + standalone/Dockerfile scaffolding, all
no-ops for Vercel) — still 100% of real user traffic, unchanged behavior. `miyagi-web` on Cloud Run
picked up the same merge automatically via the now-wired `frontend-main-deploy` trigger. Dark URL
(stable, project-hash form): `https://miyagi-web-oehqqtyoia-uk.a.run.app` — no DNS points at it;
still unreachable except by its own URL.

1. Open https://miyagisanchez.com/api/splash.
   → Renders the splash image on real prod — confirms Story 1.1's edge→Node conversion shipped
   clean to Vercel with no visible change.
2. Open `https://miyagi-web-oehqqtyoia-uk.a.run.app/` in a private window.
   → The marketplace homepage renders fully (images optimized, no 500s).
3. Open `https://miyagi-web-oehqqtyoia-uk.a.run.app/api/ucp/manifest`.
   → Valid JSON manifest, same shape as https://miyagisanchez.com/api/ucp/manifest.
4. Open `https://miyagi-web-oehqqtyoia-uk.a.run.app/api/health`.
   → `{"ok":true}` — proves the container itself is healthy independent of any secret/config.
5. Confirm both rails fired from the same merge:
   `gcloud run revisions list --service=miyagi-web --region=us-east4 --project=miyagisanchezback-497722`
   → A revision created at merge time, alongside the Vercel prod deployment for the same commit
   (`d2266db`) — visible in the Vercel dashboard's Deployments tab.

If any step fails, note the step number + what you saw — that's the bug report.

**Known gaps carried forward (not blocking — Daniel's call on timing, confirmed 2026-07-09):**
- 4 secret shells still empty (`SERPAPI_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`,
  `TELEGRAM_CHAT_ID_APP`) — SerpAPI search, the frontend's own Stripe webhook, cron auth, and admin
  Telegram notifications won't work on this dark URL until populated. Daniel will set these when
  each is actually reached (`STRIPE_WEBHOOK_SECRET` needs a webhook endpoint registered against
  this URL first — do that before populating it).
- `launchpad.enabled` live `true` in prod (flipped 2026-07-08) — **confirmed intentional by
  Daniel 2026-07-09**; `MEMORY.md` updated (`bookshop-launchpad-epic.md` + its index line).
