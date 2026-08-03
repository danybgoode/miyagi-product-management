---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: miyagi-partners-recruiting-v3
---

# Epic: Miyagi Partners proposition and recruiting portal v3

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Archetype:** Grower · **Appetite:** M · **Scope seed:** [`00-ideas/seeds/miyagi-partners-recruiting-v3.md`](../../00-ideas/seeds/miyagi-partners-recruiting-v3.md)

## Why

Miyagi already has a Promotor funnel, multi-shop partner credentials and grants, a partner workspace,
merchant stewardship, consent-aware operations and an activation scorecard. A qualified US commerce
operator still reaches a research page ending in email and cannot submit the three real client shops the
pilot requires. This epic makes **Miyagi Partners** the honest professional umbrella: a founding US operator
can understand the no-cutover proof, apply with three shops, activate one existing partner identity and enter
the shipped workspace without pretending to be a commission-based street Promotor.

The first product behavior is a qualified three-shop application. It is not a merchant cutover, automatic
shop access, US marketplace admission or a claim that the US commerce pilot has already passed.

## Decisions locked at scope approval

1. `/us` is the public US operator-recruitment surface; v1 does not add a second public `/partners` route
   beside the authenticated `/partner` workspace.
2. The two visible tracks are **Founding Commerce Operator — United States** and the existing
   **Promotor — Mexico**. Promotor retains its current Spanish funnel and proven economics.
3. The existing approved-Promotor-backed partner identity is extended with a descriptive program track.
   A second operator identity, dashboard, credential namespace or grant system is forbidden.
4. Program track never authorizes a shop. Only `partner_grants` confers `manager|viewer` access, and
   merchant/admin intent remains authoritative.
5. Nominating three public shop URLs is not merchant consent. Discovery access, parallel-shop permission,
   real-order permission and story permission remain separate later decisions.
6. The founding proof charges no Miyagi platform or migration fee during its 90-day working window, but
   this is not advertised as permanent pricing and no operator revenue share is promised.
7. All new behavior ships dark behind `partners.recruiting_v3_enabled`; OFF preserves today's `/us` and
   every Promotor behavior.

## Platform-first note

The existing Supabase application and partner records own program identity and non-commerce qualification.
Medusa remains authoritative for sellers, products, orders, payments and US commerce readiness. The existing
relationship/consent rails own merchant permission evidence. This epic may extend the application and partner
records additively; it may not copy commerce state or manufacture consent from an operator's nomination.

## What already exists — reuse, do not rebuild

| Capability | Existing seam | Reuse |
|---|---|---|
| US invitation | `/us` | Turn the mailto-only hypothesis into the approved proposition and application while retaining the invitation boundary |
| Growth-page language | `/vende` section/form patterns, metadata and design tokens | Reuse accessible patterns without forcing the English US page into the es-MX persona registry |
| Application/review | `marketplace_promoter_applications`, server validation, rate limit, honeypot, notifications and admin approve/reject | Add a track and versioned operator details; no second application table or form platform |
| Partner identity | approved `marketplace_promoters` record bound to Clerk | Add descriptive track with existing rows resolving to Promotor |
| Authorization | `partner_grants`, `ms_partner_`, manager/viewer, seller revoke and call audit | Leave semantics byte-for-byte authoritative; approval creates no grant |
| Workspace | `/partner` plus stewardship portfolio | Add track-aware orientation and next action; no second dashboard |
| Merchant operations | relationship CRM, consent evidence, lifecycle history and activation scorecard | Consume only after a merchant separately enters the pilot; never write consent from the application |
| Admin operations | `/admin/promoter` and existing notifications | Extend one review queue with track and qualification summary |
| Feature control | in-house `platform_flags` | One server-side enablement seam covers public, application, approval, activation and workspace behavior |
| Measurement | privacy-safe seller-acquisition/GTM events | Emit coarse funnel state only; never URLs, contact fields or free text |

## Epic-mode architecture lock — required before Sprint 1 starts

This is a HIGH epic involving additive schema and Clerk-bound identity. The epic-mode architect must verify
the live code **and live database** before delegating either sprint, then replace this section with numbered
decisions `D1…Dn` and add a per-sprint build contract. At minimum, lock:

