# Sprint 1 — Customizable slug

One backend change + 5 frontend stories. Build → verify → commit per story.

---

## Backend — `PATCH /store/sellers/me` accepts `slug`

`apps/backend/src/api/store/sellers/me/route.ts` (branch `feat/custom-slugs`).

- Accept `body.slug`: validate format (3–40, lowercase alphanumeric + hyphens, no leading/trailing hyphen)
  and reserved words; pre-check uniqueness with `listSellers({ slug })` → conflict ⇒ **409**.
- Apply with `updateSellers({ id: seller.id, slug })`.
- Deploy **first** (Cloud Build us-east4, ~12 min, no preview).
- **Risk: MED-HIGH** (mutates the routing/identity key) → Daniel merges.

**Acceptance:** `PATCH` with `{slug:"free-one"}` → 200 and `GET /store/sellers/[slug]` reflects the change;
`PATCH` with a taken slug → 409; invalid/reserved slug → 422.

- [x] Done — backend PR #6 (branch `feat/custom-slugs`); `tsc` + `medusa build` green. Daniel merges (deploy).

---

## US-1 — Shared slug helper + availability API

**As** a seller, **I want** to know instantly whether a slug is valid and free, **so that** I can choose
with confidence.

- New `lib/slug.ts`: `slugify`, `validateSlug` (3–40, lowercase alphanumeric + hyphens, no leading/trailing
  hyphen), `RESERVED_SLUGS` (`admin, api, sell, search, orders, inbox, profile, perfil, ayuda, help, s,
  shop, www, app, billing, support, …`).
- New `GET /api/sell/shop/slug/check?slug=` → `{ available, reason? }` (validates + proxies
  `GET /store/sellers/[slug]`: 404 = free, 200 = taken). Excludes the seller's own slug.
- Pure-logic spec for `validateSlug`/`slugify`/reserved.

**Acceptance:** the API returns ✓ for free, ✗ with a reason for invalid/reserved/taken.

- [x] Done — `3d13a75` (frontend PR #26).

---

## US-2 — Pick the slug at shop creation

**As** a new seller, **I want** to pick my slug when I create the shop, **so that** I launch with a clean URL.

- Slug field in the shop-info step, auto-suggested from the name
  ("Mi Tienda Bonita" → `mi-tienda-bonita`); availability with a 300 ms debounce and a ✓/✗ indicator.
- `POST /api/sell/shop` passes `slug` to `POST /store/sellers/me` (the backend already supports it).
  Frontend-only.

**Acceptance:** creating a shop with a chosen slug lands it at `/s/[that-slug]`.

- [x] Done — `bd421f2` (frontend PR #26).

---

## US-3 — Edit the slug in settings

**As** a seller, **I want** to change my slug later, **so that** I can fix or improve my link.

- Slug editor in `ShopSettings.tsx` (same validation + live availability).
- New `PATCH /api/sell/shop/slug` (or extend the shop PATCH): calls Medusa's PATCH with `slug` + writes
  `metadata.previous_slugs = [{ slug: old, until: now+90d }]` (prunes expired/caps); updates the Supabase
  mirror (slug + previous_slugs); invalidates caches.
- Depends on the backend change.

**Acceptance:** changing the slug updates the URL; the old slug is recorded with a 90-day expiry.

- [x] Done — `290177e` (frontend PR #26).

---

## US-4 — 301 redirect from the old slug (90 days)

**As** a buyer with an old link, **I want** to still reach the shop, **so that** I don't hit a 404.

- In `app/s/[slug]/page.tsx`: if no seller matches the slug, consult a cached lookup
  (`lib/slug-redirect.ts`, mirrors `lib/custom-domain.ts`) over the mirror's `previous_slugs`; if a
  non-expired alias maps to a current slug ⇒ `permanentRedirect` to `/s/[new]`; otherwise `notFound()`.
- Cached + tag-invalidated when the slug changes.
- API spec that hits `/s/[old]` and expects 301/308 → `/s/[new]`.

**Acceptance:** `/s/[old]` 301-redirects to `/s/[new]` within 90 days; expired/unknown ⇒ 404.

- [x] Done — `008f5ed` (frontend PR #26).

---

## US-5 — URL in settings + copy + upsell

**As** a seller, **I want** to see and copy my URL, **so that** I can share it easily — and learn about the
custom domain.

- Shop URL prominent in `/shop/manage/settings` with a copy-to-clipboard button.
- Subtle "Upgrade to a custom domain →" link next to the slug field, pointing to the existing domain section.
- Bilingual strings in `locales/{es,en}.json`.

**Acceptance:** the URL shows and copies; the upsell leads to custom-domain setup.

- [x] Done — `290177e` (frontend PR #26).

---

## Sprint QA

- **Green deterministic gate** (tsc + build + Playwright api) before merging; one spec per testable story
  (slug validation, availability endpoint, redirect).
- **Split live smoke:** the agent covers api/curl + Playwright; **Daniel covers the seller-session browser
  smoke** (rename a test shop, confirm the 301 and the copy/upsell). Declared in the PR.
