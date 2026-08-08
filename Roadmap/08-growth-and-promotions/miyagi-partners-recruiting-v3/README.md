---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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
| Feature control | Golden Beans production authority + typed Miyagi catalog + `platform_flags` fallback/shadow | One server-side enablement seam covers public, application, approval, activation and workspace behavior |
| Measurement | privacy-safe seller-acquisition/GTM events | Emit coarse funnel state only; never URLs, contact fields or free text |

## Epic-mode architecture lock — completed 2026-08-06

The architect inspected current frontend code and the live shared Supabase project before implementation.
The evidence was collected through schema metadata, index metadata and exact count-only REST reads; no
application row contents were exported.

### Live evidence

- `marketplace_promoter_applications`: **0 rows**. Deployed columns are `id`, `name`, `email`, `whatsapp`,
  `city`, `motivation`, `status`, `promoter_id`, `decided_at`, `created_at`. The primary key, promoter foreign
  key and status index exist; deployed status has no check constraint.
- `marketplace_promoters`: **2 rows**; **1** has `clerk_user_id`; **0** have a partner token or connector
  slug. Deployed columns are `id`, `code`, `name`, `clerk_user_id`, `partner_token_hash`,
  `partner_connector_slug`, `created_at`. Code, token hash and connector slug have deployed uniqueness; Clerk
  identity does not.
- `partner_grants`: **0 rows / 0 active grants**. Its deployed role check and active
  `(promoter_id, shop_id)` uniqueness remain the sole shop-authorization contract.
- Production flag authority is Golden Beans (`*=golden`), not the draft's stale `platform_flags` wording.
  Snapshot v47 has `partners.mcp_enabled` ON. `partners.recruiting_v3_enabled` is absent from both Golden and
  the local shadow/fallback table and therefore must be registered disabled as part of Sprint 1.

### Locked decisions

**D1 — one additive data model.** One migration adds `program_track text not null default 'promoter'` to
both application and partner records, checked to `promoter|founding_operator`. Existing rows backfill to
`promoter`; no manual repair or second identity table exists. The migration also adds the missing application
status check (`pending|approved|rejected`) and a partial unique index on non-null `clerk_user_id`, which makes
the existing one-Clerk-identity rule a database invariant. The observed live population makes both additions
safe. Because the three reused tables were found to expose anonymous table privileges without RLS, the same
migration enables RLS, revokes `PUBLIC`/`anon`/`authenticated` access and grants the required operations only
to `service_role`; rollout must verify both anonymous denial and service-role continuity live.

**D2 — versioned qualification, not a new form platform.** Founding-operator applications use
`operator_details_version = 1` plus a JSON object containing exactly: `company_name`, `operator_role`,
`active_shop_count`, `candidate_shops` (exactly three objects with `url`, `platform`, `channels` and
`merchant_awareness`), `recent_operating_problem`, `must_retain_systems`, `why_now`, and
`checkpoint_90_day`. Contact stays in the existing name/email/WhatsApp columns. The v1 parser rejects unknown
keys, requires at least three active shops and never accepts passwords, tokens, customer data, revenue or
regulated-person fields. Promotor rows keep null version/details.

**D3 — nomination is not consent.** `merchant_awareness` is limited to `not_contacted`,
`aware_of_nomination` or `interested_in_conversation`; none authorizes discovery, a parallel shop, real
orders, a story or access. Candidate URLs must be public `http(s)` URLs with credentials, localhost and
private/local literal hosts rejected, then canonicalized before storage. The intake performs no fetch and
writes no relationship, consent or grant.

**D4 — deterministic retry rule.** A partial unique index on normalized email permits at most one pending or
approved `founding_operator` application. A uniqueness conflict returns the same honest, status-neutral
“received for review” result, does not create a second row and does not send a second admin notification.
Rejected applicants may reapply; an approved application cannot be recreated as an ambiguous pending review.
Promotor duplicate behavior is unchanged.

**D5 — atomic operator approval.** Existing Promotor approval remains on its current conditional
`pending → approved → PRM identity` path. Founding-operator approval uses one service-role-only transactional
RPC: lock the pending application, create exactly one `founding_operator` identity with an internal `MYP-`
identifier, link it, store one activation-token hash/expiry, set invitation delivery to `pending` and mark
approved. Concurrent calls yield one identity and one active token; database failure rolls back the whole
transition. Email is explicitly outside that transaction and is never described as atomic. Approval never
writes grants, merchant records or consent. The admin `withAdmin` wrapper remains the audit writer.

**D6 — Promotor economics are track-isolated.** PRM code lookup/binding, manual Promotor lists,
attribution, commission, transfer, earnings and close helpers explicitly resolve only `program_track =
'promoter'`. Track-aware identity lookup may return either track for `/partner`. Shared partner-auth and
portfolio credential seams may read `program_track` only to apply the recruiting kill-switch before rate,
grant or portfolio work; track never authorizes a shop or changes grant scope. Internal MYP identifiers are
not displayed or accepted on a Promotor route.

**D7 — one Clerk-binding writer.** The existing binding update moves behind a service-role-only database
function that enforces idempotent same-user binding, rejects an identity or Clerk user already bound
elsewhere, and relies on D1's unique Clerk index. `bindPromoterClerkId` continues to validate a PRM code and
then calls that writer. Neutral activation calls the same writer inside its transaction; no second binding
implementation is allowed.

