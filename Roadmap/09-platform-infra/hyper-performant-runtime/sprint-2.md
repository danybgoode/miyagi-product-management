# Hyper-performant runtime — Sprint 2: Edge — make the public shell cacheable

**Status:** ⬜ not started

> **Sprint goal:** a PDP → shop click stops being an origin render. The public read tree honours the
> `revalidate` windows it has claimed since the static-shell split, and Cloudflare can finally cache
> the HTML. **This is the highest-risk sprint of the epic.**

> ⚠️ **Scope fence, decided at grooming — do not widen it.** Only the **public read** routes move:
> `app/(shell)/s/[slug]/**`, `app/(shell)/mx/s/[slug]/**` and `app/(shell)/l/[id]`. Authed routes
> (`/shop/manage/*`, `/account/*`, `/admin/*`, `/checkout`, `/messages`) keep the dynamic layout
> **untouched**. If the public subtree cannot be split cleanly from the shared layout, **stop and hand
> back** — do not redesign the channel model inside a performance epic.

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

`middleware.ts` + `lib/channel.ts` **already** resolve the channel and set `x-miyagi-channel` /
`x-miyagi-shop-slug` / `x-miyagi-domain` / `x-miyagi-embed`. The question this story answers is
whether the public subtree can consume that via a **rewrite into a channel-specific segment** rather
than a `headers()` read in a shared layout — the same manoeuvre `marketplace-static-shell` S1 used to
split `(site)` from `(shell)`, applied one level down.

**Acceptance:**
- `npm run build` marks `/s/[slug]`, `/mx/s/[slug]` and `/l/[id]` as `○` or `◐` — **not `ƒ`**. This is
  the single check that proves the story; put it in the PR body.
- The **entire channel guard suite stays green**: `own-shop-seo.spec.ts`, the embed specs, the
  `ChannelLayout`/white-label specs, `nav-entry-points.spec.ts`.
- All four surfaces render correctly, checked individually: marketplace (`/mx/s/piezas-unicas`),
  subdomain, live custom domain, and the `/embed/s/[slug]` iframe.
- **A preview-private shop still 404s** — `isShopPreviewPrivateBySlug` must not become bypassable or
  cacheable. Verify against a real preview-private shop, not a unit test alone.
- URLs are byte-identical before and after: canonical tags, `robots.txt`, `sitemap`, OG metadata.
  *(LEARNINGS: when replacing a metadata path, diff the exact bytes the old one emitted.)*
- Authed `(shell)` routes are untouched — no diff under `/shop/manage`, `/account`, `/admin`,
  `/checkout`.

**Risk:** **high** — shared surface (`app/(shell)/layout.tsx` governs every route in the subtree; a
sibling PR touching it will conflict). Announce before merge. The product owner merges.

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
- A second request to `https://miyagisanchez.com/mx/s/piezas-unicas` returns `cf-cache-status: HIT`.
- The MISS→HIT timing delta is **recorded in this sprint doc** at close (the `/api/img` precedent:
  16.2 s → 0.3 s), measured with Story 1.3's probe.
- **Each channel variant is probed separately** and the cache key does not collapse them —
  marketplace, subdomain, custom domain and embed must never serve each other's HTML. This is the
  failure mode that would leak one seller's storefront onto another's domain; prove it, don't reason
  about it.
- A **preview-private** shop is not servable from cache under any variant.
- The provisioning script stays idempotent and filters by its own rule description, so a re-run
  preserves hand-added rules (the `cloudflare-waf-provision.mjs` shape).
- An invariant test asserts the rule exists live, matching the existing `infra/gcp/test/` pattern.

**Risk:** **high** — shared Cloudflare edge config; affects every tenant domain. Announce. The product
owner merges.

---

### Story 2.3 — A guard so `revalidate` can never silently lie again
**As a** future builder, **I want** the build to fail when a route declares a caching policy it
cannot honour, **so that** nobody spends another month trusting a no-op.

**Context:** ~15 routes have carried `export const revalidate = 120` with no effect. Nothing caught
it because nothing was looking. This is the regression class the whole epic is paying off, and per
AGENTS, *a script that exits green having run nothing is worse than no script* — the guard must
actually resolve the layout chain, not pattern-match a filename.

**Acceptance:**
- A spec fails when a `revalidate` export sits under a layout that reads `headers()` / `cookies()`
  in the same segment chain.
- It **allows the negation**: a route that is deliberately dynamic and declares no `revalidate`
  passes cleanly. *(LEARNINGS: a guard that rejects correct output is worse than one that misses a
  rare fault — it trains people to bypass it.)*
- Observed **red** via a deliberate mutation — re-add `revalidate` under a dynamic layout and watch
  it fail — before the story is called done.

**Risk:** low — a test-only addition.

## Sprint QA
- **api spec(s):** 2.1 → the existing channel suite is the harness (already written — keep it green;
  add a build-output assertion for `○`/`◐` on the three routes). 2.2 → a live MISS→HIT probe spec,
  gated on prod like `perf-budget.spec.ts`'s live checks, plus an `infra/gcp/test/` invariant for the
  rule. 2.3 → its own spec file, per the house one-concern-per-spec split.
- **browser smoke owed:** **yes, to the product owner — and this sprint's is the important one.** All
  four channel surfaces must be eyeballed by a human, including a private-window subdomain check and
  a preview-private shop. An automated smoke cannot fully cover the white-label boundary.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Cross-family review:** both external passes are mandatory here, and per WAYS-OF-WORKING the
  **fresh reviewer subagent is also mandatory on HIGH tier** — shared infra is exactly where context
  independence catches what family independence misses.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW and click through to the
   merchant "Piezas Únicas".
   → The shop page appears immediately. This is the exact navigation that prompted the epic — it
   should feel like a different site.
2. Reload https://miyagisanchez.com/mx/s/piezas-unicas.
   → Still instant. (The builder will show you `cf-cache-status: HIT` for this request.)
3. Open a **seller's own subdomain** (e.g. `https://<shop-slug>.miyagisanchez.com`) in a private
   window.
   → The shop renders white-label — the seller's own header and branding, **no Miyagi Sánchez
   platform chrome**, and it is that seller's shop, not another's.
4. Open a live **custom domain** shop in a private window.
   → Same as step 3: correct shop, white-label, no platform chrome.
5. Open a shop you have set to **preview-private** (or ask the builder to point you at one).
   → It still shows "not found". It must not be reachable, and must not appear after a reload.
6. Open any shop inside the **embed** iframe surface.
   → It renders bare, with no platform header/footer/tab bar.
7. Sign in, go to https://miyagisanchez.com/shop/manage/settings.
   → The seller portal looks and behaves exactly as before. This sprint must not have touched it.

If any step fails, note the step number + what you saw — that's the bug report. **Steps 3–6 are the
white-label boundary; if any of them shows the wrong shop or leaks platform chrome, stop the merge.**
