---
title: "Hyper-performant runtime — origin latency, edge-cacheable shell, client-JS diet"
slug: hyper-performant-runtime
status: scaffolded
area: "09"
type: chore
priority: null
appetite: M
underwritten_by: null
risk: high
epic: "09-platform-infra/hyper-performant-runtime"
build_order: null
updated: 2026-08-22
---

# Pitch — Hyper-performant runtime

> **Sibling, not a repeat, of [`hyper-performant-website`](../../09-platform-infra/hyper-performant-website/README.md)
> (shipped 2026-07-18).** That epic fixed the **cold signed-out asset load** — R2 cache headers,
> responsive sizes, LCP priority, the iconoir subset, Clerk lazy-mount. It worked: the product owner
> reports **PageSpeed is now fine**. This epic fixes what PageSpeed does not measure — **runtime**:
> the signed-in homepage, client-side navigation, and the JS that ships to every buyer page.

## Problem

The product owner's report (2026-08-22), in his words: *"slow everywhere but particularly the signed
in homepage. then navigating on pdp to open the merchant's shop is also very slow. PageSpeed is
actually pretty ok."*

That last clause is the whole diagnosis. PageSpeed measures **one cold, signed-out, first-paint load
of `/`** — which `marketplace-static-shell` made a prerendered CDN asset, so it scores well and always
will. Every symptom named is **outside** that measurement:

**1. Every `(shell)` navigation is an uncacheable origin round-trip to a cold container.**
`app/(shell)/layout.tsx:38` calls `await headers()` — deliberately, to make the channel/chrome
decision (white-label vs buyer chrome vs seller-mode). That opts the **entire `(shell)` subtree**
into dynamic rendering. Consequence, verified in the tree:

- **`export const revalidate = 120` on ~15 public routes is a no-op** — `s/[slug]/page.tsx:42`,
  `s/[slug]/{tienda,acerca,faq,politicas,eventos,colecciones}`, `s/[slug]/c/[collection]`,
  `mx/s/[slug]/*`, `colecciones`, `tienda`, `embed/s/[slug]`. A page under a `headers()`-tainted
  layout cannot be statically rendered or ISR'd, so the documented intent and the runtime behaviour
  have silently disagreed since the static-shell split.
- **Cloudflare cannot cache the shop/PDP HTML**, so every PDP → shop click is a full origin render.
- The layout *itself* does work before the page starts: `getShop()`, `isShopPreviewPrivateBySlug()`,
  `deriveShopTrustInputs()` — then `s/[slug]/page.tsx` awaits ~11 more reads (`getShop` again,
  `getSlugRedirect`, `getActiveCustomDomain`, a `Promise.all` of listings/collections/wall,
  `readPublicWall`, `applyPreviewOverlay`, `resolveSectionAvailability`).

**2. That origin is scale-to-zero on one vCPU.** `infra/gcp/deploy-frontend.sh:91-94` —
`--min-instances=0 --max-instances=4 --cpu=1 --memory=1Gi`. So the first navigation after an idle
window pays a Cloud Run cold start **and** an empty `unstable_cache` (the incremental cache is
per-container; a fresh instance re-runs every read against Medusa/Cloud SQL and Supabase). The
backend `medusa-web` has run `min=1` since `postgres-neon-to-cloudsql`; the frontend never got the
same treatment. This is the same class of finding as that epic's — *"no traffic" ≠ "no cost"*,
inverted.

**3. The signed-in homepage is fast-then-slow by construction.** The static HTML lands instantly
(hence the good score), then the browser must: boot Clerk (~301 KiB, lazy-mounted by
`hyper-performant-website` S2.2 — deferred, not deleted) → `getToken()` →
`HomePersonalizationProvider` fires a **cross-origin fetch to Cloud Run** `/store/home/personalization`
→ the `HomeRetomaOffers` / `HomeSellerModule` islands render skeletons until it settles. Every step
is serial and none of it is in the PageSpeed number.

**4. The client bundle is genuinely fat.** Measured against the live `.next` build (BUILD_ID
`3G3h-WqNxT8DegPaaMSVJ`, 2026-08-20):

| Fact | Number |
|---|---|
| Total `static/chunks` | **4.3 MB** uncompressed |
| Largest chunk — contains **Sentry**, incl. `replayIntegration()` | **309 KB** |
| Chunk containing `xlsx` + `mercadopago` | 242 KB |
| Chunk containing `@supabase/supabase-js` | 235 KB |
| Further chunks ≥180 KB | 211 KB, 210 KB, 180 KB |
| `'use client'` components | **212 of 443** |
| Lines of client-side component code | **48,815** |

