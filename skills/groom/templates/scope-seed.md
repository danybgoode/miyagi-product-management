---
title: "{{TITLE}}"
slug: {{SLUG}}
status: ready
area: "{{AREA}}"
type: {{TYPE}}
priority: null
risk: {{RISK}}
epic: null
build_order: null
updated: {{DATE}}
---

# Scope — {{TITLE}}

## Outcome & signal
<!-- What's true after this ships that isn't now? How will Daniel test it? -->

## Stage-2.5 bucket
<!-- already-possible | light-enhancement | genuinely-new — and why. -->

## Scope
**In v1:**
**Out of v1:**

## What already exists (reuse, don't rebuild)
<!-- Concrete files / routes / primitives (Medusa-first reframe). -->

## Kill-switch / runtime gate (risk:high only — Stage 6b)
<!-- Delete this block if risk:low. For risk:high, record the decision (mandatory), not just the flag:
     EITHER a recommended flag story — flag `<domain>.<feature>_enabled` · polarity (kill-switch=default
     true, create ENABLED in every env | enablement=default false, create DISABLED, flip on) · seam to
     gate · mechanism (Flagsmith for node/server; Edge Config for middleware/Edge seams)
     OR a one-line carve-out reason (e.g. DB migration — reversible expand/contract, no runtime flag). -->

## Acceptance criteria
<!-- Plain-language checks per story. -->

## Open risks / research
<!-- Cite present-day facts where the ask leans on anything recent/changing. -->
