---
title: "Fixed overlays are trapped under the platform chrome — the PDP lightbox close button is unreachable"
slug: pdp-lightbox-close-button-occluded
status: scaffolded
area: "01"                           # reported on the PDP gallery; the root cause is shared 09 chrome
type: bug                            # class: Bug (stacking-context trap) · archetype: Sweeper/Maintainer
priority: null
risk: low                            # frontend-only render/portal change; no commerce, auth, or data path
epic: "01-discovery-and-shopping/pdp-lightbox-close-button-occluded"
build_order: null
updated: 2026-07-19
---

# Scope — the PDP lightbox's close button is painted over by the platform header

## Mirror-back of the ask

> *"There's a small bug with the image gallery on mobile and desktop: once the user is inside the
> gallery, the closing X on the top right corner is not visible — I think it's hidden behind the
> navbar."*

Right — and the diagnosis was correct. It's the navbar. What the grooming pass added is **why**,
and that the same trap silently affects **every other full-screen overlay on the platform**, not
just this one.

## Reproduction

1. Open any listing PDP on `https://miyagisanchez.com/l/<id>` — mobile **or** desktop.
2. Tap/click the main photo. → The fullscreen lightbox opens as expected.
3. Look at the top-right corner. → The **"Cerrar" X button is not visible** — the sticky glass
   header is painted on top of it. On mobile the floating tab bar likewise covers the bottom of
   the lightbox.
4. Esc (desktop) and tap-out still close it, so the lightbox is not *trapped* — but the primary,
   discoverable affordance is invisible. On mobile, where there is no Esc key, the user is left
   guessing.

## Root cause — verified in the code on 2026-07-19, not assumed

A **stacking-context trap**. Three facts compose into the bug:

1. `app/globals.css:1089-1093` — `.platform-main-shell { position: relative; isolation: isolate }`.
   `isolation: isolate` *unconditionally creates a new stacking context*. It was introduced for the
   platform-theme background pattern (`::before`, L1095-1106) so the pattern could sit behind page
   content — a correct, deliberate choice for that purpose.
2. `app/globals.css:1112-1115` — `.platform-main-shell > :not(.platform-theme-spot) { position:
   relative; z-index: 1 }`. So the entire page subtree, PDP included, resolves to **z-index 1 in
   the root stacking context**.
3. `app/components/PlatformShell.tsx:38-45` — the sticky header wrapper is `position: sticky;
   zIndex: 50`, and it is a **sibling of `<main>`**, i.e. it lives in the *root* stacking context.
   `app/components/MobileTabBar.tsx:191-198` is `position: fixed; zIndex: 100`, also a root-context
   sibling, rendered *after* `<main>` (`PlatformShell.tsx:302,330`).

`Gallery.tsx`'s `Lightbox` is `position: fixed; inset: 0; zIndex: 100` (L401) and is rendered
**inline inside the gallery** (L313-325) — no portal. Because its nearest stacking context is the
isolated `.platform-main-shell`, that `z-index: 100` is scoped *inside* a subtree that is itself
only **1** in the root context. Header 50 > 1 and tab bar 100 > 1, so both paint over the whole
lightbox. Raising the lightbox's z-index cannot fix this — **no value works**, because the
comparison never happens in the same context.

**This is a class, not an instance.** Every `position: fixed` overlay rendered inside `<main>` is
trapped the same way. Grepped on 2026-07-19:

| Surface | File | Declared |
|---|---|---|
| PDP lightbox (**the report**) | `app/(shell)/l/[id]/Gallery.tsx:401` | `zIndex: 100` |
| Make-offer modal | `app/components/MakeOfferButton.tsx:349` | `fixed inset-0 z-50` |
| Offer inbox modal | `app/(shell)/shop/manage/offers/OfferInbox.tsx:91` | `fixed inset-0 z-50` |
| Pricing card modal | `app/(shell)/shop/manage/profit/PricingCard.tsx:42` | `fixed inset-0 z-50` |
| Bulk diff preview | `app/(shell)/shop/manage/catalogo/BulkDiffPreview.tsx:115` | `fixed inset-0 z-50` |
| Catalog table modal | `app/(shell)/shop/manage/catalogo/CatalogTable.tsx:107` | `fixed inset-0 z-50` |
| Search bar sheet | `app/(shell)/l/SearchBar.tsx:158` | `fixed inset-x-0 bottom-0 z-50` |

The seller-portal ones (`/shop/manage/*`) render under the **seller** shell, not `PlatformShell`,
so they may not reproduce today — but they carry the identical latent defect and will break the
moment that shell adopts `isolation`. Confirm per-surface at build time rather than assuming.

## Stage-2.5 bucket

