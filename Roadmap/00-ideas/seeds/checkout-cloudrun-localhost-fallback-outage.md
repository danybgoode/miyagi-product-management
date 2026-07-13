---
title: "Checkout on prod resolves to localhost:9000 — live money-path outage"
slug: checkout-cloudrun-localhost-fallback-outage
status: shipped
area: "02"
type: bug
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-13
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

## Fix built — PR danybgoode/miyagisanchezcommerce#244 (fix/checkout-cloudrun-localhost-fallback)
Planned by an Opus 4.8 Plan agent given the money-path stakes, built by Sonnet 5. **Not** the
props-threading pattern from PR #243 (`lib/cart.ts`'s `startCheckout` is a whole multi-step
orchestration called from 2 different client buttons — BuyButton, CheckoutPayButton — not a single
component tree a Server Component prop can reach cleanly). Instead: a new thin Route Handler,
`app/api/checkout/start/route.ts`, calls the **unchanged** `startCheckout` server-side (matching the
codebase's own existing `app/api/checkout/{options,validate-coupon,postal-lookup,shipping-rates}`
proxy-route convention); a new `lib/cart-client.ts` gives the two client buttons a same-signature
drop-in replacement that POSTs to the new route instead of calling Medusa directly. `lib/cart.ts`
itself is untouched — zero risk to its tested checkout logic. Full reasoning (including why a
Server Action was rejected) is in the PR/commit.

**Status:** merged 2026-07-13 (Daniel, `444c5cb`), deployed (Cloud Build `7139e2d8` → SUCCESS,
revision `miyagi-web-00057-d7p`, 100% traffic). **Live prod-bundle grep confirms the fix**: fetched
the same real PDP page used to find this bug and grepped its shipped JS chunks —
`localhost:9000` gone (0 matches), the raw `start-checkout` Medusa path gone from client code, and
`/api/checkout/start` (the new route) present in its place, exact call:
`fetch("/api/checkout/start",{method:"POST",...})`. The route itself confirmed live: malformed/empty
POST → `400`, GET → `405`.

**Still owed (Daniel-only, cannot be automated):** a real end-to-end prod checkout — both
`startCheckout` exit paths, a genuine "Comprar" → Stripe redirect, and a manual/SPEI "Confirmar
pedido" → order-page completion — to confirm the full flow completes with a real payment, not just
that the fetch targets the right endpoint.

## Scope
**v1 = PR #244, merged and deployed.** Bundle-level verification done (see above). Daniel's real
checkout completion smoke is the only remaining item before this closes fully.

**Out of v1 / needs its own investigation:** whether `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` /
`NEXT_PUBLIC_MP_PUBLIC_KEY` / `NEXT_PUBLIC_SUPABASE_*` have the same gap — see the companion seed
[`nextpublic-buildtime-inlining-audit`](./nextpublic-buildtime-inlining-audit.md).

## Risk
**HIGH — money path, live production outage.** Per WAYS-OF-WORKING this is Daniel-merge tier
regardless of how mechanically small the fix is (payments/checkout named explicitly). Treat as an
active incident: verify scope and impact fast, fix, smoke on real prod money flow before
considering closed.
