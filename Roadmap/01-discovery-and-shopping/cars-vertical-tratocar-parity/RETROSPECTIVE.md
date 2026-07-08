# Cars vertical — tratocar-grade browse & trust — Retrospective

_Closed: 2026-07-08 · 3 sprints, all shipped to prod._

## What shipped
A used-car seller (tratocar, a lot, or a private seller) gets a browse + PDP experience at parity
with a specialized car site — facet search, financing display, inspection/warranty trust — inside
the general marketplace, plus a real self-serve pitch page for any car seller.

- **S1 — Facet browse for autos.** BE [#66](https://github.com/danybgoode/medusa-bonsai-backend/pull/66)
  `bf923ad` · FE [#185](https://github.com/danybgoode/miyagisanchezcommerce/pull/185) `d5e41f9`.
  Reconciled two drifted metadata namespaces (seller-capture `attrs.*` vs the legacy top-level keys
  only bulk import wrote) so real seller-listed cars became filterable for the first time — the
  actual substance of the sprint, found during exploration, not assumed at scoping. Marca/modelo/año/
  precio/km facet rail + honest counts, SEO-crawlable filter URLs, UCP catalog parity.
- **S2 — PDP trust + $/mes.** FE [#188](https://github.com/danybgoode/miyagisanchezcommerce/pull/188)
  `b522511`. `AUTOS_TRUST_GROUP` (financing %/months, inspection report, warranty) as a dedicated
  capture panel mirroring the `RENTAL_FIELDS` precedent; pure formatters in `lib/auto-financing.ts`
  with a mandatory, unit-tested disclaimer; PDP + card rendering; import/agent-setup mapping.
- **S3 — Outreach readiness.** FE [#192](https://github.com/danybgoode/miyagisanchezcommerce/pull/192)
  `90897e47`. Two pieces: (1) `/vende/autos`, a real seller-acquisition page for **any** car seller
  (reframed from a tratocar-specific one-pager per Daniel's steer, since the substance serves anyone
  selling cars); (2) a **real bug found via the sprint's own dry-run** — the `create_listing` MCP tool
  silently dropped every autos-specific field, so an agent creating a car listing got none of the
  facet/financing/trust data. Fixed, then used the fixed tool to populate a real 10-car demo catalog +
  OSPP dressing (theme preset, hero, announcement) on `/s/autos-demo-miyagi-sanchez`.

## What went well
- **The dry-run found a real bug the plan couldn't have predicted.** Sprint 3's whole premise —
  "actually use the agent path, not just assume it works" — paid for itself: `create_listing`'s field
  list silently diverged from what `stageRow()`/`validateRows()` (the bulk-import engine it was
  supposed to reuse) already knew how to assemble. A schema/contract test alone wouldn't have caught
  this; only driving the real tool against a real shop did. Live-testing an "already exists" claim
  before building on it is the load-bearing habit here, same shape as S1's namespace-reconciliation find.
- **The backend needed zero changes for the fix.** `apps/backend/src/api/store/_utils/seller-product-create.ts`
  already merged an `attrs` field into product metadata — the gap was entirely in the frontend MCP
  route never forwarding it. Checking the actual call chain before assuming "needs a backend change"
  kept this a single-repo, LOW-risk fix.
- **Reusing the shared `SellerAcquisitionPage`/`baseConfig` pattern made `/vende/autos` cheap.**
  Registering a new persona (`SellerPersonaId`, `SELLER_PERSONA_ROUTES`, a `buildAutosPageConfig`
  mirroring negocios/servicios) meant the copyable "ask your agent" prompt, SEO/OG metadata, and the
  persona-router card all came for free — no new component code, only copy + registration.
- **Two rounds of cross-agent review caught real issues before merge**: a literal-quote bug in
  metadata (HTML-entity-escaping broke an exact-string SEO test), a stray English word in es-MX copy,
  and a regression test that only proved schema presence rather than actual data flow. All fixed
  pre-merge; the fresh `pr-reviewer` subagent then verified the fixes independently and approved.
- **Reframing scope mid-plan, out loud, beat silently building the originally-scoped thing.** Daniel's
  two calls at S3 kickoff — bootstrap the demo shop himself rather than have the agent forge a fresh
  account, and generalize the one-pager into a real page for any car seller — both landed as plan-mode
  clarifying questions, not assumptions, and produced a better, more durable result than either
  original framing.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (dedupe — sharpen, don't append). -->
- **A single-item MCP tool (`create_listing`) and the bulk-import engine it's supposed to share can
  silently diverge on field coverage — the fix is to forward the SAME flat field names into the SAME
  pure validator, not to reimplement the mapping.** `handleCreateListing`'s `raw` object was a
  hand-maintained field list that predated the bulk-import engine's autos columns; adding a category's
  fields to `CatalogImportRow`/`stageRow()` doesn't automatically reach every OTHER caller of
  `validateRows()` — each caller's own field-forwarding list needs the same update. Grep every caller
  of a shared validator when extending what it validates, not just the caller you're actively building.
- **An MCP tool's `inputSchema` can under-document a capability the underlying function already
  supports — verify by calling it live before assuming a gap needs code, not just docs.** Confirmed with
  a real API call: `patch_store_configuration`'s `profile` block already applied `theme_preset`,
  `announcement`, and `hero` correctly, even though the schema description didn't mention them — the
  handler passes the whole `configuration` object to `applyStoreConfig()` unfiltered. A quick live probe
  distinguished "needs a code fix" from "needs a doc fix" and avoided writing new pass-through logic
  that already existed.
- **A demo/test shop with zero published listings won't show its own storefront dressing — the empty
  state pre-empts hero/announcement/theme rendering entirely, and the "no live payment method" sale-
  readiness guardrail is not agent-bypassable by design.** A shop-level `create_listing` succeeds and
  writes correct data, but every physical product lands `paused` until BOTH a delivery method AND a
  payment method are configured (`listingActivationBlock`) — and payment is deliberately OAuth/manual-
  only, with no MCP path at all. For any future "populate a demo shop via agent" story, budget the
  final "make it publicly visible" step as a human action, not something the agent can complete.
- **Collection creation has no agent-facing tool — only reading (`list_my_collections`) and assigning
  to an existing one (`update_listing.collection_names`) do.** Already known from
  `own-shop-premium-presentation` S2's retro, reconfirmed live here rather than assumed: don't plan a
  "dress with collections via MCP" story without first checking whether creation, not just assignment,
  is actually exposed.

## Gaps / follow-ups
- **Owed to Daniel (S2, carried since 2026-07-08):** real-device smoke of the PDP financing/inspection/
  warranty block + sign-off on the "$/mes" disclaimer copy (it's a pure interest-free division, always
  reads lower than a real financed payment — the mandatory disclaimer covers this legally, but the
  approver should know that going in).
- **Owed to Daniel (S3):** connect a payment method (even a placeholder SPEI CLABE) on
  `/s/autos-demo-miyagi-sanchez` to flip the 10-car demo catalog publicly visible and see the full
  dressed-shop + facet + $/mes rendering live. Daniel reviewed the first test listing from his own
  portal login before authorizing the rest of the round.
- **Collections (SUVs/Sedanes) were skipped for the demo** — no agent-facing creation tool exists; a
  candidate follow-up story if this becomes a recurring need (a real `create_collection` MCP tool),
  otherwise a 2-minute manual step in the portal.
- **The BD outreach to tratocar itself is still Daniel's ops task**, now backed by a real, generalized
  `/vende/autos` page instead of a tratocar-specific document.
