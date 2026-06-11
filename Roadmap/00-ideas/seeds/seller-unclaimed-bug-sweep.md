---
title: "Seller & unclaimed-shop bug sweep"
slug: seller-unclaimed-bug-sweep
status: shipped                       # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "03"                           # primary home: Selling & Shops (S1 also touches 05 offers / 02 checkout)
type: epic                           # a bug cluster that fans out into a 3-sprint epic
priority: null
risk: high                           # S1 + S2 are HIGH (offer/checkout money-path + Medusa product lifecycle / Cloud Run); S3 is LOW
epic: "03-selling-and-shops/seller-unclaimed-bug-sweep"   # scaffolded 2026-06-10; ✅ all 3 sprints shipped 2026-06-10 (S1 #73 · S3 #76 · S2 BE #19 + FE #78)
build_order: null
updated: 2026-06-10
---

# Seller & unclaimed-shop bug sweep

**Status: ✅ SHIPPED 2026-06-10 — all 3 sprints live in prod** (S1 [#73](https://github.com/danybgoode/miyagisanchezcommerce/pull/73) · S3 [#76](https://github.com/danybgoode/miyagisanchezcommerce/pull/76) · S2 BE [#19](https://github.com/danybgoode/medusa-bonsai-backend/pull/19) + FE [#78](https://github.com/danybgoode/miyagisanchezcommerce/pull/78)). See the epic `RETROSPECTIVE.md`.**

A consolidated sweep of five reported defects, grouped by surface + risk into one epic, three
independently-shippable sprints. All root causes below were **verified against the code on 2026-06-10**,
not assumed.

> **Mirror-back of the ask:** *"Unclaimed shops should be contact-only (no offers, no cart, no bundles,
> no silent-fail offer email); deleting a listing should actually delete it (not silently draft it and
> then 404 on edit); and the shop/manage surface has two UI defects (invisible /sell button text, a
> sub-nav strip that doesn't adapt on mobile)."* Right?

## Stage 2.5 bucket
**Genuinely new work — but as fixes, not features.** Each item is a *promised behaviour that's broken*
(unclaimed = contact-only; delete = gone; buttons legible; nav responsive). Nothing here ships as
positioning/copy; it's code correctness. No lighter "already-possible" path exists.

---

## Findings — root causes (verified against code, 2026-06-10)

### Bugs 1 + 2 — unclaimed shops wrongly accept offers / cart / bundles, and offers silent-fail
The canonical "unclaimed" signal is **`!shop.clerk_user_id`** (a gem-imported shop is a real Medusa
seller with `clerk_user_id = null`; the shop page renders the "Sin reclamar" badge off exactly this).

- **PDP leak — `app/l/[id]/page.tsx:96`:** `isClaimed = !!(listing.shop?.id && !listing.shop.clerk_user_id?.startsWith('pending:'))`.
  This predates the gem-claim loop — it only recognises the *legacy* `pending:` placeholder. For a
  gem shop, `clerk_user_id` is `null`, so `null?.startsWith('pending:')` → `undefined` → `isClaimed = true`.
  The whole CTA tree (`showBuyerActions = isClaimed && !isOwnListing` → `showBuyButtons` → Buy now,
  `MakeOfferButton`, `AddToCartButton`, `SellerBundleSection`) therefore renders on unclaimed shops.
- **Offer silent-fail — `app/api/offers/route.ts`:** the route inserts the offer row and fires the
  buyer's `sendOfferConfirmed` email **unconditionally** (line ~300), but only creates the conversation
  and notifies the seller `if (shopRow.clerk_user_id)` (line ~212). For an unclaimed shop that branch is
  skipped → buyer gets "offer sent", the shop gets nothing. Exactly the reported symptom. *(A write whose
  result nobody checks silently dies — LEARNINGS, Gem→Claim Loop.)*
- **Already correct (reuse this):** `app/api/ucp/checkout-session/route.ts:231` already computes the
  **right** signal — `!!(shop?.clerk_user_id && !shop.clerk_user_id.startsWith('pending:'))` — and treats
  claim as required. That expression is the one to extract and share.

### Bug 3 — "delete listing" silently drafts it; edit then 404s
- **Backend — `apps/backend/src/api/store/sellers/me/products/[id]/route.ts:44`** (`DELETE`) is literally
  *"unpublish (draft) the product"*: `await productService.updateProducts({ id, status: 'draft', metadata: { deleted: true } })`.
- **Three states disagree:** Medusa product → `draft` (the manage dashboard, which reads Medusa, shows
  "Borrador"); the Supabase mirror → `status: 'deleted'` (`app/api/sell/listing/[id]/route.ts:271`); and
  the edit page filters `.neq('status','deleted')` (`app/sell/edit/[id]/page.tsx:20,28`) → `notFound()` → **404**.
- **Plus the documented Medusa selector bug:** `updateProducts({ id, status, metadata })` passes one
  merged object → Medusa reads it as a **selector** (builds a `WHERE` from every field incl. the whole
  metadata jsonb), the canonical LEARNINGS gotcha. Must be `updateProducts(id, data)` or the native
  soft-delete API.
- **Decision (Daniel):** make it a **real, explicit soft-delete** — use Medusa's native soft-delete
  (`deleted_at`) so the listing disappears consistently from manage, PDP, search **and** edit, while past
  orders keep their product reference. The "no se puede deshacer" modal copy stays honest because the
  listing is genuinely gone from the seller's world.

### Bug 4 — /sell "+ Nuevo anuncio" button: green-on-green, text invisible
- **`app/shop/manage/ManageDashboard.tsx:424-429`** uses ad-hoc Tailwind **arbitrary-value** utilities:
  `bg-[var(--accent)] text-[var(--fg-inverse)]`. The *tokens* are correct (`--accent` = `#1d6f42` green,
  `--fg-inverse` = `--color-accent-foreground` = `#ffffff`), and the design-system `.btn-primary` uses the
  *same* pair successfully — so the failure is the arbitrary-value utility not reliably applying the text
  colour (globals.css even carries a manual `[class~="bg-[var(--color-accent-hover)]"]` override patching
  one such case). **Fix:** use the canonical `.btn .btn-primary` class (plain CSS, immune to JIT/specificity),
  per the design-system convention ("use `.btn-primary` directly on JSX"). Guarded by the existing
  contrast spec (`e2e/design-token-foundation.spec.ts`).
- **Same broken pattern in 5 files** (decision: fix all): `app/sell/setup/SetupClient.tsx`,
  `app/shop/manage/ManageDashboard.tsx`, `app/shop/manage/import/ImportClient.tsx`,
  `app/s/[slug]/claim/page.tsx`, `app/account/referrals/ReferralsClient.tsx`.

### Bug 5 — shop/manage sub-nav strip not adaptive on mobile
- **`app/shop/manage/ManageDashboard.tsx:327-415`** — the strip under the shop name/location (Ver tienda
  pública · Pedidos · Ofertas · Suscripciones · Contenido · Cupones · Sorteos · Eventos · Analíticas ·
  Configuración · Importar catálogo) is one `flex items-center gap-3` with ~12 links + `·` separators and
  **no `flex-wrap`, no `overflow-x` scroll** → it overflows / clips on a phone. **Fix:** make it responsive
  (horizontal-scroll strip `overflow-x-auto whitespace-nowrap` with momentum, or `flex-wrap` — builder
  picks the cleaner of the two against the design system; scroll keeps it a single tidy row).

---

## What already exists (reuse, don't rebuild) — Medusa-first reframe
- **The correct claim predicate already lives in `checkout-session/route.ts:231`.** Extract it once into a
  next-free **`lib/claim.ts` → `isShopClaimed(shop)`** (pure: `!!clerk_user_id && !startsWith('pending:')`),
  then consume it in the PDP, `POST /api/offers`, the cart/add path, and checkout-session. One source of
  truth, free pure-logic spec coverage (the `lib/` seam pattern from LEARNINGS).
- **The PDP CTA gate is already centralised** on a single `isClaimed` → `showBuyerActions` →
  `showBuyButtons`. Fixing the one predicate cascades to offer + buy + cart + bundle with no per-CTA edits.
- **Medusa owns the product lifecycle (Rule #1).** Bug 3's fix is a Medusa soft-delete via the seller
  products module — no new tables, no Supabase schema change; the mirror just records the same `deleted`
  state it already writes. Use the correct `updateProducts(id, data)` / native delete signature.
- **The design system already ships `.btn .btn-primary`** (globals.css) + a WCAG-AA contrast guard. Bug 4
  is a swap *to* the existing primitive, not new CSS.
- **Existing harness:** Playwright two-layer (`api` gate + opt-in `browser`); `MS_TEST_*` authed-smoke
  pattern; the design-token contrast/raw-hex guard to extend.

## Five-rules check
Medusa owns commerce ✅ (soft-delete via the products module; offers stay in Supabase as today).
Supabase non-commerce only ✅. UCP/MCP first-class ✅ — **the offer/cart server gates make the unclaimed
guardrail real for agents too, not just the browser** (server is the guarantee; UI is courtesy —
LEARNINGS). Clerk untouched ✅. es-MX default ✅ — new buyer-facing copy on the unclaimed PDP is es-MX
(seller portal has no live dictionary; copy-completeness gate, no dead `en` keys).

---

## Scope — in / out

**In (v1):**
- Unclaimed shops are contact-only end-to-end: PDP suppresses Buy/Offer/Cart/Bundle; the offers API and
  the cart/add API **reject** with a clear "tienda sin reclamar — contacta directo" error; no buyer email
  fires for a rejected offer.
- Unclaimed PDP shows direct-contact options (WhatsApp/phone/email when published) **plus** a "Reclama
  esta tienda" CTA (Daniel's pick).
- Delete = explicit Medusa soft-delete; the listing disappears from manage, PDP, search, and edit; mirror
  consistent; no 404; the confirm modal copy stays honest.
- /sell button (and the 4 sibling occurrences) legible via `.btn-primary`.
- shop/manage sub-nav adapts on mobile.

**Out (v1):**
- No new claim/onboarding flow changes (the claim loop shipped 2026-06-09; we only *link* to it).
- No "restore/trash" UI for soft-deleted listings (soft-delete is one-way from the seller's view for now).
- No redesign of the manage dashboard nav beyond making the existing strip responsive.
- No change to bundle pricing/logic — only its *visibility* gating on unclaimed shops.
- The 90-day scraped-listing expiry cron (already flagged as a separate follow-up) is untouched.

---

## Slices — 3 sprints (each independently shippable)

### Sprint 1 — Unclaimed shops are contact-only (HIGH)
*Touches the offer/checkout money-path + a server gate → Daniel merges. Frontend-only (offers + PDP are
Next.js routes); no backend deploy.*

- **S1.1** — *As a buyer on an unclaimed shop's listing, I see direct-contact + "Reclama esta tienda"
  instead of Buy/Offer/Cart/Bundle, so I can't start a transaction that can't complete.* Extract
  `lib/claim.ts isShopClaimed()`; repoint PDP `isClaimed`. **Acceptance:** on a "Sin reclamar" listing,
  no Buy/Offer/Add-to-cart/Bundle render; contact options + claim CTA do. **QA:** pure spec on
  `isShopClaimed`; anonymous `browser` smoke on a known unclaimed listing (no CTAs render). Risk: **HIGH**.
- **S1.2** — *As an agent or buyer, submitting an offer to an unclaimed shop is rejected, not silently
  dropped, so no misleading "offer sent" email goes out.* Gate `POST /api/offers` on `isShopClaimed`;
  return a 4xx with a clear message **before** any insert/email. **Acceptance:** POST offer to an
  unclaimed shop → 4xx, no offer row, no buyer email; claimed shop unchanged. **QA:** `api` spec
  (unclaimed → rejected; claimed → still works). Risk: **HIGH** (money-adjacent path).
- **S1.3** — *As a buyer, add-to-cart / bundle against an unclaimed shop is blocked server-side too.*
  Gate the cart/add (and confirm checkout-session) on the shared helper. **Acceptance:** cart-add to an
  unclaimed listing → rejected; checkout-session already rejects (regression-lock it). **QA:** `api`
  spec. Risk: **HIGH**.

### Sprint 2 — Delete actually deletes (HIGH, backend / Cloud Run)
*Touches Medusa product lifecycle + the Cloud Run deploy (no preview) → Daniel merges; backend merges
first, frontend degrades gracefully in the lag window.*

- **S2.1 (BE)** — *As a seller, deleting a listing soft-deletes the Medusa product so it's gone
  everywhere, with order history intact.* Rewrite the backend `DELETE` to a native Medusa soft-delete
  (correct `(id, data)` / delete-API signature; no merged-object selector). **Acceptance:** after delete,
  `GET /store/sellers/me/products` omits it; an order that referenced it still resolves. **QA:** backend
  unit/route check + post-merge prod API smoke. Risk: **HIGH**.
- **S2.2 (FE)** — *As a seller, the deleted listing leaves my manage dashboard and can't 404 me on edit.*
  Align the mirror write + the manage list source + the edit guard so all three agree on "gone"; make the
  frontend null-safe for the deploy-lag window. **Acceptance:** delete → confirmation → the row disappears
  from manage on reload (not "Borrador"); visiting `/sell/edit/<id>` shows a clean "no encontrado", not a
  broken 404 mid-flow. **QA:** `api`/pure spec on the state mapping; Daniel's authed browser smoke
  (delete → reload → edit) owed. Risk: **HIGH**.

### Sprint 3 — shop/manage UI polish (LOW, frontend-only)
- **S3.1** — *As a seller, the "+ Nuevo anuncio" button is legible.* Swap the 5 ad-hoc
  `bg-[var(--accent)] text-[var(--fg-inverse)]` buttons to `.btn .btn-primary`. **Acceptance:** white
  label visible on green on shop/manage (and the 4 siblings); contrast guard green. **QA:** extend
  `e2e/design-token-foundation.spec.ts`; anonymous `browser` smoke. Risk: **LOW**.
- **S3.2** — *As a seller on a phone, the manage sub-nav doesn't clip — it scrolls/wraps.* Make the strip
  responsive. **Acceptance:** at 375px width every nav item is reachable (scroll or wrap), no horizontal
  page overflow. **QA:** `browser` smoke at mobile viewport. Risk: **LOW**.

---

## Deploy order & risk
- **S1** — frontend-only; ships independently behind the shared helper. HIGH (money-path) → Daniel merges.
- **S2** — **backend first** (Cloud Run, ~12 min, no preview), frontend degrades gracefully, then FE.
  HIGH → Daniel merges. Announce (shared product-lifecycle surface).
- **S3** — frontend-only, LOW → reviewer may auto-merge on green CI.
- Recommended build order: **S1 → S3 → S2** (get the contact-only guardrail live first; S3 is a quick
  LOW win; S2 is the heaviest, cross-repo, do it with full attention).

## Open risks / notes
- **Null `clerk_user_id` ripple (S1):** the offer/cart reject paths must no-op cleanly for unclaimed
  shops, never throw (same caution the gem-claim loop flagged).
- **Soft-delete + active deal/cart (S2):** decide what happens to an in-flight cart/offer that references
  a listing the seller soft-deletes (likely: it resolves as unavailable — confirm during build, don't 500).
- **Unclaimed PDP with zero published contact methods:** if a gem shop has no WhatsApp/phone/email, the
  PDP should still degrade to the claim CTA + a "contacta directo" line, not a dead end.
- **Cross-section touch:** primary home is 03, but S1 edits the offers route (05) and verifies
  checkout-session (02/07-UCP) — announce so a sibling agent on those surfaces isn't surprised.

## Definition of Ready — check
- "As a / I want / so that" + testable acceptance per story ✅
- Stage-2.5 bucket named (fixes, genuinely-new) ✅
- v1 in/out written ✅ · Medusa-first reuse list produced ✅
- Each story risk-tiered + QA stage named ✅ · smoke-walkthrough owners identified (S1.1/S3 = agent
  browser smoke; S1.2/S1.3 = agent api; S2 = Daniel authed money/lifecycle smoke) ✅
- **Awaiting:** Daniel's approval of this scope doc → then scaffold epic + sprint docs (path-scoped
  commit) and emit per-sprint Claude Code kickoffs.
