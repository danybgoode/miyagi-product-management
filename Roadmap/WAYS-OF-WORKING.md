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

1. **Plan.** For non-trivial work, Claude enters plan mode, writes a plan as user stories, and Daniel approves before code. **Every plan names a QA / smoke-test stage** with the specific checks and tools. Reference end-states (spec docs) are inspiration, never signed-off scope.
2. **Branch + scaffold docs.** Create one working branch per epic — `feat/<epic-slug>` (or `fix/…`, `chore/…`) — off the latest `main`, in each repo you'll touch. On it, *before any code*, scaffold the epic `README.md` + per-sprint files under the right macro-section (plain-language stories + acceptance). The build runs against these docs; Daniel sees scope as it grows. Keep them current as stories land (✅ ticks, commit refs); retrospective at epic close.
3. **Build one story at a time.** Iterative. Reuse before rebuild. Commit per story to the branch (`Co-Authored-By: Claude` trailer).
4. **Verify.** Type-check + lint clean, build passes.
5. **QA — the deterministic gate (pre-merge) + the live confirmation (split).** Two distinct layers; don't conflate them.
   - **Deterministic gate — must be green BEFORE merge:** `tsc --noEmit` + `npm run build` + the Playwright suite, run by the building agent. This is non-negotiable — nothing merges on a red gate. Where the acceptance check is browser-/API-testable, add **one** Playwright spec as part of the story.
   - **Run the suite against the branch's Vercel preview** (`PLAYWRIGHT_BASE_URL=<preview-url>`). Note: previews are **SSO-protected** (401 to anonymous curl/Playwright), so the harness uses a **Vercel protection-bypass token** (`x-vercel-protection-bypass` header) to reach them. Without that token the preview is unreachable and the suite falls back to prod-after-merge.
   - **Live confirmation can be async + divided** (it's *confirmation*, not the gate): the agent owns API-level smoke (`curl`/Playwright) where it has access; **Daniel owns the browser / real-seller-session smoke** (he's notified when Cloud Run finishes and holds the live sessions/tokens). Exercise real behaviour — a disposable/test shop for anything that mutates data; clean up after (revoke test tokens).
   - **Backend (Cloud Run) has no per-branch preview** — it can only be confirmed *post-merge* against prod. The agent does the API-level prod smoke + a route-deployed probe; Daniel picks up the seller/browser parts. State this split in the PR.
6. **Push as you go.** Each push updates the preview; the reviewer (and Daniel) can test per story without touching production.
7. **PR → review → merge to `main`.** Open a PR early (draft is fine) via `gh`; keep it updated with a self-QA note **and a risk tier** (see *Review & merge* below). Trigger the reviewer (a fresh agent, not the builder — see *Review & merge* below). When the deterministic gate is green, the review is clean, and the merge is authorized for the PR's risk tier, merge to `main`. **Merging to `main` is the production deploy** (frontend → Vercel prod; backend → Cloud Build us-east4 → Cloud Run, ~12 min). Small epics merge once; larger ones may merge per sprint. Delete the branch after merge.
8. **Continue / close.** Roll into the next story. At **sprint close**, emit the sprint-wrap terminal summary (`SESSION-KICKOFFS.md` §7) — a thin pointer to the sprint doc + what's owed/next, never a re-summary. At **epic close**, do the epic Definition of Done (below) — including updating the product poster.

## Review & merge — cross-agent
With multiple agents running in parallel, the agent that **builds** a PR is not the one that **approves** it — a
fresh reviewer re-derives intent from the diff alone and catches what the author's context-bias hides. Two layers
do this, and they're complementary:
- **CI (determinism):** GitHub Actions runs `tsc` + `build` + the Playwright suite on every PR (against the preview
  via the bypass token). This is the tireless gate — it never forgets or runs out of tokens. A red CI blocks merge.
