# Shop Settings refactor — Sprint 2: Extract low-risk sections

**Status:** 🧪 BUILT 2026-06-10 — draft [PR #69](https://github.com/danybgoode/miyagisanchezcommerce/pull/69)
on `feat/shop-settings-refactor-s2` (off `main` @ `12d9548`). Risk **LOW**. Deterministic gate green
locally (`tsc` ✅ · `next build` ✅ · Playwright `api` taxonomy 11/11 ✅); CI re-runs vs the preview.
Commits: shared primitives `b0dd1a3` · 7 section routes `e936a9a` · characterization spec `5f3cf41`.
Authed save round-trips owed to Daniel (walkthrough steps 2–4).

> Mechanical, repetitive, assembly-line — the proven S1 pattern applied to the non-money sections.
> One component + one characterization spec per section, each registered in the dynamic-import map.
> Every story is behavior-preserving; risk LOW throughout.
>
> **Route shape (canonical taxonomy from S1):** the 9 sections below map onto **7 slug routes** — the
> taxonomy bundles `diseno = apariencia + tipo` and `envios = comunicacion + envios` (killing the dual
> taxonomy was S1's whole point; `/tipo` and `/comunicacion` are **not** routes). Stories 2.2+2.3 ship
> in the `diseno` component; 2.5+2.6 in the `envios` component.

## Stories

> Each story below is the same shape: *As a seller, I want `<section>` to look and behave exactly as
> before, so that nothing regresses.* **Acceptance (per section):** renders from its own
> `settings/_sections/<Section>.tsx`; a save round-trips identically; only that section's JS loads;
> one characterization spec passes. **Risk:** LOW.

### Story 2.1 — Perfil de tienda ✅ `e936a9a` → `_sections/Perfil.tsx` (slug `perfil`)
Name, description, location. **Acceptance:** as above. *(Logo & banner live in the Apariencia block →
the `diseno` route, matching the monolith's actual section layout.)* Posts only top-level
`{name, description, state, city}`; the route joins city+state into `location` and leaves omitted fields
untouched.

### Story 2.2 — Apariencia / Diseño y marca ✅ `e936a9a` → `_sections/Diseno.tsx` (slug `diseno`)
Logo, banner (`/api/sell/upload`, identical request), accent color, tagline, social links. **Acceptance:**
as above; persists top-level `logo_url` + `settings.theme`.

### Story 2.3 — Tipo de tienda ✅ `e936a9a` → in `_sections/Diseno.tsx` (slug `diseno`)
Store-type preset picker (`PRESETS` sourced from `lib/shop-settings/helpers`). **Acceptance:** as above;
selecting a preset writes `settings.preset` + the checkout/shipping fields it implies (`escrow_mode`/
`show_phone`/`whatsapp_cta`/`local_pickup`) — deep-merge keeps the rest of checkout/shipping intact.

### Story 2.4 — Ofertas / Negociación ✅ `e936a9a` → `_sections/Negociacion.tsx` (slug `negociacion`)
Min buyer trust level + A2A auto-negotiation toggle. **Acceptance:** as above; trust-level enum sourced
from the shared types. Persists `settings.offers`.

### Story 2.5 — Comunicación ✅ `e936a9a` → in `_sections/Envios.tsx` (slug `envios`)
Phone / WhatsApp / email contact channels. **Acceptance:** as above; persists the `settings.checkout`
contact subset + `settings.theme.social.whatsapp` (deep-merge preserves the money fields + rest of social).

### Story 2.6 — Envíos y entrega ✅ `e936a9a` → `_sections/Envios.tsx` (slug `envios`)
Local pickup, origin address, pickup spots, Envia.com. **Most internal state in this group** — reuses the
promoted `PickupSpotManager`; postal lookup (`/api/checkout/postal-lookup`) fires identically.
**Acceptance:** as above + a pickup spot can be added/removed exactly as before. Persists `settings.shipping`.

### Story 2.7 — Citas y reservas ✅ `e936a9a` → `_sections/Citas.tsx` (slug `citas`)
Booking links + Cal.com connect/disconnect. **Acceptance:** as above; `/api/sell/shop/calcom` POST/DELETE
unchanged (separate endpoint, called directly). Scheduling links persist as `settings.scheduling.links`.
*(Cal.com connect kept LOW per Daniel — it's the seller's own API key, no money/buyer-auth path.)*

### Story 2.8 — Gestión de pedidos ✅ `e936a9a` → `_sections/Pedidos.tsx` (slug `pedidos`)
Processing time, auto-confirm window, dispatch window. **Acceptance:** as above; the day-count steppers
persist identically. Persists `settings.orders`.

### Story 2.9 — Notificaciones ✅ `e936a9a` → `_sections/Notificaciones.tsx` (slug `notificaciones`)
The two settings-tree email toggles. **Acceptance:** as above. **No collision:** the section also renders
`<NotificationPreferences />` (the granular #5/#5b prefs) **verbatim** — that island saves to its OWN
API/table; its prefs are NOT routed through `useSettingsSave` nor merged into the settings tree.

## Sprint QA
- **api spec(s):** the shared taxonomy/types spec from S1 grows as keys are added; each section adds a
  `*.browser.spec.ts` rendering its field set (skips without `MS_TEST_*`).
- **browser smoke owed:** yes, to Daniel — the authed **save round-trip** for each section (no money
  path, but seller-session-gated). Envíos pickup-spot add/remove is the one with the most state — smoke
  it explicitly.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Sign in as a test seller. For each of the **7 canonical slug routes** below, open it and confirm it
   renders identically to before and that only that section's JS chunk loads (not the 4k-line monolith):
   - https://miyagisanchez.com/shop/manage/settings/perfil   → name · description · location
   - https://miyagisanchez.com/shop/manage/settings/diseno   → logo · banner · color · social **+ Tipo de tienda** presets
   - https://miyagisanchez.com/shop/manage/settings/negociacion → trust gate + auto-negotiation
   - https://miyagisanchez.com/shop/manage/settings/envios   → **Comunicación** (phone/WhatsApp/email) **+ Envíos** (pickup, origin, carriers)
   - https://miyagisanchez.com/shop/manage/settings/citas    → booking links + Cal.com
   - https://miyagisanchez.com/shop/manage/settings/pedidos  → processing time + dispatch windows
   - https://miyagisanchez.com/shop/manage/settings/notificaciones → email toggles + granular preference center
   → Each renders the same fields, same layout, same copy.
   *(`/tipo` and `/comunicacion` are NOT routes — they 404; their content lives under `/diseno` and
   `/envios` respectively per the canonical taxonomy.)*
2. On **Perfil**, change the description, save, reload. **(authed save — owed to Daniel)**
   → The new description persisted.
3. On **Envíos**, add a pickup spot and save, then remove it and save. **(authed save — owed to Daniel)**
   → The spot is added then removed, persisted both times — identical to before.
4. On **Notificaciones**, toggle an email preference, save, reload. **(authed save — owed to Daniel)**
   → The toggle persisted. Then change a preference in the **granular preference center** below it and
     confirm it saves on its own (separate control) — the two systems don't interfere.
5. On **Diseño**, pick a different store-type preset (e.g. "Con garantía"), save, then open
   `/shop/manage/settings/pagos` (still the monolith) and your **Métodos de pago**. **(authed save — owed to Daniel)**
   → The preset's escrow/pickup/phone summary persisted, **and** your SPEI/bank-transfer/Stripe config is
     intact — the partial save deep-merged into checkout/shipping without clobbering money fields.

If any step fails, note the step number + what you saw — that's the bug report.
