# Sprint 1 — Base PDP: fix the bug, reorder by intent, one primary action

> Epic: [PDP redesign](README.md) · **Risk: LOW** (frontend reorder/polish; **touches the shared buy bar** —
> announced; behind the `pdp_redesign` kill-switch). **Status: ✅ built — PR [#88](https://github.com/danybgoode/miyagisanchezcommerce/pull/88) (draft), deterministic gate green; authed pending-offer smoke owed to Daniel.**
> Goal: the standard physical-product PDP resolves *identify → trust → cost → act* in order, the reported
> bar/padding bug is gone, and there is one clear primary action. Both auth states.
>
> **Build notes (reconciled to what shipped):**
> - Behind `pdp_redesign` (default `true`, fail-open kill-switch in `lib/flags.ts`). Flag OFF ⇒ previous PDP
>   byte-for-byte (`ctaButtons` untouched). Flag still needs **creating** in Flagsmith (both envs, enabled) to be
>   toggleable — done at ship, verified at epic DoD.
> - S1.4 protection cue **reuses the slim `<TrustSignals>` capsule → "Pago protegido"** (Daniel's call), not a
>   bespoke "Compra protegida" string; one phrasing site-wide. `returnsLabel={null}` on the cue so the returns
>   chip stays only on the methods box (no duplicate).
> - New seam `lib/pdp-bar.ts` (`derivePdpBarMode`) + client islands `StickyBuyBar.tsx` (measured spacer) and
>   `CollapsibleDescription.tsx`. Additive `variant='link'` on the shared `AskSellerButton` (default unchanged).
> - `typeFrame`/`SellerTrustCard` mobile-above-methods reorder were **already live** on `main` (Discovery #3c),
>   so S1's reorder is just lifting the description + a specs slot above the methods/seller block.

## Stories

### S1.1 — Bar/padding overlap fix (#4) ✅ `e5e7760` + `c4b8a61`
**As** a buyer, **I want** the bottom bar to never cover the page content, **so that** I can read the
description and tags.
- Root cause: page wrapper hard-codes `pb-[120px]` (`app/l/[id]/page.tsx:288`) while the sticky bar (`:686`) is
  `position: fixed` with **variable** height. Replace the fixed padding with a spacer that matches the bar's
  **real** rendered height + `env(safe-area-inset-bottom)`; make the offer-state banners **replace** the buy bar
  (one bar at a time), not stack on top of it.
- **Acceptance:** on a listing with a pending offer, nothing is clipped behind the bar on mobile; description +
  tags are fully visible; the bar shows one state at a time.
- **QA:** browser smoke (anonymous + a pending-offer state); pure-logic spec if a height/spacer helper is extracted. **Risk: LOW.**

### S1.2 — Right-column reorder by intent (#3) ✅ `692ad03` + `c4b8a61`
**As** a buyer, **I want** to see what the item is and trust the seller before being asked to buy, **so that** I
can decide with confidence.
- Reorder: gallery → title + price + protection cue → trust capsule → specs (placeholder until Sprint 3) →
  description ("Ver más" collapsible) → payment/delivery → seller → bundle → tags. Use the duplicate-render idiom
  for mobile/desktop, not flex-order.
- **Acceptance:** on mobile, description (and the specs slot) appear above the payment grid and seller card.
- **QA:** browser smoke asserts render order; pure-logic spec if an ordering helper is extracted. **Risk: LOW.**

### S1.3 — Two-action bar, one primary (#5) ✅ `e5e7760` + `c4b8a61`
**As** a buyer, **I want** one obvious primary action, **so that** I'm not stuck choosing between three equal buttons.
- "Comprar" primary, "Hacer oferta" secondary, "Preguntar" a light text link. Anchored price summary + safe-area.
  Reducing to two buttons also shrinks the bar (reinforces S1.1).
- **Acceptance:** one visually-dominant primary CTA; the bar is shorter than today's three-button bar.
- **QA:** browser smoke. **Risk: LOW.**

### S1.4 — "Pago protegido" cue beside the price (#2) ✅ `c4b8a61`
**As** a buyer, **I want** the protection signal next to the price, **so that** my doubt is resolved at the
moment I see the cost.
- Slim `<TrustSignals variant="slim">` capsule directly under the price — chip copy **"Pago protegido"** (+
  "Vendedor verificado" when applicable), reusing the existing capsule seam (Daniel's call: reuse, not a bespoke
  "Compra protegida"). The methods grid stays below (per S1.2 order).
- **Acceptance:** the protection cue renders adjacent to the price, not buried in the methods grid.
- **QA:** browser smoke (`trust-signals-slim` above `pdp-methods`); selector covered by `trust-signals.spec.ts`. **Risk: LOW.**

## Sprint QA
- **Deterministic gate (green locally):** `tsc --noEmit` ✅ · `next build` ✅ · Playwright `api`
  `e2e/pdp-bar.spec.ts` (7, S1.1+S1.3 one-state / one-primary) ✅. CI re-runs `tsc + build + Playwright api`
  vs the branch preview (authoritative).
- **Anonymous browser smoke (not the gate):** `e2e/pdp-redesign.browser.spec.ts` — mobile reorder (S1.2),
  "Pago protegido" cue placement (S1.4), `pdp-bar-spacer` height matches the bar (S1.1 no-overlap), one
  primary action (S1.3); data-resilient, skips on empty data. Runs nightly / on demand.
- **Owed to Daniel (authed):** the **pending-offer bar state** — needs a buyer session with a live pending
  offer (the bar shows the offer state *instead of* the buy buttons, covering no content).
- Behind the `pdp_redesign` kill-switch (default enabled) so the layout can be reverted instantly.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch preview URL (PR [#88](https://github.com/danybgoode/miyagisanchezcommerce/pull/88)) pre-merge;
production · https://miyagisanchez.com once merged. Do it **on a phone or a narrow (<768px) window** — the
reorder + sticky bar are mobile behaviors. Use a **claimed** shop's physical product with a price, several
photos, and a description (e.g. open https://miyagisanchez.com/l and tap the first product card).

1. Open the listing on a phone (or narrow window).
   → The page loads with the photo gallery at top, then title + price.
2. Look directly under the price.
   → You see a **"Pago protegido"** chip (and "Vendedor verificado" if the shop is verified) — the protection
     cue is right by the price, not buried in the methods box lower down.
3. Scroll down.
   → The **Descripción** appears **above** the "Métodos disponibles" payment box and the seller card. (A
     long description is clamped with a **"Ver más"** link you can tap to expand.)
4. Keep scrolling to the very bottom.
   → Nothing is hidden behind the fixed bottom bar — the last content (tags / "Ver anuncio original") is fully
     readable above it. (The bar reserves exactly its own height; it no longer clips content.)
5. Look at the bottom bar.
   → There is **one** dominant dark **"Comprar ahora"** (or "Inicia sesión para comprar" when signed out), a
     lighter **"Hacer oferta"**, and **"Preguntar"** as a small underlined text link — not three equal buttons.
6. **(offer state — OWED TO DANIEL, needs a buyer session with a pending offer)** Open a listing where you have
   a pending offer.
   → The bar shows the **"Tu oferta está pendiente"** state **instead of** the buy buttons (not stacked on
     top), and still covers no content.
7. **(revert check, optional)** Flip `pdp_redesign` OFF in Flagsmith and reload.
   → The PDP returns to the previous layout (protection chip gone, description back at the bottom, old fixed bar).

If any step fails, note the step number + what you saw — that's the bug report.
