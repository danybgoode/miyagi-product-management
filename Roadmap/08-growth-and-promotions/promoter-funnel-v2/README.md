---
status: planned
slug: promoter-funnel-v2
archetype: Grower
---

# Epic · Promoter Funnel v2 — the offer packet, self-serve application, and the street-money close

> Scoped 2026-07-02 from [`00-ideas/2. readyforscope/promoter-funnel-v2.md`](../../00-ideas/2.%20readyforscope/promoter-funnel-v2.md)
> (approved by Daniel 2026-07-02). Follow-up to `promoter-program` (shipped 2026-06-30) and
> `promoter-funnel-fixes` (shipped 2026-07-02).

**Tagline:** *El promotor sabe exactamente qué ofrece, cuánto gana y cómo cobrar — y cualquiera puede aplicar para serlo.*

## Why
The promoter program (v1) shipped, but the funnel assumes Daniel in the loop everywhere: codes are
hand-minted for people he meets in person, the landing shows an empty `%` where earnings should be,
the glossary still claims the subdomain is "gratis para todos" (a $199/yr SKU since
subdomain-pricing), the primary CTA ("Abrir mi panel para cerrar") confuses recruits with no panel,
and the close flow ignores street reality: cash-first merchants, promoters who won't front full
price on their own card, shops stood up without photos/listings, and a zine that doesn't circulate
everywhere a shop can open. v2 makes the offer legible (real earnings, per-item + bundle pricing),
the entry self-serve (apply → approve → code), and the money street-real (net remittance via
SPEI/DiMo/CoDi, admin-approved). Plus one urgent bug: the subdomain paywall appears not to gate
fresh signups.

## Context
| | |
|---|---|
| **Role** | Promoter (prospective + active), merchant (being enrolled), admin |
| **Macro-section** | 08 · Growth & promotions |
| **Class / archetype** | Feature (+1 bug story S0) / Grower |
| **Risk** | HIGH overall — net-remittance money path (S4), entitlement grants (S0/S3); most stories LOW/MED |
| **Flags** | `promoter.enabled` (ON, existing) · new `promoter.transfer_enabled` (fail-open OFF) |
| **Decisions** | Net remittance replaces ledger for cash closes (card keeps ledger) · pricing from admin config · subdomain = first year free via promoter · 2x1 = pay 1 edition, get 2 |

