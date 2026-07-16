---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: doc-format-consistency
---

# Epic: Roadmap doc-format consistency — rules, sweep, and an automatic checker

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/doc-format-consistency.md`](../../00-ideas/seeds/doc-format-consistency.md)

## Why
`Roadmap/` docs (epic READMEs, sprint files, retrospectives) have drifted in format — not cleanly
old-vs-new, but genuinely inconsistent even within the same week. A sample of ~30 docs found no two
epic-README headers using the same field set, at least 4 distinct sprint "Status:" line formats, and
retrospectives ranging from a tight 4-section shape to freeform extras. This makes docs harder to
scan and, ironically, was partly caused by copy-pasting an older doc's header without checking
whether what it referenced (e.g. a since-deprecated folder) was still correct. This epic defines the
canonical shape, sweeps existing docs to match it, and adds a checker so it can't silently re-drift.

## Medusa-first note
N/A — pure docs/tooling, no commerce surface.

## What already exists (reuse, don't rebuild)
- The `groom` plugin's scaffolding templates (`~/.claude/plugins/cache/dobby-foundation/ways-of-work/<hash>/skills/groom/templates/`)
  ARE the canonical shape — proven by the zero-drift `00-ideas/seeds/*.md` control group (81 files,
  one authoring path). Fixed a real template bug as part of this epic's research: `scaffold-epic.mjs`
  already computed a `Class` value from its own `--type` flag but the template never rendered it —
  see `dobby-foundation` repo PR #1 (open, awaiting Daniel's merge — a separate, shared plugin repo).
- `scripts/doc-hygiene.mjs` — complementary, not overlapping: content/staleness checks (dedupe,
  dead paths, archived-epic mentions) on exactly `LEARNINGS.md` + the poster. This epic's checker
  covers FORMAT (headings, frontmatter shape, section order) across the whole `Roadmap/` tree.
- `scripts/build-order.mjs` + `.github/workflows/build-order-guard.yml` — the house shape this
  epic's checker + guard workflow directly mirror (plain node script, `--check` flag, dedicated
  `*-guard.yml`, `Roadmap/**` trigger paths).
- `lib/design-token-audit.ts` / `lib/emoji-guard.ts` (apps/miyagisanchez) — the incremental-adoption
  `enforcedSweptPaths` allow-list pattern this epic's own gate policy reuses (only swept
  macro-sections hard-gate; the rest stay visible-but-advisory during rollout).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Define the canonical rules in WAYS-OF-WORKING.md + build `doc-format.mjs` (check/report modes only, zero doc edits) + ship `doc-format-guard.yml` advisory | Low |
| 2 | 2.1 Sweep existing docs to canonical shape, per-macro-section, growing `ENFORCED_SWEPT_PATHS` as each section goes green | Low |
| 3 | 3.1 Wire the `PostToolUse` hook (`.claude/settings.json`) + flip `doc-format-guard.yml` to required once the sweep is complete and one cycle is clean | Low |

## Deploy order
Doc-only + tooling — no backend/frontend deploy involved. Sprint 1 ships zero doc edits (checker +
guard only); Sprint 2 touches `Roadmap/**` in path-limited, per-macro-section commits (per
WAYS-OF-WORKING's own concurrent-editing convention — never `git add Roadmap/` wholesale); Sprint 3
is a `.claude/settings.json` change, checked in so it applies to everyone, not per-user.

## Definition of Done (epic)
- [ ] `doc-format.mjs` + tests + advisory guard workflow shipped, zero findings against a full-tree
      report before any sweep begins (S1)
- [ ] All active (non-archived) macro-sections swept to canonical shape, each added to
      `ENFORCED_SWEPT_PATHS`, CI green (S2)
- [ ] `PostToolUse` hook live in `.claude/settings.json`; `doc-format-guard.yml` flipped to required
      after one clean cycle (S3)
- [ ] This README `status: shipped`; retro written; durable learnings promoted to `LEARNINGS.md`
- [ ] `dobby-foundation` PR #1 (the template fix) merged — otherwise every newly-scaffolded epic
      keeps reproducing the header drift this epic exists to fix
