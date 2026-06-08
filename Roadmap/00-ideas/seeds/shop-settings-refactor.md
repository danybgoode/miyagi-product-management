---
title: "Shop Settings refactor — break the monolith"
slug: shop-settings-refactor
status: scaffolded
area: "03"
type: chore
priority: null
risk: low
epic: "03-selling-and-shops/shop-settings-refactor"
build_order: null
updated: 2026-06-08
---

# Scope — Shop Settings refactor (break the monolith)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-08).** Gate passed. Scaffolded under
> `03-selling-and-shops/shop-settings-refactor/` (epic README + sprint-1..4); kickoff prompts emitted.
> **Seed-level risk tagged LOW** (S1/S2/S4 are LOW); the one HIGH sprint (S3, money/domain/agent) is
> tiered in the body and **Daniel merges**. Definition-of-Ready scope doc. Groomed
> 2026-06-08 from Daniel's ask ("shop settings is a huge single file, hard to maintain, agents
> struggle to add features — evaluate, don't take my word") + a fresh code read this pass.
> **Class: Chore** (behavior-preserving structural refactor — no user-facing change).
> **Stage-2.5 bucket: genuinely-new (structural), lightest viable path chosen** — incremental
> per-section extraction behind the *existing* route + save seam, **not** a big-bang rewrite.
> **Risk: MIXED — S1/S2/S4 LOW, S3 HIGH (Daniel merges).** S3 extracts money/domain/agent sections.

---

## The problem (evaluated, not taken on faith)

`apps/miyagisanchez/app/shop/manage/settings/ShopSettings.tsx` is **4,218 lines / 232 KB**. Roughly
**3,530 of those lines are a single client component** (`ShopSettingsPanel`, line 689→end) holding
**127 `useState` hooks** and **~17 settings sections** rendered conditionally on one `activeSection`
variable. Only one child (`EmbedSnippetSection`, 203 lines) has ever been extracted.

Why this matches the reported "agents struggle to add features" symptom — concretely:

- **No state isolation.** 127 pieces of state share one function scope. Adding one field to one
  section means loading and reasoning over the whole 4,200-line file; one careless edit can break a
  sibling section. (Re-passing large context is the top hidden cost in agentic dev — `LEARNINGS.md`.)
- **Per-section URLs, but not per-section code.** `[section]/page.tsx` already mounts the *entire*
  monolith and just passes `activeSection`, so every section ships all 17 sections' JS to the client.
  The structure to split is present — it's just unused.
- **Two competing section taxonomies.** Route/index keys (`pagos`, `negociacion`, `diseno`,
  `agentes`) don't match the internal nav keys (`stripe`, `mercadopago`, `spei`, `ofertas`,
  `apariencia`, `tipo`, `webhook`…). The mapping mismatch is accreted debt and a trap for agents.

**What's already healthy (so this stays low-risk):** persistence is clean. Everything saves through
**one seam** — `PATCH /api/sell/shop` → `marketplace_shops.metadata.settings` tree. This is a pure
**frontend component-structure** problem: no data migration, no Medusa/Supabase change, no auth change.

---

## The ask (mirrored back)

> *You want the shop-settings surface broken out of one 4,200-line component into maintainable,
> per-section pieces — so you (and agents) can add a feature to one section without touching the
> whole file — **so that** velocity and safety on the seller settings surface go up. Right?*

Daniel's grooming decisions (2026-06-08):
- **Depth:** incremental extraction (one section at a time, behind the existing `[section]` route).
- **Extras (all in):** unify the dual section taxonomy · real per-section code-splitting · keep it
  **strictly behavior-preserving** (no UX/copy/behavior change).
- **Validation:** a characterization spec per section as it's extracted (coverage accretes).

---

## Stage 2.5 — orientation (the lighter path won)

This is genuinely structural work, but the **lightest viable approach** was selected over a rewrite:
extract section-by-section behind the route + save seam that already exist, with the monolith
coexisting as a fallback for not-yet-extracted sections until the last sprint removes it. Every slice
is independently shippable and behavior-preserving — no flag-day, no parallel rewrite.

---

## Medusa-first reframe — what already exists (reuse, don't rebuild)

