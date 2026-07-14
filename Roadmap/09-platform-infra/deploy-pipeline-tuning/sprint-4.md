# Sprint 4 — Cloud Run scaling: measure before touching

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW** · **Status: ✅ DONE 2026-07-13 — S4.1
built, S4.2 explicitly skipped (data doesn't support it).**

Neither Cloud Run service sets `--concurrency` (both default to 80); neither sets a CPU
allocation flag (both default to "CPU only during request processing"). The original suggestion
proposed tuning concurrency down to 50-60 and switching to CPU-always-allocated — no live traffic
data supports either number yet, and CPU-always-allocated was already evaluated and dismissed for
the frontend (real billing risk against the deliberate `min-instances=0` cost lever, no evident
benefit) and backlogged for the backend (no evidence of a real problem). This sprint is about
getting real data before touching anything, and only acting on concurrency if the data actually
supports it.

---

## Stories

### S4.1 — Pull real Cloud Run metrics *(data-gathering, no code change)*
> **As** the platform, **I want** real concurrency/latency data for both services, **so that**
> any scaling change is justified by evidence, not a generic default.

- Query Cloud Monitoring for both `medusa-web` and `miyagi-web`: request concurrency, instance
  count, p95 request latency over a representative recent window.
- **Acceptance:** a clear answer to "are instances actually saturating toward the default-80
  concurrency ceiling with real latency degradation, or not?" recorded in this doc.

**✅ Done — findings (2026-07-13):**

Queried the Cloud Monitoring API v3 (`timeSeries.list`, project `miyagisanchezback-497722`)
directly — project `run.googleapis.com` metrics:
- `run.googleapis.com/container/max_request_concurrencies` (DISTRIBUTION/DELTA — aligned with
  `ALIGN_PERCENTILE_99`; `ALIGN_MAX` is invalid on this metric kind and errors)
- `run.googleapis.com/request_latencies` (aligned with `ALIGN_PERCENTILE_95`)

Window: 7 days trailing, 30-minute alignment buckets (336 buckets/service for `medusa-web`,
178 for `miyagi-web` — fewer because it has less always-on background traffic). For each bucket,
recorded both metrics' values, then checked whether "near-ceiling concurrency" buckets
(≥64, i.e. 80% of the 80 default) overlap in time with "high latency" buckets (≥2× the service's
own median p95, floor 1000ms).

| Service | conc p99 max | conc p99 median | buckets ≥64 conc | lat p95 max | lat p95 median | buckets ≥ high-lat threshold | buckets with **both** |
|---|---|---|---|---|---|---|---|
| `medusa-web` | 76.8 | 14.3 | **1 / 336** | 17,745 ms | 6,816 ms | 12 / 336 (≥13,632 ms) | **0** |
| `miyagi-web` | 68.5 | 6.7 | **2 / 178** | 14,154 ms | 1,265 ms | 17 / 178 (≥2,530 ms) | **1** (coincidental — the other high-conc bucket had a normal 2,244ms latency) |

**Answer: no, instances are not saturating toward the concurrency ceiling with real latency
degradation.** Near-ceiling concurrency is a rare, isolated blip (≤1% of buckets on either
service), and it essentially never coincides with the high-latency buckets — which are frequent
enough (12/336, 17/178) and severe enough (multi-second p95, occasionally 14-17s) to be a real
signal, but one that's clearly independent of request concurrency. Whatever is driving those
latency spikes (slow endpoint, cold start, an admin/webhook call, DB contention — not
investigated further here, out of this story's scope) is not something `--concurrency` tuning
would touch.

### S4.2 — Tune `--concurrency` *(conditional on S4.1's data)*
> **As** the platform, **I want** Cloud Run to spin up a new instance before an existing one's
> event loop lags, **so that** request latency stays consistent under load.

- **Only build this story if S4.1's data supports it.** If the data doesn't show saturation, this
  story is explicitly skipped — record why in this doc rather than silently dropping it.
- If built: add `--concurrency=NN` (data-derived, not a copied default) to
  `infra/gcp/deploy.sh` / `infra/gcp/deploy-frontend.sh`. Config-only, reversible Cloud Run
  revision change.
- **Acceptance:** the live service's concurrency matches the new value; a before/after comparison
  of the same metrics from S4.1 shows the intended effect (or, if not, revert).

**⏭️ Explicitly skipped (2026-07-13) — S4.1's data doesn't support it.** Request concurrency
essentially never approaches the default 80 ceiling on either service, and the one metric that
*is* genuinely degraded (p95 latency, into the multi-second range on both services) shows no
correlation with concurrency at all — it's high at low concurrency just as often as at high.
Tuning `--concurrency` down would only force Cloud Run to spin up more instances (real billing
cost, same reasoning the epic already applied to dismiss CPU-always-allocated) without touching
the actual cause of the latency spikes. No config change made; both services keep the Cloud Run
default (`80`).

---

## Sprint QA
- **Automated drift-guard** (only if S4.2 is built): extend `deploy-invariants.test.js` / the
  frontend equivalent to assert the script's `--concurrency` matches live `gcloud run services
  describe` output — the exact existing pattern already used for env vars and probe flags. **N/A
  this sprint** — S4.2 wasn't built, `--concurrency` stays unset (Cloud Run default `80`) on both
  scripts, so there's nothing new for the drift-guard to lock in.
- **Manual**: before/after metrics comparison (S4.1's numbers vs. a post-change pull). **N/A** —
  no config change made, so no "after" to compare.

---

## Sprint 4 — Smoke walkthrough (what was actually run, 2026-07-13)
1. Pulled Cloud Monitoring metrics for both services (S4.1) via the Monitoring API v3
   `timeSeries.list`, 7-day window, 30-min buckets: `run.googleapis.com/container/max_request_concurrencies`
   (`ALIGN_PERCENTILE_99`) and `run.googleapis.com/request_latencies` (`ALIGN_PERCENTILE_95`), for
   `medusa-web` and `miyagi-web`. Joined the two series by timestamp bucket to check whether
   near-ceiling-concurrency buckets (≥64 of the 80 default) overlap with high-p95-latency buckets
   (≥2× each service's own median, floor 1000ms). Full numbers recorded in S4.1 above.
2. Decision: data does **not** justify S4.2 — near-ceiling concurrency is ≤1% of buckets on
   either service, and the buckets that ARE high-latency (12/336 `medusa-web`, 17/178
   `miyagi-web`) essentially never coincide with the high-concurrency buckets. Marking this
   sprint done at step 1, per this doc's own "legitimate, complete outcome for a MEASURE-FIRST
   story" framing. Recorded in S4.2 above.
3. Skipped — not proceeding (see step 2).
4. Closing out: no code changes to review/merge for S4.2. This doc + the epic README status are
   the only diffs this sprint produces.

No step failed — this is a clean "measured, data said no" outcome, not a blocked one.
