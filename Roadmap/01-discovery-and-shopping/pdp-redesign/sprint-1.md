# Sprint 1 — Base PDP: fix the bug, reorder by intent, one primary action

> Epic: [PDP redesign](README.md) · **Risk: LOW** (frontend reorder/polish; **touches the shared buy bar** —
> announce, and ship behind the `pdp_redesign` kill-switch). **Status: 🚧 planned.**
> Goal: the standard physical-product PDP resolves *identify → trust → cost → act* in order, the reported
> bar/padding bug is gone, and there is one clear primary action. Both auth states.

## Stories

### S1.1 — Bar/padding overlap fix (#4)
**As** a buyer, **I want** the bottom bar to never cover the page content, **so that** I can read the
description and tags.
- Root cause: page wrapper hard-codes `pb-[120px]` (`app/l/[id]/page.tsx:288`) while the sticky bar (`:686`) is
  `position: fixed` with **variable** height. Replace the fixed padding with a spacer that matches the bar's
  **real** rendered height + `env(safe-area-inset-bottom)`; make the offer-state banners **replace** the buy bar
  (one bar at a time), not stack on top of it.
- **Acceptance:** on a listing with a pending offer, nothing is clipped behind the bar on mobile; description +
  tags are fully visible; the bar shows one state at a time.
- **QA:** browser smoke (anonymous + a pending-offer state); pure-logic spec if a height/spacer helper is extracted. **Risk: LOW.**

### S1.2 — Right-column reorder by intent (#3)
**As** a buyer, **I want** to see what the item is and trust the seller before being asked to buy, **so that** I
can decide with confidence.
- Reorder: gallery → title + price + protection cue → trust capsule → specs (placeholder until Sprint 3) →
  description ("Ver más" collapsible) → payment/delivery → seller → bundle → tags. Use the duplicate-render idiom
  for mobile/desktop, not flex-order.
- **Acceptance:** on mobile, description (and the specs slot) appear above the payment grid and seller card.
- **QA:** browser smoke asserts render order; pure-logic spec if an ordering helper is extracted. **Risk: LOW.**

### S1.3 — Two-action bar, one primary (#5)
**As** a buyer, **I want** one obvious primary action, **so that** I'm not stuck choosing between three equal buttons.
- "Comprar" primary, "Hacer oferta" secondary, "Preguntar" a light text link. Anchored price summary + safe-area.
  Reducing to two buttons also shrinks the bar (reinforces S1.1).
- **Acceptance:** one visually-dominant primary CTA; the bar is shorter than today's three-button bar.
- **QA:** browser smoke. **Risk: LOW.**

### S1.4 — "Compra protegida" cue beside the price (#2)
**As** a buyer, **I want** the protection signal next to the price, **so that** my doubt is resolved at the
moment I see the cost.
- "Compra protegida" + shipping/pickup hint directly under the price, reusing `<TrustSignals>`. The methods grid
  moves down (per S1.2 order).
- **Acceptance:** the protection cue renders adjacent to the price, not buried in the methods grid.
- **QA:** browser smoke. **Risk: LOW.**

## Sprint QA
- **Deterministic gate (must be green pre-merge):** `tsc --noEmit` · `next build` · Playwright `api`.
- **Browser smokes:** anonymous PDP render order + bar-no-overlap; pending-offer bar state (uses `MS_TEST_*` buyer
  session — skips gracefully if unset; the live authed offer-state smoke is **owed to Daniel**).
- Behind the `pdp_redesign` kill-switch (default enabled once shipped) so the layout can be reverted instantly.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (or the branch preview URL while testing pre-merge)

1. Open a listing with several photos and a description, e.g. https://miyagisanchez.com/l/<test-listing-id> on a phone (or a narrow window).
   → The page loads with the photo gallery at top, then title + price.
2. Look directly under the price.
   → You see a "Compra protegida" cue with a shipping/pickup hint (not buried lower).
3. Scroll down.
   → The description appears **above** the payment-methods grid and the seller card; nothing is hidden behind the bottom bar.
4. Look at the bottom bar.
   → There is one dominant "Comprar" button, a lighter "Hacer oferta", and "Preguntar" as a small link.
5. (offer state — **owed to Daniel**, needs a buyer session with a pending offer) Open the same listing where you have a pending offer.
   → The bar shows the offer state **instead of** the buy buttons (not stacked on top), and still covers no content.

If any step fails, note the step number + what you saw — that's the bug report.
