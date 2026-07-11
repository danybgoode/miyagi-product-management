---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: shipping-provider-expansion
---

# Epic: Shipping provider expansion — Envía comp-grant, BYO decision, Correos de México

> **Area:** 04 · Shipping & Delivery · **Risk:** HIGH (fulfillment/checkout money path → Daniel merges)
> **Scope doc:** [`00-ideas/2. readyforscope/shipping-provider-expansion.md`](../../00-ideas/2.%20readyforscope/shipping-provider-expansion.md) (approved 2026-07-05)
> **Folds in seed:** [`00-ideas/seeds/spike-envia-byo.md`](../../00-ideas/seeds/spike-envia-byo.md) (→ Sprint 1)

## Why
Envía is platform-disabled (kill-switch OFF since 2026-06-26) and every shop rides the arranged-delivery
fallback. This epic gives the platform admin surgical control instead of all-or-nothing: **comp-grant**
platform Envía to hand-picked tenants while the global flag stays OFF; land the **funding-model decision**
(BYO seller accounts vs platform+markup vs hybrid, incl. aggregator alternatives) as a written spike; and
add **Correos de México** as a new *manual* provider class — the honest «si no tienes prisa» economy
option (a sticker sheet delivered in 4–10 días for ~$6–10 MXN), with merchant opt-in, a real rate at
checkout, and fulfillment through the existing manual-carrier path.

**Mercado Envíos: resolved, not built.** Validated 2026-07-05 — ME labels exist only for Mercado Libre
sales; the API cannot quote/label an external (Miyagi) order, and the existing ML OAuth doesn't change
that. ME data keeps flowing inside `ml-orders-native`. Sources in the scope doc.

## Context
| | |
|---|---|
| **Class** | Feature (+ folded-in Spike as Sprint 1) |
| **Stage-2.5 buckets** | Comp-grant: light enhancement · BYO: spike · Mercado Envíos: orientation (resolved NO) · Correos: genuinely new |
| **Flags** | `shipping.envia_enabled` stays the global master (unchanged). New: **`shipping.correos_enabled`** — enablement polarity, **default OFF, created disabled** |
| **Epic risk** | **HIGH** — quote/label/checkout money path → Daniel-merge on S2.x/S3.3 |
| **Deploy order** | Backend-first each sprint: S2.1→S2.2→S2.3/S2.4 · S3.1→S3.3→S3.2/S3.4 |
| **Smoke owner** | **Daniel** — granted-tenant live label purchase; real Correos checkout + manual-ship round trip |

## Medusa-first note
No new tables. The grant is Medusa seller **metadata** (`metadata.envia_grant` — the `subdomain_grant`
precedent); the Correos tariff is a pure versioned code constant + calculator lib; Correos fulfillment
reuses the existing manual-carrier path on Medusa orders. Supabase untouched (flags already live there).
Clerk untouched. Backend seams are the enforcement, so UCP/MCP agents inherit both the grant and the new
Correos option automatically (AGENTS rule #3). All new copy es-MX (not on the bilingual allow-list).

## What already exists (reuse, don't rebuild) — verified 2026-07-05
- Pure Envía gate seam, unit-tested, both apps: `apps/backend/src/lib/envia-killswitch.ts` (+ FE mirror) → widen input to `{ enviaEnabled, sellerGranted }`.
- Comp-grant precedent: `metadata.subdomain_grant` (subdomain-pricing S1) + domain comp grants.
- Admin tenant surface: `app/(shell)/admin/tenants` + `app/api/admin/tenants` — grant toggle lives here.
- Quote seam that already resolves the seller: backend `POST /store/envia/rates`.
- **All three label seams** — backend ship route, `modules/fulfillment-envia/`, and the FE legacy
  `app/api/orders/[id]/ship`. **Correction (found during Sprint 2 build):** this route is NOT a live
  bypass — it was already remediated in an earlier epic (calls `enviaKillGate` at all 3 call sites).
  Still trace every importer before touching a seam; there's just no bypass to discover here anymore.
- Manual-carrier fulfillment path + "can't ship before payment" 422 gate → Correos ships through this.
- Listing weight data: product `metadata.weight_grams` (default 500 g) + per-shop package defaults.
- Per-shop shipping settings UI: `app/(shell)/shop/manage/settings/_sections/Envios.tsx`.
- Checkout-options backend route as SSOT → agents inherit new methods.

## Scope — stories
| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | S1.1 Spike: funding-model written decision (BYO vs platform+markup vs hybrid; Skydropx/Pakke/Mienvío/EnvíoClick compared; credential storage; client-refactor shape; go/no-go + thin slice) | low (spike) | ✅ approved 2026-07-08 |
| 2 | S2.1 Grant honored at the **quote** seam (pure gate widened) | **HIGH** | ✅ shipped 2026-07-11 |
| 2 | S2.2 Grant honored at **every label seam** (incl. FE legacy ship route) | **HIGH** | ✅ shipped 2026-07-11 |
| 2 | S2.3 Admin grant/revoke toggle on `/admin/tenants` | med | ✅ shipped 2026-07-11 |
| 2 | S2.4 Seller settings reflect granted state | low | ✅ shipped 2026-07-11 |
| 3 | S3.1 Pure Impresos tariff lib (versioned table + `quoteCorreos(weightGrams)`) | low | ✅ shipped 2026-07-11 |
| 3 | S3.2 Seller opt-in + rate preview + drop-off explainer | low | ✅ shipped 2026-07-11 |
| 3 | S3.3 Correos option at checkout (flag + opt-in + weight-gated; backend SSOT) | **HIGH** | ✅ shipped 2026-07-11 |
| 3 | S3.4 Fulfillment via manual-carrier flow + honest sin-rastreo emails | med | ✅ shipped 2026-07-11 |
| 3 | S3.5 Agent parity + api specs + browser smoke | low | ✅ shipped 2026-07-11 (narrowed scope — see sprint-3.md) |

*Sprints 2–3 do NOT block on Sprint 1's decision — the grant + Correos are useful under any funding model.*

## Deploy order
Backend-first each sprint. Sprint 2 and Sprint 3 are independently shippable; Sprint 1 is docs-only
(no deploy). Frontend degrades gracefully throughout (ungranted/flag-OFF ⇒ today's behavior, byte-identical).

## Definition of Done (epic)
- [x] All sprints merged to `main` — **smoke-tested: NO, gap stated** — both S2's and S3's live
      money-path smokes are owed to Daniel (walkthroughs below, in `sprint-2.md`/`sprint-3.md`);
      code-level deterministic gates (tsc/build/unit/Playwright) are green on all merged commits
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated (04 domain lines + Recent highlights)
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** `shipping.correos_enabled` exists in both `lib/flags.ts`, enablement polarity, default OFF, created disabled (fail-open default, no Supabase row required to ship OFF); OFF ⇒ Correos never quotes anywhere (agents included — enforced at the same backend seam as web)
- [x] Sprint 1's written decision landed in `spike-envia-byo.md` + the scope doc; Daniel signed off (2026-07-08)
- [x] Both quote AND label seams enforce the grant (no agent/stale-page bypass) — Sprint 2
- [x] es-MX copy-complete (checkout option, explainer, emails, 422s)
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** — both S3 branches deleted post-merge (`build-order.mjs` regenerated below)
