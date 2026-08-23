# Hyper-performant runtime — Sprint 2: Edge — make the public shell cacheable

**Status:** 🟩 shipped — frontend revision `miyagi-web-00134-qtq`; Cloudflare invariant EXACT

> **Sprint goal:** a PDP → shop click stops being an origin render. The public read tree honours the
> `revalidate` windows it has claimed since the static-shell split, and Cloudflare can finally cache
> the HTML. **This is the highest-risk sprint of the epic.**

> ⚠️ **Scope fence, corrected and locked in D7–D12.** Only the **public read** routes move through an
> internal path-parameterized renderer: marketplace shop/PDP, entitled subdomain shop/PDP and embed. Authed routes
> (`/shop/manage/*`, `/account/*`, `/admin/*`, `/checkout`, `/messages`) keep the dynamic layout
> **untouched**. Owner `?preview=1` and custom domains remain dynamic. If that boundary cannot be kept,
> **stop and hand back** — do not redesign auth or channel policy inside a performance epic.

## Stories

### Story 2.1 — The public read subtree stops being dynamic
**As a** buyer on a product page, **I want** opening the merchant's shop to be instant, **so that**
browsing a seller's catalog doesn't feel like waiting for a server.

**Context (the root cause of this whole epic):** `app/(shell)/layout.tsx:38` calls `await headers()`
to make the channel/chrome decision (white-label vs buyer chrome vs seller-mode). That taints the
**entire `(shell)` subtree** as dynamic. Consequences, all verified:

- **`export const revalidate = 120` is a silent no-op** on `s/[slug]/page.tsx:42` and its six
  sub-pages, `s/[slug]/c/[collection]`, the `mx/s/[slug]/*` mirrors, `colecciones`, `tienda` and
  `embed/s/[slug]`. Roughly 15 routes have been documenting a caching policy that never applied.
- Cloudflare cannot cache the HTML, so every navigation is a full origin render.
- The layout does work *before* the page starts (`getShop`, `isShopPreviewPrivateBySlug`,
  `deriveShopTrustInputs`), then `s/[slug]/page.tsx` awaits ~11 more reads.

**Architecture-lock correction:** the layout is not the only dynamic read. The shop page itself calls
`headers()` plus Clerk-backed `applyPreviewOverlay()`. The PDP calls `headers()` and `currentUser()` and
renders viewer-specific ownership, favorites, offers and buyer prefill. Therefore the contract is an
internal middleware rewrite into a channel/path-parameterized public renderer, a separate dynamic owner
preview renderer, and one no-store PDP viewer-state island. `middleware.ts` already resolves the
channel; it passes that decision as path data rather than a trusted client header read in the renderer.

**Second code-verified correction (D19):** request reads also exist in shop-presentation context and
owned-host subpages. `/us/**` is excluded; unprefixed `/s/**` and `/l/**` keep their shipped redirect.
Only an empty query enters the public renderer. Next requires literal `revalidate` exports, so the
guard imports `lib/cache-policy.ts` and proves those literals match instead of exporting a non-literal.

**Acceptance:**
- The internal public renderer's complete layout/page chain contains no `headers()`, `cookies()`,
  Clerk server read or owner preview overlay. Parameterized build glyphs are recorded but are not used
  as a false binary proxy for ISR.
- Origin responses on the original URLs carry the literal window guarded against
  `lib/cache-policy.ts`, and a repeated request proves an origin cache hit before the Cloudflare rule
  is enabled.
- Public PDP HTML is viewer-neutral. One fixed-size client island settles once and supplies ownership,
  favorite, active-deal and buyer-prefill state; it never flashes an incorrect CTA and fails disabled.
- `?preview=1` remains owner-authorized and `no-store` through `lib/shop-presentation/preview.ts`.
- The **entire channel guard suite stays green**: `own-shop-seo.spec.ts`, the embed specs, the
  `ChannelLayout`/white-label specs, `nav-entry-points.spec.ts`.
- Marketplace (`/mx/s/ylai-studio`), entitled subdomain
  (`panfleto.miyagisanchez.com`) and `/embed/s/[slug]` render correctly. The sole configured custom
  domain is unverified/on the old Vercel rail and is explicitly excluded from this epic's cache proof;
  its current dynamic behavior must not regress.
