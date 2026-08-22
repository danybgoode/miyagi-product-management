# Hyper-performant runtime — Sprint 1: Origin — kill the cold start and the origin image encode

**Status:** 🟦 epic in progress — Sprint 1 shipped at frontend `1b106952`; root PR is its record

> **Sprint goal:** the frontend stays warm, the remaining origin image variants become materially
> cheaper on the Free tier, and every later story reports through one honest measurement harness.

## Stories

### Story 1.1 — Frontend Cloud Run runs warm (`min-instances=1`) ✅
**As a** buyer arriving after a quiet hour, **I want** the first page to render as fast as the tenth,
**so that** the site never feels dead on the first click of the day.

**Lock-time context:** before this sprint, `infra/gcp/deploy-frontend.sh:91-94` set
`--min-instances=0 --max-instances=4 --cpu=1 --memory=1Gi`. Scale-to-zero costs twice: a container
cold start, **and** an empty `unstable_cache`
(Next's incremental cache is per-container, so a fresh instance re-runs every `getShop`/`getShopListings`
read against Medusa/Cloud SQL and Supabase). `medusa-web` has run `min=1` since
`postgres-neon-to-cloudsql`; `miyagi-web` never got the same treatment.

**Live apply (2026-08-22):** revision `miyagi-web-00132-s6q` is Ready, serves 100% of traffic and
reports `autoscaling.knative.dev/minScale: '1'`.

**Acceptance:**
- `gcloud run services describe miyagi-web --region us-east4` reports `minScale: 1`.
- `infra/gcp/test/deploy-invariants-frontend.test.js` asserts the authoritative deploy source and goes
  **red** if it regresses to zero — observed red once via a deliberate mutation. The orchestrator
  separately describes the live service before merge and fails the sprint if `minScale` is not one;
  the source test does not pretend to observe production drift.
