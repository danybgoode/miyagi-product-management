# Ways of Working

How Daniel (product owner) and Claude (builder) ship product together. Lightweight scrum: small slices, plan first, ship the moment each slice works.

---

## Roles

- **Daniel — Product Owner & Reviewer.** Sets direction, approves plans, tests each shipped slice, makes the consequential calls (architecture forks, infra, money).
- **Claude — Builder.** Researches, proposes the plan as user stories, builds, verifies, ships, and documents.

**Orientation before building.** Many asks are solvable with existing features + communication or a light
enhancement, not net-new work (e.g. "restaurant delivery" may already be servable via arranged-delivery +
a service listing + the right copy). Surface that path *first*; build new only when the outcome genuinely
needs it. The `groom` skill gates on this (Stage 2.5).

## The unit of work: the user story

Everything is sliced into **user stories** — the smallest piece of independently testable, shippable value. Format:

> **As a** \<role\>, **I want** \<capability\>, **so that** \<outcome\>.
> **Acceptance:** plain-language checks Daniel can run.

Stories roll up into **Sprints**, sprints into an **Epic**, epics live under a **Macro-section** (product domain). See `Roadmap/README.md`.

## The cadence (our core loop)

We now work on **feature branches and merge to `main` via PR** (gitflow) — multiple agents run in
parallel on their own branches, so `main` stays clean and conflict-free. `main` is the production line:
merging to it deploys.

```
Plan → Branch + scaffold docs → Build story → Verify → QA/smoke-test (preview) → push → Daniel reviews preview → … → PR → merge to main → (epic close: poster + retro)
```

1. **Plan.** For non-trivial work, Claude enters plan mode, writes a plan as user stories, and Daniel approves before code. **Every plan names a QA / smoke-test stage** with the specific checks and tools. Reference end-states (spec docs) are inspiration, never signed-off scope. Every scope seed also names which UX rails (CI guards, the audits lens, design-language debt) cover its surface — the `groom` skill's Stage 4 reuse list (`groom/templates/scope-seed.md` in the `ways-of-work` plugin, dobby-foundation marketplace).
2. **Branch + scaffold docs.** Create one working branch per epic — `feat/<epic-slug>` (or `fix/…`, `chore/…`) — off the latest `main`, in each repo you'll touch. On it, *before any code*, scaffold the epic `README.md` + per-sprint files under the right macro-section (plain-language stories + acceptance). The build runs against these docs; Daniel sees scope as it grows. Keep them current as stories land (✅ ticks, commit refs); retrospective at epic close.
3. **Build one story at a time.** Iterative. Reuse before rebuild. Commit per story to the branch (`Co-Authored-By: Claude` trailer).
4. **Verify.** Type-check + lint clean, build passes.
5. **QA — the deterministic gate (pre-merge) + the live confirmation (split).** Two distinct layers; don't conflate them.
   - **Deterministic gate — must be green BEFORE merge:** `tsc --noEmit` + `npm run build` + the Playwright suite, run by the building agent. This is non-negotiable — nothing merges on a red gate. Where the acceptance check is browser-/API-testable, add **one** Playwright spec as part of the story.
   - **Run the suite against the branch's Vercel preview** (`PLAYWRIGHT_BASE_URL=<preview-url>`). Note: previews are **SSO-protected** (401 to anonymous curl/Playwright), so the harness uses a **Vercel protection-bypass token** (`x-vercel-protection-bypass` header) to reach them. Without that token the preview is unreachable and the suite falls back to prod-after-merge.
   - **Live confirmation can be async + divided** (it's *confirmation*, not the gate): the agent owns API-level smoke (`curl`/Playwright) where it has access; **Daniel owns the browser / real-seller-session smoke** (he's notified when Cloud Run finishes and holds the live sessions/tokens). Exercise real behaviour — a disposable/test shop for anything that mutates data; clean up after (revoke test tokens).
   - **Backend (Cloud Run) has no per-branch preview** — it can only be confirmed *post-merge* against prod. The agent does the API-level prod smoke + a route-deployed probe; Daniel picks up the seller/browser parts. State this split in the PR.
