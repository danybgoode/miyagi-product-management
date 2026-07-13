---
title: "Defense-in-depth: pass NEXT_PUBLIC_* as Docker build-args in the Cloud Run frontend pipeline"
slug: nextpublic-docker-buildargs-hardening
status: raw
area: "09"
type: chore
priority: null
risk: low
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
LOW — infra/deploy-pipeline change, not a live-money-path fix itself (the two live outages this
would have prevented are both already fixed by their own dedicated PRs). Still touches shared
Cloud Build config, so treat as a normal infra change requiring the usual care (rehearse a build
before merging, confirm no var collision with existing Cloud Run runtime-only secrets).
