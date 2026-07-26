# QA guardrail hardening — Sprint 1: lint actually runs, in both repos

**Status:** ⬜ not started

> Closes the fork between a Definition of Done that says "lint clean" and a CI that never checks.
> Two repos, two different problems: the frontend has a config nobody runs; the backend has no config.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D1 and D2.

- **Measured baseline, 2026-07-26: `npm run lint` in `apps/miyagisanchez` exits 1 — 481 problems
  (243 errors, 238 warnings) across exactly 6 files.** `app/`, `lib/`, `components/` are already clean.
  Re-run it yourself first and confirm the number before changing anything; if it has drifted, report
  that rather than silently building against a stale premise.
- **D1's scoping rule is binding and is not yours to widen:** `references/**` is excluded (vendored
  design-system mockups, never shipped). `scripts/` and `services/` are **ours** — **fix those
  findings, do not exclude them.** It is ~13 findings across 2 files. Excluding our own code to make a
  gate pass turns the gate into theatre, which is the exact thing this sprint exists to stop.
- **The backend has NO eslint config at all** — not disabled, absent. Give it a minimal, honest one
  (TypeScript + the Medusa v2 layout). Do not import the frontend's Next-specific config; there is no
  React here.
- **Do not touch `.github/workflows/ci.yml`'s existing jobs.** Add a new one (D2).
- The backend's `Type-check + build + unit` check is a **required status check** on `main` (branch
  protection, configured 2026-06-14). Adding a *new* job does not automatically make it required —
  note in the PR that promoting it to required is a separate, deliberate step.

## Stories

### Story 1.1 — frontend: scope the ignores honestly, fix our own code, gate it ⬜
**As a** builder, **I want** CI to enforce the lint rule our DoD already claims, **so that** compliance
stops depending on memory.
**Acceptance:**
- `eslint.config.mjs` `ignores` excludes `references/**` with a comment saying **why** (vendored,
  not shipped, not ours) — so the next reader doesn't mistake it for hiding debt.
- The findings in `scripts/seed.ts` and `services/print-pdf/server.js` are **fixed**, not ignored.
- `npm run lint` exits 0 from a clean checkout.
- A new `lint` job in `.github/workflows/ci.yml` runs it on every PR.
- **Prove the gate bites:** plant a deliberate violation, confirm CI (or a local run of the exact CI
  command) fails, remove it. Record this in the PR — a gate nobody has seen fail is not known to work.

### Story 1.2 — backend: a lint config from zero, and the same gate ⬜
**As a** builder, **I want** the backend to have any static analysis at all, **so that** it stops being
the one repo with none.
**Acceptance:**
- `eslint.config.mjs` + `lint` script added to `apps/backend`. Flat config, TypeScript-aware, matched
  to Medusa v2's `src/` layout. Minimal and honest — a rule set we will actually keep green, not an
  aspirational one that gets disabled next week.
- `npm run lint` exits 0 (fix what it finds, or narrow the rule set deliberately and say why in the PR).
- A new `lint` job in the backend's `ci.yml`.
- Same planted-violation proof as 1.1.

## Definition of Done (sprint)
- [ ] Both repos: `npm run lint` exits 0 locally and a lint job runs in CI.
- [ ] The planted-violation proof recorded in each PR.
- [ ] `tsc --noEmit` + build still green in both repos (a lint config can change nothing else).
- [ ] Cross-agent review run on each PR; findings resolved.
