# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 3: US invitation shell and eligibility boundary

**Status:** ⬜ not started

## Epic-mode boundary

This is the fail-closed US shell. It creates a truthful path for operator research without implying
that USD checkout, US shipping, or a US marketplace is ready.

## Stories

### Story 3.1 — `/us` private-pilot invitation

**As a** US agency/operator, **I want** a truthful entry point for the private pilot, **so that** I
can express interest without being sold an unproven public marketplace.

**Acceptance:**

- `/us` says private pilot/invitation and targets operators managing distinctive independent-product
  shops.
- The primary behavior is apply/request a research conversation; the page does not show an open
  marketplace catalog or self-service availability claim.
- Copy comes from the MADMEN US operator discovery brief and remains a hypothesis until interviews.
- It does not promise “all Shopify apps,” complete omnichannel coverage, accounting replacement, or
  Veeqo parity.
- The page is static/fast and uses the existing design system.

**Risk:** low (controlled marketing surface)

### Story 3.2 — US marketplace and cross-market leakage fail closed

**As the** platform, **I want** every US marketplace/catalog path unavailable until approval, **so
that** adding a country route cannot accidentally launch a mixed marketplace.

**Acceptance:**

- `/us` has no catalog child routes while status is `invitation`; any attempted `/us/l`,
  `/us/search`, `/us/category`, or `/us/s` marketplace path returns the controlled unavailable/404
  behavior.
- Direct product IDs cannot bypass market Sales Channel membership.
- MX catalog responses never appear under a US canonical URL.
- A population guard enumerates all public marketplace list/detail entry points and asserts the
  market boundary.
- No cross-market mixed cart can be created.

**Risk:** high (catalog/money isolation)

### Story 3.3 — Operator/admin/agent market visibility

**As an** operator or admin, **I want** to see a shop's operating market and marketplace publication
state, **so that** I do not confuse an owned US pilot shop with a US marketplace seller.

**Acceptance:**

- Partner/admin shop summaries expose operating market and market-publication channels.
- Labels distinguish `owned shop active`, `MX marketplace`, and `US marketplace unavailable`.
- Seller agent configuration reads the operating market; writes that would enable unsupported US
  commerce fail with an actionable message.
- No general seller UI offers US marketplace publication.

**Risk:** high (authorization/publication)

### Story 3.4 — Stable market lifecycle events

**As the** growth system, **I want** a stable `market_code` on approved lifecycle events, **so that**
partner and self-service activation can be measured without duplicating commerce state.

**Acceptance:**

- Existing canonical events for shop created, catalog import start/complete, commerce readiness,
  marketplace publication request/approval, and first order carry `market_code` when known.
- Golden Beans schema/docs treat it as a dimension, not an entity owner or eligibility decision.
- Unknown/unavailable is represented explicitly; missing is not silently reported as MX on new
  events.
- No raw address, tax, payment, or seller-private metadata is added.

**Risk:** medium (cross-system contract)

## Sprint QA

- **api specs:** `/us` invitation content and no catalog; exhaustive market-leak entry-point guard;
  direct-PDP denial; no mixed-market cart; partner/admin market labels; event schema privacy.
- **browser spec:** anonymous `/us` mobile/desktop rendering and application CTA.
- **browser smoke owed:** none for real US commerce; it is deliberately unavailable. Daniel may
  submit one test pilot inquiry.
- **deterministic gate:** backend + frontend type/build/tests and full market-boundary suite green.

## Sprint 3 — Smoke walkthrough

Env: branch preview, then production.

1. Open `https://miyagisanchez.com/us`.
   → Private-pilot/invitation page for agencies/operators; no marketplace grid or worldwide claim.
2. Open `https://miyagisanchez.com/us/l/<real-mx-product-id>`.
   → Controlled unavailable/404; the Mexico product never renders under US.
3. Use the partner/admin view for one MX fixture shop.
   → `Operating market: MX`; MX publication state is distinct from owned-shop state.
4. Attempt to enable a US-only commerce/publication action through the seller agent.
   → Actionable fail-closed response; no mutation.
5. Inspect a disposable shop-created event.
   → `market_code` is present as a dimension and contains no private commerce fields.

If any step fails, note the step number + what you saw — that's the bug report.
