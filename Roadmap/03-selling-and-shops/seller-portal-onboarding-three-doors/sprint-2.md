# Onboarding three-doors — Sprint 2: Staging preview + shared SuccessCard

**Status:** ⬜ not started

> Rails: R11 (approve-before-apply is THE pattern) · R9 (one way to say "done"). Spec: ONBOARDING-SPEC S4–S6.
> Reuses SetupClient `stageProducts`/`configBlocks`/`aggregateSetupReport` apply path unchanged.

## Stories

### Story 2.1 — S4 Revisa y aprueba (staging preview over SetupClient)
**As a** merchant who handed over my info, **I want** to see my whole store as a draft I can edit before
anything is created, **so that** I approve reality instead of hoping the import got it right.
**Acceptance:**
- S4 restyles the existing `stageProducts`/`configBlocks` staging into the spec cards: **Tu tienda** (logo/
  nombre/slug/ubicación, inline Editar); **Catálogo** with a header chip "N listos · M por corregir" and
  per-row Listo/Corregir pills — Corregir rows show a warning-soft reason ("Falta el precio — tócalo…") with
  inline fix; **config chips** ✓ Diseño · ✓ Envíos · neutral "Cobros — después, ~4 min".
- CTA "Crear mi tienda con N productos" + footnote "El que falta por corregir se queda como borrador…".
- Approving runs the **existing** apply path into Medusa; partial success is handled as a plan (drafts), not
  an error.
**Risk:** low–med — reuses the **already-shipped** SetupClient commerce-write apply (not a money/fulfillment
path). *Do not modify the apply/token paths; if a change to the apply engine becomes necessary, escalate.*

### Story 2.2 — S5 `<SuccessCard>` (R9) + F12 convergence
**As a** merchant finishing any setup path, **I want** one consistent "done" screen, **so that** I always
know what happened, can see it live, and know the next step.
**Acceptance:**
- A shared `<SuccessCard>`: what happened (object + counts) → **see it live ↗** → **≤2 next actions**
  (guide-aware) → **share (WhatsApp first)**. Plus the S5 during-progress card (spinner + "n de N" +
  "puedes salir — te avisamos aquí y por correo", background-safe).
- **SellWizard step 3, SetupClient report, and ImportClient report all render this one card** (F12) — same
  layout, same next-step logic, same share affordance from all three entry points.
**Risk:** low — presentational convergence; no commerce mutation.

### Story 2.3 — S6 personalization over `lib/setup-guide.ts` (P0·B seam)
**As a** merchant landing on Resumen after setup, **I want** the guide ordered to my case, **so that** the
next step is the one that matters for me.
**Acceptance:**
- S6 reads `tenant_intake` to personalize step order/skips on the **P0·B** guide card (the piece P0·B
  deliberately deferred to P1·D); the doors' success screens land on S6 with the guide advanced.
- With no intake (ghost path), the default P0·B 5-step order still renders (fail-safe).
**Risk:** low — read over existing seams + non-commerce intake.

## Sprint QA
- **api spec(s):** 2.1 → pure-logic spec on intake-file→spec conversion (CSV/JSON → staged rows) + e2e:
  Corregir rows show reason + inline fix, approve → apply; 2.2 → **browser** spec: the SuccessCard renders
  identically from all three endings + api spec on the counts; 2.3 → pure-logic spec on personalized-step
  resolution (with/without intake).
- **browser smoke owed:** the SuccessCard convergence is a browser spec (rendered UI an API can't see); the
  full approve→create round-trip on a **disposable** shop is owed to Daniel (it writes real products).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production https://miyagisanchez.com after deploy

1. From Sprint 1's S3, drop a CSV of a few products and continue.
   → **S4 Revisa y aprueba** shows Tu tienda + Catálogo cards with a "N listos · M por corregir" chip.
2. Find a Corregir row (e.g. missing price), tap it, add the price inline.
   → The row flips to Listo and the chip counts update.
3. Click "Crear mi tienda con N productos" **(on a disposable test shop — this writes real products).**
   → Progress card appears ("Creando tu catálogo… n de N"), then the **`<SuccessCard>`**: counts, "Ver mi
   tienda pública ↗", ≤2 next actions, and a WhatsApp-first share.
4. Now finish a listing via the manual **SellWizard** path, and separately via **ImportClient**.
   → Both end on the **same** `<SuccessCard>` layout (F12 convergence) — not three different screens.
5. Go to `/shop/manage` (Resumen).
   → The setup guide is ordered to your intake, with the just-done steps checked.

If any step fails, note the step number + what you saw — that's the bug report.
