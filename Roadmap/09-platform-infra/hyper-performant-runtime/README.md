---
status: shipped  # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: hyper-performant-runtime
build_order: null    # integer position in the ONE global build sequence — the SSOT once the epic
                     # exists (the seed's value is only a fallback). Fill it in at the betting
                     # table; plain integers, no "#2a" suffixes. See 00-ideas/README.md → Ordering.
---

# Epic: Hyper-performant runtime

> ✅ **Shipped 2026-08-24.** Three ordered high-risk sprints reached production: Cloud Run keeps one
> frontend instance warm, public claimed reads have a privacy-preserving edge cache, and buyer runtime
> JavaScript has enforceable route budgets. The remaining signed-in and Sentry-dashboard observations are
> explicitly owed to Daniel in the sprint walkthroughs; they are not represented as automated proof.

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

### The root cause, as found at grooming (corrected by the architecture lock, 2026-08-22)

`app/(shell)/layout.tsx:38` calls `await headers()` — deliberately, to make the channel/chrome
decision. That opts the **entire `(shell)` subtree** into dynamic rendering. The locking pass also
found request reads inside the two headline pages themselves: `s/[slug]/page.tsx` reads `headers()`
and calls the Clerk-backed `applyPreviewOverlay()`, while `l/[id]/page.tsx` reads `headers()` and
`currentUser()`. Moving one layout read was therefore never sufficient; the public renderer and the
viewer/owner-only renderer have to be separated as an authorization boundary.

1. **`export const revalidate = 120` is a silent no-op on ~15 public routes** — `s/[slug]/page.tsx:42`
   and its six sub-pages, `s/[slug]/c/[collection]`, `mx/s/[slug]/*`, `colecciones`, `tienda`,
   `embed/s/[slug]`. A page under a `headers()`-tainted layout cannot be static or ISR. Documented
   intent and runtime behaviour have disagreed since the static-shell split.
2. **Cloudflare cannot cache shop/PDP HTML**, so every PDP → shop click is a full origin render.
3. **The origin is `--min-instances=0 --cpu=1 --memory=1Gi`** (`infra/gcp/deploy-frontend.sh:91-94`),
   so the first navigation after idle pays a Cloud Run cold start *and* an empty per-container
   `unstable_cache`. The backend has run `min=1` since
   [`postgres-neon-to-cloudsql`](../postgres-neon-to-cloudsql/README.md); the frontend never got it.

Plus, measured from the shipped `origin/main` build during the lock: **4.3 MB of client chunks**; the
largest chunk is **315,519 bytes** and contains Sentry Replay, which the static homepage loads too.
The earlier claim that buyer routes also load `xlsx`, `jszip`, `mercadopago` and `@dnd-kit` was false:
their actual Turbopack client-reference manifests contain none of those packages. That story is now a
guard over an already-correct boundary, not a dependency-moving build.

## Architecture lock — verified decisions (2026-08-22)

These decisions were made against frontend `origin/main` at `0eb9985`, the deployed Cloud Run and
Cloudflare configuration, a production HTTP probe, and read-only live Supabase/Medusa queries. They
replace any conflicting scaffold language below or in a sprint file.

1. **D1 — This is a two-repository delivery.** Product code lives in `apps/miyagisanchez`; Cloud Run,
   Cloudflare, the probe and roadmap docs live in the root repo. Each repo uses the same stack
   (`feat/hyper-performant-runtime` → `-s2` → `-s3`) where that sprint has a diff. A sprint that spans
   both repos necessarily has one PR per repo; the infra/root PR merges first only when the frontend
   deploy depends on it, otherwise the frontend deploy is proven before the live config mutation.
2. **D2 — No database or commerce schema work exists.** Live Supabase has 57 shops (15 claimed,
   42 unclaimed), four non-activated preview anchors, and one configured but unverified custom domain.
   There is no empty-table or migration window to spend. Medusa, checkout, payments and fulfillment
   stay untouched.
3. **D3 — The frontend warm-instance contract lives only in
   `infra/gcp/deploy-frontend.sh`.** At lock time, live `miyagi-web` had no `minScale` annotation
   (effective zero) and the script said `--min-instances=0`; both were changed to one. The live apply
   produced Ready revision `miyagi-web-00132-s6q`, serving 100% with `minScale: '1'`.
   `cloudbuild.yaml` remains image-only.
   The orchestrator applies and verifies the service config before its PR merges because merge deploys
   code that assumes the scoped runtime posture.
