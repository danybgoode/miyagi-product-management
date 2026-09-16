---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: plugin-audit-and-extraction
build_order: 4
---

# Epic: Plugin audit + medusa extraction — pay the dark-skill debt, port what's stranded

> **Area:** 09-platform-infra · **Risk:** low · **Class:** Chore · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/plugin-audit-and-extraction.md`](../../00-ideas/seeds/plugin-audit-and-extraction.md)
> **Appetite:** L (multi-wave — one wave per sprint, re-bet at each boundary) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)

> ⛔ **Stacks on** [`ways-of-work-lean-pass`](../ways-of-work-lean-pass/README.md). That epic *decides*
> what the docs and the review policy say; this one *executes* the inventory against the decision.
> Both edit `SKILL.md` files and `template/` — **stack (`feat/…` off the lean pass's branch), don't
> parallel.** Code lands in `dobby-foundation`.

## Why

**The plugin advertises ten skills and four of them are decoration.** `check-skill-scripts.mjs`'s
`KNOWN_ABSENT` ledger is admirably honest and the news is bad: `pmo-report`, `standup-post`,
`weekly-recap` and `live-smoke` have **never had a script anywhere** — not in `template/`, not in any
consuming project. A new project spawned from this template installs ten skills and four fail on
first use. The ledger says it plainly: *"They are dark, not working — porting them is outstanding
work, not a documentation problem to reword away."* It has said that since **2026-08-06**.

**Meanwhile real practice is trapped in one repo.** `medusa-bonsai` has 71 scripts; `template/` has
19, and the gap includes things the plugin's own doctrine *depends on* — most of all
`scripts/routines/`, seven committed routine prompts that are the Step-3 "routines and loops" rail
from `references/Steps-of-AI-Adoption.md`, already written and proven, against which the template
offers a single stub.

After this epic, every skill the marketplace advertises actually runs in a freshly spawned project,
and the practices that make `medusa-bonsai` mature reach `golden-beans` and the next project without
anyone copying a file.

## Platform-first note

**This is a move-and-generalize epic, not a build epic.** The one genuinely new design is the
**config seam** for the reporting family — and that seam is precisely why the debt has stood for six
weeks, so it gets an architect pass rather than being treated as an afternoon.

`check-skill-scripts.mjs` already **is** the work list: transitive dependency closures were resolved
on 2026-08-06 and recorded per skill. **Verify it; don't re-derive it.** The ledger's own header
records that an earlier version of itself *undercounted* badly (it said `pmo-report` needed "four
helpers"; the real answer is 14 files) — *"a debt ledger that understates the debt is worse than no
ledger — it makes the remaining work look like an afternoon and gets scheduled as one."*

## What already exists (reuse, don't rebuild)

- `dobby-foundation/scripts/check-skill-scripts.mjs` + `KNOWN_ABSENT` — **the work list, with counts.**
- `dobby-foundation/scripts/pack-skills.mjs` — reproducible `.skill` archives, already tested.
- `dobby-foundation/scripts/check-plugin-leaks.mjs` — the portability guard every ported script must pass.
- Every skill already ships a `config.example.json` — **the seam has a shape to follow.**
- `medusa-bonsai/scripts/routines/` — 7 prompts + README.
- `medusa-bonsai/.githooks/{pre-commit,pre-push}` — the three-stage cost budget, with its measured story.
- `medusa-bonsai/scripts/{session-note,session-resume,doc-format,owed-ledger}.mjs`.
- `medusa-bonsai/scripts/{prod-smoke,smoke-triage-scope,merge-report,vercel-env,perf-probe}.mjs` (Tier 2).
- `medusa-bonsai/scripts/README.md` — documents the existing inventory.
- `dobby-foundation/scripts/port-reviewer-roster.mjs` — a porting precedent (**and a deletion candidate
  once the lean pass has retired the roster**).

## Architecture decisions to lock before any builder starts

- **D1 — pay or delete, decided explicitly in Sprint 1.** The reporting family (`weekly-recap` +7,
  `standup-post` +11, `pmo-report` +14) shares one dependency web and `weekly-recap.mjs` is imported
  by the other two. **They port as one unit or not at all.** If the appetite says no, deleting all
  three from the marketplace is an **honest outcome, not a failure.**
- **D2 — the reporting config seam.** Telegram target, benchmark thresholds, repo list → one
  `reporting.config.json` the consuming project fills. Locked against what the three scripts actually
  read, not against what they appear to read.
- **D3 — `live-smoke`'s fate.** Its origin script lives under `apps/<app>/scripts/`, never extracted.
  Port to `template/apps/example-app/scripts/` or **drop the skill** — a browser-smoke skill with no
  script is worse than none.
- **D4 — generalize without neutering.** `smoke-triage-scope.mjs` answers *"may the nightly routine
  merge this diff by itself?"* — an autonomy boundary. Template-ising its thresholds without a
  project supplying real ones produces a routine that merges things it shouldn't. Every ported
  threshold is either required from config or fails closed.
- **D5 — the third-copy trap.** `golden-beans` has its **own** forks (`standup-report.mjs`,
  `pod-report.mjs`, `commit-report.mjs`, `report-main-daemon.mjs`). Porting medusa's versions into the
  template creates a **third** copy unless golden-beans migrates onto the ported ones in the same run.
  **This is the most likely way this epic increases duplication instead of reducing it.** Decide here.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 The debt decision — pay or delete, written down | low |
| 1 | 1.2 If paying: `weekly-recap` + its 7 deps, behind the config seam | low |
| 1 | 1.3 If paying: `standup-post` (+11) and `pmo-report` (+14) | low |
| 1 | 1.4 `live-smoke` — port or drop (D3) | low |
| 1 | 1.5 Housekeeping — stray `.DS_Store`, `roadmap-to-notion` opt-in, `example-app`'s fate | low |
| 1 | 1.6 The advertised skill list becomes generated | low |
| 2 | 2.1 Port `scripts/routines/` — the Step-3 rail | low |
| 2 | 2.2 Port the three-stage hook budget | low |
| 2 | 2.3 Port `session-note.mjs` + `session-resume.mjs` | low |
| 2 | 2.4 Port `doc-format.mjs` — the producer validates its own templates | low |
| 2 | 2.5 Port `owed-ledger.mjs` | low |
| 3 | 3.1 Tier 2 behind a config seam — `prod-smoke`, `smoke-triage-scope` | low |
| 3 | 3.2 Tier 2 — `merge-report` + its hooks, `vercel-env`, `perf-probe` | low |
| 3 | 3.3 Migrate `golden-beans` onto the ported scripts (D5) | low |

## Deploy order

**No runtime deploy.** Plugin and template content, plus consuming-repo migrations.

- **Sprint 3 is the first thing to drop** if the appetite runs out. Sprints 1 and 2 carry the epic.
- Stories that change a consuming project's git hooks touch **shared surface** — announce them, per
  the Chore class rule, before merging.
- `D5`'s golden-beans migration (3.3) must land in the **same wave** as the ports it consumes, or the
  third copy exists in the interim and someone builds on it.

Branches stack: `feat/plugin-audit-and-extraction` → `-s2` → `-s3`, cut from the lean pass's final branch.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch: carve-out (risk: low).** Plugin/template content; git is the rollback.
- [ ] **`KNOWN_ABSENT` is empty**, or the skills it named are no longer advertised. **No skill ships
      dark** — an advertised skill that cannot run is the same failure as a review layer that reads
      clean while being absent.
- [ ] **No third copy exists** — golden-beans runs the ported scripts, not its own forks (D5).
- [ ] Feature branches deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
