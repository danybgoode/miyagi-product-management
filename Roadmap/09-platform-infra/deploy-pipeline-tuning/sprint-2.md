# Sprint 2 — Docker build layer caching

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW-MED, but touches the deploy rail —
Daniel merges** · **Status: ✅ MERGED to `main` in both repos, live in prod, 2026-07-12.** Backend
PR [danybgoode/medusa-bonsai-backend#87](https://github.com/danybgoode/medusa-bonsai-backend/pull/87)
→ squash `f035f62`, frontend PR
[danybgoode/miyagisanchezcommerce#234](https://github.com/danybgoode/miyagisanchezcommerce/pull/234)
→ squash `c6bb437`, both merged by Daniel. Branches deleted in both repos. **Both apps' real
merge-triggered Cloud Build runs confirmed `SUCCESS`** (backend `eee91cdf`, frontend `dc681c50`,
both matching the exact squash-merge commit SHAs) — this is the true integration test beyond the
ad hoc pre-merge verification below, and it passed cleanly on the first try. Both live services
(`https://api.miyagisanchez.com/health`, `https://miyagisanchez.com/`) confirmed 200 post-deploy.

Both `apps/backend/cloudbuild.yaml` and `apps/miyagisanchez/cloudbuild.yaml` previously ran a
fully cold `docker build` on every push — no Kaniko, no buildx, no cache mechanism at all.
Sprint 1's lockfiles gave this a stable key to cache against.

**The plan's original approach didn't survive contact with reality — documented here because it's
a real, useful negative result.** S2.1 as scoped preferred the simpler BuildKit inline-cache
method (`--build-arg BUILDKIT_INLINE_CACHE=1`) over buildx, reasoning "buildx's extra machinery
isn't needed" for a single-platform build. Measured locally before writing any Cloud Build
config: **inline cache caches almost nothing for these Dockerfiles.** Docker's inline-cache
export only covers layers reachable from the FINAL stage's own build graph ("min" mode) — the
expensive `npm ci` layer these builds most want to skip lives in an earlier, discarded stage
(backend's `builder`, frontend's `deps`), never copied forward as a filesystem layer into the
final image. Switched to `docker buildx build --cache-to type=registry,...,mode=max`, which
exports every stage's layers — this needs a `docker-container` buildx driver (the default
`docker` driver errors "Cache export is not supported"), bootstrapped fresh in its own Cloud
Build step each run.

---

## Story

### S2.1 — Add remote layer caching to both `cloudbuild.yaml`s *(LOW-MED risk)* ✅ MERGED — backend `f035f62` (PR #87 squash), frontend `c6bb437` (PR #234 squash)
> **As** the platform, **I want** Cloud Build to reuse dependency-install layers across builds,
> **so that** a build that only changed application code doesn't re-run a full `npm ci` from
> scratch every time.

- `docker buildx build --cache-from type=registry,ref=...:buildcache --cache-to
  type=registry,ref=...:buildcache,mode=max --push` replaces the old cold `docker build` +
  separate `docker push --all-tags` + top-level `images:` list (buildx's docker-container driver
  builds in its own isolated daemon, so a stale `images:` list trying to re-push from the local
  daemon would fail).
- A `buildx-bootstrap` step (`docker buildx create --name cloudbuildx --driver docker-container
  --use`) runs before the build step; the build step also passes an explicit `--builder
  cloudbuildx` flag (added after cross-agent review — see below).
- Kept the existing **image-only** `gcloud run deploy` step exactly as-is — no env/secrets/scaling
  flags reintroduced (the load-bearing convention from `infra/gcp/deploy.sh` /
  `deploy-frontend.sh`).
- Preserved backend's `machineType: E2_HIGHCPU_8`.
- **Honest, measured result — not the same for both apps.** Frontend has a clean, single-`npm
  ci`-stage shape (`deps` → `builder` → `runner`), so caching is a **full** win. Backend's runner
  stage runs its OWN second `npm ci --omit=dev` against `medusa build`'s freshly generated
  `.medusa/server/package.json` — confirmed locally that this does **not** cache across builds
  with real source changes, because `medusa build`'s output isn't byte-stable run-to-run. The
  measured win for a typical backend commit is the **builder** stage's install only (~180s of
  ~360s total install time across both stages) — a genuine but **partial** improvement,
  documented in the `cloudbuild.yaml` comment rather than oversold.
- **Acceptance:** confirmed — two consecutive builds of the same commit (or a source-only change)
  show real `CACHED` log markers on the dependency-install layer and a materially lower total
  duration; the deploy step's flags are byte-identical to before.

---

