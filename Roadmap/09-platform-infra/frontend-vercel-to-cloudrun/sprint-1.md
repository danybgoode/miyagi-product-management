# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 1: Containerize + shadow rail

**Status:** 🚧 in progress — Story 1.1 merged to branch, PR #201 (draft)

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

### Story 1.2 — Standalone build + Dockerfile
**As a** platform operator, **I want** `output: 'standalone'` + a multi-stage Dockerfile
(deps/builder/runner; `sharp` installed in the runner stage, arch-matched; `public/` +
`.next/static` copied explicitly), **so that** the frontend runs as a self-contained container.
**Acceptance:** `docker build` + `docker run` locally serves the app incl. an optimized
`/_next/image` request; `next build` still green on Vercel (standalone must not break the preview rail).
**Risk:** low

### Story 1.3 — Cloud Build → Artifact Registry → Cloud Run `miyagi-web`
**As a** platform operator, **I want** a `cloudbuild.yaml` in `apps/miyagisanchez` (cloned from the
backend trigger shape) deploying to a Cloud Run service `miyagi-web` in us-east4, with env/secrets
provisioned by an idempotent script + a `node:test` drift guard (the `deploy-invariants` pattern),
**so that** every merge to `main` deploys both rails.
**Acceptance:** merge → image in Artifact Registry → new Cloud Run revision serving on the dark
`*.run.app` URL. Secrets re-minted from provider dashboards (Vercel Sensitive vars are write-only —
LEARNINGS), never "copied". Drift-guard test green.
**Risk:** high (shared infra — announce; new deploy rail)

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
