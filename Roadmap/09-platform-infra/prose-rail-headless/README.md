---
status: shipped
slug: prose-rail-headless
---

# Epic: A third prose writer, and the worktree bug that swallowed reports

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Follows:** [`exec-prose-rail`](../exec-prose-rail/README.md)

## Why

The merge report is **hit and miss**. The log says why — two causes, both structural rather than
flaky, and neither fixed by retrying harder.

**1. devin refuses, and two writers is one bad day from no report.** The log shows
`Permission denied: We're currently facing high demand for this model` on **6 of 25** runs. The
devin → agy fallback already handles this correctly and has been observed carrying a report devin
refused (`posted 28225f6 (agy, guard clean)`) — so the rail is not broken. But agy shares its quota
with the cross-family review layer, which has **already gone fully dark mid-epic** when codex and
agy were capped in the same session. Two pools is thin cover for a surface Daniel reads as status.

**2. The hook could not run in a worktree at all.** `.githooks/post-merge` redirected to
`"$root/.git/merge-report.log"`, but in a linked worktree `.git` is a **file**, so the redirect died
with `Not a directory` before the script was ever reached — silently, because the whole thing is
backgrounded and `|| true`-ed. `merge-report.mjs` carried the same bug in its state-file path. This
repo runs five worktrees at a time, and **all three repos ship the identical buggy hook**, so this
is a large share of the reports that never appeared.

## Rejected: moving the rail to GitHub Actions

Worth recording, because the premise looked solid and is wrong. Actions quota is genuinely no longer
a constraint — this repo went public on 2026-07-18 and public repos do not meter standard-runner
minutes — so a push-to-main workflow would fix the "a hook only fires on the machine that pulls" gap.

**But every writer in the roster is an interactive CLI with no headless auth.** devin, agy and codex
all require a human login; none authenticates from a runner. The only way to write prose in CI is a
paid hosted API key, and **the entire point of this rail is to use the cheap/free model CLIs we
already pay for** (Daniel, 2026-07-28). A workflow would therefore skip on every merge.

So the rail stays local, the hook stays the trigger, and the worktree bug above is what actually
buys back the missing reports. **The pull-dependency gap remains open and is accepted** — it is the
cost of a CLI-only roster, and it should be re-opened only if a free headless writer appears.

## Medusa-first note

**N/A — zero commerce surface.** AGENTS rules 1–4 untouched. Rule 5 (es-MX): N/A — internal English
reports to one reader. Touch surface: `scripts/lib/prose-writer.mjs`, `scripts/merge-report.mjs`,
`.githooks/post-{merge,checkout}` in **all three repos**. No app code, no migration, no flag.

## What already exists (reuse, don't rebuild)

| Asset | Reuse as |
|---|---|
| `tryCodex` (`cross-agent-cli.mjs`) | Already the structured, never-dies codex runner — it separates an auth lapse and a stale CLI from an ordinary failure, which is the whole reason to use it over `runCodex` |
| `planWriters` / `writeProse` | Already an ordered list plus injected runners — a third writer is an array entry, not a refactor |
| `prose-guard.mjs`, `cpo-persona.md`, `prose-lessons.md` | Untouched and shared — a lesson learned on any writer protects all three |
| `merge-report.mjs` gather/diff/state/send | Correct and unchanged; only the state path moves |

---

## Architect's locked decisions (D1–D4)

### D1 · codex is the third writer, and it goes LAST

Roster: **devin → agy → codex**. devin leads as the dedicated prose writer; agy's `gpt-oss-120b-medium`
follows on a separate pool; codex is the last resort.

codex is last **because it is the primary code reviewer**. The review layer's quota is the scarce
resource in this repo, and prose should only draw on it once both dedicated writers have failed —
which the log says does happen, so a third independent pool is the difference between a late report
and no report. Availability is plain `hasCmd('codex')`, same as the other two.

### D2 · The prompt rides STDIN, not argv

`execCodex(prompt, stdin)` puts `prompt` in **argv** — the exact cap that already bites agy, whose
`draftWithAgy` refuses oversized prompts non-retryably for this reason. A prose prompt carries the
persona, the accumulated lessons *and* a full evidence pack, so it is precisely the payload that
overflows argv. codex is designed to take its context on stdin, so the body goes there and argv
carries only a short constant directive. No cap to hit, and nothing to guard.

### D3 · An auth lapse and a stale CLI are NON-retryable

`tryCodex` distinguishes three failure classes and they must not be collapsed:

- **auth lapsed** → codex cannot run here; a second identical attempt cannot log it in. Fail fast and
  name `codex login`.
- **CLI too old for its model** → same shape; name `node scripts/codex-doctor.mjs`.
- **anything else** (a cap, a transient empty response) → retryable, gets the one retry the rail
  already gives.

Retrying the first two is pure latency spent on the **last** writer in the chain, which is the worst
possible place to spend it. And **exit 0 with whitespace-only stdout is a failure**, not an empty
success — trim before testing, or the guard is handed `""` to approve.

### D4 · The hook stays; the bug in it does not

The trigger remains `.githooks/post-{merge,checkout}`, now resolving its log path via
`git rev-parse --git-common-dir` rather than `"$root/.git"`. Sharing one state file across a clone's
worktrees is **correct**: it is what keeps the once-per-commit guarantee honest, so checking the same
merge out in a second worktree cannot re-report it.

**All three repos need this** — root, storefront and backend ship byte-identical hooks, and the app
repos borrow the root's `scripts/`. Separate repos mean separate PRs (AGENTS rule 1).

## Risk tier

**LOW** — internal tooling, no app code, no commerce/auth/money surface, no migration, no flag. The
epic's own output is a channel Daniel treats as status, so a *wrong* report is the real risk, which
is what the unchanged shared guard is for.

## Definition of Done (epic)

- [x] `draftWithCodex` wired into `planWriters`/`writeProse` as the third, last writer.
- [x] Specs for the new seam; **every one observed red** via a break-the-implementation mutation.
- [x] The `.git`-is-a-file bug fixed in this repo's hooks and in `merge-report.mjs`'s state path.
- [x] The same hook fix landed in `miyagisanchezcommerce` (#323) and `backend` (#122).
- [x] `RETROSPECTIVE.md`; poster + `LEARNINGS.md` updated; memory + `MEMORY.md` index.
- [ ] A merge observed reporting from a worktree checkout, where it previously died silently.
