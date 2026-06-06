# Sprint 1 — Respond to offers via MCP

Goal: a seller's agent can see open price offers and respond — accept, counter, or decline — without the
portal, going through the exact same logic (and side-effects: checkout link, buyer emails, reminders) as the
seller clicking buttons in the offer inbox.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ SHIPPED + QA'd 2026-06-03.**

> Frontend-only (Supabase + Stripe). Extends the seller MCP tools from Bulk-Import S4; same per-shop token.

---

## US-1 — `list_offers` MCP tool ✅
**As a** seller's agent, **I want** to see the shop's open offers, **so that** I can decide how to respond.
- [x] New seller MCP tool, authed by the shop agent token (`resolveAgentShop`), scoped to one shop
      (`lib/offer-respond.ts` · `listShopOffers`).
- [x] Lists actionable offers (`pending`, `countered`) for the shop: amount, % of asking, buyer name,
      message, status, time left, listing title — in plain language. No secrets.
- [x] A token for shop A never sees shop B's offers (`.eq('shop_id', shop.id)`).
*(Shipped 2026-06-03, commit 96ee974.)*

## US-2 — `respond_to_offer` MCP tool (accept / counter / decline) ✅
**As a** seller's agent, **I want** to respond to an offer, **so that** I can close negotiations
conversationally.
- [x] Accept / counter / decline, with the same validation and side-effects as the portal: state guards,
      counter bounds (above the buyer's offer, below list price), Stripe checkout-session on accept, buyer
      emails + push, scheduled reminders, conversation events.
- [x] Shared logic: `lib/offer-respond.ts` · `respondToOffer` is the single code path (the agent tool calls
      it with the resolved shop's Clerk user id).
- [x] **Live commerce guardrail:** accept commits a sale → audited (`recordAgentOfferAction`) + admin
      Telegram alert; wrong-shop / invalid-state / not-found responses rejected with a plain-language reason.
*(Shipped 2026-06-03, commit ed9b502.)*

---

### Definition of done (sprint)
A seller's agent lists its open offers and accepts / counters / declines one; the buyer receives exactly the
same checkout link, emails, and notifications as if the seller had clicked in the portal; the action is
audited; another shop's token can't touch these offers.

### QA — passed (2026-06-03)
- **Playwright** (`e2e/seller-offer-tools.spec.ts`, 3 specs green vs prod): `tools/list` advertises both
  tools; `list_offers` and `respond_to_offer` reject calls with no token.
- **Live MCP** (real token on VP Shops, revoked after): `list_offers` read cleanly ("no hay ofertas");
  `respond_to_offer` with a bogus id → "Oferta no encontrada" (dispatch + auth + not-found path verified);
  revoked token → Unauthorized.
- **Gap (stated honestly):** VP Shops had no open offer, so the accept/counter/decline *state transitions*
  weren't exercised through the agent. They run the byte-for-byte portal logic (`respondToOffer`, exercised
  by sellers daily) — the new agent surface (auth, dispatch, ownership, audit) is verified; a real
  negotiation round-trip via agent is owed once an open offer exists.

### Out of scope
Listing management (Sprint 2) · buyer-side offer actions · auto-accept rules.
