# Pricing & money-path remediation — Sprint 2: hygiene (Europe region + migrations sweep)

**Risk:** LOW (F) / LOW–MED (sweep) · **Status:** ⬜ not started · **Precondition:** Sprint 1 in
flight or done.

## Story 2.1 — Finding F: remove the leftover "Europe" region

**Bug:** a default "Europe" region is live in Medusa, surfacing as an irrelevant extra pricing
column in Admin for every product. Mexico-only marketplace. Does **not** affect checkout (the cart
path only ever reads `MXN_REGION_ID`), so this is pure hygiene.

**What to do:** **first** grep the codebase for any Europe/EUR/region-id reference before deleting
anything — confirm nothing keys off it. Then delete the stray region via Medusa Admin (or a
one-off script) with explicit sign-off (it's a prod-DB mutation, however low-risk).

**Files/anchors:** search `apps/backend` and `apps/miyagisanchez` for hardcoded region ids / `eur`
/ `europe`; `lib/cart.ts` `MXN_REGION_ID` env resolution (the only region the money path uses).

**Risk tier:** LOW. **Verification:** grep returns no code dependency on the Europe region id;
after deletion, Admin's price editor for any product shows only MXN/Mexico columns; a Medusa-cart
checkout of any product still completes in MXN (no region regression).

## Story 2.2 — Migrations-vs-applied sweep (Finding B precedent)

**Why:** Finding B (bookshop-launchpad schema merged but never applied → 4+ days silently broken)
is fixed, but it confirmed the exact failure mode `supabase-migration-file-vs-applied-gap` warns
about. Do a **one-time sweep**: for every epic with Supabase migration files, confirm each file
actually appears in `list_migrations` on prod.

**What to do:** enumerate migration files across the repo vs.
`mcp__plugin_supabase__list_migrations`; flag any file-present-but-not-applied gap. Read-only
audit; any fix (applying a missing migration) is a separate, signed-off action.

**Risk tier:** LOW–MED (read-only audit; remediation of any gap is separately authorized).
**Verification:** a written file-vs-applied diff with zero unexplained gaps, or a list of gaps
with an applied/ticketed disposition each.

## Sprint 2 — findings log
_(filled in as the work proceeds)_
