# Hyper-performant runtime — Retrospective

_Closed: 2026-08-24_

## What shipped

- **Origin:** frontend Cloud Run now keeps one warm instance (`minScale: 1`); the Free-plan image path
  emits bounded, fixed WebP variants, and `perf-probe` records raw compressed transfer, cache state and
  client JS for real marketplace fixtures. Root [#163](https://github.com/danybgoode/miyagi-product-management/pull/163)
  `bdc6f43`; frontend [#416](https://github.com/danybgoode/miyagisanchezcommerce/pull/416) `1b10695`.
- **Edge:** viewer-neutral claimed public reads are isolated from auth/preview reads, use runtime ISR,
  and have a fail-closed Cloudflare Cache Rule. Production proved marketplace, entitled subdomain and
  embed MISS→HIT without collapsing their host/path identities. Root [#164](https://github.com/danybgoode/miyagi-product-management/pull/164)
  `8465fd3`; frontend [#417](https://github.com/danybgoode/miyagisanchezcommerce/pull/417) `c121c60`.
- **Client:** Session Replay no longer ships, buyer manifests are guarded against the named heavy vendors,
  four interaction surfaces use native HTML where it owns the behavior, and route-manifest Brotli budgets
  keep the diet enforceable. Frontend [#418](https://github.com/danybgoode/miyagisanchezcommerce/pull/418)
  squash `03108bd`, deployed as `miyagi-web-00135-czg` at 100% traffic.

## What went well

- The architecture lock caught false scope before implementation: paid Cloudflare transformation was
  rejected, named vendor moves were already unnecessary, and the original cache fixtures were not live
  cache-eligible data. The contracts were corrected before builders could encode those false premises.
- The stacked order kept the auth/cache boundary ahead of the client diet. Independent high-risk review
  found and resolved issues before each merge, while the production checks confirmed the deployed revision
  rather than treating a green build as delivery.
- The final probe measured every locked fixture as present. Its dated artifact preserves the distinction
  between a real observation and a claimed apples-to-apples performance improvement.

## What we learned

- No new entry was promoted. D18 already captures the immutable image-cache-key and legacy-source lesson;
  D22 captures the rule that production fixtures must be claimed and cache-eligible before they are used
  as evidence. Restating either in `LEARNINGS.md` would make the always-read document noisier.

## Gaps / follow-ups

- **Owed to Daniel:** signed-in Cuenta popover and AI-dialog browser walkthrough; production Sentry
  dashboard verification that a deliberate client error still arrives while Replay stays absent.
- Four legacy homepage records still contain protocol-relative Shopify image URLs. The Free-plan proxy
  deliberately accepts only HTTPS R2/Supabase sources, so they return 400; this pre-existing content debt
  is documented in D18 and Sprint 1, not hidden as a clean home-page smoke. The existing report-only
  `backfill-hotlinked-images.mjs` is the safe remediation path when production R2/Medusa credentials are
  available; it was not run here because those credentials are intentionally absent.