| Existing primitive | Reuse as |
|---|---|
| `app/shop/manage/settings/[section]/page.tsx` (server fetch + `initial` prop shape) | The mount point — each extracted section renders here; add a per-section dynamic import for code-split |
| `PATCH /api/sell/shop` → `metadata.settings` tree (single save seam) | **Untouched.** Each section keeps saving through it via a shared `useSettingsSave()` hook |
| `app/.../settings/page.tsx` (index grid, canonical keys + completion logic) | The canonical taxonomy already lives here — align the internal nav to *these* keys |
| `EmbedSnippetSection`, `PickupSpotManager`, `ToggleSwitch`, `Toast`, `SectionTitle`, `SoonBadge`, `CopyPromptButton` | Shared UI primitives — promote to a `settings/_components/` (or `lib/shop-settings/`) dir, reuse verbatim |
| `parseLocation`, `detectSchedulingService`, `generateHex32`, `PRESETS` | Pure helpers — move to next-free `lib/shop-settings/` → free pure-logic spec coverage |
| `lib/apply-shop-settings.ts` + `lib/settings-import.ts` | Already encode the settings-tree shape — derive the new shared TYPES from these, don't invent a parallel shape |
| Playwright two-layer harness + `MS_TEST_*` authed-smoke pattern | The characterization specs ride this; pure-`lib/` specs are the free `api`-gate coverage |
| Design-token surface + the raw-color guard pattern (`design-token-foundation`) | Sections already use semantic CSS vars — keep; the final guard spec mirrors the token guard |

**AGENTS five-rule check:** #1 Medusa-owns-commerce — no commerce data moves (mp_enabled etc. still via
existing endpoints). ✅ · #2 Supabase non-commerce-only — settings stay in `marketplace_shops.metadata`. ✅
· #3 UCP/MCP first-class — the agent/MCP config tools write the **same** settings tree via the **same**
`/api/sell/shop` seam; keeping the seam preserves the agent path (**verify** the MCP config tools still
target it). ✅ · #4 Clerk untouched. ✅ · #5 Bilingual — seller portal is hardcoded es-MX (`LEARNINGS.md`);
strictly behavior-preserving means copy moves **verbatim**, gate = copy-completeness / no orphan strings. ✅

---

## Target architecture (the end state, reached incrementally)

- **`lib/shop-settings/`** (next-free): the settings-tree **types**, the **single canonical section
  taxonomy** (one map: canonical key → label, icon, group, internal field-set — kills the dual
  taxonomy), and the pure helpers. Pure-logic specs cover the map + helpers for free.
- **One component file per section** (`settings/_sections/<Section>.tsx`), each owning *its own* state,
  consuming a shared **`useSettingsSave()`** hook (wraps the existing `PATCH /api/sell/shop` + Toast).
- **`[section]/page.tsx`** maps canonical key → a **dynamically imported** section component
  (`next/dynamic`) → real per-section code-splitting. During migration it routes extracted sections to
  new components and **falls back to the monolith** for the rest, so every extraction ships on its own.
- **The monolith is deleted** in the final sprint once every section has moved.

---

## Scope boundary