## Medusa-first note (AGENTS rule #1)
Money movement stays on the existing rails: the transfer option reuses the print cash-report state
machine and activates via the **existing** grant/entitlement writers (domain/subdomain one-time +
comp patterns) — no new payment path, no new money tables in Supabase beyond promoter-scoped state
Medusa has no concept of (rule #2: application records, remittance states, bundle config). The 2x1
clone-comp operates on print submissions (already Supabase-side print domain). SKUs and pricing stay
agent-readable over UCP/MCP (rule #3). Clerk untouched (rule #4). All copy es-MX street register,
not on the bilingual allow-list (rule #5).

## What already exists (reuse, don't rebuild)
- **Promoter spine** — `lib/promoter.ts` (PRM- codes, discount settings, attribution),
  `lib/promoter-skus.ts` (`custom_domain | print_ad | subdomain | ml_sync`),
  `lib/promoter-commission.ts` (per-SKU %, first-payment-only), `lib/promoter-close.ts`,
  `app/(shell)/promotor/cerrar/*`, `app/(shell)/admin/promoter/PromoterAdminClient.tsx`.
- **The promoter agent prompt** — `lib/agent-prompt.ts` `case 'promoter'` (the exact hero prompt) +
  the shared `PREAMBLE` constant to make context-aware; pure + spec-covered.
- **Trust-prompt plumbing** — `promoterTrustPrompt`/`sellerTrustPrompt` (`lib/seller-acquisition.ts`),
  `buildPromoterPageConfig` (`app/(shell)/vende/_components/page-config.ts`, the `'%'` heroStat +
  both CTAs), copy in `locales/es.json` `sellerAcquisition.promotor`.
- **Entitlement + grants** — `lib/domain-entitlement*.ts`, `lib/subdomain-entitlement*.ts`
  (grandfather/comp/one-time + lapse), the `miyagisan` capped-coupon mint pattern.
- **Cash-report / manual payment** — `app/api/print/submissions/[id]/payment-reported` + `checkout`;
  the marketplace manual-payment lifecycle as the state-machine reference; `lib/print-server.ts`
  already flips promoter attribution on payment.
- **Print edition** — ad tiers, self-serve ad builder + editorial queue, layout builder + print-ready
  PDF export (`lib/print-export.ts`, `lib/print-layout*.ts`), `coverage_zones` on editions,
  `miyagiprints` shop. Baseline artwork: `references/el-barrio-issue-03-oficio-color-sinbordes-print.pdf`.
- **Locations** — `lib/mx-locations.ts` (ESTADOS + INEGI/envia codes).
- **Notifications** — `lib/telegram.ts`, `lib/email.ts`, notification-prefs infra.
- **Listing creation** — seller listing create/edit APIs + R2 upload (`lib/r2.ts`), also MCP-exposed.
- **Subdomain paywall** — `subdomain.paywall_enabled` (fail-open default `false`, `lib/flags.ts`),
  middleware 301 gate, `SubdomainSection` upsell, cutover-only grandfather backfill.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 0 | US-0.1 Subdomain paywall not gating new sellers — repro → root-cause → fix + regression spec | **high** |
| 1 | US-1.1 Hero copiable prompt = the promoter agent prompt (single source) | low |
| 1 | US-1.2 Context-aware agent-sheet preamble (keep `/agent` + ucp.dev; role framing per context) | low |
| 1 | US-1.3 CTA + wording sweep ("Aplica para ser promotor" · "empieza a ganar hoy" · stale-copy fixes · benefit-first features) | low |
| 1 | US-1.4 Real earnings + per-SKU regular-vs-promoter price table from admin config | low |
| 1 | US-1.5 Handbook — sell-sheet → "Manual del promotor" (day-to-day cheatsheet) | low |
| 2 | US-2.1 Public promoter application form → store + Telegram/email to admin | low |
| 2 | US-2.2 Admin approve/reject → code minted + sent to applicant → finish signup | med |
| 3 | US-3.1 Bundle + per-SKU promoter pricing config (admin) + display everywhere | med |
| 3 | US-3.2 Subdomain first-year-free via promoter attribution (one-time grant + lapse) | **high** |
| 3 | US-3.3 2x1 printed ad — pay 1 edition, ad cloned + comped into the next | med/high |
| 4 | US-4.1 Transfer checkout option (SPEI/DiMo/CoDi): owed = price − commission; promoter marks paid | **high** |
| 4 | US-4.2 Admin approval → entitlement/grant activation + auto-notification; reject/expire path | **high** |
| 5 | US-5.1 Photos + real listings in the close workspace | med |
| 5 | US-5.2 Predefined estado/municipio location lists (replace free text) | low |
| 5 | US-5.3 Zine coverage honesty notice (shop location vs edition `coverage_zones`) | low |
| 5 | US-5.4 Ad design in the close flow (reuse ad builder) + merchant reviews later from panel | med |
| 5 | US-5.5 Merchant receipt email after a promoter close (what they bought + what's next) | low |
| 5 | US-5.6 Downloadable zine ad-rate template PDF (placeholders + live tier pricing) | low/med |

## Deploy order
**S0 first** — independent + urgent; if the root cause is the flag row, flipping it ON is an ops step
owed to Daniel (Supabase `platform_flags` is shared dev/prod — see LEARNINGS). **S1 → S2**
frontend-leaning, flag-safe, land before any money change. **S3 backend-first** where grants are
touched (merge backend → deploy → seed/config → flip, per LEARNINGS). **S4 behind
`promoter.transfer_enabled`** (default OFF — code merges dark; activate deliberately). **S5**
additive. HIGH stories → **Daniel merges**. Every frontend PR gets a Vercel preview; announce any
`middleware.ts`/shared-surface touch.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (money/auth smokes owed to Daniel, declared per sprint)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated (08 promoter line + 06/07 lines where behavior changed)
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] `build-order.mjs` regenerated in the same PR as any `status:` flip
- [ ] Feature branch deleted; scope-doc frontmatter flipped to `status: shipped`

## Sprints
- [sprint-0.md](sprint-0.md) — ✅ closed 2026-07-02, not reproducible (PR #160) — Bug: subdomain paywall not gating new sellers.
- [sprint-1.md](sprint-1.md) — Landing v2: say the true offer (prompt, preamble, CTAs, earnings, handbook).
- [sprint-2.md](sprint-2.md) — ✅ merged 2026-07-03, PR [#163](https://github.com/danybgoode/miyagisanchezcommerce/pull/163) → `de56db3` — Become a promoter: self-serve application flow.
- [sprint-3.md](sprint-3.md) — ✅ merged 2026-07-03, PR [#165](https://github.com/danybgoode/miyagisanchezcommerce/pull/165) → `3f25623` — The offer: bundle pricing, free-first-year subdomain, 2x1 print ad.
- [sprint-4.md](sprint-4.md) — 🚧 built, PR [#167](https://github.com/danybgoode/miyagisanchezcommerce/pull/167) open (awaiting Daniel's merge) — Street money: net remittance + admin approval.
- [sprint-5.md](sprint-5.md) — Close-flow completeness: listings, locations, coverage, ad design, receipt, rate card.
