---
name: live-smoke
description: >
  Verifies real, rendered behavior on the miyagisanchez frontend (local/preview/staging/prod,
  unauthed or authed) via a real headless-Chromium Playwright browser — the DEFAULT way to check
  "does this render correctly / does this look right / is this actually live" for any coding
  agent, not just Claude Code. Use when asked to "smoke test", "verify the live/prod page", "check
  if X actually rendered", "run a browser smoke", "does this look right on preview", "verify the
  authed seller/buyer/admin flow", or as a post-merge/pre-PR verification step. Wraps
  apps/miyagisanchez/scripts/live-smoke.mjs — a real screenshot + JSON report, not just an HTTP
  status check. Reach for THIS before Claude-in-Chrome; see the fallback boundary below.
---

# live-smoke — the scripted default for verifying rendered behavior

> **This is the default browser-verification tool for every agent, not a Claude-specific
> capability.** Codex, Antigravity, or any other coding-agent session in this repo can run the
> exact same `node scripts/live-smoke.mjs` command Claude Code does — no Chrome extension, no
> special access needed. Claude-in-Chrome is a narrower fallback (see below), not the default.

## What already exists (reuse, don't rebuild)
- **`apps/miyagisanchez/scripts/live-smoke.mjs`** — does all the actual work: resolves
  `--env`/`--flow` to a base URL + the right secrets, spawns the existing Playwright `browser`
  project, and prints where the JSON report + screenshot landed. Zero new browser-driving logic —
  it's a thin wrapper around infrastructure that already existed
  (`playwright.config.ts`'s `browser` project, `e2e/_helpers/auth.ts`'s Clerk ticket sign-in).
- **`apps/miyagisanchez/e2e/_live/ad-hoc.browser.spec.ts`** — the one generic spec `--path` mode
  runs. Never edit this to check a specific page — it's parametrized by env vars the script sets.
- **`apps/miyagisanchez/e2e/*.browser.spec.ts`** — the permanent regression suite. A shipped
  story's browser-testable acceptance criterion belongs here (`groom`'s own "one spec per
  browser/API-testable story" rule), run via `--spec` once written.

## Two modes — pick the right one

**Ad-hoc (`--path`)** — active-development "does this look right" checks. Nothing permanent is
left behind.
```
cd apps/miyagisanchez
node scripts/live-smoke.mjs --env=prod  --flow=unauthed --path=/vende/migracion
node scripts/live-smoke.mjs --env=local --flow=admin    --path=/admin/promoter
```

