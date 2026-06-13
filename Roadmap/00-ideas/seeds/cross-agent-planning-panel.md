---
title: "Cross-agent planning panel — single-pass advisory second opinions on plans (architecture / strategy)"
slug: cross-agent-planning-panel
status: shipped
area: "09"
type: chore
priority: null
risk: low
epic: "09-platform-infra/cross-agent-planning-panel"
build_order: null
updated: 2026-06-13
---

# Cross-agent planning panel — a second opinion for grooming, not a debate

> **Class:** Chore (planning-process / dev-tooling; no user-facing change). Process improvement
> (Cowork track), **not** a marketplace feature — so no Medusa-first reframe; the reframe is against our
> own `WAYS-OF-WORKING.md` + the `groom` skill.
> **Stage-2.5 bucket:** **light enhancement.** This extends the *already-shipped* cross-agent code-review
> pattern (`scripts/cross-review.mjs`, seed `cross-agent-code-review.md`) to the **planning** half of the
> workflow. It reuses that rail; it does **not** introduce a multi-round model debate (explicitly out).
> **Decisions locked (Daniel feedback, 2026-06-13) — see "Decisions" below.** The remaining gate is
> Daniel's approval of this scope; on approval it scaffolds (or we decide it's not worth building).

## Why / the ask
**As** the product owner running multi-agent planning, **I want** a one-command way to get a *second
opinion* on a **proposed plan** — a scope doc or a spike decision — from a **different model family**
and/or a **named expert lens** (architect, CMO/brand), posted as an advisory note on the plan, **so that**
high-stakes calls (architecture forks, strategy/positioning) get checked by blind spots my own grooming
pass doesn't share — **without** reintroducing the iterative back-and-forth loop our process was designed
to avoid.

Today: a raw ask → the `groom` skill (orient → classify → "can we already do this?" → disambiguate →
Medusa-first reframe → slice) → a Definition-of-Ready scope doc Daniel approves. That pass is strong, and
it already includes a "research present-day facts when it matters" directive. What it lacks at the
**consequential forks** (Stage 4 architecture, Stage 2/spike decisions, high-stakes strategy) is a
*different perspective* re-deriving the call before it gets sliced into a whole epic.

## The honest assessment (and where it gains nothing)
- **A literal "debate between two models" is the wrong frame — it's the anti-pattern our own
  `LEARNINGS.md` rejects.** That file is explicit: agent-to-agent conversation is the costly path
  ("an assembly-line SOP beats hierarchical agent-to-agent conversation"); the review loop is ~59% of
  token cost; our deliberate countermeasure is **single-pass** review on a deterministic gate. A
  multi-round planning debate re-creates exactly that sink. **Out of scope.** The valuable kernel is a
  **panel of single-pass, parallel, advisory** second opinions — same discipline as `cross-review.mjs`.
- **The mapping from code-review is NOT 1:1, and that's the crux.** Code review's advisory layer is
  safe *because a deterministic gate sits under it* (`tsc` + `build` + Playwright carry the load, so the
  foreign model is pure bonus). **Planning has no `tsc`.** No ground truth to anchor against. This cuts
  both ways: a second opinion is *more* valuable (nothing else catches a bad architecture call before it
  propagates through an epic), but it's *easier for the layer to become plausible-sounding noise.* The
  countermeasures: bound the input (review one artifact, like the code reviewer reads only the diff),
  narrow the trigger (a tier, not every groom), and require each lens to attach a *checkable* claim.
- **ROI is real but concentrated.** Most grooms are routine slicing where `groom`'s existing
  Stage 2.5/3/4 + web research already suffice — there, the panel is pure overhead. The gain lives at
  (a) architecture forks / spikes (a wrong call is expensive — it propagates), and (b) genuinely
  high-stakes strategy/positioning. So: **suggested on those, available on demand, never forced, never a
  gate.** Daniel's approval of the scope doc stays the only gate.
