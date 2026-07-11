# Onboarding three-doors — Sprint 2: Staging preview + shared SuccessCard

**Status:** ✅ merged — [PR #227](https://github.com/danybgoode/miyagisanchezcommerce/pull/227)
(squash `57b6831`). Both review layers ran and were clean: cross-agent (codex)
advisory found 1 blocking-shaped claim (verified false — no such gate exists
in the code) + 2 real should-fix items (fixed pre-merge: a CI design-token
violation in the new inline-fix cells, and inaccurate "se queda como
borrador" copy — a failed row is skipped, never saved as a draft); the
independent `pr-reviewer` pass approved, confirming the apply engine was
never touched and flagging one LOW-severity non-blocking follow-up (`SetupReport`'s
payments nudge is unconditional on an idempotent re-apply — already a
documented trade-off, not fixed this sprint). CI green (`tsc`+`build`+Playwright
`api` vs the PR's Vercel preview). **Live money-path/browser smokes still owed
to Daniel** (see walkthrough below).

> Rails: R11 (approve-before-apply is THE pattern) · R9 (one way to say "done"). Spec: ONBOARDING-SPEC S4–S6.
> Reuses SetupClient `stageProducts`/`configBlocks`/`aggregateSetupReport` apply path unchanged.

## As-built notes
- **Apply engine untouched, verified.** `planSetupApply`, `aggregateSetupReport`, `validateSetup`, `validateRows`
  keep their exact signatures and bodies. S4's inline-fix patches a local `editCatalogRows`/`profileOverrides`
  copy that's merged into the file object only at `runApply()` call time — the same principle
  `ImportClient.tsx` already used for its own edit-then-submit flow.
- **Known gap, not silently dropped:** no email- or background-completion mechanism exists in this codebase
  yet (`lib/email.ts` has no "setup complete" sender, and `SetupClient`'s apply loop is a synchronous
  client-side fetch with no server-side resume). `SuccessCardProgress`'s during-apply caption uses a safe
  default ("Esto puede tardar unos segundos…") instead of the spec's literal "te avisamos aquí y por correo"
  promise. Follow-up, not blocking.
- **F12 browser spec still not live-verified — and there's a real CI wiring gap, not just missing
  secrets.** `e2e/onboarding-success-card.browser.spec.ts` was run locally (`npx playwright test
  --project=browser`) and confirmed to skip gracefully (3/3 skipped, zero errors), same as the
  established convention. But the repo's own `.github/workflows/browser-smoke.yml` — the only place
  `MS_TEST_SELLER_EMAIL`/`PASSWORD` exist as provisioned repo secrets — never sets `MS_TEST_BROWSER_AUTH=1`
  in its env block, and it targets **production** by default (`base_url: https://miyagisanchez.com`),
  where ticket-based Clerk sign-in is rejected by design (dev-Clerk-only, per `_helpers/auth.ts`). So
  today there is **no path, local or CI, where any credentialed browser spec in this repo actually runs
  live** — not specific to this PR. Flagging as a cross-epic follow-up, not something to fix inside this
  sprint.
- **SellWizard's `StepSuccess` per-listing photo/price preview was dropped** in favor of the identical
  `SuccessCard` layout (F12's explicit trade-off — same layout beats a richer one-off preview here).

## Stories

### Story 2.1 — S4 Revisa y aprueba (staging preview over SetupClient) ✅ squash `57b6831`
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

### Story 2.2 — S5 `<SuccessCard>` (R9) + F12 convergence ✅ squash `57b6831`
**As a** merchant finishing any setup path, **I want** one consistent "done" screen, **so that** I always
know what happened, can see it live, and know the next step.
**Acceptance:**
- A shared `<SuccessCard>`: what happened (object + counts) → **see it live ↗** → **≤2 next actions**
  (guide-aware) → **share (WhatsApp first)**. Plus the S5 during-progress card (spinner + "n de N" +
  "puedes salir — te avisamos aquí y por correo", background-safe).
- **SellWizard step 3, SetupClient report, and ImportClient report all render this one card** (F12) — same
  layout, same next-step logic, same share affordance from all three entry points.
**Risk:** low — presentational convergence; no commerce mutation.

### Story 2.3 — S6 personalization over `lib/setup-guide.ts` (P0·B seam) ✅ squash `57b6831`
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

## Sprint 2 — Smoke walkthrough (owed to Daniel, do these in order)
Env: production https://miyagisanchez.com, once Cloud Build finishes deploying `57b6831`. Requires
`onboarding.three_doors_enabled` ON and a brand-new signed-in account with no shop yet (or use the
existing `/sell/setup`, `/shop/manage/import`, `/sell` entries directly to reach S4/F12/S6 without the
three-doors flag).

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
