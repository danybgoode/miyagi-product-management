---
status: shipped
slug: qa-guardrail-hardening
---

# Epic: QA guardrail hardening — close the gaps between the documented DoD and what CI enforces

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/delivery-rail-hardening.md`](../../00-ideas/seeds/delivery-rail-hardening.md)

## Why

Our Definition of Done says *"Type-check + lint + build clean."* **Lint is not run by CI in either
repo** — in the frontend it is configured and never invoked; in the backend it does not exist at all.
So today lint compliance depends on whichever agent remembers. That is a documented rule with no
mechanism, which is the same failure class as a paraphrased contract drifting permissive
(`LEARNINGS.md`): the rule and the enforcement have forked, and the fork accepts what the real rule
rejects.

Three more gaps from the same audit, all verified live:

- **Two backend test scripts give false confidence.** `test:integration:http` matches a directory that
  does not exist and exits green — *worse than no script, because it looks like a passing gate.*
- **The "owed to Daniel" ledger is 71 files of scattered comments.** The audit counted 75 two days
  before we counted 71. A number nobody can regenerate is a number nobody should cite.
- **Automatic security review is the clearest unclaimed item on the AI-adoption ladder** at both
  step 2 and step 3, and the benchmark seed explicitly warns: *do not assume `cross-review.mjs`
  counts* — it is general-purpose and advisory by design.

## Medusa-first note

**N/A — no commerce behaviour changes.** No migration, no flag, no app logic. Touch surface: both
repos' `.github/workflows/ci.yml`, backend `eslint.config.mjs` + `package.json` scripts, frontend
`eslint.config.mjs` ignores, root `scripts/owed-ledger.mjs` + `scripts/cross-review.mjs`.

## Architect's locked decisions (D1–D6)

### D1 · The audit's "one line in ci.yml" is wrong — and the real answer is a scoping decision

**Verified 2026-07-26: `npm run lint` exits 1 with 481 problems (243 errors, 238 warnings).**

But the distribution is the whole story. All 481 sit in **6 files**:

| Location | What it is | Ship? |
|---|---|---|
| `references/miyagi-s-nchez-design-system/**` (4 files) | Vendored design-system mockups — loose JSX, undefined components by design | **No** |
| `services/print-pdf/server.js` | A standalone service, CommonJS `require()` | Not via `next build` |
| `scripts/seed.ts` | A dev seed script | **No** |

**`app/`, `lib/`, and `components/` are already clean.** So the sprint is *not* "fix 243 errors" — it
is **"decide what counts as our code, encode it in `ignores`, then gate it."** That is genuinely
cheap, and it is a decision, not a one-liner.

**The rule: `references/` is excluded (vendored, never shipped); `scripts/` and `services/` are
OURS and get fixed, not excluded.** Excluding our own code to make a gate pass is how a gate becomes
theatre. It is ~13 findings across two files — do the work.

### D2 · Add lint as a separate CI job, not a step in the existing one

A parallel job fails fast and reads clearly in the checks list; bolting it onto the `tsc + build` job
serialises it behind a slow build for no benefit. Same shape in both repos.

### D3 · Delete the dead backend integration scripts; do not "fix" them

`test:integration:http` points at a directory that has never existed. Writing HTTP integration tests
to justify the script is scope this epic has no mandate for, and the audit did not ask for it. **A
script that exits green having run nothing is a false gate — remove it.** `test:integration:modules`
is a duplicate label over the unit suite; remove it too. Record in the retro that a real integration
tier remains unbuilt — an honest absence beats a green lie.

### D4 · Coverage is a NUMBER, not a gate

Add `--coverage` to the backend Jest run and V8 coverage on the frontend, reported in CI output.
**No threshold, no failing build.** We have file counts today and no idea what fraction they touch;
the first useful step is measurement. A threshold picked before anyone has seen the number is
arbitrary, and an arbitrary threshold gets bypassed.

### D5 · The owed ledger is generated, self-healing, and follows `build-order.mjs`'s proven pattern

`scripts/owed-ledger.mjs` greps the `owed to Daniel` markers across the frontend spec tree, categorises
them (**auth-path / money-path / admin-only / other**), and emits a report. The pattern is already
proven twice here (`build-order.mjs`, `build-order-sync.mjs`) including CI-guarded staleness. **It
must re-derive the population mechanically** — `LEARNINGS.md → guard the population, not the door you
found` is exactly this failure: enumerate by rule, never by the list someone happened to write.

Its count feeds the standup's evidence pack (exec-prose-rail D4) — which is why this epic's S3 should
land before that epic's S2 if the ordering is free. **It degrades cleanly when absent**, so the
ordering is a preference, not a dependency.

### D6 · Security review is a LENS on the existing mandatory rail, not a new tool

The benchmark seed asked: existing product, or a `scripts/` addition alongside `cross-review.mjs`?
**Answer: alongside — as a `--lens security` mode.** The reasoning is that `cross-review.mjs` is
*already mandatory on every PR* and already pipes the diff to a different model family, so a lens
inherits that enforcement for free. A separate tool would need its own mandate, its own trigger, and
its own place in the merge rule — three things that can rot independently.

**This does not make the epic's security claim stronger than it is.** It remains LLM-advisory,
local-only, single-pass — not SAST, not CodeQL. The retro must say so plainly. What it closes is
"nothing looks at a diff *through a security lens* automatically"; what it does not close is "we have
no static security analysis."

Also in scope here (seed D-2): **`cross-review.mjs` records the model that actually ran** in its PR
comment. Today `CODEX_MODEL` defaults to `null`, so the reviewer inherits machine-local
`~/.codex/config.toml` state that no artifact records. Live probe 2026-07-26 confirmed
`gpt-5.6-terra` / effort `high` — the intended tier, so **no model change** — but an unrecorded
reviewer is an unauditable one.

## Model routing

| Sprint | Model | Why |
|---|---|---|
| S1 lint gates | **Sonnet 5** | Mechanical once D1's scoping rule is locked |
| S2 dead scripts + coverage | **Sonnet 5** | Deletion + a flag |
| S3 owed ledger | **Sonnet 5** | Follows an existing proven generator pattern |
| S4 security lens + model recording | **Opus 5** | Touches the mandatory review rail every PR depends on; a bug here degrades review silently |

## Risk tier

**LOW** — CI config, internal tooling, no app behaviour. One caveat: **S4 edits the rail that reviews
every other PR.** A regression there is silent and affects everything downstream, so S4 carries a
fresh `pr-reviewer` pass regardless of tier, and its own output must be verified by running it on a
real PR.

## Definition of Done (epic)

- [ ] S1–S4 merged; both repos' CI green.
- [ ] Lint runs in CI in **both** repos and genuinely fails on a planted violation (prove it).
- [ ] The two dead backend scripts are gone; coverage numbers appear in CI output.
- [ ] `owed-ledger.mjs` output committed and its count reproducible.
- [ ] `cross-review.mjs --lens security` run against a real PR, output pasted.
- [ ] `RETROSPECTIVE.md` states plainly what the security lens does **not** cover.
- [ ] Poster + `LEARNINGS.md` + memory updated.
