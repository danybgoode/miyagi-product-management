# Sprint 2 — SEO continuity, legacy redirects, fail-safe

Goal: traffic and search engines migrate cleanly to the custom domain — old marketplace links redirect to
the domain, the canonical/OG meta and `robots.txt`/`sitemap.xml` point to the domain, and if the seller
disconnects the domain the shop falls back on its own to the platform route without breaking.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **🚧 CODE COMPLETE — PR #11 with CI GREEN
(tsc + build + Playwright vs preview). Commits `0cfb51c` (stories) + `4da05d2` (catalog slug in the spec)
+ `3ae08ab` (resilience: the lookup must never 500 the page). MEDIUM risk → Daniel merges. Pending:
Daniel's smoke of the POSITIVE path (308/canonical) once a real domain is verified — the only one in the
system (panuchas.com) is unverified, and Supabase is stubbed on previews, so the positive doesn't run in
CI.**

> CI learnings: (1) Next 16 `revalidateTag(tag, 'default')` takes a profile 2nd arg. (2) On previews
> without service-role creds, `db` is a stub whose `.select()` doesn't chain `.eq()` → the lookup threw
> 500; now it's in a try/catch (degrades to "no domain"). (3) The spec derives the slug from the public
> catalog (don't hardcode) — pattern from `embed-shop.spec.ts`.

Risk: **MEDIUM**.

Main files:
- `lib/custom-domain.ts` — **new** `getActiveCustomDomain(slug)` (slug → live domain or null; cached +
  `shop-domains` tag; only counts if `custom_domain_verified`) (US-4/5/6).
- `app/s/[slug]/page.tsx`, `app/l/[id]/page.tsx` — page-level `permanentRedirect` (308) +
  `canonical`/`og:url` based on the active domain (US-4/5). (Page, not middleware: `/l/[id]` would require
  a per-request Medusa lookup in the middleware.)
- `app/robots.ts`, `app/sitemap.ts` — **new**, per host (US-5).
- `app/api/sell/shop/domain/route.ts` — `revalidateTag('shop-domains')` on POST/GET/DELETE (US-6).
- `e2e/own-shop-seo.spec.ts` — **new** Playwright spec.

---

## US-4 — Legacy 301 redirects ✅ · Risk: MEDIUM
**As** the shop owner, **I want** old marketplace links to lead to my domain, **so that** I don't lose
traffic or ranking when migrating.
- [x] On the platform host, a request to a shop with an **active** domain (`/s/[slug]` and that shop's
      `/l/[id]`) responds `301` to the equivalent on the custom domain.
- [x] Honest note: the client cart lives in `localStorage` per origin and does **not** cross origins; the
      redirect lands on the same PDP on the new domain (the realistic preservation). We don't fake a cart
      transfer.

**Acceptance:** a legacy marketplace link to a product lands on the same content on the new domain (301).

---

## US-5 — Canonical/OG + robots/sitemap per host ✅ · Risk: MEDIUM
**As** a search engine, **I want** each shop to declare its own domain as canonical, **so that** I index
the independent brand and avoid duplicate content.
- [x] `canonical` + `og:url` point to the custom domain when the request comes via the `custom` channel.
- [x] `app/robots.ts` + `app/sitemap.ts` that, on a custom domain, announce that domain (no duplicate vs
      the marketplace).

**Acceptance:** view-source on the tenant domain shows `canonical`/`og:url` pointing to the tenant domain;
`robots.txt`/`sitemap.xml` resolve and reference the tenant domain.

---

## US-6 — Fail-safe on disconnect ✅ · Risk: LOW
**As** the shop owner, **I want** removing my domain to keep the shop live on the platform route, **so
that** I'm not left with a broken shop.
- [x] Confirm that removing the domain instantly reverts to `/s/[slug]` without a raw error; fix any gap.

**Acceptance:** after removing the domain, the marketplace route works and the dead domain degrades
gracefully.

---

## Sprint smoke
- `tsc` + `build` + Playwright green.
- Local smoke with a spoofed `Host`: 301 from `/s/[slug]` and `/l/[id]` to the domain; `canonical`/`og`
  per host; `robots.txt`/`sitemap.xml` per host.
