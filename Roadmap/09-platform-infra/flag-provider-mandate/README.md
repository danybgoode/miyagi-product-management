---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: flag-provider-mandate
build_order: 5
---

# Epic: Golden Frijoles is the flag provider — the mandate, the preflight, the onboarding

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/flag-provider-mandate.md`](../../00-ideas/seeds/flag-provider-mandate.md)
> **Appetite:** M (one wave — architect session + builder fan-out + one review round) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)

> ⛔ **Blocked on** [`golden-beans` → `golden-frijoles-cli`](../../../../golden-beans/Roadmap/02-commercial/golden-frijoles-cli/README.md)
> **reaching Sprint 2.** This epic's onboarding prints `npx @golden-frijoles/cli init` and its
> preflight names CLI commands. **Gate the merge on the CLI's Sprint 2, not its Sprint 1** — a mandate
> that prints a command which doesn't exist is worse than no mandate.
> Plugin/template code lands in `dobby-foundation`; Sprint 2 lands here.

## Why

Three providers, one system, today:

- **`medusa-bonsai`** runs an in-house Supabase `platform_flags` table (`lib/flags.ts` plus a backend
  twin, epic `09/feature-flags-inhouse`) — **and still carries `scripts/flags.mjs`, a Flagsmith
  Admin-API wrapper for a provider we left months ago**, plus `flag-provider-mode.ts` /
  `parseFlagCutoverManifest` cutover machinery.
- **`golden-beans`** ships a real control plane: the OpenFeature-shaped `createFlagProvider`,
  `createFlagDefinitionSyncClient`, `/api/v1/flags/{admin,snapshot,sync}`, a visual rule builder,
  rollout visualization, plain-language version diff, an audit trail, and three separated credential
  types.
- **`dobby-foundation`** — `groom` Stage 6b tells every consuming project to extend **`lib/flags.ts`
  `DEFAULT_FLAGS`**. That is *medusa's in-house shape*, hardcoded into the supposedly
  project-agnostic planning skill. `check-plugin-leaks.mjs` doesn't catch it because the filename is
  generic. **The template leaks one consumer's flag architecture into every future one.**

Every `risk: high` epic in this operating system must answer the kill-switch question, and the answer
names a flag mechanism. Today that mechanism is whatever the project happened to build.

After this epic, a project spawned from `dobby-foundation` **cannot reach a merged kill-switch story
without a real Golden Frijoles project**, and the path to having one is a single command the agent
prints.

## The plan model — decided 2026-09-16

Copy Flagsmith's shape. It is a proven flags business model and maps cleanly onto what Golden
Frijoles already meters.

| Tier | Price | Evaluations / mo | Projects | Seats | Flags · Envs · Segments |
|---|---|---|---|---|---|
| **Free** | $0 | 50,000 | 1 | 1 | **Unlimited** |
| **Start-Up** | $45/mo | 1,000,000 | Unlimited | 3 | Unlimited |
| **Scale-Up** | $300/mo | 5,000,000+ | Unlimited | 5 (+15 @ $50) | Unlimited |

**Unlimited flags and unlimited environments on the free tier is what makes this mandate
enforceable** — a project creates every kill-switch it needs without paying. The metered axis is
*evaluations*, and the SDK's background-snapshot design consumes them at refresh rate, not per request.

> ⚠️ **NOT ENFORCED, DELIBERATELY.** Every account gets everything, unlimited. We are the only users
> and every account is one of the product owner's own disposable accounts. This table is the *written
> definition* the mandate references. **Metering, plan assignment and enforcement is a separate,
> later `golden-beans` epic** — building it now would be building billing for a user base of one.

## Platform-first note

**Almost nothing here is new.** The reframe cut this epic roughly in half:

- The SDK, the control plane and the credential model **all ship**.
- **`flag-provider-mode.ts` + `parseFlagCutoverManifest` already exist in `medusa-bonsai`** — a
  dual-read cutover primitive written for exactly this kind of migration. Sprint 2 uses it; it does
  not invent one.
- `lib/flags-cache.ts`'s fail-open + 60s in-process cache doctrine means the behaviour contract of a
  flag provider is **already understood in this repo** — Golden Frijoles' provider does the same thing.
- What is genuinely new: **one preflight check**, a rewritten `groom` Stage 6b, one `check-plugin-leaks`
  rule, and the onboarding prompt.

**Data ownership:** flags move from medusa's owned `platform_flags` table to Golden Frijoles. That is
a deliberate ownership transfer, executed expand/contract, not a second store.

## What already exists (reuse, don't rebuild)

- `@golden-frijoles/sdk` — `createFlagProvider`, `createFlagDefinitionSyncClient`, `parseFlagSnapshot`,
  `explainFlagEvaluation`, the `MAX_FLAG_*` limits.
- `golden-beans/apps/web/lib/credential-inventory.ts` — the three-key model, already tested.
- `medusa-bonsai/apps/*/lib/flag-provider-mode.ts` + `parseFlagCutoverManifest` — **the cutover primitive.**
- `medusa-bonsai/apps/miyagisanchez/lib/flags.ts` + `apps/backend/src/lib/flags.ts` + `flags-cache.ts`
  — the outgoing implementation and its fail-open doctrine.
- `dobby-foundation/scripts/check-plugin-leaks.mjs` — the guard to extend.
- `dobby-foundation/plugins/ways-of-work/skills/groom/SKILL.md` Stage 6b — the polarity doctrine, which
  is **correct and already matches the SDK's semantics**; only the mechanism changes.
- `golden-beans/apps/web/app/install/page.tsx` — the onboarding copy to stay consistent with.

## Architecture decisions to lock before any builder starts

- **D1 — fail loud at init, fail SOFT at runtime.** The preflight fails hard when a project has no
  Golden Frijoles credentials. But a *transient* outage must never break a build, a test run or
  checkout — the provider resolves synchronously against a caller-supplied safe default. **Getting
  this backwards breaks every consuming project's CI**, and it is the single most important line in
  the epic.
- **D2 — Edge-runtime constraints of `createFlagProvider`, verified against the actual package.**
  `groom` Stage 6b already warns SDKs are often not Edge-compatible, and medusa's `middleware.ts`
  opts into the Node runtime specifically to read a flag. Write the verified answer into the template.
- **D3 — the cutover shape:** dual-read both providers behind `flag-provider-mode.ts`, verify parity
  on real traffic, then contract. **Never a big-bang switch** — these flags gate checkout.
- **D4 — catalog import vs. per-flag creation** for medusa's ~28 existing flags. Per-flag manual
  creation is an appetite trap; `gf flags sync` with a generated catalog is the expected answer.
  Locked against the actual flag rows, read live, not against the migration files.
- **D5 — credential placement:** `gf init` writes **only** `flag_read` to `.env.local`. `flag_sync` is
  an operator/deploy credential and lives in CI secrets. Never both in one place.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 `groom` Stage 6b rewritten to the Golden Frijoles contract | low |
| 1 | 1.2 `scripts/preflight.mjs` — the mandate becomes checkable | high |
| 1 | 1.3 `check-plugin-leaks.mjs` gains a flag-mechanism rule | low |
| 1 | 1.4 Agent-guided onboarding in the plugin's install path | low |
| 1 | 1.5 `template/AGENTS.md` gains the cannot-be-violated rule + the plan table | low |
| 1 | 1.6 Template SDK wiring | high |
| 2 | 2.1 Generate and sync medusa's flag catalog into Golden Frijoles | high |
| 2 | 2.2 Dual-read behind `flag-provider-mode.ts`, parity verified on real traffic | high |
| 2 | 2.3 Contract — Golden Frijoles is the only reader; delete `scripts/flags.mjs` | high |

## Deploy order

**Backend-first, and the cutover is the whole risk.** Medusa's flags gate checkout in two apps that
read the same rows, so a single flip governs both — which is a strength during dual-read and a
single point of failure during contraction.

1. Sprint 1 ships plugin/template config and docs only. No runtime change in any consuming app.
2. Sprint 2.1 **writes** the catalog into Golden Frijoles without any app reading it — dark.
3. Sprint 2.2 enables dual-read behind `platform.golden_frijoles_flags_enabled` (created **DISABLED**
   in every env, in the **outgoing** provider — see the kill-switch note). Parity is verified on real
   traffic before the flip.
4. Sprint 2.3 contracts only after parity holds. `scripts/flags.mjs` is deleted in the same PR.

Branches stack: `feat/flag-provider-mandate` → `-s2`. **Sprint 2 does not start until the CLI epic's
Sprint 2 has shipped.**

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (planned at grooming — Stage 6b):** `platform.golden_frijoles_flags_enabled` exists
      **in the OUTGOING provider** (`platform_flags`) — not in Golden Frijoles, or the switch gates
      itself — created **DISABLED in every env** (enablement polarity), gating
      `flag-provider-mode.ts`'s existing resolver. The plugin/template stories are a **carve-out**:
      config + docs, git is the rollback.
- [ ] **`scripts/flags.mjs` is deleted** — the Flagsmith wrapper for a provider we left months ago.
- [ ] A **Golden Frijoles outage does not break** a build, a test run, or checkout — proven by a test,
      not asserted.
- [ ] Feature branches deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
