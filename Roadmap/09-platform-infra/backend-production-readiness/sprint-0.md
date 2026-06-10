# Backend Production Readiness — Sprint 0: Audit (SPIKE)

**Status:** ⬜ not started · **Risk:** LOW (writing only, no code) · **Type:** spike → written decision

> **This is the gate.** No branch, no build. The deliverable is a written findings doc + a prioritized gap
> list + the staging-platform decision. Daniel approves it before S1–S4 are finalized and built.

## Objective
Assess the Medusa backend's production readiness across **six dimensions**, record current state vs. gap for
each, prioritize the gaps (severity × effort), and **decide the staging platform** with real cost/effort
numbers.

## The six dimensions (work through each — current state → gap → recommendation)
1. **Staging environment.** Confirm none exists. Compare **Cloud Run `medusa-web-staging` + Neon DB branch**
   (recommended — prod parity, near-free idle) vs **Render free** (Daniel's brain-dump suggestion). Decide,
   with cost + effort + parity trade-offs. Scope: branch + trigger wiring, isolated staging secrets/CORS,
   webhook endpoints, data-seeding.
2. **Backups & data durability.** Neon PITR / restore window; Supabase backups (conversations/offers/supply);
   R2 buckets (images + private digital goods) versioning/durability; **Secret Manager** export + rotation.
   Note RPO/RTO for each.
3. **Graceful recovery / rollback.** Cloud Run revision rollback; `git revert` on `main`; **startup/liveness
   health checks** + restart behavior; **Medusa migration rollback** (forward-only — flag the risk); webhook
   idempotency on redelivery.
4. **Monitoring / alerting / observability.** Uptime check; error tracking (Sentry — present or not); Cloud
   Run alert policies (5xx, p95 latency, memory, instance saturation); log retention. Deploy events =
   reuse/ship `cicd-telegram-notifications`.
5. **Security / secrets posture.** Rotate `JWT_SECRET`/`COOKIE_SECRET` (deploy README flags "don't reuse
   supersecret"); least-privilege runtime SA; CORS correctness; backend rate-limiting; **Medusa admin
   exposure** (deploy.sh notes admin disabled in prod — confirm); dependency/CVE posture.
6. **Scaling / capacity.** Cloud Run `min=1/max=4, cpu=1, mem=1Gi, shared` worker mode; Neon pooled
   connection ceiling; Memorystore sizing; known load ceilings; server/worker-split trigger.

## Deliverables (Definition of Done for the spike)
- A written findings doc (this epic folder or `tasks/backend-production-readiness-audit.md`): per-dimension
  current-state vs gap, every current-state fact **verified against the live setup** (gcloud / Neon / repo).
- A **prioritized gap list** (severity × effort) → the ordered hardening backlog.
- The **staging-platform decision** recorded with cost + effort + parity reasoning.
- **Finalized S1–S4** (confirm or reshape the candidates) for Daniel's approval.

## Sprint QA
- **api spec(s):** none — spike produces a document, not code.
- **browser smoke owed:** no.
- **gate:** Daniel reviews and approves the findings doc + staging decision.

## Sprint 0 — Smoke walkthrough (review checklist)
1. Open the findings doc.
   → All six dimensions have a current-state + gap entry, each current-state fact backed by a live probe.
2. Read the gap list.
   → Gaps are ranked by severity × effort; the top items map to S1–S4.
3. Read the staging-platform decision.
   → A clear Cloud-Run-vs-Render call with cost + effort + parity trade-offs and a recommendation.

If any item is missing or unverified, note it — that's the rework before S1 starts.
