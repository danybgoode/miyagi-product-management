---
title: "Tiendas Fundadoras acquisition surface"
slug: tiendas-fundadoras-acquisition
status: scaffolded
area: "08"
type: feature
priority: "#3-fm"
risk: high
epic: "08-growth-and-promotions/tiendas-fundadoras-acquisition"
build_order: "#3-fm"
updated: 2026-07-20
---

# Scope — Tiendas Fundadoras acquisition surface

## Outcome & signal

A qualified CDMX merchant can understand the finite Tiendas Fundadoras offer, give explicit permission to be
contacted or previewed, and enter the same activation pipeline with promoter and campaign attribution intact.
The page sells a white-glove outcome for the first 25 shops—not the platform's entire feature inventory.

Daniel can test the result by visiting `/vende/fundadoras?utm_source=field-test&promo=PRM-...`, submitting a
disposable eligible merchant, and confirming one attributed relationship appears at the correct first stage
with the selected permission state. Golden Beans must record the funnel without receiving the submitted PII.

## Stage-2.5 bucket

**Light enhancement over the shipped acquisition/CMS system.** `/vende` and its persona routes already share
one page-config renderer, runtime copy overrides, analytics gating, UTM handling and agent-readable marketing
surfaces. The only genuinely new edge is the campaign-specific public intake into the activation relationship.

## Scope

**In v1:**
- `/vende/fundadoras` as a thin route using the existing `/vende` renderer and design system.
- One CMS namespace/section for the campaign: finite 25-shop cohort, eligibility, what the white-glove activation
  includes, what it does not promise, expected time/effort, privacy/permission copy and the next step.
- A short application: business/contact preference, location, category/current channel, promoter code and
  campaign attribution, plus separate contact and preview-permission choices.
- Create or enrich the canonical merchant relationship through `founding-merchant-activation-ops`; never drop
  campaign applicants into a second leads table or directly into generic `/sell`.
- Static metadata, canonical, OpenGraph/Twitter image/copy and agent-readable campaign copy aligned with the
  runtime page—not stale hard-coded launch language.
- PII-free funnel events for view, eligibility start/result, application start/submission and permission choice.
- A clear full/waitlist state when 25 accepted merchants have been reached; no false scarcity counter.

**Out of v1:**
- A new page builder, redesign of the other `/vende/*` pages, paid media buying or a general campaign CMS.
- A/B testing at launch. The first experiment belongs to Golden Beans `experiment-governance-v2` after the
  event and journey contracts are stable.
- Guaranteed sales, guaranteed acceptance, invented testimonials or implied merchant consent.
- Autonomous follow-up, CRM workflows or partner compensation changes.

## What already exists (reuse, don't rebuild)

| Existing capability | Reuse decision |
|---|---|
| `/vende/_components/page-config.ts` + shared acquisition renderer | New campaign config, not a bespoke layout. |
| `/admin/contenido` + `platform_copy_overrides` | Runtime-editable campaign copy with the same preview/save workflow. |
| Existing `/vende` SEO/OG/browser specs | Extend route coverage and metadata parity. |
| GTM loader, analytics gating and UTM conventions | Preserve current collection; add a small PII-free event vocabulary. |
| Promoter code/attribution rail | Carry valid promoter attribution into the relationship. |
| `founding-merchant-activation-ops` | Canonical public-intake destination and consent/stage contract. |
| `founding-merchant-consent-previews` | Permission wording and evidence; preview permission is never inferred. |
| Golden Beans SDK/router | One event stream; CRM projection and experiments consume downstream. |

## UX heuristics & rails check

- **CI guards covering this surface:** seller-acquisition copy/route/browser specs, analytics-gating specs,
  CMS override route/preview specs and es-MX copy guard. Add application validation/rate-limit/attribution specs.
- **Audits-lens findings that apply:** protect guest-first conversion without letting a public form bypass
  authorization or leak whether a merchant already exists; keep claims honest and date/source any comparison.
- **Design-language debt:** none requiring a new system. Use the shipped acquisition page rhythm and components;
  keep the form phone-first, short, single-column and explicit about why each contact field is requested.

## Kill-switch / runtime gate (risk:high only — Stage 6b)

Use enablement flag `growth.founding_merchants_enabled`, default **false** and created **disabled**. Gate the
campaign route's application CTA and public write route; the disabled state may show a truthful closed/waitlist
page but must not accept records. The additive CMS keys can ship safely before the flag flips.

## Delivery slices

1. **Campaign surface:** page config, final es-MX copy, CMS keys, responsive route, metadata/OG and truthful
   closed/full state.
2. **Attributed application:** public validation/rate limiting, canonical CRM enrichment and dedupe, separate
   permission choices, Golden Beans events and the launch smoke/checklist.

## Acceptance criteria

1. `/vende/fundadoras` renders through the shared acquisition system at mobile and desktop widths.
2. Runtime CMS edits change the visible page and its routed preview; metadata/OG describe the same offer.
3. A valid submission creates or enriches exactly one merchant relationship with UTM, cohort and valid promoter
   attribution; retries are idempotent.
4. Contact permission and preview permission are stored separately and neither defaults to granted.
5. Invalid/abusive requests fail without leaking whether a phone/email already exists.
6. Golden Beans receives funnel and permission-choice events under an opaque subject id with no submitted PII.
7. When the cohort is full or the flag is off, the page makes that state clear and does not accept applications.

## Open risks / research

- The public PII write makes this HIGH risk even though the page itself is a thin reuse. Scaffold only after the
  activation relationship/intake contract is approved; do not improvise a temporary waitlist table.
- Daniel must approve the final eligibility rules, exact white-glove inclusions and what “25” counts (accepted,
  activated or live). Until then those are editable campaign decisions, not facts to hard-code.
- Experiment treatment/control copy is deliberately deferred; launching with an ungoverned `?v=b` fork would
  split the source of truth before baseline activation data exists.
