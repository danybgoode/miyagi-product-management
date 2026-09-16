---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: ways-of-work-lean-pass
build_order: 3
---

# Epic: Ways-of-work lean pass — remove the training wheels, close the adoption gap

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Chore · **Archetype:** Sweeper · **Scope seed:** [`00-ideas/seeds/ways-of-work-lean-pass.md`](../../00-ideas/seeds/ways-of-work-lean-pass.md)
> **Appetite:** L (multi-wave — one wave per sprint, re-bet at each boundary) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)
> **Audit:** [`00-ideas/audits/ways-of-work-audit-2026-09-16.md`](../../00-ideas/audits/ways-of-work-audit-2026-09-16.md)

> ⚠️ **The code lands in `dobby-foundation`, not here.** This epic is planned in medusa's funnel
> because `dobby-foundation` has no `Roadmap/` of its own — and **Story 1.1 fixes exactly that**.
> Precedent: `Roadmap/09-platform-infra/dobby-foundation/` (shipped 2026-07-20).
> Two consuming repos (`medusa-bonsai`, `golden-beans`) are also touched by Sprint 3's regeneration.

## Why

The operating system works, and it has accreted. `WAYS-OF-WORKING.md` (446 lines) and
`groom/SKILL.md` (514) are loaded by every builder session, every groom session and the reviewer
subagent — ~14k tokens before a line of code — and they were written for a Step-1 world: one
supervised agent, low trust, read everything. Every lesson since became another paragraph instead of
replacing one, so the escalate-don't-guess trigger list now appears **four times**, three of them
prefaced *"one SSOT, don't fork a second copy here."*

Meanwhile the Step-2→3 unlocks our own `references/Steps-of-AI-Adoption.md` names are the parts built
least: no auto mode, no pre-approved permission set, **no deny list at all**, three review layers per
HIGH PR held together by ~2,400 lines of plumbing, and no automated security review.

After this epic: a builder runs an epic without stopping for a prompt that isn't a genuine
money/auth/deploy decision; every PR gets exactly one cross-family pass plus one fresh reviewer; and
orientation costs under ~6k tokens.

**The training wheels being removed are not the guardrails. They are the manual re-implementations of
things the platform now does for us, and the ceremony that a Step-2/3 operation has outgrown.**

## Platform-first note

**Nothing here needs a new primitive.** The reframe re-scoped this epic substantially:

- `template/.claude/settings.json` **already exists** — the permissions blocks are a pure addition to
  a file in place, not a new mechanism.
- `medusa-bonsai/.claude/settings.json` **already proves the hooks block works** (`PostToolUse` →
  `doc-format.mjs`), so the shape is known-good.
- The review policy's missing piece is an **agent file that already exists** in medusa
  (`.claude/agents/pr-reviewer.md`) — port, don't write.
- `cross-review.prompt.md` **already exists** as a shared prompt; widening it is cheaper than
  inventing a second review-instruction file, and it is the one file both readers can share.
- The epic-DoD script is the only genuinely new build, and it copies `check-plugin-leaks.mjs`'s
  ALLOW-with-a-written-reason discipline verbatim.

**Data ownership:** no data. Config, markdown, one check script, one renderer.

## What already exists (reuse, don't rebuild)

- `dobby-foundation/template/.claude/settings.json` — marketplace + plugin config; add `permissions`.
- `medusa-bonsai/.claude/settings.json` — the working `hooks` precedent.
- `medusa-bonsai/.claude/settings.local.json` — 175 allow entries; the **triage input** for S1.4.
- `medusa-bonsai/.claude/agents/pr-reviewer.md` — the fresh reviewer. Port; generalize repo names only.
- `template/scripts/cross-review.mjs` + `lib/cross-agent-cli.mjs` + `cross-review.prompt.md` — **kept.**
- `template/scripts/review-route.mjs` (273 + test) — **collapsed** to a ~30-line rule.
- `medusa-bonsai/scripts/{codex-doctor,agy-doctor}.mjs` — **merged** into one `cross-agent-doctor.mjs`.
- `medusa-bonsai/scripts/cross-review.security.prompt.md` — the seed content for security review.
- `dobby-foundation/scripts/check-plugin-leaks.mjs` — the ALLOW-with-reasons pattern `epic-dod.mjs` copies.
- `dobby-foundation/scripts/pack-skills.mjs` — the **byte-for-byte reproducible output** discipline the
  `WAYS-OF-WORKING` renderer must copy, so regeneration is boring rather than noisy.
