# Hyper-performant website — Retrospective

_Sprints shipped: 2026-07-17 (S1, PR #276) + 2026-07-18 (S2, PR #279) · epic close held on Daniel's
PageSpeed re-run (the DoD's acceptance number)._

## What shipped
- **S1 — Images (PR #276, merged 2026-07-17, live-verified).** Next's built-in `/_next/image`
  optimizer is broken under `output:'standalone'` on Cloud Run (upstream regression, documented in
  the frontend-vercel-to-cloudrun epic) — shipped a self-hosted sharp proxy (`app/api/img/route.ts`:
  host allow-list, streamed byte-cap, `redirect:'error'`, fixed width+quality ladders,
  avif/webp/jpeg negotiation, immutable Cache-Control) wired as `next/image`'s custom loader
  (`lib/image-loader.ts`). First-row + featured-card LCP `priority`. `lib/supply-import.ts` now
  routes external images through the existing `ingestImageUrls()` R2 ingest (the 4th, missed
  creation path — the exact gap that shipped the teatrounam.com.mx hotlink). Backfill +
  cache-control scripts ship report-only (`--apply` needs creds).
- **S1 infra follow-through (root `38a9300`, applied live 2026-07-18).** The extension-less proxy
  was `cf-cache-status: DYNAMIC` — every request re-encoded on Cloud Run (13–16 s; the nightly
  browser-smoke timeouts). Added the second Cloudflare Cache Rule (`/api/img`, respect-origin,
  invariant-tested). Measured: MISS 16.2 s → HIT **0.3 s**.
- **S2 — CSS/JS + the guard (PR #279, merged 2026-07-18, live-verified).** Killed the
  render-blocking 204 KiB jsDelivr `@main` iconoir stylesheet (zero jsDelivr refs on the live
  homepage post-deploy): iconoir pinned at 7.11.1, `scripts/build-iconoir-subset.ts` generates a
  138-class subset (203 KiB raw / ~15 KiB brotli) with a fails-loud generator + 11-spec guard —
  also closing the iconoir-sweep retro's "nothing stops a 12th broken class" gap. Clerk UI bundles
  (~301 KiB) lazy-mounted via `next/dynamic(ssr:false)` wrappers at 5 call sites (auth logic
  untouched — rule #4). `browserslist` added (modern targets). Perf-budget guard hardened:
  no-external-stylesheet structural check + >150 KiB render-blocking check scoped to external
  assets, prod-only hard assertions.

## What worked
- **The two-layer review caught real, distinct bugs at every round.** Codex: unbounded
  `arrayBuffer()` before the byte-cap check (OOM vector), `CopySource` `%2F` mis-encoding,
  comment-matching regex asserts. Fresh reviewer: redirect-following SSRF bypass (allow-list only
  checked the initial URL), and — by building the artifact — refuted the guard's "self-resolves at
  deploy" claim (it measured uncompressed bytes and would have red-flagged its own fix: 203 KiB
  raw that's 15 KiB over the wire). Neither layer was redundant once.
- **Empirical spike beats assumption:** the S1 builder dug the `output:'standalone'` optimizer
  regression out of git history instead of shipping `next/image` blind, and diagnosed the preview
  CI failure from real Vercel runtime logs (preview lacks R2/Supabase env → the proxy 400s there
  by design) rather than guessing.
- Reusing the sweep epic's inventory approach + the existing `ingestImageUrls()` meant zero new
  icon rails and zero new ingest code — the S1.3 "fix" was one call-site wire-up.

## What didn't / incidents
- The S2.3 budget guard shipped mis-calibrated on the first attempt (uncompressed-bytes budget) —
  caught pre-merge only because the fresh reviewer built the artifact. Transfer-cost budgets must
  measure transfer cost, or scope to the third-party class they actually police.
- Two stale-preview CI failures ate a round each (sibling merges landing mid-flight — the
  LEARNINGS `git merge origin/main` rule, again).

## Gaps / follow-ups (owed)
- **Daniel: PageSpeed mobile re-run** — the epic's acceptance number (Perf ≥ 90 · LCP < 2.5 s ·
  payload < 1.5 MB · TBT < 200 ms). Warm the first-row image variants first (first encode per
  variant is 4–22 s; edge-cached after).
- **Daniel: one real sign-in on prod** (Clerk lazy-mount is auth-adjacent) + visual icon
  spot-check across home/browse/PDP/seller portal.
- `scripts/backfill-hotlinked-images.mjs --apply` + `scripts/r2-set-cache-control.mjs --apply`
  (need R2/Supabase/Medusa creds; report-only runs are clean).
- `lib/image-ingest.ts` still uses `redirect:'follow'` with an initial-URL-only guard (same
  latent shape the proxy fixed) — covered by the `ssrf-dns-pinning` seed.
- sharp AVIF encode latency on cold variants (4–22 s) — consider lower effort or webp-default for
  w≥640 if it stays visible after cache warm-up.

## Durable learnings (promote at epic close)
- **A perf/transfer budget guard must measure what it polices.** Playwright's `body()` returns
  DECOMPRESSED bytes — a raw-byte budget red-flags a data-URI-heavy asset that costs 15 KiB on
  the wire. Scope render-blocking budgets to the third-party class they exist to catch (or
  measure real transfer size), and verify the guard against the BUILT artifact before claiming
  "self-resolves at deploy."
- **An extension-less dynamic route gets zero default CDN caching** — a proxy that sets immutable
  Cache-Control still re-executes on every request until an explicit Cache Rule exists for its
  path. Ship the edge rule (idempotent script + invariant test) in the same wave as the route,
  and prove it with a MISS→HIT probe, not the response headers alone.
