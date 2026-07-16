---
status: shipped
slug: feature-flags-inhouse
---

# Epic — In-house feature flags (replace Flagsmith)

> **Status: ✅ COMPLETE 2026-07-01** (3 sprints, all merged + deployed). Swapped the flag backend from
> **Flagsmith SaaS** to a **Supabase-backed, in-process-cached (60 s TTL), fail-open** store behind the
> *unchanged* `isEnabled()` interface, added an audited `/admin/flags` control surface, then fully
> decommissioned Flagsmith (dependency, env/secrets, MCP server, doc refs). Flagsmith is gone from both
> running apps and all live infra. See [`RETROSPECTIVE.md`](RETROSPECTIVE.md).

> **Area:** 09 · Platform & Infra · **Risk:** High · **Class:** Chore

Infra migration (no user-facing change), checkout-adjacent (money-path flag), one design decision
resolved in grooming. **Replaces:** [feature-flags-killswitches](../feature-flags-killswitches/) (same
interface, new backend).

## Why

Flagsmith's free tier expired even after we dropped the refresh to 300 s, and the instance is now **disabled** —
so both apps have silently fallen back to their hardcoded `DEFAULT_FLAGS` (fail-open working as designed) and
there is **no runtime switch** anymore. This epic restores flip-without-deploy control on **owned infra**
(Supabase, already the non-commerce store) with **no third-party dependency and no quota to blow**.

## Context

| | |
|---|---|
| **Seam** | `isEnabled(flag)` — `apps/miyagisanchez/lib/flags.ts` (FE, 10 flags, ~25 call sites) + `apps/backend/src/lib/flags.ts` (BE, 2 flags, 4 call sites). Only these two files touch Flagsmith. |
| **Store** | New Supabase `platform_flags` table (per AGENTS Rule 2). Both apps read it — FE via `@/lib/supabase`, BE via the existing read-only `supabaseRead` (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, already in Cloud Run env). |
| **Read path** | In-process cache, **60 s TTL** (no Flagsmith quota pressure → faster flip than the 300 s we were forced into), ≤2 s bounded refresh, **fail-open** to `DEFAULT_FLAGS`. No per-request DB hit. |
| **Admin** | `/admin/flags` toggle page in the existing `AdminShell`, `requireAdmin`-gated; `POST /api/admin/flags` (`withAdmin` → `admin_audit_log`). |
| **Seed** | v1 seeds all 10 flags at current `DEFAULT_FLAGS` → **behavior-preserving no-op** until a deliberate flip. |

## Medusa-first / five-rule check (AGENTS)

Rule 1 (Medusa owns commerce): **respected** — flags are infra config, not commerce; no Medusa module. Rule 2
(Supabase = non-commerce): the flag store is quintessential non-commerce config → **Supabase is the correct
home** (not a new GCP Postgres). Rule 3 (UCP/MCP): N/A — the BE reader already covers the agents/UCP checkout
path (same table). Rule 4 (Clerk): untouched — admin reuses `requireAdmin`/`withAdmin`. Rule 5 (bilingual):
N/A — only new copy is the admin-only `/admin/flags` UI (es-MX, not on the bilingual allow-list).

## What already exists (reuse, don't rebuild) — verified 2026-07-01

| Capability | Where | Reuse for |
|---|---|---|
| Flag seam (FE + BE), fail-open, in-process cache | `lib/flags.ts` (FE) + `apps/backend/src/lib/flags.ts` (BE) | **Swap internals only** — keep `isEnabled` + `DEFAULT_FLAGS` + `FlagKey` |
| Pure, unit-tested application seams | `lib/checkout-killswitch.ts`, `resolveSellerPaymentMethods`, `envia-killswitch.ts` | Untouched — they consume flag *values* |
| FE Supabase client (read + write) | `@/lib/supabase` (`db`) | FE reads + admin writes to `platform_flags` |
| BE read-only Supabase client | `apps/backend/src/api/store/_utils/supabase-read.ts` (`supabaseRead`) | BE reads `platform_flags` — single source of truth, zero new infra |
| Migration convention | `apps/miyagisanchez/supabase/migrations/*.sql` | `platform_flags` table migration |
| Admin page + shell + guards | `app/(shell)/admin/*`, `AdminShell.tsx`, `lib/admin/guard.ts` | `/admin/flags` page + write route, no new auth |
| Admin audit (auto by `withAdmin`) | `lib/admin/audit.ts` + `admin_audit_log` | Every flip audited for free |
| Existing flag behavior specs | `e2e/checkout-killswitch.spec.ts`, `envia-killswitch.spec.ts`, `subdomain-pricing.spec.ts`, `custom-domain-paywall.spec.ts`, `promoter-program.spec.ts` + BE unit specs | **Regression net** — must pass unchanged after the swap |

