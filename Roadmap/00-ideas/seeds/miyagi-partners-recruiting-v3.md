---
title: "Miyagi Partners proposition and recruiting portal v3"
slug: miyagi-partners-recruiting-v3
status: scaffolded
area: "08"
type: feature
priority: wave-1
appetite: M
underwritten_by: null
risk: high
epic: "08-growth-and-promotions/miyagi-partners-recruiting-v3"
build_order: "#US-2"
updated: 2026-08-03
---

# Pitch — Miyagi Partners proposition and recruiting portal v3

## The ask

**As an** owner-led commerce operator managing several distinctive independent brands, **I want**
to understand Miyagi's founding operator program, see its boundaries, and submit three real client
shops for review, **so that** I can evaluate a safer independent-commerce operating model without
putting a client into a forced migration.

Miyagi Partners becomes the professional umbrella. **Founding Commerce Operator** is the primary US
pilot track. **Promotor** remains the accessible Mexico entry track and keeps its current economics,
application, close, and workspace paths.

## Appetite and lane

- **Appetite:** M — enough to make operator recruitment and activation self-serve, not enough to
  build the later US commerce pilot, a certification program, or new partner economics.
- **Class / archetype:** Feature / Grower.
- **Lane:** shaped bet.
- **Stage 2.5:** genuinely new recruitment behavior, delivered mostly by reusing shipped surfaces.
  The public `/us` hypothesis and mailto can communicate the idea today; structured three-shop
  application, track-aware approval, and neutral partner activation do not exist.

## Problem

Miyagi already possesses more partner infrastructure than its public proposition admits:
multi-shop credentials and grants, a scoped partner workspace, activation and stewardship views,
consent-safe merchant operations, a Promotor application funnel, and admin review. But a US
commerce operator currently encounters a research-hypothesis page ending in email, while the only
self-serve program is branded and modeled as **Promotor**.

That creates three problems:

1. a qualified operator cannot identify a professional track or submit the three-shop commitment
   the pilot actually needs;
2. reusing the Promotor application unchanged would ask the wrong questions and imply commission
   economics that do not exist for the founding operator;
3. creating a separate “agency” identity, dashboard, or CRM would duplicate the authorization and
   relationship rails already shipped.

The current Shopify benchmark makes the trust bar explicit: partner programs distinguish program
identity from merchant-owned access, and merchants retain control over collaborator permissions.
Miyagi should meet that legibility without copying Shopify's tiers, badges, scale, revenue share,
or certification claims.

Current references:

