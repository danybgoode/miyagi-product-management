---
status: readyforscope
slug: promoter-funnel-v2
macro: 08-growth-and-promotions
class: feature (+1 bug story)
archetype: Grower
risk: HIGH (net-remittance money path, entitlement grants) — most stories LOW/MED
---

# Promoter funnel v2 — the offer packet, self-serve application, and the street-money close

> Scoped 2026-07-02 from Daniel's raw ask (this doc's Q&A resolved 4 open decisions — see
> *Decisions*, below). Follow-up to shipped epics `promoter-program` (2026-06-30) and
> `promoter-funnel-fixes` (2026-07-02).

**Tagline:** *El promotor sabe exactamente qué ofrece, cuánto gana y cómo cobrar — y cualquiera puede aplicar para serlo.*

## Overview — As a / I want / so that

**As a prospective or active promoter**, I want a landing page that tells me in my own terms what I
offer, what I earn, and how I start — plus a self-serve way to apply, a handbook for my day-to-day,
and a close flow that matches street reality (cash in hand, transfer the platform its share, keep my
commission on the spot) — **so that** I can recruit merchants and get paid without Daniel hand-holding
every step.

**As a merchant signed up by a promoter**, I want the shop stood up properly (photos, real listings,
real location), honesty about where the printed zine actually circulates, my ad designed with me in
person, and a receipt telling me what I bought and what happens next — **so that** I trust the
platform from day one.

**As Daniel (admin)**, I want promoter applications, transfer approvals, and grants to flow through
the admin panel with Telegram/email notifications — **so that** the program scales beyond people I
meet in person.

## Stage-2.5 bucket — mixed, mostly light-on-heavy-reuse

- **Already possible today (wire, don't build):** the hero copiable prompt (the exact promoter prompt
  already ships in `lib/agent-prompt.ts` `case 'promoter'` — the landing hero just renders the generic
  shared `trustPrompt` template instead); predefined location lists (`lib/mx-locations.ts`); edition
  coverage zones (`coverage_zones: string[]` already on print editions); the cash-report pattern
  (print `payment-reported`); comp/one-time grants (domain + subdomain entitlement seams).
- **Light enhancement:** context-aware agent-sheet preamble; CTA/wording sweep; earnings/commission
  display from admin config; coverage notice in the close flow; merchant receipt email.
- **Genuinely new:** promoter application flow; bundle pricing config + display; net-remittance
  transfer checkout + admin approval → grant activation; 2x1 edition clone-comp; ad-design step in
  the close flow; downloadable zine ad-rate template; photos/listings in the close flow.
- **Bug:** subdomain paywall not gating a fresh seller signup (repro story S0).

## Decisions (resolved with Daniel, 2026-07-02)

1. **Cash model = net remittance replaces the ledger for cash closes.** Promoter collects cash,
   transfers the platform *(price − commission)* via SPEI/DiMo/CoDi, keeps the commission instantly;
   Daniel approves in admin → services granted. **Card-paid closes keep today's accrual ledger +
   offline settlement.** Stripe path is never removed.
2. **Pricing source = admin config.** Landing + handbook + close workspace render commission %,
   per-SKU regular-vs-promoter prices, and the bundle price from admin-configurable settings
   (existing per-SKU commission % + seller-discount settings, extended with bundle + per-SKU
   promoter pricing). Daniel tunes numbers without a deploy.
3. **Free subdomain via promoter = first year free, then pays.** 100% off year one through promoter
   attribution (mirror the `miyagisan` domain-coupon + graceful year-end lapse patterns). Landing
   shows the savings as "$199 → **GRATIS** con promotor".
4. **2x1 print promo = pay 1 edition, get 2.** Merchant pays one edition's price; the approved ad is
   cloned into the next edition comped, attribution preserved.

## Why now

The promoter program shipped (v1) but the funnel assumes Daniel in the loop everywhere: codes are
hand-minted for people he meets, the landing shows an empty `%` where earnings should be, the
glossary still claims the subdomain is "gratis para todos" (it's been a $199/yr SKU since
subdomain-pricing shipped), the primary CTA ("Abrir mi panel para cerrar") confuses recruits who
have no panel, and the close flow ignores street reality: cash-first merchants, promoters who won't
front full price on their own card, shops stood up without photos/listings, and a zine that doesn't
circulate everywhere a shop can open.

## What already exists (reuse, don't rebuild)

- **Promoter spine** — `lib/promoter.ts` (PRM- codes, settings incl. `discount_type`/`discount_amount_cents`,
  attribution), `lib/promoter-skus.ts` (`custom_domain | print_ad | subdomain | ml_sync`),
  `lib/promoter-commission.ts` (per-SKU % accrual, first-payment-only), `lib/promoter-close.ts`,
  `app/(shell)/promotor/cerrar/*` (close workspace), `app/(shell)/admin/promoter/PromoterAdminClient.tsx`
  (admin panel: settings + settlement), `promoter.enabled` flag (ON).
