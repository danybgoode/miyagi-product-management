# Sprint 2 — The three surfaces (render + checkout hand-off)

Goal: ship the visible widget — a loader script plus the three embeddable surfaces — with the buy action
always handing off to our hosted checkout. This is where the seller actually gets something to paste.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **US-3 + US-4 + US-5 ✅ built
(commits 2fee981, f83afe5, 6d033b5) on branch `feat/embeddable-widget-s2` (stacked
on Sprint 1's `feat/embeddable-widget`). CI-green pending; US-3 awaits Daniel merge
+ browser smoke (HIGH-risk live-payment hand-off).**

---

## US-3 — Buy-button + hosted-popup checkout ✅  · Risk: **HIGH (Daniel merge)**
**As a** seller, **I want** a `<miyagi-buy-button>` I can drop on any page that lets a visitor buy my item,
**so that** I can sell from my existing site without rebuilding checkout.
- [x] `public/embed.js` — a small loader that registers the custom element(s) and reads `data-` config.
- [x] `<miyagi-buy-button data-listing data-key>` renders into **Shadow DOM** (price + CTA from the catalog
      API; no CSS bleed) and, on click, does `window.open()` to our **existing** hosted checkout
      (`/checkout?listingId=…&channel=embed`). **No payment surface on the third-party origin.**
- [x] The hosted checkout (Stripe / MercadoPago / SPEI) is **unchanged** — the widget only links into it; the
      `channel=embed` tag flows via the Sprint 1 middleware cookie into Stripe/MP metadata.

**Why HIGH-risk:** it's the seam onto the live-payment flow. Per WAYS-OF-WORKING, anything touching
payments/checkout is a human green-light — **Daniel merges**, and Daniel runs the browser smoke of the real
hand-off (disposable test listing, cancellable session).

**Acceptance:** pasting the snippet on a non-Miyagi page shows the live price; clicking opens our checkout in
a popup; a completed test purchase is attributed `channel=embed`; no card fields ever appear on the host page.

---

## US-4 — Product card ✅  · Risk: LOW
**As a** seller, **I want** a `<miyagi-product>` card (image, price, condition, CTA), **so that** I can show
a rich item, not just a button.
- [x] `<miyagi-product data-listing data-key>` renders read-only from the catalog detail endpoint into
      Shadow DOM; its CTA reuses the US-3 hosted hand-off (no new checkout logic). Bilingual condition labels.

**Acceptance:** the card shows the item's photo/price/condition and links to checkout; it looks consistent
regardless of the host page's CSS.

---

## US-5 — Full-shop iframe ✅  · Risk: MEDIUM
**As a** seller, **I want** to drop my **whole storefront** onto a page, **so that** my existing site can
host my entire shop.
- [x] New `app/embed/s/[slug]/` route renders the shop via the existing white-label `ChannelLayout`
      (branded, no platform chrome — root layout drops its header/footer/tab bar for embed-tagged requests).
- [x] Served embeddable: `Content-Security-Policy: frame-ancestors *` (so any site can frame it). Buy breaks
      OUT of the frame to a top-level tab on our origin (`/l/<id>?channel=embed`) — Clerk can't run in a
      cross-origin iframe, so checkout (and the embed tagging) happens top-level. No new commerce logic.

**Acceptance:** `<iframe src=".../embed/s/<slug>?key=…">` shows the seller's storefront inside another site;
framing isn't blocked; buying from inside the frame opens the hosted checkout.

---

### QA (this sprint)
- **Deterministic gate:** `tsc` + `build` + Playwright specs — `embed.js` served with correct
  `Content-Type` + CORS; `/embed/s/[slug]` returns 200 and carries `frame-ancestors`; the catalog detail the
  card/button consume answers cross-origin. Against the branch preview via the bypass token.
- **Live confirmation (split):** agent opens `public/embed-demo.html` from a foreign origin and checks the
  three surfaces render + the popup launches; **Daniel owns the HIGH-risk browser smoke** of US-3 →
  real hosted checkout. State the split in the PR.
