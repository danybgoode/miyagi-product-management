# Market architecture foundation — owned shops, country marketplaces, and locale — Sprint 3: US invitation shell and eligibility boundary

**Status:** 🟨 in progress — implementation complete locally; independent review, branch-preview smoke, and merge gates remain

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

## Build contract (locked by the architect before the builder started)

Cite `README.md` decisions **D9, D10, D11, D13, D14**. Branch
`feat/market-architecture-foundation-s3`, cut from the S2 branch (stacked).

**D9 — `/us` is one static page with zero children.** `app/(site)/us/page.tsx` and nothing else. Do
not add `app/(site)/us/l/`, `us/search`, `us/c` or `us/s` — *and do not add a runtime guard that
pretends to block them either*. The structural absence of the folder **is** the fail-closed boundary;
a guard over routes that do not exist is theatre that a later reviewer will mistake for the real
mechanism. `/us/l/<real-mx-product-id>` is the app's ordinary 404.

**Copy premise — VERIFIED, with a limit.** The brief named by Story 3.1 exists:
`~/dobby/madmen/clients/miyagi-sanchez/us-operator-gtm-discovery-plan.md` (agency brief, 2026-07-28,
"approved direction, hypotheses pending interviews"). Use its language:

- The offer: *launch and operate distinctive independent-product shops from one agent-connected
  commerce system.* The proof is one operator activating three real client shops.
- The audience: an owner-led US agency/operator serving roughly 3–20 independent-product brands, on
  Shopify and/or WooCommerce today.
- The primary behaviour is **apply / request a research conversation**. No catalog, no self-service
  availability claim, no pricing.
- Honour that brief's own *"what not to build before interviews"* list verbatim: no
  Amazon/eBay/Walmart parity claim, no accounting replacement, no Veeqo/ShipStation parity, no open
  US marketplace, no module branding pages.
- Everything on the page is a **hypothesis**, not a validated claim. The brief says so; the copy must
  not read as though the interviews already happened.

Copy is `en-US` — this is a deliberate, named extension of the bilingual allow-list (AGENTS rule #5),
not a new default. State it in the PR body.

**D10 — market-leak population guard.** Enumerate every public marketplace list/detail entry point
**mechanically** (glob the route tree + the MCP/UCP tool registry), then assert the market boundary on
each. A hand-written list of the doors you happened to find is the exact failure this guard exists to
catch. Assert: no MX catalog response under a US canonical URL, no direct-product-id bypass of channel
membership, and no cross-market mixed cart.

**Story 3.3 — labels, read-only.** Partner/admin shop summaries expose operating market and
market-publication channels, with three distinct labels: `owned shop active`, `MX marketplace`,
`US marketplace unavailable`. The seller agent **reads** the operating market; a write that would
enable unsupported US commerce fails with an actionable message and mutates nothing. No general
seller UI offers US marketplace publication.

**D11 — `market_code` is a tag, and unknown means omitted.** In
`lib/merchant-lifecycle.ts#buildLifecycleTrackPayload`, `market_code` joins the existing
`tags: { shop_id, product_count? }` dimension block. **When the market is unknown, omit the tag** —
never default a new event to `mx`. These are write-once, unwithdrawable facts. No raw address, tax,
payment or seller-private metadata is added. Verify the Golden Beans contract fixture by
**matching bytes** (`shasum` against the sibling repo's pinned copy) — do not edit that repo.

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
