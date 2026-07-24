---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: founding-merchant-consent-previews
---

# Epic: Founding merchant consent-safe previews

> **Area:** 08 · Growth & Promotions · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/founding-merchant-consent-previews.md`](../../00-ideas/seeds/founding-merchant-consent-previews.md)

## Why

Founding Merchant Partners can already create an unclaimed shop, add products and hand the merchant a claim
link—but the current path force-publishes those products. Checkout is safe; consent is not. This epic makes the
approved field promise real: prepare a private shop preview, share it only with the merchant, record explicit
approval of the reviewed snapshot, and then activate the exact approved proposal publicly.

## Medusa-first note

Medusa remains authoritative for sellers, products and publication. Promoter-created preview products use the
existing Medusa draft/unpublished primitive instead of a parallel catalog. Supabase stores only non-commerce
consent/audit state and signed-preview grants. Claim and checkout behavior remains unchanged: approval permits
publication; only claim transfers ownership and unlocks the claimed-shop path.

## Decisions locked at scope approval

1. **Private is cross-channel:** preview rows must be absent from marketplace, search, public shop/PDP, agent,
   embed, sitemap, custom-domain and subdomain reads.
2. **Approval is versioned:** material product/shop edits after approval invalidate it and require re-approval.
3. **Consent is explicit:** sending a link, silence, claim or WhatsApp delivery is not publication approval.
4. **Existing public/unclaimed shops are audited, not bulk-mutated.** Historical disposition remains manual.
5. **No planning panel:** Daniel approved Supabase consent/audit + Medusa draft status directly on 2026-07-20.

## What already exists (reuse, don't rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| Unclaimed seller | backend `src/modules/seller/models/seller.ts` (`clerk_user_id` nullable) | Ownership stays unclaimed until claim |
| Promoter shop setup | `app/api/promoter/shop/setup/route.ts` | Create one real seller and attribution |
| Promoter listing | `app/api/promoter/close/listing/route.ts` | Replace force-public behavior only on this path |
| Claim/checkout protection | claim-link/complete routes + `isShopClaimed()` | Preserve transaction safety; do not overload as consent |
| Public catalog channels | existing Medusa status and channel filters | Prove preview exclusion at canonical read seams |
| Signed-link patterns | claim/support/short-link primitives | Generate opaque revocable preview access |
| Growth telemetry | `/api/growth/track` + `lib/growth-engine.ts` | Emit lifecycle facts only after canonical writes succeed |
| Feature flags | `lib/flags.ts` + `platform_flags` + `/admin/flags` | Dark-launch promoter private previews |

## Scope — stories

| Sprint | Story | Risk | Status |
|---|---|---|---|
| 1 | 1.1 Private preview publication state + enablement flag | high | ✅ #292 + #293/#108 |
| 1 | 1.2 Opaque revocable preview link + cross-channel leak guard | high | ✅ #292 + #293/#108 |
| 2 | 2.1 Merchant-readable versioned approval snapshot | high | ✅ #294 (`626f0b1`) |
| 2 | 2.2 Material-edit invalidation and request-changes path | high | ✅ #294 (`626f0b1`) |
| 2 | 2.3 Idempotent public activation of the approved snapshot | high | ✅ #294 (`626f0b1`) |
| 3 | 3.1 Preview-readiness checklist + Golden Beans events | high | ✅ #295 |
| 3 | 3.2 Historical public/unclaimed inventory report | low | ✅ #295 |

**SHIPPED & LIVE 2026-07-24.** All four sprints merged and deployed, both CRITICAL security fixes merged,
the S2 migration applied and verified live, and `promoter.private_preview_enabled` **flipped ON in production**
(verified live 2026-07-24: `platform_flags.enabled = true`). What was "owed before the flag flip" is now
done or descoped — see below.

## Activation record (was "Owed before the flag flip")

1. ~~Apply `20260721150000_consent_previews_s2.sql`~~ — ✅ **DONE 2026-07-22.** Applied via the
   Supabase CLI Management API (`supabase db query --linked --file …`) and verified end-to-end:
   schema, RLS, indexes, FKs, the app's own PostgREST path, plus CHECK/FK rejection tests run in
   rolled-back transactions (0 rows persisted). `sprint-2.md` has the exact command — and the
   project-wide **migration-history drift** it uncovered: 44 local migration files are unrecorded
   remotely, so **`supabase db push` is unsafe in this repo**. Re-confirmed live 2026-07-24:
   `merchant_previews` exists (`to_regclass`).
2. ~~**🚨 Merge PR #296**~~ — ✅ **MERGED 2026-07-22.** The post-merge review found a CRITICAL bypass: the
   MCP surface could publish a merchant's products into a preview-private shop with **no consent check at
   all**. `autoGrantPartnerOnClose` mints the promoter a `manager` partner grant on the very shop
   `shop/setup` anchors private, `partner-auth` resolves from `partner_grants` with no anchor
   check, and only `create_listing` consulted the anchor — so `set_listing_status` bypassed
   approval, the checklist and `canActivate` entirely. Gated by `partners.mcp_enabled`, a
   **different flag from this epic's kill-switch**, so flipping this epic's flag never controlled
   it. #296 also fixes an activation TOCTOU and makes consent writes compare-and-set.
   *(PDP preview-guard fix #297 and merchant-verified-approval S4 #302 also merged.)*
3. ~~**Daniel's owed smokes**~~ — **descoped 2026-07-24 as pre-launch ceremony** (Daniel): zero real
   tenants/campaigns/transactions, so the disposable-shop channel sweep and S1–S4 walkthroughs assume
   operations that don't exist yet. Re-run on demand once real merchants exist. The **structural**
   guarantees the smokes would spot-check are already enforced by regression specs (cross-channel
   private/draft leak invariant, every public render surface calls a preview guard).
4. ~~The two S1 fail-open/already-public confirmations~~ — same pre-launch descope; covered by the
   fail-closed guard specs merged in #293.
5. ~~A disposition call on the imported public/unclaimed shops.~~ ✅ **DONE 2026-07-22.** The S3
   "168" figure was a mirror-drift artifact (see `sprint-3.md`). Live probing showed only 18 shops
   render any product; 154 orphan test/scrape rows (404 everywhere, no Medusa seller) were deleted
   per Daniel's call. **183 → 29 shops.** Backup + full rationale in the cleanup dir.

## Kill-switch

`promoter.private_preview_enabled` is an **enablement** flag in `platform_flags`, default **false** and created
disabled in every environment. It gates the promoter setup/listing orchestration seam: ON creates private draft
products and signed preview access. Public readers also receive a permanent regression invariant proving
private/draft rows cannot leak. Flip only after a disposable shop passes the full channel matrix.

**What OFF actually does (corrected during Sprint 1 review — the earlier "OFF preserves the current route for
rollback" was wrong once implemented).** OFF stops *new* previews being created, so any shop that was never
anchored behaves exactly as it does today. It is **not a per-shop undo**: a shop that already carries a
non-activated anchor stays private regardless of the flag, because a flag flip is not merchant consent (locked
decision #3) — gating the privacy guard on the flag would make privacy fail-open, publishing shops whose
merchants never approved. Un-hiding one shop is deliberate: activate the approved snapshot (Sprint 2), let the
merchant claim it (a claim stops the anchor hiding the shell, while publishing nothing), or
`DELETE FROM merchant_previews WHERE shop_id = …`.

**The Sprint 1 migration is a deploy dependency, not a post-merge chore.** The privacy guard runs on every public
shop render and is *not* flag-gated, so until `20260721140000_consent_previews_s1.sql` is applied the guard's
Supabase read errors on every shop page. It fails open (shops stay visible), but apply it with the deploy.

## Deploy order

Frontend and backend behavior must be compatible before the flag turns on. Prefer the smallest Medusa change
first if a backend read/write contract is required, then land the frontend migration/routes/UI with the flag OFF.
Apply and verify every Supabase migration explicitly in production—the CI gate does not apply it. Run the
disposable-shop channel sweep, then Daniel flips the flag. Golden Beans events degrade safely if its destination
router is not live yet.

## Definition of Done (epic)

- [x] All sprints merged to `main` — S1 #292/#293/#108, S2 #294, S3 #295, S4 #302, security #296/#297;
      disposable-shop smokes descoped as pre-launch ceremony (gap stated in Activation record above)
- [x] Each `sprint-N.md` has its smoke walkthrough with deployed URLs and disposable shop data
- [x] This README marked ✅ (`status: shipped`); every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written — 2026-07-24
- [x] Product poster (`Roadmap/README.md`) updated — 2026-07-24 highlight
- [x] Team memory + `MEMORY.md` index updated — 2026-07-24
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` — the guard-the-population, snapshot-at-approval
      and consent-gate lessons were promoted at the S1–S3 review rounds (see LEARNINGS)