> **Middleware note:** `middleware.ts` runs on the **Node runtime** specifically to read a flag (subdomain
> paywall). The in-house reader stays Node-only; the runtime doesn't change. Preserve the middleware read path
> exactly — fail-open, cached, non-blocking.

## Scope

| Sprint | Story | What it ships | Risk |
|---|---|---|---|
| [S1](sprint-1.md) | S1.1 ✅ | `platform_flags` Supabase table + migration, seeded behavior-preserving (11 rows) | **LOW** |
| [S1](sprint-1.md) | S1.2 ✅ | FE `lib/flags.ts` internals → Supabase-backed 60 s in-process cache, fail-open, same interface — FE #150 `b0582b0` | **HIGH** |
| [S1](sprint-1.md) | S1.3 ✅ | BE `src/lib/flags.ts` internals → read `platform_flags` via `supabaseRead`, fail-open — BE #50 `5179718` | **HIGH** |
| [S2](sprint-2.md) | S2.1 ✅ | `/admin/flags` page in `AdminShell` (`requireAdmin`), lists all 11 flags + state — #151 `03f5770` | **LOW** |
| [S2](sprint-2.md) | S2.2 ✅ | `POST /api/admin/flags` (`withAdmin`, audited) + wire the toggles — #151 `03f5770` | **LOW** |
| [S3](sprint-3.md) | S3.1 ✅ | Remove `flagsmith-nodejs` + `FLAGSMITH_*` env/secrets + doc scrub — FE #152 `d9eddd1` · BE #51 `1b44587` · infra `c853827` | **LOW** (shared `package.json` → announce) |

## Seed values (v1 — from current `DEFAULT_FLAGS`, behavior-preserving)

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

## Deploy order

1. **S1.1** (table + seed) — additive, no reads; deploy first so the store exists before either app reads it.
2. **S1.3** (BE reader) then **S1.2** (FE reader) — or either order; both fail-open, both safe no-ops until the seed differs from defaults (it doesn't). BE deploy is ~12 min (Cloud Run), FE is Vercel. **Daniel merges both (HIGH).**
3. **S2** (admin page + write) — after readers are live, so a flip has somewhere to land.
4. **S3** (remove Flagsmith) — **last**, only after S1+S2 confirmed serving live, so there's never a window with no flag backend.

## Definition of Done (epic)

- [x] S1.1 merged — `platform_flags` exists with 11 seed rows matching the table; RLS confirmed (service-role read, not anon).
- [x] S1.2 + S1.3 merged (FE #150 `b0582b0` · BE #50 `5179718`), serving on `main`. Live flip-a-row smoke **owed to Daniel** (HIGH).
- [x] S2.1 + S2.2 merged (+ S2.0 pure validator seam) — `/admin/flags` flips a flag with no deploy; `admin_audit_log` records it. PR #151 `03f5770`, 2026-07-01. Money-path smoke (`checkout.stripe_enabled`) **owed to Daniel**.
- [x] S3.1 merged — FE #152 `d9eddd1` · BE #51 `1b44587` · infra `c853827`. `grep -ri flagsmith apps/` clean on both merged `main`s (only build artifacts + historical Roadmap refs). Live `FLAGSMITH_*` secrets deleted (Vercel prod+preview, Cloud Run binding `medusa-web-00125-6lx`, Secret Manager); MCP server + token permission lines removed from local config.
- [x] Every sprint doc has a fool-proof smoke walkthrough + status ticked with PR refs.
- [x] This `README.md` flipped to ✅; `RETROSPECTIVE.md` written; durable learnings promoted to `LEARNINGS.md`.
- [x] **Poster:** `09-platform-infra/README.md` updated — new epic line; `feature-flags-killswitches` annotated "backend migrated to in-house".
- [x] Team memory updated (Supabase flag store + 60 s cache pattern); branches deleted; PRs merged.
