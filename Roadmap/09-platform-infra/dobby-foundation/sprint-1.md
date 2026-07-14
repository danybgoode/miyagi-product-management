# dobby-foundation — portable ways-of-work — Sprint 1: Extract: marketplace + ways-of-work plugin + template + spawn golden-beans

**Status:** ✅ all 4 stories merged — 2026-07-13. Fresh-session plugin-install smoke (walkthrough
steps 1–3) still owed to Daniel by name (see Smoke Walkthrough below). Epic README stays
`status: scaffolded` — epic close (retro + LEARNINGS promotion + poster update) is separate, not done
in this sprint.

## Stories

### Story 1.1 — dobby-foundation repo: marketplace + `ways-of-work` plugin ✅
**Shipped:** `danybgoode/dobby-foundation` commit `b13ae84` (2026-07-13). Re-inventoried `skills/` at
build time per the note below — found `pmo-report` had been added since the scope doc's reuse list
was written (2026-07-11); confirmed with Daniel and included it, so **9** skills moved, not 8. All 4
vendored Stripe-skill symlinks confirmed excluded. `claude plugin validate` clean; non-interactive
`claude plugin marketplace add` + `claude plugin install` verified from a scratch directory — the
plugin resolved to the exact pushed commit SHA and all 9 `SKILL.md` files landed in the local cache.

**As** Daniel, **I want** a `~/dobby/dobby-foundation` git repo (pushed to GitHub) containing
`.claude-plugin/marketplace.json` and a `ways-of-work` plugin carrying the repo-original skills
(`groom` incl. `scaffold-epic.mjs` + `templates/`, `doc-hygiene`, `standup-post`, `weekly-recap`,
`babysit-pr`, `build-order-sync`, `vercel-prune`, `live-smoke` — re-inventory `skills/` at build
time; the list grew once already since grooming), **so that** every project installs and updates the
same skills from one versioned place.
**Acceptance:** in a scratch project, `/plugin marketplace add <org>/dobby-foundation` then
`/plugin install ways-of-work@dobby-foundation` succeed; saying "let's groom X" triggers the groom
skill from the plugin. Skill files carry their `## Gotchas` sections intact (spike conventions).
**Risk:** low
**Notes:** re-verify plugin/marketplace docs at build time (research-preview drift). Vendored Stripe
skills (`.agents/skills/*`) are NOT moved — different distribution class (spike §4). Skills that wrap
repo-local scripts (`vercel-prune`, `build-order-sync`) must document the script dependency: the
script ships in the *template* (1.3), the skill detects its absence gracefully.

