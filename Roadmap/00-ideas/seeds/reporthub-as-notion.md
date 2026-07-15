---
title: "ReportHub as the Notion replacement — short links, live views, Notion decommission"
slug: reporthub-as-notion
status: raw
area: "09"
type: feature
priority: "#5"
risk: high
epic: null
build_order: "#5"
updated: 2026-07-14
---

# Seed — ReportHub as the Notion replacement

**Captured in:** `Roadmap/00-ideas/audits/batch-groom-2026-07-14.md` (Ask 3). **Not yet groomed —
gets its own session per the batch cadence.**

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
