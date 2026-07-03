---
name: weekly-recap
description: >
  Posts a weekly executive recap/retro to Telegram, aggregating the week's merged PRs across all three
  repos (root miyagi-product-management, miyagisanchezcommerce, medusa-bonsai-backend), shipped/closed
  epics (detected from README frontmatter status: flips to shipped/archived), a merges-to-main deploy
  count per app repo, and a short retro digest pulled from each shipped epic's RETROSPECTIVE.md. Use
  when Daniel asks to "post the weekly recap", "what shipped this week", "weekly retro", "weekly exec
  summary", or as the weekly-recap routine's one step. Runs scripts/weekly-recap.mjs, which does all the
  gathering (gh + git log) and the actual Telegram send. Read-only aggregation + one Telegram post + a
  log commit — never merges, never gates, never touches any repo's code.
---

# weekly-recap — the weekly Telegram executive recap

> This skill never merges a PR, edits an epic's status, or touches any repo's code. Its only writes are
> a Telegram message and an append to `scripts/weekly-recaps.log` (committed + pushed so the next run —
> including a fresh weekly-routine session — knows where the last window ended).

## When to run me
Daniel asks for the weekly recap / "what shipped this week" / "weekly retro", or the weekly
**weekly-recap** routine (`scripts/routines/weekly-recap.prompt.md`) invokes me as its one step.

## What already exists (reuse, don't rebuild)
- **`scripts/weekly-recap.mjs`** — the mechanical part. Run it, always: `node scripts/weekly-recap.mjs`
  (gathers, posts, commits the log) or `node scripts/weekly-recap.mjs --dry-run` (gathers + prints the
  message only — skips Telegram and the git commit; use this to sanity-check without touching anything).
  `--since <ISO date>` overrides the window start; pair it with `--until <ISO date>` to bound the end too
  (e.g. `--since 2026-06-01T00:00:00Z --until 2026-06-30T23:59:59Z` for "what shipped in June" — `--since`
  alone always runs through *now*, not a fixed end date).
- **`gh` CLI** — the merged-PR signal, same 3-repo list `scripts/standup.mjs` already uses. A repo it
  can't reach degrades to "unavailable" in its section — it does not fail the whole run.
- **`git log -p` on epic `README.md`s** — the shipped/closed-epic signal (frontmatter `status:` SSOT,
  same source `scripts/build-order.mjs` reads). Don't re-derive status from anywhere else.
- **`apps/miyagisanchez/lib/telegram.ts`**'s HTTP-call shape — the reference `weekly-recap.mjs`
  reimplements standalone (this script has no access to the app's build), same as `standup.mjs` does.

## Stage 1 — ensure config
`weekly-recap.mjs` resolves the chat id two ways, in order: `skills/weekly-recap/config.json`'s
`chat_id` first, then the `TELEGRAM_CHAT_ID` env var. **In a routine session (no interactive human
present), the env var is the one that actually works** — `config.json` is gitignored and a routine's
cloud sandbox is a fresh checkout every run, so a locally-written `config.json` never survives to the
next run. Set `TELEGRAM_CHAT_ID` on the routine's environment (the same var its optional failure-ping
already needs — one setting covers both). `config.json` remains the right mechanism for a
local/interactive run:
1. Use `AskUserQuestion` to ask Daniel for the Telegram chat id — this is the **same** MiyagiDevopsTele
   bot/chat `standup-post` and the deploy notifiers already use, just configured independently per the
   D-spike's per-skill `config.json` convention (don't read `standup-post`'s config directly).
2. Copy `config.example.json` → `config.json` and write the answer into `chat_id`.

**Never** ask for or write the bot token here — that's a secret and belongs in the `TELEGRAM_BOT_TOKEN`
env var, set outside this flow.

## Stage 2 — ensure the secret
Confirm `TELEGRAM_BOT_TOKEN` is set in the environment. If it isn't, tell Daniel to export it (locally)
or set it on the weekly-recap routine's environment — don't try to capture a secret via `AskUserQuestion`.

## Stage 3 — run it
`node scripts/weekly-recap.mjs`. Report back what posted — the merged-PR/deploy/shipped-epic counts and
any retro-digest excerpts — so whoever invoked this has a summary even without opening Telegram.

