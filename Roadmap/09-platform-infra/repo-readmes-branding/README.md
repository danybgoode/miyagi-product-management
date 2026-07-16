---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: repo-readmes-branding
---

# Epic: Repo cleanup + per-repo READMEs — value prop, engineering practice, product story

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/repo-readmes-branding.md`](../../00-ideas/seeds/repo-readmes-branding.md)

## Why
The four repos are the public face for exactly the audiences the other Wave-3 seeds court —
consultants evaluating whether the tech is real, partners, potential hires, merchants' technical
friends — and today every one of them greets a visitor with scaffold boilerplate: the root repo
(`miyagi-product-management` on GitHub) still carries the stock Medusa DTC Starter README (wrong clone
URL, a `pnpm` quickstart the repo doesn't use), the frontend is untouched create-next-app text, the
backend is Medusa's own marketing README, and `apps/zine` has no README at all. One README pass per
repo makes each tell the real story: what Miyagi is, what this repo owns, why the engineering practice
here is unusual — with every claim linking the doc that backs it.

## Medusa-first note
Docs-only chore — no commerce data, no runtime seam, no Medusa primitive involved. The "reuse, don't
rebuild" discipline applies to **source material**: the story is lifted from the poster and
WAYS-OF-WORKING, never re-invented.

## What already exists (reuse, don't rebuild)
- **`Roadmap/README.md` (poster)** — mission paragraph + feature map: the product-story source.
- **`Roadmap/WAYS-OF-WORKING.md`** — practice highlights to link: groom front door, cross-agent
  review/panel (`scripts/cross-review.mjs` / `cross-panel.mjs`), risk tiers, deterministic gate +
  smoke walkthroughs, model split, Routines.
- **`Roadmap/LEARNINGS.md`** — proof the practice is real; link as-is.
- **`apps/miyagisanchez/AGENTS.md`** — the five rules; the frontend README's practice anchor.
- **Deploy-topology facts** (WAYS-OF-WORKING + LEARNINGS): root repo versions product/orchestration
  docs; app repos independent + git-ignored here; frontend → Vercel (previews); backend → Cloud Build
  us-east4 → Cloud Run `medusa-web` (~12 min, no preview); `apps/zine` local-only, no remote/CI/deploy.
- **Public surfaces to link:** `miyagisanchez.com`, `/acerca`, `/agent`, `/llms.txt`.
- **`skills/doc-hygiene` + `scripts/doc-hygiene.mjs`** — the QA shape for the link-check pass.
- **Real quickstart facts** (verified at grooming): root `packageManager: npm@11` / Node ≥20 / turbo;
  frontend `next dev --turbopack --port 3001`; backend `medusa develop`.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Root README (flagship) + repo map · 1.2 Frontend/backend/zine READMEs + stale-reference sweep | low |

## Deploy order
No deploy — READMEs render on GitHub on merge. Root + zine commit locally (root is the tracked
product-docs repo; zine has no remote). Frontend/backend README changes ride normal LOW-risk PRs in
their own repos (reviewer may auto-merge on green CI); no cross-repo ordering constraint.

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — frontend
      [PR #212](https://github.com/danybgoode/miyagisanchezcommerce/pull/212), backend
      [PR #79](https://github.com/danybgoode/medusa-bonsai-backend/pull/79); root + zine committed
      locally (root: owed push to Daniel per convention; zine: genuinely no remote)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs) — see `sprint-1.md`
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Kill-switch: **n/a** — decided at grooming (docs-only, no runtime seam)
- [x] Feature branch deleted (both app-repo PRs merged with `--delete-branch`); **this README's
      frontmatter `status: shipped`**
