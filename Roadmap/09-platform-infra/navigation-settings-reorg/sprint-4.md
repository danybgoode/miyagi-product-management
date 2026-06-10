# Navigation & Settings Reorg — Sprint 4: Naming + one-agent-entry cleanup

**Status:** ⬜ not started · **Risk:** LOW · audit §5 (comunidad merge **deferred**) ·
files: `app/layout.tsx`, home feed (`app/page.tsx`), entry-point links

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
**Risk:** LOW

### Story 4.2 — Vecindario reachable after leaving the bar
**As a** buyer, **I want** Vecindario reachable from the Inicio feed (and header/footer) **so that** moving it
off the tab bar doesn't orphan it.
**Acceptance:**
- A Vecindario entry point exists in the **Inicio feed** (per the audit: "Vecindario → Inicio feed").
- The existing header/footer Vecindario links still resolve to `/vecindario`.
**Risk:** LOW

## Sprint QA
- **api spec(s):** an entry-point/link spec asserts the signed-out CTAs resolve to `/vende` and the FAB/publish
  resolve to `/sell`, and that a Vecindario entry point is present in the home feed + footer
  (`e2e/nav-entry-points.spec.ts`).
- **browser smoke owed:** anonymous Chromium smoke — signed-out home shows the seller CTA → `/vende`, and the
  Vecindario entry renders in the feed. No authed/money path here.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. Open https://miyagisanchez.com **signed out** and click the "Publicar gratis" / "Vende gratis" CTA.
   → You land on the **`/vende`** landing page (the seller-acquisition story), not the publish form.
2. Sign in and tap the bottom-bar **⊕** FAB (or "Publicar").
   → You land on **`/sell`** (the publish flow).
3. From the **Inicio** feed, find the Vecindario entry point.
   → It's present in the feed and opens `/vecindario`.
4. Open the footer and click **Vecindario**.
   → It still resolves to `/vecindario`.

If any step fails, note the step number + what you saw — that's the bug report.
