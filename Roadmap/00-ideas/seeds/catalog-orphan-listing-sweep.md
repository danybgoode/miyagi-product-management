---
title: "Orphan listings still in the public catalog — empty shop.slug breaks the embed surface"
slug: catalog-orphan-listing-sweep
status: shipped
area: "03"                           # Selling & Shops (the seller↔product link); surfaces on 07 embed + 01 browse
type: bug                            # class: Bug (residual bad data + missing invariant) · archetype: Sweeper/Maintainer
priority: null
risk: high                           # touches published-listing state in prod commerce data
epic: "03-selling-and-shops/catalog-orphan-listing-sweep"
build_order: null
updated: 2026-07-19
---

# Scope — sweep the orphan listings the 2026-07-15 backend fix left behind

## Mirror-back of the ask

> *"From a production smoke daily routine I've been receiving this: Miyagi prod smoke — 1 check
> FAILED (2026-07-19). Check 4 (embed iframe): catalog `items[0].shop.slug` is empty (""), so
> `https://miyagisanchez.com/embed/s/` returned HTTP 308, not 200 — no CSP header."*

You want the daily smoke green again — but the real ask underneath is: **why is a listing with no
shop sitting at the top of the public catalog, and how do we make sure one never can be again?**

## This is not a harness bug. The smoke is right.

The empty slug is **deliberate** and documented in our own code —
`apps/miyagisanchez/lib/ucp/schema.ts:367-384`. When `toUcpListing()` gets a listing with **no
linked shop**, it emits a fallback payload with `slug: ''`. The comment there is explicit that a
synthetic non-empty placeholder was *tried and reverted*, because every consumer in the codebase
reads `shop?.slug` and treats falsy as "no real shop" — a fake truthy slug just sends them to a
storefront that doesn't exist.

So the chain is exactly as reported and there is no mystery in it:

1. An orphan listing (published, catalog-visible, **no seller link**) sorts to `items[0]`.
2. `shop.slug` is `''`.
3. The smoke builds `/embed/s/` + `''` → `https://miyagisanchez.com/embed/s/`.
4. That path has no `[slug]` segment, so Next.js 308-redirects it. No 200, no
   `Content-Security-Policy: frame-ancestors *` header — hence "no CSP header".

**The failing check is doing its job.** The defect is the orphan row, not the assertion.

## Root cause — and what was already fixed

Same `schema.ts` comment records the history: this is the **2026-07-15 embed-iframe incident**. The
fix already shipped is *upstream* — `apps/backend/src/api/store/_utils/seller-product-create.ts`
now makes product-create + seller-link **atomic**, so a published, catalog-visible, seller-less
listing can no longer be **created**.

That closed the tap. **It did not drain the sink.** Rows created before the fix are still in prod,
still published, and still served by `/api/ucp/catalog`. Four days later one of them is at
`items[0]`, which is why the smoke is only failing now.

## The second finding — CI has been silently skipping this

`apps/miyagisanchez/e2e/embed-shop.spec.ts:30-31` derives its slug the same way:

```ts
const slug = (await cat.json())?.items?.[0]?.shop?.slug
test.skip(!slug, 'no active listings in this environment')
```

`''` is falsy, so on an orphan the spec **skips instead of failing** — reported as green. The
daily prod smoke caught what the deterministic gate was designed to catch and didn't. That skip
guard is reasonable for a genuinely empty environment and unreasonable for a *populated* one;
Story 3 below separates the two cases.

## Stage-2.5 bucket

**Genuinely new work — as a data sweep plus an invariant.** No positioning or copy path exists; a
listing with no shop cannot be bought, attributed, or paid out, so it has no business being public.

## Decision taken at grooming (Daniel, 2026-07-19)

**Unpublish the orphans, then guard.** Not a per-row backfill: a listing with no seller link has no
one to pay and no storefront to render, so pulling it from the public catalog is the correct and
reversible action. Any row that *should* have had a seller can be re-linked and re-published
individually afterwards — that's a follow-up, not a blocker.

## What already exists (reuse, don't rebuild)

- `lib/ucp/schema.ts`'s fallback branch — **leave it exactly as it is**. It is the correct
  defensive behaviour and the comment explains why a placeholder slug was reverted. This epic makes
  the branch *unreachable in prod data*; it does not delete the branch.
