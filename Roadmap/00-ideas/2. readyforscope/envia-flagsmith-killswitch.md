# Envía — platform Flagsmith kill-switch (disable/enable Envía without a deploy)

**Status: awaiting Daniel approval — no code yet.**
Source: Daniel's ask (2026-06-25) — "wrap the Envía feature in a Flagsmith flag so I can disable/enable it"
while the platform Envía account is **unfunded**, plus a request to **evaluate BYO Envía accounts** and
recommend sequencing. Grooming decisions (2026-06-25, confirmed by Daniel): **flag now, BYO as a separate
spike** · fail-open **default OFF (enablement polarity)** · kill-switch governs **quoting + label generation +
a seller-settings banner**.

**Proposed domain: [04 · Shipping & Delivery](../../04-shipping-and-delivery/README.md)** (it's a shipping
capability), **reusing the shipped Flagsmith flag layer from [09 · feature-flags-killswitches](../../09-platform-infra/feature-flags-killswitches/README.md)**.

---

## Stage-2.5 bucket — **light enhancement**, not genuinely new
The flag *infrastructure already exists and shipped.* `lib/flags.ts` lives in **both** apps
(`apps/miyagisanchez/lib/flags.ts` + `apps/backend/src/lib/flags.ts`), backed by Flagsmith SaaS
(project `miyagisanchezmarketplace`), fail-open, local in-process evaluation (~0 ms/request, 60 s refresh),
2 s timeout / no retries on the checkout path. Adding an Envía kill-switch is **one new `FlagKey` + default,
then gating the existing seams** — not a new feature.

Better still: **`shipping.envia_enabled` is already a named flag in the Flagsmith spike's kill-switch
taxonomy** (`Roadmap/00-ideas/seeds/spike-flagsmith.md` §3: *"Drop to arranged-delivery if Envía is down"*).
It was anticipated; it was simply never wired. This epic wires it.

> **Polarity note (Daniel, 2026-06-25):** the spike listed it as a *kill-switch* (default ON). For the current
> lifecycle — account unfunded for an extended period — we ship it as **enablement (default OFF)** instead, so
> a Flagsmith outage keeps Envía **off** (falls back to arranged delivery) rather than driving buyers into an
> unfunded carrier. Daniel flips it **ON in the dashboard once the account is funded.** Mirrors the existing
> `domain.paywall_enabled` enablement pattern in `lib/flags.ts`.

## What already exists (reuse, don't rebuild) — verified 2026-06-25
| Capability | Where | Reuse for |
|---|---|---|
| Flag layer (FE + BE), fail-open, local eval | `apps/miyagisanchez/lib/flags.ts`, `apps/backend/src/lib/flags.ts` | Add one `FlagKey` + default; call `isEnabled('shipping.envia_enabled')` |
| Enablement-polarity precedent (default OFF) | `domain.paywall_enabled` in `lib/flags.ts` | Copy the polarity + fail-open semantics |
| Kill-switch *application* pattern (pure, unit-tested) | `lib/checkout-killswitch.ts` (`applyPaymentKillSwitches`) | Mirror with a pure `enviaKillGate` decision seam for free coverage |
| Quote seam (already degrades gracefully) | backend `POST /store/envia/rates` → returns *"coordina la entrega directamente con el vendedor"* on any failure | Short-circuit **before** the Envía call when flag off |
| FE quote proxy (thin) | `apps/miyagisanchez/app/api/checkout/shipping-rates/route.ts` | No change — it proxies the gated backend route |
| Label seam + manual fallback | backend ship route + `apps/backend/src/modules/fulfillment-envia/` (provider) + existing **manual-carrier** path & "can't ship before payment" 422 gate | Block the Envía label path when off; steer to manual carrier (already built) |
| Per-seller Envía toggle | `settings.shipping.envia_enabled` (`Envios.tsx`) | The new flag is a **platform master switch that overrides** this (global off wins) |
| Seller settings UI | `app/(shell)/shop/manage/settings/_sections/Envios.tsx` | Add a platform-off banner; server-evaluate the flag and pass down |

> **LEARNINGS gotcha applied (`LEARNINGS.md` ~L737):** a past plan named `lib/envia.ts quoteShipments` as
> the seam to gate, but tracing importers showed the real awaited path was the **proxy fetch**, so the fix
> would have been a no-op. **S1.1 starts by tracing every importer of the Envía client** and gating the seam
> the buyer/seller actually awaits — not the first file named.

