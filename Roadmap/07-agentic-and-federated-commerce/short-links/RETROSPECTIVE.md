# Retrospective — Short links (`mschz.org/[shop|product]`)

**LIVE 2026-06-06** (PR #30, merge `c2a1747`). The shareable-link tier of shop/product addressing —
ultra-short branded redirects. Smoke verified end-to-end.

## What shipped
- `mschz.org/[x]` 301s to the canonical: shop slug → `/s/[slug]`; retired slug (90-day alias) → current
  shop; product **short code** → `/l/[id]`; empty → home; unknown → branded `/404`. Case-insensitive.
- Pure `lib/shortlink.ts` (host/segment/targets/`generateShortCode`) + a `middleware.ts` `mschz.org`
  branch (inline Supabase lookups, no `unstable_cache`).
- Every listing gets a unique `short_code` in `marketplace_listings.metadata` (minted on sync + a backfill
  that did **257** existing listings). No migration.
- Shop short link shown with copy in settings.
- Infra: `mschz.org` re-added to the Vercel project; Daniel set Cloudflare to **DNS-only** → Vercel serves
  + HTTP-01 cert.

## What went well
- **Pure reuse, again.** Shops + the 90-day alias redirect came for free from custom-slugs; the canonical
  target reused `/s/[slug]` and `/l/[id]` (and let those pages do custom-domain consolidation, so the
  short-link layer needed **no** custom_domain lookup of its own — and thus no `unstable_cache` problem).
- **Smoother infra than subdomains.** Because `mschz.org` is a Cloudflare CNAME → Vercel (not a wildcard),
  it only needed the project domain + a DNS-only flip; no nameserver migration. The earlier subdomains
  learnings (token scope, DNS-only, proxied=404) made it quick.
- **Verified live with a real product code** pulled from the mirror — full 5-case curl smoke (shop, case,
  product, 404, root) green.

## What we learned
- **`%{redirect_url}` in a zsh `for`-loop one-liner flaked** ("command not found: curl"); running each
  curl as a plain statement (or `/usr/bin/curl`) was reliable. Minor, but cost a couple iterations.
- **First post-deploy hits 404'd for ~60s** while the Vercel deploy + the fresh `mschz.org` HTTP-01 cert
  settled — poll, don't conclude failure (same lesson as the wildcard cert).

## Fast-follows — SHIPPED 2026-06-06 (PR #31)
- **Product short-link UI:** the listing editor (`/sell/edit/[id]`) shows `mschz.org/[slug‖code]` with
  copy (the edit page already loaded the mirror's `metadata`/shop slug → just wired through).
- **Seller-set custom product slug (`short_slug`):** an editable `SlugField` (parameterized prefix +
  availability endpoint) + `GET /api/sell/shortlink/check` + the listing `PUT` accepting `short_slug`
  (validate → 422, flat-namespace uniqueness → 409, merged into mirror metadata; empty clears it). Shared
  `lib/shortlink-server.ts isShortlinkSegmentTaken` mirrors the resolver order (shop slug → alias → listing).
- Owed: a browser pass on the editor (copy + set a slug → confirm the 301).

## Note
- Revoke the temporary account-scoped Vercel token (`vcp_8ev2…`) from the subdomains migration — this epic
  used only the existing project-scoped token.

## Addressing tiers — now complete
Free slug (`/s/[slug]`) · subdomain (`slug.miyagisanchez.com`) · short link (`mschz.org/[x]`) · custom
domain (`mitienda.com`). All live.
