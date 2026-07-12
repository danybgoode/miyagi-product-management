# Sprint 1 — Per-app lockfiles + `npm ci`

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW, but touches the deploy rail —
Daniel merges** · **Status: ✅ MERGED to `main` in both repos, 2026-07-12.** Backend PR
[danybgoode/medusa-bonsai-backend#86](https://github.com/danybgoode/medusa-bonsai-backend/pull/86)
→ squash `d8131fa`, frontend PR
[danybgoode/miyagisanchezcommerce#233](https://github.com/danybgoode/miyagisanchezcommerce/pull/233)
→ squash `471de96`, both merged by Daniel per the tier note below. Branches deleted in both repos.

**Owed / not yet confirmed:** the actual live Cloud Build run triggered by this merge. Local
`gcloud` auth is stale (`invalid_grant`, needs an interactive re-login) so it couldn't be checked
directly from this session. Both `https://api.miyagisanchez.com/health` and
`https://miyagisanchez.com/` returned 200 shortly after merge, but that only confirms the
services are up — not specifically that the new image (vs. the prior revision) is what's serving.
Low-risk given the identical local `docker build` + boot test already passed for both apps, but
worth a real check (`gcloud builds list --region=us-east4` for both triggers, or the Cloud Run
revision list) before treating this sprint as fully closed.

The prerequisite for everything else in this epic: neither `apps/backend` nor
`apps/miyagisanchez` has a committed lockfile, so every Docker build re-resolves dependency
versions from scratch against caret-pinned ranges. This is both a build-determinism gap on its
own (a rebuild of the identical commit could pull a different transitive dependency version) and
the reason no caching scheme (Sprint 2) can have a stable cache key.

**Tier note:** both PRs' fresh-reviewer passes flagged that a Dockerfile change is shared deploy
infra with no pre-merge `docker build` CI gate — see the epic README's tier-note for the full
reasoning. Both PRs route to Daniel for merge despite green CI and clean review.

**Review pass results:**
- **Backend PR #86** — fresh pr-reviewer: **Approve**, independently reproduced the core claim
  from scratch (a fresh `medusa build` + a real `npm ci --omit=dev` against the generated
  `.medusa/server/package.json`, confirming zero dependency mismatches). Cross-agent (Codex)
  caught a real gap: the original self-check spec only asserted the Dockerfile's text shape, not
  the actual `.medusa/server` deps-parity claim — fixed pre-merge (`9021d09`), now a real
  assertion that runs after CI's `Build` step (which produces `.medusa/server`).
- **Frontend PR #233** — fresh pr-reviewer: **Approve**. Also flagged a stale `LEARNINGS.md` note
  that could read as contradicting this sprint's deliberate lockfile policy (it was scoped to a
  different scenario — a worktree's incidental, potentially-malformed lockfile, not a
  deliberately-generated, CI-validated per-app one) — sharpened in `Roadmap/LEARNINGS.md`.
  Cross-agent (Codex) produced one false-positive "blocking" finding (an artifact of excluding
  the generated lockfile from its input diff to avoid blowing its context window) — addressed in
  a PR comment.

**Tooling gotcha found**: `scripts/cross-review.mjs`'s default `gh pr diff` piping blows Codex's
context window on a PR whose diff includes a large generated file (`package-lock.json`, ~12–19K
lines) — `ERROR: Codex ran out of room in the model's context window`. Worked around per-PR with
a pathspec-excluded diff (`git diff origin/main...HEAD -- . ':(exclude)package-lock.json'`), but
the shared script itself doesn't do this automatically — worth a future fix if lockfile-touching
PRs become common (they're expected to, now that Sprint 1 establishes the convention).

---

## Story

### S1.1 — Commit per-app lockfiles, switch Dockerfiles to `npm ci` *(LOW risk)* ✅ BUILT — backend `9021d09` (PR #86), frontend `bc0aeef` (PR #233)
> **As** the platform, **I want** deterministic, reproducible Docker builds for both apps, **so
> that** a rebuild of the same commit always installs the exact same dependency tree, and any
> future caching scheme has a stable key to hang on.

- Generate `apps/backend/package-lock.json` and `apps/miyagisanchez/package-lock.json`, each run
  from *inside* its own repo (not the monorepo root — the root's own `"workspaces": ["apps/**",
  ...]` + its own `package-lock.json` stay untouched; each Docker build's context is only the
  single app repo, so this is fully decoupled from the monorepo-level workspace resolution).
- Edit both Dockerfiles: `COPY package.json package-lock.json ./` (was `COPY package.json
  [.npmrc] ./`), then `npm ci` (was `npm install`). Leave the frontend runner stage's `RUN npm
  install sharp` untouched (unrelated, deliberate standalone-tracing workaround for a dependency
  the trace doesn't reliably bundle).
- Backend also copies `.npmrc` (`legacy-peer-deps=true`) — keep that copy alongside the lockfile.
- **Acceptance:** a fresh `docker build` of each app succeeds identically to today's
  `npm install`-based build (same running app, no behavior change) and installs from the
  committed lockfile, not a fresh resolve.

---

## Sprint QA
- **Automated drift-guard** (`node:test`, new file under `infra/gcp/test/` or colocated per app —
  match whichever pattern reads more naturally given the lockfile lives in each app repo, not
  `infra/gcp/`): assert each app's `package-lock.json` exists and its `name` field matches the
  app's own `package.json`; assert each Dockerfile's dependency-install stage copies the lockfile
  before `COPY . .` and uses `npm ci`, not `npm install`.
- **Manual build verification**: `docker build` each app locally (or via `gcloud builds submit`
  ad hoc, matching `infra/gcp/deploy.sh`'s existing manual-build precedent) and confirm success +
  no behavior change against a quick smoke of the resulting container.
- **CI**: both repos' existing `tsc`/`build`/test gates must stay green — a lockfile pinning a
  dependency to a slightly different resolved version than today's ad hoc `npm install` happened
  to pick is a real (if unlikely) risk worth catching here, not after merge.

---

## Sprint 1 — Smoke walkthrough (do these in order)
1. ✅ **Ran.** `cd apps/backend && npm install --package-lock-only` → `package-lock.json` created,
   `name` confirmed `@dtc/backend` matching `package.json`.
2. ✅ **Ran.** Repeated for `apps/miyagisanchez` → `name` confirmed `miyagisanchez`.
3. ✅ **Ran.** Edited both Dockerfiles per S1.1. Local `docker build .` for each app completed
   successfully, confirmed `npm ci` in the build log (not `npm install`'s resolution chatter).
   Backend's runner-stage `npm ci --omit=dev` against `.medusa/server/package.json` also verified
   — confirmed byte-identical `dependencies`/`devDependencies` between it and the source
   `package.json` before trusting the shared-lockfile approach.
4. ✅ **Ran.** Booted each built image locally. Backend: started correctly against a fake DB,
   retried the connection as expected (no module-resolution errors). Frontend: Next.js server
   reported `✓ Ready`; the only error was a missing real Clerk key (expected without live
   credentials).
5. ✅ **Ran.** Pushed both branches — CI green on both repos (backend: build + tsc + 408 unit
   tests; frontend: tsc + build + full `api` Playwright project, 2061 passed with 6 pre-existing
   unrelated prod-state failures).
6. **Not yet merged — awaiting Daniel** (see the epic README's tier-note: both PRs route to
   Daniel despite green CI and clean review, since they touch shared deploy-rail infra with no
   pre-merge `docker build` CI gate). **No live prod verification needed once merged beyond
   confirming Cloud Build succeeds** — this sprint has zero runtime behavior change; the built
   image is byte-for-byte the same application, just built deterministically.

If any step fails, note the step number + what you saw — that's the bug report.
