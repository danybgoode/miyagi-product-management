# Sprint 2 — Confidence, liveness & gallery growth

> Epic: [PDP redesign](README.md) · **Risk: LOW** (frontend; reuses existing components + `marketplace_favorites`).
> **Status: ✅ BUILT 2026-06-13 — branch `feat/pdp-redesign-s2`, PR pending (LOW).**
> S2.1 `cc53928` · S2.2 `e31faaa` · S2.3 `8ef2b9f`. Gate: tsc + `next build` + new pure `api` specs green
> locally; full `api` suite runs CI-vs-preview. Goal: add the trust/reputation/liveness signals the audit's
> finding #7 calls for, and finish finding #1 (the gallery's missing back / share / counter).
>
> **VALIDATE-FIRST outcome (S2.1):** no live source for a **seller rating/reseñas** or a **response-time**
> metric (no reviews table, no `rating`/`response_time` field). The only **ventas** track-record source is the
> legacy buyer-trust scorer (`lib/ucp/identity.ts → asSellerCompleted`), which counts only legacy
> `marketplace_orders` and **undercounts Medusa-order sellers** (would show "0 ventas" to an active seller).
> Per Daniel's call, all three dynamic signals are **deferred** — S2.1 ships the static capsule
> (verificado · pago protegido · devoluciones) only.

## Stories

### S2.1 — Confidence capsule + seller rating (#7) — ✅ `cc53928` (static items; dynamic deferred)
**As** a buyer, **I want** to see verification, response time, returns, and the seller's track record up front,
**so that** I trust the seller before I act.
- Capsule: verificado · responde en ~1 h · devoluciones (reuse `<TrustSignals>`); seller rating + ventas count on
  `SellerTrustCard`. **Open question (validate first):** confirm there's a live seller rating + response-time
  source. If absent, ship the static items (verificado · devoluciones) and **defer** the dynamic rating/response
  rather than inventing data — state the gap in the PR.
- **Acceptance:** the capsule renders with real data where available and degrades cleanly where not.
- **QA:** api spec on whatever derives the capsule; browser smoke for render. **Risk: LOW.**

### S2.2 — Liveness / FOMO — ✅ `e31faaa`
**As** a buyer, **I want** subtle signals that the item is in demand and fresh, **so that** I feel the nudge to act.
- "X personas lo guardaron" from `marketplace_favorites` (count, gated at a threshold so 0–1 doesn't show); a
  "<48h" "Nuevo" badge using the existing `timeAgo`, gated to recent only.
- **Acceptance:** save-count shows only when ≥ threshold; "Nuevo" only when < 48h.
- **QA:** pure-logic spec on the gates (`lib/` seam). **Risk: LOW.**

### S2.3 — Gallery back + share + counter (#1) — ✅ `8ef2b9f`
**As** a buyer, **I want** to leave the immersive gallery, share the listing, and see how many photos there are,
**so that** I stay in control and can send it to someone.
- Glass back button (top-left), share via native `navigator.share` (fallback: copy link) + favorite (top-right),
  "1 / N" counter bound to the active image. Extend the existing gallery island — don't add a carousel library.
- **Acceptance:** the counter tracks the active photo; share opens the OS sheet (or copies the link); back returns.
- **QA:** anonymous browser smoke (counter increments on swipe/next; share button present). **Risk: LOW.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- **Browser smokes:** anonymous gallery interactions (counter/share/back) + liveness gates; capsule render.
- No money/auth path. Auto-mergeable on green CI by a fresh reviewer (no shared-layout touch beyond the gallery island).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (use the branch **preview** URL while testing pre-merge —
`https://<vercel-preview>/l/<id>`). The `pdp_redesign` flag must be ON (default enabled) for steps 1, 4, 5.

1. Open a listing with **2+ photos**, e.g. https://miyagisanchez.com/l/<test-listing-id> on a phone.
   → A "1 / N" counter shows bottom-right over the photo; a **back** button + **share** button sit top-left;
     the **favorite** heart is top-right and the **views** badge bottom-left (unchanged).
2. Swipe (or tap the desktop next-arrow) to the next photo.
   → The counter advances (e.g. "2 / 6").
3. Tap **share**.
   → The OS share sheet opens. *(Owed to Daniel — native `navigator.share` only fires on a real
     device/browser; on a desktop browser without it, the link is copied and "Enlace copiado" shows.)*
4. Look just under the **price**.
   → A confidence capsule shows **verificado · pago protegido · devoluciones** (the returns chip is here in the
     redesign layout, not duplicated in the methods box below). **Note:** seller **rating/reseñas**,
     **response-time**, and a **ventas** count are intentionally NOT shown — no live source (deferred; see header).
5. On a listing **≥ 3 people** have favorited, look at the title meta row.
   → A subtle "X personas lo guardaron" line shows (hidden below 3 saves). On a listing posted in the **last 48h**,
     a "Nuevo" badge shows at the start of the meta row.

**Owed to Daniel (live, can't be fully automated):** step 3's native share sheet, and a phone-width eyeball of the
capsule / "Nuevo" badge / save-count placement. No money/auth path in this sprint.

If any step fails, note the step number + what you saw — that's the bug report.
