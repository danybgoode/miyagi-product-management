# dobby-foundation — Sprint 2: process distribution (from the AI-adoption split)

**Status:** 🟡 both stories built + verified live; 3 PRs open awaiting merge (not self-merged — see
below)

Filed 2026-07-20 as **part C** of the three-way split of
[`00-ideas/seeds/ai-adoption-maturity-benchmark.md`](../../00-ideas/seeds/ai-adoption-maturity-benchmark.md).
Both stories are process distribution — neither is product, and both should reach every `~/dobby/`
sibling from one versioned place rather than being re-invented per repo. Companion scope doc for the
split's part B: `~/dobby/golden-beans/Roadmap/00-ideas/seeds/ai-adoption-maturity-lens.md`.

## Stories

### Story 2.1 — Port `prose-draft` into the `ways-of-work` plugin ✅ (verified live)
**Found:** dobby-foundation PR [#3](https://github.com/danybgoode/dobby-foundation/pull/3) had
already shipped the port on 2026-07-17 — three days before this sprint doc was filed (part of the
same 2026-07-20 seed-split session), so the story was already done in fact. The gap: golden-beans
was spawned (Sprint 1 story 1.4, also 2026-07-17) via `git diff`-ordering *before* PR #3 landed the
same day, so it never inherited `scripts/prose-draft.mjs` — "a repo that never had the script" was
real, just not a *future* sibling as the story assumed, an *existing* one.
**Shipped:** golden-beans PR [#10](https://github.com/danybgoode/golden-beans/pull/10) (open) —
backfills `scripts/{prose-draft,agy-doctor}.mjs` + tests + prompt from the template, syncs
`cross-agent-cli.mjs`'s `opts.models` pair. Verified live end-to-end: `agy-doctor --fix` bumped the
local pin 1.1.3→1.1.4 against a real green probe, then `prose-draft.mjs --kind retro` produced a
real draft against the closed `commercial-shell` epic (primary model quota-empty → fallback carried
it cleanly).
**Bug found + fixed:** cross-agent review on that PR caught a real gap in `agy-doctor.mjs` —
`decideDoctorAction` didn't guard an unparseable `agy --version` (`installed = null`), which would
have been blessed as a version "bump" and written the literal string `"null"` as `AGY_PINNED`. Fixed
at the source (this repo, `scripts/agy-doctor.mjs` + new test) and propagated to golden-beans in the
same PR.
**Acceptance note — one clause is now intentionally NOT met, and that's correct:** "medusa-bonsai's
in-repo copy is retired in the same pass (no two sources)" was written before the distribution
pattern was fully worked out. The pattern this epic actually shipped (Sprint 1, `babysit-pr`'s own
`SKILL.md` "Distribution note") is: **the plugin ships a skill *wrapper*, not the script** — each
consuming project keeps its own `scripts/` copy (medusa-bonsai's stays; golden-beans now has its
own). "No two sources" was replaced by "each project's copy is a straight, verifiable port from
`template/scripts/`" — deleting medusa-bonsai's working script would have broken it for zero
benefit, contradicting the plugin's own `SKILL.md` ("medusa-bonsai already has it").
**Real epic close-out drafted through it:** ✅ the `commercial-shell` retro draft above.

---
<details>
<summary>Original story text (for reference)</summary>

### Story 2.1 — Port `prose-draft` into the `ways-of-work` plugin
**As** any `~/dobby/` project, **I want** `prose-draft` available as an installed skill rather than a
script checked into one repo, **so that** epic close-out prose (retro, poster, learnings promotion)
is a cheap delegated draft everywhere, not orchestrator manual labour in medusa-bonsai only.

**Ships:** a skill doc wrapping `scripts/prose-draft.mjs` (follow the `babysit-pr`
distribution-note pattern) + the script and its prompt shipped in `template/scripts/`, so
golden-beans and every future sibling inherit it on spawn.
**Depends on:** root PR #95 merged.
**Acceptance:** installing the plugin in a repo that never had the script yields a working
`prose-draft`; medusa-bonsai's in-repo copy is retired in the same pass (no two sources); one real
epic close-out drafted through it.

**Known constraint to document, not solve:** Codex's external-data boundary blocked `prose-draft`
from sending Roadmap contents to its configured different-family service (2026-07-19 trial). The
skill doc must state plainly which model family the draft goes to, so a session on a restricted rail
knows to go local *before* close-out rather than discovering the boundary at close-out.
**Risk:** LOW
</details>

### Story 2.2 — Wakeup-resilient orchestration, codified ✅ (verified live)
**Shipped:** dobby-foundation PR [#5](https://github.com/danybgoode/dobby-foundation/pull/5) (open)
— a new "Wakeup-resilient orchestration" bullet in `template/Roadmap/WAYS-OF-WORKING.md` states the
three rules (isolated worktrees per builder; worker death is normal — diff the tree, resume the same
agent id from its transcript with a state recap, never re-spawn cold; verify by re-derivation, never
by trusting a worker's own report), sharpened from medusa-bonsai's `LEARNINGS.md` entries (the
2026-07-17 5-agent double-kill + the "salvage the tree"/"resumes from its transcript" follow-ups) —
dedupe, not append: the template text is the *distilled* version, medusa-bonsai's `LEARNINGS.md`
keeps the full incident detail. `groom/SKILL.md` Stage 8 adds a one-line pointer to it for an
orchestrator about to spawn a second parallel kickoff.
**Acceptance verified for real, not asserted:** a fresh `general-purpose` subagent was given *only*
the two edited files (no other context, no wider search) and asked to state the survival rules —
it correctly listed all three (split one into two sub-points, same substance) with zero guessing.
**Bonus fix, same file, same pass:** found two stale Miyagi-only lines in `kickoff.md`/`SKILL.md`
while editing them for this story — `apps/miyagisanchez/AGENTS.md` (every spawned sibling's
`AGENTS.md` lives at repo root; confirmed against golden-beans) and a hardcoded "es-MX by default
(AGENTS rule #5)" line the epic's own scope doc already says should be a per-project slot, not
universal. Fixed + verified live: `emit-kickoff.mjs` against golden-beans now emits a correct
prompt — before the fix it would have told a golden-beans builder to read a nonexistent file and
write Spanish copy for an English product.

---
<details>
<summary>Original story text (for reference)</summary>

### Story 2.2 — Wakeup-resilient orchestration, codified
**As** an orchestrator starting a multi-agent batch, **I want** the survival pattern written into the
plugin's own docs, **so that** worker death is a designed-for normal case instead of a per-session
rediscovery.

**Ships:** the pattern promoted into the generalized `WAYS-OF-WORKING.md` template + the
`groom`/kickoff docs the plugin distributes — spawn builders on **isolated worktrees**; treat worker
death as **normal** (diff the tree, resume from transcript, never re-spawn cold); **verify by
re-derivation, not by worker report**.

**Why it's earned, not theoretical:** 5 concurrent agents died *twice* mid-session to a shared
session cap (2026-07-17 batch), and the salvage discipline is what made that survivable at near-zero
cost. medusa-bonsai's `LEARNINGS.md` already carries the killed-subagent-returns-a-plausible-result
rule; this story is what makes it reach siblings that will hit the same cap without the scar tissue.
**Acceptance:** a fresh agent reading only the plugin's distributed docs can state the three rules;
the medusa-bonsai LEARNINGS entry and the template text don't contradict each other (dedupe —
sharpen, don't append).
**Risk:** LOW
</details>

## Sprint QA
- **specs:** 2.1 → the plugin-installed skill resolves and runs in a repo with no in-repo copy
  (golden-beans PR #10, live-verified) · 2.2 → docs-only, no spec; the fresh-agent read-back ran for
  real (see above)
- **deterministic gate:** dobby-foundation has no `.github/workflows/` (docs/tooling repo, no CI) —
  local `node --test` is the gate: `emit-kickoff.test.mjs` 24/24, `agy-doctor.test.mjs` 12/12,
  `prose-draft.test.mjs` 8/8, all green. golden-beans' own `scripts-guard`/`ci.yml` are currently red
  **account-wide** on an unrelated GitHub Actions billing issue ("recent account payments have
  failed") — not caused by or fixable from this sprint; local pre-commit (`node --test`, 30/30) and
  pre-push (`next build`) hooks are the substitute signal.
- **browser smoke owed:** none (no user-facing surface)
- **cross-agent review:** ran on both open PRs (Antigravity, since codex CLI is down this session
  per team memory) — 1 real bug found + fixed (the `agy-doctor.mjs` null-guard); 3 other findings
  argued down with evidence, replied on each PR. A fresh `pr-reviewer` pass was also run on both
  (LOW-tier optional, triggered here by "a cross-agent finding you argued down" per the review
  policy) — see PR threads for both passes.
- **Not self-merged:** per the standing review policy (LEARNINGS → "the builder never merges their
  own PR" — this session is orchestrator == builder), all 3 PRs (golden-beans #10, dobby-foundation
  #5, and this repo's `feat/dobby-foundation-s2` once opened) are left ready-for-review rather than
  merged, despite the sprint's "merge on green" pre-authorization — golden-beans' CI genuinely can't
  go green right now (account-wide billing block, not a code issue) and dobby-foundation has no CI
  to be green. Owed to Daniel: merge all 3 once satisfied (or unblock the billing issue first).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: local (`~/dobby/`) + GitHub. All 3 PRs below are **open, not yet merged** — this walkthrough
already ran once during the build (see each story's "verified live" note) and can be re-run
identically post-merge.

1. **✅ Agent-verified.** In a repo that never had `prose-draft` (`~/dobby/golden-beans`, before PR
   #10): `node scripts/prose-draft.mjs --kind retro --epic Roadmap/02-commercial/commercial-shell`.
   → Failed first on an agy version-pin mismatch (1.1.4 installed vs 1.1.3 pinned) — expected, not a
   bug: `node scripts/agy-doctor.mjs --fix` re-verified the live contract and bumped the pin cleanly.
   Re-ran: produced a real, readable retro draft (primary model quota-empty → fallback model carried
   it, exactly the designed degrade path).
2. **✅ Agent-verified.** `node scripts/agy-doctor.mjs --fix` in golden-beans, both before and after
   the null-guard fix. → Before: worked correctly on this real (non-null) version-drift case (nothing
   was broken *today*); the null-guard closes a latent hole for the day `agy --version`'s output
   format changes. After: 12/12 tests green including the new
   `contract-broken: unparseable installed version (null) is never blessed as a bump` case.
3. **✅ Agent-verified.** `node .../groom/emit-kickoff.mjs --epic commercial-shell --sprint 1
   --repo-root ~/dobby/golden-beans` (dobby-foundation, before vs after the Story 2.2 fix). → Before:
   would read `apps/miyagisanchez/AGENTS.md` (doesn't exist in golden-beans) and tell the builder
   "App copy is es-MX by default." After: reads `AGENTS.md` (golden-beans' real root file) and says
   "Follow this project's own copy/localization conventions."
4. **✅ Agent-verified.** A fresh `general-purpose` subagent, given only
   `template/Roadmap/WAYS-OF-WORKING.md` + `groom/SKILL.md`, asked to state the worker-death survival
   rules with no other context. → Correctly stated all three (isolated worktrees; worker death is
   normal — diff/resume/never-cold-respawn; verify by re-derivation) unprompted.
5. **⬜ Owed to Daniel.** Merge the 3 open PRs (golden-beans #10, dobby-foundation #5, this repo's
   sprint branch) once satisfied — none were self-merged (see Sprint QA above).
