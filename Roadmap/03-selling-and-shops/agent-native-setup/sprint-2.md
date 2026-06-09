# Agent-native setup (Onboarding 0) — Sprint 2: First-run onboarding apply

**Status:** 🟦 built — awaiting PR/review/merge · **Risk:** HIGH (creates a shop + bulk-creates products → **Daniel merges**)

> **Build log (branch `feat/agent-native-setup`, off main after S1's PR #60 merge):**
> - Story 2.1 (seam) — `570498e` — new pure/next-free `lib/setup-apply.ts`: `planSetupApply`
>   (create-shop-if-missing payload + ≤25 chunking + `MAX_IMPORT_ROWS` cap) + `aggregateSetupReport`
>   (folds shop/config/catalog responses into one per-block / per-row delta) + `chunkFailureRows`.
>   `e2e/agent-native-setup-apply.spec.ts` — 10 api-project tests.
> - Story 2.1 (UI) — `fbb39a4` — `app/sell/setup/{page,SetupClient}.tsx`: paste/upload → `validateSetup`
>   staging preview → confirm walks the plan over the **existing** routes (`POST /api/sell/shop` →
>   `/api/sell/settings-import` → `/api/sell/import` chunked) with live progress + graceful degrade +
>   land-in-shop summary. Entry requires sign-in only (it creates the shop).
> - Story 2.2 — `f979c39` — first-run nudge on `/sell` for shop-less sellers (manual `<SellWizard>` stays
>   as the no-agent fallback).
> - Gate green locally: `tsc` ✅ · `npm run build` ✅ (route `/sell/setup` present) · `api` suite
>   354 passed / 4 graceful-skip ✅ (new spec 10/10). Frontend-only; **no backend repo change**.
> - **Reuses the apply routes wholesale** (auth/validation/idempotency/graceful-degrade unchanged); the
>   only new code is the entry + the pure orchestration seam + the combined report.

> Goal: the loop's missing home. A freshly signed-up user pastes/uploads ONE setup JSON and lands in a
> populated shop in one pass — without hand-running `/sell` or finding two separate import pages. Pure
> orchestration over the **existing** apply routes; the new code is the entry + create-shop-if-missing
> seam + the sequencing/reporting.

## Stories

### Story 2.1 — First-run apply orchestration (create-shop-if-missing → config → catalog) ✅ `570498e` + `fbb39a4`
**As a** freshly signed-up user, **I want** my pasted setup JSON applied in one pass, **so that** my shop
exists with dressing + catalog without extra steps.
**Acceptance:**
- A new entry (e.g. `app/sell/setup` or a first-run mode of onboarding) accepts the combined setup JSON
  (paste **or** file), validates via `validateSetup` (S1), and shows the existing staging preview.
- On confirm, server-side: if the seller has no shop → `POST /api/sell/shop` (create standalone) → apply
  `config` via the `/api/sell/settings-import` path (`applyStoreConfig`) → import `catalog` via the
  `/api/sell/import` path (chunked, idempotent on `external_id`) → return a per-block / per-row delta.
- Degrades gracefully: a malformed block never blocks the valid ones (existing route behavior preserved);
  a partial failure reports exactly what applied. Re-pasting the same JSON is idempotent (no dupes).
- The orchestration is gated so an oversized/malformed file can't half-create state beyond what the
  per-row report shows.
**Risk:** **high** (creates seller/shop + bulk products)

### Story 2.2 — First-run entry + land-in-shop UX ✅ `f979c39` (+ summary in `fbb39a4`)
**As a** new user, **I want** to be routed to this step right after signup, **so that** the loop is the
default path, not a hidden page.
**Acceptance:**
- After signup, a shop-less user is offered the "paste your agent's setup" path (e.g. from `/sell` or a
  post-signup redirect) without breaking the existing manual `/sell` wizard (which stays as the
  no-agent fallback).
- On success, the user lands in their new shop (`/shop/manage` or the storefront) with a clear summary of
  what was created.
- es-MX copy-completeness (seller-portal default; no new bilingual surface).
**Risk:** low (UI/routing; the mutation is 2.1)

## Sprint QA
- **api spec(s):** Story 2.1 → `e2e/agent-native-setup-apply.spec.ts` — create-shop-if-missing branch,
  partial-apply reporting, idempotent re-apply (pure-logic on the orchestration seam where possible;
  extract a next-free helper so the `api` runner can unit-test it — LEARNINGS "test the seam").
- **browser smoke owed:** **yes, to Daniel** — the authed end-to-end *signup → paste → create-shop +
  import* run needs a real session (Clerk; shop + product writes). Anonymous browser smoke covers the
  step render + staging only.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (pre-merge: swap in the branch's Vercel preview URL)

> **Whole flow is auth + commerce-mutating → owed to Daniel.** An anonymous browser can't reach
> `/sell/setup` (it redirects to `/sign-up`), so the staging UI + apply need a real Clerk session and
> create a real shop + products. Use a brand-new throwaway account.

1. In a private window, sign up as a brand-new user at https://miyagisanchez.com/sign-up (**auth path —
   owed to Daniel**). After signup, open https://miyagisanchez.com/sell.
   → Above the manual "Publicar anuncio" wizard you see the nudge card **"¿Tu agente ya armó tu tienda?
     Pégala aquí."** (only shows for users without a shop). The manual wizard is still there below it.
2. Click the nudge (or go straight to https://miyagisanchez.com/sell/setup).
   → The "Arma tu tienda con tu agente" page loads with a paste box + an "o sube un archivo (.json)"
     button, and below it the copyable emit prompt + example (the S1 contract) for sellers who don't
     have a file yet.
3. Paste the setup JSON saved from the Sprint 1 smoke (step 6) into the box → click **Revisar**.
   → You see the staging preview: the config block rows (each "✓ N campo(s)" or "✕ omitido"), a
     catalog grid with each product's título/categoría/precio/SKU and a green **Listo** (or red
     **Corregir**) status, and summary chips ("N productos listos", "N bloque(s) de config").
     A bad/unknown `miyagi_setup_version` instead shows a clear error and no preview.
4. Click **Crear mi tienda y catálogo** (**money/commerce-adjacent path — owed to Daniel**: this creates
   the shop via `POST /api/sell/shop`, applies config, and bulk-creates products in ≤25-row chunks).
   → The button shows live progress ("Creando 25/40…"), then a 🎉 summary: **"¡Tu tienda está lista!"**
     with chips for N creados / actualizados / fallaron, the per-block config deltas, and two buttons —
     **"Ir a mi tienda →"** (`/shop/manage`) and **"Ver mi tienda pública"** (`/s/<new-slug>`).
5. Click **Ver mi tienda pública** (`/s/<new-slug>`).
   → The brand/dressing (name, accent, banner) and the imported products render on the storefront.
6. Go back to https://miyagisanchez.com/sell/setup, paste the SAME JSON, **Revisar** → **Crear…** again.
   → No duplicate products (idempotent on `external_id`); the summary now reads **"Tu tienda se
     actualizó"** and the chips say **actualizados** (↻), not creados.
7. (Negative) Paste a JSON whose `miyagi_setup_version` is `"99"` → **Revisar**.
   → A clear "versión no soportada" error appears; nothing is staged or created.

If any step fails, note the step number + what you saw — that's the bug report.