`sentry.client.config.ts` enables **Session Replay** (`replaysSessionSampleRate: 0.1`) on **every
page**, initialised from `instrumentation-client.ts` — including the static homepage, for a
pre-launch platform with an audience of one.

## Appetite

**M.** One epic-mode run, three sprints, split by **capability boundary** (origin → edge → client),
per WAYS-OF-WORKING *Operating posture* (2026-08-10) — not by confidence level. Each sprint ships a
finished capability. If S3 (the client diet) can't fit, the move is to cut named surfaces from its
sweep list, never to grow the appetite.

## Outcome & signal

After this ships:

- A PDP → shop click on a warm session feels **immediate** — the shop HTML comes from the Cloudflare
  edge, not a Cloud Run render.
- The **first** navigation after an idle hour is no slower than the tenth (no cold-start cliff).
- The signed-in homepage's personalization lands without a visible skeleton pass on a normal
  connection.
- A buyer page ships **materially less JavaScript**, and the deterministic gate fails if that
  regresses.

**How the product owner tests it (no tooling):** open a PDP on prod, click through to the merchant's
shop, count. Then leave the tab an hour and repeat. Then sign in and reload the homepage and watch
whether the "retoma"/seller modules pop in or are just there.

**How it's measured (Story 1.3):** `scripts/perf-probe.mjs` records TTFB, `cf-cache-status`, total
transfer and client-JS bytes for a fixed URL set. Every later story reports a before/after from it.
Per LEARNINGS, *a perf budget guard must measure what it polices* — this one measures **transfer**
bytes, not `body().length`.

## Stage-2.5 bucket

**Mixed — and three of the five original asks resolve as `already-possible` with no build.**

| Original ask | Bucket | Disposition |
|---|---|---|
| "Change hosting to GCP?" | **already done** | `frontend-vercel-to-cloudrun` shipped 2026-07-10. Next.js runs on Cloud Run us-east4 behind Cloudflare; Vercel is PR-previews only. **No work.** |
| "Move the DB to GCP?" | **already done** | `postgres-neon-to-cloudsql` shipped 2026-06-22. Commerce Postgres is Cloud SQL, private IP, same VPC as the backend. **No work.** |
| "Host images on GCP — would that help?" | **already-possible, and no** | Images are in **R2**, which has **zero egress** and sits behind the same Cloudflare zone that already fronts the site. Moving the bytes to GCS would add egress cost and remove them from the edge. The latency is **not** where the bytes are stored — it is that `/api/img` **re-encodes them with sharp on Cloud Run**. S1.2 fixes that without moving a single object. |
| "Pictures load extremely slowly" | **known open gap** | `hyper-performant-website`'s own retro logged it: *"sharp AVIF encode latency on cold variants (4–22 s) — consider lower effort or webp-default for w≥640."* Never actioned. |
| "The site is bloated with JS" | **genuinely new** | Nobody has swept this. Sprint 3. |

## Bill of materials (What / Why)

| What | Why |
|---|---|
| Frontend Cloud Run `--min-instances=1` | Kills the cold-start cliff **and** keeps `unstable_cache` warm. Backend already runs `min=1`. |
| Image transforms → Cloudflare `/cdn-cgi/image/` | No origin encode at all. Deletes the 4–22 s cold path, the sharp CPU, and `/api/img`'s SSRF surface. |
| Lift `headers()` out of the **public** `(shell)` read subtree | The one change that makes `revalidate = 120` real and lets the edge cache shop/PDP HTML. |
| Cloudflare Cache Rule for `/s/*`, `/l/*` | Cache-Control alone does nothing on a dynamic route — proven by S1's own `/api/img` MISS 16.2 s → HIT 0.3 s. |
| Guard: no `revalidate` under a `headers()`-tainted layout | The exact regression class this epic is paying off. A silent no-op must fail loudly next time. |
| Drop Sentry Session Replay from the client | Biggest single chunk (309 KB), on every page, replaying sessions for an audience of one. |
| `next/dynamic` the heavy vendor deps at their real call sites | `xlsx`/`jszip`/`mercadopago`/`@dnd-kit` belong to admin, import and checkout — not to a buyer browsing a shop. |
| HTML-native sweep on a **named** buyer-surface list | `<details>`, `<dialog>`, `popover`, CSS anchor positioning replace hand-rolled disclosure/modal/dropdown state — less JS, better a11y, free. |
| Per-route client-JS transfer budget in the gate | Without it the diet is a one-off and the bloat returns. |

## Scope

**In v1:**

