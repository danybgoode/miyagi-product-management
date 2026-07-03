---
title: "Golden Beans — Unified Growth Engine (standalone) + the dobby-foundation extraction"
slug: golden-beans-growth-engine
status: ready
area: "09 · Platform & Infra"   # S0 lives here; the engine epic lives in golden-beans' own Roadmap
type: feature                   # one epic, two workstreams (S0 foundation is a chore-shaped enabler)
archetype: Builder              # S0: Maintainer
priority: null
risk: low                       # no money/auth/commerce paths; shared-surface stories flagged below
epic: "09-platform-infra/dobby-foundation"   # S0 workstream; engine epic scaffolds in golden-beans/Roadmap after S0.4
build_order: null
updated: 2026-07-03
prd: "../1. raw/golden-beans.md"
prd_addendum: "../1. raw/golden-beans-prd-g-chaos.md"   # PRD-G: chaos + SecOps — deferred to v2, see Addendum section
---

# Scope — Golden Beans: Unified Growth Engine + portable ways-of-work

## Mirror-back
> Build the **Unified Growth Engine** (PRD: flags + A/B + telemetry routing + North Star/TARS
> dashboards) as a **standalone project, maintained on its own** — and use it as the forcing function
> to **extract our ways of work** (groom, skills, scaffolds, WAYS-OF-WORKING, CI patterns) into a
> foundation any future isolated project spawns from. Design notes in the PRD are ignored per Daniel.

