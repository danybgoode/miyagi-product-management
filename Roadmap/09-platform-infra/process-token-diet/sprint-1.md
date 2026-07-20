# Process token-diet — Sprint 1: Script the boilerplate, flip the review policy

**Status:** 🟦 In review

> **Two scope corrections found by verifying against the live artifacts before building** (LEARNINGS:
> a sprint doc's assumed state can be fiction — grep first, correct the doc rather than implement it).
> Story 1.2 was ~90% pre-existing and Story 1.4's stated target was already fixed. Both are recorded
> in the stories below rather than silently rewritten. Neither was padded out to look like new work.

## Stories

### Story 1.1 — Kickoff-prompt generator ✅ `dobby-foundation#4`
**As** Daniel, **I want** `node skills/groom/emit-kickoff.mjs --epic <slug> --sprint N` to print the
finished Stage-8 Claude Code kickoff (invariant preamble from a template + the sprint delta read from
the epic/sprint docs), **so that** no model tokens are spent re-typing boilerplate per sprint.
**Acceptance:** generated kickoff for an existing epic matches the Stage-8 shape; groom SKILL.md
Stage 8 updated to call it; co-located pure test with `isMain` guard. **Lands in the dobby-foundation
plugin repo.**
**Risk:** low

### Story 1.2 — Smoke-walkthrough skeleton in the scaffolder ✅ `dobby-foundation#4` (reduced — see note)

> **SCOPE CORRECTION.** `templates/sprint-N.md` already carried the entire Stage-8b skeleton — the
> `## Sprint {{N}} — Smoke walkthrough` heading, the `Env:` line, a numbered action/result placeholder,
> the money/auth flag comment, and the closing bug-report line — and the template already lived in
> `skills/groom/templates/`, so the story's stated acceptance was **already met before this sprint
> started.** The only genuine gap was "with real URL stems pre-filled". Delivered as that delta
> (three concrete stems: marketplace page, seller-portal `manage` stem, Stripe-4242 money-path shape).
> Not rebuilt, and not written up as new work.
**As** a building agent, **I want** `scaffold-epic.mjs` to emit the Stage-8b numbered-steps skeleton
into each `sprint-N.md` with real URL stems pre-filled, **so that** builders fill only actions and
observable results.
**Acceptance:** freshly scaffolded sprint doc contains the skeleton; template lives in
`skills/groom/templates/`. **Lands in the dobby-foundation plugin repo.**
**Risk:** low

### Story 1.3 — Review-policy flip ✅ `d2950e0`
**As** the team, **I want** cross-agent review mandatory on every PR and the fresh-reviewer pass
optional after cross-review findings are addressed — **except HIGH tier, where it stays mandatory**,
**so that** review cost matches risk (LEARNINGS: the independent pass repeatedly caught real
money-path issues on HIGH PRs — catalog-management S6, arranged-only-delivery S2).
**Acceptance:** WAYS-OF-WORKING → Review & merge rewritten; `scripts/routines/pr-review.prompt.md` and
`.claude/agents/pr-reviewer.md` aligned; risk-tier merge rule unchanged.
**Risk:** low

### Story 1.4 — Doc drift: deploy rail ✅ `d29cdf9`
**As** a fresh agent, **I want** WAYS-OF-WORKING cadence step 7 to say frontend → Cloud Run (not
Vercel prod — stale since 2026-07-10), **so that** orientation docs match reality.
**Acceptance:** corrected; consistent with AGENTS.md.
**Risk:** low

> **SCOPE CORRECTION — the named target was already fixed.** Cadence step 7 already read "Cloud Build
> us-east4 → Cloud Run `miyagi-web` behind Cloudflare — Vercel prod deploys disabled since the
> 2026-07-10 cutover, Vercel survives only as the per-PR preview + CI target." Building to the story
> as written would have "fixed" correct text. Swept for the drift the story was actually reaching for
> and found **three** live stale claims instead, all corrected:
> 1. Conventions → *"Never use the Vercel CLI to deploy"* — said "merge to `main` = production" with no
>    rail named, still implying Vercel production. Now names the real rail per app and explains that
>    `vercel --prod` wouldn't even reach production, it would push a stray out-of-band deployment.
> 2. Tooling table, **Vercel CLI** row — "Frontend deployment status/inspection … production deploys
>    remain git-driven only" → scoped to **preview** inspection, cutover named.
> 3. Tooling table, **gcloud** row — "Build & deploy **backend** / standalone services" → **both** apps
>    (`miyagi-web` + `medusa-web`). The frontend has deployed through gcloud since the cutover.

## Sprint QA
- **api spec(s):** n/a app-side; `node --test` on emit-kickoff's pure parts (plugin repo)
- **browser smoke owed:** no
- **deterministic gate:** scripts-guard CI (root repo) + plugin repo tests green

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local terminal, root repo + dobby-foundation checkout

1. Run `node skills/groom/emit-kickoff.mjs --epic agent-readability-marketing-surface --sprint 1` (plugin path).
   → A complete, paste-ready kickoff prints; the sprint-specific lines match sprint-1.md's stories.
2. Run the scaffolder on a throwaway slug with `--dry-run`.
   → Printed sprint doc contains the smoke-walkthrough skeleton with URL stems.
3. Open Roadmap/WAYS-OF-WORKING.md → Review & merge.
   → Cross-agent = mandatory every PR; fresh reviewer = optional after cross-review, mandatory on HIGH; step 7 says Cloud Run.

If any step fails, note the step number + what you saw — that's the bug report.
