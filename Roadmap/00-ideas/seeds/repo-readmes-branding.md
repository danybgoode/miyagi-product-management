---
title: "Repo cleanup + per-repo READMEs — value prop, engineering practice, product story"
slug: repo-readmes-branding
status: scaffolded
area: "09"
type: chore
priority: wave-3
risk: low
epic: "09-platform-infra/repo-readmes-branding"
build_order: null
updated: 2026-07-09
---

# Repo cleanup + per-repo READMEs

**As** the team (and anyone we recruit, partner with, or who lands on a repo from a PR link), **we
want** each repo's README to tell the real story — what Miyagi is, why the engineering practice here
is unusual, what this specific repo owns — **so that** the repos market the product and the craft
instead of greeting visitors with scaffold boilerplate.

## Class: Chore (docs only) · Stage-2.5 bucket: light enhancement

No new capability — the material already exists in the poster, WAYS-OF-WORKING, and LEARNINGS; this
surfaces it where a repo visitor actually looks. No architecture fork → no planning panel offered.

## Verified current state (groomed 2026-07-09)

| Repo | GitHub remote | README today |
|---|---|---|
| monorepo root | `danybgoode/miyagi-product-management` | Stock **Medusa DTC Starter** scaffold (159 lines) — wrong clone URL (`medusajs/dtc-starter`), `pnpm` quickstart the repo doesn't use (`packageManager: npm@11`), Medusa's own badges/Discord/Twitter |
| frontend `apps/miyagisanchez` | `danybgoode/miyagisanchezcommerce` | Stock **create-next-app** boilerplate (36 lines) — zero Miyagi content |
| backend `apps/backend` | `danybgoode/medusa-bonsai-backend` | Stock **Medusa starter** README (62 lines) — Medusa's marketing, not ours |
| `apps/zine` | **no remote** (local-only repo, no CI/no deploy — LEARNINGS 2026-07-03) | **No README at all** |

