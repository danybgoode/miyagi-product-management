# Shipping provider expansion — Envía comp-grant · BYO decision spike · Correos de México manual provider

**Status: awaiting Daniel approval — no code yet.**
Source: Daniel's ask (2026-07-05) — Envía stays platform-disabled (kill-switch OFF since 2026-06-26);
now (a) make platform Envía **grantable per-tenant** ("comp grant by admin"), (b) land the **BYO /
alternative-provider decision** (folding the existing `spike-envia-byo` seed in as Sprint 0), and
(c) design **Correos de México** as a new *manual* shipping provider — the honest "si no tienes prisa"
economy option (e.g. a sticker sheet delivered in 4–10 días for ~$10 MXN).
Grooming decisions (2026-07-05, confirmed by Daniel): **Correos v1 = Impresos-class flat tariffs only**
(zoned MEXPOST later) · **comp-grant uncapped** (trust the hand-picked list; instant revoke) · **BYO spike
folded in as Sprint 0** · **Mercado Envíos dropped from build scope** (validated not usable — see below).

**Proposed domain: [04 · Shipping & Delivery](../../04-shipping-and-delivery/README.md).**
Direct successor to [envia-killswitch](../../04-shipping-and-delivery/envia-killswitch/README.md) —
every slice composes with its gate.

---

## Stage-2.5 bucket — **mixed, named per slice**
- **Envía comp-grant → light enhancement.** The kill-switch epic left a *pure decision seam*
  (`enviaKillGate` in both apps' backends) and the platform has a comp-grant precedent
  (`metadata.subdomain_grant`, hand-set domain comps). A grant is: seller metadata key + widen the pure
  gate to `platformOn || sellerGranted` + an admin toggle on the existing `/admin/tenants`. No new
  infrastructure.
- **BYO / alternative providers → spike** (already seeded — `00-ideas/seeds/spike-envia-byo.md`,
  feasibility validated 2026-06-25). Folded in as Sprint 0; ends in a **written decision**, no code.
- **Mercado Envíos → orientation, resolved: NOT buildable.** Validated 2026-07-05: Mercado Envíos
  generates labels **only for Mercado Libre sales**; the API manages ML-order shipments and cannot
  quote/label an external (Miyagi) order. The existing ML OAuth connection (ml-sync) does not unlock ME
  for Miyagi checkout. ME data keeps flowing where it already belongs — inside `ml-orders-native`
  (ML orders arrive carrying their own ME shipment payloads). Recorded here so it doesn't resurface.
  Sources: <https://developers.mercadolibre.com.ar/es_ar/mercado-envios> ·
  <https://developers.mercadolibre.com.co/es_ar/envios-personalizados> (seller-managed "custom shipping"
  exists *on ML listings*, not as an outbound label API).
- **Correos de México → genuinely new**, but deliberately small: a *rate-table* provider, not an API
  integration. New provider **class** for the platform (manual carrier with a priced checkout rate).

## Research — present-day facts (verified 2026-07-05)
- **Correos de México has no public API.** Tariffs are published as PDFs on datos abiertos
  (2026 tariff in force; the *Impresos en General* base tariff has been stable since 2010 — updates are
  ~annual at most). Local copy: `references/correos-de-mexico-impresos.pdf`.
  - *Impresos en General* (printed matter): **national flat weight bands, no zones** — $6.00 MXN total
    (IVA incl.) up to 20 g; ~$7–8 up to 60 g. Ordinary mail: **no tracking**, ≈4–10 días.
  - Ordinary *Paquetería* is also a national flat weight-band table (~$42 MXN up to 1 kg) — same
    calculator shape, easy later row.
  - *MEXPOST* (express): zoned weight matrix (Día Siguiente / Dos Días / Estándar, ≤40 kg), tracked via
    the public Seguimiento page. **Out of v1** (zones + tracking UX are the complexity cliff).
  - Sources: <https://www.correosdemexico.gob.mx/DATOSABIERTOS/Tarifas/Individuales/2_Impresos_en_General.pdf> ·
    <https://www.correosdemexico.gob.mx/DATOSABIERTOS/Tarifas/Mexpost/Tarifas_Mexpost.pdf> ·
    <https://www.portal.correosdemexico.com.mx/portal/index.php/atencion-a-clientes/tarifas> ·
    <https://www.correosdemexico.gob.mx/SSLServicios/SeguimientoEnvio/Seguimiento.aspx>
