---
status: in-progress
slug: reporthub-as-notion
---

# Epic: ReportHub as the Notion replacement

> **Area:** 09 · Platform & Infra · **Risk:** High · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/reporthub-as-notion.md`](../../00-ideas/seeds/reporthub-as-notion.md)

## Why
The SmallDocs-powered Miyagi Reports hub (`pmo-smalldocs`, Cloud Run) replaces Notion as the working
surface: short readable report links, live roadmap/sprint views, PMO graphs — more custom artifacts
than the Notion free tier, on our own rail. Decisions (Daniel, 2026-07-14): registry storage = **Cloud
Storage bucket**; retention = **forever for packets, 90d TTL for dailies**; Notion exit = **parallel-run
2–4 weeks, then a decommission story** gated on Daniel confirming the hub covers real usage.

## Medusa-first note
N/A commerce — but the same reuse discipline applies: the projection rail
(`roadmap-to-notion.mjs --extract`), the `reports-data.json` generator, and `pmo-report.mjs` metrics
are the primitives; no new report-computation code.

## What already exists (reuse, don't rebuild)
- Hub live (2026-07-14): branded landing, Miyagi theme, hosted `/reports` Roadmap library (fork PRs #1–#2)
- `scripts/pmo-report.mjs` + `scripts/pmo/` — metrics already computed; `scripts/lib/telegram-format.mjs`
- `roadmap-to-notion.mjs --extract` — the roadmap projection the live views re-target
- `infra/gcp/` service account + us-east4 rails; `smalldocs-report-hub-plan.md` Story 4 (the registry design)
- Routine delivery rails (standup/weekly/pmo) — they emit the links

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 GCS report registry (slug→payload, lifecycle rule) | high |
| 1 | 1.2 `/r/<slug>` resolver in the fork + fallback to URL-hash | high |
| 1 | 1.3 Report scripts emit short links (Telegram messages use real URLs) | low |
| 2 | 2.1 Live roadmap/sprint status views (projection-fed, auto-refreshed) | low |
| 2 | 2.2 PMO metrics graphs (weekly/monthly, chart views in the hub) | low |
| 3 | 3.1 Parallel-run checkpoint: hub-vs-Notion usage review (gate) | low |
| 3 | 3.2 Notion decommission (workflows, scripts, docs — grep-clean) | low |

## Kill-switch decision (Stage 6b — HIGH epic)
**Carve-out, no flag:** the registry is an additive read path with the stateless URL-hash link as a
baked-in fallback — every consumer keeps working if short links stop being emitted or the bucket is
unreachable (resolver 404 → hub explains + long link still valid). "Disable" = stop emitting short
links in the scripts (one env var), no runtime flag infrastructure needed.

## Deploy order
Fork (danybgoode/smalldocs → Cloud Run `pmo-smalldocs`) first for 1.2, then root-repo scripts for 1.3.
Bucket provisioned before the fork deploy (LEARNINGS: additive infra before the merge that needs it).
Writes restricted to the routine/service account; reads public. Sprint 3.2 only after the 3.1 gate.

## Definition of Done (epic)
- [ ] All sprints merged + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough
- [ ] This README marked ✅; sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written · poster updated · memory updated · learnings promoted
- [ ] Kill-switch: **carve-out recorded above — verify the URL-hash fallback works with the bucket unreachable**
- [ ] Feature branch deleted; **frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