- **S1 — Origin.** `min-instances=1` + drift guard; Cloudflare Image Transformations replacing the
  sharp proxy; the `perf-probe` measurement harness.
- **S2 — Edge.** De-dynamify the **public read** `(shell)` subtree (`/s/*`, `/l/*`); Cloudflare Cache
  Rule with a MISS→HIT probe; the `revalidate`-under-`headers()` guard spec.
- **S3 — Client.** Sentry Replay removal; vendor-dep route-splitting; HTML-native sweep on the named
  buyer surfaces; per-route JS transfer budget in the deterministic gate.

**Out of v1 (no-gos):**

- **Migrating Supabase to GCP.** ~60 non-commerce tables, 95 migrations, high risk, and **zero**
  effect on any symptom reported here (the static homepage touches none of it). Split to its own
  spike seed: `spike-supabase-colocation.md`.
- **Moving image storage off R2.** Answered above — R2 zero-egress behind the existing zone is
  already the right place.
- **Rewriting the seller portal / admin client components.** `OrderDetail.tsx` (1,659 L),
  `SellWizard.tsx` (1,623 L), `PromoterAdminClient.tsx` (937 L) are authed, low-traffic surfaces.
  Route-splitting their deps (S3.2) is in; rewriting them is not.
- **Touching Clerk auth.** AGENTS rule #4. The `clerk-lazy/` wrappers already exist; nothing moves.
- **Any new feature flag.** WAYS-OF-WORKING *Feature flags — OFF by default* (2026-08-10).
- **A shared incremental-cache tier** (Redis-backed Next cache). Named as a rabbit hole below.
- **All 212 client components.** S3.3 sweeps a written list, agreed at the architecture lock.

## Rabbit holes

- **De-dynamifying `(shell)` is where this epic could eat itself.** It is the same refactor class as
  `marketplace-static-shell` S1, which was HIGH risk and shipped guarded by the channel suite
  (`own-shop-seo.spec.ts`, the embed specs, `ChannelLayout` specs, `nav-entry-points.spec.ts`).
  **Decision patched here, in advance:** only the **public read** routes move — `/s/[slug]/**` and
  `/l/[id]`. Authed `(shell)` routes (`/shop/manage/*`, `/account/*`, `/admin/*`, `/checkout`) keep
  the dynamic layout untouched. `middleware.ts` already resolves the channel and sets `x-miyagi-*`;
  the question S2.1 answers is whether the public subtree can consume that via a rewrite rather than
  a `headers()` read in a shared layout. **If it can't cleanly, stop and hand back** — do not
  redesign the channel model inside a perf epic.
- **Preview-private shops must not become edge-cacheable.** `isShopPreviewPrivateBySlug` gates a 404.
  Any caching change must keep a preview-private shop unservable from cache, and the cache key must
  not collapse the channel variants (marketplace vs subdomain vs custom domain vs embed) into one
  entry. Verify with a real probe per surface, not by reading headers.
- **Cache-Control on a dynamic route buys nothing.** Already learned here once —
  `/api/img` set `immutable` and still ran `cf-cache-status: DYNAMIC` on every request until an
  explicit Cache Rule existed. Ship the rule in the same wave as the render-mode change, and prove
  it with a MISS→HIT probe (LEARNINGS, 2026-07-18).
- **Do not build a shared cache tier.** A Redis-backed Next incremental-cache handler would "solve"
  the per-container `unstable_cache` — and costs far more than `min-instances=1` plus edge caching.
  If S1.1 + S2.2 don't hold, that is a *new* pitch, not a story here.
- **Removing Sentry Replay must not remove Sentry.** Error reporting, the DSN wiring, `tracesSampleRate`
  and the three `sentry.*.config.ts` files stay. Only `replayIntegration()` and its two sample-rate
  keys go. `withSentryConfig` in `next.config.ts` is untouched.
- **`min-instances=1` is real recurring spend** on a pre-launch platform. It is the cheapest fix on
  the board, but it is money — the product owner signs off at the scope gate, not the builder.

## What already exists (reuse, don't rebuild)

- **`infra/gcp/deploy-frontend.sh`** — the one-time full-config deploy; scaling flags live here and
  survive image-only CI deploys. **Never** reintroduce full-deploy semantics into `cloudbuild.yaml`
  (LEARNINGS → *Backend Cloud Run deploy is image-only*).
- **`infra/gcp/test/deploy-invariants.test.js`** (+ the frontend equivalent) — the drift-guard shape.
  The `min-instances` change gets an assertion here, not a manual check.
