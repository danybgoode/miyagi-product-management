---
status: in-progress   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: deploy-pipeline-tuning
---

# Epic — Deploy pipeline tuning (build speed, edge cache, Cloud Run scaling, observability)

**Macro-section:** 09 · Platform & Infra
**Class:** Infra optimization (engineering-facing deploy pipeline + edge/runtime config; one
step — the Cloudflare Cache Rule — is a genuinely new, first-time capability, everything else is
tuning existing rails). No new commerce surface.
**Status: 🚧 IN PROGRESS 2026-07-12 — S1+S2 merged + live in prod; S3-S5 not started.** Groomed
via plan mode (not the `groom` skill's seed→scope funnel — Daniel brought a set of external
AI-generated suggestions, which were validated against the real codebase across three parallel
research passes + an Opus-backed second-opinion pass before this epic was scaffolded). Full
plan/evaluation: `~/.claude/plans/toasty-sniffing-snowglobe.md`.

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
| [S1](sprint-1.md) | Commit a `package-lock.json` per app + switch both Dockerfiles from `npm install` to `npm ci` | LOW-but-deploy-rail — Daniel merges (see note below) — ✅ MERGED, live |
| [S2](sprint-2.md) | Add Docker layer caching (buildx registry cache, `mode=max`) to both `cloudbuild.yaml`s | LOW-MED — Daniel merges (same deploy-rail reasoning) — ✅ MERGED, live |
| [S3](sprint-3.md) | Origin `Cache-Control` probe (data-gathering) → scoped Cloudflare Cache Rule for confirmed-static routes only | MED — ✅ BUILT + LIVE, PR [#85](https://github.com/danybgoode/miyagi-product-management/pull/85) ready for review, awaiting Daniel's merge |
| [S4](sprint-4.md) | Pull real Cloud Run metrics → tune `--concurrency` only if the data supports it | LOW (data-gathering) / LOW-MED (conditional config change) |
| [S5](sprint-5.md) | Structured JSON logging, phased — backend payment-adjacent call sites first, GCP-native (no new dependency) | LOW |

**Tier note (reconsidered during S1's build, both repos):** the plan originally scoped S1/S2 as
"reviewer may merge on green CI." Both S1 PRs' independent fresh-reviewer passes flagged the same
concern: these changes modify the production `Dockerfile` — shared deploy-rail infra per
`WAYS-OF-WORKING`'s HIGH triggers — and merging auto-deploys to Cloud Run with no pre-merge
`docker build` gate in CI (CI runs `tsc`/`build`/tests, never an actual image build). Even though
the change is build-time-only and fully `git revert`-able, that combination (shared infra +
deploy-on-merge + no build-step CI gate) tips it into "when unsure, treat as high" territory per
the standing rule. **Every sprint in this epic that touches a Dockerfile or `cloudbuild.yaml`
routes to Daniel for the actual merge**, even where CI is green and review is clean — S3's
Cloudflare-only sprint keeps its own sign-off gate regardless.

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
- [x] S1+S2 merged + verified live (real merge-triggered Cloud Build confirmed `SUCCESS` on both,
      matching exact commit SHAs; live services confirmed healthy post-deploy).
- [x] S3's Cloudflare Cache Rule is live in prod and verified (`cf-cache-status: HIT` on `/`,
      `(shell)` routes unaffected) — **PR #85 not yet merged**, awaiting Daniel (MED tier). S4-S5
      not started.
- [x] S1+S2 both have a smoke walkthrough with real, measured numbers (not estimates) in their
      sprint docs. S3's smoke walkthrough (real `curl` output, not estimates) is in `sprint-3.md`.
- [ ] This README ✅ complete (`status: shipped`) — **not yet**, only 3 of 5 sprints done; stays
      `in-progress` until S4-S5 are built or explicitly descoped.
- [ ] `RETROSPECTIVE.md` — written at epic close, once all sprints are resolved (built or
      explicitly descoped), not mid-epic.
- [ ] Team memory updated (deploy-topology note — build caching behavior changed, edge cache now
      live) — owed at epic close.
- [x] `Roadmap/LEARNINGS.md` updated with genuinely new findings from S1+S2: sharpened the
      worktree-lockfile note to disambiguate from this epic's deliberate per-app lockfile policy;
      new entry on `scripts/cross-review.mjs` blowing Codex's context window on large generated
      diffs (a real, recurring gap now that lockfiles are committed).
- [ ] Branch(es) deleted; PR(s) merged — **done for S1+S2**; S3's PR #85 open, awaiting merge;
      S4-S5 not yet built.
