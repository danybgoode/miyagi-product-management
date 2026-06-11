# Seller & unclaimed-shop bug sweep — Retrospective

_Closed: 2026-06-10_

**Risk:** HIGH overall (S1 + S2 money/lifecycle; S3 LOW) · **Build order:** S1 → S3 → S2 (guardrail first,
fast LOW win, heaviest cross-repo last). Five reported defects consolidated into one epic, three
independently-shippable sprints. All root causes were verified against the live code on 2026-06-10 before
any code was written.

## What shipped
- **S1 — Unclaimed (gem) shops are genuinely contact-only** ([#73](https://github.com/danybgoode/miyagisanchezcommerce/pull/73)
  `daf6300`, FE-only). Extracted the correct claim predicate (already proven at `checkout-session:231`) into a
  next-free **`lib/claim.ts isShopClaimed()`** = `!!(clerk_user_id && !startsWith('pending:'))` and made it the
  single source of truth across **6 consumers** (PDP, offers route, checkout-session, the load-bearing
  `/checkout` page guard, 2 UCP read surfaces). The old PDP predicate keyed off the ever-present `shop.id`, so a
  gem shop (`clerk_user_id = null`) read as *claimed* and rendered the whole Buy/Offer/Cart/Bundle tree; offers
  to it died silently (buyer got "oferta enviada", the ownerless shop got nothing). `SellerTrustCard` already
  rendered the contact + "Reclamar" UI → a one-line predicate fix, no new UI.
- **S3 — shop/manage UI fixes** ([#76](https://github.com/danybgoode/miyagisanchezcommerce/pull/76) `af002c4`,
  FE-only, LOW). Untyped Tailwind v4 `text-[var(--fg-inverse)]` is ambiguous (color vs font-size) → the color
  rule never emits → anchors inherit `:where(a){color:var(--accent)}` → green-on-green invisible button text.
  Fix: buttons → design-system `.btn .btn-primary` (plain CSS); chips → typed `text-[color:var(--fg-inverse)]`;
  manage sub-nav → single-row horizontal scroller. New invisible-accent-button guard extends the design-token spec.
- **S2 — Delete actually deletes** (BE [#19](https://github.com/danybgoode/medusa-bonsai-backend/pull/19)
  `dd5f207` → Cloud Run `medusa-web-00098`; FE [#78](https://github.com/danybgoode/miyagisanchezcommerce/pull/78)
  `1c1923c`, HIGH). The `DELETE` route only **drafted** the product, so three states disagreed: Medusa = draft
  (manage grid showed "Borrador"), mirror = `'deleted'`, edit guard `.neq('status','deleted')` → 404. Fix: native
  `productService.softDeleteProducts([id])` (correct array-of-ids, never the merged-object selector) sets
  `deleted_at` → the product drops out of `GET /store/sellers/me/products` + `/store/listings` (both query the
  `product` entity, which excludes deleted_at) while the row is kept → order history intact. FE: new pure
  `lib/listing-lifecycle.ts` (`filterOutDeleted`) applied to the Medusa list **before both render and the
  `syncSupabaseListingMirror` resync** — hiding deleted listings and closing a latent clobber (the resync would
  otherwise flip the mirror's `'deleted'` back to `'draft'` and resurrect the listing in the edit guard).
  Null-safe → deploy-lag-safe.

## What went well
- **Read the backend route first → the fix got smaller and safer.** S1 reused a predicate that already existed;
  S2's BE change was one method swap because the GET list route already queried the `product` entity (which
  excludes soft-deletes by default). Medusa-first paid off again: zero new tables across the whole epic.
- **The seam + pure-spec pattern carried the coverage for free.** Three small `lib/` helpers
  (`claim.ts`, `design-token-audit.ts`, `listing-lifecycle.ts`), each with a pure `api` spec — green gate, no
  network, and the helper is the single source the UI *and* the spec read.
- **Backend-first, deploy-lag-safe FE worked exactly as designed.** Merging BE #19 first (Cloud Run ~16 min)
  then FE #78 was safe even before the backend finished deploying, because `filterOutDeleted` handles the
  still-drafted case and no-ops once the backend omits the product.
- **Fresh-reviewer-on-green-CI caught real issues without an iterate loop.** S1's reviewer caught a [blocker]
  (the `/checkout` page still on the old predicate); S2's reviewer confirmed the lifecycle logic and flagged
  only nits. Single pass, no refine loop.

## What we learned
_(Promoted to `Roadmap/LEARNINGS.md`.)_
- **A still-returned "deleted" row can be silently un-deleted by a resync.** The manage page re-syncs the mirror
  *from* Medusa every load — so any "soft state" the mirror holds that Medusa doesn't yet reflect must be excluded
  from that resync, or it gets clobbered. The fix had to filter **before both render and resync**, not just render.
- **Native module methods sidestep the merged-object `updateProducts` selector trap.** S2 is the third epic to
  brush it; `softDeleteProducts([id])` (explicit id array) is unambiguous where `updateProducts({id, ...})` is read
  as a selector.
- **Backend has no CI/preview — the route-deployed probe is the agent's post-merge signal.** A no-auth
  `DELETE …/products/:id` → `401 "Authentication required"` confirms the new handler is live (it reached the auth
  gate); the full authed cycle needs a seller JWT and stays owed to Daniel.
- **Build in your OWN worktree from the start** (a sibling agent yanked the shared frontend worktree mid-S1).

## Gaps / follow-ups
- **Authed money-/lifecycle browser smokes owed to Daniel** (he holds the live sessions), listed per sprint:
  S1 buyer→unclaimed-offer 409 + no "oferta enviada" email; S2 seller delete→reload-manage (gone, not
  "Borrador")→edit (clean "no encontrado")→order-history intact; S3 375px sub-nav reachability + the 4 authed
  button surfaces.
- **Optional repo secret `MS_TEST_UNCLAIMED_LISTING_ID`** to light up S1's fixture/browser smokes.
- **[note] SPEI/`bank_transfer` is not claim-gated in checkout-session** (pre-existing) — a follow-up call.
- No "restore/trash" UI for soft-deleted listings (one-way from the seller's view, by design).
