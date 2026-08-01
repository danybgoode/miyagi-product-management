---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: owned-shop-operating-channel
---

# Epic: Owned-shop operating channel — make a shop sellable without marketplace admission

> **Area:** 07-agentic-and-federated-commerce · **Risk:** high · **Class:** Feature · **Scope seed:**
> [`00-ideas/seeds/owned-shop-operating-channel.md`](../../00-ideas/seeds/owned-shop-operating-channel.md)

## Why

`market-architecture-foundation` promised that **a shop does not need marketplace admission**. That is
true today for **reads** — an owned-shop product renders on its shop page, subdomain, custom domain and
embed with no marketplace membership at all. It is **not** true for **money**: a product in no Medusa
Sales Channel 404s on the channel-scoped `/store/products` endpoint and fails checkout with "Product not
found".

So a merchant cannot currently say *"sell this on my own shop, don't list it in the Mexico
marketplace."* The parent epic **removed** that capability rather than ship a listing you can render and
cannot sell. This epic builds the thing that makes it honest: a second channel per market that carries
**buyability**, leaving the marketplace channel to mean **publication** and nothing else.

## Closeout amendment — 2026-08-01

The implementation remains live. The final flag contract is a Golden-managed kill switch, not an
enablement gate: `catalog.owned_shop_only_enabled` has default `on`, polarity `killswitch`, high
criticality and frontend+backend enforcement. Golden's canonical live project is `miyagi`; the
dormant `miyagisanchez` project is not a runtime tenant. The generic project-scoped catalog sync
rail registered the definition and its ON activation advanced Golden Production snapshot `46 → 47`.
No production OFF transition occurred. Turning the flag OFF is the deliberate protective rollback.

## Medusa-first note

No new commerce model — this is Medusa's own Sales Channel primitive used twice instead of once:

- **Operating channel** (new, one per market) — every product belonging to a shop whose
  `operating_market` is that market joins it. Membership here is what makes a product **buyable**: cart,
  checkout and the storefront publishable key resolve against it.
- **Marketplace channel** (`sc_01KSK1J0V81P4EPY9G0JAPX353` for MX) — only products the seller published
  into the country marketplace. Stays publication truth, **unchanged**.

"Operating" and "published" become genuinely independent facts, which is what the parent epic's contract
asked for. Medusa Region still owns checkout country/currency/payment/fulfillment. The Seller's metadata
still carries `operating_market`. No new table, and — pending the S1 re-derivation — no DDL.

## What already exists (reuse, don't rebuild)

- `apps/backend/src/lib/market-medusa.ts` — the env-resolved seam. `MARKET_MEDUSA_ENV_KEYS` already maps
  each market to `region` + `marketplace_channel`; an `operating_channel` key belongs here, **not** in
  `markets.ts` (parent D2: an id in the pure registry is a lie in every environment but one).
- `apps/backend/src/lib/market-medusa.ts#protectedSalesChannelIds` — the registry-derived allow-list that
  `cleanup-default-data.ts` and `setup-mexico` obey. It is currently
  `registryMarketplaceChannelIds + store.default_sales_channel_id`.
- `apps/backend/src/api/store/_utils/product-publication.ts` — the publication-intent seam, whose header
  documents this exact gap and says "if you are here to re-add it, build the operating channel first".
- `apps/backend/src/api/store/_utils/seller-product-create.ts` (~line 342) — the single place that
  attaches `sales_channels: [{ id: salesChannelId }]` at create.
- `apps/backend/src/api/internal/market-backfill/` — a working, reviewed **dry-run-then-apply** backfill
  with validate → claim → apply ordering and capped-scan honesty. The operating-channel backfill is the
  same shape; reuse it rather than inventing a second pattern.
- `apps/backend/src/api/internal/backfill-sales-channel/` — an existing channel-link backfill route.
- `linkProductsToSalesChannelWorkflow` (`@medusajs/medusa/core-flows`) — already used by the market
  backfill.
