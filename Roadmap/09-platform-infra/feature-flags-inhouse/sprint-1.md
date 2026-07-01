# Sprint 1 — The store + read swap

**Epic:** [In-house feature flags](README.md) · **Goal:** in-house flags actually serving in both apps, behind the
unchanged `isEnabled()` interface, fail-open, behavior-preserving. This is the skateboard.

> **Status: ✅ MERGED + DEPLOYED 2026-07-01 (Daniel-authorized merge on green, HIGH).**
> S1.1 `6463a46` + applied to shared Supabase · S1.2 `67ee051` · S1.3 `d8c2e22`.
> Merged: **FE [#150](https://github.com/danybgoode/miyagisanchezcommerce/pull/150)** (S1.1 + S1.2) → main `b0582b0`
> (Vercel prod) · **BE [#50](https://github.com/danybgoode/medusa-bonsai-backend/pull/50)** (S1.3) → main `5179718`
> (Cloud Run, ~12 min). Deterministic gate green both repos (FE: tsc + build + 45 api specs; BE: build + tsc + 14
> unit specs). Cross-agent review (Codex) run on both → fixed one finding (`Boolean(r.enabled)` coercion defeated
> the fail-open guard; now preserves raw + lets `resolveFlag` validate — FE `3ce562d`, BE `0c9fc80`).
> BE #50 also merged `origin/main` first (ML S4 #49 had added `ml.sync_enabled` to the BE seam — reconciled to 3 keys).
>
> **Owed to Daniel (money/auth path):** the live flip smoke below (steps 4–5). Steps 2–3 (pdp flip) also change
> prod UX for all visitors momentarily, so they're offered rather than auto-run.
>
> **Scope correction:** the seed is **11 flags, not 10** — `ml.sync_enabled` landed with ML S4 (#148) after this
> doc was written, so the store tracks the live `DEFAULT_FLAGS` (11 keys, 2 enabled: `checkout.stripe_enabled` +
> `pdp_redesign`). All "10 rows / other 8" references below now read 11 / other 9.

> **Reuse before rebuild.** Only the *internals* of two files change. `isEnabled(flag)`, `DEFAULT_FLAGS`, and the
> `FlagKey` union stay byte-identical, so all ~45 call sites and every existing flag spec are untouched.

## Stories

### S1.1 — (DB) `platform_flags` table + behavior-preserving seed — **LOW** ✅ `6463a46`
**As** the platform, **I want** a Supabase table holding the flag values, **so that** there's one owned source of
truth both apps can read.
- New migration `apps/miyagisanchez/supabase/migrations/20260701120000_platform_flags.sql`. Table: `key text PK`, `enabled boolean not null`, `polarity text` (`killswitch`|`enablement`), `description text`, `updated_at timestamptz default now()`, `updated_by text`.
- Seed all **11** flags at their current `DEFAULT_FLAGS` values (see epic seed table + the `ml.sync_enabled` correction above).
- **RLS:** `ENABLE ROW LEVEL SECURITY` with **no policies** (Pattern B) → service-role reads only, anon gets zero rows.
- **Applied** to shared Supabase (`xljxqymsuyhlnorfrnno`) via MCP: 11 rows, 2 enabled, `rls_enabled=true`, 0 policies.
- **Acceptance (Daniel):** the table exists with exactly **11** rows matching the seed table; `checkout.stripe_enabled` and `pdp_redesign` are `ON`, the other **9** `OFF`; nothing in the app reads it yet → behavior unchanged. ✅ verified.

### S1.2 — (FE) swap `lib/flags.ts` internals to the Supabase in-process cache — **HIGH** ✅ `67ee051`
**As** the admin, **I want** the FE to read flag values from `platform_flags`, **so that** a row flip changes app
behavior with no deploy.
- Replaced the `flagsmith-nodejs` client with a module-level in-process cache: loads all rows from `db.from('platform_flags')`, **60 s TTL**, ≤2 s bounded fetch (`Promise.race`, stub-safe), **no retries**, de-duped via an inflight promise. `isEnabled(flag)` returns the cached value; on any miss/stale/empty/error → `DEFAULT_FLAGS[flag]` (fail-open, never throws).
- **Extracted the pure seam** `lib/flags-cache.ts`: `resolveFlag(rows, key, defaults)` + `isCacheStale(fetchedAt, now, ttl)` + TTL/timeout constants — unit-tested by `e2e/flags-cache.spec.ts` (api, no network).
- Kept `isEnabled`, `DEFAULT_FLAGS`, `FlagKey`, and `server-only` byte-identical. Node-runtime middleware read path preserved.
- **Acceptance (Daniel):** with Supabase reachable, flipping a row changes `isEnabled` within 60 s; with `platform_flags` unreadable/empty, every flag returns its `DEFAULT_FLAGS` value; **all existing FE flag e2e specs pass unchanged** — 45 api specs green locally (owed: browser money-path).

### S1.3 — (BE) swap `apps/backend/src/lib/flags.ts` internals to `supabaseRead` — **HIGH** ✅ `d8c2e22`
**As** the admin, **I want** the Medusa backend to read the *same* `platform_flags` rows, **so that** the checkout-rail
kill is enforced for agents/UCP + `start-checkout`, not just hidden in the FE.
- Replaced the Flagsmith client with a read via the existing `supabaseRead` (`apps/backend/src/api/store/_utils/supabase-read.ts`), same 60 s in-process cache + bounded ≤2 s + fail-open discipline. Mirrored the FE pure seam at `apps/backend/src/lib/flags-cache.ts`.
- Kept the BE `FlagKey` (`checkout.stripe_enabled`, `shipping.envia_enabled`) + `DEFAULT_FLAGS` + `isEnabled` signature byte-identical.
- **Acceptance (Daniel):** BE `isEnabled('checkout.stripe_enabled')` reflects the same row the FE reads; unreadable table → defaults; **existing BE unit specs (`payment-methods-killswitch`, `envia-killswitch`) pass unchanged** — 14 unit tests green locally.

## Sprint QA
- **New unit coverage:** the extracted pure seam — `resolveFlag` returns the row value when present/fresh, the default when a row is missing, and the default on empty/null/non-boolean (both polarities); `isCacheStale` at the TTL boundary. FE `e2e/flags-cache.spec.ts` (8) + BE `flags-cache.unit.spec.ts` (8). ✅
- **Regression net (no new specs needed):** existing `e2e/checkout-killswitch.spec.ts`, `envia-killswitch.spec.ts`, `subdomain-pricing.spec.ts`, `custom-domain-paywall.spec.ts`, `promoter-program.spec.ts` and the BE `*-killswitch.unit.spec.ts` stayed green — proof the interface didn't move. ✅
- **Deterministic gate (green before draft PR):** FE — `tsc --noEmit` clean + `npm run build` passes + `npm run test:e2e` (**45 api specs passed**). BE — `npm run build` + `tsc --noEmit` clean + `npm run test:unit` (**14 passed**). ✅
- **Owed to Daniel (money/auth path):** the live flip smoke below (steps 4–5) — an automated browser can't fully cover the checkout-rail kill.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the FE branch's Vercel preview (PR [#150](https://github.com/danybgoode/miyagisanchezcommerce/pull/150)) while
pre-merge · production `https://miyagisanchez.com` once merged (BE PR [#50](https://github.com/danybgoode/medusa-bonsai-backend/pull/50)
deploys to Cloud Run, ~12 min). The `platform_flags` table is already live in shared Supabase.
> Note: with no `/admin/flags` UI yet (that's S2), flip flags by editing the `platform_flags` row directly in Supabase.

1. In Supabase, open the `platform_flags` table.
   → You see **11** rows; `checkout.stripe_enabled` and `pdp_redesign` = true, the other **9** = false.
2. Open a product page, e.g. `https://miyagisanchez.com/l/<test-listing>`.
   → It renders the current (redesigned) PDP — because `pdp_redesign` is ON.
3. In Supabase, set `pdp_redesign.enabled = false`. Wait ~60 s, reload the product page.
   → The PDP reverts to the previous layout — **no deploy**. Set it back to `true`; within ~60 s it returns.
4. (money path — Daniel) In Supabase, set `checkout.stripe_enabled = false`. Wait ~60 s.
   → On a test shop's checkout, the Stripe rail disappears (FE); and a direct `POST /store/carts/<id>/start-checkout` with Stripe returns **422 `PAYMENT_METHOD_DISABLED`** (BE enforcement). Set back to `true` → rail returns.
5. Temporarily break the read (e.g. rename the table or revoke the service-role grant) and hit checkout.
   → Everything **fails open**: Stripe rail present, PDP on defaults — no request errors. Restore the table.

If any step fails, note the step number + what you saw — that's the bug report.