6. **Push as you go.** Each push updates the preview; the reviewer (and Daniel) can test per story without touching production.
7. **PR → review → merge to `main`.** Open a PR early (draft is fine) via `gh`; keep it updated with a self-QA note **and a risk tier** (see *Review & merge* below). **Flip the PR draft → ready-for-review the moment the deterministic gate is green and the self-QA note is posted** (updated 2026-07-15): a draft means *still building*, ready means *review me* — this is also what the roadmap board's Lifecycle overlay reads (draft PR → In progress, ready PR → In review), so leaving finished work in draft hides it in the "In review" column. Set the sprint doc's `Status:` line to `🟦 In review` at the same moment. Run the **mandatory cross-agent review** (`node scripts/cross-review.mjs <PR#>`), plus the fresh-reviewer subagent if the tier or your judgment calls for it — either way a fresh agent, never the builder (see *Review & merge* below). When the deterministic gate is green, every review finding is resolved, and the merge is authorized for the PR's risk tier, merge to `main`. **Merging to `main` is the production deploy** (frontend → Cloud Build us-east4 → Cloud Run `miyagi-web` behind Cloudflare — Vercel prod deploys disabled since the 2026-07-10 cutover, Vercel survives only as the per-PR preview + CI target; backend → Cloud Build us-east4 → Cloud Run `medusa-web`, ~12 min). **After merge, confirm the Cloud Build actually succeeded** (`gcloud builds list --region=us-east4`) — CI green is the preview, not the prod image. Small epics merge once; larger ones may merge per sprint. Delete the branch after merge.
8. **Continue / close.** Roll into the next story. At **sprint close**, emit the sprint-wrap terminal summary (`SESSION-KICKOFFS.md` §7) — a thin pointer to the sprint doc + what's owed/next, never a re-summary. At **epic close**, do the epic Definition of Done (below) — including updating the product poster. **Close-out prose (retro, poster entry, sprint-wrap) may be first-drafted by `node scripts/prose-draft.mjs`** (cheap different-family model, house-voice prompt, file-derived inputs only) — the coordinating agent **must edit the draft for factual accuracy before committing** (drafts invent plausible gaps; the banner says so). PR bodies stay with the builder — they're cheapest written by the agent holding the context.

