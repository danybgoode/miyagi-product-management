# Onboarding three-doors — Sprint 1: Intake store + three-doors entry

**Status:** ⬜ not started

> Rails: R13 (seller shell / nav parity) · R11 (ready-not-blank). Spec: ONBOARDING-SPEC S1–S3.
> Build on P0·A `<Card>`/`<Button>`. Behind `onboarding.three_doors_enabled` (dark) if taken at kickoff.

## Stories

### Story 1.1 — `tenant_intake` store + S1 Bienvenida intake
**As a** new merchant (post-signup), **I want** a short optional welcome that asks what I sell and where I
sell today, **so that** the rest of setup is prepared to my case instead of a blank form.
**Acceptance:**
- After signup I land on **S1 Bienvenida in the seller shell** (no buyer chrome): H1 "Hola, {nombre}. Tu
  tienda está a unos minutos.", two optional multi-select chip questions (Q1 ¿Qué vendes? · Q2 ¿Dónde vendes
  hoy?), "Continuar" + a ghost "Prefiero explorar por mi cuenta" that goes to S6 at step 1.
- My answers persist to `tenant_intake` (Supabase) and survive a reload.
**Risk:** low — additive non-commerce Supabase table (Rule 2), fail-safe absent.

### Story 1.2 — S2 Tres puertas (agent door first)
**As a** new merchant, **I want** three clear, ranked ways to build my store with the agent door first and a
trust line, **so that** I pick a path confidently and know nothing publishes without my approval.
**Acceptance:**
- S2 reads `tenant_intake` and shows a personalized subtitle + **door order** (e.g. an ML seller sees "podemos
  traer tu catálogo casi solo").
- **Door 1 (recommended)** is visually first (agent tokens, 2px border): "~5 min · tú solo revisas y
  apruebas", body ends "Nada se publica sin tu visto bueno." → S3.
- **Door 2** → existing ImportClient; **Door 3** → existing SellWizard. Footer: "Puedes cambiar de camino
  cuando quieras — nada se pierde."
**Risk:** low — presentational routing; consumes P1·C's `isSellerModePath` (don't re-extend it here).

### Story 1.3 — S3 drop-anything intake
**As a** merchant on the agent door, **I want** to hand over my info however I have it, **so that** I don't
have to start from a blank paste box.
**Acceptance:**
- A dashed dropzone accepts CSV / JSON / photos / screenshots; a "Traer de Mercado Libre" row shows when ML
  is connected ("sincroniza N anuncios"); a row copies the prompt kit (`lib/setup-spec.ts`) in one tap;
  paste-JSON exists **only as the advanced affordance** inside the dropzone.
- CSV and JSON proceed **synchronously** to S4; **photos/screenshots queue an agent job** and show the
  background-safe progress ("te avisamos aquí y por correo"). Footer: "Nada se crea todavía — primero te
  mostramos el borrador completo."
**Risk:** low (intake UI). *If the photo→spec agent-job seam isn't a thin reuse of an existing job queue,
split the photo branch to its own story/spike — verify by reading the setup-spec/agent-job code first.*

## Sprint QA
- **api spec(s):** 1.1 → pure-logic spec on intake→personalization mapping (door order, S2 subtitle, guide
  steps) + api spec on the `tenant_intake` write; 1.2 → `e2e/seller-mode.spec.ts` doors render in personalized
  order + route correctly (R13 shell/nav parity); 1.3 → api spec on the CSV→spec path.
- **browser smoke owed:** no (client-island door render/routing testable anonymously); the ML-connected row
  needs a connected shop — state as a gap if no test account.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production https://miyagisanchez.com after deploy

1. Sign up as a brand-new seller (or open the first-run entry on a fresh test shop with the flag on).
   → You land on **S1 Bienvenida** in the seller shell (dark seller top bar, no search/cart), H1 "Hola, …".
2. Pick a couple of chips in Q1/Q2, click "Continuar".
   → You reach **S2 Tres puertas** with the **agent door first** and a personalized subtitle.
3. Reload S2.
   → Your intake answers persisted (subtitle/order unchanged) — proves the `tenant_intake` write.
4. Click Door 1 "Empezar con mi agente".
   → **S3 drop-anything** opens: a dashed dropzone, the prompt-kit copy row, and paste-JSON tucked as the
   advanced option (not the first thing shown).
5. Drop a small CSV.
   → It proceeds toward the S4 staging preview (Sprint 2). A photo instead queues an agent job with the
   "te avisamos" progress.

If any step fails, note the step number + what you saw — that's the bug report.
