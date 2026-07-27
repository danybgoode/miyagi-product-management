# Retrospective — Pipeline throughput

_Closed: 2026-07-26 (S2 incomplete by design — see gaps)_

## What shipped

**S1 — the frontend gate, sharded** — ✅ **MERGED** as PR #313 (delegated to Codex). A `prep` job resolves the Vercel
preview **once** and publishes it as an output; a 4-way matrix consumes it and runs only Playwright.

**S2 — BuildKit cache mount** — ✅ **MERGED via #116**, measured, and the conclusion corrected twice.

Total build time could not answer it (five builds: 7m49s→23m24s). The per-**layer** timing could:
**~300s when the runner install runs, ~1.3s when the layer cache hits** — which also disproved the
Dockerfile's own "invalidates every build" comment. Then a fresh reviewer showed the mount is **inert
in Cloud Build**: a fresh `docker-container` builder starts each ephemeral VM with empty mount state,
and mounts are not exported by `cache-to registry`. Kept on honest grounds — free, helps local
iterative builds — and the two contradicting docs (`Dockerfile` vs `cloudbuild.yaml`) were reconciled.

## What went well

**The load-bearing decision was identified before anyone built.** The gate's slowest step was never
compute — it was polling up to 10 minutes for a preview. A naive matrix would have made *every shard*
re-run that poll: same wall-clock, four times the API calls, four independent timeout risks. Sharding
that "works" versus sharding that merely looks like it.

**The delegated subagent rejected a false premise and stopped.** Its brief said 323 specs; it found 353
total, 38 browser, 3 staging → **312 in the gate**. It refused to build on the wrong number. It was
right: 323 came from a dirty checkout and never subtracted staging. That is the delegation contract
working exactly as written.

**A review pass still found what the subagent's report did not mention.** `fail-fast` defaults to
`true`, so the first failing shard would cancel its siblings — a run with breakage in three shards
would look identical to one with breakage in one. Delegation does not remove the review layer.

## What we learned

**An audit recommendation can be un-implementable as written.** The proposed cache mount needs
`# syntax=docker/dockerfile:1`, which this Dockerfile did not have — a prerequisite the audit never
mentioned. Checking beat trusting, again.

**Sharding renames the checks**, which is a branch-protection change disguised as a CI edit. Old:
`Playwright vs preview`. New: `Resolve Vercel preview`, `Playwright API vs preview (shard N/4)` ×4, and
`Browser smokes vs preview (non-blocking)`.

## Gaps / follow-ups

- **S2 is NOT ready to merge.** `docker build --check` passes under BuildKit, but whether the mount
  *helps* depends on Cloud Build persisting it between builds — unanswerable locally. It needs two
  consecutive real Cloud Build runs against the pre-change baseline. **If they show no improvement,
  revert and record the negative result**; a change that bought nothing is noise, not harmless.
- **S1's before/after wall-clock is unmeasured** — it needs a real PR run.
- **Branch protection must be updated deliberately** at merge time if it matches a check by name.
- **Declined, with reasons, in the seed:** Nx, repo-merge, Turborepo-in-CI, shared `@dtc/types`.
- Cross-agent review + fresh `pr-reviewer` owed.