- `apps/backend/.../seller-product-create.ts` — the atomic create is the already-shipped preventive
  half. Read it before writing the sweep so the sweep's definition of "orphan" matches the
  invariant the create path now enforces.
- The **enforced-sweep-list static-guard pattern** (LEARNINGS — raw-color guard,
  seller-portal-rails-foundation S2) for Story 3.
- `e2e/embed-shop.spec.ts` — extend it; don't fork a second embed spec.
- The backend unit-test rail (`medusa build` → `tsc --noEmit` → `npm run test:unit`) is the
  deterministic gate. **There is no per-branch backend preview** — live confirmation is post-merge
  against prod (WAYS-OF-WORKING §5).

## Scope — proposed stories

**Story 1 — Report the orphans (LOW, do this first and stop).**
> **As** Daniel, **I want** to know exactly how many published listings have no seller link and
> what they are, **so that** I can confirm unpublishing them is safe before anything mutates.

A read-only script/query that lists every published, catalog-visible listing whose seller link is
absent — id, title, created_at, price, and whether it has **any orders against it**. Output posted
to the PR. **No writes.** If the list is one test row, this whole epic is ten minutes; if it's
three hundred rows with live orders, the plan changes and we re-groom. Do not proceed to Story 2
without Daniel reading this output.

**Story 2 — Unpublish them (HIGH — Daniel merges).**
> **As** a buyer or agent, **I want** the public catalog to only contain listings that belong to a
> real shop, **so that** every result I see can actually be bought.

Unpublish (not hard-delete — reversible) the rows from Story 1's list. **Any orphan with orders
against it is excluded and escalated to Daniel**, not swept — an order implies money moved and
implies the link loss is a *different* bug than the create-path race. Idempotent and re-runnable.

**Story 3 — Make it unrepeatable (LOW).**
> **As** a builder, **I want** the catalog's shop-slug invariant enforced by the gate, **so that**
> an orphan can never silently reach production again.

Three parts, all cheap:
- A spec asserting **no item** in `/api/ucp/catalog` output has an empty `shop.slug` — not just
  `items[0]`. The current smoke only samples the first row; an orphan at `items[7]` is invisible
  today.
- Fix the `embed-shop.spec.ts:31` skip so it distinguishes *no listings at all* (legitimately skip)
  from *listings exist but the first has no shop* (**fail loudly**).
- Confirm the daily prod-smoke check 4 keeps its strict assertion. It behaved correctly; nothing to
  weaken here. Explicitly resist "fixing" the smoke by making it tolerate an empty slug — per the
  smoke-triage routine's own rule, never make a red smoke pass by weakening it.

## Acceptance criteria

- `curl https://miyagisanchez.com/api/ucp/catalog | jq '[.items[] | select(.shop.slug == "")] | length'`
  returns **0**.
- The daily prod smoke's check 4 passes: `/embed/s/<slug>` returns **200** with
  `Content-Security-Policy: frame-ancestors *`.
- `e2e/embed-shop.spec.ts` **runs** (not skips) against prod and passes.
- The new no-empty-slug spec was observed **red** at least once before the sweep ran.
- No listing that has orders against it was unpublished.

## QA / smoke stage

- Backend/data change → **no preview**; confirmation is post-merge prod smoke by the agent
  (`curl` on `/api/ucp/catalog` + `/embed/s/<slug>` for headers and status).
- **Owed to Daniel:** eyeball the Story 1 report before Story 2 merges, and spot-check that no
  legitimate seller lost a listing — browse `/` and one known shop page after the sweep.

## Risk tier

**Story 1 LOW · Story 2 HIGH (Daniel merges — it mutates published commerce data) · Story 3 LOW.**

## Open risks / research

- **Why did these rows lose their link?** The atomic-create fix assumes the cause was a non-atomic
  create. If Story 1's report shows orphans created *after* 2026-07-15, that assumption is wrong
  and there's a second, unfixed path — stop and escalate rather than sweeping.
- Sort order of `/api/ucp/catalog` is `reciente` by default, so a *newly* orphaned row will always
  land at `items[0]` and re-break the smoke immediately. That makes the Story 3 spec the real
  long-term protection, not the sweep.
- Interaction with `seller-catalog-null-slot-sweep` (03, currently scaffolded/unbuilt): that epic
  handles the **inverse** case — a seller whose *product* was soft-deleted, leaving a null slot.
  Different direction, same link table. Whoever builds second should re-read the other's helper
  before adding a third resolver.