- **The promoter agent prompt** — `lib/agent-prompt.ts` `case 'promoter'` returns exactly the prompt
  the hero should carry; `PREAMBLE` is the shared constant to make context-aware. `buildAgentPrompt`
  is pure + spec-covered.
- **Trust-prompt plumbing** — `promoterTrustPrompt` / `sellerTrustPrompt` in `lib/seller-acquisition.ts`;
  `buildPromoterPageConfig` in `app/(shell)/vende/_components/page-config.ts` (hero copy, `heroStats`
  with the literal `'%'`, both CTAs); copy in `locales/es.json` `sellerAcquisition.promotor`.
- **Entitlement + grants** — `lib/domain-entitlement*.ts`, `lib/subdomain-entitlement*.ts`
  (grandfather/comp/one-time grant types + lapse), the `miyagisan` capped-coupon mint pattern
  (`domain-coupon-mint-fix` learnings: Stripe coupon name ≤40 chars, deterministic ids, idempotent mint).
- **Cash-report / manual payment** — print `app/api/print/submissions/[id]/payment-reported` +
  `checkout`; the marketplace manual-payment lifecycle (buyer marks paid → seller confirms) as the
  state-machine reference; `lib/print-server.ts` already flips promoter attribution to paid.
- **Print edition** — ad tiers (full/half/quarter/card), self-serve ad builder + editorial queue,
  layout builder ("Maqueta") + one-click print-ready PDF export (`lib/print-export.ts`,
  `lib/print-layout*.ts`), `coverage_zones` on editions, `miyagiprints` shop. Baseline artwork:
  `references/el-barrio-issue-03-oficio-color-sinbordes-print.pdf` (+ `references/zine/data/editions/el-barrio-issue-03.json`).
- **Locations** — `lib/mx-locations.ts` (ESTADOS, INEGI/envia codes) + the CP-first address patterns.
- **Notifications** — `lib/telegram.ts` (admin Telegram), `lib/email.ts`, granular notification prefs;
  Stripe receipts already automatic.
- **Listing creation** — seller listing create/edit APIs + R2 image upload (`lib/r2.ts`), used by the
  seller portal and MCP `create listing` tools.
- **Subdomain paywall** — `subdomain.paywall_enabled` (in-house `platform_flags`, **fail-open default
  `false`** — `lib/flags.ts:127`), middleware gate 301→`/s/slug`, `SubdomainSection` buy upsell
  (`entitled` defaults true upstream), grandfather backfill script (cutover-only, not for new shops).

## Scope — sprints & stories

### S0 · Bug — subdomain paywall not gating new sellers *(1 story, HIGH — entitlement)*
- **US-0.1** Reproduce → root-cause → fix + regression spec. As Daniel, I want a fresh no-promoter
  seller signup to get the free `/s/slug` only, with the subdomain shown as a buy upsell, so the SKU
  is real. **Repro:** new seller, no grant → subdomain serves ungated, settings shows no upsell.
  **Hypotheses (in order):** (1) `platform_flags` row for `subdomain.paywall_enabled` absent/OFF —
  fail-open default `false` silently disables the paywall (check which project `SUPABASE_URL` points
  at per LEARNINGS before writing); (2) settings passes `entitled` defaulted `true` upstream of
  `SubdomainSection`; (3) an unintended grant stamped on new shops. **Acceptance:** middleware 301s
  the unpaid new shop's subdomain to `/s/slug`; `SubdomainSection` shows the $199/$25 upsell;
  regression spec on the entitlement deriver + flag-row assertion. *Risk: HIGH (Daniel merges).*

### S1 · Landing v2 — say the true offer *(frontend-only, LOW)*
- **US-1.1** Hero copiable prompt = the promoter prompt. Reuse `buildAgentPrompt({kind:'promoter'})`
  (or its `ask`) as the single source; kill the generic `trustPrompt` template on this page.
  **Acceptance:** hero copy button copies the "Quiero ser promotor…" prompt; sheet + hero can't drift.