- Owned-shop read path (`/store/sellers/[slug]/products`) — ownership-scoped, **must stay** channel-free.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | Re-derive the live channel + publishable-key graph and lock the plan | high |
| 1 | Operating-channel seam in the market registry env layer | med |
| 1 | Provision the MX operating channel and protect it from the destructive scripts | high |
| 1 | Idempotent operating-channel backfill, dry-run reported first | high |
| 2 | **Move** the publishable key to the operating channel + the stock-location link | high |
| 2 | Product create/update joins the operating channel alongside publication | high |
| 2 | Checkout admission proves **buyability**, not marketplace publication (**added at the locking pass — D7**) | high |
| 3 | Re-enable owned-shop-only publication (`publish_to_market: null`) end to end | high |
| 3 | Publish / unpublish an existing product to the marketplace | med |
| 3 | Seller, admin and agent surfaces for the operating-vs-published distinction | med |

## Architecture decisions — LOCKED (2026-07-31, before any builder started)

Derived from the shipped code, from **Medusa 2.15.3's own source in `node_modules`**, and from the
**live production database** read through the already-reviewed read-only internal routes
(`GET /internal/market-backfill`, `GET /internal/backfill-sales-channel`,
`POST /internal/prune-sales-channels {dry_run:true}`). Builders **cite** these; they never re-derive them.

**Three of the scaffold's premises were wrong. All three are corrected below (D5, D6, D7), and two of
them would have caused a production checkout outage** had Sprint 2 been built as written.

### D1 — The live graph, measured (this is the S2 baseline)

| Fact | Live value (2026-07-31) |
|---|---|
| Sales Channels | **2**, neither disabled, no duplicate names |
| · store default | `sc_01KRVSGTDJ50SW7TF83M192ZNQ` — "Default Sales Channel" |
| · MX marketplace | `sc_01KSK1J0V81P4EPY9G0JAPX353` — "Miyagi Markets MX" (= env `MEDUSA_SALES_CHANNEL_ID`) |
| Publishable keys | **1** — `apk_01KRVSGHN5KMCJSAMMYHRBD42W` ("Default Publishable API Key") |
| · its channel link rows | **exactly 1**, → the MX marketplace channel. `skipped_links: 0` |
| Sellers | **26**, scan complete. **All 26** carry `operating_market: mx`; `unknown_market` is empty |
| Published products | **77**, scan complete |
| · linked to the MX marketplace channel | **77 of 77** |
| · published with **no** marketplace channel | **0** |
| · unusable (dangling) link rows | **0** |

Two scaffold statements corrected: the README said "18 sellers with products" (that was the parent epic's
*sellers-with-products* count — the seller **population** is 26, and every one is classifiable), and the
parent epic's backfill POST **has been applied** (the channel is already renamed, every seller already
stamped), so `would_set` and `would_link` are both empty. E1.2's prediction — "the storefront key should
hold exactly one link" — came back **exact**, with zero dangling rows.

**Consequence for S1.4:** the operating-channel backfill is a clean **full link of the whole catalog**,
not a repair. There is no partial population to reason about and no orphan to classify.

### D2 — The operating channel is a strict SUPERSET of the marketplace channel

Every product owned by an MX seller joins the **operating** channel. Products published to the country
marketplace *additionally* join the **marketplace** channel. Marketplace membership is therefore a subset
of operating membership, permanently.

This is what makes D3 possible, and it is why "operating" and "published" become genuinely independent
without anything needing to pick a channel per request.

### D3 — E1.1 ANSWERED: the publishable key **MOVES**, it never gains a second channel

**This reverses the scaffold's Sprint 2 plan, which said "linked to the operating channel *in addition to*
the marketplace channel". Building that would have silently broken every cart in production.**

> **⚠️ MECHANISM CORRECTED 2026-07-31 by the S2 builder — the decision below is UNCHANGED and better
> supported.** The architect's original D3 claimed `req.errors` is "read nowhere in the entire Medusa
> dist", making the failure a *silent* misroute onto the store-default channel. **That was wrong**, and
> wrong because of a bad grep: the reader aliases the request to `req_`, so a search for `req\.errors`
> misses it. Verified in the installed packages — the real behaviour is a **loud, total 400 outage**.
> Recorded here rather than quietly edited, because a confidently-wrong mechanism in a locked decision
> is exactly what the next person would build on.

