---
title: "PMO operational reports — scrum/DORA metrics + AI-differential, rendered via smalldocs"
slug: pmo-operational-reports
status: scaffolded
area: "09"                           # platform-infra, sibling of ops-routines-reporting
type: feature
priority: tbd
risk: low                            # read-only reporting over git/gh/Roadmap data; no money/auth/commerce path
epic: "09-platform-infra/pmo-operational-reports"
build_order: null
updated: 2026-07-11
---

# PMO operational reports — the operation's numbers, in stakeholder language

**Origin:** Daniel's ask 2026-07-11 — "start tracking and reporting team/product operation
performance… like building the PMO for the project… standard scrum metrics… show performance of an
AI-agent-assisted pod vs a pod not assisted… reports via Telegram that look like Instagram stories,
or via email with a spreadsheet attached." Grooming decisions (2026-07-11, confirmed by Daniel):
**metrics = throughput/cycle + DORA + doc-ops breadth** (delivered-vs-planned deferred) ·
**AI-differential baseline = industry benchmarks, cited + dated** · **smalldocs: fork now,
self-host as a chore story**.

## Stage-2.5 bucket — **genuinely new** (the stakeholder-grade report layer), with heavy reuse
The raw signals all exist; nothing today turns them into stakeholder-language reports. This is a
report/render layer over shipped rails — not a new data platform.

