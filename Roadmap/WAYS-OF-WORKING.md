<!-- GENERATED FILE — do not edit by hand.
     Source: Roadmap/WAYS-OF-WORKING.template.md + Roadmap/fill-ins.yml
     Regenerate: node scripts/render-ways-of-working.mjs   (CI checks it with --check)
     Shared process text belongs in the .template.md; this project's own belongs in fill-ins.yml. -->
# Ways of Working

How Daniel (product owner) and Claude (builder) ship product together. Small slices, plan first, ship
the moment each slice works — and each slice is a piece of the final product, never a test of it.

## Operating posture — pre-launch, one user, build the end state (2026-08-10)

**This section overrides anything below it that contradicts it.** It replaces a risk model written for a
live marketplace with real merchants and real money, which this platform does not yet have.

**The facts the process must match.** Miyagi Sánchez has not launched. There are no real buyers, no real
sellers, no real orders and no real money moving. `marketplace_promoter_applications` holds 0 rows,
`partner_grants` holds 0 rows, `marketplace_promoters` holds 2. Everything deployed is deployed to an
audience of one — the product owner. The scarce resource is not uptime, reputation or merchant trust. It
is **model tokens and wall-clock time**, and every gate that spends those to protect a user who does not
exist is a gate that costs more than it saves.

**Build the final product, not the ladder to it.** We do not build a skateboard, then a bicycle, then a
car. There is no cohort, no pilot, no proof phase, no hypothesis, no 30-day observation window, no
continue/reshape/stop decision and no readiness threshold standing between a scaffolded epic and the
finished capability — unless the product owner asks for one by name. A scoped epic describes the thing
as it will exist when it is done. When an epic is genuinely too large for one run, split it by
**capability boundary** (the rail, then the surface that consumes it), never by **confidence level**
(a test version, then a real version). The first kind of split ships product at every step. The second
throws its own output away, which is exactly what happened across `#US-2` → `#US-5`.

**Validation frameworks are opt-in.** `deliberate-risk-validation`, `pmf-narrative-facilitator`,
`northstar-workshop` and the grooming stages that produce entry gates, appetite ceilings and success
signals are available when the product owner asks for them. They are not run by default and their
vocabulary does not belong in an epic that was not groomed through them.

**What still deserves care, and why.** Not "because a user might see it" — because it is *irreversible
or expensive to the product owner personally*:

- **Destructive or hard-to-reverse data changes** against the shared live Supabase or the live Medusa
  database. There are no users to harm, but there is one dataset and no second copy.
- **Real money and real third-party spend** — a live Stripe charge, a purchased shipping label, paid
  cloud resources, a provisioned paid SKU.
- **Production secrets, IAM, DNS and TLS.** Getting locked out of your own infrastructure is the one
  failure mode that a zero-user platform can still suffer at full severity.

Everything else — a signup form, a page, a route, an admin table, a component, a lint rule, a doc — is
ordinary work. Build it, run the deterministic gate, merge it.

## Feature flags — OFF by default as a practice (2026-08-10)

**Do not put a feature behind a flag unless the product owner explicitly asks for one.** This reverses
the previous default, which flagged everything.

Why it reversed: the catalog reached **35 flags** and every one of them is ON. A flag's entire value is
the ability to turn something off for a population that is currently suffering from it. With no users,
every flag here was created disabled, then enabled within hours of the feature landing — so each one
bought nothing and cost real work: a typed catalog entry, a Golden definition synced to every
environment, a local shadow/fallback row, a resolver seam, both flag-ON and flag-OFF branches in the
code, and a flag-OFF test path in the spec suite. Agents were spending a material share of a build
learning the flag machinery instead of building the feature. Delivery time here is measured in hours;
the rollback tool for a bad merge is `git revert`, which is faster than a flag flip and leaves no
permanent branch in the code.

**The rules:**

1. **No new flag by default.** A new capability ships enabled. If it is wrong, revert the merge.
2. **A flag is a product-owner decision, made out loud.** The only reason to add one is that the
   product owner named it — usually because the switch must be flippable *without a deploy* by someone
   who is not holding a terminal, or because it gates a third-party integration that can fail
   independently of our code (a carrier account, a payment provider outage).
3. **When one is requested, the existing machinery is the answer, unchanged.** Typed entry in
   `apps/miyagisanchez/lib/flag-catalog.ts`, definition registered in Golden in every environment with
   the stated polarity, one server-side resolver seam, `platform_flags` shadow row. Never a code-only
   constant; an unregistered flag is not a switch.
