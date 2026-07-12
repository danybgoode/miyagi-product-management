# Sprint 4 — Cloud Run scaling: measure before touching

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: LOW (data-gathering) / LOW-MED
(conditional config change)** · **Status: 📋 not started**

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

---

## Sprint QA
- **Automated drift-guard** (only if S4.2 is built): extend `deploy-invariants.test.js` / the
  frontend equivalent to assert the script's `--concurrency` matches live `gcloud run services
  describe` output — the exact existing pattern already used for env vars and probe flags.
- **Manual**: before/after metrics comparison (S4.1's numbers vs. a post-change pull).

---

## Sprint 4 — Smoke walkthrough (do these in order)
1. Pull Cloud Monitoring metrics for both services (S4.1). Record findings in this doc.
2. Decide: does the data justify S4.2? If not, mark this sprint done at step 1 with the reasoning
   recorded — that's a legitimate, complete outcome for a MEASURE-FIRST story, not an unfinished
   one.
3. If proceeding: implement the concurrency change, deploy, re-pull the same metrics, confirm the
   intended effect (fewer/no saturation events, stable or improved p95 latency).
4. Merge + close out either way.

If any step fails, note the step number + what you saw — that's the bug report.
