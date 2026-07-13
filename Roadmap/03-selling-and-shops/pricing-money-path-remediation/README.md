---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: pricing-money-path-remediation
---

# Epic: Money-Path & Pricing Integrity Remediation

> **Area:** 03-selling-and-shops · **Risk:** HIGH (real pricing / checkout / money-path; Daniel
> authorizes + merges every pricing/checkout change — no exceptions per WAYS-OF-WORKING)
> **Class:** Remediation / hardening — audit-first, one confirmed unknown gates everything.

## Why

Daniel called this before any more feature-building: *"first lets review and fix all the bugs and
cleanups etc we have found along the way… our foundation needs to be rock solid."* Building
`panfleto-premium-shop` Sprint 3 surfaced one **CRITICAL latent money-path unknown** (Finding A)
plus two live seller-facing pricing write-path bugs (D, E) and one piece of pricing-editor hygiene
(F). The paused Sprint 3 money smoke would be the **first real exercise of the exact checkout path
Finding A questions** — so it cannot resume until A is resolved with certainty.

The single most important fact framing the whole epic: **zero real orders exist**
(`select count(*) from marketplace_orders` → 0, confirmed live; Daniel confirmed no traffic/
campaigns). Every risk here is **latent** — no incident response, no refunds, no customer impact.
This is a "make the foundation certain before the first real buyer" pass, not a fire.

## Medusa-first note

No new commerce primitives. Finding A is an *investigation* into Medusa v2.15.3's own
payment-session-creation pipeline (`@medusajs/medusa` / `@medusajs/core-flows`, pinned `^2.15.3`);
any fix reuses existing write/read paths. Findings D/E fix hand-rolled orchestration in
`seller-product-update.ts` by aligning it to Medusa's own officially-supported pricing workflow,
not by inventing a new one. Finding F deletes a stray Region via Medusa's own Admin/API.

## What already exists (context, do not rebuild)

- **Two checkout paths, only one in question:**
  - *Flat-price path* (`app/api/stripe/checkout/route.ts`, `app/api/mp/checkout/route.ts`) — reads
    `price_cents` from this app's own Supabase `marketplace_listings` mirror and passes
    `unit_amount: priceCents` straight to Stripe. Self-consistent, bypasses Medusa's `amount`
    entirely. **CONFIRMED SAFE — not touched by this epic.**
  - *Medusa-cart path* (`apps/miyagisanchez/lib/cart.ts` `startCheckout`, `MXN_REGION_ID` cart at
    `:254`) — used by every multi-variant / CPP-configurator / quantity-tier product, the MCP
    `create_checkout` tool, and print/promoter checkouts. Hands the charge amount to Medusa's own
    cart-total → payment-session pipeline. **This is the path Finding A questions.**
- **The self-consistent cents convention:** this app writes `amount: price_cents` (e.g. `5000` for
  "$50.00") in `seller-product-create.ts` / `seller-product-update.ts` and divides by 100 on every
  read (`lib/listings.ts`, `lib/price-grid.ts`). Safe *only while this app's own code is the sole
  reader/writer*.
- **The already-reproduced 100x display bug:** Medusa Admin's native price editor writes true major
  units (typing "25" stores `amount: 25`), which this app's ÷100 read renders as "$0.25".
  Live-reproduced 2026-07-13. This is the visible symptom; Finding A asks whether the *charge* is
  affected too.
- **`bookshop-launchpad` migration gap (Finding B):** whole epic's Supabase schema merged
  2026-07-07 but never applied to prod → silently broken 4+ days. **Already FIXED** (3 migrations
  applied 2026-07-12, round-trip verified). Cited only as precedent for the S2 migrations sweep.