4. **D4 — Cloudflare image transformations are rejected; the zone stays Free.** The live zone reports
   the Free plan and `/cdn-cgi/image/*` returns 404. Enabling it would require new permissions/execution
   surface and its 5,000-new-transform ceiling can fail closed with error 9422. The shipped contract
   remains `lib/image-loader.ts` → `app/api/img/route.ts`, importing the route's HTTPS host allow-list,
   `redirect: 'error'`, streamed 25 MB cap and immutable success response exactly once from that route.
5. **D5 — Story 1.2 was scoped against the wrong image surface.** The critical shop/PDP components use
   raw R2 `<img>` URLs and never invoke `/api/img`; the proxy is used only by the handful of optimized
   `next/image` call sites. It is not retired. A live two-request probe proved the current Cloudflare
   rule ignores `Vary: Accept`: an AVIF MISS followed by a WebP-only request to the same URL returned
   the cached AVIF HIT. Therefore the loader emits an explicit fixed `f=webp` cache-key parameter plus
   quality 75; the route allow-lists that format and retains its no-format legacy negotiation for old
   URLs. The generated width set is reduced to the responsive widths the optimized call sites need.
   No R2 ingest/storage or edge-rule permission changes. A named-variant Cloudflare Worker is recorded
   as a future free-tier option, not part of this build.
6. **D6 — `scripts/perf-probe.mjs` measures bytes on the wire.** It uses a raw compressed HTTP read,
   not Fetch/Playwright `body()`, and reports TTFB, `cf-cache-status`, total transfer and route client-JS
   transfer with present/absent/unavailable states. Its live fixtures are marketplace URLs; a missing
   fixture is unavailable, never silently replaced. The committed baseline is dated and identifies the
   deployed revision it measured.
7. **D7 — Public rendering is an internal rewrite, not a request-header layout.** Middleware rewrites
   marketplace, entitled subdomain and embed reads to a private internal public-read route tree whose
   channel and identity are path parameters. Direct requests to that internal prefix fail. The renderer
   imports the shipped cache windows from `lib/cache-policy.ts`; it contains no `headers()`, `cookies()`,
   Clerk server read or owner preview overlay. Existing external URLs, canonical bytes and chrome remain
   unchanged.
8. **D8 — Personalized PDP state is one no-store client island.** The generic public HTML reserves a
   stable action region. After Clerk settles, one authenticated viewer-state read supplies ownership,
   favorite, active-deal and buyer-prefill state. Until then no buy/offer/owner assertion is shown; on
   failure personalized actions stay unavailable instead of rendering the wrong state. Existing auth,
   checkout and offer authorization remain their own shipped server contracts and are imported, never
   restated.
9. **D9 — Owner preview stays a separate dynamic renderer.** `?preview=1` is rewritten to a no-store
   route that imports `lib/shop-presentation/preview.ts` unchanged. It never shares a Next or Cloudflare
   cache entry with public HTML.
10. **D10 — Privacy decides cache eligibility.** Public reads for claimed shops may be cached; an
    unclaimed shop/listing, a preview-private shop, an unresolved lookup, any query-string request and
    every custom-domain request bypasses edge caching. This imports the claim rule from `lib/claim.ts`
    and the fail-closed preview rule from `lib/preview-access.ts`. The four live preview-private anchors
    are real fixtures for 404 proof. Cache keys retain host + path, so marketplace, subdomain and embed
    cannot collapse.
11. **D11 — Custom domains are explicitly excluded.** The only configured live custom domain is not
    verified and currently terminates on the old Vercel rail. This epic neither changes its DNS/TLS nor
    claims a custom-domain cache proof. Its existing dynamic behavior must remain intact.
12. **D12 — Build glyphs are evidence, not the render-mode contract.** A parameterized ISR route may
    still appear as `ƒ`; acceptance is no request APIs in the public chain, origin cache headers matching
    `lib/cache-policy.ts`, and a live Cloudflare MISS→HIT on the original URL. Story 2.3 guards the source
    condition that made the old `revalidate` declarations dishonest.
