---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: admin-consolidation
build_order: 1       # numeric build-order sequence (SSOT for the Notion build-order views)
---

# Epic — Admin consolidation + tenant management

**Macro-section:** 09 · Platform & Infra.
**Class:** Mixed — light consolidation (re-home/relink + one shell) **+** new auth model **+** new tenant
management. Risk spans LOW (read-only directory, nav shell) → HIGH (auth migration, entitlement mutations).
**Scope doc / decision:** [`Roadmap/00-ideas/2. readyforscope/spike-admin-consolidation.md`](../../00-ideas/2.%20readyforscope/spike-admin-consolidation.md) — spike RUN + **APPROVED 2026-06-22** (decision + cross-panel folded in).

## Why

The admin grew ad-hoc and scattered: there is **no unified shell or nav** — `/admin` just `redirect()`s to an
external scraper app; sections are disconnected (coupons, print, an orphaned scrape client, a top-level
`/supply` page, an API-only referrals config with no UI, Vecindario moderation bolted inside Print). **Auth is
one shared `ADMIN_SECRET` passed in the URL** — no per-user identity, no audit, leaky. And **tenant (shop)
management doesn't exist**. This epic gives the platform **one coherent in-repo admin** (shell + nav + Clerk
auth + audit) and a **tenant directory + entitlement action** built on the backends that already exist.

## Context

| | |
|---|---|
| **What it is** | One in-repo admin shell + section registry; Clerk admin identity + audit; tenant directory + entitlement grant |
| **Repos touched** | `apps/miyagisanchez` (all of it). Possibly a tiny `apps/backend` read for the entitlement pre-flight (S4). The external scraper app stays its own repo/deploy. |
| **Output** | `/admin` hub + left-nav; every section Clerk-gated + audited; secret-in-URL killed for humans; `/admin/tenants` directory; entitlement grant/revoke |
| **SSOT** | `lib/admin/sections.ts` (nav registry) · `lib/admin/identity.ts` (`isAdminUser`) · `lib/domain-entitlement.ts` (entitlement, reused) |

## Decisions (spike + cross-panel, 2026-06-22)

1. **One in-repo admin shell** (`app/(shell)/admin/`) + `lib/admin/sections.ts` registry + a real hub that
   **replaces the external redirect**. The external scraper app stays **external + linked** (not absorbed —
   heavy deps/secrets, cleanly split at the Supabase staging boundary; its in-repo half, gem→Medusa import via
   `/supply`, is already here). Delete the orphaned `app/(shell)/admin/AdminScrapeClient.tsx`.
2. **Admin auth → Clerk identity + allow-list/role + an audit trail**; kill secret-in-URL for humans. Keep
   `ADMIN_SECRET` **only** for the two explicitly-internal routes (`import` Bearer for batch scripts, the
   neighborhood-pulse smoke route). **Dual-accept** migration (Clerk *or* secret), then drop human-secret
   acceptance per-section once every page is Clerk-gated.
3. **Tenant management v1 = directory (read) + custom-domain comp-grant (write, wraps `domain-entitlement`).**
   **Suspend** deferred to its own Medusa-first epic (no backend today — must start from a Medusa seller/shop
   status primitive, NOT a Supabase `metadata.suspended` flag honored by many consumers). **Per-shop flags
   dropped.**
4. **Tenant directory is a strict READ-MODEL** — Medusa seller IDs canonical; `marketplace_shops` fields are
   display/enrichment only. Actions never "mutate Supabase shop state first."
5. **Shell ships thin first** (cross-panel): S1 is a Clerk-gated hub + registry with route guards left
   **dual-accepted**; the full ~25-route migration + audit viewer follow in S2 — consolidation isn't blocked
   on an auth-migration project.

## Medusa-first note (AGENTS five-rule check)

- **Rule 1/2 (Medusa owns commerce; Supabase only non-commerce):** tenants = **Medusa sellers** (marketplace
  plugin) + the `marketplace_shops` mirror; the directory **reads** those. The entitlement grant rides
  `marketplace_shops.metadata.custom_domain_grant` — **pre-flight in S4**: confirm the comp-grant is genuinely
  non-commerce platform metadata and Medusa has no existing seller/entitlement primitive (`apps/backend/src/**`
  marketplace seller module) before wrapping it. Audit log = non-commerce ops record → **Supabase** (`admin_audit_log`).
- **Rule 3 (UCP/MCP):** any tenant change that alters what agents can discover/transact (entitlement,
  visibility) updates the manifest/MCP accordingly — checked per-story.
- **Rule 4 (Clerk):** the auth model **builds on** Clerk; it does not replace or add a parallel auth.
- **Rule 5 (es-MX):** all admin copy is es-MX, copy-complete; admin is not on the bilingual allow-list.

## What already exists (reuse, don't rebuild)

- **`lib/print-server.ts checkAdminSecret()`** — the shared secret guard the dual-accept `withAdmin` wraps.
- **`lib/domain-entitlement.ts`** — pure entitlement derivation (`readDomainGrant`, `deriveDomainEntitlement`)
  + `marketplace_shops.metadata.custom_domain_grant`; the S4 grant action wraps this, doesn't re-derive.
