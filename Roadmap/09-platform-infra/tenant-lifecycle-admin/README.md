---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: tenant-lifecycle-admin
---

# Epic: Tenant lifecycle — give /admin real control over shops

> **Area:** 09 · Platform & Infra · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/tenant-lifecycle-admin.md`](../../00-ideas/seeds/tenant-lifecycle-admin.md)

## Why

`/admin/tenants` lists every shop and can do nothing to any of them. The `admin-consolidation` epic
shipped it as a strict read-model and deliberately deferred suspend, because Medusa had no
seller-status primitive and a Supabase `metadata.suspended` flag honored by only some consumers is
worse than no feature at all — a shop that looks paused in the admin and still sells through the API
is a lie the platform tells its operator.

That deferral is now the gap. The product owner needs to edit a shop, pause an account, remove one,
see the email a merchant actually registered with, and sort the directory by the platform's own
heuristics instead of alphabetically by name.

When this epic is done, pausing a shop in `/admin` makes it genuinely dark: its products leave the
catalog, its checkout refuses, its portal says why, and unpausing puts it all back.

## Medusa-first note

Tenants **are** Medusa sellers (`apps/backend/src/modules/seller`), mirrored into
`marketplace_shops` for display. The status therefore belongs on the Medusa `seller` model, not on
the mirror — AGENTS rule 1. Visibility is enforced through the primitive Medusa already treats as
publication truth: **Sales Channel membership**. `apps/backend/src/api/store/listings/route.ts` says
it outright — *"Sales Channel membership IS marketplace-publication truth"* — so pausing unlinks and
unpausing relinks, and no read path needs a new filter to obey it.

## What already exists (reuse, don't rebuild)

- `apps/backend/src/modules/seller/models/seller.ts` — the model. Has `verified`, `source`,
  `metadata`; **no `status`**. That column is the one genuinely new thing here.
- `apps/backend/src/api/store/_utils/checkout-admission.ts` — the money-path admission seam from the
  owned-shop epic. Already proves per-object *"owned by a seller operating in this market"*, so
  "…and that seller is not paused" is a one-fact extension in a boundary that already exists.
- `apps/backend/src/api/internal/sellers/*` — internal seller read/claim/grant routes, `MEDUSA_INTERNAL_SECRET`-gated.
- `apps/miyagisanchez/lib/admin/tenant-directory{,-server}.ts` + `/admin/tenants` — the directory and
  its pure `shapeTenantRow` shaper.
- `apps/miyagisanchez/lib/email.ts` → `getSellerEmail(clerkUserId)` — already resolves a registration
  email through the Clerk Management API. The directory carries `clerk_user_id` already.
- `apps/miyagisanchez/lib/admin/audit.ts` + `admin_audit_log` — the ops record every mutation writes.

## Decisions (locked against live code + the live database, 2026-08-14)

**D1 — Status is a column on the Medusa seller, with three values and a default.**
`status: 'active' | 'paused' | 'deleted'`, default `'active'`, added by a Medusa module migration.
Not an enum type — Medusa's `model.text()` with a validated parser at the seam, matching how `source`
is already modelled. Existing rows backfill to `'active'` by the column default, so the migration is
additive and safe on a populated table.

**D2 — Pause is enforced in three places, and three is the complete population.** Not 61 routes.
Enumerated mechanically from `src/api/store/**`, every path that can surface or transact a paused
seller reduces to: **(a) catalog visibility** — unlink the seller's products from every market sales
channel, which removes them from `/store/listings`, `/store/listings/:id`, `/store/sellers/:slug/*`,
search, sitemap, the agent surface and the embed *by construction*; **(b) the money path** —
`checkout-admission.ts` refuses a product whose owning seller is not `active`, which also covers
`start-checkout` and cart completion; **(c) the seller portal** — `/store/sellers/me/*` write routes
refuse with a distinguishable status so the seller sees an explanation, not a broken screen.
Belt and braces is deliberate: (a) is the mechanism, (b) is the guarantee. If a channel link ever
lingers, checkout still refuses.

**D3 — Delete is a soft delete and is reversible.** `status: 'deleted'` plus the same unlink, plus
Medusa's native product soft-delete. Order history, payouts and the ledger stay intact and readable —
a hard delete would orphan real orders and there is no second copy of that data. The admin calls it
*Eliminar*; the record survives. A hard purge is not built: nothing needs it, and it is the one
action in this epic that could not be undone.

**D4 — Unpause must restore exactly what pause removed, so pause records what it did.** Relinking
"every product owned by this seller" is *not* the inverse of unlinking, because a seller can own
products that were legitimately unlinked for other reasons — an owned-shop-only product is absent
from the marketplace channel by design (`catalog.owned_shop_only_enabled`), and a draft is linked to
the operating channel but not the marketplace one. Pause therefore persists the exact set of
`(product_id, sales_channel_id)` pairs it removed, into `seller.metadata.paused_channel_links`, and
unpause replays that set and clears it. Without this, unpausing an owned-shop seller would silently
publish its private catalog to the marketplace.

**D5 — The registration email is read from Clerk at request time, never stored.** `getSellerEmail`
already exists and hits the Clerk Management API. The directory enriches rows with it on read,
concurrency-bounded exactly like the existing market projection read, and an unavailable Clerk is the
**unavailable** state — never a blank that reads as "this merchant has no email". Copying emails into
`marketplace_shops` would create a second, staler source of a personal datum; Clerk stays the SSOT.

**D6 — Sorting and filtering are server-side over the full set, not client-side over a page.** The
directory already loads every shop unpaginated. The heuristics the product owner asked for are:
status, market, claimed/unclaimed, listing count, custom-domain state, entitlement, created-at, and
last-activity. Sorts are computed in the pure `tenant-directory.ts` shaper so the Playwright `api`
runner can unit-test them without a database, matching how the module is already split.

**D7 — Every mutation is Clerk-gated and audited, and validates before it writes.**
`withAdmin` runs before the handler; the pure plan (parse → validate → decide) is hoisted above every
mutation, so a rejected edit cannot persist half of itself. This is the exact defect the owned-shop
epic shipped a fix for — a 423 returned *after* the title was already written — and the spec asserts
the **ordering** via a write-trace, because asserting the status code alone would pass against the
broken shape too.

**D8 — The admin surface writes through Medusa, never around it.** `/api/admin/tenants/[id]` calls the
backend's internal seller routes with `MEDUSA_INTERNAL_SECRET`; it never writes `marketplace_shops`
first and reconciles later. The mirror is refreshed *from* Medusa after the write. This preserves
`admin-consolidation`'s D4 (the directory is a strict read-model over canonical Medusa ids) while
adding the write path underneath it.

**D9 — CORRECTED at build time: this was already done, platform-wide.** The decision asked for a new
fail-closed check on the status route. `src/lib/internal-auth.ts` already **is** that check —
`internalSecretOk` denies when `MEDUSA_INTERNAL_SECRET` is absent, empty or whitespace, and it exists
precisely because fifteen hand-rolled copies of the guard were live at once and three of them failed
*open*. Writing a sixteenth would have been the exact mistake that file was created to end. The status
route imports it, and re-deriving the polarity at the call site is forbidden.

What the route does add is a **503 when no market sales channel is configured**. Without a channel
there is no way to make a shop dark, so flipping the status alone would report a pause that did not
happen — the lying-admin failure this epic exists to prevent.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 `status` on the Medusa seller model + migration (D1) | LOW |
| 1 | 1.2 Internal status-transition route, fail-closed (D8, D9) | HIGH |
| 1 | 1.3 Pause/unpause channel-link ledger (D4) | HIGH |
| 2 | 2.1 Catalog visibility follows status (D2a) | HIGH |
| 2 | 2.2 `checkout-admission` refuses a non-active seller (D2b) | HIGH |
| 2 | 2.3 Seller portal refuses with a distinguishable status (D2c) | MEDIUM |
| 3 | 3.1 Directory shows the Clerk registration email (D5) | LOW |
| 3 | 3.2 Server-side filter + sort over the platform's heuristics (D6) | LOW |
| 3 | 3.3 Edit / pause / unpause / delete actions, audited (D3, D7) | HIGH |

## Deploy order

Backend first and entirely — the migration, the status column and all three enforcement seams — then
the admin UI. The frontend degrades gracefully in the gap: an admin action against a backend that does
not yet expose the route gets a 404 and says so, rather than reporting a success it did not achieve.

**Correction (build time): this migration is NOT applied by the orchestrator.** The scaffolded plan
said "applied via Supabase MCP before the merge", which is the rule for the *Supabase* project and
wrong for Medusa. Medusa migrations run inside the container at startup —
`docker-entrypoint.sh` runs `npx medusa db:migrate` before `medusa start`, on every non-worker
instance. Merging is therefore what applies it, and the sequence is safe because the change is
purely additive: `status` is NOT NULL with a `'active'` default, so during the rolling deploy the old
revision keeps serving rows it does not read the column of, and the new revision never sees a row
without one. There is no window to sequence around, and nothing to apply by hand.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] A disposable shop has been paused, verified dark on all three seams, and unpaused to its exact prior state
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