### Story 1.2 — medusa-bonsai consumes the plugin ✅
**Shipped:** PR [#89](https://github.com/danybgoode/miyagi-product-management/pull/89), squash-merged
as `f8487a6` (2026-07-13) — one commit on `main`, revert path `git revert f8487a6`. A fresh-reviewer
pass (pr-reviewer subagent) caught a real gap the initial diff missed: 4 cloud-routine prompts and 3
scripts' local Telegram-chat-id config path still pointed at the deleted `skills/<name>/` paths.
Fixed pre-merge — relocated the config convention to `.claude/config/<name>.json`, repointed the
routine prompts + `WAYS-OF-WORKING.md` + root `README.md` + `00-ideas/README.md` to skill-by-name
invocation. Verified: repo-wide grep sweep clean (only historical epic/retro mentions remain),
`node --check` clean on all 5 edited scripts, and a live `node scripts/standup.mjs --dry-run` ran
end-to-end with real `gh` reads. The first commit alone touched no CI-triggering paths
(`.claude/settings.json` + `skills/**`), but the follow-up fix commit touched `scripts/**` and
`Roadmap/**`, which correctly triggered `build-order-guard` + `scripts-guard` + `notion-pr-sync` —
all three ran and passed green on the PR before merge.

**As** Daniel, **I want** this repo switched to the marketplace-installed skills with the in-repo
copies retired (one revert-able commit), **so that** a groom improvement lands once and reaches every
project, with no fork drift.
**Acceptance:** a fresh session in medusa-bonsai grooms a test ask identically to before the switch
(same stages, same scaffolder); `skills-lock.json`/config reflects the marketplace source; reverting
the single commit restores the old state.
**Risk:** low — **shared surface (skills used daily): announce, keep the revert path stated in the PR**

### Story 1.3 — the project template ✅
**Shipped:** `danybgoode/dobby-foundation` commit `87e892e` (2026-07-13), 26 files. Acceptance grep
(`grep -ri "miyagi\|medusa\|es-mx\|clerk" template/`) verified clean. Beyond the copy: every `.mjs`
script syntax-checked, and — a real gap the copy-verbatim approach initially missed — `build-order.mjs`
turned out to shell out internally to `scripts/roadmap-to-notion.mjs --extract`, which hadn't been
copied; caught by actually *running* `node scripts/build-order.mjs --check` against the template's own
empty funnel (not just checking file existence), fixed by copying that script too (2 Miyagi-specific
lines inside it generalized to match the already-generalized SESSION-KICKOFFS.md §2). Re-ran after the
fix: `build-order.mjs --check` reports up to date, and the `scripts-guard` `node --test` glob exits 0
with zero matching files — both CI gates the template ships are proven to actually work, not just
present.

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

### Story 1.4 — spawn golden-beans from the template ✅
**Shipped:** `danybgoode/golden-beans` commit `5de16f1` (2026-07-13), initial commit, 26 files copied
from `dobby-foundation/template/` (with a real project `README.md` replacing the template's own
spawn-instructions README). `.claude/settings.json` wired to the `ways-of-work` plugin. Verified live:
`node scripts/build-order.mjs --check` → up to date on the empty funnel; the `scripts-guard` glob →
0 tests, exit 0; and — confirmed via `gh run list` after pushing, not assumed — both
`build-order-guard` and `scripts-guard` GitHub Actions workflows actually ran on the initial-commit
push and completed **success** (runs `29305671818` and `29305671837`). No paid infra provisioned — the
Growth Engine's own Supabase/Vercel provisioning is out of scope for this story per the plan.

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
  smoke (1.1/1.2, walkthrough steps 1–3) — agent sessions can't fully verify another session's skill
  loading.
- **deterministic gate:** ✅ confirmed. medusa-bonsai's `build-order-guard` + `scripts-guard` +
  `notion-pr-sync` all ran and passed on PR #89 (the follow-up fix commit touched `scripts/**` +
  `Roadmap/**`, correctly triggering them). golden-beans' own `build-order-guard` + `scripts-guard`
  both confirmed green on the initial commit via `gh run list` (not just "the workflow file exists").

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local (`~/dobby/`) + GitHub

1. **⬜ Owed to Daniel.** Open a **fresh Claude Code session** in any scratch folder and run
   `/plugin marketplace add danybgoode/dobby-foundation` → `/plugin install ways-of-work@dobby-foundation`.
   → Both should succeed; `/plugin` lists `ways-of-work` as installed. *(The agent verified the
   non-interactive CLI equivalent — `claude plugin marketplace add` + `claude plugin install` from a
   scratch directory — resolved to the exact pushed commit SHA with all 9 skills cached. The
   interactive `/plugin` slash-command flow in a real session is what's still owed — an agent can't
   fully verify another session's interactive UX.)*
2. **⬜ Owed to Daniel.** In that session say: *"let's groom a test idea: a hello-world tweak."*
   → The groom skill should trigger from the plugin (orient → classify stages start).
3. **⬜ Owed to Daniel.** Open a fresh session in `~/dobby/medusa-bonsai` and say the same.
   → Groom should trigger via the marketplace source; behavior should match pre-switch (stages +
   scaffolder). *(`.claude/settings.json` is in place and the plugin is cached locally, but whether a
   brand-new interactive session actually triggers groom identically is exactly what an agent
   verifying its own session can't prove — see Story 1.2's acceptance note.)*
4. **✅ Agent-verified.** `ls ~/dobby/golden-beans/Roadmap/` and open `WAYS-OF-WORKING.md`.
   → Confirmed: skeleton present (`README.md`, `WAYS-OF-WORKING.md`, `LEARNINGS.md`,
   `SESSION-KICKOFFS.md`, `00-ideas/`); zero Miyagi-specific rules (same grep that gated Story 1.3
   ran clean against the spawned repo too); `AGENTS.md` shows the `## ⚠️ The rules that cannot be
   violated` section as an explicit `TEMPLATE FILL-IN` slot, not Miyagi's five rules.
5. **✅ Agent-verified.** In `~/dobby/golden-beans`, ran `node scripts/build-order.mjs` and checked the
   GitHub Actions tab via `gh run list`.
   → `BUILD-ORDER.md` regenerated clean on the empty funnel (0 epics, 0 seeds, 0 drift); GitHub Actions
   confirmed **green** on the initial-commit push — `build-order-guard` (run `29305671818`) and
   `scripts-guard` (run `29305671837`) both completed with conclusion `success`, checked via `gh run
   list`/`gh run view`, not assumed from the workflow files merely existing.

If steps 1–3 fail, note the step number + what you saw — that's the bug report. Steps 4–5 are already
confirmed working as described above.
