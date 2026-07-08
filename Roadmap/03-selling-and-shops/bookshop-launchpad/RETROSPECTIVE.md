# Bookshop launchpad — Retrospective

**Shipped:** 2026-07-08 · 3 sprints · Area 03 · Risk MED-HIGH · Archetype: Grower
**Flag:** `launchpad.enabled` (enablement, default OFF, fail-safe). Public `/v/[slug]` additionally dark until Daniel's S3 smoke.

## What shipped
The full writer-to-print loop on rails that already existed:
- **S1** (`b6eca090`, PR #184) — public `/s/[slug]/convocatoria` manuscript submission (no account; email-code verify + magic-byte sniff + rate limits + opt-in), a seller review queue (approve/reject/request-changes + es-MX writer emails), and one-click "publicar como producto digital" (draft mint under the shop; manuscript → private R2 bucket). `list_manuscript_submissions` MCP tool.
- **S2** (`a398d98`, PR #187, frontend-only) — the "Lee un adelanto" text excerpt on digital PDPs (`metadata.excerpt`, no backend change) + UCP `has_excerpt`; the "Convocatoria" launchpad shelf (the app's FIRST product→collection membership path, reusing OSPP S2 `collection_ids`).
- **S3** (BE `3c0b8c7` PR #68 · FE `02e12db` PR #189) — voting campaigns: a seller builder (draft→active→closed_met/closed_unmet/cancelled) with an activation gate that re-checks the reward is an owned **CPP-configured** product; a public `/v/[slug]` page (excerpts + one email-verified vote per work + honest live progress + QR); threshold→mint automation + a daily close cron; and the money path — a **product-scoped** seller coupon (discounts only the linked print listing, `foreign_product` fail-closed at checkout). `list_launchpad_campaigns` MCP tool.

## What went well
- **Reuse over rebuild paid off the most in S3.** The sweepstakes spine (crypto helpers, email-code verify shape, QR route, cron-auth pattern) and the S1 launchpad verification table meant the voting surface was mostly assembly, not invention. The one genuinely new primitive — a product-scoped coupon — was a targeted extension of the existing seller-coupon Promotion path, not a parallel system.
- **Pure-core / server-shell split kept the gate honest and cheap.** Every load-bearing decision (state machine, activation gate, CPP-config check, vote dedup, close decision) lives in a next-free `*-types` module unit-tested exhaustively in the `api` runner; the DB/mint/email plumbing wraps it. The money-path guarantee (scoped coupon rejects a foreign cart, discounts only the scoped subtotal) is a backend `node:test` over a mock Promotion service — deterministic, no DB.
- **Cross-agent (Codex) review earned its keep on the money PRs.** It caught three real hardening gaps a single reviewer missed: a fail-**open** internal mint route (copied from platform-coupons), verification-code burned *before* the idempotency check, and a cron that excluded null-`ends_at` rows from recovery. All fixed pre-merge.

## What we learned
- **A customer-facing surface must use design tokens, not raw hex — and the guard scans the WHOLE `app/(shell)` tree.** The S3.1/S3.2 UI shipped with inline hex and reddened `design-token-foundation.spec.ts` in CI (local tsc/build were clean — the guard is a Playwright `api` spec, not a type error). Fixed by mapping every hex to `var(--color-*)`. *Lesson: for any new `(shell)` page, reach for the semantic token from the first line — the guard is not optional and won't show up in tsc.*
- **The "sibling landed on `main`, your preview predates it" CI failure bit again — exactly as LEARNINGS predicts.** rental-pricing S2 (#190) merged mid-flight, adding a `redirect_url`-dates spec + impl; CI's merged test set ran that spec against our older preview (which lacked the impl) → red on a file we never touched. `git merge origin/main` + push (rebuilding the preview) cleared it. *No new lesson — a reconfirmation that the fix is structural, not a re-run.*
- **Two repos, two deploy rails, merge backend first.** The money path spans both repos; the FE coupon redemption calls a BE route that must be the live Cloud Run revision. Merged + deployed BE #68 first, then FE #189 — but because the whole feature is dark behind `launchpad.enabled`, the deploy-lag window carried zero risk (nothing calls the scoped path until the flag flips).

## Gaps / follow-ups
- **Owed: Daniel's real-device money smoke** (sprint-3.md walkthrough) — create a campaign, vote from 3 emails to hit the threshold, receive the coupon email, redeem 50% on the print product (and confirm a different product is refused), then let a second campaign close unmet. Then **flip `launchpad.enabled` ON**.
- **MCP is read-only for campaigns** (`list_launchpad_campaigns`), matching the sweepstakes + `list_manuscript_submissions` precedent. Campaign create/activate/cancel via MCP is a deliberate future seed, not shipped here.
- **No consolation coupon on an unmet close** (v1 decision) — an honest "no se alcanzó" only. A smaller consolation % is a v2 seed.
- **Seller notification** on close uses `marketplace_shops.metadata.contact_email`; a shop without one set is silently skipped (voters + writers still notified; the seller sees status + coupon on the campaign card).
