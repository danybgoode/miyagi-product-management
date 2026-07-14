# PMO operational reports — post-ship fast follows

**Status:** ✅ built + smoked · **Risk:** LOW · **Branch:** `codex/pmo-fast-follows`

These are follow-ups from the Sprint 3 smoke/research discussion. The shipped PMO epic stays shipped;
this file records the small post-ship stories without reopening the original sprint count.

## Stories

### FF-1 — Daily standup SmallDocs story deck ✅
**As** Daniel, **I want** the existing nightly Telegram standup to include a SmallDocs deck link,
**so that** the daily repo/routine state is readable and forwardable as a mobile slide artifact.
**Acceptance:** `scripts/standup.mjs` keeps the plain Telegram text as the canonical quick read, appends a
`SmallDocs standup:` link, and `--dry-run` prints the same message without sending Telegram or advancing
the log. Pure tests cover markdown generation, link preservation under Telegram truncation, and import
safety.
**Risk:** low

### FF-2 — Mobile slide aspect marker ✅
**As** Daniel, **I want** story decks to declare a landscape slide aspect, **so that** PMO/standup
slides render predictably for phone review and PPT/PDF export.
**Acceptance:** the PMO weekly deck and daily standup deck templates declare `slideAspectRatio: "16:9"`;
tests fail if that marker disappears. If the current SmallDocs fork ignores the metadata, the fork
branding/theme work owns the renderer-side behavior.
**Risk:** low

### FF-3 — SmallDocs fork branding handoff ✅
**As** Daniel, **I want** our self-hosted SmallDocs fork to feel like a Miyagi/PMO tool, **so that**
shared report links are clearly ours.
**Acceptance:** the PMO SmallDocs Cloud Run runbook names the branding scope, fork-only edit boundary,
and redeploy/update-smoke steps. The report-hub plan covers replacing the generic SmallDocs landing page
and the later true-short-link decision. The root scripts continue to use the existing service URL.
**Risk:** low

### FF-4 — Telegram report links are short visible labels ✅
**As** Daniel, **I want** Telegram report links to show as short readable labels, **so that** the PMO and
standup posts stay phone-friendly and Telegram never slices a visible SmallDocs URL into a dead link.
**Acceptance:** PMO delivery and standup delivery use Telegram HTML anchors (`abrir deck semanal`,
`abrir daily story`) while preserving the full URL in the href; tests count visible Telegram length, not
raw href length, and prove long hrefs stay whole. True short `/r/<slug>` links are planned separately in
the SmallDocs report-hub plan because they require a storage/retention decision.
**Risk:** low

## QA

- `node --test scripts/standup.test.mjs scripts/lib/standup-deck.test.mjs`
- `node --test 'scripts/lib/pmo-*.test.mjs'`
- `node scripts/standup.mjs --dry-run` (prints standup text + `SmallDocs standup:` link; no Telegram/log write)
- `node scripts/pmo-report.mjs --weekly --dry-run` (prints PMO Telegram dry-run with the short visible link)
- `node scripts/build-order.mjs --check`

## Smoke results

Run date: 2026-07-14 · Branch: `codex/pmo-fast-follows` · Risk: LOW

1. ✅ `node --test 'scripts/lib/pmo-*.test.mjs'` passed 41/41.
2. ✅ `node --test scripts/standup.test.mjs scripts/lib/standup-deck.test.mjs scripts/lib/telegram-format.test.mjs scripts/routines.test.mjs scripts/lib/cross-agent-cli.test.mjs`
   passed 79/79.
3. ✅ `node scripts/build-order.mjs --check` reported `BUILD-ORDER.md is up to date`.
4. ✅ `node scripts/standup.mjs --dry-run` printed the normal Telegram standup plus a
   `SmallDocs standup: abrir daily story (...)` line; because it was `--dry-run`, it sent no Telegram
   post and did not advance the standup log. Browser smoke was `success`; stale-preview count degraded
   to `unavailable`.
5. ✅ `node scripts/pmo-report.mjs --weekly --dry-run` printed the PMO Telegram dry-run with
   `Story-deck: abrir deck semanal (...)`; because it was `--dry-run`, it sent no Telegram post and did
   not advance the PMO window log.
6. ✅ Agy cross-agent review ran after Daniel explicitly approved external diff disclosure. It posted an
   advisory comment on PR #86. The should-fix link-truncation hazard and the daily-deck copy nit are
   addressed in this update. `node scripts/agy-doctor.mjs --fix` verified agy 1.1.2 before the review and
   the pin guard now passes.

Red checks observed:
- Standup deck test failed when `SmallDocs standup:` was intentionally changed to `Deck standup:`.
- PMO template test failed when the weekly deck aspect marker was intentionally changed from `16:9` to
  `4:3`.
- Telegram formatter test failed when href escaping stopped converting `&` to `&amp;`.
- PMO delivery test failed when long SmallDocs hrefs were counted raw instead of by visible Telegram
  label length.
