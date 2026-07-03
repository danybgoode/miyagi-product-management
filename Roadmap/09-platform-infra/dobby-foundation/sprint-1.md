# dobby-foundation — portable ways-of-work — Sprint 1: Extract: marketplace + ways-of-work plugin + template + spawn golden-beans

**Status:** ⬜ not started

## Stories

### Story 1.1 — dobby-foundation repo: marketplace + `ways-of-work` plugin
**As** Daniel, **I want** a `~/dobby/dobby-foundation` git repo (pushed to GitHub) containing
`.claude-plugin/marketplace.json` and a `ways-of-work` plugin carrying the repo-original skills
(`groom` incl. `scaffold-epic.mjs` + `templates/`, `doc-hygiene`, `standup-post`, `weekly-recap`,
`babysit-pr`, `build-order-sync`, `vercel-prune`), **so that** every project installs and updates the
same skills from one versioned place.
**Acceptance:** in a scratch project, `/plugin marketplace add <org>/dobby-foundation` then
`/plugin install ways-of-work@dobby-foundation` succeed; saying "let's groom X" triggers the groom
skill from the plugin. Skill files carry their `## Gotchas` sections intact (spike conventions).
**Risk:** low
**Notes:** re-verify plugin/marketplace docs at build time (research-preview drift). Vendored Stripe
skills (`.agents/skills/*`) are NOT moved — different distribution class (spike §4). Skills that wrap
repo-local scripts (`vercel-prune`, `build-order-sync`) must document the script dependency: the
script ships in the *template* (1.3), the skill detects its absence gracefully.

### Story 1.2 — medusa-bonsai consumes the plugin
**As** Daniel, **I want** this repo switched to the marketplace-installed skills with the in-repo
copies retired (one revert-able commit), **so that** a groom improvement lands once and reaches every
project, with no fork drift.
**Acceptance:** a fresh session in medusa-bonsai grooms a test ask identically to before the switch
(same stages, same scaffolder); `skills-lock.json`/config reflects the marketplace source; reverting
the single commit restores the old state.
**Risk:** low — **shared surface (skills used daily): announce, keep the revert path stated in the PR**

### Story 1.3 — the project template
**As** Daniel, **I want** `dobby-foundation/template/` holding the copy-once skeleton — `Roadmap/`
(poster skeleton, generalized `WAYS-OF-WORKING.md`, `LEARNINGS.md` seeded with the transferable
subset, `00-ideas` funnel), `AGENTS.md` skeleton with a **per-project rules slot**, CI workflows
(deterministic gate + build-order guard), `scripts/` (build-order, cross-review, cross-panel,
routines, `.githooks`), and the Playwright `api` harness shape — **so that** a new project starts
with the operating system on day one.
**Acceptance:** `grep -ri "miyagi\|medusa\|es-MX\|clerk" template/` returns nothing project-specific
(universal docs only); WAYS-OF-WORKING keeps cadence/DoR/DoD/risk-tiers/QA-gate and marks
deploy-rail specifics as per-project variables.
**Risk:** low

### Story 1.4 — spawn golden-beans from the template
**As** Daniel, **I want** `~/dobby/golden-beans` created from the template (own git repo, marketplace
added, plugin installed), **so that** the Growth Engine builds inside the extracted system — the
dogfood proof.
**Acceptance:** in a fresh golden-beans session, groom triggers from the plugin;
`node scripts/build-order.mjs` runs green on the empty funnel; CI workflow passes on the initial
commit; the Growth Engine epic (scope doc S1–S4) can scaffold into `golden-beans/Roadmap/`.
**Risk:** low

## Sprint QA
- **api spec(s):** none — no app surface. The deterministic checks are: template CI green on
  golden-beans' initial commit (1.4) + `build-order.mjs` green in both repos.
- **browser smoke owed:** no money/auth steps. **Owed to Daniel:** the fresh-session plugin-install
  smoke (1.1/1.2) — agent sessions can't fully verify another session's skill loading.
- **deterministic gate:** medusa-bonsai's normal gate must stay green after 1.2 (no app code touched);
  golden-beans' own gate green at 1.4.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local (`~/dobby/`) + GitHub

1. Open a **fresh Claude Code session** in any scratch folder and run
   `/plugin marketplace add <org>/dobby-foundation` → `/plugin install ways-of-work@dobby-foundation`.
   → Both succeed; `/plugin` lists `ways-of-work` as installed.
2. In that session say: *"let's groom a test idea: a hello-world tweak."*
   → The groom skill triggers from the plugin (orient → classify stages start).
3. Open a fresh session in `~/dobby/medusa-bonsai` and say the same.
   → Groom triggers via the marketplace source; behavior matches pre-switch (stages + scaffolder).
4. `ls ~/dobby/golden-beans/Roadmap/` and open `WAYS-OF-WORKING.md`.
   → Skeleton present; no Miyagi-specific rules; AGENTS.md shows the per-project rules slot.
5. In `~/dobby/golden-beans`, run `node scripts/build-order.mjs` and check the GitHub Actions tab of
   its repo.
   → Script green on the empty funnel; initial-commit CI run green.

If any step fails, note the step number + what you saw — that's the bug report.
