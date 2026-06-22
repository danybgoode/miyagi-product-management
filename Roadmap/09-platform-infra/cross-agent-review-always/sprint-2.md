# Sprint 2 — Policy & docs ("always", advisory)

**Epic:** [Cross-agent review on every PR](README.md) · **Risk:** all LOW · **Repo:** monorepo-root (`Roadmap/`, PR template)
**Goal:** the written policy says cross-review runs on **every PR**, advisory, never gates — so the expectation
is explicit for every agent and human, matching the CI automation from Sprint 1.

> Independent of Sprint 1 — this can land even if the CI auto-run is blocked on headless auth (it would then
> read "run `cross-review.mjs` locally on every PR" instead of "CI runs it for you").

## Stories

### S2.1 — WAYS §Review & merge → "every PR" · LOW
**As a** contributor, **I want** the ways-of-working to say cross-review runs on every PR, **so that** the new
default is authoritative, not folklore.
- In `Roadmap/WAYS-OF-WORKING.md` §Review & merge, change the "**Cross-agent second opinion (optional,
  advisory)**" paragraph from "Suggested on HIGH-risk PRs, optional on any" → "**Runs on every PR**
  (CI-automated where headless auth allows; otherwise run locally), **advisory only — never gates, blocks, or
  authorizes a merge.**" Leave the risk-tier *merge* rule and the single-pass discipline untouched.
- **Acceptance:** WAYS reflects the new default and still states it never gates. **QA:** doc diff.

### S2.2 — PR template + kickoffs · LOW
**As a** fresh agent, **I want** the PR template and kickoffs to reflect the new default, **so that** I run /
expect cross-review on every PR without being told.
- `.github/PULL_REQUEST_TEMPLATE.md`: retitle "Cross-agent review (optional)" → "Cross-agent review" and note
  it auto-runs on every PR (advisory); keep the manual command line as the local/fallback path.
- `Roadmap/SESSION-KICKOFFS.md` #4: change the "Optional (suggested on HIGH)" cross-review line to "every PR,
  advisory." Update the kickoff template's review line to match.
- **Acceptance:** a fresh agent reading the kickoff knows cross-review is expected on every PR and that it's
  advisory-only. **QA:** doc diff.

## Sprint QA
- Docs/copy only — no code, no gate. QA is the diff plus a read-through for internal consistency (no remaining
  "suggested on HIGH" / "optional" language about cross-review anywhere: WAYS, kickoffs, PR template).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the monorepo-root repo on `main` (or the planning branch's diff pre-merge).

1. Open `Roadmap/WAYS-OF-WORKING.md` → §Review & merge.
   → The cross-agent paragraph says it runs on **every PR**, advisory, never gates. No "suggested on HIGH."
2. Open `.github/PULL_REQUEST_TEMPLATE.md`.
   → The cross-review section is no longer titled "(optional)" and notes the CI auto-run.
3. Open `Roadmap/SESSION-KICKOFFS.md` → #4.
   → The cross-review line reads "every PR, advisory," consistent with WAYS and the template.

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [x] **S2.1** — ✅ WAYS §Review & merge reworded: "run **locally** on every PR, advisory, never gates" (root #29).
- [x] **S2.2** — ✅ PR template (`Cross-agent review`, no "(optional)") + `SESSION-KICKOFFS.md` #4 line + phrase
      table now say "run locally on every PR, advisory" (root #29).

> **Note:** the policy says "run **locally** on every PR" (not "CI runs it") — S1.2's CI auto-run was descoped
> to local-only by decision (see `README.md` / `sprint-1.md`). The "every PR, advisory, never gates" intent is
> unchanged; only the *mechanism* is the local command, not a workflow.
