---
title: "Audit: which NEXT_PUBLIC_* client reads are actually inlined at Cloud Run build time"
slug: nextpublic-buildtime-inlining-audit
status: raw
area: "09"
type: spike
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-12
---

# Scope — Systemic audit: NEXT_PUBLIC_* build-time inlining on Cloud Run

## Outcome & signal
A single root cause has now been confirmed in **two** places: the frontend Cloud Run Docker build
(`apps/miyagisanchez/Dockerfile` + `cloudbuild.yaml`) never passes `NEXT_PUBLIC_*` vars as Docker
**build-args** — only `infra/gcp/deploy-frontend.sh` sets them, as Cloud Run **runtime** env vars,
applied after the image already exists. Next.js inlines `NEXT_PUBLIC_*` at `next build` time, so
any **client-side** (`'use client'`) code reading one of these directly gets `undefined` baked in
permanently, for every build, until the mechanism itself is fixed.

Confirmed instances (both found via live-prod-bundle grep, no auth needed):
1. `HomePersonalizationProvider.tsx` — `NEXT_PUBLIC_MEDUSA_STORE_URL` /
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` → fixed in `home-dynamic-rows-restore-and-polish` S1
   (PR #243) by threading the value down as a prop from a Server Component parent instead.
2. `lib/cart.ts` (`MEDUSA_BASE`, feeds checkout) — same pattern, confirmed live, NOT yet fixed —
   see [`checkout-cloudrun-localhost-fallback-outage`](./checkout-cloudrun-localhost-fallback-outage.md)
   (HIGH priority, separate from this seed).

**Unconfirmed** (homepage/PDP bundles don't load these chunks, so a live grep hasn't checked them):
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and any others read directly in a
`'use client'` file rather than threaded from a Server Component. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
is confirmed to have the SAME broken-inlining bundle text, but it's harmless there — Clerk's own
SDK reads its key server-side and forwards it as a prop internally, never depending on the client
fallback (the exact fix pattern this epic already reused for #1 above).

## Suggested approach
1. **Grep-based static sweep** (cheap, fast): `grep -rn "process\.env\.NEXT_PUBLIC_" apps/miyagisanchez --include="*.tsx" --include="*.ts"` cross-referenced against which files are `'use client'` vs Server Components. A client-side direct read is a candidate; a Server-Component read that gets threaded as a prop is safe (matches the ClerkProvider/PR #243 pattern).
2. **Live-bundle verification** for anything flagged: fetch the actual page(s) that load the flagged component, download the referenced chunks, grep for the literal `NEXT_PUBLIC_*` var name / known fallback value (same method used for both confirmed findings above) — a static grep alone can't prove whether a given var actually shipped broken; only the live bundle does.
3. For each confirmed broken one, decide fix shape case-by-case: props-threading (preferred, matches existing precedent) vs. a small server-only API route the client calls once at load (for cases where there's no convenient Server Component ancestor).

## Scope
**In v1:** the sweep + live verification above, producing a definitive list of "actually broken in
prod" vs "safe" for every `NEXT_PUBLIC_*` var the app defines. File a follow-up bug seed per
confirmed-broken instance (same shape as the checkout seed), prioritized by money/auth path first.

**Out of v1:** fixing the Docker/cloudbuild pipeline to also pass build-args (would only patch the
CURRENT set of vars, not the systemic client-read-location issue — the props-threading pattern is
the durable fix per-instance, this spike is about finding all instances, not re-architecting the
build).

## Risk
Spike itself is LOW (read-only investigation). Money/auth-adjacent instances found (Stripe,
MercadoPago) should be treated as HIGH/urgent the moment they're confirmed live-broken, same as
the checkout finding.