13. **D13 — Sentry Replay is the only telemetry removal.** Remove its static integration and sample-rate
    keys; keep the SDK, DSN, tracing, server/edge configs and `withSentryConfig`. The built chunks, not
    source grep alone, prove Replay is absent.
14. **D14 — Vendor separation is already shipped.** `xlsx`, `jszip` and `mercadopago` are server-only;
    `@dnd-kit` occurs only in `/admin/seleccion`. Story 3.2 adds a built-manifest regression guard and
    touches no payment/checkout implementation file; its guard may name those imports. The fictional
    real-payment smoke caused
    by a nonexistent move is deleted.
15. **D15 — The native-HTML sweep has three removals and one progressive enhancement.**
    `CollapsibleDescription` and `ExcerptPanel` become server-rendered `<details>`; `CuentaMenu` uses
    native popover with a positioned fallback. `AIAgentButton` still needs JavaScript for context,
    clipboard and handoff, but its modal uses native `<dialog>`. Existing tokens and design are preserved.
16. **D16 — The JavaScript budget is route-manifest based.** It resolves the built route-to-chunk graph
    and sums reproducible Brotli transfer bytes for unique client chunks. Post-diet measurements set the
    committed `/mx`, `/mx/l/[id]` and `/mx/s/[slug]` ceilings; aggregate `.next/static` size is not a
    route budget.
17. **D17 — Routing and review are fixed for the run.** Sprint 2, which defines the auth/cache boundary
    imported by the rest, routes to the strongest builder (`gpt-5.6-sol`); Sprints 1 and 3 route to the
    faster workhorse (`gpt-5.6-terra`). Every PR declares HIGH risk. The orchestrator runs
    `scripts/review-route.mjs` and executes both external-family commands; a fresh `pr-reviewer` subagent
    is mandatory too. Findings are fixed or answered before an independent reviewer merges.
18. **D18 — The fixed-format image cutover uses a new immutable key.** A fresh HIGH-tier reviewer
    proved that pre-deploy production ignores `f` by requesting the proposed unversioned `f=webp` URL;
    Cloudflare consequently stored an AVIF response under that immutable key. The shipped loader emits
    `f=webp&v=2`, making the poisoned object unreachable. The probe's safe default remains the legacy
    no-`f` fixture; the orchestrator supplies the versioned URL explicitly only after the new route is
    live. Fixed keys require canonical source/numeric spelling and import their emitted width set once;
    both fixed and legacy keys reject nested source queries because the allow-listed public-image
    contract has none and R2 ignores arbitrary query aliases. A complete three-page live catalog sweep
    found 115 listings, 153 absolute R2 image URLs, zero R2 URLs with a query and zero with a percent
    escape; its other 97 image candidates are pre-existing protocol-relative
    Shopify URLs the route already rejects. Legacy keys retain every old Next-emitted width and map
    through the shipped transform ladder, so stale HTML does not break. Image rollback is staged: revert loader/config emission first, retain the route's `f`/`v`
    compatibility until stale HTML can no longer request it, then remove that compatibility in a later
    deploy. A one-step full revert is not format-safe. This is a review-time correction to D5, recorded
    rather than hidden as builder discovery.
19. **D19 — The shipped public-read shapes narrow the scaffold.** Current code proves the dynamic read
    is not confined to `(shell)/layout.tsx`: shop presentation context and owned-host subpages read
    headers, while the PDP reads Clerk, favorites and deal state. Privacy is therefore decided in
    middleware before an empty-query public rewrite, importing `lib/claim.ts` and
    `lib/preview-access.ts`; direct internal-prefix requests 404 before host resolution. `?preview=1`
    enters the separate dynamic preview renderer, every other query stays on the existing dynamic
    path, and `/us/**` is outside this epic. Existing unprefixed `/s/**` and `/l/**` compatibility URLs
    keep their shipped redirect to `/mx/**` rather than becoming a second rendered URL. Next requires
    a literal `revalidate` export, so public routes use the literal matching the relevant
    `lib/cache-policy.ts` value and a deterministic guard imports that SSOT to reject drift; a
    non-literal export is not an acceptable attempt to "import" the window.