- **Where it gains nothing (don't kid ourselves):** routine feature slicing, copy, light enhancements;
  a **CEO persona** (Daniel *is* the CEO/PO — WAYS gives him "the consequential calls"); and any strategy
  lens that can't name a cheap way to validate its claim (that's vibes, not a check).

## Shape (locked)
- **Input = the proposed decision, not the world.** The panel reads *one artifact* — the scope doc
  (`groom` Stage 7) or a spike's draft decision — exactly as the code reviewer reads only `gh pr diff`.
  Bounded input keeps it cheap and honest.
- **Single-pass, parallel, advisory.** Each lens reads once and emits findings. No iterate-to-converge
  loop. If two single-pass takes genuinely contradict on a *specific* point, that one point is what
  Daniel adjudicates — at most **one** targeted second round on just the contested point, never an open
  loop.
- **Lenses = expertise Daniel doesn't already embody, matched to the decision type** (not a fixed
  CMO/CTO/CEO trio on everything). **v1 ships the technical pair only** (highest-ROI, lowest-ambiguity):
  - *Architecture decision / spike* → two technical lenses — a **"Medusa-purist — does this belong in a
    module?"** vs. a **"ship-it pragmatist."** Run on **different model families** via the `--agent` flag
    (Codex / `agy`) so we get the family-blind-spot benefit *and* the role benefit at once.
  - *Strategy / positioning (CMO/brand + skeptical-customer)* → **deferred to v2.** Documented in the
    trigger table below as a dormant threshold; only earns its keep when a lens forces an explicit
    assumption + a cheap way to check it, so it ships after the technical pair proves the rail.
  - *CEO lens dropped* — redundant with Daniel's own seat.
- **Output = printed, not auto-written.** The script prints a labeled advisory block (same banner as the
  cross-review comment: "Advisory only — not a gate. You decide.") for Daniel / the groom session to read
  **before scaffolding**. The script stays **read-only on the doc** — like cross-review prints/comments
  rather than editing code. Once Daniel decides where/whether the takeaways land in the scope doc, they're
  committed as usual (normal doc commit, not a script side-effect).

## What already exists (reuse, don't rebuild)
- **`scripts/cross-review.mjs` + `scripts/cross-review.prompt.md`** — the rail is ~90% of this. It
  already wires the Codex/Antigravity CLIs, version-pins `agy`, enforces single-pass, carries the
  advisory banner, and branches context-passing per CLI (codex takes stdin; `agy` embeds in argv with a
  ~256 KB cap). **Decision: a sibling `scripts/cross-panel.mjs`** (not a generalized `cross-review.mjs`)
  takes `(lens-prompt, input-doc)` and **shares cross-review's CLI-driving helpers** — keeps each script
  single-purpose. A lens-prompt library (`scripts/cross-panel.prompt.md` + per-lens prompts) sits beside
  it, mirroring `cross-review.prompt.md`.
- **The `groom` skill's stage structure** — the natural insertion points already exist: Stage 4
  (architecture reframe), Stage 2 / spike decision, and the Stage 7 scope-doc gate. The panel is an
  optional step *before* Daniel's approval, not a new gate.
- **Risk-tier convention + the command-shorthand vocabulary** (`SESSION-KICKOFFS.md`) — a new verb
  (e.g. **"Panel: <scope-doc>"**) slots into the existing thin-pointer pattern.

## Decisions (locked — Daniel feedback, 2026-06-13)
1. **Sibling script.** `scripts/cross-panel.mjs`, sharing cross-review's CLI-driving helpers — not a
   generalized `cross-review.mjs`. Each script stays single-purpose.
2. **Technical pair first.** v1 ships the two architecture lenses (purist / pragmatist). CMO/brand +
   skeptical-customer deferred to v2.
3. **Model by flag.** No fixed family-per-lens; the `--agent codex|antigravity` flag picks the family per
   run (so a pair runs the two lenses across the two families when Daniel wants the family-diversity benefit).
