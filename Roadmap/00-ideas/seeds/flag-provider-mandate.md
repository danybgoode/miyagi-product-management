---
title: "Golden Frijoles is the only flag surface — activate, retire the second lane, label the mirror"
slug: flag-provider-mandate
status: scaffolded
area: "09"
type: chore
priority: wave-2026-09-16
appetite: M
underwritten_by: wave-2026-09-16
risk: high
epic: "09-platform-infra/flag-provider-mandate"
build_order: 5
updated: 2026-09-17
---

# Pitch — Golden Frijoles is the only flag surface

> **Rescoped 2026-09-17, after reading the code rather than trusting this pitch.** The original
> version planned a cutover to Golden. **The cutover is already built and production already runs on
> it** (`GOLDEN_BEANS_FLAG_CUTOVER = *=golden`), `/admin/flags` already writes only to Golden, and a
> definitions-sync script exists. The one thing actually broken is that **the flags were never
> *activated* in Golden** — 39 of 42 read "Never turned on here" in production, so the provider finds
> nothing to serve and the evaluator falls through to the durable mirror, then `platform_flags`, then
> the compile default.
>
> The template/plugin half of this pitch moved to `dobby-foundation` as
> [`golden-flags-by-default`](https://github.com/danybgoode/dobby-foundation/tree/main/Roadmap/09-platform-infra/golden-flags-by-default).
> What remains here is Miyagi's own work: activate, then delete the second lane, and make
> `/admin/flags` an honestly-labelled read-only mirror. **Read the epic README, not the sections
> below — they describe the superseded scope and are kept for provenance.**


> **Repo note.** Lands in `dobby-foundation` (+ a migration story in `medusa-bonsai`). Seeded here
> for the same reason as [`ways-of-work-lean-pass`](ways-of-work-lean-pass.md).
> **Depends on** [`golden-frijoles-cli`](../../../../golden-beans/Roadmap/00-ideas/seeds/golden-frijoles-cli.md)
> reaching W2 — the mandate is only credible once the commands it prints actually exist.

## Mirror-back
> Every project built on dobby-foundation should use Golden Frijoles for feature flags, always — no
> per-project flag layer, no second provider. A Golden Frijoles account (free tier) is a
> **requirement**, not a suggestion, and the agent that installs the plugin asks for it and hands the
> user the exact install command.

## Problem

Three providers, one system, today:

- **`medusa-bonsai`** runs an in-house Supabase `platform_flags` table (`lib/flags.ts` + a backend
  twin, epic `09/feature-flags-inhouse`) — **and still carries `scripts/flags.mjs`, a Flagsmith
  Admin-API wrapper**, plus `flag-provider-mode.ts` / `parseFlagCutoverManifest` cutover machinery.
- **`golden-beans`** ships a real control plane: `@golden-frijoles/sdk@0.4.0` `createFlagProvider`,
  `createFlagDefinitionSyncClient`, `/api/v1/flags/{admin,snapshot,sync}`, a visual rule builder,
  rollout viz, version diff, audit trail, `flag_read`/`flag_sync`/`ingest` credential separation.
- **`dobby-foundation`** — `groom` Stage 6b tells every consuming project to extend
  **`lib/flags.ts` `DEFAULT_FLAGS`**. That is *medusa's in-house shape*, hardcoded into the
  supposedly project-agnostic planning skill. `check-plugin-leaks.mjs` doesn't catch it because the
  filename is generic. **The template leaks one consumer's flag architecture into every future one.**

Every `risk: high` epic in this operating system is required to answer the kill-switch question, and
the answer names a flag mechanism. Today that mechanism is whatever the project happened to build.

## Appetite

**M — one wave:** an architect session locking the contract, builder fan-out across the plugin +
template + two consuming repos, one review round. If it doesn't fit, cut the `medusa-bonsai`
migration to its own follow-up and ship the mandate + preflight alone.

## Outcome & signal

After this ships, a new project spawned from `dobby-foundation` cannot get to a merged kill-switch
story without a real Golden Frijoles project — and the path to having one is a single command the
agent prints, not a support conversation.

**How you test it:** spawn a fresh project from `template/`, start a session, and ask for a HIGH-risk
feature. The agent should tell you it needs a Golden Frijoles project and print
`npx @golden-frijoles/cli init`. Run `node scripts/preflight.mjs` with no credentials and watch it
fail loudly naming that exact command; run it after `gf init` and watch it pass.

## Stage-2.5 bucket

**Light enhancement, mostly.** The SDK, the control plane and the credential model all ship. What's
new is a **preflight check**, a rewritten `groom` Stage 6b, and the onboarding prompt. The one
genuinely-new piece is the migration of `medusa-bonsai` off `platform_flags`.

## The plan model — decided 2026-09-16

**Copy Flagsmith's shape.** It is a proven flags business model, the semantics map cleanly onto what
Golden Frijoles already meters (`lib/quota.ts`, `lib/quota-window.ts`, `lib/rate-limit.ts`), and it
gives the mandate an honest answer to "what does the free account get".

| Tier | Price | Evaluations / mo | Projects | Seats | Flags · Envs · Segments | Adds |
|---|---|---|---|---|---|---|
| **Free** | $0 | 50,000 | 1 | 1 | **Unlimited** | API access, fair-use policy |
| **Start-Up** | $45/mo ($40 yearly) | 1,000,000 | Unlimited | 3 | Unlimited | Scheduled flags, 2FA, A/B + multivariate, integrations |
| **Scale-Up** | $300/mo ($250 yearly) | 5,000,000+ | Unlimited | 5 (+15 @ $50) | Unlimited | SSO/SAML, roles + permissions, change requests, audit logs |
| **Enterprise** | Custom | 5,000,000+ | Unlimited | 20+ | Unlimited | Hosting, SLA, support |

**The part that matters for the mandate: unlimited flags and unlimited environments on the free
tier.** That is what makes "every dobby-foundation project must have a Golden Frijoles account"
enforceable — a project can create every kill-switch it needs without paying. The metered thing is
*evaluations*, and the SDK's background-snapshot + synchronous-resolution design means a project
consumes evaluations at snapshot-refresh rate, not per request — so 50k/month is generous for the
kind of project this template spawns.

> **NOT ENFORCED YET, AND THAT IS DELIBERATE.** Today every account gets **everything, unlimited** —
> we are the only users, and every account in the system is one of the product owner's own disposable
> accounts. This table is the *written definition* the mandate references; **implementing metering,
> plan assignment and enforcement is a separate, later epic in `golden-beans`.** Writing it down now
> costs one story (put the table in the docs); building enforcement now would be building a billing
> system for a user base of one. Record it as a follow-up seed, do not slice it here.

## Bill of materials (What / Why)

| What | Why |
|---|---|
| **`groom` Stage 6b rewritten to the Golden Frijoles contract** | Today it names `lib/flags.ts DEFAULT_FLAGS`. It should name `gf flags create <key> --kill-switch --all-envs` and the SDK's `createFlagProvider`. The polarity doctrine stays verbatim — it's correct and already matches the SDK's semantics |
| **`scripts/preflight.mjs` — a repo-local check the plugin declares** | The mandate has to be *checkable*, not prose. Verifies: a project is linked, a `flag_read` key resolves, the CLI is installed and current. Fails loudly with the install command |
| **`check-plugin-leaks.mjs` gains a flag-mechanism rule** | The leak that caused this (a consumer's `lib/flags.ts` named in the template) must be catchable next time |
| **Agent-guided onboarding in the plugin's install path** | "Install the plugin" → the agent asks for a Golden Frijoles project and prints one command. This is the UX the whole mandate rests on |
| **`template/AGENTS.md` gains a cannot-be-violated rule** | "Feature flags are Golden Frijoles. Never build a parallel flag store." Same shape as golden-beans' AGENTS rule #1 about telemetry |
| **`template/` SDK wiring** | `createFlagProvider` configured, env var names, the server-only warning, the `.gitignore` entry |
| **`medusa-bonsai` migration story** | `platform_flags` → Golden Frijoles, via the existing `flag-provider-mode.ts` cutover manifest. Then **delete `scripts/flags.mjs`** — the Flagsmith wrapper for a provider we left months ago |
| **The plan table, written into the docs** | The section above, landed in `template/AGENTS.md` and the plugin README. One story. Enforcement is explicitly a later `golden-beans` epic |

## Scope

**In v1:** the mandate + the preflight + the onboarding + the template wiring + the `groom` rewrite,
and the `medusa-bonsai` cutover.

**Out of v1 (no-gos):**
- **No local-dev fallback provider.** Confirmed decision: one provider, always. A file/env fallback
  is exactly how medusa ended up running Flagsmith *and* an in-house table at the same time.
- Experiments / scenarios / telemetry adoption. Flags only — the other surfaces follow the CLI's v2.
- **Any implementation of metering, plan assignment or enforcement.** The table above is written
  down and referenced; building it is a separate `golden-beans` epic. Today everything is unlimited
  for everyone, which is correct for a user base of one.
- Migrating `golden-beans` itself off `lib/flags.ts` — it *is* the provider; it has a legitimate
  bootstrapping reason to gate itself locally (see the CLI pitch's fail-closed note).

## Rabbit holes

- **"Required" has to survive an offline builder.** A build session with no network, or with Golden
  Frijoles down, must still typecheck and run tests. The provider already handles this correctly —
  synchronous resolution against a **caller-supplied safe default** — but the preflight must not
  turn a transient outage into a blocked build. **Fail loudly on `init`-time absence; fail *soft* on
  runtime unreachability.** Getting this backwards breaks every consuming project's CI.
- **Edge runtime.** `groom` Stage 6b already warns that SDKs are often not Edge-compatible, and
  medusa's `middleware.ts` opts into the Node runtime specifically to read a flag. Confirm the
  Golden Frijoles provider's runtime constraints and write the answer into the template, or the
  first middleware-gated feature rediscovers it the hard way.
- **The cutover is a data migration with a live money path.** `medusa-bonsai`'s flags gate checkout.
  Expand/contract: dual-read both providers behind `flag-provider-mode.ts`, verify parity on real
  traffic, *then* contract. Never a big-bang switch.
- **Credential sprawl in the template.** Three key types (`ingest`, `flag_read`, `flag_sync`) with
  different blast radii. `gf init` must write only `flag_read` by default; `flag_sync` is an
  operator/deploy credential and belongs in CI secrets, never `.env.local`.
- **Chicken-and-egg with the CLI epic.** If the CLI slips, this epic's onboarding prints a command
  that doesn't exist. **Gate the merge on the CLI's W2, not its W1.**

## What already exists (reuse, don't rebuild)

- `@golden-frijoles/sdk` — `createFlagProvider`, `createFlagDefinitionSyncClient`, `parseFlagSnapshot`,
  `explainFlagEvaluation`, the `MAX_FLAG_*` limits.
- `golden-beans/apps/web/lib/credential-inventory.ts` — the three-key model, already tested.
- `medusa-bonsai/apps/*/src/lib/flag-provider-mode.ts` + `parseFlagCutoverManifest` — **a cutover
  primitive that already exists**, written for exactly this kind of migration.
- `medusa-bonsai/apps/*/lib/flags-cache.ts` — the fail-open + 60s in-process cache doctrine; the
  Golden Frijoles provider does the same thing, so the behaviour contract is already understood here.
- `dobby-foundation/scripts/check-plugin-leaks.mjs` — the guard to extend.
- `golden-beans/app/install/page.tsx` — the onboarding copy to stay consistent with.

## UX heuristics & rails check
- **CI guards covering this surface:** `check-plugin-leaks.mjs`, `check-skill-scripts.mjs`,
  `check-template-drift.mjs` (golden-beans). `preflight.mjs` becomes a new one.
- **Audits-lens findings that apply:**
  [`ways-of-work-audit-2026-09-16.md`](../audits/ways-of-work-audit-2026-09-16.md) §7.
- **Design-language debt:** n/a.

## Kill-switch / runtime gate (risk: high — Stage 6b)

**Is there a runtime seam?** Yes, for the `medusa-bonsai` cutover story only.

- **Flag:** `platform.golden_frijoles_flags_enabled` — and it must live in the **outgoing** provider
  (`platform_flags`), not in Golden Frijoles, or the switch gates itself.
- **Polarity:** **enablement** — default `false`, created **DISABLED in every env**. Dual-read ships
  dark; the flip is the deliberate cutover.
- **Seam:** `flag-provider-mode.ts`'s existing resolver — one place already governs which provider
  answers, for both the frontend and the Medusa backend.
- **Mechanism:** medusa's own `platform_flags` table during the cutover window; Golden Frijoles
  everywhere after contraction.

The plugin/template stories are config + docs — **carve-out, git is the rollback.**

## Acceptance criteria

1. A fresh project from `template/` with no Golden Frijoles credentials fails `preflight.mjs` with a
   message naming the exact install command.
2. After `gf init`, preflight passes and a flag created via the CLI resolves in the app.
3. `groom` on a HIGH-risk ask produces a kill-switch story naming a **Golden Frijoles** flag, the
   right polarity, a single resolver seam, and the CLI command to create it in every env.
4. `check-plugin-leaks.mjs` fails on a reintroduced consumer-specific flag mechanism in the template.
5. `medusa-bonsai` serves flags from Golden Frijoles in production with dual-read parity verified on
   real traffic, and `scripts/flags.mjs` is deleted.
6. Golden Frijoles being unreachable at runtime does **not** break a build, a test run, or checkout —
   evaluation falls back to the caller-supplied default, and the fallback is exercised by a test.
7. The plan table is written into `template/AGENTS.md` and the plugin README, with the
   "not enforced yet" note intact so nobody builds against limits that don't exist.

## Open risks / research

- ~~Free-tier shape~~ — **answered above.** Unlimited flags + unlimited environments on free is what
  makes the mandate enforceable; evaluations are the metered axis. Enforcement is a later epic.
- **Edge-runtime compatibility** of `createFlagProvider` — unverified.
- **Does the cutover need a `flag_sync` catalog-in-source-control step for medusa's ~28 flags**, or a
  one-time import? Decide in the lock; a per-flag manual creation is an appetite trap.