Traced through Medusa 2.15.3, `POST /store/carts`:

1. `maybeAttachPublishableKeyScopes` resolves the key to its channel ids.
2. `ensurePublishableKeyAndSalesChannelMatch` — with **>1** channel on the key and no `sales_channel_id`
   in the body — pushes *"Cannot assign sales channel to cart…"* onto `req.errors` **and returns**,
   leaving `sales_channel_id` unset.
3. **`@medusajs/framework/dist/http/utils/wrap-handler.js` reads it**: `if (req_?.errors?.length)` →
   `res.status(400)`. `http/router.js` wraps **every** route handler in `wrapHandler` (four call sites),
   so this is unconditional.
4. **Every storefront cart creation returns HTTP 400.** Total checkout outage, immediately and loudly.
   `findSalesChannelStep`'s fall-back to `store.default_sales_channel_id` is real code but
   **unreachable** here — `wrapHandler` answers first.

The storefront **never sends `sales_channel_id`** — grep over `apps/miyagisanchez` `lib/**` + `app/**`
returns **zero** call sites. So there is no code path that avoids step 2.

**Locked:** the key carries **exactly one** channel link before and after — it is **unlinked** from the
marketplace channel and **linked** to the operating channel, in that order, as one reviewed operation.
Because of D2 the operating channel is a superset, so `/store/products` and the cart both keep serving
everything they serve today, plus the owned-shop-only products. Link rows: **1 → 1**.

*Rejected alternative:* teach the storefront to send `sales_channel_id`. It works, but it puts a
required, silently-failing parameter on every cart-creating call site forever, and the failure mode when
one is missed is this same invisible fallback. A single-channel key makes the bug unrepresentable.

### D4 — The marketplace read path needs no change (E1.4 answered: **no**)

`market-read.ts` filters on `resolveMarketplaceChannelForMarket(market, env).id` — the marketplace channel
id, read from `MEDUSA_SALES_CHANNEL_ID`, **independent of the publishable key**. Moving the key (D3) and
adding a second membership (D2) leave `/mx`, `/mx/l`, search and category byte-identical. The parent
epic's population guard proves it; do not re-derive it.

Likewise **untouched**: `/store/sellers/:slug/products` and every tenant-channel read stay channel-free
(parent D4).

### D5 — The stock-location ↔ sales-channel link is load-bearing, and the scaffold never mentions it

`ensureSalesChannelLocationLink` (`store/_utils/inventory.ts`) exists because Medusa reserves inventory at
order completion **against the cart's sales channel**, and a channel with no linked stock location cannot
reserve. Today the seeded location is linked to the **marketplace** channel. The moment D3 moves the cart
onto the operating channel, **every managed-inventory purchase fails at completion** unless the operating
channel carries that link too.

**Locked:** linking the operating channel to every stock location the marketplace channel is linked to is
part of **provisioning (S1.3)**, not an afterthought, and the S1.4 dry-run must **report the live
location↔channel graph before and after** so the gap is visible before anything depends on it.

### D6 — Backfill scope is ALL of an MX seller's products, not only the published ones

The market backfill scanned `status: 'published'` because it was answering "what would the new marketplace
filter hide". Buyability is a different question: a draft product published *later* must already be in the
operating channel, or it becomes unbuyable at the moment it goes live — a bug that would surface days
after this epic closed. Medusa's `/store/products` filters `status` on its own, so linking a draft is
inert and safe.

**Locked:** the operating-channel backfill scans **every status**, and reports the published/draft split.

### D7 — E1.1's real consequence: the **frontend** checkout admission gate must change (NEW STORY 2.3)

**The scaffold's "backend-only for Sprints 1–2, frontend untouched until Sprint 3" is false**, and this is
the finding that most changes the epic's shape.