4. **Do not describe a flag as a security boundary.** Flags fail open. Authorization is authorization.
5. **The 35 existing flags stay.** They are all ON and working; ripping them out is a large mechanical
   diff across two repos with no benefit today. Leave them alone, do not add to them, and delete one
   only when you are already editing its call site for another reason and its removal is trivially safe.

Grooming no longer produces a kill-switch decision as a matter of course (`groom` Stage 6b becomes
"does the product owner want a flag here? default no"), and the epic Definition of Done verifies a flag
**only when the epic scoped one**.

## Roles and the unit of work

The **product owner** sets direction, approves plans, tests each shipped slice and makes the consequential
calls (architecture forks, infra, money). **Claude** researches, proposes the plan as user stories,
builds, verifies, ships and documents.

Everything is sliced into **user stories** — the smallest independently testable, shippable value: *As a
\<role\>, I want \<capability\>, so that \<outcome\>*, plus **acceptance checks the product owner can
run**. Stories roll up into sprints, sprints into an epic, epics into a macro-section. Before building,
check whether existing features plus communication already deliver the outcome — surface that lighter
path first; `groom` gates on it (Stage 2.5).

## The cadence

```
Plan → branch + scaffold docs → build story → verify → QA/smoke → PR → review → merge (= deploy) → close
```

1. **Plan.** Non-trivial work goes through plan mode as user stories, approved before code, naming its
   QA/smoke stage. Reference end-states (spec docs) are inspiration, never signed-off scope. Every scope seed also names which UX rails (CI guards, the audits lens, design-language debt) cover its surface — the `groom` skill's Stage 4 reuse list (`groom/templates/scope-seed.md` in the `ways-of-work` plugin, dobby-foundation marketplace).
2. **Branch + scaffold.** One branch per epic (`feat/<slug>`, or `fix/…`, `chore/…`) off the latest
   `main`, in each repo you touch. Scaffold the epic `README.md` + `sprint-N.md` *before* any code, so
   the product owner sees scope as it grows, and keep them current (✅ ticks, commit refs).
3. **Build one story at a time.** Reuse before rebuild. Commit per story, **path-limited**.
4. **Verify + QA.** The deterministic gate — typecheck, lint, build, the suite — is green **before**
   merge, run by the building agent, not only by CI. **Deploy rail.** Frontend: pushing a branch builds a **Vercel preview** (SSO-protected; the Playwright
   harness reaches it with the `x-vercel-protection-bypass` token, and falls back to prod-after-merge without
   it). Merging to `main` builds the production image on **Cloud Build us-east4 → Cloud Run `miyagi-web`**
   behind Cloudflare — Vercel prod deploys have been disabled since the 2026-07-10 cutover. Backend: merge →
   Cloud Build us-east4 → Cloud Run `medusa-web` (~12 min), with **no per-branch preview**, so it is confirmed
   post-merge: the agent does the API-level prod smoke, Daniel the browser/seller-session parts — state the
   split in the PR. **After merge, confirm the Cloud Build succeeded** (`gcloud builds list --region=us-east4`);
   CI green is the preview, not the prod image. **Never deploy with the Vercel CLI** (it is on the deny list).
5. **PR → review → merge.** Declare a risk tier, run the review the policy asks for, resolve or answer
   every finding, merge on green. **Merging to `main` is the production deploy.** Delete the branch.
6. **Close.** Sprint close: the sprint-wrap summary. Epic close: the Definition of Done below.

## Epic-mode builds — the default for a scaffolded epic