## Medusa-first note (AGENTS rules)
No commerce concern — nothing to model in Medusa (rule #1 n/a by inspection). Data sources are git
history, the `gh` REST rail, and Roadmap frontmatter — **no new Supabase table**; persistence rides
the ops-routines log-branch pattern (rule #2 satisfied by not touching Supabase at all). Not a
buyer/seller surface → UCP/MCP n/a (rule #3), Clerk untouched (rule #4). Report copy **es-MX**
default (rule #5) — confirm if any stakeholder deck needs the bilingual allow-list.

## Metrics — v1 definitions (no new ceremony; all derivable from existing repo data)
| Family | Metric | Source (exists today) |
|---|---|---|
| Flow | Throughput: stories + epics shipped/week | `build-order.mjs` extract (epic frontmatter status SSOT) + git-pickaxe ship-date scan (LEARNINGS-proven, `weekly-recap.mjs`) |
| Flow | Cycle time: PR open→merge; epic scaffold→shipped lead time | `scripts/lib/gh-rest.mjs` (REST-only, routine-safe) + epic frontmatter flip dates |
| DORA | Deploy frequency (merges to `main` = deploys — the documented convention) | `weekly-recap.mjs` already counts this |
| DORA | Change-fail proxy: reverts + hotfix-classed PRs on `main` | git log + PR labels/titles via gh-rest |
| Ops | Doc-maintenance breadth: Roadmap docs touched/epic, LEARNINGS promotions, retro coverage (retros ÷ epics closed) | git log over `Roadmap/` — the "even doc maintenance is a breeze" evidence |
**Explicitly not doing:** story-point estimation. Velocity is *inferred from track record*
(throughput trend), per Daniel's "don't overcomplicate."
**AI-differential section:** the same numbers next to published industry medians (DORA reports,
typical scrum-team cycle/deploy benchmarks) — **web-verified + cited + dated at build time, never
training memory** (the cost-comparator sourcing discipline). One honest framing line: solo
AI-assisted pod vs industry median team — a differential, not a controlled experiment.

## smalldocs — the render engine (verified 2026-07-11)
[github.com/espressoplease/smalldocs](https://github.com/espressoplease/smalldocs): markdown in →
**PDF / docx / PowerPoint slides / Excel with live formulas** out; charts, Mermaid, slide decks,
live-formula sheets from fenced blocks; styles via YAML front matter; URL-hash documents (server
never sees content); encrypted short links; CLI + bridge mode. Pure-Node server, static frontend,
SQLite, **no build step** — a small self-host. **License Elastic 2.0: fork + self-host for our own
internal use is permitted**; forbidden: offering it to third parties as a hosted/managed service,
stripping notices, or circumventing license-key functionality — the fork must respect all three.
Hosted smalldocs.org ToS ("personal use only" per Daniel) could not be verified (client-rendered
/terms) — self-hosting moots the question. Alternatives considered: Marp/Slidev (slides only),
Quarto (docs/slides, heavy toolchain) — none covers slides + formula-sheets + docx from one md
schema. Honest caveat: young single-maintainer project (~91 stars, ELv2) — the fork pin is also
supply-chain hygiene. The cost-comparator epic (S2.1) already link-outs to smalldocs.org; once our
instance is live it can point there instead (one-line change, noted there at build time).

## What already exists (reuse, don't rebuild)
- **ops-routines-reporting** (shipped): `standup.mjs`, `weekly-recap.mjs` (window-tracking log — the
  right shape for periodic reports), `scripts/lib/telegram-format.mjs` (4096-char safety),
  `scripts/lib/gh-rest.mjs` (REST-only, GraphQL-blocked-sandbox-safe), log-branch persistence
  (`scripts/lib/log-branch.mjs`), baseline-guard pattern (no "everything happened" on first run).
- **build-order.mjs / roadmap-to-notion.mjs --extract** — epic/story/status extraction, 105 epics deep.
- **Git-pickaxe ship-date scan** — frontmatter-flip dates = ship dates, zero new metadata (LEARNINGS).
- **Telegram rail** — `tg` lib + `TELEGRAM_CHAT_ID` env fallback (routine-safe).
- **Routine scheduling** — Claude Routines (cloud, runs-as-you) or local cadence, both proven.
- **Sourcing discipline** — cost-comparator's "sourced + dated figures, CI guard" pattern for the
  benchmark numbers.

## Sprints & stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1.1 **Metrics lib** — pure `scripts/lib/pmo-metrics.mjs`: collectors for the table above, fixture-tested (`node:test`), `isMain`-guarded (LEARNINGS) | low |
| 1 | US-1.2 **Window log + baseline guard** — `pmo-reports.log` on a log branch, window-tracking shape; first-run = bounded baseline summary | low |
| 2 | US-2.1 **smalldocs fork + self-host (chore)** — fork to our org, deploy internal instance on **Cloud Run** (not Vercel — direction of travel; short-links/SQLite persistence deferred: URL-hash docs need no server state), keep ELv2 notices intact | low |
| 2 | US-2.2 **Report templates** — prebuilt smalldocs md templates (YAML styles + chart blocks): weekly ops "story-deck" (slides), monthly stakeholder packet (doc), metrics sheet (live-formula Excel export). Scripts only fill values | low |
| 2 | US-2.3 **Benchmark dataset** — industry baseline JSON, source + date per figure, CI guard against unsourced numbers (comparator pattern) | low |
| 3 | US-3.1 **Delivery** — weekly Telegram post: headline numbers + smalldocs deck link (rides the routines rail); monthly packet on demand (`node scripts/pmo-report.mjs --monthly`) | low |
| 3 | US-3.2 **Smoke walkthrough** — Daniel opens a real weekly deck on phone from Telegram; sheet export opens in Excel with working formulas | low |

## Kill-switch decision (risk: low)
Carve-out: read-only reporting scripts + an internal render instance; "off" = don't run the script /
stop the routine. No runtime seam needed.

## Scope boundary
**In (v1):** metrics lib (flow + DORA + doc-ops) · AI-differential vs cited industry benchmarks ·
smalldocs fork + Cloud Run self-host · templates (slides deck, doc packet, formula sheet) · weekly
Telegram delivery + on-demand monthly.
**Out (v1):** story-point estimation ceremony · delivered-vs-planned (deferred per Daniel — revisit
once flow numbers are visible) · email delivery (no report-mail rail today; packet is a link/file
first) · pre-reads/post-presentation packets automation (v2 — templates make it cheap later) ·
short-link persistence on the self-hosted instance · any customer-facing surface.

## Open risks
- **Benchmark credibility:** industry medians vary by source; mitigated by cite+date per figure and
  the one-line framing caveat.
- **smalldocs drift:** upstream is young; the fork pins us, but we own merges — keep the instance
  boring (no local patches beyond config) so upstream pulls stay cheap.
- **Doc-ops metrics can be gamed/noisy** (docs touched ≠ value) — presented as breadth evidence,
  never a target (Goodhart note in the template copy).
- **Cloud Run static hosting** of smalldocs: no build step helps, but confirm cold-start + the
  service stays private (IAP or obscurity? decide at build — internal tool, no money path).
