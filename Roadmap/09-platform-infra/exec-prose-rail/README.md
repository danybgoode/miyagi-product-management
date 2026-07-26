---
status: scaffolded
slug: exec-prose-rail
---

# Epic: Executive prose rail — a CPO voice for the scheduled reports

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/delivery-rail-hardening.md`](../../00-ideas/seeds/delivery-rail-hardening.md)

## Why

The daily standup and the weekly recap are **machine output wearing a report's name**. Today
`standup.mjs` emits delta lines — `✅ miyagisanchezcommerce merged: #308, #310`, `🧪 Browser smoke:
success` — which answer *what changed in the repos* and never answer *what is now true for the
product*. Daniel reads them on a phone. They are the two surfaces he actually sees every day, and
they are the two written with the least care.

golden-beans solved this for one surface (deployment notifications) with a rail that is working well:
a house-voice prompt, a **pure mechanical guard** on every draft, and an accumulating lessons file.
This epic brings that rail here — and raises its altitude, because our reports have an input
golden-beans does not have.

**The input advantage, and it is the whole design.** golden-beans' rail is git-log-derived: it reads
commit subjects and infers product meaning. We have the **Roadmap tree** — epic READMEs, sprint docs
carrying plain-language user stories and acceptance criteria, retrospectives. That is *already*
product language, written before the code. A report that leads with roadmap deltas and uses commits
as corroboration can genuinely write at product altitude. One that leads with commits can only ever
be an engineering report with the adjectives swapped. **This is the difference between the two rails,
and every design decision below follows from it.**

## Medusa-first note

**N/A — zero commerce surface.** AGENTS rules 1–4 untouched. Rule 5 (es-MX): N/A — these are
internal English reports to one reader. Touch surface: `scripts/lib/prose-*.mjs`, `scripts/prose/`,
`scripts/standup.mjs`, `scripts/weekly-recap.mjs`, `scripts/prose-draft.mjs`,
`scripts/routines/{ops-nightly,weekly-recap}.prompt.md`. No app code, no migration, no flag.

## What already exists (reuse, don't rebuild)

| Asset | Reuse as |
|---|---|
| `scripts/lib/cross-agent-cli.mjs` | Already exports `hasCmd`, `loadPromptBody`, `runAntigravity` (with an `opts.models` override) and a `runDevin` that already rides `--prompt-file`. **The writer layer is thin on top of this** |
| `scripts/prose-draft.mjs` + `.prompt.md` | **Upgraded, not replaced** — it becomes a caller of the shared rail |
| `scripts/standup.mjs` | Its gather/diff/log/send stages are correct and stay; only the *message body* changes |
| `scripts/lib/telegram-format.mjs`, `standup-deck.mjs`, `report-registry.mjs` | Untouched — deck links and HTML escaping already work |
| golden-beans `prose-guard.mjs` / `prose-writer.mjs` | Ported with attribution, not reinvented |

---

## Architect's locked decisions (D1–D8)

Locked against live code **and** a live CLI probe before any builder started. Builders **cite** these;
they do not re-derive them.

### D1 · Two writer backends, one shared guard

Per seed D-1. **Routines write the standup + weekly in-context; everything else uses devin → agy
locally.** The guard, persona and lessons file are shared.

The reason a straight port fails is worth restating because it is invisible until it bites: **a
Claude Routine has no local CLI credentials.** `prose-writer.mjs` shells out to `devin`, falling back
to `agy`. In the routine sandbox both are absent, `hasCmd` returns false for each, and `writeProse`
returns `{ ok: false, error: 'no prose writer available' }` — the report degrades to nothing on
exactly the surface the epic exists to improve. This is the same headless-auth wall that made
`cross-agent-review-always` local-only.

### D2 · Two-phase, because a routine cannot pipe itself through a guard

A local script can call a model and check the result in one process. A routine **is** the model —
so the guard has to run as a separate step it invokes. Hence:

```
phase 1   node scripts/standup.mjs --brief
          → deterministic evidence pack + persona + task on stdout. Writes nothing. Sends nothing.
phase 2   routine writes the prose in-context
phase 3   node scripts/standup.mjs --post --prose-file <path>
          → runs the SAME pure guard. Findings → non-zero exit + a numbered revision note.
          → routine revises once, re-runs phase 3. Clean → posts.