- **`infra/gcp/cloudflare-cache-provision.mjs`** — the **already-built** idempotent Cache-Rule script
  (`/api/img` rode it). S2.2 extends it; it does not write a new one.
  `cloudflare-waf-provision.mjs` is the canonical idempotent-script shape.
- **`lib/image-loader.ts`** — the custom `next/image` loader seam. S1.2 changes **where it points**
  (`/cdn-cgi/image/...`), not the seam. `next.config.ts` already declares `loader: 'custom'`.
- **`app/api/img/route.ts`** — the route being retired. Its host allow-list, `redirect:'error'`,
  byte-cap and quality-ladder logic are the **security contract to preserve** at the edge, not to
  discard. (`ssrf-dns-pinning` seed is the sibling that owns the remaining `lib/image-ingest.ts` gap.)
- **`lib/r2.ts` + `ingestImageUrls()` + `lib/supply-import.ts`** — the R2 ingest path. **Unchanged.**
  Storage stays; only transformation moves.
- **`e2e/perf-budget.spec.ts`** — the existing budget spec (11 source-code checks + 3 live checks).
  S1.2 updates its `/api/img` assertions to the new loader target; S3.4 extends it with the per-route
  transfer budget. Its header comment already records *why* it measures what it measures.
- **`lib/cache-policy.ts`** — the revalidate-window SSOT (`SHOP: 120`, `LISTING: 60`, `CATALOG: 30`)
  and `storefrontCacheControl()`. S2 makes these values finally take effect; it does not re-invent them.
- **`middleware.ts` + `lib/channel.ts`** — already resolve the channel and set `x-miyagi-channel` /
  `x-miyagi-shop-slug` / `x-miyagi-domain` / `x-miyagi-embed`. This is the input S2.1 consumes.
- **`app/(site)/page.tsx` / `app/(mx-site)/mx/page.tsx`** — the codebase's own proof of a genuinely
  edge-cacheable route (no `headers()`/`cookies()`, auth gated client-side via `AuthShow`). S2.1's
  target shape.
- **`app/components/clerk-lazy/*`** — the four `next/dynamic({ssr:false})` wrappers. The pattern S3.2
  reuses for the vendor deps; the wrappers themselves are untouched.
- **`app/components/HomePersonalizationProvider.tsx`** — one fetch, not a poll; already has the
  `isLoaded`/`isSignedIn`/`settled` three-state model that killed the pop-in. S3 tunes *when* it
  fires, it does not rewrite it.
- **The channel guard suite** — `own-shop-seo.spec.ts`, the embed specs, `ChannelLayout`/white-label
  specs, `nav-entry-points.spec.ts`. These must stay green through S2.1; they are the acceptance
  harness for the render-mode change, already written.

## UX heuristics & rails check

- **CI guards covering this surface:** `e2e/perf-budget.spec.ts` (external render-blocking budget,
  image cache headers, Clerk lazy-mount, browserslist); `e2e/iconoir-subset.spec.ts`;
  `infra/gcp/test/deploy-invariants.test.js` + `alb-invariants` + `scheduler-invariants`; the
  channel/white-label suite; `scripts/doc-format.mjs --check`; `node scripts/build-order.mjs --check`.
- **Audits-lens findings that apply:** none in `00-ideas/audits/results-refresh-2026-06/` — that lens
  is UX/UI, and this epic is deliberately **behaviour-preserving**. S3.3 is the one story that
  touches markup; its acceptance is *same behaviour, less code* (Sweeper archetype).
- **Design-language debt (if any):** none introduced. S3.3 replaces JS-driven disclosure/modal state
  with native elements — it must reuse the existing design tokens and must not regress the
  `design-token-foundation` contrast/raw-hex guard.

## Kill-switch / runtime gate (risk:high — Stage 6b)

**Carve-out, no flag.** *Is there a runtime seam a kill-switch can gate?* — **No, and a flag would be
the wrong tool for all three high-risk stories:**

- **S1.1 `min-instances`** is Cloud Run service config, not application code. Rollback = re-run
  `infra/gcp/deploy-frontend.sh` with the previous value; the drift guard proves the state.
- **S2.1 render mode** is a build-time property of the route tree. Nothing evaluates at runtime for a
  flag to intercept. Rollback = `git revert`, which per the 2026-08-10 posture is faster than a flag
  flip and leaves no permanent branch in the code.
- **S2.2 Cache Rule** is edge config, provisioned by an idempotent script. Rollback = re-run it with
  the rule removed; it filters by its own rule description so hand-added rules survive.

Consistent with WAYS-OF-WORKING *Feature flags — OFF by default as a practice*: the catalog reached 35
flags, all ON, none of which ever bought anything. This epic adds none.

