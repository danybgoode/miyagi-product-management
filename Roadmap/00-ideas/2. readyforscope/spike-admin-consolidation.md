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
- [x] **Daniel approves this spike brief** → spike RUN 2026-06-22; decision below.

---

# DECISION — Admin consolidation + tenant management (spike output, 2026-06-22)

**Investigation only. No code, no branch.** Live-probed the in-repo admin surfaces, the `lib/` backends, and
the **external scraper app** (cloned locally at `~/dobby/miyagisanchez-scraper`, repo
`github.com/danybgoode/miyagisanchez-scraper`). Findings replace the brief's "pre-checked" guesses where they
differ. Cross-panel second opinion appended at the end.

## Q1 — Complete capability → location → auth inventory

| Capability | Where it lives | In-repo UI? | Auth today |
|---|---|---|---|
| **Scraping** — SerpAPI / Apify / MercadoLibre collectors, **AI-assisted Gemini validation (streaming)**, image upload, runs list, CSV export | **External app** `miyagisanchez-scraper.vercel.app` (own repo + deploy, own env: `SERPAPI_KEY`, `APIFY_TOKEN`, `lib/encryption.ts` for stored creds). "**Collect-only**" by design — writes Supabase `marketplace_scrape_runs` / `_run_items`; does **not** import to Medusa. | `/admin` (2,471-line client) — external | `ADMIN_SECRET` (`?secret=`) |
| `/admin` (in-repo) | in-repo — **just `redirect()`s** to the external scraper with `?secret=` | redirect only | `ADMIN_SECRET`-in-URL |
| `app/(shell)/admin/AdminScrapeClient.tsx` (in-repo, 474 lines) | in-repo — **ORPHANED: imported by nothing** (legacy duplicate of the external scrape UI, left behind when scraping moved external) | dead code | n/a |
| **Supply / gems → Medusa import** — staging review, approve, direct-CSV import, batch import | in-repo `/supply` page + `/api/supply/{batches,items,import,schema,upload,status}` | **Yes — `/supply`** (top-level, not under `/admin`) | `ADMIN_SECRET` |
| Scrape/runs/import API (in-repo mirror of the external collectors) | in-repo `/api/admin/{scrape,runs,runs/[id]/csv,import}` | no UI (`import` takes `Bearer ADMIN_SECRET`) | `ADMIN_SECRET` |
| **Coupons** — platform coupon admin + the World-Cup `miyagisan` domain-coupon mint | in-repo `/admin/coupons` + `/api/admin/{coupons,domain-coupon}` | Yes | `ADMIN_SECRET`-in-URL |
| **Print program** (most built-out) — editions, layout builder, PDF export, submissions queue, providers, community/social | in-repo `/admin/print/*` + `/api/admin/print/*` | Yes | `ADMIN_SECRET`-in-URL |
| **Vecindario moderation** (`web_visible` opt-in toggle) | **bolted into `PrintAdminClient`** (line ~407), not its own surface | Yes (mis-homed inside Print) | `ADMIN_SECRET` |
| **Referrals config** (reward type/amount/expiry) | in-repo `/api/admin/referrals/config` (GET/PATCH) | **No UI anywhere** — configured by raw curl/API today | `ADMIN_SECRET` |
| **Tenant / shop management** | **does not exist** | — | — |

**Auth model (uniform):** one shared `ADMIN_SECRET`, accepted via `?secret=` (URL), `x-admin-secret` header, or
`Bearer`. **No per-user admin identity, no audit trail.** `MIYAGI_ADMIN_EMAIL` exists only as an email-notification
*recipient*, never as an auth identity. The shared guard is `lib/print-server.ts checkAdminSecret()` + inline
copies in each route/page.

