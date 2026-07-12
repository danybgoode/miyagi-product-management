---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: deploy-pipeline-tuning
---

# Epic — Deploy pipeline tuning (build speed, edge cache, Cloud Run scaling, observability)

**Macro-section:** 09 · Platform & Infra
**Class:** Infra optimization (engineering-facing deploy pipeline + edge/runtime config; one
step — the Cloudflare Cache Rule — is a genuinely new, first-time capability, everything else is
tuning existing rails). No new commerce surface.
**Status: 📋 SCAFFOLDED 2026-07-11 — ready to build, not started.** Groomed via plan mode (not the
`groom` skill's seed→scope funnel — Daniel brought a set of external AI-generated suggestions,
which were validated against the real codebase across three parallel research passes + an
Opus-backed second-opinion pass before this epic was scaffolded). Full plan/evaluation:
`~/.claude/plans/toasty-sniffing-snowglobe.md`.

## Why
Daniel received a set of generic CI/CD + Cloud Run + observability suggestions written for "a
Next.js app that just moved off Vercel" and asked for them to be validated against our REAL setup
before any of them get built — "many assumptions were made, validate always," dismiss anything
that doesn't clearly pay for itself vs. its billing impact. Several of the suggestions' premises
turned out not to hold here at all (region alignment between Cloud Build and Artifact Registry is
already correct everywhere; the Next.js image-optimization CPU-spike risk doesn't apply since the
app barely uses `next/image`), one carries real, avoidable billing risk if adopted literally
(CPU-always-allocated on the frontend's deliberately scale-to-zero Cloud Run service), and the
single highest-leverage fix wasn't in the original suggestion list at all — neither app has a
committed lockfile, which is both a build-determinism gap and the actual prerequisite for any
Docker layer-caching scheme to have a stable key.

## Context
Both apps (`apps/backend` Medusa v2, `apps/miyagisanchez` Next.js 16) deploy via Cloud Build →
Artifact Registry → Cloud Run in `us-east4`. The frontend sits behind a Cloudflare proxy → GCP
external HTTPS Load Balancer → Cloud Run (Cloud CDN explicitly disabled at the ALB,
`--no-enable-cdn` — Cloudflare is the only edge-cache tier available). No Terraform anywhere —
everything is idempotent bash/mjs scripts under `infra/gcp/` at the monorepo root, each following
an established "provision once, `node:test` drift-guard asserts the script still matches live
`gcloud ... describe`" pattern (`infra/gcp/test/deploy-invariants*.test.js`).

## Medusa-first note
**N/A — zero commerce surface.** Pure deploy-pipeline/infra tuning (Dockerfiles, `cloudbuild.yaml`,
`infra/gcp/*` scripts, Cloudflare edge config). No products/orders/payments/fulfillment touched
(rule 1); no Supabase model changes (rule 2); UCP/MCP untouched (rule 3); Clerk untouched (rule 4);
no user-facing copy (rule 5).

## What already exists (reuse, don't rebuild)
- `infra/gcp/deploy.sh` / `deploy-frontend.sh` — the one-time, full-config Cloud Run deploy
  scripts; env/secrets/scaling are set here and preserved across image-only CI deploys. **Never**
  reintroduce full-deploy semantics (`--set-env-vars`/`--set-secrets`/scaling flags) into
  `cloudbuild.yaml`'s deploy step — that would break the documented image-only-deploy contract
  (`Roadmap/LEARNINGS.md` → "Backend Cloud Run deploy is image-only").
- `infra/gcp/cloudflare-waf-provision.mjs` — the exact idempotent-script shape to clone for the
  new Cloudflare Cache Rule script (Sprint 3): resolve the zone, PUT to a ruleset filtered by its
  own rule description so a re-run preserves any hand-added rules, soft-fail on a
  permission-scoped sub-feature rather than blocking the whole run.
- `infra/gcp/test/deploy-invariants.test.js` (+ frontend equivalent) — the drift-guard pattern:
  assert a provisioning script's flags/config match live `gcloud ... describe` output. Every
  DO item in this epic gets an equivalent guard, not a one-off manual check.
- `apps/backend/cloudbuild.yaml` / `apps/miyagisanchez/cloudbuild.yaml` — current build→push→deploy
  shape to extend with caching (Sprint 2), not replace.
- `app/(site)/page.tsx` (frontend) — already deliberately architected to stay static (no
  `headers()`/`cookies()`, auth gated client-side via `AuthShow`) — the `marketplace-static-shell`
  epic's own precedent for what a genuinely edge-cacheable route looks like in this codebase.

## Scope — stories by sprint

| Sprint | Story | Risk |
|---|---|---|
| [S1](sprint-1.md) | Commit a `package-lock.json` per app + switch both Dockerfiles from `npm install` to `npm ci` | LOW |
| [S2](sprint-2.md) | Add Docker layer caching (BuildKit inline cache or buildx registry cache) to both `cloudbuild.yaml`s | LOW-MED |
| [S3](sprint-3.md) | Origin `Cache-Control` probe (data-gathering) → scoped Cloudflare Cache Rule for confirmed-static routes only | MED — Daniel sign-off before the Cache Rule goes live (first time this repo caches anything at Cloudflare's edge) |
| [S4](sprint-4.md) | Pull real Cloud Run metrics → tune `--concurrency` only if the data supports it | LOW (data-gathering) / LOW-MED (conditional config change) |
| [S5](sprint-5.md) | Structured JSON logging, phased — backend payment-adjacent call sites first, GCP-native (no new dependency) | LOW |

**Explicitly dismissed, not built this epic** (see the plan file for full reasoning):
- Cloud Build ↔ Artifact Registry region alignment — already correct everywhere (`us-east4`
  pinned on every resource, verified directly).
- Offloading image optimization to Cloudflare Images/Polish — moot; `next/image` has ~zero real
  usage (52 raw `<img>` tags, 1 stray disabled-lint comment), images already served as direct
  Cloudflare R2 URLs.
- CPU-always-allocated on the frontend — real, avoidable billing risk (negates the deliberate
  `min-instances=0` scale-to-zero cost lever) for no evident benefit (no in-process background
  work exists to unblock). Backend variant backlogged, not built — no evidence of a real problem
  to justify it.
- Cloudflare WAF tuning beyond what's live — `cloudflare-waf-provision.mjs` already provisions
  Bot Fight Mode + a probe-path block rule; a paid managed ruleset is a separate cost call, and
  Clerk (not a custom login form) already owns auth-specific attack surface.

## Deploy order
Sequential, low-risk-first: S1 is a prerequisite for S2 (a lockfile gives any caching scheme a
stable key). S3's data-gathering step (the origin `Cache-Control` probe) has no dependency on
S1/S2 and could run in parallel, but the Cache Rule itself only ships after Daniel's explicit
sign-off given it's a first-time capability. S4's metrics pull is independent and low-risk;
whether S4's config change (concurrency) actually happens depends entirely on what the data shows.
S5 is the lowest-urgency, largest-surface item — land last, and even then only start with the
highest-value call sites, not a full sweep.

## Kill-switch
**N/A.** Every change here is either (a) a build-time-only change (lockfile, Docker caching —
zero runtime behavior difference, fully reversible via `git revert`), (b) a reversible Cloud Run
revision config flag (concurrency — one `gcloud run services update` away from reverting), or
(c) a reversible Cloudflare Cache Rule (delete the rule, traffic falls back to today's
uncached-at-edge behavior instantly). No customer-facing feature flag applies.

## Epic Definition of Done
- [ ] All sprints' stories merged + verified (data-gathering steps' findings recorded in their
      sprint doc even when they conclude "don't build this," e.g. S3's origin probe, S4's metrics
      pull).
- [ ] Each sprint with a live-config change has a smoke walkthrough (build-time comparison for
      S1/S2; `cf-cache-status` header check for S3; before/after Cloud Run metrics for S4).
- [ ] This README ✅ complete (`status: shipped`); every sprint status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Team memory updated (deploy-topology note — build caching + edge-cache behavior changed).
- [ ] `Roadmap/LEARNINGS.md` updated if anything genuinely new/generalizable surfaces during build
      (dedupe — sharpen an existing entry rather than append near-duplicates; the existing
      "image-only deploy" and drift-guard entries already cover most of the load-bearing
      conventions this epic must respect, not reinvent).
- [ ] Branch(es) deleted; PR(s) merged.
