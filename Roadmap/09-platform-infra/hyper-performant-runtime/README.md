---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: hyper-performant-runtime
build_order: null    # integer position in the ONE global build sequence — the SSOT once the epic
                     # exists (the seed's value is only a fallback). Fill it in at the betting
                     # table; plain integers, no "#2a" suffixes. See 00-ideas/README.md → Ordering.
---

# Epic: Hyper-performant runtime

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Chore · **Archetype:** Maintainer · **Scope seed:** [`00-ideas/seeds/hyper-performant-runtime.md`](../../00-ideas/seeds/hyper-performant-runtime.md)

## Why

The site feels slow to use even though it scores well on PageSpeed. That is not a contradiction —
it is the diagnosis. PageSpeed measures **one cold, signed-out first paint of `/`**, which
[`marketplace-static-shell`](../marketplace-static-shell/README.md) turned into a prerendered CDN
asset, and which [`hyper-performant-website`](../hyper-performant-website/README.md) then tuned to a
green score. Both epics worked. Neither measured what a person actually does after that first paint.

The product owner's report (2026-08-22): *"slow everywhere but particularly the signed-in homepage,
then navigating on PDP to open the merchant's shop is also very slow. PageSpeed is actually pretty
ok."* This epic makes **navigation and signed-in rendering** as fast as the first paint already is,
and puts a guard in the gate so it stays that way.

**This is a sibling of `hyper-performant-website`, not a repeat of it.** That epic fixed *assets*
(image bytes, render-blocking CSS, Clerk lazy-mount). This one fixes *runtime* (render mode, edge
cacheability, origin warmth, and the JavaScript that ships to every buyer page).

## Platform-first note

