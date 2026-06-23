# Sprint 1 — app-repo fixes (smoke + tenant ping)

**Epic:** [DevOps reliability cleanup](README.md) · **Risk:** all LOW · **Repo:** `apps/miyagisanchez` (`danybgoode/miyagisanchezcommerce`)
**Goal:** the daily browser smoke is green again and a new-shop signup pings the ops Telegram chat.

> Two independent stories in one app-repo branch (`feat/devops-reliability-cleanup`). Story 1 is reproduce-first
> (don't touch a spec until the failing run names the assertion). Story 3 is a one-line wire-up of an existing,
> already-defined helper.

## Stories

### S1 (Story 1) — Fix the daily browser smoke · LOW *(reproduce first)*
**As** Daniel, **I want** the nightly Browser smoke green again, **so that** a red run is a real signal, not noise.
- **Reproduce (do first, change nothing yet):** `gh run list --workflow=browser-smoke.yml` →
  `gh run view <id> --log-failed` (or download the `playwright-browser-report` artifact) to name the exact
  failing spec + assertion. Confirm locally:
  `PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser`.
- **Root-cause then fix:** content-assertion drift (a public `*.browser.spec.ts` asserts copy/heading/testid
  that prod changed) → realign the spec to the shipped surface with a one-line why-note; OR a real prod
  regression the smoke caught → fix the regression and keep the assertion. The authed buyer smoke skips without
  `MS_TEST_*` — that's by design, not the failure.
- **In:** make the `browser` project pass against prod; the why-note in the touched spec.
- **Out:** harness rewrite; new smoke coverage; provisioning `MS_TEST_*` secrets.
- **Acceptance (Daniel can run):** *Run workflow* (workflow_dispatch) on Browser smoke → **green**; the next
  nightly run is green.
- **QA:** this story *is* a smoke — the green workflow run is the gate. The realigned `*.browser.spec.ts` is the artifact.

### S3 (Story 3) — Restore the new-tenant-signup Telegram ping · LOW
**As** Daniel, **I want** a Telegram ping when a new shop is created, **so that** I see signups in the same ops
chat as everything else.
- **Root cause:** `tg.newShop()` (in `lib/telegram.ts`, targets `TELEGRAM_CHAT_ID`) has **no caller**; shop
  creation moved to `POST /api/sell/shop` and the ping wasn't carried over (only `tg.newListing` survived).
- **In:** call `tg.newShop(seller.name, location, seller.slug)` (fire-and-forget) after a **net-new** create in
  `app/api/sell/shop/route.ts` (after the successful create ~L98, before the 201) — **not** on the idempotent
  already-exists branch (~L50–54). Confirm with Daniel whether the claim path
  (`app/api/claim/complete/route.ts`) should also ping.
- **Out:** a new helper or channel; seller-facing notifications; copy changes.
- **Acceptance (Daniel can run):** create a brand-new shop via the onboarding wizard → `🏪 Nueva tienda
  reclamada` arrives in the ops chat with name + `/s/<slug>`; re-submitting the same shop does **not** ping again.
- **QA:** an **api-project** spec asserting the create path invokes the ping seam (mock/stub `tgSend`) on
  net-new but not on the idempotent branch. Live send owed to Daniel.

## Sprint QA
- **Story 1:** the workflow's own green run vs prod is the gate (no new api spec — it's a browser smoke).
- **Story 3:** one `*.spec.ts` in the `api` project on the extracted seam (stub the telegram send) — pure,
  deterministic, free coverage (LEARNINGS: prefer a pure-logic spec on a `lib/`/route seam). The real Telegram
  send is owed to Daniel.
- Deterministic gate before PR: `npx tsc --noEmit` + `npm run build` + `npm run test:e2e` (api project) green.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com · GitHub Actions on `danybgoode/miyagisanchezcommerce`.

1. Go to the repo's **Actions → Browser smoke → Run workflow** (leave base URL default) and run it.
   → The run finishes **green** (the previously-failing spec now passes).
2. Wait for / check the next scheduled nightly Browser smoke run (`0 9 * * *` UTC).
   → It is **green** too — the fix holds unattended.
3. (tenant ping) In a fresh browser, sign in as a new seller and complete onboarding Step 1 (shop info) to
   create a brand-new shop at a new slug.
   → Within a few seconds a Telegram message `🏪 Nueva tienda reclamada — <shop name> · miyagisanchez.com/s/<slug>`
     arrives in your ops chat.
4. Re-submit the same onboarding Step 1 (same account, shop already exists).
   → **No** second Telegram ping (the idempotent branch doesn't re-notify).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] **S1 (Story 1)** — pending.
- [ ] **S3 (Story 3)** — pending.

> Refs: _(fill at build — PR #, commit SHA.)_ Live Telegram + the green nightly are owed to Daniel.
