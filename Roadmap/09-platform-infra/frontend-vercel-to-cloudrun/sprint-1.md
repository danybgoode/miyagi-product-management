# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 1: Containerize + shadow rail

**Status:** 🚧 in progress — Stories 1.1–1.3 done, PR #201 (draft), `miyagi-web` live (dark) on Cloud Run

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

CI/CD trigger (`cicd-setup-frontend.sh`) **not yet run** — needs a one-time console step (connect
`danybgoode/miyagisanchezcommerce` as a 2nd-gen Cloud Build GitHub repo, separate from the backend's
connection). Every merge to `main` does not yet auto-deploy `miyagi-web`; today's deploys are manual
(`deploy-frontend.sh` after a `gcloud builds submit`). Owed before this story is fully "every merge
deploys both rails."

### Story 1.4 — Shadow soak: the suite against the dark URL
**As a** platform operator, **I want** the existing Playwright/API suite run against the dark URL
with canonical host headers, plus `/api/ucp/manifest` + `/api/ucp/mcp` probes, **so that** the
panel's checkable claim ("canonical app, subdomains, checkout, UCP and crons can run from Cloud
Run") is proven before any DNS work.
**Acceptance:** suite green vs the dark URL; ISR'd pages behave across ≥2 concurrent instances
(known self-hosted ISR risk — watch explicitly, escalate if inconsistent); findings written into
this doc.
**Risk:** low

## Sprint QA
- **api spec(s):** 1.1 → `e2e/api/edge-route-parity.spec.ts` (bytes/headers of `/api/splash`,
  `/api/icon`); 1.4 reuses the existing suite + a UCP manifest/mcp probe spec.
- **browser smoke owed:** no (all dark; no money/auth surface changes)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge;
  1.3 additionally: the `node:test` deploy-invariants guard.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: dark Cloud Run URL (from `gcloud run services describe miyagi-web --format='value(status.url)'`)
· Vercel prod untouched.

1. Open https://miyagisanchez.com/api/splash and the same path on the Vercel preview branch.
   → Both render the identical splash image (Story 1.1 shipped to Vercel too).
2. Open `<dark-url>/` in a private window.
   → The marketplace homepage renders fully (images optimized, no 500s).
3. Open `<dark-url>/api/ucp/manifest`.
   → Valid JSON manifest, same shape as https://miyagisanchez.com/api/ucp/manifest.
4. Merge any trivial PR to `main`.
   → Vercel prod deploys as always AND a new `miyagi-web` revision appears — both rails fired.

If any step fails, note the step number + what you saw — that's the bug report.
