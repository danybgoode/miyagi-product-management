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

> **Reality found at build:** the nightly was red across **6 specs / 9 cases**, not one. Four were
> anonymous/structural drift from sibling epics (about-content pricing went live; the marketplace-static-shell
> route split added a layout `<main>`; the PWA glass-nav S2.1 turned the bar's search link into a sheet-opening
> button; `.pwa-only` spread to the search sheet + shell) — **fixed in this sprint** (PR #115). The remaining
> three (`personalization` ×2, `trust-signals`) are **stale-fixture, owed to Daniel** (see step 0).

0. **(prerequisite for a fully-green nightly — owed to Daniel)** Repoint the repo secret
   `MS_TEST_PERSONALIZED_LISTING_ID` (optionally add `MS_TEST_PDP_LISTING_ID`) to a current **public** listing
   that has **a required custom field** AND a **seller exposing ≥1 payment/fulfillment method**.
   → The `personalization` + `trust-signals` browser smokes light up (they skip/​fail today on a dead fixture;
     the spec assertions + app markup are both correct — only the fixture drifted).
1. Go to the repo's **Actions → Browser smoke → Run workflow** (leave base URL default) and run it.
   → The run finishes **green** (the four realigned specs pass; the `tabbar` testid ships with PR #115).
2. Wait for / check the next scheduled nightly Browser smoke run (`0 9 * * *` UTC).
   → It is **green** too — the fix holds unattended (fully green once step 0 is done).
3. (tenant ping) In a fresh browser, sign in as a new seller and complete onboarding Step 1 (shop info) to
   create a brand-new shop at a new slug.
   → Within a few seconds a Telegram message `🏪 Nueva tienda reclamada — <shop name> · miyagisanchez.com/s/<slug>`
     arrives in your ops chat.
4. Re-submit the same onboarding Step 1 (same account, shop already exists).
   → **No** second Telegram ping (the idempotent branch doesn't re-notify).
5. (claim ping) Complete a gem-shop **claim** (claim email → dashboard → ownership transfer).
   → One `🏪 Nueva tienda reclamada` ping arrives; re-running the claim does **not** re-ping (404/409 return first).

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] **S1 (Story 1)** — built; 4 drifted browser specs realigned + `data-testid="pwa-tabbar"` added. PR #115 `a7e7674`.
- [x] **S3 (Story 3)** — built; `tg.newShop` re-wired on net-new create **and** claim via pure `lib/shop-notify.ts`. PR #115 `bb4cb07`.

> Refs: PR [#115](https://github.com/danybgoode/miyagisanchezcommerce/pull/115) (draft, risk LOW) — commits `a7e7674` (S1) · `bb4cb07` (S3).
> **Owed to Daniel:** (a) repoint `MS_TEST_PERSONALIZED_LISTING_ID` for a fully-green nightly (walkthrough step 0);
> (b) live Telegram receipt on a real create + claim (steps 3–5); (c) the green workflow_dispatch + nightly (steps 1–2).
