---
title: "Checkout on prod resolves to localhost:9000 — live money-path outage"
slug: checkout-cloudrun-localhost-fallback-outage
status: ready
area: "02"
type: bug
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-12
---

# Scope — Checkout on prod resolves to localhost:9000 (live outage, urgent)

## Outcome & signal
Every "Comprar" click on prod currently fails, because the client-side checkout call resolves to
`http://localhost:9000` in the visitor's own browser instead of the real backend. This has been
broken since the Vercel→Cloud Run cutover (2026-07-10, per AGENTS.md) — an estimated ~2 days of
broken checkout in production at time of writing.

## How this was found
Discovered as a side-finding while shipping `home-dynamic-rows-restore-and-polish` Sprint 1 (PR
#243, miyagisanchezcommerce). That sprint root-caused a different-but-identical bug: the homepage
personalization fetch was pointing at `localhost:9000` because `NEXT_PUBLIC_MEDUSA_STORE_URL` /
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` are never passed as Docker **build-args** in the Cloud Run
frontend pipeline (`apps/miyagisanchez/Dockerfile` + `cloudbuild.yaml`) — only as Cloud Run
**runtime** env vars (`infra/gcp/deploy-frontend.sh`, applied after the image is already built).
Next.js inlines `NEXT_PUBLIC_*` at `next build` time, so any client-side code reading it directly
gets `undefined` baked in permanently for that build.

The PR #243 fresh-reviewer pass (a `pr-reviewer` subagent) swept for other consumers of the same
pattern and flagged `lib/cart.ts`. **Independently confirmed live** against a real prod PDP page
(`https://miyagisanchez.com/l/prod_01KTRSSJKCAPYX6QDVPXJECFQG`), fetching its shipped JS chunk and
finding the literal fallback string, no `api.miyagisanchez.com` reference anywhere in it:

```
i=t.default.env.NEXT_PUBLIC_MEDUSA_STORE_URL??t.default.env.MEDUSA_STORE_URL??"http://localhost:9000"
```

`lib/cart.ts:50` (`MEDUSA_BASE`) feeds `medusaFetch` (`lib/cart.ts:64`), which every checkout call
uses (`/store/carts`, `/store/carts/:id/start-checkout`, `/store/carts/:id/complete`, etc.).
`startCheckout` is called client-side from `app/components/BuyButton.tsx` (`'use client'`) — the
buy button on every listing.

**Important nuance discovered while root-causing PR #243's fix (unlikely to save this one):**
`page.tsx`'s Server-Component reads of `MEDUSA_STORE_URL` self-heal via ISR regeneration (the
Server Component re-executes against live runtime env on every revalidate-window regen, confirmed
empirically). **`lib/cart.ts`'s read does NOT get that same self-healing** — it's read directly in
client-side (`'use client'`) code, in a plain module-level const, so it inlines to the wrong
value permanently at build time, exactly like the (now-fixed) `HomePersonalizationProvider` bug.
This is a genuine bug, not a transient/self-healing one — it will not fix itself on the next
deploy unless the fix changes where the value is read from.

## Suggested fix shape (mirrors PR #243's fix, not yet built)
Thread `storeUrl`/`publishableApiKey` down from a Server Component parent as props (same pattern
`app/(site)/page.tsx` now uses for `HomePersonalizationProvider`), or expose a tiny server-only
API route the client can call to fetch these public, non-secret values once at page load. Do NOT
try to fix by adding a Docker build-arg alone — that only fixes the value for the NEXT rebuild,
not for the mechanism-level gap (any future NEXT_PUBLIC_* env consumer would re-break the same
way). The props/RSC-payload approach is the systemic fix; a `--build-arg` is a patch for one var.

## Scope
**In v1 (urgent):** fix `lib/cart.ts`'s client-side store-URL/publishable-key resolution using the
props-threading pattern from PR #243. Verify against the live prod bundle (same read-only
grep-the-shipped-JS method) that `localhost:9000` no longer appears in any checkout-adjacent chunk.
Confirm a real prod checkout completes end-to-end (Daniel — money path, cannot be automated).

**Out of v1 / needs its own investigation:** whether `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` /
`NEXT_PUBLIC_MP_PUBLIC_KEY` / `NEXT_PUBLIC_SUPABASE_*` have the same gap — see the companion seed
[`nextpublic-buildtime-inlining-audit`](./nextpublic-buildtime-inlining-audit.md).

## Risk
**HIGH — money path, live production outage.** Per WAYS-OF-WORKING this is Daniel-merge tier
regardless of how mechanically small the fix is (payments/checkout named explicitly). Treat as an
active incident: verify scope and impact fast, fix, smoke on real prod money flow before
considering closed.