`apps/miyagisanchez/lib/cart.ts` → `resolveCheckoutLines` admits **every** checkout line through
`GET /store/listings/:id?market=mx` — the **marketplace** detail endpoint — before a cart exists. An
operating-channel-only product 404s there and is refused with *"not available in this marketplace"*. No
amount of backend channel work makes it buyable while that gate stands.

> **⚠️ OVERCLAIM CORRECTED 2026-07-31 (codex review, PR 130 round 3).** This decision originally called
> the checkout admission gate "the anti-IDOR admission boundary on the money path". **It is not a
> boundary — it is an OFFER gate**, and the difference is load-bearing.
>
> Verified in the installed packages: `POST /store/carts/:id/line-items` carries **no** sales-channel
> middleware (`carts/middlewares.js` registers only body/query validation), and `add-to-cart.js` passes
> `sales_channel_id` solely to `confirmVariantInventoryWorkflow` — an *inventory-availability* check, not
> a product↔channel *authorization* check. This repo adds no guard of its own on that route either. So a
> direct API caller can add any variant to a cart irrespective of channel membership.
>
> **This is pre-existing and unchanged by this epic** — the storefront's `resolveCheckoutLines` was
> always the only check, and was always advisory. The epic neither opens nor widens it: before the key
> move the addable set was "any variant"; after it, still "any variant". But the claim was wrong, and a
> wrong claim in a locked decision is what the next person builds on. AGENTS rule 3 says a check that
> exists only in the storefront does not exist; that rule applies to this gate, and the honest reading is
> that the *authorization* boundary here is **owed, not shipped** — see the Owed list at the end.

So it is relaxed **deliberately and narrowly**:

- A **new backend admission seam** proves the one thing the cart actually consumes: *this product is a
  member of this market's **operating** channel*. Same market scoping, same fail-closed shape, same
  three states as `market-read.ts`.
- `/store/listings/:id` stays **exactly** marketplace-publication truth (E3 — not reopened).
- The productId→variantId ownership proof below it is **unchanged**. Admission is widened by exactly one
  fact: buyable-on-its-own-shop. It is never widened to "any product id".

### D8 — Kill-switch: ONE Golden-managed flag, and it gates the CODE paths only

The scaffold was right that flagging channel membership is worse than useless — the damage would be in
data, which a flag cannot undo. But D7 introduces a **security-shaped code path**, and that is exactly
what a flag is for.

The original pre-build lock called this an enablement flag with default `false`. The final owner
decision superseded that wording: `catalog.owned_shop_only_enabled` is a Golden-managed
**killswitch** with default **`true`**, registered in both consumer catalogs and activated ON in
Production snapshot `47`. It gates:

- the D7 checkout-admission relaxation (backend seam **and** the `lib/cart.ts` caller), and
- the seller-facing "solo mi tienda" option and `publish_to_market: null` acceptance (S3.1).

With the flag OFF the platform behaves **exactly** as it does today. It does **not** gate channel
membership, the backfill, or the publishable-key move — those are data, and their rollback is D9.

The feature is live by default. An explicit OFF value is the deliberate protective action; it is not
an unfinished launch state or an exception to the flag operating procedure.

### D9 — Rollback is a data operation, and it is stated up front

| Step | Undo | Catalog during the undo |
|---|---|---|
| Publishable key moved to operating (S2.1) | Unlink operating, link marketplace — still exactly 1 row | Back to today's exactly: marketplace-published products only |
| Operating channel memberships (S1.4) | Leave them. They are inert once the key points elsewhere | Unaffected |
| Admission relaxation (S2.3) | Flip `catalog.owned_shop_only_enabled` OFF | Checkout admits marketplace-published only, as today |

The key move is the only rollback-sensitive step and it is two link operations, not a deploy.

### D10 — Sequencing is backfill-first, and that is not negotiable

The precedent is the 2026-07-27 duplicate-sales-channel prune: **backfill first, verify, then make
anything depend on membership** — zero errors. Applied here, now with D5 folded in:

1. Deploy the allow-list entry (S1.2/1.3). **Nothing exists yet.**
2. Create the channel. Nothing reads it. It is protected from birth.
3. Link the channel to every stock location the marketplace channel has (D5). Still nothing reads it.
4. Backfill every MX seller's product into it (D6). Dry-run reported and reviewed first.
5. **Only then** move the publishable key (D3) and let create/checkout depend on it.

Reversing 4 and 5 takes the storefront dark: a key scoped to a channel with a partial catalog serves a
partial catalog that looks perfectly healthy.

### D11 — E1.5 answered: un-publishing is a link removal, and the cache window is stated

Removing the marketplace link is `linkProductsToSalesChannelWorkflow({ id, remove: [...] })` — the
symmetric call to the one the backfill already uses. Because of D2 the product keeps its operating
membership and stays buyable throughout; there is no window in which it is in zero channels. What caches
membership is the storefront's own ISR/`unstable_cache` layer, not Medusa — S3.2 either invalidates it or
states the staleness window in the sprint doc.

### D12 — What this epic must NOT change (unchanged from the scaffold, restated as a guard)

`store.default_sales_channel_id` ≠ env `MEDUSA_SALES_CHANNEL_ID` is **still** out of scope (parent D0) —
and D3 makes it *more* tempting to "fix", because the store default is what the broken fallback path
lands on. Do not. D3 removes the path that would ever reach it.

### E3 — What this epic must NOT change

- Marketplace publication semantics. That contract shipped in the parent epic and is not reopened.
- Owned-shop **reads** (`/store/sellers/[slug]/products`, tenant channels). They resolve by ownership +
  publish state and must never gain a channel filter (parent D4).
- The US market. It stays `invitation` and structurally fail-closed; no US channel, Region or commerce.
- `store.default_sales_channel_id` ≠ env `MEDUSA_SALES_CHANNEL_ID`. Known, harmless, out of scope
  (parent D0) — do not "fix" it here either.

## Deploy order

**Corrected at the locking pass (D7): Sprint 2 touches the frontend.** Sprint 1 is backend-only; Sprint 2
is both repos (backend admission seam + `lib/cart.ts`); Sprint 3 is both.

1. **S1** deploys inert: the seam, the allow-list entry and the dry-run report ship before the channel
   exists, and the report is read before anything is created.
2. **Provisioning + backfill are production mutations performed by the orchestrator** under Daniel's
   standing pre-authorization for this epic — the builder writes and dry-runs them and hands over the
   exact reviewed command, and never runs the apply itself.
3. **S2** is the first deploy where membership becomes load-bearing. It must land *after* the backfill is
   verified complete, and it is the rollback-sensitive one (D9). Backend merges and finishes deploying
   **before** the frontend, per the standing merge-backend-first rule.
4. **S3** adds seller/admin/agent surfaces and can deploy normally.
5. `catalog.owned_shop_only_enabled` is activated ON through Golden's normal lifecycle after parity
   sync and the S2 smoke. Production snapshot `46 → 47` completed on 2026-08-01 without an OFF
   transition; the feature remains live.

Existing Mexico checkout must pass unchanged at every step — a product in both channels behaves exactly
as it does today.

## Kill-switch decision

**Final contract — see D8.** `catalog.owned_shop_only_enabled` is a Golden-managed killswitch with
default `true`, registered in both repos' `flag-catalog` and activated ON in Production snapshot `47`.
It gates the two **code** paths the epic adds (the D7 checkout-admission relaxation and the S3
seller-facing option) and deliberately does **not** gate channel membership, the backfill or the
publishable-key move — those are data, and D9 is their rollback. OFF is the deliberate protective
rollback; the live ON state is not an exception.

The scaffold's instinct ("a flag on membership is worse than useless") was right; what it could not know
is that D7 introduces a security-shaped code path, which is exactly what a flag is for.

## Owed after this epic — the cart-write authorization boundary

**Found by the codex cross-family review, PR 130 round 3, and confirmed against the installed Medusa.**