- **Keeping prices current:** platform-managed table (Daniel's call). v1 keeps the table as a **versioned
  code constant with a `vigencia` date** (tariff churn is ~annual → one small PR per republication;
  spec-testable, no new storage). An admin-editable table is deliberately deferred — it becomes trivial
  if/when the admin content-tooling ask (groomed separately) lands. Optional later chore: a scheduled
  routine that watches the datos-abiertos PDF URLs for changes.
- **Envía BYO feasibility** — already validated in the seed (per-account Bearer tokens; published
  "Marketplace Multi-Seller Shipping" use case): <https://docs.envia.com/docs/authentication> ·
  <https://docs.envia.com/docs/marketplace-multi-seller>. Spike must still land the funding-model call.
  Comparable Mexican aggregators to weigh in the same spike: Skydropx, Pakke, Mienvío, EnvíoClick.

## What already exists (reuse, don't rebuild) — verified 2026-07-05
| Capability | Where | Reuse for |
|---|---|---|
| Pure Envía gate seam (unit-tested, both apps) | `apps/backend/src/lib/envia-killswitch.ts` (+ FE mirror `lib/envia-killswitch.ts`) | Widen the decision input: `{ enviaEnabled, sellerGranted }` → grant override |
| Platform flag, enablement OFF | `shipping.envia_enabled` in both `lib/flags.ts` (in-house Supabase store) | Stays the **master global**; grant is per-seller on top while global is OFF |
| Comp-grant precedent | `metadata.subdomain_grant` (subdomain-pricing S1) + domain comp grants | Same shape: `metadata.envia_grant` on the Medusa seller |
| Admin tenant surface | `app/(shell)/admin/tenants` + `app/api/admin/tenants` | Grant/revoke toggle lives here — no new admin page |
| Quote seam (knows the seller) | backend `POST /store/envia/rates` (resolves seller + shipping settings) | Grant check + the Correos rate branch both hang off this seam |
| Label seams (all three) | backend ship route · `modules/fulfillment-envia/` · FE legacy `app/api/orders/[id]/ship` | Grant override on each — **the L737/S1.4 gotcha: trace every importer; the FE legacy route was a live bypass last time** |
| Manual-carrier fulfillment path | existing manual carrier + "can't ship before payment" 422 gate | Correos fulfillment = this path with carrier "Correos de México" + optional tracking no. |
| Listing weight data | product `metadata.weight_grams` (default 500 g) + per-shop package defaults | Correos weight-band rate computable at quote time today |
| Arranged-delivery fallback message | `ENVIA_ARRANGED_DELIVERY_MESSAGE` + checkout fallback UX | Correos slots in as one more option in the same checkout-options list |
| Per-shop shipping settings UI | `app/(shell)/shop/manage/settings/_sections/Envios.tsx` | Correos opt-in toggle + rate preview live here |
| Agent surface | `checkout-options` route → UCP/MCP checkout | New method appears to agents automatically **iff** the backend seam is the SSOT (AGENTS rule #3) |

## Medusa-first note
No new tables anywhere in this epic. The grant is seller **metadata** (Medusa, commerce-owned); the
Correos tariff is a pure versioned constant + a pure calculator lib; fulfillment reuses the existing
manual-carrier path on Medusa orders. Supabase untouched (flags already live there). Clerk untouched.
All new copy es-MX (not on the bilingual allow-list). Backend seams are the enforcement, so UCP/MCP
inherit both the grant and the new Correos option with no separate agent build.

## UX heuristics
- **Buyer (checkout):** Correos renders as one more shipping option, understated and honest:
  «Correos de México — Económico · 4–10 días · sin rastreo» + price. Never pre-selected over faster
  options; no dark patterns. If the only option, same treatment as today's arranged-delivery fallback.
- **Seller (settings):** one toggle («Ofrecer Correos de México (económico)») + a live rate preview
  from their package defaults, plus a plain-language explainer: you drop off at the post office, you
  cover the franqueo, ordinary mail has no tracking.
- **Seller (order):** ships via the existing manual-carrier flow; carrier pre-set, tracking number
  optional (registered mail), buyer email copy sets the sin-rastreo expectation.
- **Admin:** grant/revoke Envía per tenant on `/admin/tenants` — visible state, instant effect (flag
  cache ≤60 s), no deploy.

## Scope — sprints & stories
> Epic risk: **HIGH** (fulfillment/checkout money path) → Daniel merges all HIGH stories.
> Kill-switch (Stage 6b): new flag **`shipping.correos_enabled`** — enablement polarity, **default OFF**,
> created disabled; Correos never quotes while OFF. The Envía grant needs no new flag (the global
> `shipping.envia_enabled` remains master; removing a grant is instant revoke).

### Sprint 0 — Spike: shipping funding model (written decision, NO code)
| # | Story | Risk |
|---|---|---|
| S0.1 | Land the decision the `spike-envia-byo` seed defines: **funding model** (BYO vs platform+markup vs hybrid), credential storage, client-refactor shape, onboarding UX, flag composition, agent surface, go/no-go + thin slice — **now also comparing aggregator alternatives** (Skydropx, Pakke, Mienvío, EnvíoClick) on: per-seller accounts, MXN pricing, coverage, API shape. Decision written into the seed file + this doc; Daniel signs off. | low (spike) |

*Sprint 1–2 do NOT block on S0 — grant + Correos are useful under any funding model.*

### Sprint 1 — Envía comp-grant (platform-funded, admin-granted)
| # | Story | Surface | Risk |
|---|---|---|---|
| S1.1 | As platform admin, I want `metadata.envia_grant` honored at the **quote** seam (pure gate widened: `platformOn \|\| sellerGranted`), so granted tenants see live Envía rates while the global flag stays OFF. **Acceptance:** ungranted shop → arranged-delivery fallback (today's behavior); granted shop → live rates. Unit specs on the widened pure gate. | BE | **HIGH** |
| S1.2 | Grant honored at **every label seam** — backend ship route, fulfillment provider, **and the FE legacy `app/api/orders/[id]/ship`** (trace all importers; that route bypassed the gate once already). **Acceptance:** granted seller generates a real label; ungranted seller still gets the 422 → manual carrier. | BE+FE | **HIGH** |
| S1.3 | As platform admin, I want a grant/revoke toggle per tenant on `/admin/tenants` (writes `metadata.envia_grant`), so I can comp selected shops with no deploy. **Acceptance:** toggle flips → within ~1 min the shop's quote behavior changes; state visible in the list. | FE | med |
| S1.4 | Seller settings (`Envios.tsx`) reflect granted state («Envía habilitado por Miyagi») instead of the platform-off banner. **Acceptance:** granted seller sees enabled state; ungranted copy unchanged. | FE | low |

### Sprint 2 — Correos de México, manual economy provider (Impresos v1)
| # | Story | Surface | Risk |
|---|---|---|---|
| S2.1 | Pure tariff lib: versioned Impresos weight-band table (2026 tariff, `vigencia` date) + `quoteCorreos(weightGrams)` calculator; band edges + IVA-inclusive totals spec-locked against the PDF. | BE lib | low |
| S2.2 | As a seller, I want to opt in («Ofrecer Correos de México») in shipping settings with a rate preview + drop-off explainer, so I control whether the slow-cheap option exists on my shop. Persisted in shop shipping settings (same object as `envia_enabled`). | FE | low |
| S2.3 | As a buyer, I want the Correos option at checkout — priced from item weight, labeled «Económico · 4–10 días · sin rastreo» — behind `shipping.correos_enabled` + seller opt-in + weight ≤ table max, so I can pick the no-hurry option. Backend checkout-options is the SSOT (agents inherit). **Acceptance:** eligible listing shows the option with the correct band price; over-weight or opted-out shops never show it; flag OFF hides it everywhere. | BE+FE | **HIGH** |
| S2.4 | As a seller, I want Correos orders to ship via the existing manual-carrier flow (carrier pre-set, optional tracking number for registrado), with buyer emails setting the sin-rastreo expectation, so fulfillment stays honest and familiar. | BE+FE | med |
| S2.5 | Smoke + agent parity: UCP checkout-session/options expose the Correos method identically; one api spec per testable story; browser smoke of the checkout option. | e2e | low |

**Deploy order:** backend-first each sprint (S1.1→S1.2→S1.3/S1.4 · S2.1→S2.3→S2.2/S2.4).
**QA:** pure-seam unit specs (gate widening, tariff calculator) carry the free coverage; one `api`
Playwright spec per story on the checkout-options + quote routes; **money-path browser smokes owed to
Daniel** (granted-tenant live label purchase; a real Correos checkout + manual ship round-trip).

## Out of scope (v1)
- MEXPOST (zoned/tracked) and ordinary Paquetería rows — later slices on the same calculator.
- Admin-editable tariff table (waits for the content-tooling epic; code-constant PR-per-year until then).
- BYO **build** (spike decision first), markup/billing mechanics, per-grant spend caps.
- Mercado Envíos as a Miyagi checkout provider (validated not possible — see above).
- Scraping/automation of Correos PDFs; in-app tracking timeline.

## Open risks / honesty notes
- **Impresos is legally printed-matter mail.** The sticker/print case fits; a seller shipping
  non-printed goods at the impresos rate is misusing the class. Mitigation: explainer copy names the
  intended use + ordinary-Paquetería row is the correct follow-up for general goods. (Same "honesty
  notice" pattern as the zine coverage matcher.)
- **No tracking** on ordinary mail → disputes rely on the existing manual-payment/refund honesty rails;
  the buyer copy must never imply rastreo. Registered-mail tracking number stays optional.
- **Comp-grant is real platform money per label, uncapped** (Daniel's call) — revoke is the guardrail;
  spend visibility lives in the Envía dashboard.
- Tariff staleness: a republished tariff needs a small PR (table constant + `vigencia`); acceptable at
  ~annual cadence, noted for the optional watcher chore.

## Epic Definition of Done (draft — final lives in the epic README)
- Grant + Correos behind their stated flags/gates; both quote AND label seams enforce (agents can't bypass).
- `shipping.correos_enabled` exists in both `lib/flags.ts`, default OFF, created disabled.
- es-MX copy-complete; poster (04 domain) updated; RETROSPECTIVE + LEARNINGS promotion; S0 decision
  written into `spike-envia-byo.md`; Daniel's money-path smokes passed.
