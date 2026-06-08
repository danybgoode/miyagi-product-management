# Shop Settings refactor — Sprint 2: Extract low-risk sections

**Status:** ⬜ not started

> Mechanical, repetitive, assembly-line — the proven S1 pattern applied to the 9 non-money sections.
> One component + one characterization spec per section, each registered in the dynamic-import map.
> Every story is behavior-preserving; risk LOW throughout.

## Stories

> Each story below is the same shape: *As a seller, I want `<section>` to look and behave exactly as
> before, so that nothing regresses.* **Acceptance (per section):** renders from its own
> `settings/_sections/<Section>.tsx`; a save round-trips identically; only that section's JS loads;
> one characterization spec passes. **Risk:** LOW.

### Story 2.1 — Perfil de tienda
Name, description, location, logo & banner. **Acceptance:** as above + logo/banner upload
(`/api/sell/upload`) fires the identical request.

### Story 2.2 — Apariencia / Diseño y marca
Accent color, tagline, social links, theme presets. **Acceptance:** as above; `PRESETS` now sourced
from `lib/shop-settings/`.

### Story 2.3 — Tipo de tienda
Store-type selection. **Acceptance:** as above.

### Story 2.4 — Ofertas / Negociación
Min buyer trust level + A2A auto-negotiation toggle. **Acceptance:** as above; trust-level enum sourced
from the shared types.

### Story 2.5 — Comunicación
Communication preferences. **Acceptance:** as above.

### Story 2.6 — Envíos y entrega
Local pickup, origin address, pickup spots, Envia.com. **Most internal state in this group** — reuse the
already-extracted `PickupSpotManager`; postal lookup (`/api/checkout/postal-lookup`) fires identically.
**Acceptance:** as above + a pickup spot can be added/removed exactly as before.

### Story 2.7 — Citas y reservas
Cal.com connect/disconnect. **Acceptance:** as above; `/api/sell/shop/calcom` GET/POST/DELETE unchanged.
*(Cal.com connect is an external handshake but not money/auth-critical — kept LOW; if the connect flow
feels risky on read, escalate that one story to S3.)*

### Story 2.8 — Gestión de pedidos
Processing time, auto-confirm window, dispatch window. **Acceptance:** as above; the day-count sliders
persist identically.

### Story 2.9 — Notificaciones
Per-event email/notification toggles. **Acceptance:** as above (this writes the notifications prefs in
the settings tree — confirm it does **not** collide with the granular-notifications dispatch prefs;
behavior must be unchanged).

## Sprint QA
- **api spec(s):** the shared taxonomy/types spec from S1 grows as keys are added; each section adds a
  `*.browser.spec.ts` rendering its field set (skips without `MS_TEST_*`).
- **browser smoke owed:** yes, to Daniel — the authed **save round-trip** for each section (no money
  path, but seller-session-gated). Envíos pickup-spot add/remove is the one with the most state — smoke
  it explicitly.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Sign in as a test seller. For each section URL below, open it and confirm it renders identically to
   before and that only that section's JS chunk loads:
   - https://miyagisanchez.com/shop/manage/settings/perfil
   - https://miyagisanchez.com/shop/manage/settings/diseno
   - https://miyagisanchez.com/shop/manage/settings/tipo
   - https://miyagisanchez.com/shop/manage/settings/negociacion
   - https://miyagisanchez.com/shop/manage/settings/envios
   - https://miyagisanchez.com/shop/manage/settings/citas
   - https://miyagisanchez.com/shop/manage/settings/pedidos
   - https://miyagisanchez.com/shop/manage/settings/notificaciones
   → Each renders the same fields, same layout, same copy.
2. On **Perfil**, change the description, save, reload. **(authed save — owed to Daniel)**
   → The new description persisted.
3. On **Envíos**, add a pickup spot and save, then remove it and save. **(authed save — owed to Daniel)**
   → The spot is added then removed, persisted both times — identical to before.
4. On **Notificaciones**, toggle an email preference, save, reload. **(authed save — owed to Daniel)**
   → The toggle persisted; no change to which emails actually send.

If any step fails, note the step number + what you saw — that's the bug report.