- current row counts, constraints and deployed columns for `marketplace_promoter_applications` and
  `marketplace_promoters`;
- the smallest versioned operator-details shape and migration/backfill for existing Promotor rows;
- duplicate-application and concurrent-approval behavior;
- the neutral activation token/link and the one existing Clerk-binding seam it reuses;
- the single flag resolver that covers every new route while leaving old Promotor paths untouched;
- the analytics event allowlist and proof that candidate URLs/free text cannot enter it;
- the exact regression population for Promotor application, approval, commissions, close, grants and
  workspace behavior.

If live DB state is unavailable, stop and escalate rather than treating migration files as deployed truth.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Miyagi Partners US proposition and track router | low |
| 1 | 1.2 Structured three-shop operator application | high |
| 1 | 1.3 Track-aware admin review and notification | high |
| 1 | 1.4 Privacy-safe recruitment measurement | low |
| 2 | 2.1 Track-aware approval on the existing partner identity | high |
| 2 | 2.2 Neutral partner activation and binding | high |
| 2 | 2.3 Track-aware `/partner` orientation | low |
| 2 | 2.4 Existing-Promotor continuity contract | low, covering high shared seams |

## Kill-switch

`partners.recruiting_v3_enabled` is an enablement flag in `platform_flags`, default **false** and created
disabled in every environment. One server-side recruiting-version resolver gates the `/us` v3 page,
operator-track application acceptance, track-aware approval, neutral activation and workspace orientation.
OFF preserves the current `/us` invitation and all Promotor behavior; additive schema remains inert.

## Explicit exclusions

- US payments, tax, shipping, checkout, imports or catalog parity (`#US-3`);
- automatic shop creation, merchant contact, relationship/consent records or grants;
- marketplace admission or a public US catalog;
- operator commissions, revenue share, certification, tiers, badges, income claims or permanent pricing;
- public partner directory, team seats, agency CRM or lead marketplace;
- outbound automation, paid acquisition or marketplace-operator white-labeling;
- changes to Promotor SKUs, compensation, settlement or the existing Spanish offer.

## Build and review strategy

Use repository-local epic mode. One architect performs the locking pass, then the two sprint boundaries run
as a stacked assembly line: `feat/miyagi-partners-recruiting-v3` → `feat/miyagi-partners-recruiting-v3-s2`,
one PR per sprint, merged in order. Sprint 1 lands the disabled flag, additive application contract and public
recruitment path. Sprint 2 consumes the locked identity contract for approval, activation and workspace
orientation. Do not enable the cohort between sprints.

Both PRs are **HIGH overall** because Sprint 1 carries a DB migration/public write and Sprint 2 carries
identity/auth changes. Each needs the deterministic gate, mandatory cross-family review, mandatory fresh
reviewer, and Daniel merge authorization. Builders never apply migrations. The orchestrator applies each
approved additive migration through the authorized rail, verifies the live schema, and only then permits code
that reads it to merge.

After both sprints deploy, enable only for a disposable founding-operator cohort after the full
operator-versus-Promotor authorization matrix and walkthrough are green.

## Definition of Done

- [ ] Epic-mode architect locked and documented `D1…Dn` against live code and live DB before delegation.
- [ ] Both sprint PRs merged in order to `main`, deployed and smoke-tested; gaps stated.
- [ ] Every new spec was observed red at least once through a deliberate implementation mutation.
- [ ] `/us` accepts a valid three-shop operator application without collecting secrets or implying consent.
- [ ] Admin can review/decide both tracks without leaking operator copy or economics into Promotor.
- [ ] Approved operator activates through a neutral path and reaches `/partner` with zero implicit shop grants.
- [ ] Existing Promotor application, approval, code, economics, close, grant and workspace behavior remains.
- [ ] `partners.recruiting_v3_enabled` exists disabled in every environment, then is enabled only after Daniel's smoke.
- [ ] Each sprint doc carries final commit refs and a real-URL smoke walkthrough.
- [ ] `RETROSPECTIVE.md`, product poster and any genuinely durable learning are updated at close.
- [ ] Feature branches deleted and `node scripts/build-order.mjs` regenerated after status flips to `shipped`.