4. **Print, don't auto-write.** Output is printed before scaffolding; the script never edits the doc. If
   Daniel keeps the takeaways, they're committed into the scope doc as a normal doc commit.
5. **Surfaced, not forced — thresholds below.** The `groom` skill evaluates the ask and *surfaces* the
   panel when it qualifies (never at the very start, never on routine work), and it's always available
   on demand as a verb — exactly the posture cross-review has on PRs. See the trigger model next.

## Trigger model — when the panel gets surfaced (the #5 detail)
Mirror of cross-review's "suggested on HIGH-risk, optional on any, advisory only," adapted to grooming.
**Evaluated at the `groom` classifier (Stage 2) and the Medusa-first reframe (Stage 4)** — not up front,
and the panel is **always available on demand** via the verb regardless of threshold. Three bands:

| Band | When | Behaviour |
|---|---|---|
| **Auto-surface (mandatory offer)** | Stage 2 class = **Spike** (an "A or B / how should this work" architecture question); **or** Stage 4 surfaces a true **architecture fork** — new Medusa module vs Supabase table vs custom route, a new data primitive, an AGENTS-rule tension, or a call that fans into multiple sprints / is expensive to reverse | The skill **must raise** a one-line offer ("this is an architecture fork — run the planning panel? [purist/pragmatist, advisory]"). Can't be silently skipped. Running it is one confirmation (bounds token spend). |
| **Auto-surface (dormant, v2)** | **HIGH-risk strategy / positioning** ask (growth bet, brand/positioning, money-adjacent strategic assumption) | Same mandatory-offer behaviour — but lights up only once the CMO/brand pair ships (v2). Documented now so the threshold exists. |
| **On-demand only** | Everything else — routine feature slicing, copy, light enhancements, chores | Never surfaced (pure overhead there), but always runnable via the verb if Daniel wants it. |

**Auto-surface = a required *offer*, not auto-*run*** — matches code review (which is suggested, never
auto-fired) and keeps foreign-agent token spend a deliberate choice. *(If Daniel later wants the strongest
band — spike / clear architecture fork — to auto-**run** and just print, that's a one-line upgrade; v1
stays at mandatory-offer to be cost-safe and surprise-free.)*

**Verb:** **`Panel: <scope-doc | ask>`** — added to `SESSION-KICKOFFS.md`'s command shorthands, pointing
at `node scripts/cross-panel.mjs <doc> --agent <codex|antigravity> --lens <purist|pragmatist>` (advisory,
single-pass, never gates).

## Scope — in / out (v1)
**In:**
- `scripts/cross-panel.mjs` (sibling; shares cross-review's CLI helpers) — takes an input doc (scope doc /
  spike brief) + `--lens` + `--agent`, runs single-pass via the existing Codex / `agy` CLIs.
- A lens-prompt library: **`architect-purist`** + **`architect-pragmatist`**, each single-pass and
  **required to attach a *checkable* claim** (an assumption + a cheap way to validate it) so output can't
  be pure vibes. Factored into `scripts/cross-panel.prompt.md` (+ per-lens) the way cross-review is.
- **Prints** a labeled, clearly-advisory block (run one lens, or the pair → one combined block with any
  genuine contradiction flagged for Daniel). Read-only on the doc.
- Docs wiring: the **trigger model into `skills/groom/SKILL.md`** (Stage 2 + Stage 4 surface points) and
  the **`Panel:` verb into `SESSION-KICKOFFS.md`**, marked auto-surfaced-on-architecture/spike,
  optional-on-any, advisory-only, never a gate.

