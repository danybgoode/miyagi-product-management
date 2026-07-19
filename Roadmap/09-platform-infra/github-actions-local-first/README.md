---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: github-actions-local-first
---

# Epic: GitHub Actions minutes — local-first checks, GH Actions as fallback

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

## Why
Daniel got a GitHub email: 90% of the account's included Actions minutes used, resetting in 17
days. Investigation (real `gh api` data, not guesswork) found only 2 of ~40 repos on the account
actively cost anything — private repos' Actions minutes are metered; public repos are unlimited/free,
so `apps/miyagisanchez` and `apps/backend` (both public) were never the problem. The dominant cost was
this root repo's `notion-sync.yml`, which fired on nearly every push touching `Roadmap/**` (~5-6
billed minutes each, full-history clone) — this repo gets pushed to very frequently. The 5 tiny guard
workflows (build-order/doc-format/scripts/infra/yaml) are cheap per-run but each GH job still bills a
minimum 1 minute due to rounding.

## Medusa-first note
N/A — pure repo/tooling infra, no commerce surface.

## What already exists (reuse, don't rebuild)
- `.githooks/pre-commit` already existed (opt-in, `git config core.hooksPath .githooks`, build-order
  only) but was never actually activated locally (`core.hooksPath` still pointed at the git default)
  — confirmed via `git config core.hooksPath` before this epic touched anything.
- `dobby-foundation`'s `template/.githooks/pre-commit` is the origin of that pattern — this epic
  expands it (see the sibling change in that repo, tracked there not here).
- Every guard is already a pure, zero-install `node scripts/x.mjs --check` — the GH workflows are
  thin `checkout + setup-node + run` wrappers around scripts that run identically locally.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Stop the bleed: remove `notion-sync.yml`'s `push` trigger, keep cron + dispatch. Expand `.githooks/pre-commit` (blocking, fast guards) + new `.githooks/pre-push` (advisory, Notion sync). Auto-enable via `package.json`'s `prepare` script. | Low |

## Deploy order
Repo-tooling only — no backend/frontend deploy involved. Direct-to-`main`, path-limited commits, per
this repo's own low-risk convention.

## Definition of Done (epic)
- [x] `notion-sync.yml`'s billed `push` trigger was removed while the repo was private; after the
      repo became public (unmetered hosted minutes), path-gated push-to-main sync was restored so
      merged roadmap state cannot depend on one machine's hook.
- [x] `.githooks/pre-commit` (blocking) covers build-order, doc-format, scripts/ + infra/ node:test,
      each path-gated to only run when relevant.
- [x] `.githooks/pre-push` (advisory — never blocks) runs the Roadmap → Notion sync locally when
      `NOTION_TOKEN` is present, `main` is checked out, and Git's stdin ref pair is exactly local
      `main` → remote `main`; feature/deletion/refspec pushes skip because a full branch projection
      could clobber parallel work.
- [x] The pre-push background log resolves through `git rev-parse --git-path`, so the sync starts
      from both the main checkout and linked worktrees (`.git` is a file in the latter).
- [x] `package.json`'s `prepare` script auto-activates `core.hooksPath` on `npm install`/`npm ci` —
      no manual per-clone step.
- [x] GH `*-guard.yml` workflows consolidated into one `guards.yml` job + demoted to PR-only.
- [ ] `dobby-foundation` template updated with the same local-first pattern + the public-vs-private
      Actions-billing distinction documented explicitly, so future scaffolded repos start local-first.