## Why
**As** the platform admin, **I want** to turn the Envía shipping integration off (and back on) from the
Flagsmith dashboard with **no deploy**, **so that** while the platform Envía account is unfunded the checkout
cleanly falls back to arranged delivery / manual carrier instead of surfacing carrier errors — and I can flip
it back on the moment the account is funded.

## Stories (proposed — one sprint, backend-first)

### S1.1 — (BE) Add the `shipping.envia_enabled` flag + gate the quote seam  *(the spine — deploy first)*
**As** the admin, **I want** live-rate quoting to stop calling Envía when the flag is off, **so that**
checkout falls back to arranged delivery without hitting an unfunded carrier.
- Add `FlagKey 'shipping.envia_enabled'` + `DEFAULT_FLAGS['shipping.envia_enabled'] = false` to **both**
  `lib/flags.ts` files (enablement polarity, default OFF — documented inline like `domain.paywall_enabled`).
- **Trace importers first** (LEARNINGS gotcha). Gate `POST /store/envia/rates`: when off, short-circuit
  **before** the Envía call to the existing graceful response (`{ rates: [], message: 'coordina la entrega
  directamente…' }`). Extract the decision into a pure `enviaKillGate` seam for unit coverage.
- **Acceptance (Daniel-testable):** with the flag OFF in Flagsmith → a buyer at checkout sees the
  arranged-delivery fallback message and **no** Envía call is made; flip ON → live carrier rates return as
  today. With **no** `FLAGSMITH_ENVIRONMENT_KEY` configured (local/preview), Envía is OFF (fail-open default).
- **QA:** pure-logic spec on `enviaKillGate` (off→fallback, on→passthrough) + an api spec on the rates route.
  **Risk: HIGH** (checkout/shipping money path; backend Cloud Run deploy; Daniel-merge).
- ⚠️ **Behavior-change note:** default OFF flips current prod behavior — **Production needs a server-side
  Flagsmith key with the flag set ON to preserve today's live-rate behavior** until the account is unfunded
  (here, intentionally left OFF). Any e2e that exercises live rates must force the flag on.

### S1.2 — (BE) Gate label generation / shipping → manual-carrier fallback
**As** a seller fulfilling an order while Envía is off, **I want** the Envía label path disabled and manual
carrier offered, **so that** I can still ship without an automatic label.
- When `shipping.envia_enabled` is off, the ship route's **Envía label branch** rejects with a clear 422
  (es-MX: *"El envío automático con Envía no está disponible por ahora. Usa paquetería manual."*) and the UI
  steers to the **existing manual-carrier** path. No change to the manual path itself.