**In (v1):**
- Extract all ~17 sections into isolated per-section components behind the existing `[section]` route.
- Establish the shared `lib/shop-settings/` types + canonical taxonomy + `useSettingsSave()` hook.
- Unify the dual section taxonomy into one canonical key set.
- Real per-section code-splitting (only the active section's JS loads).
- One characterization spec per extracted section; final guard spec against re-monolithization.
- Delete the old `ShopSettings.tsx` monolith.

**Out (explicitly not v1):**
- No new settings, fields, or sections. No UX/layout/copy redesign. No behavior change of any kind.
- No change to persistence (`/api/sell/shop`), the settings-tree shape, or any backend/Medusa/Supabase.
- No auth/Clerk change. No bilingual expansion (copy moves verbatim, es-MX stays es-MX).
- No change to the settings *importer* flow (`/settings/import`) beyond consuming shared types.

---

## Slices — skateboard → car (4 sprints)

> Every story is behavior-preserving. Each extraction adds **one** characterization spec; pure-logic
> specs on `lib/shop-settings/` are the free `api`-gate coverage. Authed browser smokes that render a
> section + round-trip a save **skip gracefully without `MS_TEST_*`** and the money-path ones are
> **owed to Daniel** by name (he holds the live seller sessions).

### Sprint 1 — Foundation seam + first extraction (the skateboard) · **LOW**
The thinnest end-to-end slice that ships and proves the whole pattern.
- **S1.1 — Shared foundation.** *As a developer, I want the settings types, the canonical section
  taxonomy, and the pure helpers in a next-free `lib/shop-settings/`, so that sections share one source
  of truth.* **Acceptance:** types derive from `apply-shop-settings`/`settings-import`; one canonical
  map replaces the dual key sets; pure-logic spec passes (map completeness + helper functions). LOW.
- **S1.2 — `useSettingsSave()` hook.** *As a developer, I want one hook wrapping `PATCH /api/sell/shop`
  + Toast, so that every section saves identically without touching persistence.* **Acceptance:** hook
  saves through the existing endpoint; Toast behavior unchanged. LOW.
- **S1.3 — Extract the first (safest) section + code-split registry.** Extract **Devoluciones
  (`politicas`)** into its own component, mounted via `[section]` through a dynamic-import registry that
  **falls back to the monolith** for every other section. *As a seller, I want the Devoluciones settings
  to look and behave exactly as before.* **Acceptance:** the page renders + a return-policy save
  round-trips identically; only that section's JS loads for `/settings/politicas`; characterization
  spec passes. LOW.
- **QA:** pure-logic spec (S1.1) in the `api` gate; one characterization spec (S1.3). Smoke: anonymous
  where possible; authed render+save owed to Daniel.

### Sprint 2 — Extract the low-risk sections · **LOW**
Mechanical, repetitive, assembly-line. One component + one spec per section.
- Sections: **perfil, apariencia/diseño, tipo de tienda, ofertas/negociación, comunicación, envíos,
  citas y reservas, pedidos, notificaciones.** Each: *As a seller, I want <section> to look and behave
  exactly as before* — **Acceptance:** fields render + a save round-trips identically; section JS loads
  in isolation; characterization spec passes. LOW each.
- **QA:** one characterization spec per section; pickup-spots/origin-address (envíos) gets extra care
  (it has the most internal state). Authed render+save smokes skip without `MS_TEST_*`.

### Sprint 3 — Extract the money / domain / agent sections · **HIGH (Daniel merges)**
Strictly behavior-preserving; these touch money, domain provisioning, and agent tokens.
- Sections: **Stripe, MercadoPago, SPEI, Compra Protegida, Canal propio (custom domain), Agentes /
  Conectar sistema (webhook + MCP token).** Each: *As a seller, I want <section> to look and behave
  exactly as before, including every connect/disconnect/verify action.* **Acceptance:** each external
  action (`/api/mp/connect`, `/api/sell/shop/domain*`, `/api/sell/agent-token`, Stripe onboarding) fires
  the identical request; no secret leaks to the client (the existing `safeMetadata` strip is preserved);
  characterization spec passes. **HIGH.**
- **QA:** characterization spec per section + the secret-strip invariant asserted. The **authed
  money/domain/token browser smokes are owed to Daniel** (sandbox/test shop; revoke test tokens after).

### Sprint 4 — Decommission + finalize · **LOW (shared surface — announce)**
- **S4.1 — Delete the monolith.** Remove `ShopSettings.tsx` once every section has moved; remove the
  monolith fallback from the registry. **Acceptance:** `tsc`+`build` green with no reference to the old
  file. LOW (touches shared `[section]` routing → **announce** per `LEARNINGS.md`).
- **S4.2 — Finalize the unified taxonomy.** Delete the legacy dual-key map; index + route + nav all use
  the one canonical set. **Acceptance:** every section link resolves; no orphan keys. LOW.
- **S4.3 — Anti-monolith guard spec.** A pure-logic `api` spec that fails CI if any single settings
  component exceeds a line threshold (or if `ShopSettings.tsx` reappears) — keeps the foundation from
  eroding, the way the raw-color guard keeps tokens tokenized. **Acceptance:** spec green; deliberately
  oversized file fails it. LOW.
- **QA:** full `tsc`+`build`+Playwright `api` suite green; final per-section browser smoke pass owed to
  Daniel for the money sections.

---

## Risk tiers (per `WAYS-OF-WORKING`)
| Sprint | Tier | Who merges |
|---|---|---|
| S1 Foundation + first extraction | LOW | reviewer (green CI) |
| S2 Low-risk sections | LOW | reviewer (green CI) |
| S3 Money/domain/agent sections | **HIGH** | **Daniel** |
| S4 Decommission + finalize | LOW (shared routing — announce) | reviewer, after announce |

---

## Open risks / watch-items
- **MCP config-tools coupling.** Verify the agent/MCP settings-config tools target `/api/sell/shop`
  (or the same tree) — keeping the seam should preserve them, but confirm before S3.
- **Secret-strip invariant (S3).** `[section]/page.tsx`'s `safeMetadata` strips MP tokens + the hashed
  agent token before they reach the client. The extraction must not reintroduce a leak — assert it.
- **Shared-routing blast radius (S4).** Deleting the monolith + editing `[section]` routing is shared
  surface; announce, merge latest `main` first, and degrade gracefully.
- **es-MX copy fidelity.** Behavior-preserving means strings move verbatim; a copy-completeness check
  (no orphan/hardcoded changes) is the gate, not new translations.

## Definition of Ready — checklist
- [x] As-a / I-want / so-that clear; acceptance testable by Daniel (render + save round-trip per section).
- [x] Stage-2.5 bucket named (genuinely-new structural, lightest path chosen).
- [x] v1 in/out boundary written.
- [x] Reuse list produced (Medusa-first reframe done — route, save seam, primitives, types).
- [x] Each story risk-tiered; QA stage named; smoke owner identified (Daniel for money paths).
- [x] **Daniel approved this scope doc (2026-06-08)** → scaffolded under `03-selling-and-shops/shop-settings-refactor/`.
