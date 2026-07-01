# In-house feature flags — replace Flagsmith with a Supabase-backed flag store

**Status: awaiting Daniel approval — no code yet.**
Source: Daniel's ask (2026-07-01) — Flagsmith free tier ran out even after the refresh optimization, the
instance is now disabled ("can't access Flagsmith anymore"), and the flags "are not serving at all." Wants a
**lean, in-house** replacement for the flags we already have, so we can drop Flagsmith entirely. Sketched:
Supabase/GCP Postgres + a CRUD API + the existing admin view + a cache-aside layer.

Grooming decisions (2026-07-01, confirmed by Daniel via question batch):
- **Store: Supabase table** (`platform_flags`) — the existing non-commerce store, per AGENTS Rule 2. No new infra.
- **Read path: in-process TTL cache, fail-open** — mirror today's Flagsmith design (~0 ms/request, periodic refresh, fall back to `DEFAULT_FLAGS`). No per-request DB hit; no Redis needed for 10 booleans.
- **Admin: full toggle page** in the existing admin shell (`/admin/flags`), writing to Supabase + `admin_audit_log`.
- **Current state: defaults are fine** — v1 seeds every flag at its current fail-open default, so the migration is a **behavior-preserving no-op** until Daniel deliberately flips something. Restoring runtime control is the whole point.

**Proposed domain: [09 · Platform & Infra](../../09-platform-infra/README.md)** — a **replacement** for the shipped
[feature-flags-killswitches](../../09-platform-infra/feature-flags-killswitches/) epic (same interface, new backend).

---

## Stage-2.5 bucket — **light enhancement / swap**, not genuinely new
This is **not** "build a feature-flag system." The system shipped 2026-06-06. The flag **seam already exists and
is clean**: every consumer calls `isEnabled(flag)` from `apps/miyagisanchez/lib/flags.ts` (FE, 10 flags, ~25 call
sites) and `apps/backend/src/lib/flags.ts` (BE, 2 flags, 4 call sites). **Only those two files touch Flagsmith.**
The work is: **swap the internals of two files** (Flagsmith SDK → Supabase-backed in-process cache) behind an
**identical `isEnabled()` signature**, add a store + an admin toggle page, then delete the Flagsmith dependency.
Every one of the ~29 call sites stays untouched. The existing Playwright/unit specs that assert flag *behavior*
become a **free regression guarantee** — they should pass unchanged, because the interface doesn't move.

**"Flags not serving at all" — confirmed and expected.** The layer is fail-open by design, so with Flagsmith
disabled both apps are silently running on the hardcoded `DEFAULT_FLAGS`. Nothing is broken — but there is no
runtime switch. Kill-switches are stuck ON (`checkout.stripe_enabled`, `pdp_redesign`); every enablement flag is
stuck OFF (`promoter`, `ml.*`, `shipping.envia`, `subdomain.paywall`, `events.quantity`, `domain.paywall`).

## What already exists (reuse, don't rebuild) — verified 2026-07-01
| Capability | Where | Reuse for |
|---|---|---|
| Flag seam (FE + BE), fail-open, in-process cache, 2 s timeout / no retries | `apps/miyagisanchez/lib/flags.ts`, `apps/backend/src/lib/flags.ts` | **Swap internals only.** Keep `isEnabled(flag)` + `DEFAULT_FLAGS` + `FlagKey` exactly |
| Pure, unit-tested application seams | `lib/checkout-killswitch.ts` (FE), `resolveSellerPaymentMethods` opts + `envia-killswitch.ts` (BE) | Untouched — they consume flag *values*, which still come from `isEnabled()` |
| FE Supabase client (read + write) | `@/lib/supabase` (`db`), lazy singleton + missing-config stub | FE flag reads + admin writes to `platform_flags` |
| **BE read-only Supabase client** | `apps/backend/src/api/store/_utils/supabase-read.ts` (`supabaseRead`, uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — **already in Cloud Run env**) | BE flag reads from the same `platform_flags` table — single source of truth, zero new infra |
| Supabase migration convention | `apps/miyagisanchez/supabase/migrations/*.sql` (timestamped) | New `platform_flags` table migration |
| Admin page pattern + shell | `app/(shell)/admin/*` + `AdminShell.tsx`; e.g. `admin/coupons`, `admin/referrals` | New `/admin/flags` page follows the same shape |
| Admin auth guards | `lib/admin/guard.ts` — `requireAdmin()` (pages), `withAdmin(handler)` (API routes) | Gate the flags page + write route; no new auth |
| Admin audit log (auto-written by `withAdmin`) | `lib/admin/audit.ts` + `admin_audit_log` table | Every flag flip is audited **for free** |
| Existing behavior specs (regression net) | `e2e/checkout-killswitch.spec.ts`, `envia-killswitch.spec.ts`, `subdomain-pricing.spec.ts`, `custom-domain-paywall.spec.ts`, `promoter-program.spec.ts` + BE unit specs | Must still pass unchanged after the swap — proof the interface didn't move |

