# Sprint 2 — Docker build layer caching

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW-MED** · **Status: 📋 not started**

Both `apps/backend/cloudbuild.yaml` and `apps/miyagisanchez/cloudbuild.yaml` currently run a
fully cold `docker build` on every push — no Kaniko, no buildx, no `--cache-from`/`--cache-to`,
no BuildKit cache mounts. Sprint 1's lockfiles give this a stable key to cache against.

---

## Story

### S2.1 — Add remote layer caching to both `cloudbuild.yaml`s *(LOW-MED risk)*
> **As** the platform, **I want** Cloud Build to reuse dependency-install layers across builds,
> **so that** a build that only changed application code doesn't re-run a full `npm ci` from
> scratch every time.

- Add BuildKit/buildx cache: pull a cache tag (`:latest`, or a dedicated `:buildcache` tag) as
  `--cache-from`, push an updated cache with `--cache-to`. Prefer the simpler BuildKit
  inline-cache path (`DOCKER_BUILDKIT=1` + `--build-arg BUILDKIT_INLINE_CACHE=1` +
  `--cache-from ...:latest`) over a full buildx multi-platform builder setup — this is a
  single-platform (amd64) build, buildx's extra machinery isn't needed.
- Keep the existing `push --all-tags` + **image-only** `gcloud run deploy` shape exactly as-is —
  do not reintroduce env/secrets/scaling flags into the deploy step (see the epic README's "What
  already exists" — this is a load-bearing convention).
- Preserve backend's `machineType: E2_HIGHCPU_8` (documented as needed for the admin bundle
  build).
- **Acceptance:** two consecutive builds of the same commit show a measurably faster second
  build (cache hits on the dependency-install layer); the deploy step's flags are unchanged from
  today.

---

## Sprint QA
- **Automated drift-guard**: extend (or add sibling to) the Sprint 1 test asserting each
  `cloudbuild.yaml` (a) sets a cache mechanism and (b) still has an image-only deploy step with
  no `--set-env-vars`/`--set-secrets`/scaling flags — guards the load-bearing image-only-deploy
  convention against a future edit accidentally reintroducing full-deploy semantics into CI.
- **Manual build-time comparison**: run two consecutive Cloud Build triggers (or `gcloud builds
  submit` locally) against the same commit; confirm cache hits + a materially lower duration on
  the second run. Record both numbers — this is also the moment to establish a single source of
  truth for per-step build/push/deploy timing (existing docs currently disagree: "~12 min" vs
  "~18min" for the same backend pipeline, with no per-step breakdown anywhere).

---

## Sprint 2 — Smoke walkthrough (do these in order)
1. Implement the cache flags in `apps/backend/cloudbuild.yaml`, push to a branch, trigger a build.
   → Confirm it completes and deploys `medusa-web` successfully, same as today.
2. Push a NO-OP commit (e.g. a comment change) to the same branch, trigger a second build.
   → Confirm the build log shows cache hits on the dependency-install layer, and record the
   before/after build duration.
3. Repeat steps 1-2 for `apps/miyagisanchez` / `miyagi-web`.
4. Merge both once each shows a real, measured speedup with no change in deployed behavior.

If any step fails, note the step number + what you saw — that's the bug report.
