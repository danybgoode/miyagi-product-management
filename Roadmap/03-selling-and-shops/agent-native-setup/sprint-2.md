# Agent-native setup (Onboarding 0) — Sprint 2: First-run onboarding apply

**Status:** ⬜ not started · **Risk:** HIGH (creates a shop + bulk-creates products → **Daniel merges**)

> Goal: the loop's missing home. A freshly signed-up user pastes/uploads ONE setup JSON and lands in a
> populated shop in one pass — without hand-running `/sell` or finding two separate import pages. Pure
> orchestration over the **existing** apply routes; the new code is the entry + create-shop-if-missing
> seam + the sequencing/reporting.

## Stories

### Story 2.1 — First-run apply orchestration (create-shop-if-missing → config → catalog)
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

### Story 2.2 — First-run entry + land-in-shop UX
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
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. In a private window, sign up as a brand-new user at https://miyagisanchez.com/sign-up (**auth path —
   owed to Daniel**).
   → After signup you're offered the "tu agente ya armó tu tienda — pégalo aquí" setup step.
2. Paste the setup JSON saved from the Sprint 1 smoke → review the staging preview.
   → You see N products to create and the config blocks that will apply, with any invalid rows flagged.
3. Click confirm (**money/commerce-adjacent path — owed to Daniel**: creates the shop + bulk products).
   → You land in your new shop; the summary shows shop created + N products + config applied.
4. Open the public storefront for the new shop (`/s/<new-slug>`).
   → The brand/dressing and the imported products render.
5. Re-run step 2–3 with the SAME JSON.
   → No duplicate products (idempotent on `external_id`); the report says "updated", not "created".

If any step fails, note the step number + what you saw — that's the bug report.
