---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: dobby-foundation
---

# Epic: dobby-foundation — portable ways-of-work (plugin marketplace + project template)

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

Scope doc: [`00-ideas/2. readyforscope/golden-beans-growth-engine.md`](../../00-ideas/2.%20readyforscope/golden-beans-growth-engine.md)
(this epic is that doc's **S0 workstream**; the Growth Engine sprints S1–S4 scaffold in the new
`golden-beans` repo's own Roadmap once story 1.4 creates it).

## Why

Daniel wants to run completely isolated projects (first: the Golden Beans Growth Engine) while keeping
the operating system built here — groom, skills, scrum cadence, scaffolds, CI gates. Today all of that
is checked into this repo only; a second project would fork-and-rot it. This epic extracts it into a
sibling `dobby-foundation` repo with two layers: a **Claude Code plugin marketplace** distributing the
*living* skills (installed + updated from one place, per-project selection) and a **project template**
(the *copy-once* skeleton: Roadmap structure, generalized WAYS-OF-WORKING, AGENTS skeleton, CI,
scripts, e2e harness). The proof is dogfood: `golden-beans` is spawned from the template and consumes
the marketplace. The skills-library spike (2026-07-02) named exactly this trigger for leaving
repo-checked-in distribution: "a second repo needs to selectively install a subset."

## Medusa-first note

N/A — zero commerce surface; docs/tooling only. AGENTS rules 1–4 untouched; rule 5 (es-MX) is
Miyagi-specific and becomes a *per-project slot* in the template's AGENTS skeleton, not a universal.

## What already exists (reuse, don't rebuild)

- Repo-original skills to move into the plugin: `skills/{groom, doc-hygiene, standup-post,
  weekly-recap, babysit-pr, build-order-sync, vercel-prune}` (incl. `groom/scaffold-epic.mjs` +
  `templates/`). Vendored Stripe skills (`.agents/skills/*` + symlinks) stay as-is — different
  distribution class per the spike's §4 decision.
- Portable scripts for the template: `scripts/{build-order.mjs, cross-review.mjs, cross-panel.mjs}`
  (+ their `.prompt.md` files, `scripts/lib/cross-agent-cli.mjs`), `scripts/routines/*`, `.githooks/`.
- Docs to generalize: `Roadmap/WAYS-OF-WORKING.md` (cadence/DoR/DoD/risk tiers/QA gate are universal;
  Vercel/Cloud-Run/Telegram specifics become template variables), `Roadmap/README.md` poster shape,
  `00-ideas` funnel + `BUILD-ORDER.md` guard, `SESSION-KICKOFFS.md`, `LEARNINGS.md` (structure + the
  transferable subset, e.g. *Working efficiently*; Miyagi-specific gotchas stay here).
- CI to template: `.github/workflows/*` (tsc + build + Playwright api gate; `build-order-guard.yml`),
  `apps/miyagisanchez/e2e/` harness shape.
- Marketplace mechanics (verified 2026-07-03): `.claude-plugin/marketplace.json` + per-plugin
  `plugin.json`; consumers `/plugin marketplace add <org>/<repo>` → `/plugin install
  <plugin>@<marketplace>` — [code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 `dobby-foundation` repo: marketplace + `ways-of-work` plugin (skills moved in) | LOW |
| 1 | 1.2 medusa-bonsai consumes the plugin; in-repo skill copies retired | LOW — **shared surface, announce** |
| 1 | 1.3 Project template skeleton (Roadmap · WAYS-OF-WORKING generalized · AGENTS skeleton · CI · scripts · e2e) | LOW |
| 1 | 1.4 Spawn `golden-beans` from the template under `~/dobby/`; groom + build-order + CI green there | LOW |

## Deploy order

No app deploys — three repos' worth of docs/tooling, strictly ordered: 1.1 (foundation exists) →
1.2 (this repo switches over, one revert-able commit) → 1.3 (template) → 1.4 (golden-beans spawned).
Nothing in the Growth Engine starts until 1.4 is done — the engine's epic docs live in golden-beans.

## Definition of Done (epic)

- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Kill-switch: N/A for this epic (docs/tooling; the scope doc's `growth.telemetry_enabled` flag
      belongs to the Growth Engine's S1 in golden-beans, verified at *that* epic's DoD)
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
