---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: pmo-operational-reports
---

# Epic: PMO operational reports — scrum/DORA metrics + AI-differential via smalldocs

> **Area:** 09-platform-infra · **Risk:** low · **Archetype:** Grower · **Scope seed:**
> [`00-ideas/seeds/pmo-operational-reports.md`](../../00-ideas/seeds/pmo-operational-reports.md)
> (approved by Daniel 2026-07-11).

## Why
Daniel wants to run the project like a PMO: communicate operation performance to stakeholders in
the language they expect (scrum/DORA), and show the differential of an AI-agent-assisted pod against
industry baselines — down to "even doc maintenance is a breeze." Reports render via a forked,
self-hosted **smalldocs** (slides "story-decks" for Telegram, doc packets, live-formula sheets) from
prebuilt templates that scripts only fill with values. **Grower success signal:** Daniel actually
sends a weekly deck to a stakeholder — reports opened/shared, not merely generated.

## Medusa-first note
No commerce concern (rule #1 n/a by inspection). Data sources are git history, the `gh` REST rail
and Roadmap frontmatter — **no new Supabase table**; persistence rides the ops-routines log-branch
pattern (rule #2 satisfied by not touching Supabase). Internal tool → no UCP/MCP surface (rule #3),
Clerk untouched (rule #4). Report copy es-MX default (rule #5).

## Metrics (grooming decisions 2026-07-11)
Flow (throughput, PR cycle time, epic lead time) + DORA (deploy frequency = merges to `main`,
change-fail proxy = reverts/hotfixes) + doc-ops breadth (Roadmap docs touched/epic, LEARNINGS
promotions, retro coverage). **No story-point ceremony** — velocity inferred from track record.
Delivered-vs-planned deferred to v2. AI-differential = same numbers vs published industry medians,
**web-verified + cited + dated at build time** (comparator sourcing discipline), with the honest
framing line (differential, not controlled experiment).

## What already exists (reuse, don't rebuild) — code-verified at grooming
- **ops-routines rail** (shipped): `scripts/standup.mjs`, `scripts/weekly-recap.mjs`
  (window-tracking log shape — the right one for periodic reports), `scripts/lib/telegram-format.mjs`
  (4096-char guard), `scripts/lib/gh-rest.mjs` (REST-only, routine-sandbox-safe),
  `scripts/lib/log-branch.mjs` (plumbing-only persistence), baseline-guard pattern.
- **`scripts/build-order.mjs` / `roadmap-to-notion.mjs --extract`** — epic/story/status extraction
  (105 epics); frontmatter `status:` flips + git pickaxe = ship dates (LEARNINGS-proven).
- **Telegram** — `tg` lib + `TELEGRAM_CHAT_ID` env fallback (works unattended).
- **smalldocs** (verified 2026-07-11, [repo](https://github.com/espressoplease/smalldocs)) — md →
  PDF/docx/PPT-slides/Excel-with-formulas; charts/Mermaid/slides/sheet fenced blocks; YAML styles;
  URL-hash docs; pure-Node server, no build step. **ELv2: internal self-host permitted**; forbidden:
  third-party managed service, stripping notices, license-key circumvention.
- **Sourcing discipline + CI guard shape** — cost-comparator US-1.2 (source+date per figure).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | US-1.1 Metrics lib — pure `scripts/lib/pmo-metrics.mjs`, fixture-tested, `isMain`-guarded | low |
| 1 | US-1.2 Window log on a log branch + baseline guard (bounded first run) | low |
| 2 | US-2.1 smalldocs fork → org + self-host on Cloud Run (chore; notices intact; URL-hash only, no short-link state) | low |
| 2 | US-2.2 Report templates — weekly story-deck (slides), monthly packet (doc), metrics sheet (formulas); scripts fill values only | low |
| 2 | US-2.3 Benchmark dataset — industry baseline JSON, source+date per figure + CI guard | low |
| 3 | US-3.1 Delivery — weekly Telegram post (headlines + deck link); on-demand `--monthly` packet | low |
| 3 | US-3.2 Smoke — Daniel opens the deck from Telegram on phone; sheet opens in Excel with working formulas | low |

## Deploy order
Root-repo scripts + one new Cloud Run service (S2). No app-repo surface, no flag (LOW — carve-out:
"off" = don't run the script / stop the routine). S1 before S2 (metrics feed templates); S3 last.
Benchmarks researched + cited at build time, never from training memory. All LOW → reviewer may
merge on green; the real risk is number credibility (CI guard + citations). Once the self-hosted
instance is live, note the one-line pointer swap available to cost-comparator US-2.1 (link-out →
our instance).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch:** n/a — LOW risk, carve-out recorded at grooming
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