20. **D20 — Public HTML uses one fail-closed Free-plan Cache Rule.** The current zone already has the
    homepage and `/api/img` rules, and the existing token has edited the same
    `http_request_cache_settings` phase; no new permission, DNS, TLS, IAM, secret or dependency is
    expected. Add one owned public-read rule using Free-plan `starts_with`/`ends_with`, an empty query,
    apex marketplace/embed paths and `*.miyagisanchez.com` shop-root/PDP paths. It keeps Cloudflare's
    default host-and-full-URL cache key and cannot match custom domains. Its edge TTL mode is
    `bypass_by_default`, not the scaffold's looser `respect_origin`: Cloudflare documents that the
    former follows an origin cache header but bypasses when it is absent, whereas the latter falls back
    to Cloudflare defaults. Origin claim/privacy/no-store remains authoritative. The existing
    provisioner gains a read-only `--verify-only` three-state live invariant; 401/403, 429/5xx,
    non-JSON, DNS/network failure or a missing secret is UNAVAILABLE, never an empty green result. A
    403 is a new permission gap and stops the run before any PUT.
21. **D21 — Runtime ISR needs an explicit empty build population on Next 16.2.6.** A production build
    disproved the sprint scaffold's `○`/`◐` expectation and D19's initial assumption that a literal
    `revalidate` plus a request-neutral graph was sufficient: both unbounded internal templates still
    built as `ƒ`, and neither appeared in `prerender-manifest.json`. Each of the two internal templates
    now exports an empty `generateStaticParams()` so the first eligible request seeds ISR; the build
    reports `●` for both and the manifest contains both runtime ISR entries. The two templates cover
    the three public shapes (shop, PDP and embed) rather than creating three route files. Import this
    built-artifact contract only from `scripts/assert-public-read-build.mjs`, which runs after every
    `npm run build`. The same full-population guard found 29 live `revalidate` declarations and proved
    19 under request-dependent graphs were fictional; those declarations are removed rather than
    preserved as no-ops.
22. **D22 — The scaffold's named Sprint 2 smoke fixtures are not cache-eligible live data.** The
    post-deploy origin gate re-queried production before the Cloudflare apply and disproved the
    scaffold: `piezas-unicas` is unclaimed with zero active listing mirrors, while
    `prod_01M0JCJC0FKNEFYK81HSVD72GW` has no live mirror. D10 correctly keeps both on the shipped
    dynamic `private, no-store` path; weakening that privacy boundary to make the old walkthrough pass
    is forbidden. The live claimed fixtures are `ylai-studio` plus PDP
    `prod_01KZJJPXY8XFV90WDFN43RTBBM`, and `panfleto` for the entitled-subdomain/embed comparison.
    `concrete-garden-preview-retired-20260820` is one of the four live non-activated anchors and is the
    preview-private 404 fixture. This deviation was caught by the orchestrator's production gate after
    the frontend build—not hidden as a builder discovery—and the sprint walkthrough is corrected to
    those live identities before the edge mutation. The same correction applies to every later epic
    walkthrough, including Sprint 3; a dead PDP never becomes valid evidence merely because the test is
    now about client behavior. `scripts/perf-probe.mjs` defaults to the same claimed PDP/shop pair; the
    dated Sprint 1 baseline remains immutable evidence of its original URLs.

### Sprint 1 — Build contract (locked by the architect before the builder started)

- Cite D1–D6 and D17–D18. Root owns the deploy flag, invariant, probe and baseline; frontend owns only the
  image proxy/loader/config and its existing performance spec.
- Story order is 1.3 baseline → 1.2 measured encode change → 1.1 live warm-instance apply. Do not delete
  `/api/img`, use `/cdn-cgi/image`, add a Worker, add a dependency, or touch R2 ingest.
- The image contract is imported from `app/api/img/route.ts`. The builder may narrow emitted variants
  but may not weaken host, redirect, streaming-cap, content-type or error-cache behavior.
- Loader URLs must include `f=webp&v=2`; a fixed-format response does not emit `Vary: Accept`. Legacy URLs
  without `f` keep the old allow-listed Accept negotiation and `Vary` behavior. An unknown `f` is 400.
- Every new assertion is observed red once. The orchestrator, not the builder, changes live Cloud Run.

### Sprint 2 — Build contract (locked by the architect before the builder started)

