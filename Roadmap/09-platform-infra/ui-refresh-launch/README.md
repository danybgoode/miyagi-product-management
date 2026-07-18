---
status: shipped
slug: ui-refresh-launch
---

# Epic: UI refresh before launch

> **Area:** 09 · Platform & Infra · **Risk:** High · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/ui-refresh-launch.md`](../../00-ideas/seeds/ui-refresh-launch.md)

## Why
A launch-grade visual upgrade. Direction (Daniel, 2026-07-14): "material" and "Kindle-like" are
**inspiration, not spec** — apply current Material heuristics (M3-era: type scale, color roles, shape,
elevation, purposeful motion) for a top-shelf feel, with calm, content-first treatment on reading
surfaces. **Constraint: token re-skin only** — token values + component polish, no structural rewrites.
The token layer is inherently **site-wide** (every tokenized surface inherits it); the sprints below
sequence the *polish passes* and the risk (checkout last, HIGH, Daniel merges).

## Medusa-first note
N/A commerce logic; visual layer only. Channel parity required (marketplace / subdomain / custom
domain / embed — AGENTS §Federated Channels).

## What already exists (reuse, don't rebuild)
- `design-token-foundation` — the token SSOT + CI raw-color guards (the refresh edits **values**, the
  guards keep enforcement; `enforcedSweptPaths` grows with each polish pass)
- `seller-portal-rails-foundation` — one design language + `<Banner>` etc.; extend, don't fork
- `pwa-liquid-glass-nav-polish`, `homepage-polish-b`, `pdp-redesign` — prior art + their specs
- `hyper-performant-website` perf-budget guard (sequenced before this epic) — its budgets are
  acceptance constraints here

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Research + token spec: current Material heuristics → our token values (written decision) | low |
| 1 | 1.2 Site-wide token layer update (type scale, color roles, shape, elevation, motion) | low |
| 2 | 2.1 Polish pass: buyer core (home, /l, PDP) | low |
| 2 | 2.2 Polish pass: marketing pages (/vende, /acerca, /agent) | low |
| 3 | 3.1 Polish pass: seller portal (rails-compliant) | low |
| 3 | 3.2 Polish pass: checkout flow | high |

## Deploy order
Frontend only, per-sprint merges. Sprint 1 touches `globals.css`/tokens — cross-cutting shared surface:
**announce**, and merge in a quiet window (every open PR inherits it). Perf guard must stay green on
every merge (no budget regression). Checkout polish (3.2) is HIGH: Daniel merges, real-money smoke owed.

## Definition of Done (epic)
- [x] All sprints merged + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough
- [x] This README marked ✅; sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written · poster updated · memory updated · learnings promoted
- [x] Kill-switch: **carve-out — pure visual layer, revert = `git revert` of token commits; no runtime seam**
- [x] Feature branch deleted; **frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