> **Middleware note (LEARNINGS applied):** `middleware.ts` runs on the **Node runtime** *specifically* to read
> a flag via `lib/flags.ts` (the subdomain paywall gate) — the retro's "Edge SDK incompatibility" concern is
> already handled by the Node-runtime opt-in. The in-house reader stays Node-only too; nothing about the runtime
> changes. The swap must preserve the middleware read path exactly (fail-open, cached, non-blocking).

## Medusa-first / five-rule check (AGENTS)
- **Rule 1 (Medusa owns commerce):** respected — flags are infra config, not commerce. No Medusa module. ✅
- **Rule 2 (Supabase = non-commerce only):** the flag store is quintessential non-commerce marketplace config → **Supabase is the correct home** (not a new GCP Postgres, not Medusa). ✅
- **Rule 3 (UCP/MCP):** N/A — the flags *gate* UCP/checkout paths but the store adds no agent surface. The BE reader already covers the agents/UCP checkout path (it reads the same table). ✅
- **Rule 4 (Clerk):** untouched — admin surface reuses `requireAdmin`/`withAdmin`. ✅
- **Rule 5 (bilingual):** N/A — flags hide/show; the only new copy is the **admin-only** `/admin/flags` UI (es-MX, not on the bilingual allow-list). ✅

## Design (in-house flag layer)
- **`platform_flags` table** (Supabase): `key text PK`, `enabled boolean not null`, `polarity text` (`killswitch`|`enablement`), `description text`, `updated_at timestamptz`, `updated_by text`. Seeded with all current flags at their `DEFAULT_FLAGS` values (below).
- **Reader (both apps):** in-process cache of the whole flag set, refreshed on a TTL (default ~60 s; tune 60–300 s). `isEnabled(flag)` returns the cached row's value; on **any** miss/stale/error → `DEFAULT_FLAGS[flag]` (fail-open, never throws). Bound the refresh fetch (≤2 s, no retries) so a slow Supabase never stalls checkout — same discipline as today.
- **Writer (admin only):** `POST /api/admin/flags` (`withAdmin` → audited) upserts a row; `/admin/flags` page lists all flags with a toggle. A flip propagates within one TTL window (no deploy) — matches the ~5 min Flagsmith flip Daniel already lives with.
- **Decommission:** remove `flagsmith-nodejs` from both `package.json`s, delete `FLAGSMITH_*` / `NEXT_PUBLIC_FLAGSMITH_*` env vars + secrets, scrub Flagsmith references in comments/docs.

### Seed values (v1 — behavior-preserving, from current `DEFAULT_FLAGS`)
| Flag | Polarity | Seed | Apps |
|---|---|---|---|
| `checkout.stripe_enabled` | kill-switch | **ON** | FE + BE |
| `pdp_redesign` | kill-switch | **ON** | FE |
| `domain.paywall_enabled` | enablement | OFF | FE |
| `events.quantity_enabled` | enablement | OFF | FE |
| `shipping.envia_enabled` | enablement | OFF | FE + BE |
| `promoter.enabled` | enablement | OFF | FE |
| `ml.connect_enabled` | enablement | OFF | FE |
| `ml.import_enabled` | enablement | OFF | FE |
| `ml.publish_enabled` | enablement | OFF | FE |
| `subdomain.paywall_enabled` | enablement | OFF | FE |

## Why
**As** the platform admin, **I want** to turn features on/off from an in-repo admin page with **no deploy and no
third-party dependency**, **so that** I regain the runtime kill-switch/enablement control I lost when Flagsmith's
free tier expired — without paying for or being locked out of a SaaS again.

## Stories (proposed — skateboard → car)

### Sprint 1 — The store + read swap *(the skateboard: in-house flags actually serving, both apps)*
- **S1.1 — (DB) `platform_flags` table + seed.** Migration creating the table, seeded with all 10 flags at their current `DEFAULT_FLAGS` values (table above). **Risk: LOW** (additive, no reads yet). *Acceptance:* the table exists in Supabase with 10 rows matching the seed; nothing in the app reads it yet, so behavior is unchanged.
- **S1.2 — (FE) Swap `lib/flags.ts` internals to the Supabase-backed in-process cache.** Same `isEnabled()`, same `DEFAULT_FLAGS`, same `FlagKey`, fail-open, ≤2 s bounded refresh. Extract the pure cache/parse decision to a testable seam. **Risk: HIGH** (checkout kill-switch + Node-middleware read path). *Acceptance:* with Supabase reachable, flipping a row changes `isEnabled` within one TTL; with `platform_flags` unreadable/empty, every flag returns its `DEFAULT_FLAGS` value; the existing FE flag e2e specs pass unchanged.
- **S1.3 — (BE) Swap `apps/backend/src/lib/flags.ts` internals to read `platform_flags` via `supabaseRead`.** Fail-open, bounded. **Risk: HIGH** (checkout-rail enforcement for agents/UCP + `start-checkout`). *Acceptance:* BE `isEnabled('checkout.stripe_enabled')` reflects the same row the FE reads; unreadable table → defaults; existing BE unit specs pass unchanged.

