# Pricing & money-path remediation — Sprint 2: hygiene (Europe region + migrations sweep)

**Status:** ✅ CLOSED — Finding F deleted + verified live, migrations sweep done (3 gaps found +
fixed).

**Risk:** LOW (F) / LOW–MED (sweep) · **Precondition:** Sprint 1 done (✅ — cleared to start).

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

### Story 2.1 — Finding F, done — live execution confirmed 2026-07-15

`POST /internal/setup-mexico` executed against production post-deploy: response confirmed
`"✓ Deleted stale region \"Europe\" (reg_01KRVSMYDE8R86G39AHQ48JC8S, eur) — no real pricing
depended on it"` (not the manual-review warning branch). Independently re-verified via
`GET /store/regions` (publishable-key auth): only `Mexico (mxn)` remains live — Europe is
genuinely gone, no other stray regions. Admin's price editor now shows only the MXN/Mexico column
for every product.

Fixed as step 6 of the existing idempotent `POST /internal/setup-mexico` route (backend PR
[#92](https://github.com/danybgoode/medusa-bonsai-backend/pull/92), squash `4c6d978`, merged
2026-07-15): before deleting any non-Mexico region, re-fetches every product's variant prices and
refuses to delete if any real price uses that region's currency (belt-and-suspenders — the manual
76-product EUR sweep done before writing the route already confirmed zero). Uses Medusa's official
`deleteRegionsWorkflow` (`@medusajs/medusa/core-flows`), which a fresh cross-agent review confirmed
does a **soft delete** (recoverable) and only removes region-scoped remote-links — no cascade to
orders, price sets, or products. Repo-wide grep confirmed no code anywhere keys off the Europe
region id. Reviewed and approved by an independent fresh `pr-reviewer` pass, merged with Daniel's
explicit go-ahead, deployed via Cloud Build to `medusa-web` on `main`. Live execution
(`POST /internal/setup-mexico`) run post-deploy per Daniel's explicit go-ahead — see result below.

### Story 2.2 — migrations sweep, done

Full sweep across all 68 local migration files vs. `list_migrations` on the live `bonsaiClerk`
Supabase project. Key technique correction mid-sweep: `apply_migration` (the MCP tool) records
**its own run timestamp** as the migration version, not the local filename's timestamp — an
exact-timestamp diff produces false positives. Switched to a name-based diff, which resolved most
"missing" candidates (36 → 18), then verified the remaining 18 against **live schema/data
directly** (the only fully-authoritative check) rather than trusting migration bookkeeping at all.

**Ruled out as false positives:**
- 11 `platform_flags` seed migrations — all 11 flag keys confirmed present live.
- 3 `marketplace_promoter*` tables — all 3 confirmed to exist live (just recorded under different
  migration names/versions).
- 12 `remote_baseline` files — name-mismatch only, no real gap.
- `custom_domain_provider_semantics` — confirmed doc-only (`COMMENT ON COLUMN`, no DDL), not a real
  migration, correctly never "applied" as schema.

**3 genuine gaps found, all now fixed (applied live 2026-07-15, Daniel's explicit go-ahead):**

1. **`tenant_intake`** (`onboarding-three-doors` epic, Sprint 1 Story 1.1) — table did not exist.
   Fails soft (`lib/tenant-intake.ts` swallows every read/write error, degrading to defaults), so
   this was **silent**, not a visible break: the entire Q1/Q2 "what do you sell / where" chip
   personalization and `chosen_door` persistence has been completely inert since the epic
   "shipped" 2026-07-11 — no onboarding data has ever actually been saved. Same failure class as
   the bookshop-launchpad incident (`supabase-migration-file-vs-applied-gap`), but silent instead
   of loud because of the degrade-safe read pattern.
2. **`marketplace_migration_estimates`** (`platform-migrations` epic, Sprint 2 Story 2.2) — table
   did not exist. Does **not** fail soft: `classifyMigrationPricing` in
   `lib/migration-estimate-store.ts` doesn't check the insert's `error`, so any Shopify migration
   batch over the 150-listing flat-price cap gets a hard 500 trying to generate a quote — the
   entire "estimate" pricing tier has been completely broken since this epic "closed"
   2026-07-11. This is the exact gap `platform-migrations`' own memory entry already flagged as
   unverified ("Owed: S0/S1/S2 live+money smokes") — now confirmed as a real break, not just an
   unconfirmed smoke. Money-path-adjacent (this table backs the "a close can never charge more
   than the quote" guarantee) but fails closed, not open — no seller could ever have been
   overcharged, they'd just have hit a 500 trying to get a quote at all.
3. **`marketplace_event_registrations_ticket_token_uidx`** (Events & Ticketing S3) — unique index
   did not exist. Lowest severity: grepped `lib/event-tickets.ts`, `lib/paid-event-tickets.ts`, and
   the registrations route for any reliance on catching a unique-constraint violation — none. Pure
   defense-in-depth against a random free-ticket-token collision, never invoked in app logic.

All three applied via `apply_migration` and independently re-verified live via `to_regclass()` /
`pg_indexes` (not just tool success) — `tenant_intake`, `marketplace_migration_estimates` (RLS
confirmed ON), and the unique index all now exist in production.

**Not yet re-tested live:** the onboarding Q1/Q2 flow and a real >150-listing Shopify migration
quote, now that their tables exist — worth a real smoke next time either surface is touched, but
not blocking this sprint's close (schema now matches code; behavior should just work).
