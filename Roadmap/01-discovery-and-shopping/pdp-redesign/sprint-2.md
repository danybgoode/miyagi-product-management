# Sprint 2 — Confidence, liveness & gallery growth

> Epic: [PDP redesign](README.md) · **Risk: LOW** (frontend; reuses existing components + `marketplace_favorites`).
> **Status: 🚧 planned.** Goal: add the trust/reputation/liveness signals the audit's finding #7 calls for, and
> finish finding #1 (the gallery's missing back / share / counter).

## Stories

### S2.1 — Confidence capsule + seller rating (#7)
**As** a buyer, **I want** to see verification, response time, returns, and the seller's track record up front,
**so that** I trust the seller before I act.
- Capsule: verificado · responde en ~1 h · devoluciones (reuse `<TrustSignals>`); seller rating + ventas count on
  `SellerTrustCard`. **Open question (validate first):** confirm there's a live seller rating + response-time
  source. If absent, ship the static items (verificado · devoluciones) and **defer** the dynamic rating/response
  rather than inventing data — state the gap in the PR.
- **Acceptance:** the capsule renders with real data where available and degrades cleanly where not.
- **QA:** api spec on whatever derives the capsule; browser smoke for render. **Risk: LOW.**

### S2.2 — Liveness / FOMO
**As** a buyer, **I want** subtle signals that the item is in demand and fresh, **so that** I feel the nudge to act.
- "X personas lo guardaron" from `marketplace_favorites` (count, gated at a threshold so 0–1 doesn't show); a
  "<48h" "Nuevo" badge using the existing `timeAgo`, gated to recent only.
- **Acceptance:** save-count shows only when ≥ threshold; "Nuevo" only when < 48h.
- **QA:** pure-logic spec on the gates (`lib/` seam). **Risk: LOW.**

### S2.3 — Gallery back + share + counter (#1)
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
Env: production · https://miyagisanchez.com (or the branch preview URL while testing pre-merge)

1. Open a listing with several photos, e.g. https://miyagisanchez.com/l/<test-listing-id> on a phone.
   → A "1 / N" counter shows over the photo; a back button sits top-left, share + favorite top-right.
2. Swipe to the next photo.
   → The counter advances (e.g. "2 / 6").
3. Tap share.
   → The OS share sheet opens (or, on unsupported browsers, the link is copied with a confirmation).
4. Look near the seller/trust area.
   → You see a confidence capsule (verificado · responde en ~1 h · devoluciones) and, if available, the seller's rating + ventas.
5. On a listing several people have favorited.
   → A subtle "X personas lo guardaron" line shows; on a listing posted in the last 48h, a "Nuevo" badge shows.

If any step fails, note the step number + what you saw — that's the bug report.