- [x] `promoter.private_preview_enabled` exists with enablement polarity, born OFF; **flipped ON by Daniel**,
      verified live 2026-07-24 (`platform_flags.enabled = true`)
- [x] Every additive Supabase migration confirmed against live schema — S1/S2 tables verified via `to_regclass`
- [x] Feature branch deleted; **frontmatter `status: shipped`** set and `node scripts/build-order.mjs` run 2026-07-24

## Accepted risks (named at review, 2026-07-22)

- **A promoter can self-approve — MITIGATED by S4 (PR #302), with a residual.** S4 (merchant-verified
  approval) sends a one-time code to the merchant's contact and requires it to approve, so a promoter
  clicking "Aprobar" without the code can no longer approve. **Residual (fresh-reviewer, 2026-07-22):**
  the code is sent to `marketplace_shops.metadata.merchant_email`, which the **promoter populates** at
  onboarding. A malicious promoter who set `merchant_email` to *their own* inbox receives the code and
  self-approves — and the record then shows `verified_via='email'`, i.e. **false** assurance, arguably
  worse than an honest NULL. So S4 raises the bar (a code is now required) but does not fully close the
  vector; the guarantee is only as good as the independence of `merchant_email` from the promoter.
  **Daniel's owed browser smoke must target exactly this:** confirm a real, independent merchant
  contact actually receives the code — not the promoter. A future hardening would verify the merchant
  contact through a channel the promoter doesn't control (e.g. captured directly from the merchant at
  claim, or a claim-time re-verification). Until then, S4 is a meaningful tightening, not a proof of
  identity — and the copy says so ("confirma tu contacto, no es una firma legal").
- ~~The PDP has no preview guard.~~ ✅ **FIXED (PR #297).** `app/(shell)/l/[id]` now calls
  `assertShopNotPreviewPrivate`, and a structural spec enforces that every public shop/product
  render surface calls a guard. The residual risk it closed: a partially-failed activation left
  orphan public product pages while `/s/<slug>` 404'd.
- **What protects checkout is not the claim flag.** Traced 2026-07-22: `isShopClaimed()` gates the
  PDP/checkout *pages* and the UCP surfaces, but there is no claim check on the charge path. Before
  activation the protection is structural (drafts are unreachable via `/store/products/:id`); after
  activation it is that an unclaimed shop has no connected payment provider, and MCP refuses to set
  `bank_transfer`/CLABE. The outcome holds; the earlier "checkout stays claim-gated" wording did not.