**D8 — recoverable invitation and principal-bound activation.** Approval creates a 32-byte random base64url
secret for `/partner/activate/<token>`; only its lowercase SHA-256 hash and a seven-day expiry are stored.
Sprint 2 adds `sendFoundingOperatorActivationInvitationWithOutcome`, an additive helper that returns either
`{ ok: true, providerMessageId }` from a non-null Resend acceptance ID or `{ ok: false, kind: 'unconfirmed' }`;
existing `Promise<void>` email callers remain unchanged. The route awaits that helper and records
`provider_accepted|unconfirmed`, attempt time/count and `provider_accepted_at` without ever claiming mailbox
delivery or persisting plaintext. Only the explicit success result may set `provider_accepted`. A missing
configuration, null ID, exception or ambiguous network result is `unconfirmed` and leaves the approved
identity recoverable: an audited
admin rotate-and-resend action transactionally replaces the unused hash/expiry and marks delivery `pending`
before sending, so any older link becomes invalid; its result is recorded only when the hash still matches.
A crash between rotate, send and result recording therefore leaves a visible retry state, never a lost
unrecoverable identity. Multiple emails may exist after an ambiguous provider result, but exactly one newest
token can activate. The invitation, neutral activation and founding-operator workspace copy use the
allow-listed `partnersRecruiting` dictionary namespace with matching English and Spanish keys. The United
States journey defaults to English and exposes an explicit Spanish option; shared Promotor notifications
and surfaces retain their existing Spanish copy and behavior.

GET only validates/displays and signed-out users return through Clerk's encoded `redirect_url`; a signed-in
POST performs the mutation. The bearer token alone is insufficient: the Clerk account must expose at least
one **verified email** whose normalized value exactly matches the application email. The activation RPC
receives those verified emails, rechecks the match while holding the application lock, rejects
wrong-track/rejected/expired/used/token/principal mismatches, calls D7's writer, then records one use in the
same transaction. Replays fail closed and no failed principal/bind check consumes a token. Success redirects
to `/partner` and creates zero grants.

**D9 — one feature resolver, two authorities with distinct jobs.** `recruitingV3Enabled()` is the only
runtime seam and delegates to typed `isEnabled('partners.recruiting_v3_enabled')`. It gates the `/us` v3
render, only the founding-operator branch of public intake and approval, neutral activation, only the
founding-operator workspace orientation, and every direct or credential-based operator operation. OFF is
checked before rate limits and before grant, relationship, portfolio or draft reads; storage-unavailable is
not treated as identity-absent. OFF returns the current `/us`, makes operator write/activation routes
unavailable and leaves every Promotor route unchanged. Sprint 1 registers the typed Golden definition
with default variant OFF through `flags:sync` and seeds the local fallback/shadow row disabled; Golden is the
production toggle surface. `partners.mcp_enabled` continues to govern partner credentials and current
Promotor workspace access; it is not repurposed as the recruiting switch.

**D10 — closed analytics vocabulary.** The sole client helper accepts only event names `view`,
`track_selected`, `application_started`, `application_submitted`, `application_disqualified`; track
`founding_operator|promoter`; coarse source `direct|internal|campaign|unknown`; and reason
`shop_count|shop_url|qualification|duplicate|rate_limited|flag_off|unknown` where applicable. It constructs
the analytics payload itself and drops/rejects every other key at runtime. No URL, company/contact field,
free text or merchant value can enter the helper. Analytics exceptions are swallowed and cannot affect the
form or API result.

**D11 — one review queue.** `/admin/promoter` renders track-safe structured details. Candidate links use a
new tab with `noopener noreferrer`; “request conversation” is an applicant mail link and leaves the row
pending—it is not a third authorization state and never contacts a nominated merchant. Approve/reject remain
Clerk-admin-only POSTs, race-safe and automatically audited. The operator row shows invitation provider
acceptance state—never a mailbox-delivery claim—and exposes D8's audited rotate-and-resend only for an
approved, unused operator identity. Operator
notifications name the track and link to the queue without copying secrets or candidate/free-text fields;
Promotor notifications remain as today.

**D12 — workspace admission and zero-grant truth.** A founding operator may enter `/partner` only when the
recruiting flag is ON; Promotor admission remains governed by the existing partner flag. The page labels the
track, loads shops exclusively from active `partner_grants`, and shows an explicit zero-shop state for a new
operator with no Administer shortcut. Direct relationship, portfolio and proposal APIs plus both shared MCP
partner-token entry paths enforce the same rollback before rate/data work. That founding-operator
orientation uses the bilingual
`partnersRecruiting` namespace, defaults to English for the United States journey and exposes a Spanish
option; the existing Promotor heading, code, empty state and close path stay Spanish. Existing granted/revoked
behavior is unchanged. The live pre-build and post-approval population guard must both prove zero grants
were manufactured.

**D13 — required regression population.** Every sprint runs `promoter-applications.spec.ts`,
`promoter-program.spec.ts`, `promoter-commission.spec.ts`, `promoter-earnings.spec.ts`,
`promoter-transfer.spec.ts`, `promoter-close.spec.ts`, `promoter-close-receipt.spec.ts`,
`partner-auth.spec.ts`, `partner-grants.spec.ts`, `portfolio-partner-mcp.spec.ts`, the flag catalog/admin
specs and the new recruiting specs. New population guards inspect all Promotor code/economic/bind callsites
for a promoter-track predicate and all partner authorization callsites for grant-only authority. Browser QA
covers flag OFF/ON `/us`, public intake, both admin row types, neutral activation, operator zero-grant and the
unchanged Spanish Promotor path. Every new spec is deliberately observed red before final green.

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

`partners.recruiting_v3_enabled` is an enablement flag whose production authority is Golden Beans, with a
matching typed Miyagi catalog contract and a disabled `platform_flags` fallback/shadow row. It defaults
**false** and is registered disabled in every environment. One server-side recruiting-version resolver
gates the `/us` v3 page,
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

## Definition of Done (epic)

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
