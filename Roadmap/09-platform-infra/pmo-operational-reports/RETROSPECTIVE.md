# PMO operational reports — scrum/DORA metrics + AI-differential via smalldocs — Retrospective

_Closed: pending Daniel phone/Excel smoke + PR merge (draft PR branch evidence recorded July 14, 2026)._

## What shipped
- **S1 — Metrics + window log.** A pure PMO metrics library, fixture coverage, and the
  `claude/pmo-reports-log` window tracker landed on the existing `gh-rest`/`log-branch` rails.
- **S2 — SmallDocs + templates + benchmarks.** The self-hosted SmallDocs instance went live on Cloud
  Run, three report templates were added (weekly story-deck, monthly packet, metrics sheet), and the
  benchmark dataset gained dated/source-guarded figures.
- **S3 — Delivery.** `pmo-report --weekly` posts PMO headline numbers plus the SmallDocs story-deck link
  to Telegram, `--monthly` emits both the packet and metrics sheet, and a `pmo-report` routine prompt +
  skill/runbook entry reuse the existing routines rail.

## What went well
- The Sprint 3 code stayed narrow: delivery formatting lives in one pure `scripts/lib/pmo-delivery.mjs`
  helper, while `scripts/pmo-report.mjs` remains the coordinator.
- The same routine primitives kept paying rent: REST-only GitHub reads, log-branch persistence, Telegram
  length guard, and routine prompt guards needed extension rather than a new subsystem.
- The live weekly smoke posted to Telegram successfully once the existing Secret Manager values were
  loaded into the process env without printing them.

## What we learned
- On-demand artifact modes must not advance a scheduled routine's window log. The monthly packet command
  now explicitly leaves the PMO window untouched, and the durable rule is promoted to
  `Roadmap/LEARNINGS.md`.

## Gaps / follow-ups
- Daniel still owns the real phone smoke: tap the Telegram deck link, confirm it swipes as slides, open
  the generated metrics sheet in Excel with live formulas, and forward the deck link to a second device or
  person.
- The `pmo-report` Claude Routine account stand-up remains operational: create the routine from
  `scripts/routines/pmo-report.prompt.md`, set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, allow-list
  `api.telegram.org`, and provision `gh`/`GH_TOKEN` as documented in `scripts/routines/README.md`.
- Epic close-out should flip the epic README frontmatter to `shipped`, regenerate the build-order board,
  and add a poster Recent highlights entry only after the draft PR is accepted and the phone smoke is
  confirmed.