```

**Determinism stays in code; only sentence-making is model work.** The guard is the same pure module
the local rail uses, so a lesson learned on either backend protects both.

### D3 · Guard-and-retry, never guard-and-fail

Ported from golden-beans verbatim in spirit: a rejected draft is handed back **with numbered
findings** and rewritten once. A draft that still trips a rule is **posted anyway, labelled**, never
silently dropped — a flagged report a human can correct beats a missing report. `--post` therefore
exits non-zero on findings but **still posts when given `--force-post`**; the routine's second attempt
uses it. A blank standup is a worse failure than an imperfect one.

### D4 · Roadmap deltas lead the evidence pack; commits corroborate

The pack, in this order:
1. **Roadmap deltas** — epic README `status:` frontmatter flips, sprint `**Status:**` line changes,
   new/changed acceptance criteria, retros added. *(`weekly-recap.mjs` already parses `status:` flips
   from `git log -p`; reuse that parser, do not write a second one.)*
2. **What is owed** — from epic B's generated ledger when present; degrade cleanly when absent.
3. **Repo signals** — merged/opened PRs, CI red, conflicts, smoke result (today's `buildSnapshot`).
4. **Areas touched** — shape only, never file names.

### D5 · The persona is a file, not a prompt string — and it is a CPO, not a PM

`scripts/prose/cpo-persona.md` holds the register; `scripts/prose/{standup,weekly,internal}.task.md`
hold per-surface tasks. Plain files: reviewable in a diff, shared by both backends, survives a machine
change. **Never bind the specialization to one laptop** (`devin rules` would).

The register is deliberately a step above golden-beans' commit-report PM voice:

- **Functional and design-system first.** What can someone *do* now; what surface changed; what the
  system now guarantees. Not what was implemented.
- **User perspective before system perspective.** Name a real person — a merchant activating a shop,
  a partner handed a portfolio, Daniel himself. Never "the user."
- **Decisions are the highest-value sentence.** What was chosen over an obvious alternative, or
  deliberately left out. The diff cannot show this; it is the one thing only a report can carry.
- **Honest about incompleteness.** "The rail exists; nothing fires yet because the schedule has no
  runner" is a *better* sentence than any confident summary of what landed.

### D6 · Every failure mode golden-beans measured is inherited as a guard rule, not as advice

Its guard exists because a cheap model produced material falsehoods on **two of its first three
runs**. All rules port, and the `allowsFixClaim` / `allowsBeneficiary` evidence flags stay **derived
from the window**, never assumed. Two additions specific to us:

- **`invented-commitment` stays unconditional.** Git and roadmap docs contain no deadlines, so any
  date in a derived report is fabricated by construction. Our roadmap docs contain *target-shaped*
  language ("owed to Daniel"), which makes this **more** likely to fire here than at golden-beans, not
  less.
- **New rule — `flag-state-claim`.** Ours is a flag-gated shop. A report saying a capability "is live"
  when its flag is OFF is the exact class of confident falsehood this guard exists to stop, and we
  have shipped five flag-gated epics in two weeks. Assert live-ness only when the evidence pack says
  the flag is ON.

### D7 · An empty window must not call a writer

golden-beans' `isEmptyPeriod` refuses to invoke a model on an empty changelog, because a model handed
nothing produces plausible prose about nothing. Our `standup.mjs` already has the sibling of this bug
recorded in LEARNINGS (a missing baseline once enumerated 100+ PRs and crashed on Telegram's 4096-char
limit). **`--brief` on an empty window emits an explicit "quiet night, do not write prose" instruction
and the routine posts the existing one-line quiet message.**

### D8 · Prose leads, compact signals below (Daniel's call, 2026-07-26)

Message shape: header → **prose paragraph** → the delta lines trimmed to what is *actionable* (CI red,
merge conflicts, owed count) → deck link. Rationale: the guard forbids naming specifics like PR
numbers, so a red CI **cannot** survive the paragraph. The signal block is not decoration — it is
where the actionable pointers live, and prose-only would lose them.

## Model routing (D3 of the seed)

| Sprint | Model | Why |
|---|---|---|
| S1 — guard + writer rail + persona | **Opus 5** | Defines the contract S2/S3 import; the guard is pure logic whose rules encode measured failures |
| S2 — standup two-phase | **Sonnet 5** | Mechanical over a locked contract |
| S3 — weekly + lessons loop | **Sonnet 5** | Same rail, second surface |
| Review | Fresh `pr-reviewer` on **Opus 5** for S1 | Review inverted per WAYS-OF-WORKING |

## Risk tier

**LOW, all three sprints** — internal tooling, no app code, no commerce/auth/money surface, no
migration, no flag. Cross-agent review mandatory on every PR regardless. Note the epic's own output is
a channel Daniel treats as status, so a *wrong* report is the real risk — which is what D3/D6 exist for.

## Definition of Done (epic)

- [ ] S1–S3 merged; deterministic gate green on each.
- [ ] `node --test scripts/` passes, including the ported guard suite.
- [ ] A real `--brief` → write → `--post --dry-run` round trip executed and its output pasted in the PR.
- [ ] Both routine prompts updated to the two-phase loop.
- [ ] `prose-draft.mjs` rides the shared rail (register bug D-1 fixed).
- [ ] `RETROSPECTIVE.md`; poster + `LEARNINGS.md` updated; memory + `MEMORY.md` index.
- [ ] Branch deleted.