- **`publishSubmission` mirror-sync gap (Finding C):** launchpad products invisible to
  ownership-gated tools. **Already FIXED** (frontend PR #241, `a216e84`, cross-agent reviewed).
  No action.

## Scope — stories

| Sprint | Story | Risk | Status |
|---|---|---|---|
| S0 | **Finding A** — resolve the Medusa-cart charge-semantics unknown with certainty (source-trace). GATE. | HIGH | ✅ **REFUTED — safe**, see sprint-0.md |
| S0 | Finding A follow-on — *if confirmed*, scope the fix; *if refuted*, document the evidence | HIGH | ✅ refuted, documented — no fix needed |
| S1 | **Finding D** — fresh zero-price variant can't have a price set via `seller-product-update.ts` (`"Price set with id: undefined not found"`) | HIGH | ⬜ not started |
| S1 | **Finding E** — Admin's dual MXN/region columns create two price rows; ambiguity guard misfires as if they were real tiers | HIGH | ⬜ not started |
| S2 | **Finding F** — delete leftover default "Europe" region (pricing-editor hygiene) | LOW | ⬜ not started |
| S2 | Migrations-vs-applied sweep across other epics (Finding B precedent) | LOW–MED | ⬜ not started |
| S3 | **Findings G/H** — convocatoria "Género" dropdown + paste-a-story option | LOW | ⬜ **deferred** to bookshop-launchpad grooming |

## Deploy order

**S0 is the gate — nothing merges, and no paused feature work resumes, until S0 closes.** S0
**closed 2026-07-13 — Finding A REFUTED** (full evidence trail in `sprint-0.md`): every real
checkout path this marketplace actually uses charges buyers exactly what's displayed. **No fix
needed for Finding A; `panfleto-premium-shop` Sprint 3 is cleared to resume.** Now S1 (each story
Daniel-authorized) → S2 → (S3 deferred). Every S1 story is still HIGH-risk money/pricing → Daniel
authorizes and merges each per WAYS-OF-WORKING. Destructive prod ops (Region delete, any prod-DB
pricing rewrite) get explicit in-conversation sign-off.

## Definition of Done (epic)

- [x] S0 produces a **written verdict** on Finding A (confirmed / refuted) with the actual
      evidence — **REFUTED**, see `sprint-0.md`. No conditional fix sub-story needed.
- [ ] Findings D + E fixed, each with a live before/after reproduction (not just tsc/build).
- [ ] Finding F region removed; codebase confirmed free of Europe-region-id references first.
- [ ] Migrations sweep run; any gaps logged (fixed or ticketed).
- [ ] `panfleto-premium-shop` Sprint 3 explicitly cleared to resume (sequencing note below).
- [ ] Each `sprint-N.md` has its real smoke walkthrough; statuses ticked with commit refs.
- [ ] Team memory + `LEARNINGS.md` updated (the cents-vs-major-units semantics is a durable,
      cross-cutting learning worth promoting regardless of the verdict).

## Recommended sequencing

1. ✅ **Sprint 0 / Finding A — DONE, REFUTED.** Traced Medusa v2.15.3's payment-session source
   end-to-end for both checkout shapes this marketplace uses (flat-price and Medusa-cart). Every
   real charge is self-consistent with what's displayed — full evidence in `sprint-0.md`. No fix
   needed. Skipped the Stripe test-mode probe (Story 0.2) — the source trace left no ambiguity.
2. **Next: Sprint 1, Findings D and E** — the two live seller/agent pricing write-path bugs. These
   are the "foundation" Daniel meant; both HIGH-risk, each Daniel-authorized.
3. **Then Sprint 2: Finding F** (delete the stray Europe region after confirming nothing
   references it) **and the migrations sweep** — quick, low-risk hygiene.
4. **Sprint 3 (Findings G/H) deferred** back to bookshop-launchpad grooming.
5. **`panfleto-premium-shop` Sprint 3 is cleared to resume** (Sprint 0 closed safe) — but its
   vote→coupon→redeem money smoke buys the exact CPP print-product reward that hit Finding D/E
   this session (an Admin-set price on a fresh zero-price variant), so it should still wait until
   Sprint 1 fixes those two bugs — otherwise the smoke just re-hits the known, already-scoped
   issue rather than proving something new.
6. **`mcp-parity-core` Sprints 2–4 and `mcp-parity-config`** (already scoped, unbuilt) stay lower
   priority than everything above — resume after this hardening pass, not during it.
