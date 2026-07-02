# Retrospective — Ops routines & reporting

**Shipped:** 2026-07-02 · **3 sprints, mixed LOW→MEDIUM** · monorepo-root (`scripts/`, `skills/`,
`scripts/routines/`). **Class:** chore / dev-tooling + process (engineering-facing; zero buyer/seller/
agent surface, zero commerce touch — AGENTS rules 1–4 untouched, rule 5 N/A).

## What shipped
Turned overnight repo state into things Daniel wakes up to instead of assembles, built against the
`spike-skills-library-audit` D-spike's written conventions (script-does-work / `SKILL.md`-wraps /
routine-triggers, `skills/<name>/`, mandatory `## Gotchas`, model-facing descriptions).

- **S1 (PR #50, merged 2026-07-02)** — the skateboard: `skills/standup-post/SKILL.md` +
  `scripts/standup.mjs` gather overnight PR/CI/smoke/build-order-drift/stale-preview signals across all
  3 repos and post a **delta-only** Telegram standup (diffed against `scripts/standups.log`), plus the
  `ops-nightly` routine to trigger it.
- **S2 (PR #52, merged 2026-07-02)** — the nightly fixers, folded into the same one routine:
  `build-order-sync` (regen + a `claude/` docs PR on drift, never hand-edits), `vercel-prune` (scheduled
  dry-run report; `--apply` human-confirmed, never run by the routine itself), `babysit-pr` (advisory PR
  watch — retries flaky CI scoped to the exact failing run, surfaces conflicts, never merges, never a
  required check). Both risk-tier stories (`--apply`, PR writes) got their first live action confirmed by
  Daniel same-day (PR #53, #54) before being left to run unattended.
- **S3 (PR #55, this close-out)** — the longer-horizon complement: `scripts/weekly-recap.mjs` +
  `skills/weekly-recap/SKILL.md` gather the week's merged PRs (all 3 repos), shipped/closed epics
  (a `git log -p` scan of epic `README.md`s for the frontmatter `status:` flip — the same SSOT
  `build-order.mjs` reads), a merges-to-main deploy-count proxy, and a short retro digest per shipped
  epic, posting one weekly Telegram message. A **window-tracking** memory log
  (`scripts/weekly-recaps.log`) — distinct in shape from the standup's delta-snapshot log — lets
  back-to-back runs pick up exactly where the last one ended regardless of cadence drift. A **dedicated
  sibling weekly routine** (`scripts/routines/weekly-recap.prompt.md`) triggers it, mirroring Routine C's
  existing precedent rather than teaching the nightly `ops-nightly` prompt to self-gate on day-of-week.

Five Claude Routines now exist in total (A/B/C from `routines-enablement` + `ops-nightly` +
`weekly-recap`), still well under the Pro 5/day scheduled cap (~2.3/day combined).

## What went well
- **Reuse over rebuild, every sprint.** Nothing here is new executable infra beyond the three gathering
  scripts — everything else (Telegram send shape, `gh`-backed PR/CI reads, `build-order.mjs`'s status
  SSOT, the routine house format) was already proven by S1/S2 or `routines-enablement`/`cross-review`.
  S3's `weekly-recap.mjs` reuses the exact same 3-repo list, `ensureGh()`/`die()`, and Telegram shape
  `standup.mjs` established — only the window-vs-delta log shape and the git-log status-flip scan were
  genuinely new.
- **The "deploys = merges to main" proxy resolved an apparent scope gap without new infra.** The sprint
  doc asked for a "deploys" count with no API specified; `WAYS-OF-WORKING.md`'s own framing ("merging to
  `main` IS the production deploy") settled it — the metric a human would manually tally is exactly the
  merge count, so no new Vercel-API/gcloud credential surface was needed for a LOW-risk reporting skill.
- **Fixture-based pure-logic tests caught the design's real edge cases before any live run** — the
  quiet-week collapse initially swallowed an "unavailable repo" signal into the upbeat "nothing happened"
  framing (a test for exactly that case failed first, fixed before it ever hit a real message).
- **The `--dry-run` rehearsal against real live data is a strong pre-merge signal for a reporting
  script** — the S3.1 walkthrough ran it against the actual repo and cross-checked every count by hand
  (`gh pr list --search`, `git log -p`) rather than trusting the script's own output.

## What we learned (promoted to LEARNINGS.md)
- **A git-log pickaxe scan (`git log -p -- <pathspec>`, regex over `+`-prefixed added lines, tracked
  against the preceding `diff --git` header) is a cheap, dependency-free way to detect a specific
  frontmatter field's flip within a date window** — no new metadata field, no separate "shipped-on" date
  needed; the flip's own commit date IS the ship date. Pass `--reverse` so oldest-first ordering makes
  "last write wins" mean chronologically last, not textually last in the diff.
- **"Merging to `main` is the deploy" is a legitimate, zero-new-dependency proxy metric for a reporting
  tool** when the manual-tally acceptance bar is "what a human would count by hand" — reach for an
  existing convention documented elsewhere in the repo before reaching for a new external API.
- **A weekly report needs a WINDOW tracker, not a delta-snapshot log** — those are two different memory-
  log shapes for two different problems. The daily standup diffs against yesterday's full state (nothing
  changed → say so); a periodic-but-not-strictly-cadenced report instead needs to know **where the last
  window ended** so back-to-back runs (whether exactly 7 days apart or not) never double-count or gap.
- **A quiet-period collapse must never swallow a genuine "this signal is unavailable" state into the
  same upbeat framing as "nothing happened."** Those are different facts a reader needs distinguished —
  caught by a fixture test before it ever reached a real Telegram message.
- **A new routine prompt joining a hard-coded per-name test list (`scripts/routines.test.mjs`'s
  `PROMPTS` array) needs both the array entry AND the literal required substring** (here, "advisory
  only" — the file's guard lowercases and does a plain substring check, so "advisory/observability only"
  does not satisfy it). Grep the guard's exact assertion before assuming a close paraphrase passes.

## Gaps / residual (owed to Daniel — operational)
- **The live (non-dry-run) weekly Telegram post** — `TELEGRAM_BOT_TOKEN` and
  `skills/weekly-recap/config.json`'s `chat_id` live on Daniel's routine environment/shell, not the build
  sandbox; the `--dry-run` rehearsal is the strongest signal achievable in-session (same class of gap S1
  stated for its own first live standup post).
- **The `weekly-recap` routine account stand-up** — installing the GitHub App (already done for the
  other four), creating the routine from `weekly-recap.prompt.md`, setting the weekly Mon 15:30 UTC
  trigger + the load-bearing `TELEGRAM_BOT_TOKEN` + the push-beyond-`claude/`-prefix grant, and
  confirming the first live scheduled fire.
- **Research preview** — routine limits/API may change; the deterministic layers (CI, `build-order.mjs
  --check`, the underlying `gh`/git reads) remain the SSOT, so a routine breaking is never load-bearing.