Stale-rail check: no Render/Flagsmith references survive in any current README (they're pure scaffold)
— the sweep obligation is (a) the *root* README's factually-wrong setup steps and dead starter links,
and (b) keeping retired rails out of the *new* text. Note the root repo's GitHub name
(`miyagi-product-management`) differs from the local folder / `package.json` name (`medusa-bonsai`);
the new README must use the real GitHub identity. Renaming the repo itself is out of scope (flag if
wanted).

## Rationale

The repos are the public face for exactly the audiences the other seeds court: consultants evaluating
whether the tech is real, partners, potential hires, and merchants' technical friends. The material
writes itself from what already exists — it just isn't surfaced anywhere a visitor looks.

## What already exists (reuse, don't rebuild — source material, not code)

- **`Roadmap/README.md` (poster)** — the mission paragraph + full feature map: the one-paragraph
  product story is lifted from here, not re-written.
- **`Roadmap/WAYS-OF-WORKING.md`** — the engineering-practice highlights: grooming front door
  (`skills/groom`), cross-agent review + planning panel (`scripts/cross-review.mjs` /
  `cross-panel.mjs`), risk tiers + who-merges rule, deterministic CI gate + sprint smoke walkthroughs,
  model split (Opus plans / Sonnet builds), Claude Routines. Link, don't paraphrase at length.
- **`Roadmap/LEARNINGS.md`** — the proof the practice is real; linkable as-is.
- **`apps/miyagisanchez/AGENTS.md`** — the five rules; the frontend README's practice anchor.
- **Deploy-topology facts** (WAYS-OF-WORKING + LEARNINGS): root repo versions product/orchestration
  docs (`Roadmap/`, `tasks/`, `skills/`, `scripts/`, `infra/`); the two app repos are independent and
  git-ignored here; frontend → Vercel (per-branch previews); backend → Cloud Build us-east4 → Cloud
  Run `medusa-web` (~12 min, no preview); `apps/zine` local-only, no deploy.
- **Public product surfaces** to link for the story: `miyagisanchez.com`, `/acerca`, `/agent`,
  `/llms.txt` (the agent-readable about surface).
- **`skills/doc-hygiene` + `scripts/doc-hygiene.mjs`** — the QA shape for the link-check pass.

## Scope

One README pass per repo, each with the same five-part contract:

1. **Product story** — one paragraph, from the poster's mission (what Miyagi is, in plain language).
2. **What this repo owns** — its place in the four-repo topology + how it deploys (or that it
   doesn't, for zine).
3. **Engineering-practice highlights** — honest, concrete, each claim linking the real doc/script
   that backs it (root README carries the full story; app READMEs carry a short version + pointer).
4. **Quickstart** — real commands verified against the repo's actual `package.json` (root: npm 11 /
   Node ≥20 / turbo; frontend: `next dev --turbopack --port 3001`; backend: `medusa develop`) — never
   the starter's dead `pnpm`/`@dtc/*` instructions.
5. **Pointers** — root README adds the repo map linking the other three; app READMEs point back.

Plus the cleanup: all stock scaffold text, badges, and dead starter links removed; no references to
retired rails (Render, Flagsmith) in the new text. READMEs are **English** (WAYS-OF-WORKING language
rule — these are docs, not app copy).

**Out:** restructuring code or moving files; renaming repos or changing visibility; invented badges
or claims a linked doc can't back; public marketing-site copy (that's `/acerca` + `/vende`, already
runtime-editable); open-sourcing decisions; fixing the root `package.json`'s own scaffold remnants
(stale `@dtc/*` turbo filters — code, not docs; README just won't repeat its broken commands).

## Slicing — single sprint, 2 stories, both LOW

**S1.1 — Root README (flagship) + repo map.** As the team, we want the root repo's README to carry
the whole story — mission paragraph, the four-repo map with what each owns and how it deploys, the
engineering-practice highlights with links, an honest quickstart, and pointers into `Roadmap/` — so a
visitor understands the product and the craft in one read.
*Acceptance:* no DTC-starter text/badges/links remain; every relative link resolves; every practice
claim links its backing doc; quickstart commands match `package.json` reality; repo referred to by
its real GitHub name.
*QA:* link-check pass (doc-hygiene shape: every relative path exists); `grep -i flagsmith` clean.

**S1.2 — Frontend/backend/zine READMEs + stale-reference sweep.** As the team, we want each app
repo's README to say what it owns, how it deploys, and how to run it (zine's created from scratch,
stating its local-only/no-deploy status honestly) — so a PR-link visitor to any repo lands on the
real story, not create-next-app/Medusa boilerplate.
*Acceptance:* zero scaffold boilerplate in any of the three; each carries the five-part contract
sized to the repo; frontend links `AGENTS.md`; each points back to the root repo; links resolve.
*QA:* same link-check + retired-rail grep per repo. App-repo README changes ride normal PRs (LOW —
reviewer may auto-merge on green CI); zine commits locally.

**Voice:** same bar as the panfleto content criteria — concrete, no fluff, no self-congratulation the
linked docs can't back.

## Kill-switch: n/a (docs — LOW, no runtime seam)

## QA / smoke

Deterministic: link-check pass per README (every relative link target exists) + retired-rail grep.
Smoke: **Daniel reads them** — the acceptance is "would you send this link to a consultant?"

## Open questions (resolve at the scope-doc gate)

1. **Repo visibility** — couldn't verify public/private from the sandbox (no GitHub egress). Content
   works either way; if private, "audience" = invited collaborators/hires, same text.
2. **Root repo name** — write to `miyagi-product-management` as-is, or is a rename to something
   product-true wanted first? (Rename = out of scope here; would ripple clone URLs.)
3. **Zine README** — confirmed in scope despite no visitors (no remote)? It doubles as the orientation
   doc agents lack today (LEARNINGS shows agents repeatedly rediscovering zine's local-only status).
