---
name: standup-post
description: >
  Posts a delta-only daily standup to Telegram, aggregating overnight signals across all three repos
  (root miyagi-product-management, miyagisanchezcommerce, medusa-bonsai-backend): opened/merged PRs +
  CI status, the latest browser-smoke.yml run, BUILD-ORDER.md drift, open-PR state, and the stale
  Vercel-preview count. Use when Daniel asks to "post the standup", "run the daily standup", "what
  happened overnight", or as the nightly ops routine's one step. Runs scripts/standup.mjs, which does
  all the aggregation, diffing (against scripts/standups.log), and the actual Telegram send. Read-only
  aggregation + one Telegram post + a log commit — never merges, never gates, never touches any repo's
  code.
---

# standup-post — the daily Telegram standup

> This skill never merges a PR, retries CI, or edits any repo's code. Its only writes are a Telegram
> message and an append to `scripts/standups.log` (committed + pushed so the next run — including a
> fresh nightly-routine session — can diff against it).

## When to run me
Daniel asks for a standup / "what happened overnight", or the nightly **ops-nightly** routine
(`scripts/routines/ops-nightly.prompt.md`) invokes me as its one step.

## What already exists (reuse, don't rebuild)
- **`scripts/standup.mjs`** — the mechanical part. Run it, always: `node scripts/standup.mjs` (gathers,
  diffs, posts, commits the log) or `node scripts/standup.mjs --dry-run` (gathers + prints the message,
  skips Telegram and the git commit — use this to sanity-check without touching anything).
- **`gh` CLI** — the PR/CI/workflow-run signals. Must be authenticated with read access to all 3 repos;
  a repo it can't reach degrades to "unavailable" in that section, it doesn't fail the whole run.
- **`scripts/build-order.mjs --check`** — the build-order drift signal. Don't re-implement its diff logic.
- **`scripts/vercel-prune-previews.mjs`** (dry-run, `--age 7`) — the stale-preview count. Never pass
  `--apply` from this skill.
- **`apps/miyagisanchez/lib/telegram.ts`** — the reference HTTP-call shape (`sendMessage`, `parse_mode:
  'HTML'`, escape `&`/`<`/`>`) that `standup.mjs` reimplements standalone (this script has no access to
  the app's build).

## Stage 1 — ensure config
`standup.mjs` resolves the chat id two ways, in order: `skills/standup-post/config.json`'s `chat_id`
first, then the `TELEGRAM_CHAT_ID` env var. **In a routine session (no interactive human present), the
env var is the one that actually works** — `config.json` is gitignored and a routine's cloud sandbox is
a fresh checkout every run, so a locally-written `config.json` never survives to the next run. Set
`TELEGRAM_CHAT_ID` on the routine's environment (the same var its optional failure-ping already needs —
one setting covers both). `config.json` remains the right mechanism for a local/interactive run:
1. Use `AskUserQuestion` to ask Daniel for the Telegram chat id (the same MiyagiDevopsTele bot/chat the
   deploy notifiers and routine failure-pings already use).
2. Copy `config.example.json` → `config.json` and write the answer into `chat_id`.

**Never** ask for or write the bot token here — that's a secret and belongs in the `TELEGRAM_BOT_TOKEN`
env var, set outside this flow (Daniel's shell, or the routine's environment config).

## Stage 2 — ensure the secret
Confirm `TELEGRAM_BOT_TOKEN` is set in the environment. If it isn't, tell Daniel to export it (locally)
or set it on the routine's environment (for the nightly run) — don't try to capture a secret via
`AskUserQuestion`.

## Stage 3 — run it
`node scripts/standup.mjs`. Report back what posted — either the delta lines, or the "quiet night, no
change" case — so whoever invoked this (Daniel or the routine transcript) has a summary even without
opening Telegram.

## Stage 4 — on failure
Surface `standup.mjs`'s stderr verbatim (it dies loud with a specific message — missing token, missing
chat id, Telegram API error). Don't retry blindly; a repeated failure on the same cause is a config
problem, not a flake.

---

## Gotchas
- **Delta-only depends on `scripts/standups.log` surviving between runs.** If it's ever reset or
  deleted, the very next run has nothing to diff against and re-reports everything as "new" — that's
  expected recovery behavior, not a bug.
- **`gh` needs read access to all 3 repos**, not just the one you're used to working in. A repo it can't
  reach (auth, network, wrong repo slug) silently degrades that repo's section to "unavailable" — it
  does not fail the whole standup. If a repo's section is consistently missing, check `gh auth status`
  and repo access before assuming the repo itself is quiet.
- **`TELEGRAM_BOT_TOKEN` is a secret — it never goes in `config.json`.** Only the non-secret chat id
  lives there. If you ever see a token-looking value in `config.json`, that's a mistake to fix, not a
  new convention.
- **`browser-smoke.yml` only exists in the frontend repo** (`miyagisanchezcommerce`) — the backend has
  no per-branch preview / no Playwright (`WAYS-OF-WORKING.md`). Don't expect or add a backend smoke row.
- **`vercel-prune-previews.mjs`'s own default is `--age 0`**, which flags literally every
  non-production preview, including one from a PR opened yesterday — not a meaningful "stale" signal.
  `standup.mjs` deliberately passes `--age 7`. If you invoke the prune script directly for something
  else, remember its bare default differs from what the standup reports.
- **The delta log lives on a dedicated `claude/standup-log` branch** (`scripts/lib/log-branch.mjs`, git
  plumbing only), not committed to `main` — needs **no special push permission**, since `claude/`-prefixed
  branches are already inside a routine's default push scope. (An earlier version committed straight to
  `main`, which needed "Allow unrestricted branch pushes" — that toggle's Save button failed live in the
  claude.ai Routines UI, 2026-07-02/03, so the log moved off `main` entirely instead of depending on a fix
  for it.) If the log write still fails for some other reason, it's logged to stderr only — the Telegram
  post still goes out fine, but the *next* run has nothing to diff against, so a standup quietly degrading
  into a "baseline established" bootstrap message repeatedly (instead of real deltas) is the tell; check
  for a `log-branch: git push failed` line in the routine transcript.
- **A missing/wiped log is NOT the same as "everything happened last night."** On a missing baseline,
  the standup posts one bounded "baseline established (N open, M recently merged)" line per repo instead
  of enumerating gh's entire recent-PR history — the previous behavior tried to diff against nothing,
  which meant every historical PR looked "new," and the resulting message overflowed Telegram's 4096-char
  limit and crashed before ever posting or persisting a log (confirmed live, 2026-07-02/03).
