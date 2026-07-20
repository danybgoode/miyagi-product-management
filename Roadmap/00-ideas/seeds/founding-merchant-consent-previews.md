---
title: "Founding merchant consent-safe previews"
slug: founding-merchant-consent-previews
status: scaffolded
area: "08"
type: feature
priority: "#1-fm"
risk: high
epic: "08-growth-and-promotions/founding-merchant-consent-previews"
build_order: "#1-fm"
updated: 2026-07-20
---

# Scope — Founding merchant consent-safe previews

## Outcome & signal

As a Founding Merchant Partner, I want to prepare and share a private, accurate preview before a merchant is
presented publicly, so that Miyagi can prove the shop outcome without implying participation or accepting
orders before explicit approval.

Daniel can test this with a disposable unclaimed shop: create the shop and three preview products, verify that
no public search/storefront/PDP route exposes them, open the private preview link, record merchant approval,
activate, and then verify the exact approved shop/products become public while checkout remains claim-gated.

## Stage-2.5 bucket

**Light enhancement over powerful existing primitives, but a genuinely new consent state.** Unclaimed sellers,
promoter shop setup, listing creation, claim links, checkout blocking, and public storefronts already ship.
The strategic promise does not: the promoter listing route currently force-publishes every listing and marks
its mirror active. “Unclaimed” protects checkout, not privacy or implied affiliation.

## Scope

**In v1:**
- A private preview state for promoter-created unclaimed shops and products, excluded from every public list,
  search, storefront, PDP, feed, agent, embed, sitemap, and custom-domain channel.
- A cryptographically unguessable, revocable preview link that renders the real proposed shop presentation
  without creating a public merchant claim.
- Explicit, timestamped approval with actor/provenance before public activation; approval covers the shop and
  the reviewed product snapshot.
- Approval invalidation when material preview fields change after approval, with a clear re-approve path.
- A promoter-facing checklist and merchant-readable approval summary in es-MX.
- Golden Beans lifecycle events for preview created, delivered, approved, invalidated, activated, and claimed,
  using no PII in tags/metadata.

**Out of v1:**
- Electronic-signature/legal-contract software, automated scraping permission, payment onboarding, commission
  redesign, public landing acquisition, general seller drafts, or a full merchant CRM.
- Treating a sent WhatsApp message, shop claim, or silence as publication consent.
- Publishing historical promoter-created shops retroactively without an explicit migration decision.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| Unclaimed seller | backend `src/modules/seller/models/seller.ts` (`clerk_user_id` nullable) | Ownership remains unclaimed until the merchant claims |
| Promoter shop creation | frontend `app/api/promoter/shop/setup/route.ts` | Create the real seller and existing attribution once |
| Promoter listing creation | frontend `app/api/promoter/close/listing/route.ts` | Replace force-public behavior for the scoped promoter path |
| Claim/checkout gate | `isShopClaimed()` + claim-link/complete routes | Preserve transactional safety; do not overload it as consent |
| Storefront/listing queries | Medusa seller/product status and current channel filters | Enforce private exclusion at canonical read seams |
| Growth telemetry | `lib/growth-engine.ts`, `/api/growth/track`, Golden Beans `/v1/track` | Emit lifecycle events after canonical writes succeed |
| Feature flags | `lib/flags.ts`, `platform_flags`, `/admin/flags` | Dark-launch the new preview behavior |

## UX heuristics & rails check

- **CI guards covering this surface:** existing promoter-close API suite, listing/search/public-channel specs,
  design-token and es-MX copy guards. Add one cross-channel privacy invariant spec and one approval lifecycle
  browser smoke.
- **Audits-lens findings that apply:** mobile field workflow, explicit status language, recoverable errors,
  and one primary action per step from `00-ideas/audits/results-refresh-2026-06/`.
- **Design-language debt:** reuse the current promoter cards, shop renderer and signed-link patterns; do not
  create a parallel preview design system.

## Kill-switch / runtime gate (risk: high — Stage 6b)

Recommend `promoter.private_preview_enabled` in `platform_flags` as an **enablement** flag, default **false**
and created disabled in every environment. Gate the promoter listing/setup orchestration seam, not each public
reader independently: ON creates non-public preview products plus signed access; OFF preserves current behavior
for rollback. Public readers must still have a regression invariant proving private rows never leak. Flip only
after a disposable shop passes the full channel sweep. Additive approval/audit migration uses expand/contract.

## Acceptance criteria

### Sprint 1 — Private means private
- **As a Merchant Partner, I want** a new promoter-created listing to stay private, **so that** I can prepare a
  proof without announcing the merchant. **Acceptance:** setup + three products succeed; authenticated preview
  renders; marketplace search, public shop/PDP, agent/API, embed, sitemap and own-domain routes expose none.
  **Risk:** HIGH (DB/publication contract). **QA:** API matrix plus an anonymous live browser sweep; observe the
  regression spec red against today's force-publish behavior.
- **As a Merchant Partner, I want** a revocable preview link, **so that** I can share the proposal only with the
  merchant. **Acceptance:** random visitor cannot enumerate it; revocation returns 404; link reveals no admin or
  promoter credentials. **Risk:** HIGH (auth/token boundary). **QA:** token isolation/revocation API spec and
  mobile browser smoke.

### Sprint 2 — Approval and activation
- **As a merchant, I want** to see exactly what will be published and approve or request changes, **so that**
  activation is informed. **Acceptance:** summary names shop/products/prices/images; approval records actor,
  timestamp and version; request-changes keeps everything private. **Risk:** HIGH (new consent record). **QA:**
  lifecycle API spec; merchant-session smoke owed to Daniel if the approval route uses real identity.
- **As the system, I want** material edits to invalidate approval, **so that** stale consent cannot publish new
  claims or prices. **Acceptance:** material edit returns to review; cosmetic/non-material rules are explicit;
  activation refuses stale approval. **Risk:** HIGH. **QA:** pure snapshot/version spec plus API regression.
- **As a Merchant Partner, I want** one deliberate activation action, **so that** the approved snapshot becomes
  public once. **Acceptance:** public channels light up after activation; repeat is idempotent; checkout remains
  blocked until claim; lifecycle event emits only after the canonical write. **Risk:** HIGH. **QA:** cross-channel
  API + browser smoke with disposable data.

### Sprint 3 — Checklist, migration posture, and telemetry
- **As an operator, I want** a preview-readiness checklist and audit trail, **so that** every activation follows
  the same quality/consent standard. **Acceptance:** identity/contact verified, asset provenance, prices,
  merchant review, approval, steward and next action are visible; incomplete required items block activation.
  **Risk:** LOW UI over HIGH server enforcement. **QA:** pure checklist resolver spec + promoter mobile smoke.
- **As Daniel, I want** an explicit report of existing promoter-created public/unclaimed shops, **so that** no
  historical merchant is silently reclassified. **Acceptance:** read-only inventory with recommended manual
  disposition; no bulk mutation in this epic. **Risk:** LOW read-only. **QA:** deterministic report fixture.

## Open risks / research

- **Architecture fork — panel offer required before scaffold:** approval/audit in Medusa seller/product metadata
  versus Supabase non-commerce tables; preview access at frontend signed route versus backend projection. The
  recommended direction is Supabase for consent/audit + Medusa draft status for commerce visibility, but run the
  optional advisory cross-panel before locking the migration if Daniel wants the second opinion.
- “Private” must be proven across all channels, not inferred from one storefront route. The channel matrix is a
  release invariant.
- Consent wording needs Daniel's product/legal judgment. The product must record what happened without claiming
  a legally binding signature.