## Review findings (both fixed pre-merge)
- **Cross-agent (Codex) — backend PR**: flagged that `buildx-bootstrap`'s `docker buildx create
  --use` (a prior Cloud Build step) might not leave its "current builder" selection visible to
  `build-and-push`'s separate buildx CLI invocation (each Cloud Build step is technically its own
  container). The builder's live pre-merge tests already used this exact 2-step structure and
  worked correctly both times — but added an explicit `--builder cloudbuildx` flag anyway
  (zero-cost, removes any reliance on implicit cross-step CLI state) and re-verified live.
- **Independent pr-reviewer — frontend PR, same gap found in the backend's sibling spec**: the
  drift-guard's "no top-level `images:` list" assertion was scoped to only the post-`steps:`
  region of the YAML, but a top-level `images:` block conventionally sits *before* `steps:` (where
  it lived pre-S2) — so the assertion would not have caught a regression reintroducing it in its
  normal position. It passed only because `images:` is genuinely gone entirely, not because the
  check was testing the right thing. Fixed in both repos' specs to check the full file.
- **Fresh pr-reviewer passes on both PRs**: **Approve** — independently confirmed every claim
  against the actual committed diffs (not the PR description), including re-tracing all test
  regexes against the real committed YAML.

## A real mistake, made and caught during this sprint's build
A `cd`/cwd mix-up between two backgrounded shell commands (this session's tooling runs
`run_in_background: true` calls in a separate shell context from the "current" one visible via
`pwd` — a `cd` in one does not persist to the other) briefly caused a build of the WRONG repo's
source to get pushed under the OTHER repo's Artifact Registry tags, during ad hoc pre-merge
live-testing. Caught by verifying build-log Dockerfile stage names against the expected shape
(e.g. backend's `builder 1/6` vs. frontend's `deps 1/4`), cleaned up (deleted the corrupted
throwaway tags), and re-verified cleanly before anything was committed. No production impact —
these were always throwaway test tags (`s2test`/`s2verify` + `-buildcache` variants), never
referenced by the real trigger's `cloudbuild.yaml`. **Lesson for future sessions using this
tooling: always embed an explicit `cd <absolute-path> &&` in the SAME command as any
`gcloud`/`docker` invocation that must run against a specific worktree — never rely on a
previously-issued `cd` persisting across a `run_in_background: true` call boundary.**

## Tooling gotcha found and worked around (promoted to `Roadmap/LEARNINGS.md`)
`scripts/cross-review.mjs`'s default `gh pr diff` piping blows Codex's context window on a PR
whose diff includes a large auto-generated file — both S1's (a first-time committed
`package-lock.json`, ~12–19K lines) and this sprint inherited the exposure. Worked around per-PR
with a pathspec-excluded diff (`git diff origin/main...HEAD -- . ':(exclude)package-lock.json'`)
piped directly into `codex exec -` alongside the shared prompt, bypassing the wrapper script.
**This is a real, likely-recurring gap now that S1 established committing per-app lockfiles as
convention** — flagged in `LEARNINGS.md` for the next agent, not just fixed ad hoc each time.

---

## Sprint QA
- **Automated drift-guard**: `src/lib/__tests__/cloudbuild-cache.unit.spec.ts` (backend, 8 cases)
  and `e2e/cloudbuild-cache.spec.ts` (frontend, 8 cases, `api` Playwright project) — both lock in
  the buildx cache mechanism, the explicit `--builder` selection, the (corrected) `images:`
  absence check, and the image-only-deploy contract.
- **Live Cloud Build verification — done, twice**: ad hoc `gcloud builds submit` (throwaway tags,
  no deploy step) before merge, AND the real merge-triggered builds after. Both succeeded.
  Established real per-step timing numbers (missing from prior docs, which only disagreed on
  whole-pipeline "~12min vs ~18min" estimates): backend cold **11m51s** → cached **15s**; frontend
  cold **5m10s** → cached **15s**.

---

## Sprint 2 — Smoke walkthrough (do these in order)
1. ✅ **Ran, pre-merge.** Ad hoc `gcloud builds submit` (build+push only, throwaway tags, no
   deploy) for both apps — cold build succeeds, cache exports; identical resubmission shows real
   `CACHED` markers and a ~15s duration (down from ~5-12 min cold).
2. ✅ **Ran, pre-merge, after the `--builder` fix.** Re-verified the same cold→cached cycle with
   the explicit `--builder cloudbuildx` flag added — unchanged result, confirms the fix didn't
   regress anything.
3. ✅ **Ran, post-merge.** The real trigger-driven builds fired on merge for both apps
   (backend `eee91cdf`, frontend `dc681c50`) — both `SUCCESS`, matching the exact squash-merge
   commit SHAs. Both correctly showed a cold first run against the real `:buildcache` tag (which
   had never existed under this config before) — expected, not a bug; the NEXT real commit to
   either repo is the first one that will actually benefit from cache reuse in production.
4. ✅ **Ran, post-merge.** Both live services confirmed healthy (`200`) after deploy —
   `https://api.miyagisanchez.com/health`, `https://miyagisanchez.com/`.
5. **Owed / for Daniel to observe naturally**: the NEXT normal commit to either repo (not this
   sprint's own merge, which was necessarily the first cold run under the new cache tag) is the
   real, undeniable proof of the production win — watch that build's log for `CACHED` markers on
   the dependency-install layer and a shorter total duration than historical baseline.

If any step fails, note the step number + what you saw — that's the bug report.
