# Pipeline throughput — Sprint 2: BuildKit cache mount on the backend's uncached install

**Status:** ⬜ not started

> A spike that is allowed to end in "no". The deliverable is a measured answer, not a merged change.

## Build contract (locked by the architect before the builder started)

Cite `README.md` D3.

- **Verified 2026-07-26: `apps/backend/Dockerfile` has NO `# syntax=docker/dockerfile:1` directive.**
  `RUN --mount=type=cache` requires it. Adding the directive is step one and must be proven harmless
  on its own before the mount goes in.
- The target is the **runner stage's `npm ci --omit=dev` (line ~35)**, which is uncached *by design* —
  `.medusa/server/package.json` isn't byte-stable, so the COPY layer invalidates every build. The
  builder stage's `npm ci` (line ~17) is already served by the registry layer cache; **leave it alone.**
- A cache **mount** is a different primitive from the registry layer cache already configured. It
  caches the npm store independent of the layer hash. **This only helps if Cloud Build persists the
  mount between builds** — that is the open question this sprint answers.
- **Measure two consecutive builds.** One build proves nothing: the first populates the cache.
- **If there is no improvement, revert and record the negative result.** Do not keep a change that
  bought nothing.

## Stories

### Story 2.1 — syntax directive, proven harmless ⬜
**As a** builder, **I want** BuildKit syntax available, **so that** a cache mount is even expressible.
**Acceptance:**
- `# syntax=docker/dockerfile:1` added as the **first line** (it must precede all comments — the
  current file opens with explanatory comments, so this is a real edit, not an append).
- A full Cloud Build run succeeds with **no other change**, proving the directive alone is safe.
- Build time recorded as the baseline for 2.2.

### Story 2.2 — the cache mount, measured ⬜
**As a** builder, **I want** to know whether a cache mount helps the uncacheable install, **so that**
we stop guessing about a known-uncached step.
**Acceptance:**
- `RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev` on the runner stage.
- **Two consecutive Cloud Build runs measured**, both recorded in the PR body alongside 2.1's baseline.
- The produced image is verified functionally equivalent — the runner stage still contains exactly the
  production dependency tree (`npm ls --omit=dev` or equivalent inside the image).
- **Explicit verdict in the PR: kept (with numbers) or reverted (with numbers).** Either is a
  successful sprint; an unmeasured "seems fine" is not.
- The verdict is carried into `RETROSPECTIVE.md` and, if negative, into `LEARNINGS.md` so nobody
  re-spends this day.

## Definition of Done (sprint)
- [ ] Two consecutive build measurements recorded.
- [ ] Image functional equivalence verified.
- [ ] An explicit kept/reverted verdict with numbers.
- [ ] Cross-agent review run; findings resolved.