- **A preview-private shop still 404s** — `isShopPreviewPrivateBySlug` must not become bypassable or
  cacheable. Verify against a real preview-private shop, not a unit test alone.
- URLs are byte-identical before and after: canonical tags, `robots.txt`, `sitemap`, OG metadata.
  *(LEARNINGS: when replacing a metadata path, diff the exact bytes the old one emitted.)*
- Authed `(shell)` routes keep the same dynamic layout and behavior. The sole diff permitted under
  `/shop/manage`, `/account`, `/admin` or `/checkout` is D21's removal of a fictional `revalidate`
  declaration; no functional implementation moves.

**Risk:** **high** — authorization/render boundary plus shared middleware. Announce before merge; an
independent reviewer merges only after the locked review stack is green.

---

### Story 2.2 — Cloudflare caches the public read paths, proven MISS→HIT
**As a** returning visitor, **I want** the second person to open a shop today to get it from the
edge, **so that** popular shops don't re-render per visitor.

**Context — the trap this story exists to avoid:** setting `Cache-Control` on a route that Cloudflare
treats as dynamic buys **nothing**. This codebase learned it on 2026-07-18: `/api/img` set
`public, max-age=31536000, immutable` and still ran `cf-cache-status: DYNAMIC` on every request
(13–16 s re-encodes, the nightly smoke timeouts) until an explicit Cache Rule existed for its path.
MISS 16.2 s → HIT 0.3 s once the rule shipped. **Extend `infra/gcp/cloudflare-cache-provision.mjs`;
do not write a second script.**

**Acceptance:**
- A second request to `https://miyagisanchez.com/mx/s/ylai-studio` returns `cf-cache-status: HIT`.
- The MISS→HIT timing delta is **recorded in this sprint doc** at close (the `/api/img` precedent:
  16.2 s → 0.3 s), measured with Story 1.3's probe.
- **Each included channel variant is probed separately** and the cache key does not collapse them —
  marketplace, entitled subdomain and embed must never serve each other's HTML. This is the
  failure mode that would leak one seller's storefront onto another's domain; prove it, don't reason
  about it.
- The origin contract marks unclaimed, preview-private and unresolved responses `no-store`; the edge
  rule separately requires an empty query string and uses Cloudflare's fail-closed
  `bypass_by_default` origin-header mode, so a response missing cache policy is bypassed rather than
  falling back to a default TTL.
  Query-bearing requests bypass the edge rule, and custom domains remain outside it.
- A **preview-private** shop is not servable from cache under any included variant, proven against one
  of the four live non-activated anchors.
- The provisioning script stays idempotent and filters by its own rule description, so a re-run
  preserves hand-added rules (the `cloudflare-waf-provision.mjs` shape).
- The existing provisioner gains a read-only, three-state `--verify-only` live invariant. Missing or
  drifted is a failure; an unavailable credential/API/network is named and never reported green.

**Risk:** **high** — shared Cloudflare edge config on the platform zone. Announce; an independent
reviewer merges only after the live rule and findings are verified.

---

### Story 2.3 — A guard so `revalidate` can never silently lie again
**As a** future builder, **I want** the build to fail when a route declares a caching policy it
cannot honour, **so that** nobody spends another month trusting a no-op.

**Context:** ~15 routes have carried `export const revalidate = 120` with no effect. Nothing caught
it because nothing was looking. This is the regression class the whole epic is paying off, and per
AGENTS, *a script that exits green having run nothing is worse than no script* — the guard must
actually resolve the layout chain, not pattern-match a filename.

**Locked correction (D21):** the live population was 29 declarations, not ~15; 19 were request-tainted
and have had the fictional export removed. Next 16.2.6 also proved that the two unbounded public-read
templates require an empty `generateStaticParams()` to become runtime ISR. Their truthful build marker
is `●`, not the scaffold's `○`/`◐` shorthand.

**Acceptance:**
- A spec resolves the full page/layout/import chain and fails when a `revalidate` export depends on
  `headers()`, `cookies()`, a Clerk server request read or the owner preview overlay.
- The scan discovers every live declaration, and the post-build invariant proves both internal public
  templates exist in `prerender-manifest.json` as runtime ISR entries.
