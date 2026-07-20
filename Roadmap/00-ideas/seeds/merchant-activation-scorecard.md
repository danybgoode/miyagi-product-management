---
title: "Merchant activation scorecard — conversion, aging, and cohort retention"
slug: merchant-activation-scorecard
status: raw
area: "08"
type: feature
priority: "#4-fm"
risk: low
epic: null
build_order: "#4-fm"
updated: 2026-07-20
---

# Seed — Merchant activation scorecard

Render the weekly operating scorecard from Golden Beans entity-journey projections plus Medusa commerce facts:
stage conversion, median time in stage, previews awaiting action, merchants without next action, three-products-
live, first share/inquiry/sale, 30-day retention, and performance by cohort/partner. One canonical definition per
metric; no spreadsheet arithmetic, vanity traffic dashboard, or manually edited stage totals. Depends on
`founding-merchant-activation-ops` and Golden Beans `entity-journeys-projections`.
