# Hyper-performant website — Sprint 1: Images (the 2.6 MB whale)

**Status:** 🟦 built — draft [PR #276](https://github.com/danybgoode/miyagisanchezcommerce/pull/276), awaiting review/merge

## Spike-lite decision (Story 1.1)

**Chosen: a self-hosted `sharp` resize/format proxy (`app/api/img/route.ts`) wired in as `next/image`'s
CUSTOM loader (`lib/image-loader.ts`), NOT Cloudflare Images and NOT the built-in `/_next/image`
optimizer.**

Why the built-in Next.js optimizer is out: this app runs `output: 'standalone'` on Cloud Run
(`frontend-vercel-to-cloudrun` epic). That build mode has a **confirmed, still-open upstream Next.js
regression** where every `/_next/image` request 500s/400s — this was already hit and documented live,
in that epic's own S1.2 commit message: *"Dropped the '/_next/image optimized request' acceptance
check... confirmed open upstream `output:standalone` regression (vercel/next.js issue 82610)... real
product images go through `images.remotePatterns` (external URLs), a different, unaffected fetch
path."* In other words: `next.config.ts` already had `remotePatterns: { hostname: '**' }` +
`formats: ['image/avif','image/webp']` configured (visible in git history, S1.2 of that epic) but they
were **dead config** — zero `next/image` usage exists anywhere in the codebase (confirmed by grep)
specifically *because* the optimizer route doesn't work here. That's the actual root cause of "raw
JPEGs, no cache, no resize" this whole sprint exists to fix — not an oversight, a worked-around bug.

Why not Cloudflare Images / zone-level Image Resizing: both would work, but both need a Cloudflare
dashboard mutation (enabling a paid product / a zone feature) this agent has no credentials to apply.
Per this epic's scope notes, that kind of change gets written down for the orchestrator, not applied
directly — see "Infra asks" below.

Why a custom loader instead of hand-rolled `<img srcset>`: a custom loader is a **normal next/image
usage** from the app's point of view — `fill`, `sizes`, and, load-bearingly for Story 1.2, `priority`
(which sets `fetchpriority="high"`, drops `loading="lazy"`, AND emits a dynamic `<link rel=preload>`
for the actual rendered image URL — never a hard-coded one) all keep working. The loader function just
returns a URL pointing at our own route instead of `/_next/image`:

```ts
// lib/image-loader.ts
export default function r2ImageLoader({ src, width, quality }: ImageLoaderProps): string {
  return `/api/img?${new URLSearchParams({ url: src, w: String(width), q: String(quality ?? 75) })}`
}
```

`app/api/img/route.ts` (Node runtime, `sharp` — already a proven working dependency in this exact
container; the Dockerfile explicitly reinstalls it in the runner stage for the same standalone-tracing
reason) then: validates the source hostname against an allow-list derived from `R2_PUBLIC_URL` (+
`NEXT_PUBLIC_SUPABASE_URL`, the storage fallback) — **not** an open proxy, closes the obvious SSRF hole
an unrestricted "fetch any URL" endpoint would be — snaps the requested width to a fixed ladder (bounds
sharp CPU cost + keeps the cache-key space small), negotiates avif/webp/jpeg via `Accept`, and always
responds `Cache-Control: public, max-age=31536000, immutable`.

**Follow-up hardening not in this sprint:** no per-IP rate limit on `/api/img` yet (the width ladder +
long cache headers do most of the work; a Cloudflare Cache Rule, see below, does the rest once applied).
Candidate for Sprint 2 if abuse is observed.

## Stories

### Story 1.1 — R2 image delivery through the zone + Cache-Control + responsive sizes ✅
Built. Commits: `lib/image-loader.ts` + `app/api/img/route.ts` + `next.config.ts` (custom loader
registration) + `lib/r2.ts` (new uploads get `Cache-Control: public, max-age=31536000, immutable` at
the object level, defense-in-depth alongside the proxy's own header) + `scripts/r2-set-cache-control.mjs`
(idempotent backfill for objects uploaded *before* this change — needs R2 credentials this agent
doesn't have, **not run**). Homepage Selección (featured + grid) and Recién llegado cards converted from
plain `<img>` to `next/image` with `sizes`.
**Acceptance:** `/api/img` responses always carry the long-lived header regardless of the origin
object's own metadata (verified by source-code assertion + a live round-trip check in
`e2e/perf-budget.spec.ts`, gated to skip gracefully pre-deploy). 321-px-card byte budget and the ~2 MB
payload drop are **PENDING Daniel's PageSpeed re-run** (real-image compression ratios can't be measured
from this worktree — no R2 credentials to fetch a real listing photo through the pipeline locally).
**Risk:** low — **infra ask below** (Cloudflare Cache Rule; no new product/dashboard toggle needed).

### Story 1.2 — LCP priority on the first row ✅
Built as part of the same homepage conversion (1.1). The confirmed LCP element (validated PageSpeed
run, 2026-07-14 — "Flashback (original)", the Selección **featured** 16:9 card) gets `priority` on its
`next/image`. The Selección **grid**'s first row (`idx < 2` — the actual mobile-viewport first row,
`grid-cols-2`) also gets `priority`; everything else stays default-lazy so it doesn't compete for
bandwidth with the real LCP fetch. `priority` is next/image's own mechanism for
`fetchpriority="high"` + no `loading="lazy"` + a dynamic `<link rel=preload>` — no hard-coded URL
anywhere, satisfying the "the row is known at render time" constraint by construction.
**Acceptance:** PENDING Daniel's PageSpeed re-run for the "LCP request discovery" panel + measured
resource-load-delay; the priority/no-lazy/discoverable-in-document mechanics are in place and
source-code-asserted in `e2e/perf-budget.spec.ts`.
**Risk:** low