### Sprint 2 — Admin control surface *(the "plug into the existing admin view")*
- **S2.1 — (FE) `/admin/flags` page** in `AdminShell`, `requireAdmin`-gated, listing all flags with current state + polarity + description. **Risk: LOW** (read-only admin UI behind auth). *Acceptance:* an admin sees all 10 flags and their live values; a non-admin is redirected.
- **S2.2 — (FE) `POST /api/admin/flags` write + wire the toggles.** `withAdmin` (audited) upsert to `platform_flags`; UI toggle flips a flag and reflects the new state. **Risk: LOW** on the write path itself (admin-only, audited) — *but the flags it controls are high-consequence*, so the smoke covers a live flip. *Acceptance:* flipping `pdp_redesign` OFF in `/admin/flags` reverts the PDP within one TTL with no deploy; an `admin_audit_log` row records the flip; flip back restores it.

### Sprint 3 — Decommission Flagsmith *(chore cleanup — only after in-house is proven live)*
- **S3.1 — Remove `flagsmith-nodejs` + Flagsmith env/secrets + doc scrub.** Both `package.json`s, `FLAGSMITH_*` vars, comments/docs. **Risk: LOW**, but touches **shared `package.json`** → announce (can break sibling PRs). *Acceptance:* `grep -ri flagsmith apps/` returns only historical Roadmap references; both apps build; flag reads still work off Supabase.

> **Sequencing note:** S3 can ride at the tail of Sprint 2 if you'd rather do it in one pass — but keeping it a
> separate story means we only pull the Flagsmith dependency **after** the in-house reader is confirmed serving
> live, so there's never a window with no flag backend.

## In scope (v1)
- Supabase `platform_flags` store, seeded behavior-preserving.
- FE + BE readers swapped to the store, fail-open, in-process cached, same interface.
- `/admin/flags` toggle page (es-MX, admin-only) + audited write route.
- Flagsmith fully removed.

## Out of scope (v1) — prevents creep
- **Per-shop / per-identity flags, segments, traits** — still global, admin-only (unchanged from the shipped design).
- **A/B experimentation / analytics** — deferred (no product-analytics tool wired; same as the spike).
- **New flags / new taxonomy** — this migrates the 10 existing flags only. New flags are separate asks.
- **Redis cache-aside** — in-process cache is sufficient for 10 booleans; Upstash stays for rate limiting only.
- **Migrating the homegrown seasonal-theme toggle** into this store — out, as in the original spike.
- **Change-history UI beyond `admin_audit_log`** — the audit row is the record; no dedicated timeline view.

## Open risks / watch-items
- **Two apps, one table, cache skew.** FE and BE each hold their own in-process cache → a flip can be visible in one app up to one TTL before the other. Acceptable for kill-switches (already true with Flagsmith's per-instance refresh); note it in the smoke.
- **Cold-start read on the checkout path.** First request on a fresh instance populates the cache — must be bounded (≤2 s) and fail-open so a cold Supabase never stalls checkout. Same rule the retro enforced for the Flagsmith SDK.
- **Seed correctness is load-bearing.** If a seed value is wrong, a real feature flips on merge. S1.1 acceptance explicitly checks the 10 rows against the table above.
- **RLS / service-role.** BE reads with the service-role key (already provisioned); the table should not be client-readable via anon. Confirm RLS in S1.1.
- **`updated_by` provenance.** Populate from the Clerk admin identity in the write route so the audit trail is meaningful.

## Definition of Ready — met
- "As a / I want / so that" clear; acceptance testable by Daniel per story.
- Stage-2.5 bucket named (**light enhancement / swap**).
- v1 in/out boundary written.
- Reuse list produced (Medusa-first reframe done — swap two files, reuse Supabase + admin + audit).
- Each story risk-tiered; QA seam named (pure cache/parse unit + existing e2e regression net); smoke owed to Daniel on the live flip (money path = `checkout.stripe_enabled`).
- **Awaiting Daniel's approval to scaffold the epic + sprint docs.**
