---
title: "Repo cleanup + per-repo READMEs — value prop, engineering practice, product story"
slug: repo-readmes-branding
status: ready
area: "09"
type: chore
priority: wave-3
risk: low
epic: null
build_order: null
updated: 2026-07-09
---

# Repo cleanup + per-repo READMEs

**As** the team (and anyone we recruit, partner with, or who lands on a repo from a PR link), **we
want** each repo's README to tell the real story — what Miyagi is, why the engineering practice here
is unusual, what this specific repo owns — **so that** the repos market the product and the craft
instead of greeting visitors with scaffold boilerplate.

## Stage-2.5 bucket: light (chore — docs only)

## Rationale
The repos are the public face for exactly the audiences the other seeds court: consultants evaluating
whether the tech is real, partners, potential hires, and merchants' technical friends. The material
writes itself from what already exists — the Roadmap poster, LEARNINGS, the ways-of-working (grooming
front door, cross-agent review, risk tiers, smoke walkthroughs, model split), UCP/MCP-first
architecture — it just isn't surfaced anywhere a visitor looks.

## Scope
One README pass per repo, each with: the one-paragraph product story (from the poster's mission), what
this repo owns in the topology, the engineering-practice highlights (honest, concrete — link the real
docs), quickstart, and pointers. Repos: **monorepo root** (`medusa-bonsai` — the flagship README: the
whole story + repo map), **frontend** (`miyagisanchezcommerce`), **backend** (`medusa-bonsai-backend`),
**`apps/zine`**. Plus the cleanup: stale scaffold text, dead links, references to retired rails
(Render, Flagsmith) — LEARNINGS already flags comment drift after decommissions; READMEs get the same
sweep.

**Out:** restructuring code or moving files; public marketing site copy (that's `/acerca` + `/vende`,
already runtime-editable); open-sourcing decisions.

## Slicing (single sprint)
1. Root README (flagship) + repo map. Risk: LOW.
2. Frontend/backend/zine READMEs + stale-reference sweep. Risk: LOW.

Voice: same bar as the panfleto content criteria — concrete, no fluff, no self-congratulation the
linked docs can't back.

## Kill-switch: n/a (docs). QA: link-check pass (`doc-hygiene` skill covers the shape). Smoke: Daniel reads them.
