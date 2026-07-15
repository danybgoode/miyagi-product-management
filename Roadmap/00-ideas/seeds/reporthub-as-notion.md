---
title: "ReportHub as the Notion replacement — short links, live views, Notion decommission"
slug: reporthub-as-notion
status: scaffolded
area: "09"
type: feature
priority: "#5"
risk: high
epic: "09-platform-infra/reporthub-as-notion"
build_order: "#5"
updated: 2026-07-14
---

# Seed — ReportHub as the Notion replacement

**Captured in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 3). **Groomed 2026-07-14
(same-day session, Fable trial). Decisions (Daniel):** registry storage = **Cloud Storage bucket**;
retention = **forever for packets, 90d TTL for dailies**; Notion exit = **parallel-run 2–4 weeks, then
a gated decommission story**; cross-panel offer surfaced, declined ("your call at the gate").
Kill-switch (Stage 6b): **carve-out — additive read path with stateless URL-hash fallback baked in.**
Epic: `09-platform-infra/reporthub-as-notion` (3 sprints).

**The ask:** the SmallDocs-powered Miyagi Reports hub (`pmo-smalldocs`, Cloud Run) replaces Notion as
the working surface: DB-backed queries, graphs, roadmap + sprint status views, custom artifacts beyond
the Notion free tier.

**Foundation already live (shipped 2026-07-14, `pmo-operational-reports` fast-follows):** branded hub
landing, Miyagi report theme, hosted `/reports` Roadmap library from `reports-data.json`.

**Known shape for the groom session:**
- Story 4 of `smalldocs-report-hub-plan.md` (true short links) is the **risk fork**: storage choice
  (Cloud Storage / Firestore / Supabase) ends the hub's stateless posture → HIGH risk, kill-switch
  question applies (Stage 6b).
- Live views should reuse the projection rail (`roadmap-to-notion.mjs --extract`, the
  `reports-data.json` generator, `pmo-report.mjs` metrics) — unusually rich reuse list.
- **Notion decommission is its own final story** — LEARNINGS: decommissioning is bigger than the
  package line. Acceptance = grep-clean, `notion-sync.yml` + `notion-pr-sync.yml` removed,
  WAYS-OF-WORKING/00-ideas README updated.
- Cross-agent planning panel offer applies (new primitive: report registry / id namespace).
