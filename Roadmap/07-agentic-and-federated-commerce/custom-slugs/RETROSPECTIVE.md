# Retrospective — Custom Slugs (free-tier shop URLs)

**Shipped to prod 2026-06-06.** Backend `medusa-bonsai-backend#6` (merge → Cloud Build us-east4) +
frontend `miyagisanchezcommerce#26` (merge → Vercel). One sprint, 5 stories + 1 backend enabler.
(Shipped alongside, but separate from, the custom-domain DNS hotfix `#24`.)

## What shipped
- **Pick a slug at creation** — `<SlugField>` in the SellWizard, auto-suggested from the shop name,
  debounced ✓/✗ availability; both create paths forward the slug to Medusa.
- **Edit the slug later** — settings editor → `PATCH /api/sell/shop/slug` → Medusa `slug` +
  `previous_slugs` (90-day) → Supabase mirror → cache bust. Backend `PATCH /store/sellers/me` now
  accepts `slug` (format/reserved → 422, uniqueness → 409).
- **Old slug 301s for 90 days** — `app/s/[slug]/page.tsx` consults a cached `lib/slug-redirect.ts`
  over `metadata.previous_slugs`; pure `pickAliasTarget` enforces the window + self-skip.
- **Free URL surfaced** — settings leads with `miyagisanchez.com/s/[slug]`, copy button, and a
  "Mejora a dominio propio" upsell to the existing custom-domain flow.

## What went well
- **Medusa-first paid off again (zero new tables).** Slug was already `unique()` in the seller model
  and `POST` already accepted it — so "pick at creation" was *frontend-only*, and the whole edit/redirect
  feature rode `seller.metadata` + the existing Supabase mirror. The only backend change was 1 route
  accepting one more field.
- **Reading the backend first re-scoped the epic.** A 2-file read (seller model + `me` route) turned an
  assumed multi-endpoint backend story into a one-field PATCH, and revealed `GET /store/sellers/[slug]`
  was reusable for availability — no new availability endpoint on the backend.
- **Extract-the-seam testing.** Pulling `validateSlug`/`slugify`/`pickAliasTarget` into pure `lib/slug.ts`
  gave 13 deterministic specs for free; the DB/`next-cache` wrapper stays untested but trivial.
- **Degrade-gracefully let frontend + backend ship the same day** despite the backend's 12-min,
  preview-less deploy — the editor surfaces the backend error until the deploy lands; everything else
  works regardless.

## What we learned / gotchas
- **A pure helper can't share a module with a `next/cache` import.** The Playwright runner can't load
  `next/cache`, so `pickAliasTarget` had to live in pure `lib/slug.ts`, not in `lib/slug-redirect.ts`
  (which imports `unstable_cache`). Put unit-tested logic in a next-free module.
- **CI didn't auto-trigger for one PR.** GitHub Actions `ci.yml` never scheduled for `feat/custom-slugs`
  on open (a sibling PR's CI ran fine minutes apart); close/reopen didn't fix it, an empty-commit push
  eventually did. The local gate (tsc + build + specs) + the green Vercel preview were the real signal.
- **`main` moved twice mid-flight** (sibling `feat/support-widget` #25 merged) → a one-line import
  conflict in `ShopSettings.tsx`; resolved by merging `main` in and re-running the gate before merge.
- **Keep two reserved-slug lists in sync** (frontend `lib/slug.ts` + backend `me/route.ts`) — duplicated
  deliberately since the two repos can't share code; noted in both files.

## Gaps (owed to Daniel — needs a seller session)
- Authed browser smoke: rename a real test shop → new URL serves, old URL 301s, copy/upsell render.
  (Availability + the 90-day/self-skip redirect logic are spec-covered; the authed flow needs his session.)

## Deferred (captured, infra-ready)
- Wildcard subdomains `shopname.miyagisanchez.com` (open Q: **Clerk sibling-subdomain cookie isolation**).
- `mschz.org/shopname` short links (domain already owned).