- **Acceptance:** with the flag OFF, the seller ship screen offers only manual carrier; calling the Envía
  label route directly returns 422 (agents/stale pages can't bypass it). Flag ON → label generation works.
- **QA:** api spec on the ship route's gated branch. **Risk: HIGH** (fulfillment money path; Daniel-merge).

### S1.3 — (FE) Seller-settings platform-off banner
**As** a seller, **I want** to see that automatic Envía shipping is temporarily unavailable platform-wide,
**so that** I'm not confused when my per-shop toggle has no effect.
- In `Envios.tsx`, **server-evaluate** `shipping.envia_enabled` and pass it down; when off, show a banner
  (es-MX) that automatic Envía shipping is paused platform-wide and the per-shop "tarifas en vivo" toggle is
  superseded for now. The per-seller `settings.shipping.envia_enabled` value is preserved (not overwritten).
- **Acceptance:** with the flag OFF, the Envíos section shows the banner; the per-shop live-rate toggle
  reflects platform-off; flipping the flag ON removes the banner and restores normal behavior.
- **QA:** copy-completeness (es-MX) + a visual smoke owed to Daniel. **Risk: LOW** (non-commerce UI, additive).

## In / out of scope
**In v1:** one new `shipping.envia_enabled` flag (default OFF) in both apps · gate the **quote** seam · gate the
**label** seam (manual-carrier fallback) · seller-settings **banner** · platform flag **overrides** the
per-seller toggle.

**Out (deferred):**
- **BYO Envía accounts** — its own spike (see below). Not built or scoped here.
- Migrating the per-seller `settings.shipping.envia_enabled` toggle into Flagsmith (it stays a seller setting).
- Any new carrier, tracking-timeline, or rate-logic change (unrelated backlog).
- Per-shop / per-segment Flagsmith targeting (v1 flags are environment-level, admin-only — per the spike).

## Medusa-first note (AGENTS rules)
Commerce/fulfillment stays in Medusa (rule #1): the gate sits on the **existing** Medusa Envía routes/provider;
no new commerce data. No Supabase tables (rule #2) — the flag is environment-level in Flagsmith. Agent parity
(rule #3): the **backend** gate is the real enforcement, so UCP/MCP checkout + agent ship calls inherit the
kill automatically (the FE banner is cosmetic). Clerk untouched (#4). New copy es-MX (#5). **Backend-first**
deploy (S1.1 → S1.2 → S1.3); the flag read is fail-open so the ~12-min Cloud Run window is safe.

## Risk & ship
- **Epic risk: HIGH** (touches the checkout/shipping money path). **Daniel-merge.** Deploy order
  **S1.1 → S1.2 → S1.3.**
- **Owed to Daniel (money/auth smoke):** with the flag OFF in Flagsmith — checkout a physical item → see the
  arranged-delivery fallback (no carrier rates) → as the seller, ship via manual carrier (no Envía label) →
  Envíos settings shows the banner. Then flip the flag **ON** → live rates + label generation work again. An
  automated smoke can't fully cover the live money/ship path.
- **Research cited (2026-06-25):** Envía auth is a per-account **Bearer API token** generated at
  `shipping.envia.com/settings/developers` (Developer → API Keys), per-environment (sandbox vs production).
  Confirms the current single-platform-key model — and that BYO (per-seller tokens) is feasible (below).
  Source: <https://docs.envia.com/docs/authentication>.

## Definition of Ready check
- [x] "As a / I want / so that" + Daniel-testable acceptance per story.
- [x] Stage-2.5 bucket named (**light enhancement** — the flag layer already exists; one key + gated seams).
- [x] v1 in/out boundary written; BYO + per-seller-toggle migration explicitly out.
- [x] Reuse list produced (Medusa-first reframe done — no new tables; reuse the flag layer + graceful fallbacks).
- [x] Each story risk-tiered (epic HIGH, Daniel-merge); QA stage named (pure `enviaKillGate` spec + api specs + owed smoke).
- [x] Smoke owner: **Daniel** (live checkout/ship money path).
- [ ] **Daniel approves this scope doc** → then scaffold `04-shipping-and-delivery/envia-killswitch/` (epic + sprint-1), commit path-scoped, emit the kickoff.

---

# Appendix — BYO Envía accounts (evaluation + recommended spike)

**Decision (2026-06-25): flag first, BYO as its own spike.** Recommended: scaffold a spike seed
`Roadmap/00-ideas/seeds/spike-envia-byo.md` on approval — **do not build BYO in this epic.**

## Is BYO feasible? — **Yes** (validated against Envía docs, 2026-06-25)
Each Envía user signs up (`accounts.envia.com/signup`) and generates **their own Bearer API token** under
Developer → API Keys; Envía publishes a dedicated **"Marketplace Multi-Seller Shipping"** use case. So BYO =
each seller funds their **own** Envía account and pastes their API token into shop settings; the platform
stores it (encrypted, per-seller) and routes **that seller's** quotes/labels through **their** token. The
funding burden moves from the platform to each seller. Sources:
<https://docs.envia.com/docs/authentication> · <https://docs.envia.com/docs/marketplace-multi-seller>.

## Why it's a separate, bigger build (not folded into the flag)
- **Per-seller encrypted credential storage** — an Envía API token is a secret; needs encryption-at-rest and a
  storage decision (Supabase non-commerce vs Medusa seller metadata) — a real security surface.
- **Client refactor** — `envia-client.ts` reads a single `ENVIA_API_KEY` env var today; BYO needs it to accept
  a **per-seller key** threaded from the seller that owns the listing.
- **Settings UX** — a new field to enter + **validate** the token (test call), plus error states.
- **Onboarding/funding friction** — every seller must sign up + fund Envía before they can ship; needs a
  fallback for sellers who haven't (→ arranged delivery / manual carrier — which this flag epic already wires).
- **Product decision for Daniel** — BYO (sellers fund their own) **vs** keep a funded platform account with a
  markup. This is the core call the spike must land before any build.

## Recommended spike framing (for `spike-envia-byo`)
Time-boxed investigation → a **written decision**, no code. Must answer: the credential model + storage +
encryption · the client/threading refactor shape · the seller onboarding/validation UX · the funding-model
product call (BYO vs platform-funded-with-markup) · how it composes with this kill-switch (the flag stays the
master off) · go/no-go + a thin first slice. **Risk when built: HIGH** (per-seller credentials on the money
path) → Daniel-merge.
