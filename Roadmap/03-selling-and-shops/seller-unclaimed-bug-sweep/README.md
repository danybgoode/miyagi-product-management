# Epic: Seller & unclaimed-shop bug sweep

> **Area:** 03-selling-and-shops · **Risk:** HIGH overall (S1 + S2 are HIGH — Daniel merges; S3 is LOW) · **Type:** bug (cluster → epic)
> **Scope seed:** [`00-ideas/seeds/seller-unclaimed-bug-sweep.md`](../../00-ideas/seeds/seller-unclaimed-bug-sweep.md) · **Signed off:** Daniel, 2026-06-10

## Why
Five reported defects, fixed so the product keeps its promises. **Unclaimed (gem-imported) shops are
meant to be contact-only** until a seller claims them — but today a buyer can make an offer, add to cart,
and build a bundle on one, and the offer *silently* dies (the buyer gets an "offer sent" email; the
shop, which has no owner, gets nothing). **Deleting a listing** is supposed to remove it — but it only
drafts it, leaving the manage dashboard showing "Borrador" while the edit screen 404s. And the
**shop/manage** surface has two visible defects: the "+ Nuevo anuncio" button renders green-on-green
(invisible text) and the sub-nav strip clips on mobile. This epic makes unclaimed shops genuinely
contact-only, makes delete actually delete, and fixes the two UI defects.

## Medusa-first note
Medusa owns the product lifecycle (Rule #1), so **delete is a native Medusa soft-delete** (`deleted_at`)
via the seller products module — no new tables, no Supabase schema change; the existing mirror just
records the `deleted` state it already writes. The unclaimed guardrail needs **no data model change** —
"unclaimed" is already `seller.clerk_user_id = null`; the bug is stale read-logic on the frontend + a
missing server gate. Offers/cart stay where they live today (Supabase + Medusa cart). Clerk untouched;
es-MX copy with a copy-completeness gate.

## What already exists (reuse, don't rebuild)
- **The correct claim predicate already exists** at `app/api/ucp/checkout-session/route.ts:231` —
  `!!(shop?.clerk_user_id && !shop.clerk_user_id.startsWith('pending:'))`. Extract it once to a next-free
  **`lib/claim.ts → isShopClaimed(shop)`** and consume it in the PDP, the offers route, the cart/add
  path, and checkout-session. One source of truth + free pure-logic spec coverage.
- **The PDP CTA gate is already centralised** on a single `isClaimed` → `showBuyerActions` →
  `showBuyButtons` (`app/l/[id]/page.tsx`). Fixing the one predicate cascades to Buy + Offer + Cart +
  Bundle — no per-CTA edits.
- **Medusa seller products module** (`apps/backend/src/api/store/sellers/me/products/[id]/route.ts`) —
  the DELETE seam to rewrite; the `(id, data)` signature + native soft-delete are the fix (avoid the
  documented merged-object selector bug, LEARNINGS → Medusa gotchas).
- **Design system `.btn .btn-primary`** (globals.css; same `--accent`/`--fg-inverse` tokens, plain CSS)
  + the WCAG-AA contrast guard (`e2e/design-token-foundation.spec.ts`) — Bug 4 is a swap to the existing
  primitive, not new CSS.
- Playwright two-layer harness (`api` gate + opt-in `browser`); the `MS_TEST_*` authed-smoke pattern.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | S1.1 Unclaimed PDP shows contact + claim, not Buy/Offer/Cart/Bundle (extract `lib/claim.ts`) | **HIGH** |
| 1 | S1.2 `POST /api/offers` rejects offers to unclaimed shops (no silent email) | **HIGH** |
| 1 | S1.3 Cart-add / bundle server-gate on unclaimed; regression-lock checkout-session | **HIGH** |
| 2 | S2.1 (BE) Native Medusa soft-delete (correct signature; order history intact) | **HIGH** |
| 2 | S2.2 (FE) Manage list + mirror + edit guard all agree "gone" — no 404 | **HIGH** |
| 3 | S3.1 `.btn-primary` swap for the 5 invisible accent buttons | LOW |
| 3 | S3.2 Responsive shop/manage sub-nav strip on mobile | LOW |

## Deploy order
- **S1** — frontend-only (PDP + offers/cart are Next.js routes); no backend deploy. HIGH (money-path) →
  Daniel merges. Touches the offers route (05) + checkout-session (02/UCP) — **announce**.
- **S2** — **backend first** (Cloud Run, ~12 min, no preview); frontend degrades gracefully in the lag
  window, then FE. HIGH → Daniel merges. Shared product-lifecycle surface — announce.
- **S3** — frontend-only, LOW → reviewer may auto-merge on green CI.
- **Recommended order: S1 → S3 → S2** (guardrail live first; S3 is a fast LOW win; S2 is the heaviest,
  cross-repo, last with full attention). Each frontend branch gets a Vercel preview.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Feature branch deleted; seed frontmatter `status: shipped`
