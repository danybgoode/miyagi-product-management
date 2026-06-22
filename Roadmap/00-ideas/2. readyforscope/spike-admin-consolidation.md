# Spike — Admin consolidation + tenant management

**Status: awaiting Daniel approval — no code yet. This is a SPIKE: it ends in a written decision, not code.**
Macro-section: **09 · Platform & Infra**. Slug: `spike-admin-consolidation`.
Class: **Spike** (time-boxed investigation → a decision). No slicing/build until the decision lands.

## Mirror-back
> The admin has grown ad-hoc and scattered. You want me to **validate what actually exists**, then plan a
> **consolidation** into one coherent admin — and add **tenant (shop/seller) management**, which doesn't exist
> yet. You chose: spike-first; tenant-management v1 = a directory **plus** the actions that already have
> backends; and the admin **auth model** is a spike decision. Right?

## Daniel's grooming calls (2026-06-22)
1. **Spike/audit first** — complete the inventory (incl. the external scraper app + the auth model), then a
   written decision on the consolidation architecture, the admin auth model, and where tenant management fits.
2. **Tenant-management v1 = directory + backend-backed actions** (suspend/unsuspend, manage the custom-domain
   comp/entitlement grants, per-shop flags) — *subject to which backends actually exist (see findings)*.
3. **Admin auth model = a spike decision** (shared `ADMIN_SECRET`-in-URL vs Clerk-based admin identity).

## Stage-2.5 bucket — **mixed; that's why we spike**
Consolidation of existing surfaces is mostly **light** (re-home/relink + one shell). Tenant management is
**genuinely new**. The auth model and the external-scraper-app question are **architecture forks**. The spike
resolves which parts are light vs new before anything is sliced.

## Validated inventory (starting point — done 2026-06-22, so the spike completes rather than re-derives it)
**In-repo admin (`app/(shell)/admin/` + `app/api/admin/` + `app/api/supply/`):**
- **`/admin`** → **NOT a hub; redirects to an external app** `miyagisanchez-scraper.vercel.app/admin?secret=…`.
  The scraping/gems/import "home" largely lives **outside this repo**.
- **`/admin/coupons`** → platform coupon admin (page + `/api/admin/coupons` + `/api/admin/domain-coupon`, the
  World-Cup `miyagisan` mint). *(Coupon mint wasn't on Daniel's list.)*
- **`/admin/print/*`** → the most built-out: editions, layout builder, PDF export, submissions queue,
  providers, community/social — **and Vecindario moderation is bolted on here** (web opt-in lives inside
  `PrintAdminClient`, not its own surface).
- **API-only, no in-repo UI:** **Referrals** (`/api/admin/referrals` + `/config`), **scrape/runs/import**
  (`/api/admin/{scrape,runs,runs/[id]/csv,import}`), **supply/gems** (`/api/supply/*` + the in-repo `/supply` page).

**Cross-cutting problems found:**
- **No unified admin shell or nav** — sections are disconnected; the "hub" is an external redirect.
- **Auth = one shared `ADMIN_SECRET`** via `?secret=` *in the URL*, `x-admin-secret`, or Bearer — **no per-user
  admin identity, no audit trail**, secret-in-URL is leaky. (A few routes reference `MIYAGI_ADMIN_EMAIL`.)
- **Referrals/scraping/gems split** across API-only stubs, the `/supply` page, and the external scraper app.

**Tenant-management feasibility (pre-checked):**
- **Directory** (list/search/inspect shops & sellers): **feasible** — read `marketplace_shops` (Supabase mirror)
  + Medusa sellers (marketplace plugin).
- **Entitlement / comp grants**: **backend exists** — `lib/domain-entitlement.ts` +
  `marketplace_shops.metadata.custom_domain_grant` (grandfather|comp), hand-granted by Daniel today with **no
  UI**. A tenant-mgmt action can wrap this directly.
- **Suspend/unsuspend a shop**: **no backend found** — no shop-level suspend/status mechanism today. This would
  likely need a small Medusa/mirror change → it is **not** an "action that already has a backend." Spike confirms.
- **Per-shop flags**: **no general primitive** — only a per-shop embed key + global Flagsmith kill-switches. Not a thing yet.

