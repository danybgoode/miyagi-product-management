---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
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
| S1 | **Finding D** — fresh zero-price variant can't have a price set via `seller-product-update.ts` (`"Price set with id: undefined not found"`) | HIGH | ✅ shipped + live — PR [#89](https://github.com/danybgoode/medusa-bonsai-backend/pull/89) |
| S1 | **Finding E** — Admin's dual MXN/region columns create two price rows; ambiguity guard misfires as if they were real tiers | HIGH | ✅ shipped + live — PR [#89](https://github.com/danybgoode/medusa-bonsai-backend/pull/89) |
| S2 | **Finding F** — delete leftover default "Europe" region (pricing-editor hygiene) | LOW | ✅ shipped + live — PR [#92](https://github.com/danybgoode/medusa-bonsai-backend/pull/92) |
| S2 | Migrations-vs-applied sweep across other epics (Finding B precedent) | LOW–MED | ✅ done — 3 gaps found + fixed live, see sprint-2.md |
| S3 | **Findings G/H** — convocatoria "Género" dropdown + paste-a-story option | LOW | ⬜ **deferred** to bookshop-launchpad grooming |

## Deploy order

**S0 is the gate — nothing merges, and no paused feature work resumes, until S0 closes.** S0
**closed 2026-07-13 — Finding A REFUTED** (full evidence trail in `sprint-0.md`): every real
checkout path this marketplace actually uses charges buyers exactly what's displayed. No fix
needed. **S1 also closed 2026-07-13 — Findings D+E fixed, merged (PR #89), deployed, and verified
live** (full 3-attempt investigation writeup in `sprint-1.md`). **S2 closed 2026-07-15 — Finding F
deleted + verified live (PR #92), migrations sweep complete (3 real gaps found across other epics,
all fixed live)** — full detail in `sprint-2.md`. S3 stays deferred. **The epic is functionally
done** — only close-out docs (retrospective, `Roadmap/README.md` poster, `LEARNINGS.md`) remain.
`panfleto-premium-shop` Sprint 3 has been fully cleared to resume since S1 closed. Every
destructive-op story in this epic got explicit in-conversation Daniel sign-off before merge AND
separately before live execution, per WAYS-OF-WORKING.

## Definition of Done (epic)

- [x] S0 produces a **written verdict** on Finding A (confirmed / refuted) with the actual
      evidence — **REFUTED**, see `sprint-0.md`. No conditional fix sub-story needed.
- [x] Findings D + E fixed, each with a live before/after reproduction (not just tsc/build).
- [x] Finding F region removed; codebase confirmed free of Europe-region-id references first.
- [x] Migrations sweep run; any gaps logged (fixed or ticketed) — 3 real gaps found
      (`tenant_intake`, `marketplace_migration_estimates`, ticket-token unique index), all applied
      live and re-verified via direct schema query. See `sprint-2.md`.
- [x] `panfleto-premium-shop` Sprint 3 explicitly cleared to resume (sequencing note below).
- [x] Each `sprint-N.md` has its real smoke walkthrough; statuses ticked with commit refs.
- [ ] Team memory + `LEARNINGS.md` updated (the cents-vs-major-units semantics is a durable,
      cross-cutting learning worth promoting regardless of the verdict).
- [ ] `RETROSPECTIVE.md` written, `Roadmap/README.md` poster updated, epic frontmatter → `shipped`.

## Recommended sequencing

1. ✅ **Sprint 0 / Finding A — DONE, REFUTED.** Traced Medusa v2.15.3's payment-session source
   end-to-end for both checkout shapes this marketplace uses (flat-price and Medusa-cart). Every
   real charge is self-consistent with what's displayed — full evidence in `sprint-0.md`. No fix
   needed. Skipped the Stripe test-mode probe (Story 0.2) — the source trace left no ambiguity.
2. ✅ **Sprint 1, Findings D and E — DONE, MERGED + LIVE.** PR #89, verified live against both
   real affected products post-deploy — see `sprint-1.md` for the full 3-attempt investigation
   writeup (the real Finding D root cause was a plain `price_set_id` vs. `priceSetId` key-name
   typo in Medusa's `addPrices()` call, found only on the third attempt after two independently
   reviewed fixes turned out to be no-ops).
3. **Next: Sprint 2, Finding F** (delete the stray Europe region after confirming nothing
   references it) **and the migrations sweep** — quick, low-risk hygiene.
4. **Sprint 3 (Findings G/H) deferred** back to bookshop-launchpad grooming.
5. **`panfleto-premium-shop` Sprint 3 is now fully cleared to resume** — both gating conditions
   (Sprint 0 safe, Sprint 1 fixed+live) are satisfied.
6. **`mcp-parity-core` Sprints 2–4 and `mcp-parity-config`** (already scoped, unbuilt) stay lower
   priority than everything above — resume after this hardening pass, not during it.
