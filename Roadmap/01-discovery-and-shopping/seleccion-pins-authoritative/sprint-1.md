# Sprint 1 — Pins authoritative over price + grid grows to all pins

**Epic:** [Selección — make admin pins authoritative](README.md) · **Risk:** LOW (frontend pure-logic) · **Repo:** `apps/miyagisanchez`.
**Branch:** `feat/seleccion-pins-authoritative` off latest `main`. Keep `next build` emitting `○ /`.

**✅ SHIPPED 2026-06-25 — PR [#124](https://github.com/danybgoode/miyagisanchezcommerce/pull/124) squash `740f967`, live on Vercel prod.**
Both stories merged (S1.1 `8f64f97` · S1.2 `9ecf72e`); CI green (Type-check+build + Playwright vs preview);
codex cross-review clean (one signature nit declined — tsc-enforced single caller, consistent with
`getFeaturedListing(now)`). Owed to Daniel: the live admin pin/reorder eyeball (steps 1–5 below).

Frontend-only, both stories on the next-free `lib/home-curation.ts` seam → proven by the Playwright `api` spec, no
network/auth. Ships first as the quick win (fixes the Destacado bug for pins already inside the freshest-24 pool).

---

## S1.1 — Pins authoritative over price · LOW ✅ `8f64f97`

**As an** admin, **I want** a pinned product to appear in the Selección even when it has no price, **so that** my
rank-1 pin is always the Destacado — not skipped because it's a "Sin precio" event/agenda/art listing.

- In `lib/home-curation.ts` → `isQualifying`: a pinned listing (`isPinned(l)`) bypasses the `hasPrice` gate, but
  **still requires** `active/published` **and** `≥1 image`. Unpinned listings are unchanged (still need a price).
- The cards already render `price_cents == null` as "Sin precio" / "Precio a consultar" — no UI change.

**Acceptance (Daniel-testable):** with pins ranked 1..n where rank 1 is "Sin precio", the homepage Destacado is the
rank-1 pin. Unpinned no-price listings still never appear. A pinned no-image listing still doesn't appear.

**QA:** extend `e2e/home-curation.spec.ts`:
- a **pinned no-price** listing **qualifies** and is the Destacado at rank 1;
- an **unpinned no-price** listing is **still excluded**;
- a **pinned no-image** listing is **still excluded**;
- a **pinned non-active** listing is **still excluded**.

## S1.2 — Grid grows to all qualifying pins · LOW ✅ `9ecf72e`

**As an** admin, **I want** every product I pin to show under the Destacado in my order, **so that** the Selección
reflects my full curation instead of capping at 5.

- `lib/home-curation.ts` → `curateGrid`: include **all** qualifying pins (in `featured_rank` order, after the
  excluded Destacado), then auto-fill the unpinned remainder (still seeded-shuffled per ISR window) up to a minimum
  of `GRID_SIZE`, **capped at 11** grid cards total.
- `lib/listings.ts` → `getCuratedListings`: compute the grow-to-all-pins size rather than hard `n = 4`.

**Acceptance:** pin 6 products → the homepage shows the Destacado + 5 more in rank order. Pin 2 → Destacado + 1 pin
+ 3 auto-filled (= 5). Pin 12 → Destacado + 11 (the cap). The unpinned remainder still rotates across ISR windows.

**QA:** `e2e/home-curation.spec.ts`:
- N qualifying pins ⇒ grid contains all N−1 (after Destacado) in rank order; pins never sliced below the cap;
- fewer pins ⇒ auto-fill brings the grid up to `GRID_SIZE`;
- the cap holds at 11; the Destacado never repeats in the grid; unpinned shuffle/per-window behaviour unchanged.

---

## Sprint 1 — QA

Deterministic gate: `tsc` + `next build` (must keep `○ /`) + `npm run test:e2e` (the extended `home-curation.spec.ts`,
pure `api`). No browser smoke owed beyond the walkthrough below — the logic is fully spec-covered.

**Gate result (local, 2026-06-25):** ✅ `tsc --noEmit` clean · ✅ `next build` passes with `○ /` (revalidate 1m) ·
✅ `home-curation.spec.ts` 34/34 (`api`). CI re-runs the same gate vs the branch preview before merge.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com (or the Vercel preview URL while pre-merge).
**Note:** the pin/reorder steps need Daniel's Clerk **admin** session — **owed to Daniel**.

1. Sign in as admin → go to https://miyagisanchez.com/admin/seleccion
   → You see **FIJADOS** with your current pins, drag-ordered, rank 1 badged **Destacado**.
2. Make sure rank 1 is a **"Sin precio"** product (e.g. an Agenda CDMX / Teatro UNAM listing). Pin it to the top.
   → It sits at rank 1 with the **Destacado** badge.
3. Wait ~1 min, open https://miyagisanchez.com in a private window.
   → The big **Destacado** card is your rank-1 "Sin precio" product (showing "Sin precio"/"Precio a consultar"),
     **not** a different priced item. *(This is the S1.1 fix — the bug was here.)*
4. Pin 6 products total and order them.
   → Under the Destacado you see the other 5 pins **in your rank order** (subject to the freshest-24 pool until S2).
5. Reduce to 2 pins, reload after ~1 min.
   → Destacado + 1 pin + a few auto-filled fresh cards (total ~5) — the grid still fills, doesn't collapse.

If any step fails, note the step number + what you saw — that's the bug report.