## Acceptance criteria

**S1.1** — `gcloud run services describe miyagi-web` reports `min-instances: 1`;
`deploy-invariants` asserts it and fails if it drifts; a request after ≥1 h idle returns in the same
band as a warm one.
**S1.2** — homepage and shop image URLs are `/cdn-cgi/image/...`; `app/api/img/route.ts` is gone;
`sharp` is no longer invoked in a request path; a cold variant returns in **< 1 s** (was 4–22 s);
`perf-budget.spec.ts` asserts the new loader target and still asserts long-lived cache headers; the
old host allow-list constraint is preserved at the edge and proved by a probe from a disallowed host.
**S1.3** — `node scripts/perf-probe.mjs` prints TTFB / `cf-cache-status` / transfer bytes / client-JS
bytes for the URL set; `--dry-run` is fully read-only (AGENTS rule); it **fails loudly** when it
cannot reach a target rather than reporting a confident empty result (AGENTS rule #5).
**S2.1** — `/s/[slug]` and `/l/[id]` render statically/ISR (`○`/`◐` in the build output, not `ƒ`);
the full channel suite is green; marketplace, subdomain, custom-domain and embed each render
correctly; a preview-private shop still 404s.
**S2.2** — a second request to a shop URL returns `cf-cache-status: HIT`; the MISS→HIT delta is
recorded in the sprint doc; each channel variant is probed separately.
**S2.3** — a spec fails when a `revalidate` export sits under a `headers()`-tainted layout, and was
observed red via a deliberate mutation.
**S3.1** — no Replay code in the client bundle; the 309 KB chunk shrinks by a measured amount; a
deliberately-thrown client error still arrives in Sentry.
**S3.2** — `xlsx`, `jszip`, `mercadopago` and `@dnd-kit` appear in **no** chunk loaded by `/mx`,
`/l/[id]` or `/s/[slug]`; the admin/import/checkout surfaces that need them still work.
**S3.3** — the named surfaces use native `<details>`/`<dialog>`/`popover`; behaviour and keyboard
a11y are unchanged or better; each converted surface has a spec observed red.
**S3.4** — the gate fails when a route's client-JS **transfer** size exceeds its budget; budgets are
recorded with the measurement that set them.

**Smoke walkthroughs owed to the product owner:** S1 (image cold-variant + idle-then-navigate), S2
(all four channel surfaces, incl. a private-window subdomain check), S3 (signed-in homepage; and a
checkout run, since S3.2 moves a `mercadopago` import — **money path, owed by name**).

## Open risks / research

- **Cloudflare Image Transformations pricing (checked 2026-08-22):** 5,000 unique transformations/mo
  free; **$0.50 per 1,000** beyond that on a paid plan. At a catalog of ~2,000 images × 3 widths ≈
  6,000 transforms ≈ **$0.50/mo**. Repeat requests for an identical URL do not re-bill. Remote-source
  (R2) transformation is the documented pattern and is what Cloudflare's own reference architecture
  recommends for R2-backed images. **Must be confirmed against the live zone's plan at S1.2** — the
  free tier errors with code `9422` past the cap rather than billing, which would break images
  silently rather than expensively.
- **`min-instances=1` cost** on `--cpu=1 --memory=1Gi` in us-east4 — one always-on instance. Small,
  but the product owner approves it explicitly at this gate.
- **CSS anchor positioning** (S3.3) still has uneven cross-browser support. The sweep must use it as
  progressive enhancement over a working fallback, never as the only positioning mechanism — this is
  the one place the HTML guide's list runs ahead of what ships safely today.
- **Unverified premise worth stating:** the `(shell)` layout's `getShop()` and the page's `getShop()`
  are both `unstable_cache`-wrapped, so the double call *should* dedupe within a request — but that
  has not been measured live, only read. S1.3's probe settles it before S2.1 designs around it.

## Sources

- `https://chrisburnell.com/html-can-do-that/` — the HTML-over-JS reference the product owner named.
  Direct fetch is blocked by the site's robots policy; content confirmed via the HN discussion
  (`https://news.ycombinator.com/item?id=49362689`): `<dialog>` + `popover` on the top layer,
  `<details>`, `<datalist>`, `<time>`, native date/form validation, CSS anchor positioning,
  `hidden="until-found"`, `autocomplete`.
- `https://theimagecdn.com/docs/cloudflare-images-pricing` — 2026 transformation pricing.
- `https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/` — the R2 + resizing reference architecture.
- `https://developers.cloudflare.com/images/optimization/transformations/integrate-with-frameworks/` — the Next.js custom-loader integration.