- **`lib/claim.ts isShopClaimed()`** — claim status for the directory.
- **`marketplace_shops` mirror** (read across ~19 `lib/` files) + Medusa marketplace sellers — the directory join.
- **`/api/admin/referrals/config`** (GET/PATCH) — the backend the S2 Referrals UI renders over (no rebuild).
- **`app/(shell)/admin/{coupons,print}`** — keep; register in the nav, swap the gate to Clerk.
- **`app/(shell)/supply` + `/api/supply/*`** — the gem→Medusa import surface to re-home under `/admin/supply`.
- **`PrintAdminClient.tsx`** (~line 407, `web_visible`) — the Vecindario moderation to **extract** into its own section.
- **Auth-smoke harness** (`@clerk/testing`, `e2e/_helpers/auth.ts`) — for the Clerk-gated admin specs (runs locally).

## Scope — sprints, stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **[S1](sprint-1.md)** | S1.1 `lib/admin/identity.ts` + `requireAdmin`/`withAdmin` **dual-accept** guard (Clerk **or** secret) | HIGH |
| **[S1](sprint-1.md)** | S1.2 Admin shell + `lib/admin/sections.ts` registry + real `/admin` hub (kill external redirect → link-out) | MED |
| **[S1](sprint-1.md)** | S1.3 Register existing sections (coupons, print) in the nav; delete orphaned `AdminScrapeClient.tsx` | LOW |
| **[S2](sprint-2.md)** | S2.1 `admin_audit_log` (Supabase) + write it from `withAdmin` on every mutation | MED |
| **[S2](sprint-2.md)** | S2.2 Re-home `/supply` → `/admin/supply`; extract Vecindario → `/admin/vecindario`; thin Referrals UI | MED |
| **[S2](sprint-2.md)** | S2.3 Migrate every `/api/admin/*` + `/api/supply/*` page/route to Clerk; drop `?secret=` links; remove human-secret acceptance; `/admin/audit` viewer | HIGH |
| **[S3](sprint-3.md)** | S3.1 `/admin/tenants` directory (read-only): Medusa sellers ⋈ `marketplace_shops`, search/inspect | LOW |
| **[S4](sprint-4.md)** | S4.0 **Pre-flight:** read `apps/backend/src/**` seller module — confirm no existing entitlement primitive | — |
| **[S4](sprint-4.md)** | S4.1 Entitlement **grant/revoke** action (wraps `domain-entitlement`) + UI on the tenant inspector | HIGH |

> **Deferred (own future epic):** shop **suspend/unsuspend** — needs a Medusa-first seller/shop status primitive.
> **Dropped:** per-shop flags (no primitive worth building for v1).

## Deploy order & dependencies

- **Frontend-led**, single repo (`apps/miyagisanchez`). Branch `feat/admin-consolidation` off latest `main`.
- **S1 first** (the shell + auth chassis everything else registers into).
- **S2 ‖ S3 after S1** — S3 (read-only directory) depends only on S1's shell+auth and can run in **parallel**
  with S2 (a second agent); single **scribe** for `lib/admin/sections.ts` to avoid registry collisions.
- **S4 after S3** (it adds an action to S3's tenant inspector); **S4.0 pre-flight gates S4.1**.
- S4 may touch `apps/backend` (read-only pre-flight; a write endpoint stays in-repo). If a backend change is
  needed, **merge backend first** (Cloud Run ~12 min, no preview) and degrade the frontend gracefully.
- **Risk tiers:** S1.1 + S2.3 + S4.1 are **HIGH → Daniel-merged** (auth surface + entitlement/money). S1.2/S1.3,
  S2.1/S2.2, S3.1 are LOW–MED (reviewer may auto-merge on green CI per the risk-tier rule).

## Definition of Done (epic) — ✅ COMPLETE 2026-06-23

- [x] `/admin` is a real hub with a left-nav listing every section (coupons, print, supply, vecindario,
      referrals, scraping link-out, tenants, audit); the external redirect is gone; the orphaned scrape client deleted. *(S1 #108)*
- [x] Every `/admin/*` page + every `/api/admin/*` + `/api/supply/*` route is gated by **Clerk admin identity**;
      no human path sends `?secret=`; `ADMIN_SECRET` survives only on the documented internal/machine routes
      (`/api/admin/import` Bearer + the PDF render path). *(S2.3 #109)*
- [x] Every admin **mutation** writes an `admin_audit_log` row; `/admin/audit` renders them. *(S2.1 #109)*
- [x] `/admin/tenants` lists/searches shops (Medusa seller ⋈ mirror) and inspects one (identity, claim, domain,
      entitlement, listing count) — read-only, Medusa IDs canonical. *(S3.1 #110)*
- [x] Entitlement **grant/revoke** works from the tenant inspector, wraps `lib/domain-entitlement`, is audited,
      and the S4.0 backend pre-flight is recorded in `sprint-4.md`. *(S4 #111 `9ec9b1a`; live grant smoke owed to Daniel.)*
- [x] Each `sprint-N.md` has its smoke walkthrough; money/auth steps flagged **owed to Daniel**; status ticked with refs.
- [x] This `README.md` marked ✅ (`status: shipped`); `RETROSPECTIVE.md` written; durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [x] Poster updated — `Roadmap/README.md` 09 · Platform & Infra gets the admin/tenant line; ran
      `node scripts/build-order.mjs`; staged `BUILD-ORDER.md`. Team memory + index updated.
- [x] Kill-switch check: none planned at grooming (auth migration is dual-accept-additive, not flag-gated); the
      deliberate act was flipping **off** secret acceptance after the allow-list was verified (S2.3) — confirmed.
