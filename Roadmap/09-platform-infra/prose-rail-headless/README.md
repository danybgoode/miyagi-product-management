---
status: in-progress
slug: prose-rail-headless
---

# Epic: A headless writer for the prose rail — get the merge report off the git hook

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Follows:** [`exec-prose-rail`](../exec-prose-rail/README.md)

## Why

The merge report is **hit and miss**, and the log says why. Two causes, both structural rather than
flaky, and neither fixed by retrying harder:

1. **A git hook only fires on the machine that PULLS.** `.githooks/post-merge` drives
   `merge-report.mjs` locally. A squash-merge on GitHub that nobody pulled is never reported at
   all. The evidence is the log itself: 25 entries in the root repo against **4** in the storefront
   — and the storefront is the repo that actually deploys.
2. **The hook could not even run in a worktree.** It redirected to `"$root/.git/merge-report.log"`,
   but in a linked worktree `.git` is a **file**, so the redirect died with `Not a directory` before
   the script was reached — silently, because the whole thing is backgrounded. This repo runs five
   worktrees at a time. `merge-report.mjs` carried the same bug in its state-file path.
3. **The writers had no headless path.** `writeProse` shells out to devin → agy, neither of which
   authenticates without a human, so the report could not move to CI even in principle. Separately,
   devin is the flakiest link locally: `Permission denied: We're currently facing high demand for
   this model` on 6 of the last 25 runs.

The blocker was never Actions quota. That claim is stale twice over — the hook comment asserts the
notifier is "out of hosted-minutes quota", but this repo went **public on 2026-07-18** and public
repos do not meter standard-runner minutes.

## Medusa-first note

**N/A — zero commerce surface.** AGENTS rules 1–4 untouched. Rule 5 (es-MX): N/A — internal English
reports to one reader. Touch surface: `scripts/lib/prose-writer.mjs`, `scripts/merge-report.mjs`,
`.githooks/post-{merge,checkout}`, `.github/workflows/merge-report.yml`. No app code, no migration,
no flag.

## What already exists (reuse, don't rebuild)

| Asset | Reuse as |
|---|---|
| `planWriters` / `writeProse` (`prose-writer.mjs`) | Already an ordered list plus injected runners — a third backend is an array entry, not a refactor |
| `prose-guard.mjs`, `cpo-persona.md`, `prose-lessons.md` | Untouched and shared — a lesson learned on any backend protects all three |
| `merge-report.mjs` gather/diff/state/send stages | Correct and unchanged; only the writer and the state path move |
| `notify-telegram.yml` (app repos) | Proves push-to-main is a reliable trigger — it has been green throughout |

---

## Architect's locked decisions (D1–D4)

### D1 · A third writer backend, last in the router

`draftWithAnthropic` joins `devin → agy → anthropic`. **The position is the whole design.** One
ordered list covers both environments with no mode flag and no env sniffing at the call site:
locally devin/agy are installed and win (their quota is already paid for); in a runner neither
binary exists, so the API is the only writer standing. It doubles as a genuine third quota pool for
the local rail, which the devin failures above say we need.

Availability is **a key plus a transport** (`!!ANTHROPIC_API_KEY && hasCmd('curl')`), not `hasCmd`
— there is no `anthropic` binary to look for. Both halves are required: claiming availability
without a key turns a clean "not installed" into a guaranteed 401 plus a wasted retry.

### D2 · curl + `spawnSync`, not `fetch`

`writeProse` is **synchronous by contract** because devin/agy are `spawnSync`. Making it async for
one writer would ripple through both callers and all 22 existing specs for no behavioural gain.
Shelling out keeps **one** runner contract — "spawn something, get text or null". The pure seam is
preserved where it matters: `buildAnthropicRequest` and `parseAnthropicResponse` are pure and
unit-tested; only the spawn is I/O. Zero npm deps either way (AGENTS rule 4), which also rules out
the Anthropic SDK.

**The key rides a 0600 curl config file**, never argv — argv is world-readable via `ps`. Note curl
does **not** expand `$VAR` inside a header value (that is a shell feature, and there is no shell
here), so an env var is not an option on this path.

### D3 · Three states in the response parser, not two

Every failure mode here arrives as a **successful HTTP 200**, which is exactly how an empty success
gets manufactured:

- **Collect text blocks by TYPE, never by index.** Thinking is on by default on Opus 5, so
  `content[0]` is a thinking block whose text is empty — indexing hands the guard an empty string
  and calls it a clean draft.
- **A refusal is a failure.** `stop_reason: "refusal"` returns 200 with no prose.
- **Retryable is derived from the error type**, never assumed: `overloaded_error` / `api_error` /
  `rate_limit_error` are worth the one retry the rail already gives; `authentication_error` is not,
  and retrying it only delays the fallback.

`max_tokens` is deliberately generous (8192) for a ~60-word output, because **thinking and visible
text share the budget** — sizing it to the prose would spend it all on thinking and return nothing.

### D4 · The workflow is the authoritative trigger; the hook survives as a fallback

`.github/workflows/merge-report.yml` fires on push to main and does not depend on anyone pulling.
The hook stays for offline work and for repos without the workflow, with its `.git`-is-a-file bug
fixed — but it is no longer the only path, which is the point.

A missing `ANTHROPIC_API_KEY` **skips with a warning rather than failing the job** (rule 5: say so,
never a confident empty result), because the report is a nicety, not a gate — but it must never
silently degrade to a bare commit header that looks like the rail working.

## Risk tier

**LOW** — internal tooling, no app code, no commerce/auth/money surface, no migration, no flag. The
epic's own output is a channel Daniel treats as status, so a *wrong* report is the real risk, which
is what the unchanged shared guard is for.

## Definition of Done (epic)

- [x] `draftWithAnthropic` + the two pure helpers, wired into `planWriters`/`writeProse`.
- [x] Specs for the new seam; **every one observed red** via a break-the-implementation mutation.
- [x] The `.git`-is-a-file bug fixed in both hooks and in `merge-report.mjs`'s state path.
- [x] `merge-report.yml` added for this repo.
- [ ] `ANTHROPIC_API_KEY` set as a repo secret (**Daniel** — a secret is not the builder's to set).
- [ ] The sibling workflow added to the app repos (separate repos, separate PRs — AGENTS rule 1).
- [ ] A real merge observed producing a report from CI.
- [ ] `RETROSPECTIVE.md`; poster + `LEARNINGS.md` updated; memory + `MEMORY.md` index.
