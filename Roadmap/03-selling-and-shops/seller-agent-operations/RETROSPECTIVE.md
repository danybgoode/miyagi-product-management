# Retrospective — Seller Agent Operations (Epic)

**Shipped:** 2026-06-03 · both sprints live · live-QA'd end-to-end (Playwright + real MCP token, revoked
after). First epic to span both repos (frontend Vercel + backend Cloud Run).

A seller's own AI agent can now run day-to-day operations over MCP: handle price offers (list / accept /
counter / decline) and manage listings (list / edit / pause / activate) — extending the per-shop-token
pattern from the seller-config tools.

## What shipped
- **S1 — Offers** (frontend, Supabase + Stripe): `list_offers`, `respond_to_offer`. The accept/counter/
  decline logic was extracted into `lib/offer-respond.ts` so the portal and the agent share one path.
- **S2 — Listings** (backend + frontend): a new `x-internal-secret` route `/internal/seller-products/:id`
  (the agent has no Clerk JWT, so it can't reach the seller-scoped store route); `list_my_listings`,
  `update_listing`, `set_listing_status` on the frontend. The product-update logic was extracted into a
  shared backend `_utils/seller-product-update.ts` used by both the portal route and the new internal one.

## What went well
- **The token + audit pattern composed cleanly.** `resolveAgentShop`, `appendAuditEntry`, the
  capabilities source-of-truth, and the seller-alert email all came straight from the previous two epics —
  each new tool was mostly wiring, not new infrastructure.
- **Extract-don't-duplicate held on both sides of the stack.** Offers and listings each had live,
  battle-tested logic (the portal route, the seller product route). Rather than reimplement for the agent,
  we lifted each into a shared module the original caller now uses too — one money/inventory path, no drift.
- **The full chain was provable.** The live test confirmed a price change written via the agent reached
  *Medusa* (public catalog `price_cents`), not just the Supabase mirror — agent token → frontend tool →
  internal route → Medusa + mirror, all verified, then restored.

## What we learned
- **Two repos, two deploy rhythms.** The frontend auto-deploys on push (Vercel, ~90s). The backend deploys
  via a **regional** Cloud Build trigger (`backend-main-deploy` in us-east4) that the default
  `gcloud builds list`/`triggers list` (global) doesn't show — and the Medusa admin-bundle build takes
  ~12 min. When a backend change seems "not deployed," check `--region=us-east4` builds before assuming the
  trigger is broken.
- **Commerce writes are Medusa-gated by Clerk JWT.** The agent (no JWT) needed a deliberate
  service-to-service door (`x-internal-secret`), with ownership re-checked on both sides. Worth remembering
  for any future agent-driven commerce write.

## Validated but money-gated (the honest gap)
- **Offer accept/counter/decline state transitions weren't exercised via agent** — VP Shops had no open
  offer at QA time. The logic is the byte-for-byte portal code (live daily); the new agent surface (auth,
  dispatch, ownership, not-found, audit) is verified. A real negotiation round-trip via agent is still owed.

## Deferred (07 backlog)
- ~~Creating brand-new listings via MCP~~ → **shipped in Sprint 3 (2026-06-04), see below.**
- Agent activity analytics / surfacing the `ucp_agent_audit` log to sellers.
- Standing auto-accept / pricing rules (each action here is explicit, never a standing rule).

---

# Retrospective — Sprint 3 · Create listings via MCP (added 2026-06-04)

**Shipped:** 2026-06-04 · backend (Cloud Run) + frontend (Vercel) · live-QA'd end-to-end with a real (then
revoked) agent token. Reopened the "complete" epic for the one operation Sprints 1–2 deferred, closing the
agent's listing lifecycle: **create → manage → pause/activate.**

## What shipped
- **US-1 — Backend internal *create* route.** Extracted the product-create logic from
  `POST /store/sellers/me/products` into a shared `_utils/seller-product-create.ts` (the create counterpart of
  Sprint 2's `seller-product-update.ts`) and added `POST /internal/seller-products` (`x-internal-secret`) so
  the agent (no Clerk JWT) creates through the same audited service-to-service door. Added a
  `status: 'published' | 'draft'` field so the caller controls publish state.
- **US-2 — `create_listing` MCP tool.** The handler is almost entirely *wiring of existing primitives*:
  `resolveAgentShop` → `validateRows`/`CatalogImportRow` (the bulk-import schema) → `ingestImageUrls`
  (remote URLs → R2) → the new internal route → `syncSupabaseListingMirror` → `recordAgentListingCreate`.
  Effectively "bulk-import of a single row, authed by an agent token."

## What went well
- **The whole feature was mostly composition.** Three prior epics had already built every piece — the
  per-shop token + audit (config tools), the Supabase mirror + `listingActivationBlock` (Sprint 2), and the
  import schema/validation + image-ingest (Bulk Import). `create_listing` was the seam that joined them; the
  only genuinely new code was the extracted backend create util and the internal route, both byte-for-byte
  lifts of existing logic.
- **Extract-don't-duplicate held a second time on the backend.** Like the update path in Sprint 2, the
  create path now has ONE definition used by both the Clerk-authed store route and the agent's internal
  route — no drift between human-create and agent-create.
- **The live proof went all the way to Medusa.** The agent-created listing showed up in the *public UCP
  catalog* at the right price (49900¢ from `price_mxn: 499`), not just the Supabase mirror — the same depth
  of proof we insisted on for Sprint 2's price edit.

## What we learned
- **Preview deployments are SSO-gated.** The frontend's per-branch Vercel preview returns 401 to anonymous
  curl/Playwright, so the "smoke-test on the branch's preview" ideal isn't reachable for API-level checks —
  which is exactly why Sprints 2 and 3 both ran Playwright + the live MCP round-trip **against prod after
  merge**. Worth baking a Vercel protection-bypass token into the Playwright harness if we want true
  pre-merge preview QA.
- **Minting a disposable agent token is a shared-state write.** Generating a token by writing its hash to a
  prod shop record is the cleanest test path but touches shared Supabase data — it needs an explicit
  green-light each time. A throwaway/seeded test shop with a pre-provisioned token would remove that friction.

## Validated but gapped (honest)
- **The create-as-draft branch wasn't exercised live.** VP Shops is sale-ready, so the live create published;
  the draft path is the already-live `listingActivationBlock` (used by `set_listing_status`), logic-verified
  but not forced live — we declined to mutate a shared prod shop's payment/shipping just to trip it.
- **No agent-side delete.** The live test listing is paused/undiscoverable but couldn't be hard-deleted via
  MCP (the seller DELETE route is Clerk-gated, no admin creds to hand) — owed a one-click portal delete. A
  future `delete_listing` internal route would close this.
