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
**Follow-through:** SmallDocs PR #1 shipped the branded Miyagi Reports landing/viewer and was deployed to
`pmo-smalldocs` revision `pmo-smalldocs-00002-kvb` on 2026-07-14.
**Risk:** low

### FF-4 — Telegram report links are short visible labels ✅
**As** Daniel, **I want** Telegram report links to show as short readable labels, **so that** the PMO and
standup posts stay phone-friendly and Telegram never slices a visible SmallDocs URL into a dead link.
**Acceptance:** PMO delivery and standup delivery use Telegram HTML anchors (`abrir deck semanal`,
`abrir daily story`) while preserving the full URL in the href; tests count visible Telegram length, not
raw href length, and prove long hrefs stay whole. True short `/r/<slug>` links are planned separately in
the SmallDocs report-hub plan because they require a storage/retention decision.
**Risk:** low

### FF-5 — Hosted Roadmap report library ✅
**As** Daniel, **I want** a hosted PMO/Roadmap report library inside the Miyagi Reports hub, **so that**
clients, investors, and the team can browse polished Roadmap views without installing the local SmallDocs
library agent.
**Acceptance:** the PMO SmallDocs fork serves `/reports` from generated public Roadmap data, `/docs`
routes the `Biblioteca de reportes` button to `/reports`, each report opens through `/docs#md=...`, and
the upstream `/library` + `/connect` loopback flow remains available for private local files. The root
generator uses `scripts/roadmap-to-notion.mjs --extract` and the existing SmallDocs hash-link helper,
curating summaries/metadata rather than publishing raw full docs.
**Follow-through:** SmallDocs PR #2 shipped `/reports` and was deployed to `pmo-smalldocs` revision
`pmo-smalldocs-00003-zkb` on 2026-07-14.
**Risk:** low

## QA

- `node --test scripts/standup.test.mjs scripts/lib/standup-deck.test.mjs`
- `node --test 'scripts/lib/pmo-*.test.mjs'`
- `node scripts/standup.mjs --dry-run` (prints standup text + `SmallDocs standup:` link; no Telegram/log write)
- `node scripts/pmo-report.mjs --weekly --dry-run` (prints PMO Telegram dry-run with the short visible link)
- `node scripts/pmo-report-hub-data.mjs` (refreshes SmallDocs `public/reports-data.json`)
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

## Report Hub follow-through smoke

After SmallDocs PR #1 merged, the branded fork was deployed live to `pmo-smalldocs` at commit
`cea02aa9db690f0b2c39dd1748f901f2a178d195`. Live smoke passed for the documented and canonical Cloud Run
URLs on desktop and phone, and exact PMO weekly + daily standup dry-run links opened against the deployed
service. Details live in `smalldocs-report-hub-plan.md` and `infra/gcp/pmo-smalldocs.md`.

After SmallDocs PR #2 merged, the hosted report library was deployed live to `pmo-smalldocs` at commit
`eee8803b784f0577d15227e29d0d56fff317f1a8`. Live smoke passed for `/reports` on the documented and
canonical Cloud Run URLs: 5 executive views rendered, 429 Roadmap rows loaded, 421 directory items were
available with a 160-card visible cap, search filtered to the expected PMO results, view cards opened
`/docs#md=...`, mobile had no horizontal overflow, and the segmented filter touch target measured 44px.
