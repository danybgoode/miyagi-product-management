# Sprint 1 — Per-app lockfiles + `npm ci`

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW** · **Status: 📋 not started**

The prerequisite for everything else in this epic: neither `apps/backend` nor
`apps/miyagisanchez` has a committed lockfile, so every Docker build re-resolves dependency
versions from scratch against caret-pinned ranges. This is both a build-determinism gap on its
own (a rebuild of the identical commit could pull a different transitive dependency version) and
the reason no caching scheme (Sprint 2) can have a stable cache key.

---

## Story

### S1.1 — Commit per-app lockfiles, switch Dockerfiles to `npm ci` *(LOW risk)*
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
1. `cd apps/backend && npm install --package-lock-only` (generates the lockfile without touching
   `node_modules`) → confirm `package-lock.json` is created and its `name` is `@dtc/backend`
   (or whatever the app's actual package name is — confirm against `package.json`).
2. Repeat for `apps/miyagisanchez`.
3. Edit both Dockerfiles per S1.1. Run a local `docker build .` for each app — confirm it
   completes successfully and installs from the lockfile (look for `npm ci` in the build log
   output, not `npm install`'s dependency-resolution chatter).
4. Boot each built image locally (`docker run -p 8080:8080 ...`, backend needs its usual env)
   and confirm the app starts and responds on its health-check endpoint, exactly as it does today.
5. Push each branch, confirm CI (`tsc` + `build` + tests) stays green on both repos.
6. Merge. **No live prod verification needed beyond CI** — this sprint has zero runtime behavior
   change; the built image is byte-for-byte the same application, just built deterministically.

If any step fails, note the step number + what you saw — that's the bug report.