- **Reviewer (judgment):** a **fresh reviewer agent** re-derives intent from the diff alone and checks
  correctness, architecture, and the five rules from `AGENTS.md`. The path is a **repo-local reviewer
  subagent** — point it at `gh pr diff <PR#>` (+ the changed files) and the five rules; it composes with
  parallel agents and needs no external service. Keep review a **single pass on a green CI gate** — not an
  iterative refine loop (that loop is the dominant token cost in multi-agent dev; let the deterministic gate,
  `tsc` + `build` + Playwright, carry the repetitive checking and have the reviewer read once). **Do not use
  the `/code-review ultra` cloud command — it is not set up for this repo.** The reviewer must be a different
  agent than the one that built the PR.
- **Cross-agent second opinion (optional, advisory):** `node scripts/cross-review.mjs <PR#> --agent
  codex|antigravity` pipes the PR diff into a **different model family's** CLI (Codex or Antigravity) for one
  pass and posts the findings as a clearly-labeled PR comment. It exists only to surface another family's
  blind spots. **Suggested on HIGH-risk PRs, optional on any, advisory only** — it never gates, blocks, or
  authorizes a merge (CI + the Claude reviewer + the risk-tier rule below stay the sole sources of truth),
  and it is **single-pass** (no debate loop). It reads the same shared prompt the human reviewer does
  (`scripts/cross-review.prompt.md` — the five `AGENTS.md` rules + this single-pass discipline).

**Every PR declares a risk tier** (in the PR body); that tier decides who may merge:
- **Low-risk → reviewer may auto-merge** once CI is green and the review is clean: docs/copy, non-commerce UI,
  additive agent tools behind auth, tests, internal tooling.
- **High-risk → always a Daniel merge** (a human green-light, never an autonomous ship): anything touching
  **payments / checkout / fulfillment / auth / DB migrations / shared infra / money**. This preserves the
  live-commerce guardrail — an agent never deploys real-money paths to production on its own.
When unsure which tier, treat it as high-risk. High-risk epics are also *planned behind a kill-switch*
at grooming (the flag is decided + sliced there, verified at epic DoD — not a new gate); see
`skills/groom` Stage 6b.

## Definition of Ready (a story can start)
- The "as a / I want / so that" is clear and the acceptance check is testable.
- It's a slice that can ship on its own.

## Definition of Done (a story)
- Acceptance criteria met and confirmed working.
- Type-check + lint + build clean.
- **Smoke-tested** (on the branch's preview where applicable). The story's real behaviour is exercised
  end-to-end with an appropriate tool (Claude-in-Chrome, `curl`, Playwright spec, real artifact render, …)
  — never "build passes, therefore done." If a live smoke test genuinely can't run (no test account,
  money-/account-gated), that gap is stated explicitly in the PR rather than glossed.
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
      kill-switch is decided at **grooming** (`skills/groom` Stage 6b), not discovered here.
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
  `MS_TEST_*` secrets and **skip gracefully** when unset.
  - *Owed (Daniel, one-time):* the `MS_TEST_*` repo secrets — buyer/seller password-auth accounts +
    `MS_TEST_PERSONALIZED_LISTING_ID` — so the credentialed/epic browser smokes light up (they skip until then).

