---
title: "Delivery-rail hardening — exec prose, QA guardrails, pipeline throughput, credentialed smoke, session continuity"
slug: delivery-rail-hardening
status: scaffolded
area: "09"
type: chore
priority: null
risk: low
epic: "09-platform-infra/exec-prose-rail"
build_order: null
updated: 2026-07-26
---

# Seed — the delivery rail, hardened (five epics from one audit)

**Captured from:** `references/audit.md` (external Testing & QA maturity audit, 2026-07-24) plus two
asks Daniel raised in the same session (executive prose for the scheduled reports; orchestrator
session-continuity). Groomed 2026-07-26, epic-mode, **all five authorized in one run**.

This seed exists to record **what the audit got right, what it got wrong, and what we declined** —
so the next agent doesn't re-litigate a decided question or trust a premise we already disproved.

---

## The audit's premises, checked against live code (2026-07-26)

The audit was explicit that it read configs and test files but **did not execute the suites**. Running
them changes three of its conclusions. Verified rather than assumed:

| Audit claim | Verified today | Verdict |
|---|---|---|
| Frontend lint never runs in CI | `ci.yml` = `tsc` → `next build` → Playwright; no lint in any of 4 workflows | ✅ Confirmed |
| Backend has no ESLint/Prettier config at all | Nothing. Not disabled — absent | ✅ Confirmed |
| `test:integration:http` "passes" by finding zero tests | `integration-tests/` holds only `setup.js` | ✅ Confirmed |
| `test:integration:modules` duplicates the unit suite | Same glob, same files | ✅ Confirmed |
| Turborepo does nothing in CI/deploy | The only `turbo` string in either app is `next dev --turbopack` | ✅ Confirmed |
| **"Wire lint into CI — one line, the cheapest fix in this audit"** | **`npm run lint` FAILS: 481 problems, 243 errors** | ❌ **Wrong — see D-B1** |
| ~75 files carry `owed to Daniel` | **71 files / 76 occurrences** | 🔸 Drifted |
| 293 api specs + 37 browser specs | **323 spec files, 38 browser** | 🔸 Drifted in 2 days |
| Duplicate domain types between repos | **34 exported type names identical in both trees** | ✅ Confirmed, quantified |

**The `owed`/spec-count drift is itself the argument for epic B's story 3** — a hand-counted number in
a doc is stale within days. Generate it or don't cite it.

---

## Decisions that bind all five epics

**D-0 · Pre-launch ceremony is right-sized, in writing.** Zero real tenants, zero campaigns, zero
transactions. Smoke walkthroughs presupposing live operations are descoped and **named in each
retrospective**, never quietly dropped. Every deterministic gate still runs in full.

**D-1 · Two prose backends, one shared guard — Daniel's call, 2026-07-26.** The scheduled reports
(daily standup, weekly recap) are written by **the Claude Routine's own model, in-context**. Every
other prose surface (retro, poster entry, sprint-wrap) is written by **devin → agy locally**, exactly
as golden-beans does.

*Why the split is not arbitrary:* a Claude Routine runs on Anthropic-managed infra as Daniel, with no
local CLI credentials. `devin`/`agy` have **no headless auth** — the same blocker that forced
`cross-agent-review-always` to be local-only. A straight port of golden-beans' rail onto the routines
would produce **zero prose on the two surfaces it was built for, silently**. Meanwhile the local
surfaces already have paid-for devin/agy quota sitting idle, and spending routine capacity on them
would be waste. Verified present on this machine 2026-07-26: `devin 3000.2.17`, `agy 1.1.7`,
`codex-cli 0.144.6`.

**The guard, the persona, and the lessons file are shared by both backends** — one set of defences,
so a correction improves every surface at once.

**D-2 · The review model is unpinned and unrecorded — fix the record, not the model.**
`CODEX_MODEL` defaults to `null`, so `cross-review.mjs` inherits `~/.codex/config.toml`. Live probe
2026-07-26: `model: gpt-5.6-terra`, `reasoning effort: high` — which is exactly the intended tier, so
**no model change is needed**. But it is machine-local state that no PR comment records: if the config
drifts, review strength changes family and nothing notices. Epic B makes the cross-review comment name
the model that actually ran. *(Not Sol — that is frontier tier and deliberately not our reviewer.)*