- `golden-beans/scripts/check-template-drift.mjs` — extend to detect *rendered-file* drift, not just
  unfilled placeholders.
- `references/Steps-of-AI-Adoption.md` — the rubric for "did this actually close the gap".
- `references/shapeup/` — the destination for the betting philosophy prose cut from `WAYS-OF-WORKING`.

## Architecture decisions to lock before any builder starts

The orchestrator locks these against live code and live data, writes them here as `D1…Dn`, and
builders **cite** them rather than re-deriving them.

- **D1 — the exact allow verb list**, derived from triaging medusa's 175 entries plus golden-beans'
  own local file. Named, not "roughly forty".
- **D2 — the deny list**, derived from the three repos' AGENTS "cannot be violated" rules. Each entry
  cites the rule it enforces.
- **D3 — the one-line reviewer-selection rule** replacing the four-row router table, and where it lives.
- **D4 — the `cross-review.prompt.md` structure** after widening: which sections both readers read,
  which are CLI-only.
- **D5 — the `WAYS-OF-WORKING` slot schema** (`roadmap/fill-ins.yml` keys) and the renderer's no-op
  guarantee. **Lock this against both consuming files' actual divergences, read first** — not against
  the template alone.
- **D6 — the epic-DoD derivable set:** exactly which of the nine items the script owns, and the
  evidence each one reads.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 `dobby-foundation` gets its own `Roadmap/` | low |
| 1 | 1.2 A committed `permissions.allow` in the template | low |
| 1 | 1.3 A `permissions.deny` that is the real guardrail | high |
| 1 | 1.4 Auto mode on, deny list as the floor | high |
| 1 | 1.5 Retire `settings.local.json` accretion in both consuming repos | low |
| 2 | 2.1 The review policy, rewritten to one cross-family pass + one fresh reviewer | high |
| 2 | 2.2 `cross-review.prompt.md` becomes the one shared review prompt | low |
| 2 | 2.3 Port `pr-reviewer.md` into the plugin, unconditional | low |
| 2 | 2.4 The empty-output guard becomes a hard fail | high |
| 2 | 2.5 Collapse the router, delete the capped-roster protocol, merge the doctors | low |
| 2 | 2.6 Demote the planning panel to on-demand | low |
| 2 | 2.7 Automated security review in our own CI | high |
| 2 | 2.8 Delete the second cross-family pass | high |
| 3 | 3.1 `WAYS-OF-WORKING.md` diet to ≤160 lines | low |
| 3 | 3.2 `groom/SKILL.md` progressive disclosure to ≤220 lines | low |
| 3 | 3.3 `epic-dod.mjs --check` — script the derivable five | low |
| 3 | 3.4 De-duplicate the escalate triggers to one place | low |
| 3 | 3.5 Regenerate both consuming `WAYS-OF-WORKING.md` from the template | high |

## Deploy order

**No runtime deploy.** Config, docs and scripts across three repos. The ordering that matters is
**safety ordering, and it is the epic's actual guardrail:**

1. **S1.3 (deny) ships BEFORE S1.4 (auto mode).** Never the other way. A deny list that lands after
   auto mode is a window where an agent may run anything unattended.
2. **S2.4 (empty-output hard fail) and S2.3 (unconditional fresh reviewer) ship BEFORE S2.8
   (deleting the second pass).** Removing corroboration before its replacement exists is the one way
   this epic causes a production incident.
3. **S3.5 (regeneration) is last**, after both consuming files have been diffed against their
   rendered form and every project-specific paragraph has become a named slot or been deliberately
   dropped and listed in the retro.

Branches stack: `feat/ways-of-work-lean-pass` → `-s2` → `-s3`, one PR per sprint, merged in order.
All three sprints share `template/` and the `groom` skill by construction — **stack or pay.**

**Model routing:** Sprint 2 defines the contract everything else imports (the review policy) and
Sprint 1 carries the auto-mode risk — both on the stronger model. Sprint 3 is mechanical over locked
decisions apart from S3.5, which is uphill and stays on the stronger model. Review is inverted: the
fresh-reviewer pass on Sprints 1 and 2 runs on the strongest model available.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch: carve-out, decided at grooming.** No runtime seam exists — this epic ships config,
      markdown and one check script. **Git is the rollback**, and the safety property is the *ordering*
      in *Deploy order* above (deny before auto mode; corroboration before deletion), not a flag.
- [ ] **Every cut paragraph accounted for** — moved to `references/`, replaced by a check, or listed
      as deliberately dropped in `RETROSPECTIVE.md`. **No silent deletions.**
- [ ] Feature branches deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