- Cite D1–D2, D7–D12, D17 and D19–D22. This builder owns the internal public-read tree, middleware rewrite,
  viewer-state island/endpoint, cache-eligibility seam and their tests in the frontend; root owns the
  existing Cloudflare provisioner extension and live invariant.
- Marketplace (`/mx/s/**`, `/mx/l/[id]`), entitled subdomain shop/PDP, and empty-query
  `/embed/s/[slug]` use the public renderer. Unprefixed compatibility paths retain their redirect;
  `/us/**`, other query-bearing requests, `?preview=1`, custom domains and all authed routes remain
  dynamic. No functional diff is permitted under checkout, account, admin, messages or
  seller-management route trees; D21's removal of fictional `revalidate` declarations is the sole
  behavior-neutral exception, plus test imports that name those trees as forbidden.
- Public HTML is viewer-neutral. The single island must reserve space, settle once, and fail disabled.
  Do not move authorization into Cloudflare or treat a flag as privacy.
- Public `revalidate` exports are literals and both templates return an empty build population; the
  source guard imports `lib/cache-policy.ts` once, while the post-build guard owns the manifest rule.
  Direct internal-prefix requests 404 before host resolution, and middleware decides claim/privacy
  eligibility before rewriting.
- The single new Cache Rule uses `bypass_by_default`, requires an empty query string, keeps the default
  host-aware key and excludes custom domains. Prove marketplace, `panfleto.miyagisanchez.com`, embed and
  a live preview-private 404 using D22's live fixtures; `piezas-unicas` is unclaimed and is not a valid
  cache fixture on any channel. `--verify-only` is read-only and three-state.
- The builder stops on any need for new Cloudflare permissions, DNS/TLS, a secret, checkout/auth policy
  change or a second failed implementation attempt.

### Sprint 3 — Build contract (locked by the architect before the builder started)

- Cite D1–D2 and D13–D17. Remove Replay; guard the already-correct vendor boundary; perform only the four
  named native-HTML changes; add the route-manifest Brotli budget.
- `sentry.client.config.ts` is the single Sentry configuration file permitted to change: remove only
  `replayIntegration` and its two replay sample rates. Import the shipped error/tracing rules from that
  file; do not restate them. The server and edge Sentry configs and `withSentryConfig` stay untouched.
- No `xlsx`, `jszip`, `mercadopago`, `@dnd-kit`, checkout or payment implementation file changes are
  permitted. Story 3.2 is complete when its guard proves the current route manifests.
- AIAgentButton remains a client component. Native behavior must retain keyboard/focus behavior and use
  the existing design tokens; CSS anchor positioning is enhancement-only.
- Record before/after route transfer values and observed-red mutations. Browser smoke covers the native
  interactions; no payment smoke is owed because no money-path code moves.

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
  `loader: 'custom'`. It keeps pointing to `/api/img`; S1.2 narrows what it emits.
- **`app/api/img/route.ts`** — the route being optimized, not retired. Its host allow-list,
  `redirect:'error'`, streamed byte-cap and legacy width/quality ladders remain the
  security/compatibility contract. It is also the only request-path `sharp` importer in the app
  (verified).
- **`lib/r2.ts` + `ingestImageUrls()` + `lib/supply-import.ts`** — the R2 ingest path. **Unchanged.**
  Storage stays in R2; transformation stays in `/api/img`. Only the emitted format and bounded
  cache-key cardinality change.
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
- **Built client-reference manifests** — the route-level source of truth for S3.2 and S3.4. They
  already prove the named vendor packages do not ship to buyer routes; guard that fact directly.
- **`app/components/HomePersonalizationProvider.tsx`** — one fetch, not a poll; its
  `isLoaded`/`isSignedIn`/`settled` three-state model is the behavior S2's PDP viewer island imports.
- **The channel guard suite** — `own-shop-seo.spec.ts`, the embed specs, `ChannelLayout`/white-label
  specs, `nav-entry-points.spec.ts`. **This is S2.1's acceptance harness, already written.**
- **`scripts/neon-egress.mjs`** — the measurement-harness shape S1.3's `perf-probe` clones (measure,
  degrade, three states — never a confident empty result).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Frontend Cloud Run `min-instances=1` + drift-guard assertion | **high** |