`POST /store/carts/:id/line-items` enforces **no** product↔sales-channel membership. The checkout
admission seam (D7) is therefore an **offer** gate — it decides what the storefront presents — and not
an authorization boundary. Its refusals of hidden/print-placement products and of another market's
seller are enforced only for callers that route through the storefront.

**Not a regression, and not this epic's to open:** the gap predates every line of this work, and the
addable set is identical before and after the key move. Nor is it urgent today — there is exactly one
market and all 26 sellers are `mx`, so the cross-market refusal is structurally unreachable, and
hidden/print-placement products already sit in the marketplace channel and are already addable.

**But it is real, and it is exactly the shape AGENTS rule 3 exists to name.** It needs its own scoped
sprint against the cart write path — not a late addition to a sprint already three review rounds deep on
the money path. Tracked here so it is owed out loud rather than discovered again.

## Explicit non-goals

- Any US commerce capability — currency, payment, shipping, tax, or a US channel of any kind.
- Changing what marketplace publication means, or the marketplace read filter.
- Per-product multi-market publication (a product published to two country marketplaces at once).
- Migrating existing products out of the marketplace channel. Every product that is published today stays
  published; this epic only adds the second membership.
- Seller-facing pricing or packaging of "owned shop only" as a paid capability.

## Build routing (stated so the choice is auditable — WAYS-OF-WORKING, epic-mode)

Codex is quota-exhausted for this run, so the cross-family layer runs on **agy** (`--agent antigravity`,
Gemini → GPT-OSS pools). Per `LEARNINGS.md` a single answering pool is **weak evidence** — every PR
therefore also gets the fresh `pr-reviewer` axis, and the PR body says the family layer ran one-pool.

| Sprint | Builder | Why | Cross-family | Fresh reviewer |
|---|---|---|---|---|
| S1 | Sonnet 5 | Mechanical over a fully-locked contract (D1–D6): one env entry, one allow-list entry, one backfill route modelled on a shipped sibling | agy | yes (HIGH) |
| S2 | **Opus 5** | The contract everything imports — the key move (D3), the stock-location link (D5) and the admission boundary (D7). Money path + authorization | agy | yes (HIGH) |
| S3 | Sonnet 5 | Surfaces and a publication toggle over a settled contract | agy | yes (HIGH) |

Review is inverted per the SOP: the fresh pass on S2 — the highest-risk PR — runs on the stronger model.

## Definition of Done (epic)

- [x] All sprints merged to `main` (gaps stated below — the money smokes are owed to Daniel)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] The architecture decisions above are **locked with numbers** from the live database before any
      builder starts, and E1's five questions are answered in writing
- [ ] A product in the operating channel but **not** the marketplace channel: renders on its owned shop,
      is **absent** from `/mx`, and **can be bought end to end** — **OWED: needs the flag ON + Daniel's
      money smoke.** The machinery is shipped and verified; the end-to-end purchase is not yet run.
- [x] A product in both channels behaves exactly as it does today — verified live: `/store/products`
      still totals 77, marketplace 77/77/0, `POST /store/carts` returns 200 on the operating channel
- [x] The operating channel is in `protectedSalesChannelIds` **before** it existed in production (D10
      ordering held; the allow-list shipped in PR 128 and deployed before PR 129 created the channel)
- [x] Backfill dry-run reviewed, applied by the orchestrator only, and verified complete before S2
      depended on it — 98 linked, re-run reports `would_link: 0`
- [x] Publishable-key link rows counted before and after: **1 → 1** (D3), `verified: true`
- [x] The operating channel is linked to every stock location the marketplace channel is linked to (D5),
      verified before the key moved — one location, `missing_on_operating: []`
- [x] Owned-shop and tenant-channel reads still carry **no** channel filter (parent D4 guard green)
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** `catalog.owned_shop_only_enabled` is registered through Golden's generic
      project-scoped sync rail and activated ON in Production snapshot `47` (default `true`, polarity
      `killswitch`, enforcement `both`). The feature stayed live throughout; OFF is the deliberate
      protective rollback.
- [x] Feature branches deleted; **frontmatter `status: shipped`** and `node scripts/build-order.mjs` run