- A request to `https://miyagisanchez.com/mx/s/piezas-unicas` after ≥1 h of no traffic returns in the
  same TTFB band as a warm one (compare with Story 1.3's probe, before vs after).
- `deploy-frontend.sh` remains the only place scaling is set — **no scaling flags leak into
  `apps/miyagisanchez/cloudbuild.yaml`** (LEARNINGS → *Cloud Run deploy is image-only*; CI deploys
  must keep preserving config).

**Risk:** **high** — live production service config + real recurring spend. The product owner
approved the cost at the scope gate (2026-08-22); he merges.

---

### Story 1.2 — Free-tier image variants cost less at the origin ✅
**As a** buyer scrolling a shop, **I want** product photos to appear immediately, **so that** the
catalog feels instant instead of loading in.

**Architecture-lock correction (D4–D5):** the live zone is on Cloudflare Free and
`/cdn-cgi/image/*` returns 404. More importantly, the critical shop and PDP surfaces use direct R2
`<img>` URLs and never call `/api/img`; the original story attributed their latency to a proxy they do
not use. The proxy remains valuable for the handful of optimized `next/image` call sites, but its cold
AVIF variants had an older 4–22-second anecdote. Story 1.3's locked live fixture measured a real
first-observed AVIF MISS at **1,266.1 ms / 13,071 transfer bytes** on deployed `0eb9985`; that dated
measurement supersedes the anecdote for this fixture and is the honest comparison point.

**Acceptance:**
- `lib/image-loader.ts` still emits `/api/img?...`; `next.config.ts` keeps `loader: 'custom'`.
- Loader URLs include the versioned fixed cache-key tokens `f=webp&v=2`; fixed-format responses omit `Vary: Accept`,
  so Cloudflare cannot replay an AVIF cache entry to a WebP request. Unknown formats fail 400.
- Fixed URLs accept only the loader's single imported width contract, canonical source/numeric spelling
  and quality 75. Legacy URLs keep every width emitted by the prior Next config and its old effective
  snap behavior; stale HTML must not receive a 400 during cutover.
- Legacy URLs without `f` retain their existing WebP/AVIF/JPEG Accept negotiation for compatibility.
- The loader emits quality 75 and a reduced, explicit responsive-width set covering the actual
  optimized call sites; the route retains the shipped `[60, 75, 90]` compatibility ladder.
- At the same 384 px origin path, fixed WebP materially reduces transform time versus legacy AVIF.
  Record that encode comparison separately from the first full Cloudflare MISS; do not attribute
  source-fetch, revision-start or edge transit time to the codec.
- Responses still carry `public, max-age=31536000, immutable`.
- **The security contract is unchanged:** HTTPS allowed-host resolution, `redirect:'error'`, image
  content-type validation, streamed 25 MB cap and uncacheable errors stay in `app/api/img/route.ts`.
- `e2e/perf-budget.spec.ts` keeps and sharpens its `/api/img` assertions; a disallowed host still fails.
- After the new route is live, a same-versioned-URL probe under conflicting Accept headers stays WebP
  on MISS then HIT, proving the cache key
  carries the format rather than trusting Cloudflare's currently unconfigured `Vary` behavior.
- `lib/r2.ts`, `ingestImageUrls()` and `lib/supply-import.ts` are **untouched**.
- No Cloudflare Worker, Images product, new permission, dependency or prewarm write path is added.

**Future option, explicitly not built:** a Free-tier Worker could expose a small named-variant map and
keep current volume below the 5,000-new-transform allowance. It still introduces a new deployed
execution surface and permission set; the product owner chose the origin optimization instead.

**Live result (2026-08-22):** frontend PR
[`miyagisanchezcommerce#416`](https://github.com/danybgoode/miyagisanchezcommerce/pull/416)
squash-merged as `1b1069526bfda5228d9464b29858917d5e947294`. Cloud Build
`8ba6fa6f-e42a-4f53-8a48-0397cde72712` succeeded; Cloud Run revision
`miyagi-web-00133-x9b` is Ready on 100% traffic and retained `minScale: 1`.

- The untouched 384 px v2 key returned `MISS`, `image/webp`, 37,790 B, immutable caching, no
  `Vary: Accept`, and 1,279.2 ms TTFB. A conflicting `Accept: image/jpeg` repeat returned `HIT`, the
  same WebP bytes and 154.3 ms TTFB.
- The first full-path MISS was not faster than the old 160 px AVIF baseline (1,266.1 ms), and the
  widths differ, so it is not used as codec evidence.
- Five alternating direct-origin transforms at the same 384 px width measured median WebP at
  578.2 ms / 37,790 B versus AVIF at 4,911.5 ms / 51,923 B: WebP was **88.2% faster** and **27.2%
  smaller**. This is the origin-CPU result Story 1.2 claims.

**Risk:** low — degrades gracefully (old URLs keep serving until the deploy flips the loader), no
money/auth path.

---

### Story 1.3 — `scripts/perf-probe.mjs`, the measurement this epic reports against ✅
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
  The artifact is `s1-production-baseline-2026-08-22.json` and identifies frontend revision
  `0eb9985c06356505ce7341ed345cbf0536264aa8`.

**After deploy (2026-08-22, frontend `1b106952`):** the explicit v2 probe reported `/mx` 289.1 ms,
PDP 2,780.0 ms, shop 3,625.6 ms and the already-warm image `HIT` 52.8 ms / 37,790 B. The page samples
remain `DYNAMIC` until Sprint 2 and are single observations, not a claimed latency improvement.

**Risk:** low — a read-only reporting script, no product surface.

## Sprint QA
- **api spec(s):** 1.2 → `e2e/perf-budget.spec.ts` (keep the `/api/img` security assertions and add
  WebP/default-quality/width-cardinality coverage). 1.1 → `infra/gcp/test/deploy-invariants-frontend.test.js`
  (frontend). 1.3 → a pure-logic spec on the probe's parse/format seam — extract it so the spec needs
  no network, per AGENTS *keep a pure seam*.
- **browser smoke:** production `/mx`, shop and PDP passed in real Chromium after deploy. The
  continuous build session did not manufacture a one-hour idle window; `minScale: 1` is verified live,
  and the optional long-idle perception check remains a product-owner observation. No money/auth step.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
- **Every new spec observed red at least once** via a deliberate break-the-implementation mutation.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/mx and inspect one optimized catalog image request.
   → Its URL still contains `/api/img`; its response type is WebP in a modern browser and it keeps
   `public, max-age=31536000, immutable`.
2. Reload that image request once.
   → Cloudflare reports `HIT`; the source URL, size cap and host restrictions are unchanged.
3. Open https://miyagisanchez.com/mx/s/piezas-unicas and then
   https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW.
   → Their existing direct R2 photos still render; this sprint does not reroute those surfaces.
4. **Owed to Daniel (perception-only; no money/auth):** leave the browser closed for at least an hour,
   then open
   https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW cold.
   → The page renders in roughly the same time as it does on a second visit. There is no multi-second
   first-of-the-day pause.
5. Ask the builder for the `perf-probe` table and same-width origin codec comparison.
   → The record shows WebP's proven same-width origin reduction separately from the full-path edge
   MISS. It labels PDP/shop TTFB as single observations and does not claim the unexecuted ≥1-hour
   cold/warm comparison passed.

If any step fails, note the step number + what you saw — that's the bug report.

### Executed smoke — 2026-08-22

1. Requested the untouched versioned image URL on production.
   → `MISS`, HTTP 200, `image/webp`, immutable, 37,790 B; `Vary` contained Next router tokens but not
   `Accept`.
2. Repeated the exact URL with `Accept: image/jpeg`.
   → `HIT`, HTTP 200, still `image/webp`, age 17 seconds, 154.3 ms TTFB.
3. Opened https://miyagisanchez.com/mx, https://miyagisanchez.com/mx/s/piezas-unicas and
   https://miyagisanchez.com/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW in real Chromium.
   → All returned 200 and rendered. Shop and PDP showed their direct R2 photos with zero console
   errors. `/mx` showed optimized WebP photos; four pre-existing protocol-relative Shopify candidates
   still returned the same 400s the old route returned.
4. Described `miyagi-web` after the deploy.
   → `miyagi-web-00133-x9b` Ready, 100% traffic, image `frontend:1b10695`, `minScale: 1`.
5. Compared five alternating same-width origin transforms.
   → Median WebP 578.2 ms versus AVIF 4,911.5 ms. The first edge MISS was 1,279.2 ms, so the record
   distinguishes codec CPU from full-path cold latency.

The ≥1-hour browser-idle perception check was not executed inside this continuous session; no
technical gate is represented as though it observed that interval.
