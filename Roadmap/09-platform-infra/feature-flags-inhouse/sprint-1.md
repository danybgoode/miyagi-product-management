# Sprint 1 — The store + read swap

**Epic:** [In-house feature flags](README.md) · **Goal:** in-house flags actually serving in both apps, behind the
unchanged `isEnabled()` interface, fail-open, behavior-preserving. This is the skateboard.

> **Reuse before rebuild.** Only the *internals* of two files change. `isEnabled(flag)`, `DEFAULT_FLAGS`, and the
> `FlagKey` union stay byte-identical, so all ~29 call sites and every existing flag spec are untouched.

## Stories

### S1.1 — (DB) `platform_flags` table + behavior-preserving seed — **LOW**
**As** the platform, **I want** a Supabase table holding the flag values, **so that** there's one owned source of
truth both apps can read.
- New migration in `apps/miyagisanchez/supabase/migrations/` (timestamped). Table: `key text PK`, `enabled boolean not null`, `polarity text` (`killswitch`|`enablement`), `description text`, `updated_at timestamptz default now()`, `updated_by text`.
- Seed all 10 flags at their current `DEFAULT_FLAGS` values (see epic seed table).
- **RLS:** service-role / server read only — **not** anon-client readable.
- **Acceptance (Daniel):** the table exists with exactly 10 rows matching the seed table; `checkout.stripe_enabled` and `pdp_redesign` are `ON`, the other 8 `OFF`; nothing in the app reads it yet → behavior unchanged.

### S1.2 — (FE) swap `lib/flags.ts` internals to the Supabase in-process cache — **HIGH**
**As** the admin, **I want** the FE to read flag values from `platform_flags`, **so that** a row flip changes app
behavior with no deploy.
- Replace the `flagsmith-nodejs` client with a module-level in-process cache: load all rows from `db.from('platform_flags')`, **60 s TTL**, ≤2 s bounded fetch, **no retries**. `isEnabled(flag)` returns the cached value; on any miss/stale/empty/error → `DEFAULT_FLAGS[flag]` (fail-open, never throws).
- **Extract a pure seam** (e.g. `lib/flags-cache.ts`: `resolveFlag(rows, key, defaults)` + staleness decision) so the fail-open logic is unit-testable with no network.
- Keep `isEnabled`, `DEFAULT_FLAGS`, `FlagKey`, and `server-only` exactly. Preserve the Node-runtime middleware read path.
- **Acceptance (Daniel):** with Supabase reachable, flipping a row changes `isEnabled` within 60 s; with `platform_flags` unreadable/empty, every flag returns its `DEFAULT_FLAGS` value; **all existing FE flag e2e specs pass unchanged.**

### S1.3 — (BE) swap `apps/backend/src/lib/flags.ts` internals to `supabaseRead` — **HIGH**
**As** the admin, **I want** the Medusa backend to read the *same* `platform_flags` rows, **so that** the checkout-rail
kill is enforced for agents/UCP + `start-checkout`, not just hidden in the FE.
- Replace the Flagsmith client with a read via the existing `supabaseRead` (`apps/backend/src/api/store/_utils/supabase-read.ts`), same 60 s in-process cache + fail-open discipline. Reuse/mirror the FE pure seam.
- Keep the BE `FlagKey` (`checkout.stripe_enabled`, `shipping.envia_enabled`) + `isEnabled` signature.
- **Acceptance (Daniel):** BE `isEnabled('checkout.stripe_enabled')` reflects the same row the FE reads; unreadable table → defaults; **existing BE unit specs (`payment-methods-killswitch`, `envia-killswitch`) pass unchanged.**

## Sprint QA
- **New unit coverage:** the extracted pure seam — `resolveFlag` returns the row value when present/fresh, the default when a row is missing, and the default on stale/error (both polarities). FE + BE.
- **Regression net (no new specs needed):** existing `e2e/checkout-killswitch.spec.ts`, `envia-killswitch.spec.ts`, `subdomain-pricing.spec.ts`, `custom-domain-paywall.spec.ts`, `promoter-program.spec.ts` and the BE `*-killswitch.unit.spec.ts` must stay green — proof the interface didn't move.
- **Deterministic gate:** `npx tsc --noEmit` + `npm run build` (FE) + `npm run test:e2e` api specs; BE unit specs. Green before draft PR.
- **Owed to Daniel (money/auth path):** the live flip smoke below — an automated browser can't fully cover the checkout-rail kill.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production `https://miyagisanchez.com` once deployed.
> Note: with no `/admin/flags` UI yet (that's S2), flip flags by editing the `platform_flags` row directly in Supabase.

1. In Supabase, open the `platform_flags` table.
   → You see 10 rows; `checkout.stripe_enabled` and `pdp_redesign` = true, the other 8 = false.
2. Open a product page, e.g. `https://miyagisanchez.com/l/<test-listing>`.
   → It renders the current (redesigned) PDP — because `pdp_redesign` is ON.
3. In Supabase, set `pdp_redesign.enabled = false`. Wait ~60 s, reload the product page.
   → The PDP reverts to the previous layout — **no deploy**. Set it back to `true`; within ~60 s it returns.
4. (money path — Daniel) In Supabase, set `checkout.stripe_enabled = false`. Wait ~60 s.
   → On a test shop's checkout, the Stripe rail disappears (FE); and a direct `POST /store/carts/<id>/start-checkout` with Stripe returns **422 `PAYMENT_METHOD_DISABLED`** (BE enforcement). Set back to `true` → rail returns.
5. Temporarily break the read (e.g. rename the table or revoke the service-role grant) and hit checkout.
   → Everything **fails open**: Stripe rail present, PDP on defaults — no request errors. Restore the table.

If any step fails, note the step number + what you saw — that's the bug report.