**Answers to the brief's explicit Q1 asks:**
- The external scraper hosts **scraping + runs/CSV + image-upload only**. It does **NOT** host the Referrals UI,
  and does **NOT** do gems/import-to-Medusa (that's the in-repo `/supply`). It's cleanly split at the Supabase
  staging boundary.
- **Referrals has no in-repo (or external) admin UI** — backend-only. Confirmed.

## Q2 — Consolidation architecture

**Target: ONE in-repo admin shell** at `app/(shell)/admin/` with a real hub + a section registry
(`lib/admin/sections.ts`: `{label, href, icon, risk}[]` — the "author-once, render-many" pattern already used
for nav/about). The hub **replaces the external redirect**. Each section renders inside a shared
`AdminShell` (left-nav + es-MX chrome).

**External scraper app → KEEP EXTERNAL + LINK from the unified nav. Do NOT absorb in v1.** Why:
- It is a heavy, specialized, **separately-deployed** app with its own API keys (SERPAPI/APIFY), a creds
  `encryption.ts`, and a 2,471-line AI-streaming client. Absorbing drags those deps + secrets + build weight
  into the main app — directly against the just-shipped *marketplace-static-shell* cold-start work.
- It is **already cleanly separated** at the Supabase boundary, and the valuable in-repo half (gem→Medusa
  import via `/supply`) is in-repo already. Absorption is a big lift for little consolidation gain — the goal
  (one coherent nav + one auth model) is met by **linking + unifying auth**.
- **Mid-term call (deferred, owner Daniel — he owns the repo/deploy):** revisit absorbing it only if it
  becomes a maintenance burden; its surface is small (1 page + 5 routes).

**Section map of the consolidated admin:**
| Section | Action |
|---|---|
| `/admin` hub | NEW — dashboard of sections (delete the external redirect) |
| `/admin/coupons`, `/admin/print/*` | keep; register in nav; swap gate to Clerk (Q3) |
| `/admin/vecindario` | **extract** `web_visible` moderation out of `PrintAdminClient` into its own section |
| `/admin/referrals` | **NEW thin UI** over the existing `/api/admin/referrals/config` (cheap win — backend already there) |
| `/admin/supply` | **re-home** the existing top-level `/supply` page under `/admin` |
| `/admin/scraping` | **link-out** to the external scraper app |
| `/admin/tenants` | NEW — tenant management (Q4) |
| `/admin/audit` | NEW — read-only audit-log viewer (Q3) |

**Cleanup:** delete the orphaned `app/(shell)/admin/AdminScrapeClient.tsx`.

## Q3 — Admin auth model

**Decision: move human admin auth to Clerk identity + an allow-list/role + an audit trail; kill secret-in-URL.**
Keep `ADMIN_SECRET` **only** as a server-to-server / internal credential (the `import` Bearer for batch scripts,
the neighborhood-pulse smoke route) — never again as the human gate.

**Why:** secret-in-URL leaks (history, referer, logs, link-sharing) — the brief's own flag. The app already
standardizes on **Clerk** (rule #4) and admins are already Clerk users; `MIYAGI_ADMIN_EMAIL` already names the
admin. Clerk gives **per-user identity → real audit**, and **role/allow-list → revocation without rotating a
shared secret**.

**Mechanism:**
- Pure `lib/admin/identity.ts` `isAdminUser({userId,email})`. **Target = Clerk `publicMetadata.role === 'admin'`**
  (durable, not env-coupled); **bridge = `MIYAGI_ADMIN_EMAILS` env allow-list** (zero-Clerk-config MVP).
- Shared guards: `requireAdmin()` (server pages → replaces `if (secret !== env.ADMIN_SECRET) redirect('/')`)
  and `withAdmin(handler)` (API → replaces `checkAdminSecret(req)`). The API wrapper is the guarantee; the page
  gate is courtesy. **Gate every mutation route, not just the page** (LEARNINGS: ship had two writes behind one
  button).
- Audit: append-only `admin_audit_log` in **Supabase** (non-commerce → rule #2): `{actor_user_id, actor_email,
  action, target, payload_summary, ts}`, written by `withAdmin`; viewer at `/admin/audit`.

**Migration path + blast radius (the brief's open question):**
- **Blast radius ≈ 25–30 surfaces:** every `/api/admin/*` (scrape, runs, runs/csv, import, coupons,
  domain-coupon, referrals/config, print/* ≈ 12) + every `/api/supply/*` (6) + the `/admin/*` and `/supply`
  **pages** + `checkAdminSecret` in `lib/print-server.ts` (shared by all print routes) + the external-scraper hop.
- **Dual-accept transition** (the "coexisting fallback, delete once provably unreachable" idiom): the guard first
  accepts **either** a valid Clerk-admin session **or** `ADMIN_SECRET`. Then: (1) migrate in-repo pages to Clerk
  and drop `?secret=` from every link; (2) confirm no human path still sends the secret; (3) remove human-secret
  acceptance, leaving `ADMIN_SECRET` only on the two explicitly-internal routes. **No flag needed** (acceptance is
  purely additive); the deliberate act is flipping *off* secret acceptance — verify the allow-list first.
- **Risk: HIGH** (touches every admin mutation incl. money — coupons, domain-coupon, entitlement). **Daniel-merged.**
- **Scraper app:** migrate its 1 page + 5 routes to the same Clerk gate (cross-origin Clerk) as a small slice, OR
  document it as the single remaining `ADMIN_SECRET` exception. Owner: Daniel.

## Q4 — Tenant management v1 (validated against real backends)

| Action | Backend reality | v1? | Risk |
|---|---|---|---|
| **Directory** (list/search/inspect shops & sellers) | **FEASIBLE** — Medusa sellers (marketplace plugin) ⋈ `marketplace_shops` mirror (slug, metadata, source_url; claim via `lib/claim.ts isShopClaimed`; domain + entitlement via `metadata`). Read-only. | **YES** | **LOW** (read-only) |
| **Entitlement / custom-domain comp-grant** | **Backend logic EXISTS** (`lib/domain-entitlement.ts` + `marketplace_shops.metadata.custom_domain_grant`, hand-granted today, **no UI**). v1 = a grant/revoke **write endpoint** wrapping it + UI. | **YES** | **HIGH** (entitlement/money → Daniel-merged) |
| **Suspend / unsuspend a shop** | **NO backend** (confirmed — no shop-level status field anywhere). Building it = a *derived gate* `metadata.suspended` honored at the listing-query + checkout + agent seams (the domain-entitlement pattern), or bulk product-draft. Touches **checkout/visibility**. | **DEFER → own epic** | **HIGH** + real surface |
| **Per-shop flags** | **NO general primitive** (only a per-shop embed key + global Flagsmith kill-switches). | **DROP** (revisit on a concrete need) | — |

**v1 = directory (read) + entitlement grant/revoke (write).** Suspend is genuinely new backend → its own later
epic, not v1. Per-shop flags dropped. Read-only vs mutating clearly split per the table.

## Q5 — Epic fan-out + sequencing

Four epics, ordered so consolidation and tenant-mgmt **don't collide** (A owns the shell+nav+auth contract;
later epics register additively into A's section registry):

- **Epic A — Admin auth + shell foundation** (FIRST). A1: Clerk-admin identity + `requireAdmin`/`withAdmin`
  dual-accept guard across all `/api/admin/*` + `/api/supply/*` + audit log/viewer (**HIGH**). A2: the admin shell
  + section registry + real hub (kill the external redirect → hub with a scraper link-out); delete the orphaned
  `AdminScrapeClient.tsx`.
- **Epic B — Migrate + complete sections** (after A; LOW–MED). Re-home `/supply` → `/admin/supply`; extract
  Vecindario → `/admin/vecindario`; add the thin Referrals UI; register coupons/print; drop `?secret=` from links;
  finish removing human-secret acceptance once all pages are Clerk-gated. (Scraper-app auth migration rides here or A.)
- **Epic C — Tenant directory** (after A; **parallel-safe with B**; LOW, read-only). `/admin/tenants` + inspect.
- **Epic D — Tenant actions** (after C). D1: entitlement grant/revoke wrapping `domain-entitlement` (**HIGH**,
  Daniel-merged). D2 (separate, deferred): the shop **suspend** primitive (new backend) — only when prioritized;
  kill-switch considered at its grooming.

**Tenant management = its own epics (C+D), sequenced after the shared foundation A** — answering the brief's
"one epic with consolidation, or its own?" open question.

## Q6 — Safety model
- Every admin action gated by `requireAdmin`/`withAdmin` (Q3); the **API wrapper is the guarantee**, gating every
  *mutation* route (not just the page).
- Money/entitlement actions (coupons, domain-coupon mint, entitlement grant/revoke) stay **HIGH → Daniel-merged**,
  audited, built on the auth foundation.
- Suspend (if/when built) touches checkout/visibility → **HIGH, own epic**, kill-switch considered at grooming.
- The `admin_audit_log` gives after-the-fact accountability on every mutation.

## Build plan (order)
1. **Epic A** (auth + shell) — HIGH (auth). Foundation; everything else depends on it.
2. **Epic B** (migrate/complete sections) + **Epic C** (tenant directory) — can run **in parallel** after A
   (both only *register* into A's nav; use a single scribe for `lib/admin/sections.ts`).
3. **Epic D1** (entitlement grant/revoke) — HIGH, after C.
4. **Epic D2** (suspend) — deferred; groom separately when prioritized.

## Cross-panel second opinion (codex — different family; 2026-06-22)

Ran `node scripts/cross-panel.mjs <this doc> --agent codex --lens both` (architect-purist + architect-pragmatist).
Advisory only; no contradictions between lenses ("complementary"). **Accepted adjustments** (applied to the
sequencing above):

- **[purist — accept] Validate the entitlement-grant ownership before slicing Epic D1.** Before wrapping
  `marketplace_shops.metadata.custom_domain_grant`, read `apps/backend/src/**` marketplace **seller module** for
  any existing seller status/entitlement primitive, and classify the comp-grant explicitly as *non-commerce
  platform metadata* (rules 1/2). If Medusa already models seller entitlement, prefer that. **→ added as a D1
  pre-flight check.** (Likely fine — it's a custom-domain comp, not a Medusa order/payment concept — but confirm,
  don't assume.)
- **[purist — accept] Tenant directory is a READ-MODEL only.** Medusa seller IDs are **canonical**;
  `marketplace_shops` fields are display/enrichment. State this in Epic C so tenant *actions* never drift into
  "mutate Supabase shop state first." **→ folded into Epic C scope.**
- **[purist — accept] Suspend (D2) must start from a Medusa seller/shop status primitive**, not a
  `metadata.suspended` flag honored by many consumers (that spreads commerce enforcement across listing/checkout/UCP
  seams). The brief's "derived-gate" sketch is the *fallback*, not the default — groom D2 Medusa-first. **→ noted on D2.**
- **[purist — accept] UCP/MCP check on any tenant change that alters agent discovery/transaction** (entitlement +
  visibility, not just suspend) — update the manifest/MCP if so (rule 3). **→ added to the safety model.**
- **[pragmatist — accept] Split Epic A; don't let an auth migration swallow the consolidation win.** Re-sequenced:
  - **A1 = the shell skateboard:** Clerk-gated `/admin` hub + `sections.ts` registry + remove the external redirect
    + register existing sections + delete the orphaned client. Leave each route's `ADMIN_SECRET` guard
    **dual-accepted** (Clerk *or* secret) and migrate per-section in B — A1 does **not** convert all ~25 routes up front.
  - **A2 = audit *logging*** wired into `withAdmin` as mutations migrate. The **`/admin/audit` viewer moves to B**
    (ship logging first; build the viewer once there's data). 
  - Pre-flight (pragmatist's checkable claim, **accept**): confirm the hub can render section links while route guards
    stay dual-accepted — read `app/(shell)/admin/page.tsx`, `lib/print-server.ts`, `app/(shell)/admin/coupons/page.tsx`.
- **[pragmatist — accept] Pull the tenant directory (Epic C) early** — highest-signal / lowest-risk tenant slice;
  it can ship right after A1, in parallel with B (it only reads). **→ C now sequenced immediately after A1.**
- **[pragmatist — accept] External scraper = documented `ADMIN_SECRET` exception for now**; cross-origin Clerk on a
  separate repo/deploy isn't obviously cheap. Federate its auth only if Daniel values it over shipping. **→ scraper
  auth-migration demoted to a deferred, Daniel-owned call (was "small slice in A/B").**

**Revised build order (post-panel):**
1. **A1** — admin shell + hub + registry + register sections + delete orphan (dual-accept guards stay). *(HIGH — touches auth surface, but additively.)*
2. **C** (tenant directory, read-only) ‖ **B** (migrate sections + referrals UI + Vecindario extract + supply re-home + audit viewer; finish dropping secret-in-URL per-section + **A2 audit logging**). Parallel; single scribe for `sections.ts`.
3. **D1** — entitlement grant/revoke (HIGH, Daniel-merged) **after** the backend seller-module pre-flight.
4. **D2** — suspend, deferred; groom Medusa-first when prioritized.

*(Family diversity: codex covers a non-Claude family per the brief. A second `--agent antigravity` pass is
available if Daniel wants a third lens before approving the build.)*

---
**SPIKE COMPLETE.** Decision written; no code, no branch. Next step is Daniel's approval to fan out Epics A→D
(or to scaffold A1 first).