- It **allows the negation**: a route that is deliberately dynamic and declares no `revalidate`
  passes cleanly. *(LEARNINGS: a guard that rejects correct output is worse than one that misses a
  rare fault — it trains people to bypass it.)*
- Observed **red** via a deliberate mutation — re-add `revalidate` under a dynamic layout and watch
  it fail — before the story is called done.

**Risk:** low — a test-only addition.

## Sprint QA
- **api spec(s):** 2.1 → the existing channel suite is the harness (already written — keep it green;
  assert `●` plus the manifest entries for the two D21 templates covering the three public shapes). 2.2 → a live MISS→HIT probe spec,
  gated on prod like `perf-budget.spec.ts`'s live checks, plus an `infra/gcp/test/` invariant for the
  rule. 2.3 → its own spec file, per the house one-concern-per-spec split.
- **browser smoke owed:** **yes, to Daniel — and this sprint's is the important one.** Marketplace,
  entitled subdomain, embed and preview-private behavior must be checked, plus the signed-in PDP island.
  The live-smoke rail covers anonymous renders; the signed-in check is owed to Daniel by name.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Cross-family review:** both external passes are mandatory here, and per WAYS-OF-WORKING the
  **fresh reviewer subagent is also mandatory on HIGH tier** — shared infra is exactly where context
  independence catches what family independence misses.

## Sprint 2 — Smoke walkthrough (executed in order)
Env: production · https://miyagisanchez.com · 2026-08-23 · frontend `c121c60` /
Cloud Run `miyagi-web-00134-qtq`

1. Open https://miyagisanchez.com/mx/l/prod_01KZJJPXY8XFV90WDFN43RTBBM, then follow its Ylai Studio
   merchant destination at https://miyagisanchez.com/mx/s/ylai-studio.
   → Expected/result: real Chromium rendered both at HTTP 200 with the correct titles and zero console
   errors; the shop destination displayed Ylai Studio's catalog and marketplace chrome.
2. Request https://miyagisanchez.com/mx/s/ylai-studio twice from the same Cloudflare point of presence.
   → Expected/result: `MISS` at 3.488 s became `HIT` at 0.148 s; the corrected `perf-probe` repeat
   independently reported `HIT` at 57.7 ms with 389,224 B of route client JavaScript.
3. Open https://panfleto.miyagisanchez.com in production Chromium and request it twice.
   → Expected/result: HTTP 200 with Panfleto's white-label header and no platform navigation or console
   errors; `MISS` at 2.612 s became `HIT` at 0.150 s.
4. Open https://miyagisanchez.com/mx/s/concrete-garden-preview-retired-20260820 and reload it.
   → Expected/result: the real non-activated fixture rendered "404 Página no encontrada"; the response
   stayed `private, no-store` and Cloudflare reported `BYPASS`, never a cached shop page.
5. Open https://miyagisanchez.com/embed/s/panfleto in production Chromium and request it twice.
   → Expected/result: HTTP 200 with the bare Panfleto embed and no platform navigation or console errors;
   `MISS` at 0.566 s became `HIT` at 0.152 s.
6. Compare the cached marketplace, entitled-subdomain and embed response bodies, then request
   https://miyagisanchez.com/mx/s/ylai-studio?probe=1.
   → Expected/result: the three SHA-256 values were distinct (`213ac63a…`, `051e66eb…`, `8fa8e748…`),
   while the query-bearing response remained `private, no-store` and `cf-cache-status: DYNAMIC`.
7. **(auth path — owed to Daniel by name)** Sign in and open
   https://miyagisanchez.com/mx/l/prod_01KZJJPXY8XFV90WDFN43RTBBM.
   → Expected/result owed: the reserved action space settles once with correct favorite/offer/owner
   state; unavailable viewer state leaves personalized actions disabled.
8. **(auth path — owed to Daniel by name)** Still signed in, open
   https://miyagisanchez.com/shop/manage/settings.
   → Expected/result owed: the seller portal looks and behaves exactly as before.

Custom-domain caching is deliberately not a smoke step: the only configured domain is unverified and
currently served by Vercel, so claiming it as a Cloud Run/Cloudflare proof would be fiction. If any
step fails, note the step number + what you saw — that's the bug report. **Steps 3–5 are the white-label
boundary; all anonymous checks passed. Steps 7–8 remain explicitly owed to Daniel because production
Clerk does not accept the test-token rail.
