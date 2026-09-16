# Golden Frijoles is the flag provider — Sprint 1: The mandate, the preflight and the agent-guided onboarding

**Status:** ⬜ not started

**Epic:** [Golden Frijoles is the flag provider](README.md) · **Risk: MIXED (LOW + HIGH)** — 1.2 and 1.6 are HIGH (they define how every future project reads flags); the rest LOW

**Lands in `dobby-foundation`.** No runtime change in any consuming app. **Blocked on the CLI epic's
Sprint 2** — every artefact in this sprint names commands that must exist.

## Stories

### Story 1.1 — `groom` Stage 6b rewritten to the Golden Frijoles contract
**As a** groom session planning a HIGH-risk epic, **I want** the kill-switch story to name a real,
project-agnostic flag mechanism, **so that** the planning skill stops hardcoding one consumer's
architecture into every future project.
**Acceptance:** Stage 6b names `gf flags create <key> --kill-switch --all-envs` and the SDK's
`createFlagProvider` in place of *"extending `lib/flags.ts` `DEFAULT_FLAGS`"*. **The polarity doctrine
is unchanged** — kill-switch ⇒ default `true`, created ENABLED; enablement ⇒ default `false`, created
DISABLED — because it is correct and already matches the SDK's semantics. Only the mechanism changes.
**Risk:** low

### Story 1.2 — `scripts/preflight.mjs` — the mandate becomes checkable
**As the** maintainer, **I want** the mandate enforced by a check rather than a sentence,
**so that** "always use Golden Frijoles" is a property of the system instead of a hope.
**Acceptance:** `node scripts/preflight.mjs` verifies a project is linked, a `flag_read` key resolves,
and the CLI is installed and current. On failure it prints **the exact install command**. Per **D1**
it **fails hard on init-time absence and fails SOFT on runtime unreachability** — a transient Golden
Frijoles outage must never break a build, a test run or checkout. The skill declares it in
`requires_scripts`, so `check-skill-scripts.mjs` keeps it honest.
**Risk:** high — **D1 backwards is the way this story breaks every consuming project's CI.**

### Story 1.3 — `check-plugin-leaks.mjs` gains a flag-mechanism rule
**As the** maintainer, **I want** the leak that caused this epic to be catchable,
**so that** a consumer's flag architecture can't quietly re-enter the template.
**Acceptance:** the guard fails when a template or plugin file names a project-specific flag
mechanism (a bare `lib/flags.ts`, `DEFAULT_FLAGS`, `platform_flags`, `flagsmith`). Deliberate matches
go in the `ALLOW` list **with a written reason**, and a stale entry fails — the same discipline the
guard already applies to itself.
**Risk:** low

### Story 1.4 — Agent-guided onboarding
**As a** developer installing the plugin, **I want** the agent to ask for a Golden Frijoles project
and hand me the command, **so that** onboarding is one line rather than a docs hunt.
**Acceptance:** the plugin's install path has the agent detect the absence of a linked project and
print **one command** — `npx @golden-frijoles/cli init`. The text matches what `/install` and
`gf init` themselves print; **the three are one surface and must say the same thing.**
**Risk:** low

### Story 1.5 — `template/AGENTS.md` gains the rule and the plan table
**As a** builder agent in any spawned project, **I want** the flag rule stated where the
cannot-be-violated rules live, **so that** it carries the same weight as the other invariants.
**Acceptance:** a numbered rule — *"Feature flags are Golden Frijoles. Never build a parallel flag
store."* — in the same shape as golden-beans' AGENTS rule #1 about telemetry. The plan table from the
epic README lands in `template/AGENTS.md` and the plugin README **with the "not enforced yet" note
intact**, so nobody builds against limits that don't exist.
**Risk:** low

### Story 1.6 — Template SDK wiring
**As a** newly spawned project, **I want** the flag client already wired,
**so that** the first kill-switch story is a flag creation rather than an integration.
**Acceptance:** `createFlagProvider` is configured in the template with the env var names decided in
the CLI epic's **D6**, the server-only warning is prominent (`flagReadKey` must never reach a browser
bundle), `.env.local` is gitignored, and **D2's verified Edge-runtime answer is written down** — so
the first middleware-gated feature doesn't rediscover it the hard way. Per **D5**, only `flag_read`
is written locally; `flag_sync` is documented as a CI secret.
**Risk:** high

## Sprint QA
- **api spec(s):** unit tests for `preflight.mjs` covering all five states (no project · no key · CLI
  absent · CLI outdated · all good) **plus the fail-soft case**: API unreachable at runtime must not
  fail a build. A `check-plugin-leaks` fixture asserts the new rule fires and that a stale `ALLOW`
  entry fails.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test` + `check-plugin-leaks.mjs` + `check-skill-scripts.mjs` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local · a freshly spawned project from `dobby-foundation/template/`

1. Spawn a new project from the template and run `node scripts/preflight.mjs` with no credentials.
   → It **fails**, and the message names `npx @golden-frijoles/cli init` verbatim.
2. Run that command, complete `gf init`, then re-run preflight.
   → It passes.
3. Create a flag with `gf flags create demo.hello_enabled --kill-switch --all-envs`, then start the app.
   → The SDK resolves it. Value `true`, enabled everywhere.
4. Point `GROWTH_ENGINE_URL` at a dead host and run `npm run build` and the test suite.
   → **Both still pass.** Evaluation falls back to the caller-supplied default. *(This is D1. If the
     build fails here, the story is not done.)*
5. Start a groom session on a HIGH-risk ask.
   → The kill-switch story it produces names a **Golden Frijoles** flag, the right polarity, one
     resolver seam, and the CLI command to create it in every env. It does **not** mention
     `DEFAULT_FLAGS`.
6. Add `lib/flags.ts` with a `DEFAULT_FLAGS` export to the template and run `node scripts/check-plugin-leaks.mjs`.
   → It **fails**. *(Then revert.)*
7. Open `template/AGENTS.md`.
   → The flag rule is present among the cannot-be-violated rules, and the plan table carries the
     "not enforced yet" note.
8. Compare the onboarding text the agent prints, `/install`'s CLI block, and `gf init`'s next-step line.
   → All three are identical.

If any step fails, note the step number + what you saw — that's the bug report.

**Step 4 is the load-bearing one.** A flag provider that can break your CI when it hiccups is a
dependency nobody should accept, mandate or not.