**Genuinely new work — but as a small fix, not a feature.** No positioning or copy path exists: the
close button is either painted or it isn't. It is one story, plus an optional second story to close
the class.

## What already exists (reuse, don't rebuild)

- **`createPortal` is already the proven in-repo pattern for exactly this** —
  `app/components/AIAgentButton.tsx:4,48` portals its sheet with a `mounted` guard to stay
  SSR-safe. Copy that shape; do **not** invent a new overlay primitive.
- `Lightbox`, `cornerBtn`, the Esc/tap-out/scroll-lock handlers — all already correct in
  `Gallery.tsx`. Only the **mount location** is wrong, not the component.
- `e2e/pdp-gallery.browser.spec.ts` — the regression spec from PR #247 (the single-image parity
  fix). Extend it; don't start a new spec file.
- The design-token guard and the Iconoir guard already cover this surface — the chrome is
  token-compliant, so the fix must not introduce a raw z-index literal if a token layer exists.

## Scope

**In v1 (Story 1 — the reported bug):**

- Portal `Lightbox` to `document.body` via `createPortal`, with the `AIAgentButton` `mounted` guard
  so SSR and hydration stay clean.
- Give it a z-index **above the tab bar** (>100). Prefer a named layer token over a magic number —
  if `globals.css` has no overlay-layer scale yet, add one (`--z-overlay`) and use it, since the
  next story depends on there being a single source of truth.
- Verify against **both** chrome layers: the sticky header (z-50) and `MobileTabBar` (z-100).

**In v1 (Story 2 — close the class, LOW):**

- A short comment block at `.platform-main-shell`'s `isolation: isolate` declaring the constraint:
  *any `position: fixed` overlay inside this subtree must be portalled to `body`.*
- Audit the six sibling surfaces in the table above; portal the ones that genuinely reproduce.
- A regression guard in the spirit of the raw-color / build-order guards (see LEARNINGS): a static
  check that flags a `position: fixed` full-screen overlay inside `app/(shell)/` that is **not**
  portalled. Ship it with the allow-list empty. If the guard proves too noisy to write cheaply,
  drop it and say so — don't spend a sprint on it.

**Out of v1:**

- Any change to `isolation: isolate` itself or to the platform-theme background pattern — it is
  correct for its purpose, and removing it to fix the lightbox would regress the theme layer.
- Any redesign of the lightbox chrome, the header, or the tab bar.
- The seller-portal shell's own stacking model (separate shell, separate pass).

## Acceptance criteria

- **Mobile, real device:** open a PDP → tap the photo → the **X is fully visible** in the top-right,
  above the header; tapping it closes the lightbox. The tab bar does not overlap the lightbox.
- **Desktop:** same, and Esc + tap-out still close. Arrows and the "N / total" counter behave
  exactly as before on a 2+ photo listing.
- **Single-photo listing:** the lightbox still opens with no arrows and no counter — PR #247's
  behaviour is unchanged.
- Background scroll stays locked while the lightbox is open (existing behaviour, must not regress).
- No layout shift on the PDP when the lightbox is closed — the portal must mount only on open
  (`Gallery.tsx:313` already lazy-mounts; keep that).

## QA / smoke stage

- **Spec:** extend `e2e/pdp-gallery.browser.spec.ts` with an assertion that the close button is
  **visible and hit-testable**, not merely present in the DOM — Playwright's
  `toBeVisible()` alone will pass on an occluded element, so assert via an actual `click()` on the
  button (which fails on interception) or an explicit
  `elementFromPoint` check at the button's centre. **This is the assertion that would have caught
  the bug**; a presence check would not have.
- Observe the new spec **red** first against the current code (the mutation check per
  WAYS-OF-WORKING) — it should fail on the unportalled build.
- **Owed to Daniel:** the real-device mobile confirmation. A headless viewport does not reproduce
  the PWA tab bar's safe-area behaviour, and the standalone `.pwa-only` display mode is not
  headless-smokeable (see LEARNINGS — never "fix" a spec by forcing it there).

## Risk tier

**LOW** — frontend-only render location + CSS layer. No commerce, payments, auth, or data path.
Reviewer may merge on a green gate.

## Open risks / research

- Portalling to `body` moves the lightbox **out of the theme subtree**. If any lightbox styling
  inherits a CSS custom property scoped to `.platform-main-shell` (rather than `:root` or `html`),
  it will silently lose it. Check the computed background/foreground of the portalled lightbox in
  both light and dark platform themes before calling the story done.
- The `(site)` static route group has its own layout and may not use `.platform-main-shell` at all
  — confirm the PDP is only ever rendered under `(shell)` so the fix lands everywhere it's needed.