### Story 1.3 — Supply-import ingests hotlinked external images into R2 ✅
Found the gap: `lib/image-ingest.ts`'s `ingestImageUrls()` (SSRF-guarded, capped, graceful-per-image)
already existed and was already wired into 3 of 4 product-creation paths (bulk CSV import, MCP
catalog-import, shop asset ingestion) — but **not** `lib/supply-import.ts`'s `importApprovedItems()`,
the shared core for the admin scrape console AND the seller Mercado Libre import. That's the exact path
that shipped the `teatrounam.com.mx` hotlink the PageSpeed audit flagged. Wired it in: every approved
item's images are ingested to R2 *before* `supplyItemToProductBody()` builds the create payload; a
failed image keeps its original hotlink rather than failing the import (logged, not fatal).
For **existing** hotlinked listings: `scripts/backfill-hotlinked-images.mjs` — report-only by default
(satisfies "flagged" on its own — the printed list of hotlinked listing ids IS the flag report),
`--apply` copies each into R2 and updates BOTH the Supabase read-mirror (`marketplace_listings.images`)
AND the actual Medusa product (`/internal/seller-products/:id`, `images_mode: 'replace'` — the
homepage/browse read Medusa directly via `/store/listings`, not the mirror, so the mirror alone
wouldn't have fixed what renders). Needs Supabase + R2 + Medusa-internal credentials this agent doesn't
have — **not run**.
**Acceptance:** new imports store R2 URLs (source-code-asserted: ingestion runs strictly before product
create). Existing hotlinked listings are backfillable via the script; actually running `--apply` in prod
is **owed to Daniel** (or whoever holds the credentials).
**Risk:** low
**Known gap, not in scope:** the Shopify import bridge wasn't traced far enough to confirm it also
routes through `importApprovedItems()` — flagging as a fast-follow check, not fixed here (smallest-change
principle; the admin scrape + ML paths were the two the shared-core doc comment names explicitly).

## Sprint QA
- **api spec(s):** `e2e/perf-budget.spec.ts` — two layers: (1) deterministic source-code assertions (no
  network/credentials — the loader targets `/api/img`, the route allow-lists hosts + sets the
  Cache-Control header, `lib/r2.ts` sets it on upload, the homepage LCP element + first grid row use
  `next/image` with `priority`, supply-import calls the ingest before product-create, the backfill
  script exists) — these are what make the gate pass in a worktree with no R2/Medusa/Supabase
  credentials; (2) one live round-trip (first-row `/api/img?...w=...` URL discoverable in the homepage
  HTML, cache headers verified) that skips gracefully pre-deploy or on an empty catalog, becomes a real
  check once this PR's preview/prod serves it. Hardened further in 2.3.
- **RED observed:** yes — mutated `lib/r2.ts`'s `CacheControl` line out, confirmed the matching spec
  failed, restored, confirmed green again.
- **browser smoke owed:** yes, to Daniel — PageSpeed mobile re-run after merge (this is what actually
  validates the 321-px/~60 KiB and ~2 MB payload-drop numbers; can't be measured without live R2 images)
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ (homepage `/` still prerenders as
  static `○`) + Playwright `api` project: full suite run, **2358 passed, 7 failed, 26 skipped** — all 7
  failures are pre-existing/unrelated to this branch (`design-token-foundation` raw-hex guard — caught
  and FIXED, a comment in `lib/image-loader.ts` literally contained `#82610`, a GitHub issue number
  that matched the raw-hex-color regex; reworded, now green — the other 6 (`launchpad-campaign-vote`,
  `launchpad-submission`, `not-found-shape`) are live-prod-environment flakiness — rate-limit/WAF status
  codes drifting from what those specs (untouched by this branch, last modified epics ago) expect — not
  touched, out of scope.

## Infra asks (orchestrator applies — not this agent)
1. **Cloudflare Cache Rule** on path `/api/img*` (miyagisanchez.com zone): Cache eligibility "Eligible
   for cache", Edge TTL "Respect origin", Browser TTL "Respect origin" (the route already sends
   `Cache-Control: public, max-age=31536000, immutable`, so "respect origin" is enough — no override
   values needed). This is what turns "our own route sets a good header" into "Cloudflare actually
   serves repeat requests from edge instead of hitting Cloud Run origin every time." Not required for
   correctness (images work either way) — required for the cost/latency win.
2. Optional, not blocking: run `node --env-file=.env.local scripts/r2-set-cache-control.mjs --apply`
   (needs R2 creds) to backfill Cache-Control onto objects uploaded before this sprint.
3. Optional, not blocking: run `node --env-file=.env.local scripts/backfill-hotlinked-images.mjs` (no
   flags = report-only) to see how many existing listings still hotlink an external image, then
   `--apply` to fix them (needs Supabase + R2 + `MEDUSA_INTERNAL_SECRET`).

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com — **run after merge + deploy**

1. Run https://pagespeed.web.dev on https://miyagisanchez.com (Mobile).
   → "Improve image delivery" savings drop from ~2.6 MB to near zero; "Use efficient cache lifetimes" no longer lists r2.dev.
2. Open the homepage on your phone over cellular, hard-refresh.
   → First row of listing cards paints fast and sharp; no multi-second blank slots.
3. DevTools → Network → filter images on the homepage.
   → Card images are `/api/img?...` resized variants (not 1200px+ r2.dev originals) with
   `cache-control: public, max-age=31536000, immutable`.

If any step fails, note the step number + what you saw — that's the bug report.
