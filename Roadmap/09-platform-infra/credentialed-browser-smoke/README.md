---
status: in-progress
slug: credentialed-browser-smoke
---

# Epic: Credentialed browser smoke — wire the switch, and count what still skips

> **Area:** 09 · Platform & Infra · **Risk:** Medium · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/delivery-rail-hardening.md`](../../00-ideas/seeds/delivery-rail-hardening.md)

## Why

This is **move 1** of the AI-adoption benchmark's Part A — the highest-priority named gap, and the
re-benchmark's key reframe: Claude-powered end-to-end verification is a **step-2 guardrail**, so the
standing owed-smoke ledger isn't us reaching for the next rung, it's an **unfinished guardrail on the
rung we're already on.** Higher priority, lower glamour.

The wiring gap is precise and already documented in team memory (`browser-smoke-ci-gap`):
`browser-smoke.yml` passes the `MS_TEST_*` fixtures but **never sets `MS_TEST_BROWSER_AUTH=1`**, and
defaults to production. `authEnabled()` returns false, so **every authed browser spec skips — in the
nightly run, in the PR run, everywhere.** No credentialed browser spec runs automatically anywhere.

## The honest boundary — read this before scoping expectations

**Clerk's testing-token bypass is rejected for production secret keys by design.** Authed browser
smokes can therefore only ever run against a **dev** Clerk instance — i.e. a preview, never prod.
That is a vendor constraint, not a gap in our wiring, and no amount of CI work removes it.

**This epic cannot fully close the gap by itself.** It terminates on Daniel provisioning dev-instance
test users and repo secrets. What it *can* own, and what makes it worth building now:

1. Wire the switch correctly against the **preview**, so the moment credentials exist the specs light up.
2. **Make the skip visible.** Today an unprovisioned fixture is indistinguishable from a passing run —
   a green tick over dozens of silently skipped specs. That is the more dangerous half of the gap and
   it is entirely ours to fix. *(Precedent: `MS_TEST_GALLERY_LISTING_ID` existed as a secret from
   2026-06-10 but was never wired into the job's env, so its smoke silently skipped for over a month
   before anyone noticed.)*

## Medusa-first note

**N/A — test infrastructure only.** No app code, no migration, no flag. Touch surface:
`apps/miyagisanchez/.github/workflows/browser-smoke.yml`, `e2e/_helpers/auth.ts` (reporting only),
`e2e/README.md`.

## Architect's locked decisions (D1–D4)

**D1 · Authed smokes run against the PREVIEW, never production.** Vendor constraint above. The
existing workflow defaults to `https://miyagisanchez.com`; the authed path must target the PR preview
with the protection-bypass token, exactly as `ci.yml` already does. **Do not point authed smokes at
prod** — it cannot work, and a green run would mean the specs skipped.

**D2 · A silent skip is a defect; the count is the deliverable.** Every skipped authed spec must be
**counted and reported** — in the job summary, and in the standup's evidence pack. A green tick over
40 silent skips is the failure mode this epic exists to end, and it is the half that does not depend
on Daniel. If credentials never arrive, this alone makes the epic worth having shipped.

**D3 · Skips stay graceful — never convert them to failures.** `test.skip` on a missing fixture is
correct: an unprovisioned secret is not a broken product. **Report loudly, fail nothing.** Turning
skips into failures would make the nightly permanently red and train everyone to ignore it — the
precise opposite of the goal.

**D4 · Produce the exact secret list, verified against the specs that read it.** Not a prose
description — an enumerated list, each entry naming which spec(s) light up and what the fixture must
satisfy, **derived mechanically from the spec tree** rather than copied from the workflow's existing
comment block (which is already known to have drifted — see the gallery-secret precedent). This is the
handoff artifact; its accuracy is the story.

## Model routing

Single sprint, **Sonnet 5** — bounded CI + reporting work over a locked contract. Fresh `pr-reviewer`
because it touches auth-adjacent test infrastructure and MED tier.

## Risk tier

**MEDIUM** — no app code, but it handles **test credentials** in CI. Secrets must never reach logs or
artifacts; the reporting D2 adds must emit *counts and spec names*, never fixture values. Merge is
authorized pre-launch (disposable tenants only), but the fresh-reviewer pass is mandatory at this tier.

## Definition of Done (epic)

- [ ] S1 merged; `browser-smoke.yml` sets `MS_TEST_BROWSER_AUTH=1` on the preview-targeted path.
- [ ] Skip counts appear in the job summary and are exposed for the standup.
- [ ] The enumerated secret list is committed, derived from the spec tree, and handed to Daniel.
- [ ] Verified no secret value can reach a log or artifact.
- [ ] `RETROSPECTIVE.md` states plainly that the gap is **half-closed by design** and names the
      Clerk dev-instance constraint as the reason.
- [ ] Poster + `LEARNINGS.md` + memory (`browser-smoke-ci-gap` updated) — the memory currently
      describes the gap as fully open.

## Owed to Daniel (the epic's terminating dependency)

Dev-instance Clerk test users + the repo secrets enumerated by S1. **Until then the specs skip — but
after this epic, they skip *visibly and countably* instead of silently.**