## Documentation map
- **`Roadmap/`** — product source of truth (this folder). Plain language, no tech. Macro-section → Epic → Sprint → Story, plus the feature poster.
- **`Roadmap/LEARNINGS.md`** — the distilled, cross-cutting wisdom from past epics' retrospectives.
  **Read it at session start** (it's in AGENTS.md "Start here"). Fed at every epic close — see the
  epic Definition of Done. The full story of any item stays in its epic `RETROSPECTIVE.md`; this is
  the transferable digest so a retro reaches the *next* agent instead of dying in its folder.
- **`Roadmap/00-ideas/`** — the idea funnel: `seeds/` (one .md per idea, lifecycle in **frontmatter** — no folder shuffling), `audits/` (UX/UI findings), and `BUILD-ORDER.md` (the grooming queue). See `00-ideas/README.md`. The seed frontmatter is also what the Notion roadmap sync projects from.
- **`tasks/`** — engineering delivery log: what was built, decisions, commit hashes, runbooks, known limitations.
- **Team memory** (`~/.claude/.../memory/`) — durable cross-session facts and pointers.
- **Retrospectives** — one per epic/sprint, alongside the epic.

## Conventions
- **Gitflow.** Branch off `main` per epic (`feat/<slug>`); commit per story; PR → merge to `main`. Never
  commit feature work straight to `main`, and never force-push a shared branch. Rebase/merge latest `main`
  into a long-running branch before opening the PR. Roll back a bad merge with `git revert` on `main`.
  (Two repos deploy separately — see the deploy topology in memory; branch in each repo you touch.)
- **Planning commits — own worktree + path-limited.** Planning/scaffold work commits to the monorepo-root
  repo, and **multiple planning sessions running in the same shared worktree collide the git index** (a bare
  `git add Roadmap/` stages a sibling agent's in-flight files → "another git process is running" / index lock
  errors). Two rules remove the contention: (1) **commit only your own paths** — `git add <specific files>`
  then `git commit -- <those paths>` (never `git add Roadmap/` or `git add -A`); and (2) for parallel planning,
  **give each planning session its own `git worktree`** (app code already does this via `.worktrees/`; planning
  must too), or appoint a single **scribe** for shared files like `BUILD-ORDER.md`. Path-limited commits are the
  single highest-leverage habit — they keep each commit clean regardless of what else is in the shared index.
- **Model tiers — strong model for the thinking; let execution assembly-line.** The leverage is in getting
  the *foundation* right — grooming, spikes, plan mode, review — so run those on the strongest model (Opus)
  with full deep-thinking, and don't rush them. Once the plan and slices are approved, per-story execution is
  mechanical, so a faster model is fine there; Claude Code's plan-mode largely automates this hand-off, so
  there's nothing to micromanage mid-session. **Quality-first:** when a story still carries real judgment or
  money-path risk, keep it on the strong model. This is a default, not a constraint. Planning in Cowork;
  building in Claude Code.
- **Docs track code — verified, not generalized.** A canonical rule (the AGENTS five rules, `conventions.md`)
  must reflect what the code *actually* does, checked against it — **don't globalize a scoped learning** into a
  site-wide rule ("the seller portal is es-MX" ≠ "the site has no English"; the dictionary + sweepstakes + embed
  are bilingual). On the product poster (`README.md`), **✅ means enforced in code**, not merely intended —
  partial/aspirational is 🚧. Run a lightweight **drift audit** periodically (paths · imports · env vars · routes ·
  key policy claims vs the codebase); it's a strong fit for a Claude Code dynamic-workflow doc-audit.
- **Never use the Vercel CLI to deploy.** Deploys are git-driven only (push a branch = preview; merge to
  `main` = production). The Vercel CLI would push out-of-band with git history.
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
| **Vercel CLI** (`vercel`) | Frontend deployment status/inspection and environment variables for linked project `miyagisanchez`; production deploys remain git-driven only |
| **Supabase CLI** (`supabase`) | Migrations & SQL against the linked project (editorial/non-commerce data) |
| **gcloud** (Cloud Run, Cloud Build, Artifact Registry) | Build & deploy backend / standalone services to GCP (us-east4) |
| **Docker** | Build & smoke-test container images locally before deploying |
| **node / npm** | Type-check (`tsc`), lint (`eslint`), build (`npm run build`), local dev server |

This means a story can go from code → verified → preview-deployed → live-tested on a branch, then merged to production via PR — with verification at each step. Actions that touch live commerce, real money, or paid infrastructure are surfaced to Daniel for a green light before running.

**Dynamic workflows (Claude Code) — available, not required.** Claude Code can fan a task across many parallel subagents with independent verification and adversarial cross-checking (the `ultracode` effort setting, or "create a workflow"). It is **token-heavy**, so it's reserved for two cases: (1) **repo-wide doc↔code drift audits** (its strongest fit — verifying many claims against the codebase in parallel), and (2) an **optional adversarial second review of HIGH-risk money-path PRs**. It is **never a gate and never required**: the deterministic CI gate plus a single-pass reviewer remain the baseline. This is a Claude-Code-specific capability — agents on other tools (CODEX, Antigravity, etc.) achieve the same ends their own way or skip it, and **nothing in this process blocks on it**.