## Investigation questions the spike must answer (the brief)
1. **Complete the inventory.** Enumerate the **external scraper app's** surface (scraping, gems, runs, import —
   and does it host the Referrals UI?). Confirm Referrals has no in-repo UI. Produce one table: every admin
   capability → where it lives (in-repo page / API-only / external app) → its auth method.
2. **Consolidation architecture.** Decide the target: one in-repo **admin shell + nav** (where it lives, how
   sections register). **Bring the external scraper functions in-repo, or keep them external + link from a
   unified nav?** Map each existing section to its home in the consolidated admin.
3. **Admin auth model.** Decide: keep the shared `ADMIN_SECRET` vs move to **Clerk-based admin identity**
   (roles/allow-list) + an audit trail; kill secret-in-URL. Recommend, with the migration path + risk.
4. **Tenant management v1.** Validate the backends (per the pre-check above) and scope v1: confirm the
   **directory**; confirm the **entitlement-grant** action (wrap `domain-entitlement`); decide whether
   **suspend/unsuspend** is in v1 (needs new backend → higher risk) or deferred; drop "per-shop flags" unless a
   primitive is worth building. Define what's read-only vs mutating, and the risk tier of each.
5. **Sequencing.** Recommend how this fans into epics (e.g. (a) admin shell + auth, (b) migrate sections,
   (c) tenant directory, (d) tenant actions) and the order — so consolidation and tenant-mgmt don't collide.
6. **Safety.** Admin mutates platform-wide state (coupons, grants, possibly suspensions) → confirm the auth
   decision (Q3) gates every action, and that money/entitlement actions stay HIGH-risk (Daniel-merged).

## Deliverable (what "spike done" means)
A **written decision** appended to this doc (or a linked decision note):
- the complete capability→location→auth inventory (Q1),
- the consolidation architecture + external-app call (Q2),
- the admin auth-model decision + migration path (Q3),
- the tenant-management v1 scope with per-action backend-feasibility + risk tier (Q4),
- the epic-fan-out + sequencing (Q5) and the safety model (Q6),
- a clear **build plan** (which epics, in what order). **No code in the spike.**

Natural fit: run `scripts/cross-panel.mjs` on the architecture decision (auth model + external-app call are
real forks) for a different-family second opinion before finalizing.

## Medusa-first reframe (AGENTS five-rule check)
**N/A for the spike — investigation only.** Flagged for the resulting build: tenants = **Medusa sellers
(marketplace plugin)** + the `marketplace_shops` Supabase mirror — the directory reads those, and any
shop-state mutation (suspend) belongs in **Medusa**, not a new Supabase table (rule 1/2). Admin auth must not
disturb **Clerk** (rule 4). Admin copy is es-MX (rule 5).

## Risk tier
**The spike is LOW** (reading, mapping, writing a decision — no code). Called out: the *outcomes* span LOW
(read-only directory, nav shell) to **HIGH** (auth-model migration, entitlement/suspend mutations, anything
money) — each resulting epic is risk-tiered then.

## Open questions to resolve in the spike (don't assume)
- The external scraper app's exact surface + whether it should be absorbed or kept (and who owns its repo/deploy).
- Whether a shop **suspend** backend is worth building for v1 (it's not free) or deferred.
- The admin auth migration's blast radius (every `/api/admin/*` + `/api/supply/*` route currently trusts the
  shared secret — moving to Clerk identity touches all of them).
- Whether tenant management is one epic with consolidation or its own.

## Research note
No external standard is load-bearing. The "research" is **in-repo + the external scraper app**: finish the
inventory and probe the auth/backends live, per the "validate-first, never assume" discipline.

## Definition of Ready — checklist
- [x] Class = Spike; ends in a written decision, no code (groom Stage 2).
- [x] Stage-2.5 bucket named (mixed — that's the reason to spike).
- [x] Investigation questions written (Q1–Q6) with a concrete deliverable + validated starting inventory.
- [x] Reuse/feasibility produced (domain-entitlement grant, marketplace_shops/Medusa sellers, existing admin sections).
- [x] Risk named (spike LOW; outcomes LOW→HIGH); second-opinion path (cross-panel) identified.
- [ ] **Daniel approves this spike brief** → then emit the investigation kickoff (no branch, no build).
