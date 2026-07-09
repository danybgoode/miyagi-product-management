# Onboarding three-doors — Sprint 3: Cobros wizard + share + metrics

**Status:** ⬜ not started

> Rails: R12 (manual handshakes → mini-wizards) · R6 (before/during/after) · R1 (WhatsApp brand-color exception).
> Spec: ONBOARDING-SPEC S7–S8 + Metrics. **D.7 wraps the EXISTING payments OAuth — see the tripwire.**

## Stories

### Story 3.1 — S7 Cobros mini-wizard (R12) over the existing OAuth
**As a** merchant activating payments, **I want** a short guided wizard that tells me what will happen and
brings me back where I left off, **so that** connecting a payout account isn't a scary manual detour.
**Acceptance:**
- `settings/pagos` wrapped in a wizard shell: breadcrumb Configuración / Cobros, step dots 1-2-3.
- Step 1 "Elige cómo te pagan" (Mercado Pago recommended) with an **R6-before** info box: "Te llevaremos a
  Mercado Pago para autorizar. Al terminar regresas aquí solito, con todo guardado." Step 2 = the **existing**
  OAuth out-and-back; on return a resume banner "Mercado Pago conectado ✓". Step 3 ¡Listo! with two exits
  ("Volver a mi Resumen" / "Probar un pago de $10") and the S6 guide auto-advances.
- The OAuth token exchange, storage (`marketplace_shops.metadata.settings.mercadopago`), and Medusa seller
  sync are **unchanged**; the only route touch is pointing the callback's post-return redirect at the wizard step.
**Risk:** low (presentational wrapper). **TRIPWIRE → HIGH → Daniel merges** if the story ends up editing
`lib/mercadopago-connect.ts` token exchange/storage, `mpSettingsFromToken`, the callback token logic, or
`syncMedusaSellerProfile`. Escalate rather than guess (money/auth).

### Story 3.2 — S8 Comparte + agent loop-close
**As a** merchant who's ready to sell, **I want** a share moment and a way to hand the shop to my agent,
**so that** I can get seen and keep it running.
**Acceptance:**
- Share card (logo, nombre, "N productos · ubicación", slug pill); **WhatsApp-first** CTA (provider green —
  R1 brand exception) + Copiar enlace + "Para tu historia" (IG story-ready image). Agent loop-close
  (`ConnectAgentPanel`): "¿Sigues tú o sigue tu agente? Conéctalo… tú apruebas los cambios."
**Risk:** low — presentational; the WhatsApp/share deep-links carry no money path.

### Story 3.3 — Metrics, day one
**As a** product owner, **I want** the onboarding funnel instrumented from launch, **so that** we can see
where merchants drop and whether they reach payable.
**Acceptance:**
- These events fire and are visible in metrics: `door_share`, `time_to_first_product`, `time_to_payable`,
  guide step events, `S4 approve rate` + edits-per-approval, `S7 OAuth return rate`, `first share tap`.
**Risk:** low.

## Sprint QA
- **api spec(s):** 3.1 → e2e: wizard shell + step dots + R6-before info box + resume banner render (the OAuth
  connect itself is **owed to Daniel**); 3.2 → e2e: share affordances render + WhatsApp deep-link built
  correctly; 3.3 → assert the events fire (spec or instrumentation check).
- **browser smoke owed — to Daniel, by name (money/auth):** the **S7 cobros OAuth connect round-trip** (real
  MP authorize → return → resume banner → payable) and the full first-run on a disposable shop (intake →
  agent door → CSV → approve staging → SuccessCard → connect cobros → share). An automated browser smoke
  can't fully cover the real MP authorize.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production https://miyagisanchez.com after deploy

1. From the SuccessCard (or the S6 guide step 3), click "Activar cobros ahora" / "Configurar cobros".
   → The **cobros mini-wizard** opens: breadcrumb Configuración / Cobros, step dots 1-2-3, Step 1 with the
   Mercado Pago info box "Te llevaremos a Mercado Pago…".
2. **(money/auth — owed to Daniel)** Click connect Mercado Pago, authorize on MP, come back.
   → You return to **Step 2** with a resume banner "Mercado Pago conectado ✓" (not the bare pagos page).
3. Reach Step 3 ¡Listo!
   → Two exits ("Volver a mi Resumen" / "Probar un pago de $10"); the Resumen guide's payments step is checked.
4. Open S8 Comparte.
   → Share card with the shop, a **WhatsApp-first** button (green), Copiar enlace, and the story image; the
   agent loop-close card offers to connect your agent.
5. Check metrics for a run.
   → `door_share`, `time_to_payable`, `S4 approve rate`, `S7 OAuth return rate`, `first share tap` recorded.

If any step fails, note the step number + what you saw — that's the bug report.
