# Cross-agent code review — Retrospective

_Closed: 2026-06-10 · PR [#7](https://github.com/danybgoode/miyagi-product-management/pull/7) on the root
`miyagi-product-management` repo · all 4 stories, all LOW risk · dev tooling only (no app surface)._

## What shipped
A thin, **advisory** second-opinion command — `node scripts/cross-review.mjs <PR#> --agent
codex|antigravity` — that pipes a PR diff into a different model family's CLI for **one pass** and posts
the findings as a clearly-non-authoritative PR comment.
- **S1.1** `1dab2c7` — Codex review → stdout (`gh pr diff` → `codex exec`) + the shared reviewer prompt
  `scripts/cross-review.prompt.md` (five AGENTS rules + WAYS single-pass discipline, one source).
- **S1.2** `3a3b83a` — advisory PR comment via `gh pr comment --body-file -`, "not a gate" banner, `--dry-run`.
- **S1.3** `db5fb57` — Antigravity behind `--agent` (`agy -p`, pinned 1.0.7 + warn), comparable comment.
- **S1.4** `7b44538` — docs wiring: new root `.github/PULL_REQUEST_TEMPLATE.md`, WAYS §Review & merge,
  SESSION-KICKOFFS #4, scripts/README — all *suggested-on-HIGH / optional-on-any / advisory-only*.
- **hardening** `d091da7` — acting on the tool's own review of PR #7 (see below).

## What went well
- **The scope held.** Single-pass, advisory-only, reuse-the-prompt — no drift into the rejected debate
  loop (Option C). The command literally cannot gate: it only prints/comments.
- **Path-scoped commits per story** (`git commit -- <paths>`, never `-A`) kept each story a clean diff in
  the shared root worktree — the LEARNINGS rule for concurrent planning, applied to a script.
- **The tool reviewed itself.** Run against its own PR #7, Codex flagged two *real* robustness gaps in
  `cross-review.mjs` (a huge diff in `agy`'s argv could hit `E2BIG`; `--agent`/`--repo` with no value
  failed indirectly) plus the stale `--output-format json` line in this sprint's own AC. All three fixed
  the same session. That is the feature working as intended on its first real run.

## What we learned
*(Promoted to `Roadmap/LEARNINGS.md` — Tooling gotchas.)*
- **Young foreign CLIs drift — `<cli> --help` before building against a documented flag, then pin +
  degrade.** The AC assumed `agy --output-format json`; `agy 1.0.7` has no such flag. Reality: `agy -p
  "<prompt+diff>"`, text, no stdin block. The script pins 1.0.7 and *warns* (not fails) on mismatch.
- **`codex` and `agy` take context differently.** `codex exec "<prompt>"` appends **stdin** as a
  `<stdin>` block (pipe the diff). `agy` has **no stdin path** → the diff rides in argv, which is why the
  256 KB argv-size guard matters for antigravity only (codex is immune).
- **A `git commit -- <paths> -m "msg"` fails** — everything after `--` is a pathspec; put `-m` *before* `--`.
- **One advisory command, two repos.** root (`miyagi-product-management`, tooling/docs) vs app
  (`miyagisanchezcommerce`); `gh` picks repo from cwd, and `--repo owner/repo` targets either.

## Gaps / follow-ups
- **Owed to Daniel:** a hands-on smoke on his own machine (he holds the day-to-day CLI auth). The
  agent-run 5-step walkthrough against PR #7 is green (both Codex + Antigravity advisory comments posted
  and correctly bannered); this is just the human confirmation.
- **Not built, by design:** no debate/convergence loop (Option C), no CI hook (advisory only), no JSON
  parsing of agy output (1.0.7 emits text). All deliberate scope cuts, cheap to revisit if wanted.
