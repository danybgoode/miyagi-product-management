---
title: "Defense-in-depth: pass NEXT_PUBLIC_* as Docker build-args in the Cloud Run frontend pipeline"
slug: nextpublic-docker-buildargs-hardening
status: shipped
area: "09"
type: chore
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-13
---

# Scope — Docker build-args hardening for NEXT_PUBLIC_* vars

## Outcome & signal
The Cloud Run frontend Docker build (`apps/miyagisanchez/Dockerfile` + `cloudbuild.yaml`) never
passes `NEXT_PUBLIC_*` env vars as Docker **build-args** — only `infra/gcp/deploy-frontend.sh` sets
them, as Cloud Run **runtime** env vars, applied after the image is already built. Next.js inlines
`NEXT_PUBLIC_*` at `next build` time, so any client-side (`'use client'`) code that reads one
directly bakes in `undefined` permanently for that build. This has now caused two confirmed live
production bugs (homepage personalization — fixed, PR #243; checkout — fixed, PR #244), both
caught only by grepping the actual shipped JS bundle after the fact.

## Why this is separate from the two hotfixes above
Both bugs were fixed by moving the read to a server boundary (Server Component props for the
homepage; a thin Route Handler proxy for checkout) — the correct, durable fix for code that's
already been written. This seed is about the **class** of bug, for code that hasn't been written
yet: any *future* `'use client'` file that reads a `NEXT_PUBLIC_*` var directly will silently
reintroduce the same failure mode, invisible to `tsc`/`next build` (both pass happily with
`undefined` baked in). Adding the build-args doesn't replace the server-boundary fix pattern (a
future author could still write client code that never needed a `NEXT_PUBLIC_*` var at all, e.g. by
following the `app/api/checkout/*` proxy convention) — it's a second, cheaper layer of defense for
whichever vars a client component ends up reading directly anyway.

## Suggested approach
1. Add `ARG`/`ENV` declarations for the current known set of client-read `NEXT_PUBLIC_*` vars to the
   `builder` stage of `apps/miyagisanchez/Dockerfile`.
2. Pass them as `--build-arg` in `cloudbuild.yaml`'s `docker buildx build` step, sourced from Cloud
   Build substitutions or Secret Manager (whichever are actually public/non-secret — most of these,
   like a Stripe/MercadoPago *publishable* key or a store URL, are meant to be public).
3. Add a lightweight CI guard (mirroring the existing `deploy-invariants.test.js` pattern for the
   backend's Cloud Run config) asserting the Dockerfile's build-args list and
   `infra/gcp/deploy-frontend.sh`'s `--set-env-vars` list stay in sync for every `NEXT_PUBLIC_*` var
   — so a newly-added var doesn't silently fall through the gap again.
4. Cross-reference [`nextpublic-buildtime-inlining-audit`](./nextpublic-buildtime-inlining-audit.md)
   (the spike sweeping for OTHER already-shipped instances of this bug) — that seed finds existing
   breakage; this one prevents new breakage.

## Scope
**In v1:** Dockerfile + cloudbuild.yaml build-arg wiring for the current `NEXT_PUBLIC_*` var set,
plus the CI sync guard. **Out of v1:** auditing whether any *currently* broken var needs fixing
(that's the audit seed's job) — this seed is purely the pipeline hardening.

## Risk
**HIGH, not LOW as originally filed** — corrected during planning. `apps/miyagisanchez/Dockerfile` +
`cloudbuild.yaml` are shared CI/CD infra, which `WAYS-OF-WORKING.md`'s risk-tier rule explicitly names
as a HIGH-risk trigger (Daniel-merge tier), independent of urgency. Not a live-money-path fix itself
(the two live outages this hardens against are both already fixed by their own dedicated PRs), but
the deploy pipeline itself is shared infra regardless.

## Shipped 2026-07-13
Planned by an Opus 4.8 Plan agent (escalated given the corrected HIGH tier), built by Sonnet 5.
Merged as danybgoode/miyagisanchezcommerce#245 (app repo) + danybgoode/miyagi-product-management#80
(root repo, companion — both had to merge together since #245's `cloudbuild.yaml` depends on secrets
#80's scripts describe).

**Repo-boundary discovery mid-build:** `apps/miyagisanchez` and the root repo are two separate,
independently-hosted GitHub repos with separate CI — the originally-planned single cross-repo guard
test could never run in either repo's CI. Redesigned as two self-contained guards
(`infra/gcp/test/frontend-build-args.test.js` + `apps/miyagisanchez/e2e/frontend-build-args.spec.ts`),
anchored to the same explicit, hardcoded var list kept identical by convention (verified byte-identical
by the fresh reviewer) rather than by reading across the repo boundary.

**GCP provisioning** (explicit user go-ahead, values sourced from `.env.local`, never echoed): 7 new
Secret Manager secrets created + populated; CI/CD build SA (`miyagi-web-cicd`, not the runtime
`miyagi-web-run`) granted `secretAccessor` on those 7 + the existing `SUPABASE_URL` secret (reused for
`NEXT_PUBLIC_SUPABASE_URL` rather than a duplicate).

**Live verification:** the real post-merge Cloud Build succeeded (`13189c82`, revision
`miyagi-web-00058-kg7`) — confirms secretEnv resolution worked. Live-bundle grep of a real PDP +
homepage: `localhost:9000` still gone; comprehensive negative check found no server-only secret
leaked (two apparent hits traced to Clerk's own bundled SDK doing harmless dead
`process.env.CLERK_SECRET_KEY`-style reads, unrelated to this change).

**Known gap, stated honestly:** could not positively confirm the 8 real-key vars (Stripe/MercadoPago/
Supabase/VAPID) are correctly inlined via anonymous curl — Stripe/MercadoPago have zero client-side
SDK usage anywhere in the app (checkout is redirect-based), and the only two consumers that exist
(`lib/supabase-browser.ts`, `lib/push-client.ts`) are gated behind an authed `/messages/:id` session.
The successful build + both green CI guards give strong structural confidence; a fully definitive
check needs Daniel's authed session, same constraint as the checkout-fix money-path smoke.

**Fast-follow, not filed as its own seed:** point `deploy-frontend.sh`'s 8 required vars at the same
Secret Manager secrets instead of operator-typed shell vars, so the build-time and runtime values
share one source and can't skew.