A whole epic in one orchestrated session is the normal unit of work; sprint docs are integration and
rollback boundaries *inside* it (a per-sprint session stays valid for a one-sprint epic, or when a sprint's
outcome genuinely changes the next one's scope). Six things make it work, and the first is the leverage:

1. **Lock the architecture before any builder starts** — numbered decisions `D1…Dn` in the epic README
   plus a per-sprint **"Build contract (locked by the architect before the builder started)"**, each
   verified **against live code and live data**. Builders *cite* them; a paraphrased contract drifts
   permissive. The lock must **disprove scope** (an acceptance criterion describing a guard, table or flag
   the live system lacks is fiction — saying so is a success), **query the live data** (row counts decide
   what is safe: a schema fork that is free while a table is empty is only free then), **name every
   deviation** in the README, and **say where each contract lives, once** — import the rule, never
   restate it.
2. **Stack the branches** — `feat/<slug>` → `-s2` → `-s3`, one PR per sprint (a single PR only when the
   sprints don't split along a review boundary), merged in order; sprints share hot files, so stack or
   pay. **Never delete a base branch while a stacked PR is open** — GitHub closes that PR for good.
3. **Route models by risk, invert for review** — the contract-defining sprint to the stronger model, the
   mechanical ones to the faster, the riskiest PR's fresh reviewer to the strongest; state the routing in
   the epic README. Findings route back to the original builder, whose context makes fixes cheap.
4. **Merges are pre-authorized on green** in a named run: that removes the round-trip, not the gate or the
   review layers, and never extends to a new category of production mutation (TLS/IAM/secrets, money or
   entitlement writes, a new external dependency) — name those in one focused question.
5. **Generate the kickoff, don't compose it** — `node skills/groom/emit-epic-kickoff.mjs --epic <slug>`
   (the `groom` skill) reads the epic README and every sprint file and prints the orchestrator prompt.
   Hand-composing it is how the architecture lock gets summarised away and the review policy silently
   reverts to whatever the composing agent remembered.
6. **Derive state, journal intent** — at session start run `node scripts/session-resume.mjs`: it
   re-derives branches, worktrees, open PRs and migration drift live across the project's repos and leads
   with what is surprising. Journal each locked decision with `node scripts/session-note.mjs --kind
   decision "<text>"` — one intent line, nothing derived. A killed worker's agent is resumed with a
   one-paragraph state recap (its actual `git status`/`diff`), not re-spawned cold.

*Done* means **shipped**, not merged: a merged PR that has not deployed, a migration written but not
applied, a flag that exists only in code are none of them done. With a migration: apply it **before**
merging, verify live, merge, then confirm the deploy succeeded.

## Betting & appetite

Appetite is denominated in **sessions** — with agents the binding constraints are product-owner attention
and session context. Fixed appetite, variable scope.

| Appetite | Buys | Circuit breaker |
|---|---|---|
| **S** | one builder session; fixed scope (a bug, a chore, a clear story) | escalate-don't-guess — no hard breaker |
| **M** | one wave: an architect session + builder fan-out + review rounds | appetite exhausted → stop, back to shaping |
| **L** | a multi-wave epic | per-wave: each wave is re-bet at the boundary |

Four rules: **an exhausted bet returns to shaping**, never extends in flight; **nothing reaches
`status: queued` without an `appetite:` and an `underwritten_by:` wave**; **bets are placed at wave
boundaries** into `Roadmap/bets/<wave>.md`, three lines each, recording what they displaced; and **uphill
work stays on the strongest model**. Not every ask earns the betting table — `groom` sorts shaped bets
from fixed scope (appetite S, straight to a builder) and reactive/ops work. Why it works this way:
[`references/shapeup/`](https://github.com/danybgoode/dobby-foundation/blob/main/template/references/shapeup/README.md).

## Review & merge

The deterministic gate is the gate. Everything else is judgment, and it is reads that answer **different
questions** — not more reviewers of the same kind.

```
CI (deterministic gate)            — does it build, typecheck, pass the suite?   BLOCKS merge
  → fresh pr-reviewer subagent     — context independence: did not hold the diff
  → one external cross-family pass — family independence: different blind spots
  → + a lean security lens         — when the diff touches a security path
  → the builder merges on green
```

**Which PRs**: `scripts/review-config.json` → `reviewScope` — `every-pr` (all non-trivial PRs;
`--skip-trivial` drops docs-only and tiny diffs) or `security-paths-only`. The **security lens** is
triggered by a `securityPaths` glob or a `risk: high` body in either scope — paths, not judgement, so a
builder can add it but never skip it. **In this repo:** `scripts/review-config.json` sets `reviewScope:
security-paths-only` here — this is the pre-launch posture from 2026-08-10, unchanged: **on everything
else the gate is the whole gate and you merge on green.** A PR is in scope when a changed path matches a
`securityPaths` glob (Stripe/checkout/payment/refund/webhooks, auth and Clerk, migrations, middleware,
`.claude/settings.json`, CI and infra — the two app repos' money/auth paths are listed there too, because
their reviews are run from this checkout) **or** its body declares `risk: high`.

**Who reviews** is printed by `node scripts/review-route.mjs --builder <who> <PR#>`, never picked by hand:
the highest-preference family that did **not** build the diff takes the general pass, the next takes the
security lens (`codex → agy → vibe → claude`; a capped family falls through with `--exclude`). One family
left runs both prompts and says so in the PR body; none left means the layer is **DARK**, said out loud.

**A silent reviewer is a FAILED run, not a clean one**: the run asserts the reply carries real review
structure, posts `pending` before the CLI is even checked, pins the reviewed sha, and otherwise prints the
full reply, exits non-zero and fails the PR's `cross-review/<lens>` status. Both readers share one prompt
(`scripts/cross-review.prompt.md`): one pass, a `file:line` citation or the finding is not posted, at most
3 nits, skip what CI enforces, Blocking/Should-fix only on a re-review. `/security-review` is available
locally as a pre-push self-check, never a gate. Why this shape:
[`references/review-stack.md`](https://github.com/danybgoode/dobby-foundation/blob/main/template/references/review-stack.md).

**Every finding is fixed or answered on the PR; neither pass authorizes anything.** **HIGH** = money
(payments, checkout, fulfillment), auth and authorization boundaries, tenancy, DB migrations, shared infra;
**LOW** = the rest; unsure means HIGH. The **builder merges their own PR at every
risk tier** once CI is green and findings are resolved — the tier selects the review
scope, not the merge authority. Roll back with `git revert` on `main`.

**A deterministic security floor runs underneath, free and without an LLM** (2026-09-16): GitHub secret
scanning with push protection on all five repos, and CodeQL default setup on `miyagisanchezcommerce` and
`medusa-bonsai-backend`. The security lens finds logic flaws — cross-tenant reads, money-path mistakes,
authorization gated on the wrong thing; the scanners find known patterns and leaked credentials. Neither
replaces the other. `/security-review` is available locally as a pre-push self-check, never a gate.

## Escalate, don't guess — the ONE trigger list

Stop and hand back to the planning tier — rather than inventing an answer — on any of:

> **money (payments, checkout, fulfillment) · auth and authorization boundaries · tenancy · DB migrations ·
> shared infra · plan ambiguity · a decision the plan doesn't cover · 2+ failed attempts at the same
> problem.**

Default to escalate when unsure. This is a **model-routing** trigger, not a merge gate. Everywhere else
that needs this list references it here; there is no second copy.

## Permissions — what an agent may do unattended

`.claude/settings.json` carries a committed `permissions` block: **allow** = verb classes only (never a
literal past command, and never one that destroys uncommitted work — an allowed command skips the
auto-mode classifier); **deny** = the irreversible-by-rule (CLI deploys, migration replays, force pushes and
protected-branch deletes, `rm -r`, whole-tree staging, edits to generated files, and the few repo scripts
that write production secrets from inside an allowed `node scripts/*`); **ask** = production secrets, env
writes and a service deploy. Deny and ask rules are carried in **three spellings** — bare,
assignment-prefixed and `env`-prefixed — because a leading assignment escapes a bare rule, and an escaped
*ask* is not a stricter outcome but a silent downgrade to the classifier.
Every deny/ask rule cites what it enforces in `.claude/permissions-ledger.json`, and
`node scripts/permissions-smoke.mjs` fails on an uncited rule, a stale ledger entry, a literal allow or a
missing baseline guardrail.

**Three actions get one focused question before you take them** — about irreversibility, not review: a
destructive or hard-to-reverse change to live data; real money or a third party's metered resource;
production secrets/IAM/DNS/TLS. The `ask` rules make that prompt automatic for the commands that do it.

**Auto mode is a USER setting** (`~/.claude/settings.json`): the same line in
a project file is ignored *and* masks the user default, so the smoke fails on it. A deny rule matches the
command an agent normally writes — it is not a sandbox: a leading assignment with an expansion
(`PATH=/x:$PATH vercel deploy`) was observed escaping a bare rule, so the critical rules carry an
expansion-safe form and the auto-mode classifier is the second floor.

## Definitions of Done

**A story can start** when its "as a / I want / so that" is clear, its acceptance check is testable, and
it ships on its own.

**A story is done** when acceptance criteria are confirmed working; typecheck, lint and build are clean;
the real behaviour is **smoke-tested** end to end (never "build passes, therefore done" — an untestable
gap is stated in the PR, not glossed); **every new spec has been observed failing once** via a deliberate
mutation, so it is not a tautology; and the sprint doc is ticked.

**An epic is done** when `node scripts/epic-dod.mjs --check <macro/slug>` passes — it derives the
mechanical half (sprints merged, README `status: shipped`, sprint statuses ticked with refs, a real
retrospective, no leftover branch) — **and** the judgment items below are true:

- [ ] The **product poster** reflects what is now live (✅ = enforced in code).
- [ ] **`RETROSPECTIVE.md`** says what actually happened, and its durable learnings are promoted into
      `Roadmap/LEARNINGS.md` — sharpen the existing line, don't append a near-duplicate.
- [ ] **Each sprint has a smoke walkthrough** a person can follow blind, with real URLs; money/auth steps
      are flagged by name as owed to the product owner.
- [ ] **Team memory** (and its index, if your tooling keeps one) records the epic.
- [ ] **Flag — ONLY if the product owner asked for one** (see *Feature flags*): it exists in Golden in every environment with the stated polarity. An epic that scoped none is not missing anything.

## Automated QA

The harness grows by **one spec per browser-/API-testable story** — coverage accretes with the work. Two
layers: an **`api` project** that is the deterministic gate (no browser binaries, runs on every PR, green
before merge), and an opt-in **`browser` project** for rendered UI an API call can't see (nightly or on
demand, never the gate). A browser spec replaces a browser smoke previously owed to the product owner.

## Documentation map

**`Roadmap/`** is the product source of truth in plain language (macro-section → epic → sprint → story,
plus the poster); **`LEARNINGS.md`** is the cross-epic digest, read at session start and fed at every
close; **`Roadmap/00-ideas/`** is the funnel — `seeds/` (lifecycle in frontmatter, never folder-shuffled),
`audits/`, and the **generated** `BUILD-ORDER.md` (`node scripts/build-order.mjs`, never hand-edited).
**Status SSOT = each epic README's frontmatter `status:`**; the board and any external projection are
derived views. **`Roadmap/bets/`** holds one file per wave; **`tasks/`** is the engineering delivery log.

## Conventions

- **Gitflow.** Branch off `main`, commit per story, PR → merge. Never commit feature work straight to
  `main`; never force-push a shared branch; merge latest `main` in before opening the PR.
- **Path-limited commits.** `git add <specific files>` then `git commit -- <those paths>` — never
  `git add -A`. Several agents share a checkout, so whole-tree staging commits a sibling's in-flight
  work. The deny list enforces it; parallel planners take their own `git worktree` or appoint one scribe
  for shared files like `BUILD-ORDER.md`.
- **Docs track code — verified, not generalized.** A canonical rule must reflect what the code actually
  does, checked against it — and a scoped learning is not globalized into a site-wide rule. On the poster
  ✅ means enforced in code, 🚧 partial or aspirational. Run a light drift audit periodically.
- **Parallel agents and async deploys.** `main` moves under you: merge latest `main` into a long-running
  branch; when repos deploy at different speeds, merge the data-producing repo first and make the consumer
  degrade gracefully.
- **Worker death is a normal case.** Each builder on its own worktree; a killed worker's uncommitted tree
  is evidence, not garbage; **verify by re-deriving repo state, never by trusting a completion report** —
  a rate-limited subagent still returns a plausible-sounding result. Compact at sprint/PR boundaries; for a
  big epic consider a fresh session per sprint.
- Commit messages end with the `Co-Authored-By: Claude` trailer.
- **Language.** Docs are written in **English** — everything under `Roadmap/` (epic READMEs, sprint files,
  retrospectives, the poster, `LEARNINGS.md`), `tasks/`, code comments, and PR descriptions. The **only**
  exception is user-facing app copy, which is `es-MX` (Spanish, Mexico) to match the live app. App copy is
  **es-MX by default, with a defined bilingual allow-list** — a `locales/{es,en}.json` dictionary (~119 keys)
  feeds a named set of genuinely bilingual surfaces (`app/terminos`, the sweepstakes public flow, the embed
  widget). The gate has two parts: **es-MX copy-completeness everywhere** (no orphan/hardcoded strings) and
  **both `es`+`en` present on the allow-list** (see AGENTS rule #5). Don't make a new surface bilingual by
  default — extend the allow-list deliberately.

## Epic-mode — this project's specifics

**Onboarding a delegated builder — `AGENTS.md` is the contract, and it is auto-loaded.** Codex reads
`AGENTS.md` natively (verified by probe: it recites the rules without reading a file), and Claude reads
the same file via a one-line `CLAUDE.md` → `@AGENTS.md` pointer. **One file, both families, zero
per-dispatch prompt cost.** All three repos now have one; before 2026-07-26 only the frontend did, and
a Codex probe in the backend answered literally `NO PROJECT CONTEXT LOADED`.

What belongs in it — the heuristic is *load-bearing, non-obvious from reading the code, and expensive
to get wrong*. Everything else is the linter's job:
1. **Invariants that cannot be violated** (the five rules pattern) — not preferences.
2. **The handful of patterns you will reach for daily** (route shape, DI, error handling).
3. **Traps: things that look right and are not.** The highest-value section, because it is the only
   one a competent stranger cannot infer.
4. **The gate** — the exact commands that mean "done".
5. **A delegated-subagent section**: never push/PR/merge/migrate, and *a false premise is a reason to
   STOP*.

**Keep it short enough to be read every time.** Deep detail belongs in routed files loaded on demand
(the frontend's `.claude/context/*.md` — shared by all agents despite the directory name), not inline.
A file long enough to skim is a file nobody reads twice.

**Delegating to Codex subagents (Daniel's call, 2026-07-26 — codex is a paid account).** Codex is no
longer only a second *opinion* (`cross-review.mjs`); it is a second **worker pool** with an independent
quota, dispatched via `node scripts/codex-delegate.mjs --task <kind> --prompt-file <f>`. That
independence is the point: a shared Claude session cap killed three builders at once, twice in one day
(`LEARNINGS.md` → session limits are the new flakiness), and a second family is the only structural
answer to it.

- **The roster is PROBED, never assumed.** Accepted today: **`gpt-5.6-sol`** (frontier) and
  **`gpt-5.6-terra`** (workhorse, the config default at effort `high`). Everything else — including
  `gpt-5-codex`, which the CLI *reports itself to be* — is rejected as `invalid_request_error`. Model
  self-reports are unreliable; re-probe with `codex exec -m <slug> 'say OK'` before trusting a slug.
- **Route by risk and boundedness, not by "cheaper model builds"** — the 2026-07-19 Codex/Sol trial
  found the blanket rule failed and this one worked. Frontier keeps commerce authorization, money
  paths, production state and scope-merging calls; the workhorse takes narrow UI/test/audit/CI work
  with explicit file ownership. `--task` encodes this; `--list-tasks` prints the table.
- **Read-only by default for anything that isn't a build**, so an audit cannot "helpfully" fix what it
  finds. `danger-full-access` is unreachable from the tool.
- **A delegated subagent never merges, pushes, opens a PR, or applies a migration.** It returns a diff
  and a report; the orchestrator verifies and lands it. A different *family* building something does
  not make it self-approving — that is the same distinction the review section opens on.
- **Verify the report against the diff.** On its first real dispatch the subagent correctly rejected
  the architect's brief (a locked spec count was wrong) and stopped — which is the contract working.
  On its second it delivered, and a review pass still found a real defect the report did not mention
  (`fail-fast` defaulting to true would have let one failing shard hide the others).

**Pre-launch smoke is right-sized, in writing.** With zero real tenants, a smoke walkthrough that
presupposes live operations — a real buyer, a funded carrier account, a merchant session that nobody
holds — is **descoped and named in the retrospective**, not quietly dropped and not treated as a blocker
on closing the epic. Green deterministic gates plus an anonymous render check are a complete
verification for a pre-launch surface. Every deterministic gate still runs in full: typecheck, lint,
build, the Playwright `api` suite, and live migration verification.

**Migrations: the orchestrator applies them, never the builder.** The builder writes the SQL file with its
"how this gets applied" header and stops. The orchestrator applies it (Supabase MCP `apply_migration` — the
auto-mode classifier blocks the `supabase db query` CLI path), aligns `schema_migrations` by hand, and
verifies live. **Never `supabase db push`.** A merged migration file is not an applied migration.

**Two things the merchant-partner-lifecycle run (2026-07-25) added to this SOP, both learned the hard way:**

- **Apply the migrations BEFORE you merge, not after.** Merging deploys, and code that reads a new column
  against an unmigrated table breaks an actively-used path rather than staying dark. Sequence:
  apply → verify live (4-layer) → merge → confirm Cloud Build. Also **re-verify the migration's own premise
  at apply time** — a "safe only while this table is empty" justification died between planning and applying
  when a cron emitted 33 rows in between, and the header had to be corrected rather than left standing.
  The MCP `apply_migration` records its OWN timestamp as the version, so realign
  `supabase_migrations.schema_migrations` to the filename by hand afterwards.
- **Re-run the cross-agent review on the FIXED tip, and expect a stacked PR's tip to move under a reviewer.**
  Round 2 found three more real bugs, two of them holes in the round-1 fixes. Separately, a fresh reviewer
  reported two findings as unaddressed because it had read the tip from before the fixes landed — verify
  against the current head rather than accepting or dismissing the report wholesale.

**Assume the orchestrator dies too — derive state, journal intent.** Session limits kill whole agent
trees mid-flight, repeatedly (`LEARNINGS.md`), and the existing answer — message a killed *worker's*
agent id, it resumes from its transcript — only covers the case where the orchestrator survives to send
that message. When the **orchestrator** dies, the docs record *decided* state, never *in-flight* state.
Two habits close it, and they split on one line: **derive what is derivable; journal only what isn't.**
- **`node scripts/session-resume.mjs`** opens every session. It re-derives branches, dirty trees,
  worktrees, open PRs (CI + mergeability) and migration drift across all three repos, and leads with
  anomalies. Never store this — a stored snapshot is stale by the time it is read, and a stale snapshot
  is worse than none because it reads as authoritative.
- **`node scripts/session-note.mjs --kind decision "…"`** at each locked decision and each sprint/PR
  boundary. Append-only, fails soft. Intent is the *only* thing a resume cannot re-derive, and a
  decision nobody journalled is the one thing genuinely lost.

## The prose rail — how generated reports get written

Every generated report in this repo writes through **one house voice** (`scripts/prose/cpo-persona.md`)
and is checked by **one pure guard** (`scripts/lib/prose-guard.mjs`) before a human sees it. There are
**two writer backends**, and the split is not arbitrary:

| Surface | Writer | Why |
|---|---|---|
| Daily standup, weekly recap | **The Claude Routine itself**, in-context, via a two-phase `--brief` → guard → `--post` loop | A routine runs on Anthropic infra with **no local CLI credentials** — `devin`/`agy` are absent there, so a direct writer call returns "no writer available" and the report silently becomes nothing |
| **Merge / deploy notification** | **devin → agy locally** (`scripts/merge-report.mjs`), fired by a `post-merge` git hook | Prose needs a local writer, and the GitHub Actions notifier could not host it even with quota. The hook fires on the machine that pulled the merge |
| Retro, poster entry, sprint-wrap | **devin → agy locally** (`scripts/prose-draft.mjs`) | Quota already paid for, and it keeps routine capacity for the scheduled reports |

**The merge surface is hook-driven and exactly-once.** `notify-telegram.yml` still posts the machine
facts (commit header, author, diff link); `merge-report.mjs` adds the product paragraph beside it.
Hooks over-fire by design — a pull that fetched nothing, a rebase, any checkout — so the once-per-commit
guarantee lives in a state file under `.git/`, which advances **only after a confirmed send**. A failed
post is retried next run; a success is never repeated. The hook is backgrounded and always exits 0: a
prose report must never slow down or fail a git operation. Installed in all three repos via
`core.hooksPath=.githooks`.

The guard, the persona, and `scripts/prose-lessons.md` are **shared by both**, so a correction
improves every surface at once. The two-phase shape exists because a routine *is* the model and cannot
pipe itself through a check: `--brief` emits a deterministic evidence pack (roadmap deltas first,
commits as corroboration), the routine writes, and `--post --prose-file` runs the same pure guard,
exiting non-zero with a numbered revision note. **Determinism stays in code; only sentence-making is
model work.**

**When a report gets something wrong, fix the class, not the instance.** Add a line to
`prose-lessons.md` quoting the *actual* bad sentence — an abstract rule changes nothing, a verbatim
failure is what a model pattern-matches against — and, when the failure is mechanically detectable,
**also** add a guard rule with a test. A lesson reduces a mistake; a guard catches it. Prefer both.

Two cautions learned building it, both from running the rail rather than reviewing it: a guard that
rejects *correct* output is worse than one that misses a rare fault (it trains people to ignore the
flag), and **"unknown" and "none" are different facts** — a report that says nothing is live when it
merely failed to check is exactly the confident falsehood the guard exists to stop.

## Automated QA — this project's harness
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

## Cadence, Definitions of Done and docs — this project's specifics

- **Live confirmation, divided** (it's *confirmation*, not the gate): the agent owns API-level smoke (`curl`/Playwright) where it has access; **Daniel owns the browser / real-seller-session smoke** (he's notified when Cloud Run finishes and holds the live sessions/tokens). Exercise real behaviour — a disposable/test shop for anything that mutates data; clean up after (revoke test tokens).

- **Draft → ready.** Flip draft → ready the moment the deterministic gate is green and the self-QA note is posted — the roadmap board's Lifecycle overlay reads that (draft PR → In progress, ready PR → In review), so finished work left in draft hides itself. Set the sprint doc's `Status:` line to `🟦 In review` at the same moment.

- **Close-out prose (retro, poster entry, sprint-wrap) may be first-drafted by `node scripts/prose-draft.mjs`** (cheap different-family model, house-voice prompt, file-derived inputs only) — the coordinating agent **must edit the draft for factual accuracy before committing** (drafts invent plausible gaps; the banner says so). PR bodies stay with the builder — they're cheapest written by the agent holding the context.

- **Smoke-tested** (on the branch's preview where applicable). The story's real behaviour is exercised
  end-to-end with an appropriate tool — the `live-smoke` skill (`node scripts/live-smoke.mjs`,
  apps/miyagisanchez) is the **default** for rendered-page verification, cross-agent (Codex/Antigravity
  can run it too, no Claude-specific tooling); `curl`, a Playwright spec, or a real artifact render fit
  API-only/non-browser checks. **Claude-in-Chrome stays a narrow fallback** — the one thing it can do that
  `live-smoke` structurally cannot is an *authed* check against **production** (Clerk rejects its
  testing-token bypass for prod secret keys by design). Never "build passes, therefore done." If a live
  smoke test genuinely can't run (no test account, money-/account-gated), that gap is stated explicitly in
  the PR rather than glossed.

- **Product poster updated — `Roadmap/README.md`.** Find the epic's macro-section in the **Feature map**
and update its line(s) to reflect what's now live (✅), and add a **Recent highlights** entry. If the
epic introduces a capability the poster doesn't mention, add the line. The poster is the at-a-glance
product source of truth — it must never lag a shipped epic.

- **`Roadmap/00-ideas/`** — see `00-ideas/README.md`. Seed frontmatter owns only the un-scaffolded funnel; `BUILD-ORDER.md` **and** the Notion roadmap are both *derived views* of each epic README's `status:` — regenerated, not maintained. CI (`build-order-guard.yml`) fails if the board is stale; for a local pre-commit catch, opt in with `git config core.hooksPath .githooks`.

## Conventions — this project's specifics

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
- **Branch + preview hygiene (at merge, and as a periodic sweep).** Deleting a merged branch does **not**
  remove its **Vercel preview deployments** — Vercel retains every deployment forever, so dead branches
  pile up dozens of stale previews (production deployments are your rollback history and are left alone).
  After deleting merged branches, prune their previews: **`node scripts/vercel-prune-previews.mjs`**
  (dry-run by default; `--apply` to delete; `--age N` for "older than N days"; **`--keep-branch <a,b>` for any
  branch with an OPEN PR** — its preview is the live review target). Same cadence as the branch cleanup itself;
  run it per-repo project (`--project`). Pair the two: delete merged branches → prune their previews.
- **Model tiers — Opus 4.8 plans, Sonnet 5 builds; escalate rather than guess.** The leverage is in getting
  the *foundation* right — grooming, spikes, plan mode, review — so run those on **Opus 4.8** with full
  deep-thinking, and don't rush them. Once the plan and slices are approved, per-story execution is
  mechanical, so **Sonnet 5** runs the build; Claude Code's plan-mode largely automates this hand-off, so
  there's nothing to micromanage mid-session. **Escalate-don't-guess** on any trigger in the ONE list above (*Escalate, don't guess*) — this is a model-routing trigger, not a merge gate. This is a default, not a constraint — a story that
  still carries real judgment or money-path risk stays on the strong model end to end. Planning in Cowork;
  building in Claude Code.
- `Roadmap/` **is tracked in git** — in the **monorepo-root repo**, which versions the product /
  orchestration docs (`Roadmap/`, `tasks/`, `skills/`, `infra/`, root configs). The two app repos under
  `apps/` stay independent and are **git-ignored here** (they have their own repos + deploy rails), as are
  `.worktrees/`. Tracking gives product docs history, blame, and backup — note worktrees already reach
  `Roadmap/` by relative path, so this is about versioning, not access. Doc-only changes are **low-risk
  tier**. Commit planning work as `plan(<epic-slug>): …`. Keep app secrets out of these docs (history).
- Build from existing primitives first (commerce lives in Medusa; non-commerce/editorial data in Supabase).

## Tooling

Claude has authenticated CLI access to the full delivery toolchain and can run the pipeline end-to-end:

| Tool | Used for |
|------|----------|
| **git / gh** | Version control, feature branches, pull requests + merges, GitHub operations |
| **Vercel CLI** (`vercel`) | Frontend **preview** deployment status/inspection and environment variables for linked project `miyagisanchez`. Vercel no longer serves frontend production (2026-07-10 cutover) — it is the per-PR preview + CI target only, and deploys stay git-driven |
| **Supabase CLI** (`supabase`) | Migrations & SQL against the linked project (editorial/non-commerce data) |
| **gcloud** (Cloud Run, Cloud Build, Artifact Registry) | Build & deploy **both** apps to GCP (us-east4) — frontend `miyagi-web` and backend `medusa-web` — plus standalone services |
| **Docker** | Build & smoke-test container images locally before deploying |
| **node / npm** | Type-check (`tsc`), lint (`eslint`), build (`npm run build`), local dev server |

This means a story can go from code → verified → preview-deployed → live-tested on a branch, then merged to production via PR — with verification at each step.

Actions that touch live production, real money, or paid infrastructure are surfaced to the product owner
before running.
