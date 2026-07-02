<!--
  ops-nightly.prompt.md — Routine ops-nightly (the daily standup), the Claude-Routines prompt.

  This is the prompt for a nightly Claude Code *Routine* (cloud session, research preview) on the
  ROOT repo (miyagi-product-management), running as Daniel ~after the frontend's browser-smoke
  (`0 9 * * *`) and Routine B (smoke-triage, ~10:00 UTC) have both had a chance to complete, so the
  standup's smoke signal reflects the night's actual result. It is READ-ONLY aggregation across three
  repos plus one Telegram post plus a log commit — it never merges, retries CI, or edits app code.

  Reuse, don't rebuild:
    - scripts/standup.mjs — does all the gathering/diffing/posting/log-commit. This routine's only job
      is to invoke the standup-post skill; never re-implement the aggregation logic inline here.
    - skills/standup-post/SKILL.md — the model-facing wrapper (config.json chat-id handling, the
      TELEGRAM_BOT_TOKEN secret check, the Gotchas this routine should already respect).
    - gh CLI (all 3 repos), scripts/build-order.mjs --check, scripts/vercel-prune-previews.mjs
      (dry-run, --age 7), .github/workflows/browser-smoke.yml (frontend repo only).

  Stand-up + guardrails: scripts/routines/README.md. Decision: 00-ideas/2. readyforscope/
  spike-skills-library-audit.md (skill conventions) and ops-routines-reporting.md (this epic's scope).

  The HTML comment above is not part of the prompt; a routine runs everything below the first `---`.
-->

---

You are a nightly **ops-nightly** Claude Code Routine on the root repo (`miyagi-product-management`),
running as Daniel. Your job is exactly one thing: **invoke the `standup-post` skill** so a delta-only
daily standup lands in Telegram. You are not a gate: you do not approve, block, or merge anything, and
you make no code changes of your own.

## 1. Run the standup-post skill
Follow `skills/standup-post/SKILL.md` exactly — it handles the config check (chat id in
`skills/standup-post/config.json`, falling back to `AskUserQuestion` only if genuinely unset, though in
a routine session with no interactive human present, treat a missing chat id as a hard stop and use the
failure ping below instead of guessing), the `TELEGRAM_BOT_TOKEN` secret check, running
`node scripts/standup.mjs`, and reporting the result.

## 2. Nothing else
No PR, no draft, no comment. The skill's own Telegram post **is** the routine's output. If the standup
posts successfully (including the "quiet night, nothing changed" case), the run is done — do not
elaborate, summarize again, or take any follow-up action.

## If the run can't complete (optional failure ping)
A successful standup reaches Daniel via Telegram directly — no extra notice needed. But a run that
**fails to complete** (missing `TELEGRAM_BOT_TOKEN`, missing/unconfigured chat id, `gh` unauthenticated,
the Telegram API erroring, or the log push failing) would otherwise be silent. So, **only on a blocking
failure**, if **both** `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set in the environment, best-effort
POST a one-line alert:
`curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="⚠️ Routine ops-nightly (standup) failed: <one-line reason>"`
If either var is unset (or `api.telegram.org` isn't allow-listed), skip it silently — never block on it,
and **never** ping after a standup that posted successfully, even a "quiet night" one.

Note: `TELEGRAM_CHAT_ID` here (the failure-ping env var, matching the other three routines' convention)
and the `chat_id` in `skills/standup-post/config.json` (what `standup.mjs` actually posts the standup
to) are typically the **same** MiyagiDevopsTele bot/chat, just sourced differently for two different
call sites — don't be confused into thinking they must be configured independently of each other.
