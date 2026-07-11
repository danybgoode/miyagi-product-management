# Onboarding three-doors — Sprint 3: Cobros wizard + share + metrics

**Status:** ✅ built (commits `f67fa77` · `7644cfa` · `4e233de` on
`feat/seller-portal-onboarding-three-doors-s3`) — **HIGH tripwire: Daniel merges**
(touches the MP OAuth redirect glue). Deterministic gate green (`tsc` + `next build`
+ Playwright `api`). Money-path smoke owed to Daniel — see below.

**Design note, decided during build:** the cobros wizard is a NEW, dedicated route
(`/shop/manage/settings/pagos/wizard`), not a takeover of the existing flat
`/shop/manage/settings/pagos` panel — that page (Compra Protegida / Stripe /
Mercado Pago / SPEI) stays completely unchanged for ongoing settings management.
The wizard is purely an onboarding entry point the SuccessCard + setup guide CTAs
now point to. Stripe stays a plain link out of the wizard (its own classic,
unwrapped out-and-back) — only Mercado Pago gets the guided step 2/3 resume-banner
treatment, matching what the acceptance below actually describes.

**Bug found + fixed in scope:** `lib/setup-guide.ts`'s `pagos` completion flag read
`shop.mp_enabled`, a DB column that defaults `true` for every shop (an opt-OUT
flag, not connected-state) — so the dashboard guide's payments step showed done
for every fresh shop, connected or not. Now reads the real
`metadata.settings.mercadopago.connected` state. Regression-guarded in
`e2e/setup-guide.spec.ts`.

**Also found + reconciled:** `SetupGuideCard.tsx`'s `comparte` step already had an
inline one-tap share action (native share sheet / clipboard + marking
`guide.share_done`) from an earlier sprint. The new Comparte page (Story 3.2) is a
strict superset, so that inline handler was retired in favor of a normal link to
the new page, which now marks `share_done` itself.

> Rails: R12 (manual handshakes → mini-wizards) · R6 (before/during/after) · R1 (WhatsApp brand-color exception).
> Spec: ONBOARDING-SPEC S7–S8 + Metrics. **D.7 wraps the EXISTING payments OAuth — see the tripwire.**

## Stories

### Story 3.1 — S7 Cobros mini-wizard (R12) over the existing OAuth ✅
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

**Built as:** none of those four were touched (verified — see commit `f67fa77`). The only OAuth-glue change
is a `mp_return_to` cookie (same pattern as the existing `mp_pkce_verifier` cookie) read by
`app/api/mp/connect/route.ts` (set only when `?redirect_to=wizard` is present) and
`app/api/mp/connect/callback/route.ts` (picks the redirect target). Absent that param, the classic
`Pagos.tsx` "Conectar Mercado Pago" round-trip is byte-identical to before this sprint.

### Story 3.2 — S8 Comparte + agent loop-close ✅
**As a** merchant who's ready to sell, **I want** a share moment and a way to hand the shop to my agent,
**so that** I can get seen and keep it running.
**Acceptance:**
- Share card (logo, nombre, "N productos · ubicación", slug pill); **WhatsApp-first** CTA (provider green —
  R1 brand exception) + Copiar enlace + "Para tu historia" (IG story-ready image). Agent loop-close
  (`ConnectAgentPanel`): "¿Sigues tú o sigue tu agente? Conéctalo… tú apruebas los cambios."
**Risk:** low — presentational; the WhatsApp/share deep-links carry no money path.

**Built at:** new route `/shop/manage/comparte` (commit `7644cfa`).

### Story 3.3 — Metrics, day one ✅
**As a** product owner, **I want** the onboarding funnel instrumented from launch, **so that** we can see
where merchants drop and whether they reach payable.
**Acceptance:**
- These events fire and are visible in metrics: `door_share`, `time_to_first_product`, `time_to_payable`,
  guide step events, `S4 approve rate` + edits-per-approval, `S7 OAuth return rate`, `first share tap`.
**Risk:** low.

**Built as:** all 7 named events fire via the already-live `pushAnalyticsEvent` (GTM `dataLayer`) helper —
`door_share`, `time_to_first_product`/`time_to_payable` (new `lib/onboarding-timing.ts`, marked at Bienvenida),
`setup_staging_shown`/`setup_staging_approved` (with an `edits` count) for the S4 rate,
`cobros_wizard_oauth_return` for the S7 rate, and `first_share_tap`. `guide_view`/`guide_step_open`/
`guide_step_complete`/`guide_dismiss` were already instrumented by a prior sprint — no new work needed there
(commit `4e233de`).

## Sprint QA ✅
- **api spec(s) — built:** `e2e/onboarding-cobros-wizard.spec.ts` — pure-logic coverage of
  `resolveCobrosWizardStep` (all 5 branches: connected, error w/ + w/o reason, returning-connected, fresh) and
  `buildWhatsAppShareLink` (encoding + round-trip). Matches the api project's no-browser discipline (same shape
  as `e2e/onboarding-three-doors.spec.ts`) — the wizard's actual rendered step/banner is driven by this
  resolver, so its branches are what would otherwise need a browser to assert. `e2e/setup-guide.spec.ts` updated
  + extended with a regression guard for the `mp_enabled` bug fix. No dedicated "events fire" spec was added:
  `pushAnalyticsEvent` no-ops without `window` (confirmed against `lib/analytics-events.ts`), so there's no
  established `api`-project pattern for asserting individual call sites — same reason
  `e2e/site-analytics-loader.spec.ts` only tests the pure gating logic, not event firing itself.
- **browser smoke owed — to Daniel, by name (money/auth):** the **S7 cobros OAuth connect round-trip** (real
  MP authorize → return → resume banner → payable) and the full first-run on a disposable shop (intake →
  agent door → CSV → approve staging → SuccessCard → connect cobros → share). An automated browser smoke
  can't fully cover the real MP authorize.
- **deterministic gate — green:** `tsc --noEmit` + `npm run build` + Playwright `api` (2010 passed; the 6
  failures seen locally — `launchpad-*`, `not-found-shape` — are pre-existing/environment-dependent, confirmed
  present on `origin/main` before this sprint's changes via `git stash`).

## Sprint 3 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production https://miyagisanchez.com after deploy

1. From the SuccessCard (or the S6 guide step 3), click "Activar cobros ahora" / "Configurar cobros".
   → The **cobros mini-wizard** opens: breadcrumb Configuración / Cobros, step dots 1-2-3, Step 1 with the
   Mercado Pago info box "Te llevaremos a Mercado Pago…".
2. **(money/auth — owed to Daniel)** Click connect Mercado Pago, authorize on MP, come back.
   → You return to **Step 2** with a resume banner "Mercado Pago conectado ✓" (not the bare pagos page).
3. Reach Step 3 ¡Listo!
   → Two exits ("Volver a mi Resumen" / "Probar un pago de $10"); the Resumen guide's payments step is checked.
4. Open S8 Comparte — via the setup guide's "Compartir tienda" step, or directly at `/shop/manage/comparte`.
   → Share card with the shop, a **WhatsApp-first** button (green), Copiar enlace, and the story image; the
   agent loop-close card offers to connect your agent.
5. Check metrics for a run.
   → `door_share`, `time_to_payable`, `S4 approve rate`, `S7 OAuth return rate`, `first share tap` recorded.

If any step fails, note the step number + what you saw — that's the bug report.
