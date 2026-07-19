# Fixed overlays trapped under the platform chrome — Sprint 1: portal the lightbox, close the class

**Status:** ⬜ not started

> **Root cause (proven 2026-07-19, don't re-derive):** `app/globals.css:1089-1093` —
> `.platform-main-shell { position: relative; isolation: isolate }` creates a stacking context, and
> `:1112-1115` pins its children to `z-index: 1` in the **root** context. `PlatformShell.tsx:38-45`
> renders the sticky header at `zIndex: 50` and `:330` the `MobileTabBar` at `zIndex: 100`, both as
> root-context siblings of `<main>` (`:302`). `Gallery.tsx:401`'s `Lightbox` is
> `position: fixed; zIndex: 100` but mounts **inline inside `<main>`** (`:313-325`) — so its 100 is
> scoped inside a subtree worth 1. **Raising the z-index cannot fix this. No value works.**

## Stories

### Story 1.1 — Portal the lightbox out of the trapped subtree
**As a** buyer viewing a listing's photos, **I want** the close button to be visible and tappable,
**so that** I can leave the fullscreen gallery the obvious way instead of guessing at a gesture.
**Files:** `app/(shell)/l/[id]/Gallery.tsx` (the `Lightbox` mount at ~L313-325), `app/globals.css`
(overlay z-layer token if none exists).
**Acceptance:** on a PDP, mobile **and** desktop, opening the lightbox shows the "Cerrar" X fully
visible in the top-right, above the header; clicking/tapping it closes. The tab bar no longer
overlaps the lightbox. Esc and tap-out still close. Background scroll stays locked. A 2+ photo
listing keeps arrows + the "N / total" counter; a 1-photo listing still shows neither (PR #247's
behaviour is unchanged). The lightbox still mounts **only on open** — no cost when closed.
**Implementation note:** use `createPortal` to `document.body` with the `mounted` guard from
`AIAgentButton.tsx:4,48`. Prefer a named z-layer token over a magic number — Story 1.3 needs a
single source of truth. **Do not touch `isolation: isolate`** — it is correct for the theme pattern
and removing it regresses that layer.
**QA:** extend `e2e/pdp-gallery.browser.spec.ts`. **The assertion must prove hit-testability, not
presence** — `toBeVisible()` passes on an occluded element, so assert via a real `click()` (which
fails on interception) or an explicit `elementFromPoint` check at the button's centre. A presence
check would not have caught this bug and must not be what closes it.
**Risk:** LOW.

### Story 1.2 — Document the constraint + audit the sibling overlays
**As a** builder adding any future full-screen overlay, **I want** the stacking constraint stated
where the constraint lives, **so that** I don't spend an afternoon raising a z-index that can never
work.
**Files:** `app/globals.css` (comment at `.platform-main-shell`), plus whichever of the six audit
targets genuinely reproduce.
**The six to check** (grepped 2026-07-19 — re-grep, files move):
`MakeOfferButton.tsx:349` · `OfferInbox.tsx:91` · `PricingCard.tsx:42` · `BulkDiffPreview.tsx:115` ·
`CatalogTable.tsx:107` · `SearchBar.tsx:158` — all `fixed inset-0 z-50`.
**Acceptance:** a comment block at the `isolation: isolate` declaration stating that any
`position: fixed` overlay inside this subtree must be portalled to `body`. Each of the six is either
(a) confirmed to reproduce and portalled, or (b) confirmed **not** to reproduce with the reason
written down (the `/shop/manage/*` ones render under the seller shell, not `PlatformShell` — verify
rather than assume). No silent skips.
**Risk:** LOW.

### Story 1.3 — Anti-recurrence guard (optional — drop it if it isn't cheap)
**As the** team, **I want** CI to catch an unportalled full-screen overlay, **so that** this class
can't come back the way the raw-color and emoji classes did.
**Acceptance:** a static check in the shape of the existing `lib/design-token-audit.ts` /
`lib/emoji-guard.ts` guards, flagging a `position: fixed` full-screen overlay under `app/(shell)/`
that isn't portalled. Ships with the allow-list **empty**. Observed red once against a deliberate
violation fixture.
**Explicit permission to abandon:** if this can't be written cheaply and without false positives,
**drop the story and say so in the PR.** A noisy guard is worse than no guard, and the class is
already documented by 1.2. Do not spend a sprint on it.
**Risk:** LOW.

## Sprint QA
- **api spec(s):** `e2e/pdp-gallery.browser.spec.ts` extended (hit-testability assertion). Guard
  fixture spec if Story 1.3 ships.
- **Red-first:** the new assertion must be observed failing against the current unportalled build
  before the fix lands — this one is a genuine mutation check, not a formality.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright against the PR's Vercel
  preview, all green before merge.
- **browser smoke owed:** **yes, to Daniel** — the real-device mobile pass. A headless viewport does
  not reproduce the PWA tab bar's safe-area behaviour, and the `.pwa-only` / standalone display mode
  is structurally not headless-smokeable (LEARNINGS: never "fix" a spec by forcing it there). Also
  owed: the light **and** dark platform-theme check, because portalling moves the lightbox out of
  the theme subtree and any custom property scoped to `.platform-main-shell` would be silently lost.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the PR's Vercel preview while pre-merge, then production · https://miyagisanchez.com after merge

1. On a **phone**, open any listing with 2+ photos, e.g. `https://miyagisanchez.com/l/<id>`.
   → The PDP renders normally; photos swipe.
2. Tap the main photo.
   → The fullscreen lightbox opens **and the round X is fully visible in the top-right corner** —
   not clipped, not dimmed, not behind the glass header.
3. Tap the X.
   → The lightbox closes and you're back on the PDP at the same photo.
4. Re-open the lightbox and look at the bottom of the screen.
   → The floating tab bar is **not** sitting on top of the lightbox.
5. Switch the platform theme (light ↔ dark) and re-open the lightbox.
   → Background is still the dark backdrop, the X still reads correctly in both themes.
   *(This is the step that catches a lost CSS custom property from the portal move.)*
6. On **desktop**, open a listing with 2+ photos → click the main image.
   → X visible top-right; arrows and the "N / total" counter still present; ←/→ still step; Esc
   closes; clicking the backdrop closes.
7. Open a listing with exactly **one** photo → click it.
   → Lightbox opens with the X visible, and **no arrows, no counter** (PR #247's behaviour intact).
8. Open a listing with **no** photos.
   → The back + share buttons still render over the placeholder.

If any step fails, note the step number + what you saw — that's the bug report.