## Decisions locked (Daniel, 2026-07-03)
1. **Telemetry-first v1** — the engine does NOT serve flags in v1. Miyagi keeps `platform_flags` +
   `isEnabled()` (shipped 2026-07-01). Flag-serving + migration is a later epic, only once the engine
   is proven. (PRD Module B's sub-ms gateway is explicitly OUT of v1.)
2. **Miyagi is the first consumer** — acceptance = a real Miyagi feature instrumented, a real TARS
   funnel rendered from live traffic.
3. **Sibling repo + parent workspace** — `~/dobby/` is the workspace: `medusa-bonsai/`,
   `golden-beans/`, and `dobby-foundation/` as independent sibling repos.
4. **Plugin marketplace + template** — `dobby-foundation` carries (a) a Claude Code **plugin
   marketplace** distributing the living skills to every project, and (b) a **project template**
   skeleton new projects copy once.

## Stage-2.5 bucket
- **Engine core (TARS · North Star · A/B bucketing · unified `/v1/track` · SDK): genuinely new.**
  Nothing in the portfolio does this.
- **Flag serving: already possible** — in-house flags shipped 2026-07-01 (`platform_flags`, fail-open
  60 s cache, `/admin/flags`, audited). Rebuilding it would be the third flag backend in a month → OUT.
- **Vendor telemetry fanout: partially exists** — GTM (GA4 + Clarity) is live site-wide on Miyagi.
  PRD Module C's broker (Pub/Sub, retries, GA fanout) is deferred until a real second sink demands it.
- **Foundation extraction: light-enhancement whose trigger has fired** — the skills-library spike
  (2026-07-02) decided "stay repo-checked-in; **revisit when a second repo needs to selectively
  install a subset**." Golden-beans is that second repo.

## Research (verified 2026-07-03)
- Claude Code **plugins** bundle skills/commands/agents/MCPs; a **marketplace** is just a git repo
  with `.claude-plugin/marketplace.json`; consumers run `/plugin marketplace add <org>/<repo>` then
  `/plugin install <plugin>@<marketplace>`. Updates flow from the one repo — no per-project forks.
  Source: [code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).
- This matches the house wiring decided in `spike-skills-library-audit.md` (script does the work ·
  skill wraps it · routine triggers it) — the plugin is the distribution layer on top, nothing rewires.

## The workspace shape (the education Daniel asked for)
Heuristics that survive contact with agentic + classic workspace practice:
- **One parent folder, independent sibling repos.** `~/dobby/` is the spawn point. Never nest a
  standalone product inside another product's monorepo — a monorepo is for things that *deploy and
  version together* (Miyagi FE+BE qualify; golden-beans doesn't).
- **Share by versioned distribution, not by path.** Cross-repo relative paths and copy-paste both rot.
  Skills reach projects via the marketplace (pull-based, versioned); the skeleton reaches them via the
  template (copy once, then it's yours). A groom improvement lands in `dobby-foundation` and every
  project picks it up.
- **Separate the universal from the project-specific.** WAYS-OF-WORKING (cadence, DoR/DoD, risk
  tiers, QA gate, gitflow) generalizes. The AGENTS five rules (Medusa-first, Supabase, UCP/MCP,
  Clerk, es-MX) are Miyagi's — the template ships an `AGENTS.md` **skeleton with a per-project rules
  slot**, not Miyagi's rules.
- **Each project owns its Roadmap.** golden-beans gets its own `Roadmap/` from the template; its epic
  docs live there, not in medusa-bonsai. (This scope doc lives here because the funnel is here today.)

```
~/dobby/
├── dobby-foundation/          ← marketplace (.claude-plugin/marketplace.json + plugins/ways-of-work/)
│   └── template/              ← Roadmap skeleton · WAYS-OF-WORKING (generalized) · AGENTS skeleton
│                                · CI workflows · scripts (build-order, cross-review) · e2e harness
├── medusa-bonsai/             ← consumes the marketplace; keeps its Miyagi-specific rules
└── golden-beans/              ← spawned from template; consumes the marketplace
```

## What already exists (reuse, don't rebuild)
| Capability | Where | Reuse for |
|---|---|---|
| Skills: `groom`, `doc-hygiene`, `standup-post`, `weekly-recap`, `babysit-pr`, `build-order-sync`, `vercel-prune` | `skills/` (medusa-bonsai) | Move into the `ways-of-work` plugin; consumed back via marketplace |
| Vendored Stripe skills pattern | `.agents/skills/*` + symlinks | Stays as-is — vendored ≠ repo-original (spike §4) |
| Scaffolder + templates | `skills/groom/scaffold-epic.mjs` + `templates/` | Ships inside the groom skill in the plugin |
| `build-order.mjs`, `cross-review.mjs`, `cross-panel.mjs`, routine prompts, `.githooks` | `scripts/` | Template `scripts/` (portable — they read Roadmap frontmatter, not Miyagi code) |
| WAYS-OF-WORKING, LEARNINGS structure, SESSION-KICKOFFS, 00-ideas funnel + BUILD-ORDER guard | `Roadmap/` | Generalized into the template skeleton |
| CI gates (tsc + build + Playwright api; build-order-guard) | `.github/workflows/` | Template CI |
| Flag definitions + `isEnabled()` seam + `/admin/flags` | `platform_flags` (Supabase) + `lib/flags.ts` | Engine **reads** flag defs (read-only) as its feature registry seed; kill-switch home for S1.3 |
| Deploy rails: Vercel (FE), Cloud Run us-east4 pattern, Telegram notify | infra + `lib/telegram.ts` | golden-beans v1 = Next.js on Vercel + its **own** Supabase project (Pub/Sub/Redis deferred) |
| Playwright harness (api project) | `apps/miyagisanchez/e2e/` | Template e2e harness; golden-beans dogfoods it |

**Five-rule check:** engine is non-commerce and standalone — Medusa N/A, Clerk untouched, UCP N/A.
Supabase rule honored *per project* (engine gets its own project — see `db-egress-and-account-strategy`
for the account-strategy prior). Bilingual rule is Miyagi-scoped; golden-beans admin UI ships in one
language (English, internal tool) unless Daniel says otherwise.

## v1 boundary
**In:** the foundation extraction (S0) · schema-validated `POST /v1/track` → Postgres · TS SDK
(`track`, `trackAdoption`, deterministic bucketing) · feature registry with retention windows · TARS
funnel view · North Star metric + inputs + per-feature report · basic A/B variant comparison · one
real Miyagi feature instrumented behind a kill-switch.
**Out (named later epics, not creep):** flag-serving gateway + Miyagi `isEnabled()` migration ·
Pub/Sub broker + GA4/vendor fanout · `triggerSatisfaction()` micro-surveys · p99 < 5 ms SLO · Redis
cache-aside · multi-tenant auth hardening · statistical-significance engine (basic lift only in v1) ·
all PRD design/branding notes (per Daniel) · **PRD-G Modules E + F** (chaos engineering · SecOps
simulation · circuit breakers — the v2 epic, see Addendum below).

## Slicing (skateboard → car)

### S0 — dobby-foundation extraction *(epic docs: `09-platform-infra/dobby-foundation/` here)*
| Story | Ships | Risk |
|---|---|---|
| S0.1 As Daniel I want a `dobby-foundation` repo with a marketplace + `ways-of-work` plugin (skills moved in), so skills version once. Acceptance: `/plugin marketplace add` + `/plugin install` succeed in a scratch project; groom triggers. | marketplace + plugin | LOW |
| S0.2 As Daniel I want medusa-bonsai consuming the plugin (in-repo copies retired), so there's one source. Acceptance: a groom run here behaves identically post-switch. | consumption switch | LOW — **shared surface, announce** |
| S0.3 As Daniel I want a project template (Roadmap skeleton, generalized WAYS-OF-WORKING, AGENTS skeleton, CI, scripts, e2e harness), so new projects start operational. Acceptance: template contains no Miyagi-specific rule. | `template/` | LOW |
| S0.4 As Daniel I want `golden-beans` spawned from the template under `~/dobby/`, so the engine builds inside the system. Acceptance: groom + `build-order.mjs` + CI gate run green in the fresh repo. | the new repo | LOW |

### S1 — skateboard: events flow end-to-end *(this + later sprints: golden-beans' own Roadmap)*
| Story | Ships | Risk |
|---|---|---|
| S1.1 As a builder I want `POST /v1/track` rejecting malformed events (projectId/userId/event; featureId optional) and persisting to Postgres, so funnels stay accurate. Acceptance: bad payload → 4xx; good → row queryable. **Forward-compat (PRD-G):** the event schema carries an extensible `tags`/`metadata` object from day one, so v2 friction/chaos tagging (F2) needs no migration. | ingest + store (own Supabase) | LOW |
| S1.2 As an app builder I want a TS SDK (`track`, `trackAdoption(featureKey)`) auto-appending context, so integration is minutes. Acceptance: fresh Next.js app fires an event with ≤5 lines. **Forward-compat (PRD-G):** any SDK resolve/config call returns an extensible **payload envelope** (not a bare boolean), so v2 fault injection (`delay_ms`, `force_error_code`) is additive, never a breaking SDK change. | SDK package | LOW |
| S1.3 As a PM I want one real Miyagi feature instrumented behind `growth.telemetry_enabled` (enablement, default **OFF**, in `platform_flags`), so real traffic proves the loop with an instant off-switch. Acceptance: flag ON → events land; OFF → zero calls. | first consumer | LOW — **touches marketplace FE, additive, announce** |

### S2 — TARS funnel v1
Feature registry (key · target rule · retention window; seeded read-only from `platform_flags` defs) ·
aggregation (Targeted denominator, Adopted = first event, Retained = repeat inside window) · funnel
page for the S1.3 feature. All LOW.

### S3 — North Star engine v1
Define metric + leading inputs · link feature→input · per-feature input-impact report over time. LOW.

### S4 — A/B v1
Deterministic hash bucketing in the SDK (same user → same variant, no lookup) · exposure events ·
side-by-side variant comparison (basic lift; significance = later epic). LOW.
**Forward-compat (PRD-G):** variant resolution returns the S1.2 payload envelope; targeting rules
stored as data (cohort %, region) — v2 chaos scenarios (E2 blast radius) reuse this rules shape.

## Addendum — PRD-G: Bottom-line optimization (chaos + SecOps) — deferred to v2 (Daniel, 2026-07-03)
PRD addendum at `../1. raw/golden-beans-prd-g-chaos.md` (Modules E + F). **Decision: v1 (S0–S4)
unchanged except the three forward-compat constraints marked above; PRD-G grooms as its own epic in
golden-beans' Roadmap after S4.** Why deferral is structural, not preference:
- **Dependencies point one way.** E3's target-vs-control post-mortems need S2 (TARS) + S4
  (bucketing); E1/E2 need the payload-resolving SDK seam + targeting rules S1/S4 lay down.
- **F3 circuit breakers need the engine to *write* flags** — v1 flags live in Miyagi's
  `platform_flags` (telemetry-first decision). Sequencing for v2: **E (chaos) → flag-serving
  migration epic → F3 circuit breakers.** F3 is now the strongest motivation for that migration.
- **Risk callouts for the v2 grooming (recorded now so they're not rediscovered):** F3 auto-toggling
  flags like `checkout.stripe_enabled` is money-path-adjacent → **HIGH**, Daniel merges, needs its
  own kill-switch + an allow-list of breaker-eligible flags (money/auth flags likely excluded or
  human-confirmed). F1 attack simulations (credential stuffing, rate abuse) against live surfaces
  touch **Clerk (third-party ToS)** and real buyers → v2 must decide staging-vs-prod + blast-radius
  policy before any simulation runs; client-side-SDK-level injection first (per Daniel's note),
  deep backend fault injection later still.

**Sequencing:** S0 strictly first (golden-beans must be spawned *from* the template — dogfood or the
foundation is fiction). Then S1→S4 linear. Kill-switch decided here per Stage 6b: `growth.telemetry_enabled`.

## QA / smoke
Per story: one Playwright api spec in the owning repo (golden-beans inherits the harness via S0.3 —
its gate must be green from S1 on). Sprint-end smoke walkthroughs per Stage 8b. Owed to Daniel by
name: S0 plugin-install smoke in a fresh session · S1.3 flag-flip + live-event smoke ·
S2 funnel-renders-real-data smoke.

## Open risks
- **Plugin-move regression:** groom is used daily; S0.2 must diff behavior before retiring in-repo
  copies (keep one revert-able commit).
- **New infra cost:** a second Supabase project (likely free tier) + a Vercel project — surfaced to
  Daniel before provisioning, per house rule on paid infra.
- **Targeted denominator honesty:** with flags served by Miyagi (not the engine), "Targeted" in v1 is
  registry-declared, not gateway-observed. Acceptable for v1; noted so the funnel isn't oversold.
- **Marketplace/plugin API drift:** research-preview-era surface; S0.1 re-verifies the docs at build time.

## Definition of Ready
- [x] Mirror-back confirmed; 4 forks decided by Daniel (2026-07-03).
- [x] Stage-2.5 buckets named; overlaps (in-house flags · GTM · skills-spike trigger) cited.
- [x] Reuse list produced; five-rule check done; research cited (plugin marketplaces).
- [x] v1 in/out boundary written; kill-switch named (`growth.telemetry_enabled`, enablement, OFF).
- [x] Stories risk-tiered (all LOW; two shared-surface announcements); QA stage + smoke owners named.
- [ ] **Daniel approves this doc** → scaffold `09-platform-infra/dobby-foundation/` here + hold the
      engine epic scaffold until golden-beans exists (S0.4), then scaffold it there; emit kickoffs.