**Out (v1):**
- Any **multi-round debate / iterate-to-convergence loop** — the anti-pattern; the whole point.
- The panel **gating, blocking, or approving** a scope doc (advisory only; Daniel's approval is the gate).
- The script **editing/auto-appending** to the scope doc (it prints; Daniel commits takeaways normally).
- **Auto-running** unprompted (v1 is mandatory-*offer* + on-demand, never auto-fired).
- The **CMO/brand + skeptical-customer** strategy lenses (v2) and a **CEO persona** (Daniel's seat).
- Anything touching the Next.js/Medusa app, commerce, money, auth, or i18n (this is planning tooling).

## Slices (skateboard → car) — proposed, 1 sprint
> Independently runnable; each testable by Daniel running the command against a real recent scope doc
> (e.g. one in `00-ideas/2. readyforscope/`).

1. **Skateboard — one lens to stdout.** `node scripts/cross-panel.mjs <doc> --agent codex --lens
   architect-purist` → reads the doc, pipes it + the lens prompt into the chosen CLI (reusing
   cross-review's helpers), **prints** findings. *Acceptance:* run against a real recent scope doc → a
   coherent purist critique that names a checkable claim. *Risk: low.*
2. **The pragmatist lens + the lens-prompt library.** Add `architect-pragmatist`; factor both into
   `scripts/cross-panel.prompt.md` (+ per-lens), each single-pass, each required to attach a checkable
   claim. *Acceptance:* `--lens` switches perspective; the two produce distinct, useful critiques. *Risk: low.*
3. **Run the pair → one combined advisory block.** Run both lenses (single-pass each, across families via
   `--agent`), print one labeled "🔎 Cross-agent planning panel" block with the advisory banner; flag any
   genuine contradiction explicitly for Daniel. *Acceptance:* combined block prints, clearly
   non-authoritative, contradictions surfaced. *Risk: low.*
4. **Wiring (docs/skill).** Add the trigger model to `skills/groom/SKILL.md` (Stage 2 + Stage 4 surface
   points) and the `Panel:` verb to `SESSION-KICKOFFS.md`. *Acceptance:* a fresh groom session knows when
   to surface the panel and how to run it. *Risk: low.*

## QA / smoke (dev tooling — not the app gate)
No tsc/build/Playwright/preview/es-MX (it's a repo script + a skill/doc edit, not app code). QA = **run
the command against a real recent scope doc and eyeball the output**; the per-story acceptance doubles as
the smoke. The sprint-end walkthrough (written at scaffold) names a real scope-doc path + exact commands +
expected printed block.

## Risk tier
**Low** — additive planning/dev tooling, read-only on the input doc, advisory output, no commerce / money
/ auth / migration / shared-app-infra surface. Daniel self-tests by running it against a real recent
scope doc.

## Open risks / watch-items
- **No deterministic gate underneath** (vs. code review) → guard hard against noise: bounded input,
  tiered trigger, every lens must attach a checkable claim, single-pass only.
- **Persona theater** — two instances of one model arguing in costume can *feel* like rigor without being
  it. Running lenses on **different families** and demanding a checkable claim are the mitigations.
- **Loop creep** — if findings tempt a "revise → re-panel → re-revise" cycle, that's the rejected debate
  pattern; address findings once, normally.
- **Cost** — each run spends foreign-agent tokens; on-demand + tiered bounds it (same as cross-review).
- **`agy` is young** — flags drift; the existing rail already version-pins and warns.

## Definition of Ready — checklist
- [x] As-a / I-want / so-that clear; acceptance testable by Daniel (run it against a real scope doc).
- [x] Stage-2.5 bucket named (light enhancement; extends the cross-review pattern).
- [x] v1 in/out boundary written (debate loop + gating + auto-write + CMO/CEO personas explicitly out).
- [x] Reuse list produced (`cross-review.mjs` rail, `groom` stages, risk-tier + shorthand conventions).
- [x] The five open questions settled with Daniel (see "Decisions", 2026-06-13).
- [x] Each story risk-tiered (all low); QA/smoke named (run-and-eyeball; owner = Daniel, self-run).
- [ ] **Daniel approves this scope** → then scaffold the epic + sprint + emit the Claude Code kickoff
      (or decide it's not worth building).