**D-3 · Model routing for this run.** Per WAYS-OF-WORKING *Epic-mode builds*: the sprint that defines
a contract others import goes to the stronger model; mechanical work over a locked contract goes to
the faster one. Review is inverted. Stated per-epic in each README so the choice is auditable.

---

## What we DECLINED, with reasons (do not re-open without new evidence)

**Nx — declined.** Its value is enforced module boundaries and distributed task execution across many
internal packages. We have two apps and no package boundary to enforce. Its opinions would fight the
hand-rolled npm tooling (cross-review, doc-hygiene, risk-tiered merge gates) that the whole process
rests on. Cost is real, benefit is speculative.

**Merging the three repos into one — declined, and the audit agrees.** Deploy isolation is
deliberate and correct: a broken frontend PR must not block a backend deploy. Cloud Build triggers are
scoped per-repo. Nothing here is worth surrendering that.

**Turborepo-in-CI — declined, and here we depart from the audit.** The audit recommends extending
turbo into each app's own CI for "incremental caching." Each app repo's CI builds **exactly one
package**; turbo's remote cache pays off across a task graph, which we do not have in CI. It would add
config surface and a cache-restore step to cache a build that Cloud Build already caches at the Docker
layer. The audit's own *specific* findings — Playwright sharding and a BuildKit cache mount — are the
real throughput wins and need **no workspace tool at all**. That is epic C. Turborepo stays what it is
today: a local-DX convenience, which is a legitimate thing to be.

**Shared `@dtc/types` package — deferred to its own seed, not built here.** The drift is real and now
quantified (34 types). But a shared package across two independently-deployed git repos needs a
publishing/versioning rail, and that is a launch-blocker-shaped lift for a pre-launch correctness
nicety. Captured as `00-ideas/seeds/shared-domain-types.md`. Revisit when a type mismatch actually
causes a defect, or right after launch.

**Mutation testing / Gherkin — remain declined** (2026-07-12, on the record). The audit correctly
identified these as informed trade-offs with a stated revisit condition, not unknown gaps. The
revisit condition ("if the observed-red line proves insufficient") has not fired.

---

## The five epics

| Epic | What it closes | Risk | Sprints |
|---|---|---|---|
| [`exec-prose-rail`](../../09-platform-infra/exec-prose-rail/) | Reports read as engineering output, not product writing | LOW | 3 |
| [`qa-guardrail-hardening`](../../09-platform-infra/qa-guardrail-hardening/) | Audit items 5–7, 9 + the ladder's automatic-security-review gap | LOW | 4 |
| [`pipeline-throughput`](../../09-platform-infra/pipeline-throughput/) | Audit's two real deploy-latency findings | LOW | 2 |
| [`credentialed-browser-smoke`](../../09-platform-infra/credentialed-browser-smoke/) | The benchmark's #1 named step-2 guardrail gap | MED | 1 |
| [`session-continuity`](../../09-platform-infra/session-continuity/) | Orchestrator death loses in-flight intent | LOW | 1 |

## Ladder movement (`ai-adoption-maturity-benchmark.md` Part A)

- **Move 1 (credentialed browser smoke)** → epic D wires it; **terminates on Daniel** creating dev-instance
  test accounts. D makes the remaining gap *visible and counted* rather than silent, which is the part a
  script can own.
- **Move 2 (automatic security review)** → epic B S4, as a **lens on the existing mandatory cross-review
  rail** rather than a new tool. The seed said "research first: existing product, or a `scripts/` addition
  alongside `cross-review.mjs`?" — answered: alongside, because the rail is already mandatory on every PR,
  so a lens inherits that enforcement for free.
- **Move 3 (proactive monitor)** → **not in this run.** Named here so it is not forgotten.
- **Move 4 (token/cost telemetry)** → **not in this run**; the audit notes golden-beans may already cover it.
  Verify there before building anything here.