## Stage 4 — on failure
Surface `weekly-recap.mjs`'s stderr verbatim (it dies loud — missing token, missing chat id, Telegram
API error). Don't retry blindly; a repeated failure on the same cause is a config problem, not a flake.

---

## Gotchas
- **Epic status SSOT is the README frontmatter `status:` field — never the generated `BUILD-ORDER.md`
  board.** If a shipped epic seems to be missing from the recap, check the epic's own `README.md`
  frontmatter got flipped to `shipped`/`archived` (and that the commit doing so landed inside the current
  window), not the board.
- **Git-log-based flip detection can miss an unusual history rewrite.** It scans `git log -p` diff hunks
  for an added `+status: shipped`/`+status: archived` line on `Roadmap/*/*/README.md`. A normal commit or
  squash-merge is captured fine (confirmed against real epic-close history); a history rewrite that
  drops or rewrites that specific commit (an unusual rebase, a force-push) could make a real flip
  invisible to this script. Not something to routinely worry about — just don't treat a "0 shipped
  epics" week as proof nothing shipped if something about the git history that week was unusual.
- **"Deploys" is a merges-to-main PROXY, not a live Vercel/Cloud-Build API read.** Per
  `WAYS-OF-WORKING.md`, merging to `main` *is* the production deploy for both app repos, so a merge count
  is the same number a human would get manually tallying "how many times did we deploy" — but a
  docs-only or config-only merge still counts as one, same as it would in a manual tally. This is
  intentional (it avoids a new Vercel-API/gcloud dependency this script would need real credentials for),
  not a bug to "fix" by wiring up a live deploy-status API.
- **The window log lives on a dedicated `claude/weekly-recap-log` branch** (`scripts/lib/log-branch.mjs`,
  git plumbing only), not committed to `main` — needs **no special push permission** (same reasoning as
  `standup-post`'s Gotchas: `claude/`-prefixed branches are already inside a routine's default push
  scope; an earlier `main`-committing version needed "Allow unrestricted branch pushes," which failed to
  save live in the claude.ai Routines UI, 2026-07-02/03). If the log write fails for some other reason,
  it's logged to stderr only — the *next* run falls back to a plain trailing-7-days window instead of
  picking up exactly where the last one left off; if two consecutive weekly runs report overlapping PRs/
  epics, check for a `log-branch: git push failed` line in the routine transcript first.
- **A retro digest is pulled verbatim from the sibling `RETROSPECTIVE.md`'s "## What shipped" section**
  (first paragraph, capped ~320 chars) — it can include raw markdown (bold, links, a commit hash in
  backticks) since it isn't re-rendered, just HTML-escaped for Telegram. That's expected, not a bug; if a
  retro's "What shipped" section opens with something that reads oddly as a one-line teaser, that's a
  retro-writing style issue to fix in the retro itself, not in this script.
- **`skills/weekly-recap/config.json` is its own file, separate from `standup-post/config.json`**, even
  though both typically hold the exact same `chat_id` (same physical Telegram chat). This is deliberate
  per-skill decoupling, not duplication to clean up.
- **A busy repo's merged-PR listing caps at 12 titles per repo** (`formatPrList`, folding the rest into
  "…and N more") — the section header's own count is always exact, only the listed titles are capped.
  This is the primary defense against Telegram's 4096-char `sendMessage` limit (confirmed live: an
  uncapped busy-week message ran ~6,500 chars and would have failed to post). A final
  `truncateForTelegram` hard cap is a last-resort safety net on top (auto-closes an unclosed `<b>` if the
  cut lands inside one, so the truncated message still parses as valid HTML) — it should essentially
  never fire given the cap above, but if it ever does, the cut content is genuinely lost from that post
  (not carried to next week), which is an acceptable trade for a LOW-risk advisory report.
- **`commitAndPushLog()`'s git failures only log to stderr and don't fail the run** — deliberate, mirrors
  `standup.mjs`'s identical convention: the Telegram post already succeeded by that point, so a log-
  persistence failure shouldn't retroactively "fail" a run whose real output already landed. The
  consequence (next run re-derives its window from a stale/missing log) is the same one documented two
  bullets up — check for a `git push failed` line before assuming the underlying signals changed.
- **`gh pr list` is scoped to `--base main`** — a PR merged into any other base branch (a rare
  sub-branch merge) is correctly excluded from both the merged-PR count and the deploy-count proxy, since
  neither represents a real production deploy.