**Named spec (`--spec`)** — a shipped story's permanent regression coverage. Write the
`*.browser.spec.ts` first (following `e2e/smoke.browser.spec.ts`'s pattern), commit it, then run:
```
node scripts/live-smoke.mjs --env=local --spec="a buyer can sign in and reach their account"
```

## Stage 1 — pick env + flow
- `--env`: `local` (assumes `npm run dev` or the standalone server is already running — this
  script starts nothing itself) · `preview` (needs `--preview-url=` + `VERCEL_AUTOMATION_BYPASS_SECRET`
  in the shell) · `staging` · `prod` (default).
- `--flow`: `unauthed` (default, works everywhere) · `buyer`/`seller`/`admin` (works on **local
  only** — see the environment matrix in Gotchas; the script itself refuses `--flow≠unauthed` with
  `--env=prod` and tells you why, so you won't discover this the hard way).

## Stage 2 — run it
`node scripts/live-smoke.mjs <args>` from `apps/miyagisanchez`. Exit code 0 = pass.

## Stage 3 — read the result back, don't trust the exit code alone
The script prints the report/screenshot paths. **Always `Read` the screenshot** (multimodal) even
on a pass — a 200 with an unexpectedly broken layout, an empty state where content was expected,
or a Spanish-copy page rendering in English are all things `res.ok()` can't catch but a look at
the actual pixels can. Check `report.json`'s `consoleErrors` array too — a clean page can still be
throwing client-side errors that don't affect the HTTP status.

## Fallback boundary — when NOT to use this

**Fall back to Claude-in-Chrome** (Claude Code only — other agents don't have this option, see
below) for: **any authed flow against production** — permanently impossible here, Clerk rejects
its testing-token bypass for production secret keys by design, not a bug to work around; a check
that specifically needs Daniel's own real logged-in identity/data (his real orders, his real
shop); a visual/UX judgment call that genuinely benefits from live interactive poking beyond a
screenshot.

**Stop and ask Daniel** (don't silently fall back) when a credential this tool needs isn't
provisioned yet — see the environment matrix below for exactly which `MS_TEST_*` fixture unlocks
which combination.

**For agents without Claude-in-Chrome** (Codex, Antigravity, etc.): this script is still the full
default — it needs no Claude-specific tooling. For *exploratory* browser driving beyond what a
`--path` smoke covers (poking around, trying several things interactively), register the
[Playwright MCP server](https://github.com/microsoft/playwright-mcp) (`npx @playwright/mcp@latest`)
— Node-native, no LLM key, works for any MCP-capable agent. Authed-prod stays unavailable to every
agent regardless of tooling and is owed to Daniel by name, same as any other money/auth-path smoke.

---

## Gotchas

- **The honest environment × auth matrix — no tool choice routes around these platform
  constraints.** Local: unauthed ✅, authed ✅ (the only fully-working authed combination — the dev
  Clerk instance allows `localhost`). Preview: unauthed ✅ (`VERCEL_AUTOMATION_BYPASS_SECRET`),
  authed ⚠️ genuinely unvalidated as of this skill's creation — two independent gates stack (the
  Vercel SSO bypass, which is likely fine since it's wired into the browser context already, AND
  the Clerk **dev-instance allowed-origins list**, which very likely does NOT include a preview's
  `*.vercel.app` host — a perfect Vercel bypass doesn't help if clerk-js itself refuses to
  hydrate). Staging: unauthed ✅, authed ❌ same Clerk-origin constraint. Prod: unauthed ✅, authed
  ❌ **permanently** (Clerk rejects testing tokens for prod secret keys by design — the script
  itself refuses this combination rather than silently failing).
- **`next start` can silently serve a STALE build** in this repo if `output: 'standalone'` is set
  in `next.config.ts` (it is) — it prints an "unsupported" warning but still boots and serves old
  content, with no further error. If `--env=local` smokes are showing content that doesn't match a
  just-built change, don't trust `next start`; serve
  `node .next/standalone/apps/miyagisanchez/server.js` directly instead (copy `public/` and
  `.next/static/` into the standalone output first — they aren't included automatically — and
  source `.env.local` into the process env, since standalone doesn't auto-load it).
- **`next dev --turbopack` can hard-crash on a literal string sitting in a `.spec.ts` test fixture
  or a code comment**, nowhere near any real Tailwind usage — Turbopack's dev-mode CSS class
  scanner picks up any source text *shaped* like a class name. If `--env=local` against `next dev`
  500s on a nonsensical CSS-parse error, `grep` that literal string across the whole repo
  (comments and test fixtures included) before assuming a real bug; falling back to the standalone
  production server (above) also sidesteps this entirely.
- **Clerk instance-match, for any authed `--flow`:** the app's Clerk keys, the `MS_TEST_*_EMAIL`
  test users, and the target environment must all be the **same Clerk instance** or
  `clerk.signIn`/`window.Clerk` hangs with no useful error. This app's dev instance is
  `honest-eel-39` (decode the `pk_test_...` base64 suffix to confirm) — not whatever instance
  `clerk apps list` shows as "Miyagi Sanchez" by name. Source keys from `.env.local`, never guess
  from an app name.
- **`--flow=admin` needs a dev test user that's actually an admin** — none of the existing
  `MS_TEST_BUYER_EMAIL`/`MS_TEST_SELLER_EMAIL` users are, by default. `lib/admin/identity.ts`
  (`apps/miyagisanchez`) is the SSOT: a Clerk user is admin if `publicMetadata.role === 'admin'`
  **or** its email is in the `MIYAGI_ADMIN_EMAILS` env comma-list. Set `MS_TEST_ADMIN_EMAIL`
  explicitly once one exists, or the script falls back to `MS_TEST_SELLER_EMAIL` (useful if that
  user is the one granted the admin role).
- **Never print or log a secret value** — the script reads `.env.local` and shell env directly
  into the Playwright child process; it never echoes a key/token to stdout. Follow the same
  discipline in any follow-up command (e.g. don't `cat .env.local` to "double check" a value that's
  already being read programmatically).
- **A `--path` ad-hoc run overwrites the previous one's `report.json`/`screenshot.png`** (fixed
  filenames in `test-results/live-smoke/`) — if you need to compare two pages side by side, read
  each result before running the next, or pass `LIVE_SMOKE_OUT=<custom-dir>` in the shell env to
  separate them.
