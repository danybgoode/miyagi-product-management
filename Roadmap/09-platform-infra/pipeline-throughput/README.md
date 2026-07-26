---
status: scaffolded
slug: pipeline-throughput
---

# Epic: Pipeline throughput — shard the gate, cache the uncacheable install

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore · **Scope seed:** [`00-ideas/seeds/delivery-rail-hardening.md`](../../00-ideas/seeds/delivery-rail-hardening.md)

## Why

`deploy-pipeline-tuning` already took the big wins (lockfile + `npm ci`, layer cache, Cloudflare rule,
concurrency skip). The audit found two pieces of headroom that epic did not touch, both small and
reversible — *tune, don't rebuild*:

1. **The frontend PR gate runs 312 spec files unsharded** (corrected 2026-07-26: 353 `*.spec.ts` total − 38 browser − 3 staging; the original 323 came from a dirty checkout and never subtracted staging), after waiting up to 10 minutes for a Vercel
   preview to go READY. The gate is the long pole on every single PR.
2. **The backend's second `npm ci --omit=dev` in the runner stage is uncached by design.** The team's
   own comment explains why: `.medusa/server/package.json` isn't byte-stable across builds, so the
   COPY layer invalidates every time. A BuildKit **cache mount** is a *different primitive* from the
   registry layer cache already in use — it caches the downloaded package store independent of the
   layer hash. Nobody has tried it.

**Explicitly not in scope:** Nx, Turborepo-in-CI, and merging repos — all declined with reasons in the
seed. Do not reopen them here.

## Medusa-first note

**N/A — no commerce behaviour changes.** No app code, no migration, no flag. Touch surface:
`apps/miyagisanchez/.github/workflows/ci.yml`, `apps/backend/Dockerfile`, and possibly
`apps/backend/cloudbuild.yaml`.

## Architect's locked decisions (D1–D4)

### D1 · Resolve the preview ONCE, then fan out — the naive shard multiplies the wait

The gate's slowest step is not compute, it is **waiting**: a poll loop, up to a 10-minute timeout, for
the PR's Vercel preview to go READY. A matrix that simply adds `--shard=i/N` to the existing job makes
**every shard re-run that poll**. Wall-clock may look similar while API calls and failure surface
multiply by N, and N jobs can now independently time out.

**Locked shape:** a `prep` job resolves the preview URL once and publishes it as a job **output**; the
sharded matrix job consumes it and runs only Playwright. This is the difference between sharding
working and sharding merely appearing to.

### D2 · Shard count is a measurement, not a guess — and start conservative

Begin at **4**. Report the before/after wall-clock in the PR. More shards is not monotonically better:
each pays runner startup + `npm ci` + preview handshake, and there is a crossover where fixed cost
dominates. **Do not tune past 4 without the measured number** — that is how the previous epic's
numbers were earned and it is why they are trusted.

### D3 · BuildKit cache mount requires a prerequisite the audit did not mention

**Verified 2026-07-26: `apps/backend/Dockerfile` has no `# syntax=docker/dockerfile:1` directive.**
`RUN --mount=type=cache` is BuildKit-only syntax and needs it. Cloud Build must also actually run
BuildKit for the mount to do anything.

So this story has a real **spike-then-build** shape, and it is allowed to end in "no":
1. Add the syntax directive; confirm the build still succeeds unchanged.
2. Add the cache mount to the runner stage's `npm ci --omit=dev`.
3. **Measure two consecutive builds.** If Cloud Build doesn't persist the mount between builds, the
   second build shows no improvement.

**If it doesn't help, revert it and write that down.** A measured negative result is a real
deliverable — it stops the next person spending the same day. Do not keep a change that bought nothing
"because it's harmless."

### D4 · Never trade correctness for speed

The `api` project **is** the deterministic gate. Sharding must not change which specs run or weaken a
failure. Specifically: a failing shard must fail the whole gate; the required status check must still
be satisfied by the sharded shape (a matrix changes the check's name — **if the branch-protection
required check is name-matched, updating it is a deliberate step to call out in the PR, not a
surprise discovered after merge**). Report total spec count before and after and assert it is equal.

## Model routing

Both sprints **Sonnet 5** — bounded, mechanical, measurable. Fresh `pr-reviewer` on S1 because it
edits the gate every PR depends on.

## Risk tier

**LOW** — CI/build config only. The care point is D4: this is the gate itself, so a mistake shows up
as *weakened verification*, which is silent. Both sprints must state measured before/after.

## Definition of Done (epic)

- [ ] S1–S2 merged; CI green.
- [ ] Measured before/after wall-clock for the frontend gate, in the PR body.
- [ ] Spec-count equality asserted before vs after sharding.
- [ ] The backend cache-mount result recorded — **including if the answer was "no benefit, reverted."**
- [ ] `RETROSPECTIVE.md` carries the numbers; poster + `LEARNINGS.md` updated.