## Review & merge — cross-agent
With multiple agents running in parallel, the agent that **builds** a PR is not the one that **approves** it — a
fresh pair of eyes re-derives intent from the diff alone and catches what the author's context-bias hides.
**Three layers** do this, and the review stack is now **right-sized by risk** (Daniel's call, 2026-07-14):
CI always, cross-agent review always, and the fresh-reviewer pass **on HIGH tier or on judgment**.

| Layer | When | Blocks merge? |
|---|---|---|
| **CI** — deterministic gate | Every PR, both repos | Yes — red CI blocks |
| **Cross-agent review** (`cross-review.mjs`) | **Mandatory, every PR** | Its **findings** must be resolved before merge; the run itself never *authorizes* one |
| **Fresh reviewer subagent** (`pr-reviewer`) | **Mandatory on HIGH tier.** Optional on LOW once cross-review findings are addressed | Only when run: an unresolved blocking finding blocks merge |

- **CI (determinism):** GitHub Actions runs a deterministic gate on every PR in **both repos** — the tireless
  gate that never forgets or runs out of tokens; a red CI blocks merge.
  - **Frontend** (`apps/miyagisanchez`): `tsc` + `next build` + the Playwright suite against the PR's Vercel
    preview (via the protection-bypass token).
  - **Backend** (`apps/backend`): `medusa build` (which also generates the `.medusa/types` that `tsc` needs) →
    `tsc --noEmit` → `npm run test:unit` (`ci.yml`, on `pull_request`). The backend has **no per-branch preview** (it deploys
    post-merge to Cloud Run), so there is **no Playwright/e2e step** — that's correct, not a gap; DB-bound
    integration tests are out of the gate (they need Postgres). The `Type-check + build + unit` check is wired
    into the backend repo's branch protection as a **required status check** on `main`, so a red run blocks
    merge (configured 2026-06-14).
- **Cross-agent review (MANDATORY on every PR):** `node scripts/cross-review.mjs <PR#>
  --agent codex|antigravity` pipes the PR diff into a **different model family's** CLI (Codex or Antigravity)
  for one pass and posts the findings as a clearly-labeled PR comment. It exists to surface another
  family's blind spots, and it has earned the promotion from advisory to required — it caught real bugs in
  3 of 4 PRs in the 2026-07-17 batch alone (see `LEARNINGS.md`). **Run it on every PR, and resolve every
  finding before merge** — fix it, or answer it on the PR with the reason it isn't a bug. An unanswered
  finding blocks the merge; the *run* still never **authorizes** one (CI + the risk-tier rule below stay
  the sole sources of merge authority). It is **single-pass** (no debate loop) and reads the same shared
  prompt the Claude reviewer does (`scripts/cross-review.prompt.md` — the five `AGENTS.md` rules + this
  single-pass discipline).
  `--skip-trivial` skips docs-only / tiny diffs. The agy path is **version-pinned and fail-loud**
  (a young CLI's print contract breaks on minor bumps); when the pin check dies, agents are
  **pre-authorized** to run `node scripts/agy-doctor.mjs --fix` — it re-verifies the live contract and
  bumps the pin only on a green probe — and commit the one-line bump (LOW tier). Model swaps or a
  failed probe still escalate to Daniel. *(It runs **locally**, not in CI: a GitHub runner has no
  codex/agy auth — codex needs a token-billed API key + a cross-repo PAT and agy has no headless auth at all;
  epic `09-platform-infra/cross-agent-review-always` chose local-only. Mandatory therefore means **an agent
  must run it before merging**, not that a required status check enforces it.)*
- **Fresh reviewer (judgment) — MANDATORY on HIGH tier, optional on LOW:** a **fresh reviewer agent**
  re-derives intent from the diff alone and checks correctness, architecture, and the five rules from
  `AGENTS.md`. The path is a **repo-local reviewer subagent** — `.claude/agents/pr-reviewer.md`, invoked as
  *"use the pr-reviewer subagent on PR #N"* (paste the builder's report; it falls back to the PR body). It
  verifies the report's claims against the real diff, `origin/main`, sibling-repo PR state, and these process
  docs — read-only, single-pass; it composes with parallel agents and needs no external service. It must be a
  different agent than the one that built the PR.
  - **HIGH tier → always run it.** It repeatedly caught real money-path issues the cross-agent pass missed
    (catalog-management S6's IDOR, arranged-only-delivery S2, and the redirect-following SSRF bypass in the
    2026-07-17 batch). On HIGH, the two layers have never been redundant.
  - **LOW tier → optional**, once cross-review findings are addressed. Run it anyway when judgment says to:
    a diff wider than its story, a shared-surface or `lib/` seam other epics import, a security-shaped
    change, a sweep whose "everything else is fine" claim nobody has re-derived, or anything the cross-agent
    pass flagged and you argued down. Skipping it is a **judgment call to state in the PR body**, not a
    default to exercise silently.
  Either way, keep review a **single pass on a green CI gate** — not an iterative refine loop (that loop is
  the dominant token cost in multi-agent dev; let the deterministic gate, `tsc` + `build` + Playwright, carry
  the repetitive checking and have the reviewer read once). **Do not use the `/code-review ultra` cloud
  command — it is not set up for this repo.**

**Every PR declares a risk tier** (in the PR body); that tier decides who may merge:
- **Low-risk → an agent other than the builder may merge** once CI is green and the **cross-agent review is
  clean or its findings are answered** — the reviewer when one ran, otherwise the orchestrating agent. (The
  fresh-reviewer pass being optional here doesn't lower the bar; it moves the bar onto the mandatory
  cross-agent layer.) LOW = docs/copy, non-commerce UI, additive agent tools behind auth, tests, internal
  tooling.
- **High-risk → always a Daniel merge** (a human green-light, never an autonomous ship): anything touching
  **payments / checkout / fulfillment / auth / DB migrations / shared infra / money**. This preserves the
  live-commerce guardrail — an agent never deploys real-money paths to production on its own. HIGH also
  carries the **mandatory fresh-reviewer pass** above.
When unsure which tier, treat it as high-risk. High-risk epics are also *planned behind a kill-switch*
at grooming (the flag is decided + sliced there, verified at epic DoD — not a new gate); see
the `groom` skill (`ways-of-work` plugin, dobby-foundation marketplace) Stage 6b.

## Definition of Ready (a story can start)
- The "as a / I want / so that" is clear and the acceptance check is testable.
- It's a slice that can ship on its own.

## Definition of Done (a story)
- Acceptance criteria met and confirmed working.
- Type-check + lint + build clean.
- **Smoke-tested** (on the branch's preview where applicable). The story's real behaviour is exercised
  end-to-end with an appropriate tool — the `live-smoke` skill (`node scripts/live-smoke.mjs`,
  apps/miyagisanchez) is the **default** for rendered-page verification, cross-agent (Codex/Antigravity
  can run it too, no Claude-specific tooling); `curl`, a Playwright spec, or a real artifact render fit
  API-only/non-browser checks. **Claude-in-Chrome stays a narrow fallback** — the one thing it can do that
  `live-smoke` structurally cannot is an *authed* check against **production** (Clerk rejects its
  testing-token bypass for prod secret keys by design). Never "build passes, therefore done." If a live
  smoke test genuinely can't run (no test account, money-/account-gated), that gap is stated explicitly in
  the PR rather than glossed.
- **Every new spec was observed failing (red) at least once** — via a deliberate
  break-the-implementation mutation check if the test was written after the code. This verifies
  the spec isn't a false-positive tautology; it is **not** an ordering mandate — don't force
  test-first (agents often do it anyway).
- Committed to the feature branch; sprint doc status ticked.

## Definition of Done (an epic) — the close-out checklist
When the last story of an epic is merged, the epic is not "done" until ALL of these are true:
- [ ] All sprints' stories merged to `main` and smoke-tested (gaps stated).
- [ ] **Each sprint has a fool-proof smoke walkthrough in its `sprint-N.md`** — numbered steps, one
      action + one expected result each, using **real production URLs** once deployed (preview URLs
      pre-merge). Money/auth/checkout steps are flagged by name as **owed to Daniel** (an automated
      browser smoke can't fully cover them). Format + example: `groom` skill, Stage 8b.
- [ ] Epic `README.md` marked ✅ complete; every `sprint-N.md` status ticked with commit refs.
- [ ] **`RETROSPECTIVE.md`** written alongside the epic (what shipped / went well / learned / gaps).
- [ ] **Product poster updated — `Roadmap/README.md`.** Find the epic's macro-section in the **Feature map**
      and update its line(s) to reflect what's now live (✅), and add a **Recent highlights** entry. If the
      epic introduces a capability the poster doesn't mention, add the line. The poster is the at-a-glance
      product source of truth — it must never lag a shipped epic.
- [ ] Team memory updated (epic memory + the index in `MEMORY.md`).
- [ ] **`Roadmap/LEARNINGS.md` updated** — promote any durable, generalizable learning from the
      `RETROSPECTIVE.md` into the right section (one-liner + *why* + date/source). Dedupe — sharpen
      the existing line, don't append a near-duplicate. This is how a retro reaches the next agent.
- [ ] **Kill-switch (if one was planned at grooming):** the flag slice shipped and the flag exists in
      Flagsmith (or Edge Config, for Edge seams) with the polarity the scope doc stated (kill-switch ⇒
      default `true`, created **enabled**; enablement ⇒ default `false`, created **disabled**). This
      **verifies** planned work — it is **not** a new build-time gate. Whether a high-risk epic needs a
      kill-switch is decided at **grooming** (the `groom` skill, `ways-of-work` plugin, Stage 6b), not discovered here.
- [ ] Feature branch deleted; PR merged.

## Automated QA — where we are
The Playwright harness has **two layers** and grows by **one spec per new browser-/API-testable story** —
coverage accretes with the work, not as a separate project. A spec replaces the equivalent hand-driven run on
every future change: deterministic, fast, cheap. Details: `apps/miyagisanchez/e2e/README.md`.

- **`api` project — the deterministic gate (always-on).** `npm run test:e2e`, API-level via the `request`
  fixture, no browser binaries. **GitHub Actions CI** runs `tsc` + `build` + this on every PR against the
  SSO-gated branch preview (via the **Vercel protection-bypass token**, sent as `x-vercel-protection-bypass`).
  Must be green before merge.
- **`browser` project — opt-in real-browser smoke (NOT the gate).** `npm run test:e2e:browser`, Chromium,
  `*.browser.spec.ts`. Asserts *rendered* UI an API call can't see (a field renders before the CTA, a counter
  ticks, a required nudge fires). Kept out of the blocking gate (binaries are heavy/slow); runs on demand and
  nightly via `.github/workflows/browser-smoke.yml`. A browser spec **replaces a browser smoke previously owed
  to Daniel** — many client-island assertions even work anonymously (no login). Authed/epic smokes read
  `MS_TEST_*` secrets and **skip gracefully** when unset. **`live-smoke` (skill, `scripts/live-smoke.mjs`)
  wraps this project as the default interactive verification tool** — `--path` for an ad-hoc "does this
  render right" check during a build (nothing permanent left behind), `--spec` to run an existing committed
  spec by name. See the `live-smoke` skill (`ways-of-work` plugin, dobby-foundation marketplace) for the
  full env × auth matrix and the Claude-in-Chrome fallback boundary.
  - *Owed (Daniel, one-time):* the `MS_TEST_*` repo secrets — buyer/seller password-auth accounts +
    `MS_TEST_PERSONALIZED_LISTING_ID` — so the credentialed/epic browser smokes light up (they skip until then).

## Documentation map
- **`Roadmap/`** — product source of truth (this folder). Plain language, no tech. Macro-section → Epic → Sprint → Story, plus the feature poster.
- **`Roadmap/LEARNINGS.md`** — the distilled, cross-cutting wisdom from past epics' retrospectives.
  **Read it at session start** (it's in AGENTS.md "Start here"). Fed at every epic close — see the
  epic Definition of Done. The full story of any item stays in its epic `RETROSPECTIVE.md`; this is
  the transferable digest so a retro reaches the *next* agent instead of dying in its folder.
- **`Roadmap/00-ideas/`** — the idea funnel: `seeds/` (one .md per idea, lifecycle in **frontmatter** — no folder shuffling), `audits/` (UX/UI findings), and `BUILD-ORDER.md` — a **generated** status board (`node scripts/build-order.mjs`, CI-guarded), **never hand-edited**. See `00-ideas/README.md`. **Status SSOT = each epic README's frontmatter `status:`** (seed frontmatter owns only the un-scaffolded funnel); `BUILD-ORDER.md` **and** the Notion roadmap are both *derived views* of it — regenerated, not maintained. CI (`build-order-guard.yml`) fails if the board is stale; for a local pre-commit catch, opt in with `git config core.hooksPath .githooks`.
- **`tasks/`** — engineering delivery log: what was built, decisions, commit hashes, runbooks, known limitations.
- **Team memory** (`~/.claude/.../memory/`) — durable cross-session facts and pointers.
- **Retrospectives** — one per epic/sprint, alongside the epic.

## Conventions
- **Doc conventions (Roadmap tree).** Epic docs have a canonical shape — checked by
  `scripts/doc-format.mjs` (`node scripts/doc-format.mjs` for a full-tree report,
  `--check` for the CI-gate mode `doc-format-guard.yml` runs). **SSOT = the `groom` plugin's
  scaffolding templates** (`skills/groom/templates/` in the `ways-of-work` plugin,
  `dobby-foundation` marketplace) — proven canonical by the zero-drift `00-ideas/seeds/*.md`
  control group (one authoring path, 81 files, identical shape; epic READMEs drift because
  they get hand-edited after scaffolding, away from the template). If a template changes,
  update `doc-format.mjs`'s rules to match — the checker tracks the template, not the other
  way around.
  - **Epic README header** (the line right after the `# Epic: <title>` H1):
    `> **Area:** <NN · Macro name> · **Risk:** <level> · **Class:** <Feature|Spike|Bug|Chore> · **Scope seed:** [\`00-ideas/seeds/<slug>.md\`](../../00-ideas/seeds/<slug>.md)`
    — single line, that field order. `Class` is the Stage-2 classification (a fixed 4-value
    enum, not free text — a longer description belongs in `## Why`). Optionally append
    `· **Archetype:** <tag>` after Class (omit for the Builder default). **Scope seed always
    links to `seeds/`** — `2. readyforscope/` is documented legacy
    (`00-ideas/README.md`); if an epic was scaffolded from a readyforscope doc with no
    `seeds/` entry, link there instead and migrate when convenient, don't fabricate a file.
  - **Frontmatter**: `status:` (one of `scaffolded | in-progress | shipped | archived`) +
    `slug:`. **Read-only to any tooling** — never rename/rewrite the `status` key or its
    values; `scripts/roadmap-to-notion.mjs`'s `Lifecycle ?? Status` fallback depends on it.
  - **Definition of Done heading**: exactly `## Definition of Done (epic)` (not `## Epic
    Definition of Done` or any other variant).
  - `## Context` tables and a `## Five-rules check` section are optional — present-or-absent,
    never flagged either way.
  - **Sprint files**: the Status line is plain and alone — `**Status:** ⬜ not started` (no
    blockquote, no Epic backlink, no Risk combined on the same line).
  - **Retrospectives**: header is `_Closed: YYYY-MM-DD_` (italic, not bold), followed by
    exactly these 4 sections in order: `## What shipped`, `## What went well`,
    `## What we learned`, `## Gaps / follow-ups`. Extra sections beyond these 4 are allowed,
    never flagged.
  - **Gate policy**: incremental, matching every prior guard here — `doc-format.mjs`'s
    `ENFORCED_SWEPT_PATHS` allow-list hard-gates only macro-sections that have actually been
    swept to canonical shape; everything else is visible-but-advisory in the full report.
    `status: archived` epics are frozen historical record, never added to the enforced set.
  - **Automatic catch-as-you-edit**: a `PostToolUse` Claude Code hook (checked into
    `.claude/settings.json`, not per-user `.local.json`) runs `doc-format.mjs --hook` on any
    `Write`/`Edit` to `Roadmap/**/*.md` — surfaces drift to the acting agent (non-zero exit,
    findings on stderr) so it can offer a fix; it does not silently auto-rewrite the file.
- **Gitflow.** Branch off `main` per epic (`feat/<slug>`); commit per story; PR → merge to `main`. Never
  commit feature work straight to `main`, and never force-push a shared branch. Rebase/merge latest `main`
  into a long-running branch before opening the PR. Roll back a bad merge with `git revert` on `main`.
  (Two repos deploy separately — see the deploy topology in memory; branch in each repo you touch.)
- **Branch + preview hygiene (at merge, and as a periodic sweep).** Deleting a merged branch does **not**
  remove its **Vercel preview deployments** — Vercel retains every deployment forever, so dead branches
  pile up dozens of stale previews (production deployments are your rollback history and are left alone).
  After deleting merged branches, prune their previews: **`node scripts/vercel-prune-previews.mjs`**
  (dry-run by default; `--apply` to delete; `--age N` for "older than N days"; **`--keep-branch <a,b>` for any
  branch with an OPEN PR** — its preview is the live review target). Same cadence as the branch cleanup itself;
  run it per-repo project (`--project`). Pair the two: delete merged branches → prune their previews.
- **Planning commits — own worktree + path-limited.** Planning/scaffold work commits to the monorepo-root
  repo, and **multiple planning sessions running in the same shared worktree collide the git index** (a bare
  `git add Roadmap/` stages a sibling agent's in-flight files → "another git process is running" / index lock
  errors). Two rules remove the contention: (1) **commit only your own paths** — `git add <specific files>`
  then `git commit -- <those paths>` (never `git add Roadmap/` or `git add -A`); and (2) for parallel planning,
  **give each planning session its own `git worktree`** (app code already does this via `.worktrees/`; planning
  must too), or appoint a single **scribe** for shared files like `BUILD-ORDER.md`. Path-limited commits are the
  single highest-leverage habit — they keep each commit clean regardless of what else is in the shared index.
- **Model tiers — Opus 4.8 plans, Sonnet 5 builds; escalate rather than guess.** The leverage is in getting
  the *foundation* right — grooming, spikes, plan mode, review — so run those on **Opus 4.8** with full
  deep-thinking, and don't rush them. Once the plan and slices are approved, per-story execution is
  mechanical, so **Sonnet 5** runs the build; Claude Code's plan-mode largely automates this hand-off, so
  there's nothing to micromanage mid-session. **Escalate-don't-guess:** a Sonnet-5 build session stops and
  asks / hands back to Opus — instead of inventing an answer — on the same triggers as the **high-risk tier**
  defined above (*Review & merge*): payments / checkout / fulfillment / auth / DB migrations / shared infra /
  money — **plus** plan ambiguity, a decision the plan doesn't cover, or a repeated failed attempt (2+ tries
  at the same problem). Default to escalate when unsure. This is a default, not a constraint — a story that
  still carries real judgment or money-path risk stays on the strong model end to end. Planning in Cowork;
  building in Claude Code.
- **Docs track code — verified, not generalized.** A canonical rule (the AGENTS five rules, `conventions.md`)
  must reflect what the code *actually* does, checked against it — **don't globalize a scoped learning** into a
  site-wide rule ("the seller portal is es-MX" ≠ "the site has no English"; the dictionary + sweepstakes + embed
  are bilingual). On the product poster (`README.md`), **✅ means enforced in code**, not merely intended —
  partial/aspirational is 🚧. Run a lightweight **drift audit** periodically (paths · imports · env vars · routes ·
  key policy claims vs the codebase); it's a strong fit for a Claude Code dynamic-workflow doc-audit.
- **Never use the Vercel CLI to deploy.** Deploys are git-driven only. For the frontend, pushing a branch
  gets you a **Vercel preview** and merging to `main` builds the **production image on Cloud Build → Cloud Run
  `miyagi-web`** — Vercel prod deploys have been disabled since the 2026-07-10 cutover, so `vercel --prod`
  would not even reach production; it would push a stray out-of-band deployment. Same rule for the backend
  (merge to `main` → Cloud Build → Cloud Run `medusa-web`).
- Commit messages end with the `Co-Authored-By: Claude` trailer.
- **Language.** Docs are written in **English** — everything under `Roadmap/` (epic READMEs, sprint files,
  retrospectives, the poster, `LEARNINGS.md`), `tasks/`, code comments, and PR descriptions. The **only**
  exception is user-facing app copy, which is `es-MX` (Spanish, Mexico) to match the live app. App copy is
  **es-MX by default, with a defined bilingual allow-list** — a `locales/{es,en}.json` dictionary (~119 keys)
  feeds a named set of genuinely bilingual surfaces (`app/terminos`, the sweepstakes public flow, the embed
  widget). The gate has two parts: **es-MX copy-completeness everywhere** (no orphan/hardcoded strings) and
  **both `es`+`en` present on the allow-list** (see AGENTS rule #5). Don't make a new surface bilingual by
  default — extend the allow-list deliberately.
- Build from existing primitives first (commerce lives in Medusa; non-commerce/editorial data in Supabase).
- `Roadmap/` **is tracked in git** — in the **monorepo-root repo**, which versions the product /
  orchestration docs (`Roadmap/`, `tasks/`, `skills/`, `infra/`, root configs). The two app repos under
  `apps/` stay independent and are **git-ignored here** (they have their own repos + deploy rails), as are
  `.worktrees/`. Tracking gives product docs history, blame, and backup — note worktrees already reach
  `Roadmap/` by relative path, so this is about versioning, not access. Doc-only changes are **low-risk
  tier**. Commit planning work as `plan(<epic-slug>): …`. Keep app secrets out of these docs (history).
- **Session hygiene (long epics).** Running a whole multi-sprint epic in one session is the main
  context-cost driver. The durable state (the plan file, sprint docs, team memory) makes re-entry
  cheap by design — so `/compact` at each sprint/PR boundary, and for big epics consider a **fresh
  session per sprint**. See `LEARNINGS.md → Working efficiently`.
- **Parallel agents + async deploys.** `main` moves under you and the two repos deploy at different
  speeds (frontend fast w/ preview; backend ~12 min, no preview). Merge latest `main` into your
  branch before/while a PR is open; merge backend-first when the frontend depends on its data; make
  the frontend degrade gracefully. See `LEARNINGS.md → Multi-agent & async deploy coordination`.

---

## Tooling — what Claude can drive from the CLI

Claude has authenticated CLI access to the full delivery toolchain and can run the pipeline end-to-end:

| Tool | Used for |
|------|----------|
| **git / gh** | Version control, feature branches, pull requests + merges, GitHub operations |
| **Vercel CLI** (`vercel`) | Frontend **preview** deployment status/inspection and environment variables for linked project `miyagisanchez`. Vercel no longer serves frontend production (2026-07-10 cutover) — it is the per-PR preview + CI target only, and deploys stay git-driven |
| **Supabase CLI** (`supabase`) | Migrations & SQL against the linked project (editorial/non-commerce data) |
| **gcloud** (Cloud Run, Cloud Build, Artifact Registry) | Build & deploy **both** apps to GCP (us-east4) — frontend `miyagi-web` and backend `medusa-web` — plus standalone services |
| **Docker** | Build & smoke-test container images locally before deploying |
| **node / npm** | Type-check (`tsc`), lint (`eslint`), build (`npm run build`), local dev server |

This means a story can go from code → verified → preview-deployed → live-tested on a branch, then merged to production via PR — with verification at each step. Actions that touch live commerce, real money, or paid infrastructure are surfaced to Daniel for a green light before running.

**Dynamic workflows (Claude Code) — available, not required.** Claude Code can fan a task across many parallel subagents with independent verification and adversarial cross-checking (the `ultracode` effort setting, or "create a workflow"). It is **token-heavy**, so it's reserved for two cases: (1) **repo-wide doc↔code drift audits** (its strongest fit — verifying many claims against the codebase in parallel), and (2) an **optional adversarial second review of HIGH-risk money-path PRs**. It is **never a gate and never required**: the deterministic CI gate plus a single-pass reviewer remain the baseline. This is a Claude-Code-specific capability — agents on other tools (CODEX, Antigravity, etc.) achieve the same ends their own way or skip it, and **nothing in this process blocks on it**.
