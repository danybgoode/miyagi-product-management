# Sprint 1 — mschz.org short links

Frontend only. Build → verify → commit per story.

---

## Step 0 — mschz.org in Vercel + DNS-only
- Agent: `addDomainToProject('mschz.org')` (project token).
- **Daniel (Cloudflare):** set the `mschz.org` apex record to **DNS-only** (grey cloud) so Vercel serves it
  directly + issues the cert.
- **Acceptance:** `https://mschz.org/` reaches Vercel (not a CF 404).
- [x] Done — `mschz.org` in the Vercel project; Daniel set it DNS-only in Cloudflare; serves + cert OK.

---

## US-1 — Short-link routing for shops
**As** a seller, **I want** `mschz.org/my-shop`, **so that** I can share a short, branded link.
- New pure `lib/shortlink.ts`: the resolution decision (lowercased segment + lookup results → target URL
  or null). Spec.
- `middleware.ts`: a branch for host `mschz.org`/`www.mschz.org` (before the custom-domain one) → resolve
  the first segment: shop slug (Supabase mirror) → `pickAliasTarget` (retired slug) → **301** to the
  canonical (`getActiveCustomDomain` ?? `/s/[slug]`). Empty path → 301 to `miyagisanchez.com`. Unknown →
  301 to the **branded 404** (`miyagisanchez.com/404`). (No `unstable_cache` in middleware: direct query +
  pure helpers, like the subdomain branch.)
- **Acceptance:** `mschz.org/<live shop>` → 301 to the canonical; unknown → branded 404; case-insensitive.
- [x] Done — `7098fab` (PR #30). Smoke green.

---

## US-2 — Per-listing short codes
**As** a seller, **I want** `mschz.org/<code>` for a product, **so that** I can share a single listing.
- Mint a unique `short_code` (~6-char base62) per listing at creation (`syncSupabaseListingMirror` →
  `metadata`) + a **backfill** for existing listings (script).
- Extend the resolver: after shop+alias miss, look up `marketplace_listings` by `metadata.short_code`
  (and `metadata.short_slug` if present, first) → 301 to the listing canonical (`/l/[id]`, or custom domain).
- **Acceptance:** `mschz.org/<code>` → 301 to `/l/[id]`; shop wins over product in the flat namespace.
- [x] Done — `9294adc` (PR #30); 257 listings with a code (backfill).

---

## US-3 — Discovery UI (copy)
**As** a seller, **I want** to see and copy my short links.
- Shop short link `mschz.org/[slug]` in the "Your free URL" block of settings (next to `/s/` + subdomain),
  with copy.
- Product short link in the listing-manage view, with copy. Bilingual es-MX.
- **Acceptance:** both links show and copy; reflect the current slug/code.
- [x] Done — shop `ca84903` (PR #30); **product `ac68253` (PR #31)** (link + copy in the editor).

---

## US-4 — Customizable product slug (phaseable / can defer)
- The seller can set a `short_slug` on a listing (validated with `lib/slug`, unique in the flat namespace);
  the resolver already prefers it over the code. If scope allows; otherwise a fast-follow.
- [x] **Done — `8e66269` (PR #31).** Slug editor on the listing + `GET /api/sell/shortlink/check`
  (availability in the flat namespace) + `PUT` accepts `short_slug` (422/409, merged into metadata).

---

## Sprint QA
- **Green gate:** tsc + build + Playwright api (`shortlink.spec.ts` pure resolution; + host regression).
- **Real post-merge smoke:** `curl -sI https://mschz.org/<shop>` → 301 canonical; `/<code>` → 301
  `/l/[id]`; `/NONEXISTENT` → branded 404; case-insensitive.
- **Owed to Daniel:** browser click-through + the Cloudflare DNS-only flip.
