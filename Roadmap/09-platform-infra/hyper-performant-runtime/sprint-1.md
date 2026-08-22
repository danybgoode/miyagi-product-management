# Hyper-performant runtime — Sprint 1: Origin — kill the cold start and the origin image encode

**Status:** ⬜ not started

> **Sprint goal:** the origin stops being in the critical path. A visitor never pays a Cloud Run cold
> start, and no image is ever re-encoded on our own CPU while someone waits for it. Plus the
> measurement harness every later story reports against.

## Stories

### Story 1.1 — Frontend Cloud Run runs warm (`min-instances=1`)
**As a** buyer arriving after a quiet hour, **I want** the first page to render as fast as the tenth,
**so that** the site never feels dead on the first click of the day.

**Context:** `infra/gcp/deploy-frontend.sh:91-94` sets `--min-instances=0 --max-instances=4 --cpu=1
--memory=1Gi`. Scale-to-zero costs twice: a container cold start, **and** an empty `unstable_cache`
(Next's incremental cache is per-container, so a fresh instance re-runs every `getShop`/`getShopListings`
read against Medusa/Cloud SQL and Supabase). `medusa-web` has run `min=1` since
`postgres-neon-to-cloudsql`; `miyagi-web` never got the same treatment.

**Acceptance:**
- `gcloud run services describe miyagi-web --region us-east4` reports `minScale: 1`.
- `infra/gcp/test/deploy-invariants.test.js` (frontend equivalent) asserts it and goes **red** if the
  live service drifts back to 0 — observed red once via a deliberate mutation.
- A request to `https://miyagisanchez.com/mx/s/piezas-unicas` after ≥1 h of no traffic returns in the
  same TTFB band as a warm one (compare with Story 1.3's probe, before vs after).
- `deploy-frontend.sh` remains the only place scaling is set — **no scaling flags leak into
  `apps/miyagisanchez/cloudbuild.yaml`** (LEARNINGS → *Cloud Run deploy is image-only*; CI deploys
  must keep preserving config).

**Risk:** **high** — live production service config + real recurring spend. The product owner
approved the cost at the scope gate (2026-08-22); he merges.

---

### Story 1.2 — Images transform at the edge, not on our CPU
**As a** buyer scrolling a shop, **I want** product photos to appear immediately, **so that** the
catalog feels instant instead of loading in.

**Context:** `hyper-performant-website`'s retro logged this and never actioned it — *"sharp AVIF
encode latency on cold variants (4–22 s) — consider lower effort or webp-default for w≥640."*
`app/api/img/route.ts` is the app's **only** `sharp` importer (verified) and re-encodes on every
Cloudflare cache miss. The images already live in R2 behind the same Cloudflare zone, so the
transform can happen at the edge with the bytes never leaving it.

**Do not move the storage.** R2 stays. Only the transform moves.

**Acceptance:**
- `lib/image-loader.ts` emits `/cdn-cgi/image/...` URLs; `next.config.ts` keeps `loader: 'custom'`.
- `app/api/img/route.ts` is deleted and `sharp` is no longer imported anywhere in a request path.
- A **cold** (never-before-requested) width/format variant of a real listing image returns in
  **< 1 s** (baseline: 4–22 s), measured with Story 1.3's probe.
- Responses still carry `public, max-age=31536000, immutable`.
- **The security contract survives the move:** the old route's host allow-list, `redirect:'error'`
  and fixed `QUALITY_LADDER = [60, 75, 90]` are reproduced at the edge. Prove it — a transform
  request naming a **disallowed** host must fail, tested explicitly, not assumed.
- `e2e/perf-budget.spec.ts`'s `/api/img` assertions are rewritten to the new target (they currently
  hard-assert `\/api\/img\?` and `app/api/img/route.ts` internals — those tests must change *with*
  the code, not be deleted).
- `lib/r2.ts`, `ingestImageUrls()` and `lib/supply-import.ts` are **untouched**.

**Rabbit hole, patched in advance:** confirm the live zone's plan and the transformation quota
**before** flipping the loader. On the free tier, transforms past 5,000/month fail with error `9422`
rather than billing — which breaks images silently instead of expensively. If the zone is on the free
tier, that is a decision for the product owner, not a workaround for the builder.

**Risk:** low — degrades gracefully (old URLs keep serving until the deploy flips the loader), no
money/auth path.

---

### Story 1.3 — `scripts/perf-probe.mjs`, the measurement this epic reports against
**As the** product owner, **I want** one command that prints what each page actually costs, **so that**
every later claim in this epic is a number and not an impression.

**Context:** the reason this epic exists is that PageSpeed looked fine while the site felt slow. A
probe that measures the *right* things is the fix for that class of mistake. Clone the shape of
`scripts/neon-egress.mjs` — the harness that outlived its own epic because it measured rather than
assumed.

**Acceptance:**
- `node scripts/perf-probe.mjs` prints, per URL: TTFB, `cf-cache-status`, total transfer bytes, and
  client-JS transfer bytes.
- The URL set covers the reported symptoms: `/mx` signed-out · `/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW`
  (PDP) · `/mx/s/piezas-unicas` (the shop that PDP links to — the exact navigation reported slow) ·
  one cold image variant.
- It measures **transfer** size, not decompressed size. *(LEARNINGS, 2026-07-18: Playwright's `body()`
  returns decompressed bytes; a raw-byte budget red-flags a 15 KiB-over-the-wire asset. A budget guard
  must measure what it polices.)*
- `--dry-run` is **fully read-only** — no log append, no git, no network write (AGENTS rule).
- It **fails loudly** when a target is unreachable rather than printing a confident empty result, and
  distinguishes known-absent from could-not-check (AGENTS rules #5 and *three states, never two*).
- A committed baseline run of the current production state, so S2 and S3 have a before.

**Risk:** low — a read-only reporting script, no product surface.

## Sprint QA
- **api spec(s):** 1.2 → `e2e/perf-budget.spec.ts` (rewrite the `/api/img` assertions to the edge
  target; add the disallowed-host rejection check). 1.1 → `infra/gcp/test/deploy-invariants.test.js`
  (frontend). 1.3 → a pure-logic spec on the probe's parse/format seam — extract it so the spec needs
  no network, per AGENTS *keep a pure seam*.
- **browser smoke owed:** yes, to the product owner — the cold-image-variant check and the
  idle-then-navigate check (step 1 and step 4 below). Neither is a money path.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Every new spec observed red at least once** via a deliberate break-the-implementation mutation.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/mx/s/piezas-unicas in a private window and scroll to the bottom of
   the catalog.
   → Every product photo is already there as you reach it. No grey boxes filling in behind you.
2. Right-click any product photo → "Open image in new tab" and look at the URL.
   → It contains `/cdn-cgi/image/`. It does **not** contain `/api/img`.
3. Reload that image tab once.
   → It appears instantly (it is now an edge cache hit).
4. Leave the browser closed for at least an hour, then open
   https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW cold.
   → The page renders in roughly the same time as it does on a second visit. There is no multi-second
   first-of-the-day pause.
5. Ask the builder for the `perf-probe` before/after table.
   → Cold image variant is under 1 second (was 4–22 s), and the PDP's cold TTFB is in the same band
   as its warm TTFB.

If any step fails, note the step number + what you saw — that's the bug report.