**No commerce model changes. Zero.** Medusa still owns commerce (AGENTS rule #1) — nothing here
touches products, orders, payments, fulfillment or returns. Supabase keeps its non-commerce tables
(#2) and is explicitly **not** migrated by this epic (split to
[`00-ideas/seeds/spike-supabase-colocation.md`](../../00-ideas/seeds/spike-supabase-colocation.md)).
UCP/MCP surfaces are untouched (#3). Clerk **auth** is untouched (#4) — the existing
`clerk-lazy/` wrappers stay exactly as they are. No new user-facing copy, so no new bilingual
strings (#5).

What changes is **how existing pages render and what the browser downloads** — a render-mode,
edge-config and bundle-composition epic. If a story proposes editing a Medusa module or a Supabase
migration, that is a signal something has been misread.

### The root cause, as found at grooming (verified in the tree, 2026-08-22)

`app/(shell)/layout.tsx:38` calls `await headers()` — deliberately, to make the channel/chrome
decision. That opts the **entire `(shell)` subtree** into dynamic rendering, with three consequences
nobody has been reading:

1. **`export const revalidate = 120` is a silent no-op on ~15 public routes** — `s/[slug]/page.tsx:42`
   and its six sub-pages, `s/[slug]/c/[collection]`, `mx/s/[slug]/*`, `colecciones`, `tienda`,
   `embed/s/[slug]`. A page under a `headers()`-tainted layout cannot be static or ISR. Documented
   intent and runtime behaviour have disagreed since the static-shell split.
2. **Cloudflare cannot cache shop/PDP HTML**, so every PDP → shop click is a full origin render.
3. **The origin is `--min-instances=0 --cpu=1 --memory=1Gi`** (`infra/gcp/deploy-frontend.sh:91-94`),
   so the first navigation after idle pays a Cloud Run cold start *and* an empty per-container
   `unstable_cache`. The backend has run `min=1` since
   [`postgres-neon-to-cloudsql`](../postgres-neon-to-cloudsql/README.md); the frontend never got it.

Plus, measured against the live build (BUILD_ID `3G3h-WqNxT8DegPaaMSVJ`, 2026-08-20): **4.3 MB of
client chunks**, the largest being **309 KB of Sentry with Session Replay enabled on every page**,
and **212 of 443 components marked `'use client'`** (48,815 lines).

## What already exists (reuse, don't rebuild)

- **`infra/gcp/deploy-frontend.sh`** — the one-time full-config Cloud Run deploy. Scaling flags live
  here and survive image-only CI deploys. **Never** reintroduce full-deploy semantics into
  `cloudbuild.yaml` (LEARNINGS → *Backend Cloud Run deploy is image-only*).
- **`infra/gcp/test/deploy-invariants.test.js`** + the frontend equivalent — the drift-guard pattern.
  The `min-instances` change gets an assertion here, never a manual check.
- **`infra/gcp/cloudflare-cache-provision.mjs`** — the **already-built** idempotent Cache-Rule script
  (`/api/img` rode it in `hyper-performant-website` S1). S2.2 extends it. Do not write a second one.
  `cloudflare-waf-provision.mjs` is the canonical idempotent-script shape.
- **`lib/image-loader.ts`** — the custom `next/image` loader seam; `next.config.ts` already declares
  `loader: 'custom'`. S1.2 changes **where it points**, not the seam.
- **`app/api/img/route.ts`** — the route being retired. Its host allow-list, `redirect:'error'`,
  streamed byte-cap and `QUALITY_LADDER` are the **security contract to preserve at the edge**, not
  to discard. It is also the only `sharp` importer in the app (verified).
- **`lib/r2.ts` + `ingestImageUrls()` + `lib/supply-import.ts`** — the R2 ingest path. **Unchanged.**
  Storage stays in R2; only *transformation* moves.
- **`e2e/perf-budget.spec.ts`** — 11 source-code checks + 3 live checks, already written. S1.2 updates
  its `/api/img` assertions; S3.4 extends it. Its header comment records *why* it measures what it
  measures — preserve that reasoning.
- **`lib/cache-policy.ts`** — the revalidate SSOT (`SHOP: 120`, `LISTING: 60`, `CATALOG: 30`) plus
  `storefrontCacheControl()`. S2 makes these values finally take effect; it does not re-invent them.
- **`middleware.ts` + `lib/channel.ts`** — already resolve the channel and set `x-miyagi-channel` /
  `x-miyagi-shop-slug` / `x-miyagi-domain` / `x-miyagi-embed`. This is S2.1's input.
- **`app/(site)/page.tsx` + `app/(mx-site)/mx/page.tsx`** — this codebase's own proof of a genuinely
  edge-cacheable route (no `headers()`/`cookies()`, auth gated client-side via `AuthShow`). S2.1's
  target shape, already demonstrated once.
- **`app/components/clerk-lazy/*`** — four `next/dynamic({ssr:false})` wrappers. The pattern S3.2
  copies for vendor deps; the wrappers themselves are untouched (AGENTS rule #4).
- **`app/components/HomePersonalizationProvider.tsx`** — one fetch, not a poll; already carries the
  `isLoaded`/`isSignedIn`/`settled` three-state model that killed the pop-in. S3 tunes *when* it
  fires; it does not rewrite it.
- **The channel guard suite** — `own-shop-seo.spec.ts`, the embed specs, `ChannelLayout`/white-label
  specs, `nav-entry-points.spec.ts`. **This is S2.1's acceptance harness, already written.**
- **`scripts/neon-egress.mjs`** — the measurement-harness shape S1.3's `perf-probe` clones (measure,
  degrade, three states — never a confident empty result).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Frontend Cloud Run `min-instances=1` + drift-guard assertion | **high** |
| 1 | 1.2 Image transforms → Cloudflare `/cdn-cgi/image/`; retire `/api/img` + the sharp encode | low |
| 1 | 1.3 `scripts/perf-probe.mjs` — TTFB / `cf-cache-status` / transfer / client-JS baseline | low |
| 2 | 2.1 Lift `headers()` out of the **public read** `(shell)` subtree (`/s/**`, `/l/[id]`) | **high** |
| 2 | 2.2 Cloudflare Cache Rule for the public read paths + MISS→HIT probe per channel | **high** |
| 2 | 2.3 Guard spec — no `revalidate` export under a `headers()`-tainted layout | low |
| 3 | 3.1 Drop Sentry Session Replay from the client bundle (error reporting stays) | low |
| 3 | 3.2 `next/dynamic` the vendor deps at their real call sites (`xlsx`, `jszip`, `mercadopago`, `@dnd-kit`) | low |
| 3 | 3.3 HTML-native sweep on the named buyer surfaces (`<details>` / `<dialog>` / `popover`) | low |
| 3 | 3.4 Per-route client-JS **transfer** budget in the deterministic gate | low |

## Deploy order

**Frontend + infra only. No backend changes, no migrations.**

Sprints are ordered by dependency and must ship in order:

- **S1 before S2** — S1.3's probe is what proves S2 worked. Ship the measurement before the change.
- **S2.1 before S2.2** — a Cache Rule on a still-dynamic route buys nothing. This exact trap was
  learned here on 2026-07-18 (`/api/img` set `immutable` and still ran `cf-cache-status: DYNAMIC`
  until an explicit rule existed). Ship the render-mode change and the rule in the same wave, and
  prove it with a MISS→HIT probe, never with response headers alone.
- **S3 is independent** of S1/S2 and may land in parallel, but it shares hot files with nothing else
  in flight — check for sibling PRs on `app/components/*` before starting.

**Shared-surface announcements owed:** S1.1 changes live Cloud Run service config; S2.1 touches
`app/(shell)/layout.tsx` (every route in the subtree); S2.2 changes shared Cloudflare edge config.
All three can break sibling PRs and must be announced before merge.

**Degrade-gracefully:** S1.2's old `/api/img` URLs keep serving until the deploy flips the loader, so
images never break mid-rollout. S3.1/S3.2 are removals — nothing consumes their output.

## Kill-switch — decided at grooming (Stage 6b): **carve-out, no flag**

*Is there a runtime seam a kill-switch can gate?* **No, and a flag would be the wrong tool for all
three high-risk stories.** S1.1 is Cloud Run service config (rollback = re-run the deploy script,
drift guard proves it). S2.1 is a build-time property of the route tree — nothing evaluates at
runtime for a flag to intercept (rollback = `git revert`). S2.2 is edge config provisioned by an
idempotent script that filters by its own rule description, so hand-added rules survive a rollback.

Consistent with WAYS-OF-WORKING → *Feature flags — OFF by default as a practice* (2026-08-10). **This
epic adds no flags.**

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** N/A — carve-out recorded above (infra/render-mode; no runtime seam). *Verify-only.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