- **US-1.2** Context-aware agent-sheet preamble. Keep the two sources (`/agent` + ucp.dev) always;
  swap the role framing per context: shopping (default) vs seller/promoter onboarding ("Eres mi
  asesor para evaluar una oportunidad…"-style es-MX). Pure change in `lib/agent-prompt.ts` + spec.
  **Acceptance:** promoter/seller pages' sheet prompt no longer opens with "asistente de compras".
- **US-1.3** CTA + wording sweep. Primary CTA for a visitor: "Aplica para ser promotor" (→ S2 flow;
  until S2 lands, anchor to the application section placeholder); enrolled promoters see "Abrir mi
  panel" separately. "Empieza a ganar hoy" tone throughout. Fix stale copy: subdomain glossary
  ("gratis para todos" → "$199/yr, GRATIS el primer año con tu código"), benefit-first feature
  framing (sorteos, eventos, punto de entrega, "que los agentes de IA encuentren la tienda" — what
  the merchant can DO, not tool names). **Acceptance:** copy review + es-MX completeness; no `%`
  placeholder anywhere.
- **US-1.4** Real earnings + per-item comparison. Replace the `'%'` heroStat; render an earnings
  section ("si cierras X tiendas al mes…") and a per-SKU table *precio regular vs con tu código*
  computed from live admin config (existing commission % + discount settings; bundle line appears
  when S3 lands, degrade gracefully until then). **Acceptance:** numbers change in admin → page
  changes without deploy.
- **US-1.5** Handbook ("Manual del promotor"). Evolve `/vende/promotor/sell-sheet` into the
  day-to-day cheatsheet: the offer table, 30-second scripts per SKU, the close checklist (montar →
  cobrar → diseñar anuncio → entregar por WhatsApp → recibo), payments cheat-sheet (net remittance),
  printable. **Acceptance:** a new promoter can run a close start-to-finish from this page alone.

### S2 · Become a promoter — application flow *(LOW/MED)*
- **US-2.1** Apply form (public, on `/vende/promotor`): name, WhatsApp, ciudad/zona, motivación →
  stored + admin notified via Telegram + email. Rate-limited, no auth required.
- **US-2.2** Admin approve/reject in `/admin/promoter`: approve mints the PRM- code (existing mint)
  and emails/WhatsApp-links it to the applicant with the finish-signup steps; reject notifies politely.
  **Acceptance:** end-to-end: apply → Telegram ping → approve → applicant gets code → enters code →
  enrolled. Hand-minting for in-person recruits keeps working unchanged.

### S3 · The offer — bundle pricing, free subdomain, 2x1 *(MED/HIGH — money-adjacent)*
- **US-3.1** Bundle + per-SKU promoter pricing config (admin): per-SKU promoter price and a bundle
  price where discounts are bigger in the full bundle and decrease as the bundle shrinks. Landing,
  handbook, and close workspace read it ("todo esto cuesta $X — con promotor $X−desc"). *MED.*
- **US-3.2** Subdomain first-year-free via promoter attribution: a promoter-attributed subdomain
  activation mints a one-year one-time grant (100% off year 1; graceful lapse to the buy upsell —
  mirror `miyagisan` + one-time-cadence patterns; savings framed "100% de descuento / GRATIS el
  primer año"). *HIGH (Daniel merges).*
- **US-3.3** 2x1 printed ad: at promoter close (or ad checkout with promo active), paying one
  edition books the ad into the next edition too — approved content cloned, second submission
  comped + attributed; merchant sees both editions in their panel. Validate how much existing
  coupon/submission logic covers before building (a clone-comp may be one admin-triggerable
  function). *MED/HIGH.*

### S4 · Street money — net remittance + admin approval *(HIGH)*
- **US-4.1** Transfer option at the promoter close checkout: alongside Stripe, "Transferir a Miyagi
  (SPEI/DiMo/CoDi)" shows the CLABE/instructions and the **amount owed = price − promoter
  commission** (computed from config); promoter marks "ya transferí" (reuse the payment-reported
  state machine). Commission for cash closes is recorded as settled-at-source (no accrual). *HIGH.*
- **US-4.2** Admin approval → activation: Daniel sees pending transfers in `/admin/promoter`,
  approves → the purchased SKU's entitlement activates (print: existing confirm path; domain /
  subdomain / ml_sync: comp/one-time grant minted for the covered period) → promoter auto-notified
  (Telegram/email; Daniel's personal WhatsApp stays manual, by design). Reject/expire path exists.
  *HIGH (Daniel merges).*

### S5 · Close-flow completeness *(MED)*
- **US-5.1** Photos + real listings in the close workspace: add image upload (R2) + at least one
  real listing with photo during setup (reuse listing-create APIs). **Acceptance:** a shop stood up
  by a promoter is indistinguishable from self-serve (photo, price, category, location).
- **US-5.2** Predefined location lists: estado/municipio selects from `lib/mx-locations.ts` replace
  the free-text "Ubicación (opcional)" — matching the marketplace's canonical lists.
- **US-5.3** Zine coverage honesty: compare the shop's location against the active edition's
  `coverage_zones` → when outside coverage, an explicit notice in the close flow *before* the print
  SKU is sold ("la edición impresa no circula en esta zona; el anuncio sirve como branding y
  cubrimos puntos estratégicos") — sellable, but never silent.
- **US-5.4** Ad design in person: an ad-design step in the close flow (reuse the self-serve ad
  builder, promoter-driven), or "el comerciante lo diseña después" handoff; either way the merchant
  can review/edit the ad later from their own panel.
- **US-5.5** Merchant receipt: after a promoter close, the merchant gets OUR branded receipt email
  (beyond Stripe's): what they bought, what it cost, what happens next (esp. print: edition dates,
  design status, coverage), the claim-link recap. Reuse `lib/email.ts` branded-email patterns.
- **US-5.6** Downloadable zine ad-rate template: a print-ready PDF of the zine with ad-slot
  placeholders + live pricing per tier (baseline: `references/el-barrio-issue-03-oficio-color-sinbordes-print.pdf`;
  reuse `lib/print-export.ts`/layout infra), linked from the handbook. *(LOW/MED.)*

## Out of scope (v1 of this epic)
- In-app promoter payouts (settlement of card-close commissions stays offline).
- Recurring/monthly promoter billing changes beyond what exists (one-time cadence stays).
- Automated WhatsApp sending (Daniel's personal WhatsApp ping stays manual on purpose).
- Per-colonia coverage geo-matching precision — v1 matches at the granularity the edition's
  `coverage_zones` strings + the shop's estado/municipio allow; fuzzy cases surface the notice.
- New commission models (multi-payment trailing commissions, tiers).
- Two-sided referral interplay; ML-sync feature changes (only its manual-payment leg is in).

## UX heuristics
- Benefit-first, es-MX street register; never internal jargon ("SKU", "entitlement") on promoter/merchant surfaces.
- Savings framed from the merchant's chair ("GRATIS el primer año", "2×1"), earnings from the promoter's ("cada venta es efectivo en tu bolsa").
- Money states always explicit and honest (pendiente de transferencia → aprobado → activado).
- Degrade gracefully: every section renders sensibly if config values are unset or a flag is off.
- Mobile-first (promoters work from phones in the street) — no overflow at 360px (LEARNINGS: clamp + minmax).

## Open risks
- **Net remittance trusts the promoter with cash float** — approval gate + explicit pending states
  are the control; fraud handling is manual (admin reject). Accepted for v1 scale.
- **Grant-minting from admin approval touches entitlements** (HIGH) — reuse existing grant writers,
  never new money paths; flag-gate the transfer option (`promoter.transfer_enabled`, fail-open OFF).
- **2x1 clone-comp needs edition-lifecycle care** (what if the next edition's deadline passed?) —
  resolve in S3 research; fall back to admin-manual comp if the automatic clone is bigger than it looks.
- **S0 may reveal the paywall was never live** — if so, flipping it ON is an ops step owed to Daniel
  (Supabase `platform_flags` is shared dev/prod — LEARNINGS).

## QA / smoke stages
- Every browser-/API-testable story ships one Playwright `api` spec (pure seams preferred:
  `agent-prompt`, pricing/derivers, remittance-amount math, coverage matcher).
- S0: regression spec on the entitlement deriver + a middleware-gate api spec.
- Money paths (S3.2, S4, 2x1 checkout) — authed browser + live money smokes **owed to Daniel**,
  declared per sprint with real-URL walkthroughs in each `sprint-N.md`.
- Mobile overflow check on the reworked landing (browser project, 360/390/414px).

## Deploy order
S0 first (independent, urgent). S1 → S2 frontend-only, flag-safe. S3 backend-first where grants are
touched; S4 behind `promoter.transfer_enabled` (default OFF, code merges dark, run-order per
LEARNINGS: merge → deploy → seed/config → flip). S5 additive. HIGH stories → Daniel merges.

## Research citations
- Live code read 2026-07-02: `lib/agent-prompt.ts` (promoter ask + PREAMBLE), `page-config.ts`
  (`'%'` heroStat, CTA wiring), `es.json` (stale "gratis para todos"), `lib/flags.ts:127`
  (`subdomain.paywall_enabled` default `false`), `PromoterCloseClient.tsx` (free-text location),
  `lib/print.ts` (`coverage_zones`), `payment-reported` route, `lib/promoter*.ts`, `mx-locations.ts`.
- Poster + epics: `promoter-program` (README, 4 sprints), `promoter-funnel-fixes`, `subdomain-pricing`
  line (07), print-edition section (06).
- No external/current-web facts load-bearing here (SPEI/DiMo/CoDi are manual-transfer instructions,
  not API integrations, in this scope).
