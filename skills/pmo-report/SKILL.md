---
name: pmo-report
description: >
  Posts the weekly PMO operational report to Telegram with headline scrum/DORA/doc-ops metrics and a
  SmallDocs story-deck link, or generates the on-demand monthly stakeholder packet plus metrics sheet.
  Use when Daniel asks to "send the PMO report", "run the PMO weekly", "generate the monthly PMO
  packet", or as the pmo-report routine's one step. Runs scripts/pmo-report.mjs, which reuses gh-rest,
  the PMO window log, log-branch persistence, SmallDocs templates, and telegram-format safety nets.
---

# pmo-report - weekly PMO Telegram delivery

> This skill never merges, approves, blocks, or edits app code. Its normal writes are one Telegram
> message plus one append to the `claude/pmo-reports-log` branch after a successful non-dry run.

## When to run me
Daniel asks for the PMO weekly report, the on-demand monthly packet, or the weekly **pmo-report**
routine (`scripts/routines/pmo-report.prompt.md`) invokes me as its one step.

## What already exists (reuse, don't rebuild)
- **`scripts/pmo-report.mjs`** - the mechanical part. Weekly delivery: `node scripts/pmo-report.mjs
  --weekly`. Safe local smoke: `node scripts/pmo-report.mjs --dry-run --weekly`. Monthly packet:
  `node scripts/pmo-report.mjs --monthly` (automatically emits both the packet doc and metrics sheet).
- **`scripts/lib/gh-rest.mjs`** - REST-only GitHub reads, routine-sandbox-safe.
- **`scripts/lib/log-branch.mjs`** - dedicated `claude/pmo-reports-log` persistence, no main-branch
  push needed.
- **`scripts/lib/telegram-format.mjs`** and **`scripts/lib/pmo-delivery.mjs`** - Telegram length guard,
  headline formatter, chat-id loading, and sendMessage wrapper.
- **`scripts/pmo/templates/`** - SmallDocs templates; the script fills values only.

## Stage 1 - ensure config
`pmo-report.mjs` resolves the chat id two ways, in order: `skills/pmo-report/config.json`'s `chat_id`
first, then `TELEGRAM_CHAT_ID`. In a routine session, the env var is the one that actually works
because `config.json` is gitignored and a routine's sandbox is a fresh checkout every run. For a
local/interactive run, copy `config.example.json` to `config.json` and put the chat id there.

Never ask for or write the bot token here. `TELEGRAM_BOT_TOKEN` is a secret and belongs in the shell or
routine environment.

## Stage 2 - run it
For the weekly routine path, run:

```bash
node scripts/pmo-report.mjs --weekly
```

For safe smoke without Telegram or log writes, run:

```bash
node scripts/pmo-report.mjs --dry-run --weekly
```

For the monthly packet path, run:

```bash
node scripts/pmo-report.mjs --monthly
```

Report back the headline metrics and generated SmallDocs links.

## Stage 3 - on failure
Surface stderr verbatim. Do not retry blindly; missing Telegram env, missing chat id, GitHub auth, or a
SmallDocs URL/message-size issue is a config or implementation problem. Two failed attempts on the same
cause escalate to Daniel.

## Gotchas
- **A green routine run is not success by itself.** Success is the Telegram message landing with the
  story-deck link. If the script cannot attempt the post, use the routine's failure-ping path.
- **`--monthly` includes `--sheet` by design.** The sprint acceptance is packet doc plus metrics sheet,
  so Daniel should not need a second flag.
- **The log write happens after Telegram delivery.** If Telegram fails, the window is not advanced, so
  the next run can retry the same reporting window.
- **The SmallDocs URL is hash-only state.** Do not add short-link persistence or a database in this
  sprint.
