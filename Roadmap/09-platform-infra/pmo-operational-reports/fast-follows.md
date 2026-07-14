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
and redeploy/update-smoke steps. The root scripts continue to use the existing service URL.
**Risk:** low

## QA

- `node --test scripts/standup.test.mjs scripts/lib/standup-deck.test.mjs`
- `node --test 'scripts/lib/pmo-*.test.mjs'`
- `node scripts/standup.mjs --dry-run` (prints standup text + `SmallDocs standup:` link; no Telegram/log write)
- `node scripts/build-order.mjs --check`

## Smoke results

Run date: 2026-07-14 · Branch: `codex/pmo-fast-follows` · Risk: LOW

1. ✅ `node --test 'scripts/lib/pmo-*.test.mjs'` passed 40/40.
2. ✅ `node --test scripts/standup.test.mjs scripts/lib/standup-deck.test.mjs scripts/routines.test.mjs`
   passed 20/20.
3. ✅ `node scripts/build-order.mjs --check` reported `BUILD-ORDER.md is up to date`.
4. ✅ `node scripts/standup.mjs --dry-run` printed the normal Telegram standup plus a
   `SmallDocs standup:` URL ending in `present=0`; because it was `--dry-run`, it sent no Telegram post
   and did not advance the standup log. Browser smoke was `success`; stale-preview count degraded to
   `unavailable`.

Red checks observed:
- Standup deck test failed when `SmallDocs standup:` was intentionally changed to `Deck standup:`.
- PMO template test failed when the weekly deck aspect marker was intentionally changed from `16:9` to
  `4:3`.
