# Navigation & Settings Reorg — Sprint 4: Naming + one-agent-entry cleanup

**Status:** ✅ SHIPPED 2026-06-11 — [PR #81](https://github.com/danybgoode/miyagisanchezcommerce/pull/81)
squash-merged to `main` (`8e12782`); fresh-reviewer APPROVE, CI green; branch deleted ·
**Risk:** LOW · audit §5 (comunidad merge **deferred**) ·
files: `app/layout.tsx`, home feed (`app/page.tsx`), `e2e/nav-entry-points.spec.ts` + `.browser.spec.ts`

> **Note:** the `/comunidad → /vecindario` content merge is **out of scope** (separate ask — it migrates live
> publish routes). The `/vende` landing is **owned by epic #6** and is **not edited here** — this sprint only
> wires entry points to it.

## Stories

### Story 4.1 — `/sell` (publish) vs `/vende` (landing) entry-point wiring
**As a** signed-out visitor, **I want** the "Vende"/"Publicar" story to lead to the `/vende` landing while the
publish action stays `/sell`, **so that** the pitch and the action are distinct.
**Acceptance:**
- Signed-out seller CTAs (header "Publicar gratis", footer "Vende gratis", any sell pitch) point at **`/vende`**
  (the existing #6 anchor landing).
- The bottom-bar **⊕ FAB** and signed-in "Publicar" point at **`/sell`** (the publish flow).
- **No `/vende` page content is changed** (that's #6's surface).
**Risk:** LOW · **Built:** `2edcf35` — header "Publicar gratis" + footer "Vende gratis" → `/vende`; mobile
header plus-circle made auth-aware (signed-out → `/vende`, signed-in → `/sell`); FAB + signed-in "Publicar"
unchanged on `/sell`.

### Story 4.2 — Vecindario reachable after leaving the bar
**As a** buyer, **I want** Vecindario reachable from the Inicio feed (and header/footer) **so that** moving it
off the tab bar doesn't orphan it.
**Acceptance:**
- A Vecindario entry point exists in the **Inicio feed** (per the audit: "Vecindario → Inicio feed").
- The existing header/footer Vecindario links still resolve to `/vecindario`.
**Risk:** LOW · **Built:** `6e9115c` — compact Vecindario card on the home feed (between the category chips
and recent listings), reuses `NEIGHBORHOOD_PULSE_COPY` + `iconoir-community` + `card-tile`/design tokens,
catalog-independent, `data-testid="vecindario-feed-entry"` → `/vecindario`. Header/footer links unchanged.

## Sprint QA
- **api spec ✅ added** (`e2e/nav-entry-points.spec.ts`, `9f6bf14`): anonymous SSR HTML asserts the signed-out
  CTAs resolve to `/vende` (and are **not** still on `/sell`), the ⊕ FAB resolves to `/sell`, the Vecindario
  entry is present in the home feed (`data-testid`) → `/vecindario`, and the footer link resolves. Verified
  `<Show when="signed-out">` renders server-side and the regexes against the live prod render.
- **browser smoke ✅ added** (`e2e/nav-entry-points.browser.spec.ts`, anonymous Chromium): desktop
  "Publicar gratis" → `/vende`; Vecindario feed card opens `/vecindario`. Nightly / on-demand (not the gate).
- **deterministic gate:** `tsc --noEmit` ✅ · `next build` ✅ · Playwright `api` `design-token-foundation` ✅
  (no raw hex). The HTML-fetching api specs can't pass against prod pre-deploy → **CI's Playwright `api` vs the
  branch preview is the authoritative gate**.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: the **branch preview** while testing pre-merge (PR #81 → Vercel preview); production
· https://miyagisanchez.com after merge. The anonymous steps (1, 3, 4) are covered by the new
Playwright specs; the **signed-in** step (2) and the **PWA-standalone** look are **owed to Daniel**.

1. Open the home page **signed out** and click the desktop "Publicar gratis" (or footer "Vende gratis") CTA.
   → You land on the **`/vende`** landing page (the seller-acquisition story), **not** the publish form.
   *(On a phone, the signed-out header ⊕ plus-circle also goes to `/vende`.)*
2. **[owed to Daniel — signed-in]** Sign in, then tap the bottom-bar **⊕** FAB (and the header "Publicar").
   → Both land on **`/sell`** (the publish flow), not `/vende`.
3. From the **Inicio** feed, find the **Vecindario** entry card (below the category chips, above recent
   listings). → It's present in the feed and opens `/vecindario`.
4. Open the footer and click **Vecindario**.
   → It still resolves to `/vecindario`.
5. **[owed to Daniel — PWA]** Install/open the app as a PWA (standalone) and repeat steps 1–4.
   → Same destinations; the bottom bar's ⊕ FAB still publishes (`/sell`).

If any step fails, note the step number + what you saw — that's the bug report.
