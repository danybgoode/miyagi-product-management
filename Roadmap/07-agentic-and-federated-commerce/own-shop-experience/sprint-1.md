# Sprint 1 — Full white-label shop routing

Goal: a buyer on the seller's custom domain can browse the full shop — homepage, product page (PDP), cart —
natively and 100% white-label, with no trace of the platform or the `/s/[...]` slug, seeing **only** that
domain's shop.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **🚧 CODE COMPLETE — all 3 stories built and committed
(`4e686f5`), deterministic gate GREEN (tsc + build + middleware routing verified via spoofed Host). PR open,
HIGH risk → Daniel merges. Pending: Daniel's browser smoke on a real domain (rendered chrome).**

Risk: **HIGH** — touches `middleware.ts` (shared routing) and the root layout. Daniel merges.

Main files:
- `middleware.ts` — rewrite→passthrough pivot + `x-miyagi-shop-slug` header (US-1, US-3).
- `app/layout.tsx` — chrome drop + centralized `ChannelLayout` for the `custom` channel (US-2).
- `app/s/[slug]/page.tsx` — remove the `isChannel` self-wrap (now lives in the layout) (US-2).
- `app/s/[slug]/ChannelLayout.tsx` — reused as a shared shell; mobile fluidity (US-2).
- `lib/listings.ts` — `getShop()` wrapped in `cache()` for the layout read (US-2).
- `e2e/own-shop-channel.spec.ts` — **new** Playwright spec (path via channel header).

---

## US-1 — Native PDP on the custom domain ✅ · Risk: HIGH
**As** a buyer on a shop's custom domain, **I want** tapping a product to open the product page on that same
domain, **so that** I keep shopping without leaving the brand.
- [x] The middleware stops rewriting EVERY route to `/s/[slug]`. It resolves the shop once; only `/`
      rewrites to `/s/[slug]`.
- [x] The rest of the shop routes (`/l/[id]`, `/checkout`, `/account`, `/payment/*`, `/messages/*`) pass
      through with `x-miyagi-channel: custom`, `x-miyagi-domain`, `x-miyagi-shop-slug` headers.

**Acceptance:** on a tenant domain, clicking a product stays on the domain and shows that product; the
address bar never shows `/s/[slug]`.

---

## US-2 — White-label on every page + mobile ✅ · Risk: HIGH
**As** a buyer, **I want** to see only the shop's brand on every page (homepage, product, cart, account),
**so that** I trust I'm in a real shop and not a marketplace.
- [x] Centralize the brand shell in `app/layout.tsx` based on `x-miyagi-channel: custom` (same pattern as
      `x-miyagi-embed`): remove the platform header/footer/tab-bar.
- [x] Render `ChannelLayout` with the shop's name/logo/accent, read via `getShop(slug)` (cached) using the
      `x-miyagi-shop-slug` header.
- [x] Remove the `isChannel` self-wrap from `app/s/[slug]/page.tsx` (the layout applies it now).
- [x] Fluid header on mobile even when the domain is long.

**Acceptance:** homepage, PDP, cart, and account show the shop's brand only (no Miyagi chrome, no slug in
the source or meta); the header adapts well on a phone.

---

## US-3 — Per-shop isolation ✅ · Risk: HIGH
**As** the shop owner, **I want** my domain to show only my shop, **so that** no buyer accidentally sees
another seller's products under my brand.
- [x] The tenant domain only serves its own shop. Another seller's product (`/l/<other>`) or an unknown
      route → a clean white-label "not found" / redirect to the domain's homepage.
- [x] Another shop's content is never leaked; never a raw cloud error.

**Acceptance:** `myshop.mx/l/<another-seller's-product>` and unknown routes give a white-label "not found"
or redirect to the domain's homepage; no foreign content is shown.

---

## Sprint smoke
- `tsc --noEmit` + `npm run build` + Playwright green.
- Local smoke: `npm run dev` + `curl -H "Host: <test-domain>"` → `/` homepage; `/l/[id]` white-label PDP;
  `/l/<foreign>` not-found; verify the absence of platform chrome and of the slug in source.
- Daniel: browser smoke on a real domain (browse → PDP → cart) on phone and desktop.
