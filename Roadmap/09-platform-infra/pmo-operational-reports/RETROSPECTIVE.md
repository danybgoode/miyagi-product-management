# PMO operational reports — scrum/DORA metrics + AI-differential via smalldocs — Retrospective

_Closed: 2026-07-14 — Daniel phone/Excel smoke confirmed; PR #84 green and merged._

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
- Daniel confirmed the real phone/Excel smoke clear on 2026-07-14: Telegram deck open, deck readability,
  monthly sheet export/open, and shareable deck-link path.
- Fast follow: add a SmallDocs daily standup story-deck link to the existing `ops-nightly` Telegram
  standup without replacing the plain text.
- Fast follow: brand the self-hosted SmallDocs fork and make the slide aspect explicit for mobile reading.
- Deferred unless Daniel asks for it: automatic monthly delivery. Today the monthly packet stays on-demand
  and stateless by design.
