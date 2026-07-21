---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Private preview publication state + enablement flag | high |
| 1 | 1.2 Opaque revocable preview link + cross-channel leak guard | high |
| 2 | 2.1 Merchant-readable versioned approval snapshot | high |
| 2 | 2.2 Material-edit invalidation and request-changes path | high |
| 2 | 2.3 Idempotent public activation of the approved snapshot | high |
| 3 | 3.1 Preview-readiness checklist + Golden Beans events | high |
| 3 | 3.2 Historical public/unclaimed inventory report | low |

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

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough with deployed URLs and disposable shop data
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] `promoter.private_preview_enabled` exists with enablement polarity, born OFF; disposable channel sweep passes before Daniel flips it
- [ ] Every additive Supabase migration confirmed against live schema, not inferred from CI
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** and `node scripts/build-order.mjs` run