- [Shopify Partner Program overview](https://help.shopify.com/en/partners/partner-program/about)
- [Shopify client-store access and merchant-controlled collaborations](https://help.shopify.com/en/partners/manage-clients-stores/manage-access)
- [Shopify Partner account and workspace surfaces](https://help.shopify.com/en/partners/manage-account)
- Agency decision baseline:
  `../../../../madmen/clients/miyagi-sanchez/us-operator-needfinding-spike-outcome-2026-08-03.md`
- Recruitment and copy source:
  `../../../../madmen/clients/miyagi-sanchez/us-pilot-recruitment-page-brief.md`

## Product decision

Use `/us` as the US founding-operator recruitment surface. Do not create a second public
`/partners` page beside the existing authenticated `/partner` workspace in v1.

The page presents the Miyagi Partners umbrella and two honest tracks:

1. **Founding Commerce Operator — United States:** owner-led operator responsible for 3–10 active
   shops; submits three candidate URLs for a no-cutover review.
2. **Promotor — Mexico:** existing in-person acquisition and commission track; links to the shipped
   `/vende/promotor` application and preserves its Spanish-language operating path.

The operator application extends the existing partner application/review lifecycle. Approval
creates the same underlying partner identity and neutral activation path used by partner access;
the track is descriptive and programmatic, never a new authorization role. Shop access still
requires explicit `partner_grants` and merchant/admin action. Application approval grants no shop
access, marketplace admission, or US commerce readiness.

## Message hierarchy

1. **Program:** Miyagi Partners · Limited US founding pilot.
2. **Promise:** Give three client shops a safer path to independence.
3. **Mechanism:** Map the incumbent stack, run Miyagi in parallel, and prove the critical order
   lifecycle before any merchant decides whether to switch.
4. **Operator value:** One scoped operating relationship across three client shops, with fewer
   disconnected dependencies.
5. **Merchant assurance:** The incumbent remains live; each merchant controls access and cutover.
6. **First behavior:** Submit three shops for review.

Do not lead with “agentic,” “federated,” “sovereignty,” “all-in-one,” “fully autonomous,” or
“Shopify killer.” Describe AI as scoped assistance with previews, confirmations, and logs.

## Bill of materials

| What | Why |
|---|---|
| Track truth model | Distinguish Founding Commerce Operator from Promotor without creating a second identity or authorization system |
| `/us` recruitment page v3 | Turn the shipped research invitation into the outreach destination and explain the no-cutover proof |
| Structured three-shop application | Make the first desired behavior possible without email back-and-forth or requesting secrets |
| Existing admin review extended by track | Let operations qualify the operator, consent path, shops, dependencies, and 90-day commitment in one queue |
| Track-aware approval | Preserve one application-to-partner lifecycle while preventing Promotor economics/copy from leaking into the operator offer |
| Neutral partner activation | Let an approved operator bind a signed-in account and enter `/partner` without pretending to be a street Promotor |
| Honest workspace orientation | Show track, current access, pilot status, confirmation boundaries, and next step using the shipped `/partner` workspace |
| Funnel measurement | Measure qualified applications and three-shop commitments separately from generic visits and Promotor applications |
| Flag-off continuity | Keep today's `/us`, `/vende/promotor`, Promotor approval, close, commissions, and `/partner` behavior intact until the cohort is enabled |

## What already exists — reuse, do not rebuild

| Capability | Existing surface | Reuse decision |
|---|---|---|
| US invitation | `/us` | Replace the mailto-only hypothesis with the approved operator proposition and application; preserve an honest invitation state |
| Public growth page system | `/vende` section primitives, design tokens, metadata and copy patterns | Reuse its accessible content/form language where it fits; do not force the US page into an es-MX persona registry |
| Promotor application | `marketplace_promoter_applications`, validation, rate limit, honeypot, notifications, admin approve/reject | Extend with a first-class track and versioned operator details; do not create another applications table or generic form builder |
| Partner identity | approved `marketplace_promoters` record bound to Clerk | Add a descriptive program track; do not introduce an agency credential namespace |
| Partner authorization | `partner_grants`, `ms_partner_`, manager/viewer, seller revoke and audit | Leave authorization semantics unchanged; operator approval never creates a grant |
| Partner workspace | `/partner` and stewardship portfolio | Add track-aware orientation and next action; do not build a second dashboard |
| Merchant relationship operations | relationship CRM, consent evidence, lifecycle history, next actions and scorecard | Reuse later when a candidate shop enters the pilot; do not write merchant consent from the operator application |
| Admin operations | `/admin/promoter`, activation scorecard and existing notifications | Add track filters/summary in the existing review queue |
| Feature controls | typed Miyagi catalog + Golden Beans production authority; `platform_flags` fallback/shadow | One enablement flag covers the new public, application, approval and activation behavior |
| Analytics | existing privacy-safe seller-acquisition/GTM event patterns | Add PII-free funnel events; URLs, contact data and application text never enter analytics |

## Data and permission contract

- Extend the existing application record with a first-class track and a versioned, validated
  operator-details object. Required operator facts include company/role, active-shop count, three
  candidate URLs, platforms/channels, merchant-consent status, recent operating problem,
  must-retain systems, why now, and 90-day checkpoint availability.
- Do not request passwords, API keys, customer data, exact revenue, or regulated personal data in
  the public application.
- Extend the existing approved partner identity with a descriptive track. Existing rows resolve to
  `promoter`; no existing economics or access changes.
- `partner_track` must never be used as a substitute for a grant. `partner_grants` remains the only
  client-shop authorization truth.
- Application consent status is a qualification statement, not merchant consent evidence. Real
  discovery access and parallel-shop permission remain separately captured in the existing consent
  and relationship rails during `#US-3`.
- Approval, account binding, shop access, real-order permission, and case-study permission are five
  separate decisions.

## Scope — v1

### In

- English-first `/us` Miyagi Partners recruitment page using the approved message hierarchy;
- Founding Commerce Operator and existing Promotor track choice;
- three-shop operator application with server validation, anti-abuse controls and clear consent
  language;
- existing admin queue extended with track, qualification facts and candidate-shop summary;
- approve/reject behavior that creates the existing partner identity with the selected track;
- neutral approved-partner activation/binding into `/partner`;
- track-aware `/partner` header, empty state, program boundaries and next action;
- existing Promotor application, approval, commission, close and dashboard regression coverage;
- PII-free funnel events from page view through qualified application and activation;
- application/approval/activation emails with honest pilot boundaries and no unproved claims.

### Out

- US payment, tax, shipping, checkout or catalog parity — `#US-3`;
- automatic Shopify/WooCommerce discovery or import from the application;
- automatic creation of shops, merchant relationships, consent records or partner grants;
- marketplace admission or a public US catalog;
- recurring operator commissions, revenue share, pricing, certification, tier badges or income
  claims;
- partner directory, lead marketplace, public profile, team seats or agency CRM;
- a new partner dashboard, identity table, credential namespace or permission role;
- Little Blue Market/white-label marketplace functionality;
- paid acquisition, automated cold outreach, or outbound messaging from the product;
- changes to the Promotor offer, SKU economics, settlement or existing Spanish funnel;
- an external customer-facing adoption of “original commerce”; use plain language instead.

## Rabbit holes and patched decisions

### “Partners” public route versus workspace route

Do not add `/partners` beside `/partner` in this appetite. `/us` is already the honest US invitation
and is the URL outreach needs. `/partner` stays the authenticated operating workspace.

### Operator identity versus Promotor identity

The shipped authorization model explicitly anchors a partner to the approved Promotor-backed
record. Extend it with a track and neutral activation. A second identity would duplicate grants,
audit, Clerk binding, admin review and workspace resolution.

### Program track versus authorization role

`founding_operator` and `promoter` describe how someone entered and what offer applies. They do not
confer `manager` or `viewer`. Only a merchant/admin grant does that.

### Three submitted URLs versus merchant permission

An operator may nominate a shop URL for review. That does not authorize data access, contact,
migration, or case-study use. The UI and admin queue must preserve that distinction visibly.

### Economics

Promotor economics are already real and may be shown only on the Promotor path. The founding
operator pilot has no Miyagi platform or migration fee during proof and no promised future revenue
share. Avoid implying this pilot price is a permanent plan.

### Language

The US page and founding-operator lifecycle are English-first. Authenticated lifecycle copy uses an
allow-listed English/Spanish dictionary namespace and exposes a Spanish option. The Promotor track links
into the existing es-MX funnel. Do not translate or rewrite the live Promotor offer as incidental scope.

## Stories and slices

### Sprint 1 — Apply: proposition, tracks and three-shop review

#### Story 1.1 — Miyagi Partners US proposition and track router

**As a** prospective operator, **I want** to understand the founding proof and distinguish it from
the Promotor program, **so that** I choose the correct path without reading a platform feature list.

**Acceptance:** with the v3 flag on, `/us` shows the approved promise, four-step parallel-proof
mechanism, fit/not-fit criteria, program boundaries, primary operator CTA and secondary Promotor
link. Claims distinguish live Mexico capability from what the US pilot will prove. With the flag
off, today's invitation remains.

**Risk:** low. **QA:** pure page/config claim spec plus browser smoke on desktop/mobile.

#### Story 1.2 — Structured operator application

**As a** qualified operator, **I want** to submit my operating profile and three candidate shops,
**so that** Miyagi can assess a real pilot without asking for secrets or cutover commitment.

**Acceptance:** required qualification fields and exactly three valid shop URLs are validated on
client and server; anti-abuse controls remain; the response is honest and idempotent enough to
avoid accidental duplicate review; no sensitive fields are requested; URLs and application text
never enter analytics.

**Risk:** high — additive DB migration and public write. **QA:** application-contract API spec,
validation mutation observed red, rate-limit/honeypot regression, browser submit smoke.

#### Story 1.3 — Track-aware admin review and notification

**As an** operator-program reviewer, **I want** one queue showing track, qualification, candidate
shops and consent status, **so that** I can approve, reject or request a conversation without
confusing the founding offer with Promotor economics.

**Acceptance:** existing Promotor rows render and decide exactly as today; operator rows show the
structured summary and links safely; reviewer notifications name the track and contain no secrets;
approve/reject is race-safe and audited; no merchant is contacted automatically.

**Risk:** high — admin/auth plus migrated record. **QA:** API transition/concurrency spec, admin
authorization spec, browser review smoke owed to Daniel.

#### Story 1.4 — Privacy-safe recruitment measurement

**As the** product owner, **I want** to distinguish visits, track choices, starts, valid three-shop
submissions and disqualification reasons, **so that** we improve qualified commitment rather than
optimize vanity traffic.

**Acceptance:** events contain track, stage and coarse source only; never URLs, company/contact
fields, free text or merchant data; Promotor and operator funnels remain separable.

**Risk:** low. **QA:** event allowlist/privacy spec; no browser smoke beyond S1 walkthrough.

### Sprint 2 — Activate: one identity, honest workspace

#### Story 2.1 — Track-aware approval on the existing partner identity

**As an** approved founding operator, **I want** my program track preserved when my partner identity
is created, **so that** I enter the correct offer without changing authorization semantics.

**Acceptance:** approving an operator creates or links the existing partner identity with
`founding_operator`; existing identities resolve to `promoter`; retries do not mint duplicates;
approval creates no merchant relationship or shop grant; Promotor commissions remain isolated.

**Risk:** high — identity/auth-adjacent migration. **QA:** transition/idempotency spec plus a
population guard proving track never authorizes a shop.

#### Story 2.2 — Neutral partner activation and binding

**As an** approved operator, **I want** a neutral sign-in and binding path, **so that** I can enter
Miyagi Partners without using a Promotor close workflow that misrepresents my role.

**Acceptance:** the approval message leads to a neutral route; authentication and existing binding
rules are reused; invalid, rejected, used, or mismatched activation attempts fail closed; successful
activation enters `/partner`; no shop access exists until a separate grant.

**Risk:** high — Clerk binding/auth. **QA:** activation API/auth matrix, replay denial and browser
auth smoke owed to Daniel.

#### Story 2.3 — Track-aware `/partner` orientation

**As an** activated partner, **I want** to see my program, current permissions and next pilot step,
**so that** an empty workspace does not imply broken access or an available US shop.

**Acceptance:** the workspace says Miyagi Partners, labels the track, explains that application
approval is not shop access, shows the next founder-review/pilot step, and retains existing granted
shops/portfolio behavior. Promotor users still see their applicable close path and economics.

**Risk:** low. **QA:** role/copy rendering spec plus browser smoke for one Promotor and one founding
operator.

#### Story 2.4 — Existing-Promotor continuity contract

**As an** existing Promotor, **I want** my application, code, earnings, close and partner workspace
to behave as before, **so that** the umbrella transition does not interrupt live operations.

**Acceptance:** flag off is behaviorally identical; flag on does not change Promotor validation,
approval, commission, transfer, close, grant or Spanish copy contracts; old records need no manual
repair.

**Risk:** low for tests, but covers high-risk shared seams. **QA:** targeted regression suite and
one production Promotor walkthrough owed to Daniel before enablement.

## Kill-switch decision

Recommend an enablement flag story inside Sprint 1:

1. **Flag:** `partners.recruiting_v3_enabled`.
2. **Polarity:** enablement/dark launch; default **false** and created **DISABLED** in every
   environment. Flip only for the founding recruitment cohort.
3. **Seam:** one server-side recruiting-version resolver gates the `/us` v3 page, operator-track
   application acceptance, track-aware approval, neutral activation and workspace orientation.
4. **Mechanism:** typed Miyagi resolver with Golden Beans as production authority; a disabled
   `platform_flags` row is fallback/shadow only. No middleware or Edge mechanism is required.

OFF preserves today's `/us` invitation and all Promotor behavior. Additive schema remains inert.

## UX heuristics and rails check

- Reuse the existing seller-acquisition typography, spacing, buttons, form controls and design
  tokens where they serve the US page; no new visual system.
- One primary behavior per surface: operator application on `/us`, Promotor application on
  `/vende/promotor`, activation in the neutral approved-partner flow.
- Mobile form groups three candidate shops visibly; errors attach to the relevant shop/field and
  preserve entered data.
- Make “application,” “approval,” “shop access,” and “pilot acceptance” visually and verbally
  distinct.
- Keep the fit/not-fit criteria and pilot boundaries visible before submission.
- CI: design-token guard, doc-format/build-order guards, application API specs, admin auth specs,
  partner authorization specs and analytics privacy assertions.
- Audit lens: apply the current trust/messaging and seller-activation findings; do not place a
  boycott claim, fake testimonial, unsupported counter or ambiguous “free forever” message.
- Design-language debt intentionally left alone: the existing Spanish Promotor mini-site and old
  `/partner` internals are not a rebrand sweep.

## Definition of Ready / acceptance for the epic

- [x] Role, job, outcome and first behavior are explicit.
- [x] Appetite M and shaped-bet lane recorded.
- [x] Stage 2.5 bucket named and the lighter `/us` reuse chosen.
- [x] Current platform and competitor reality checked.
- [x] Bill of materials, rabbit holes and no-gos written.
- [x] Platform-first reuse list names the existing application, identity, grant, workspace and CRM
      rails.
- [x] Data ownership and permission boundaries are explicit.
- [x] Every story is independently testable, risk-tiered and names QA/smoke.
- [x] High-risk kill-switch decision recorded.
- [x] Product owner approves this pitch and its two-sprint boundary (2026-08-03).

## Product-owner smoke ownership

Daniel owns the authenticated/admin production smokes because they require a disposable Promotor,
a founding-operator application, admin approval, Clerk binding, and verification that neither
identity receives unintended shop access. The builder supplies exact preview URLs, fixtures and
step-by-step walkthroughs in each sprint document.