| 1 | 1.2 Keep the free-tier image proxy; reduce its cold variant cost and cardinality | low |
| 1 | 1.3 `scripts/perf-probe.mjs` — TTFB / `cf-cache-status` / transfer / client-JS baseline | low |
| 2 | 2.1 Split the viewer-neutral public renderer from request/auth/preview state | **high** |
| 2 | 2.2 Cloudflare Cache Rule for the public read paths + MISS→HIT probe per channel | **high** |
| 2 | 2.3 Guard spec — no `revalidate` export under a `headers()`-tainted layout | low |
| 3 | 3.1 Drop Sentry Session Replay from the client bundle (error reporting stays) | low |
| 3 | 3.2 Guard the already-shipped vendor boundary (`xlsx`, `jszip`, `mercadopago`, `@dnd-kit`) | low |
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
- **S3 is stacked on S2** even though its code is mechanically independent; this preserves the one
  ordered epic rail and makes the post-diet budget measure the public renderer that will ship.

**Shared-surface announcements owed:** S1.1 changes live Cloud Run service config; S2.1 changes
middleware and the public shop/PDP route boundary; S2.2 changes shared Cloudflare edge config. All
three can break sibling PRs and must be announced before merge.

**Degrade-gracefully:** S1.2 keeps the same `/api/img` URL contract and merely emits fewer, cheaper
variants. S3.1 is a scoped removal; S3.2 is a guard-only story.

## Kill-switch — decided at grooming (Stage 6b): **carve-out, no flag**

*Is there a runtime seam a kill-switch can gate?* **No, and a flag would be the wrong tool for all
three high-risk stories.** S1.1 is Cloud Run service config (rollback = revert the source change,
explicitly update `miyagi-web` back to min zero, and verify live; the source guard then follows the
revert). S2.1 is a build-time property of the route tree — nothing evaluates at
runtime for a flag to intercept (rollback = `git revert`). S2.2 is edge config provisioned by an
idempotent script that filters by its own rule description, so hand-added rules survive a rollback.

Consistent with WAYS-OF-WORKING → *Feature flags — OFF by default as a practice* (2026-08-10). **This
epic adds no flags.**

## Delivery record

| Sprint | Shipped evidence |
|---|---|
| S1 · Origin | Root PR [#163](https://github.com/danybgoode/miyagi-product-management/pull/163) `bdc6f43`; frontend PR [#416](https://github.com/danybgoode/miyagisanchezcommerce/pull/416) `1b10695`; Cloud Run `miyagi-web-00133-x9b` verified ready with `minScale: 1`. |
| S2 · Edge | Root PR [#164](https://github.com/danybgoode/miyagi-product-management/pull/164) `8465fd3`; frontend PR [#417](https://github.com/danybgoode/miyagisanchezcommerce/pull/417) `c121c60`; real cache proofs are recorded in `sprint-2.md`, including marketplace, subdomain and embed MISS→HIT. |
| S3 · Client | Frontend PR [#418](https://github.com/danybgoode/miyagisanchezcommerce/pull/418) squash `03108bd`; Cloud Run `miyagi-web-00135-czg` Ready at 100% traffic. The final read-only probe is `s3-production-final-2026-08-24.json`. |

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated in the sprint walkthroughs)
- [x] Each `sprint-N.md` has its smoke walkthrough with real URLs
- [x] This README marked ✅; every sprint status has committed evidence
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) and platform index updated
- [x] Durable learnings deduped against `Roadmap/LEARNINGS.md`: D18/D22 already retain the applicable
  image/data and live-fixture lessons; no duplicate learning appended
- [x] Team memory updated: `~/.claude/projects/-Users-cosmo-dobby-medusa-bonsai/memory/` now contains
  `hyper-performant-runtime-epic.md`, and its `MEMORY.md` index points to the shipped epic and Daniel's
  remaining owed checks
- [x] **Kill-switch:** N/A — the carved-out infra/render-mode rollback is verified in the shipped contract
- [ ] Feature branch deletion: superseded S1/S2/S3 stack refs are deleted; the sole remaining closeout
  branch is intentionally retained until PR #166 merges, then must be deleted and verified. This README
  frontmatter is the shipped SSOT.
