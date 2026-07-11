# Platform migrations — Sprint 3: Packaging — landings + consultant runbook

**Status:** ✅ built, PR pending. Commits on `feat/platform-migrations-s3` (apps/miyagisanchez,
branched off `origin/main` `57b6831`, onboarding-three-doors S2 merged): `0877bb2` (admin pricing
fix, do-first), `692afef` (Story 3.1), `921f5f4` (Story 3.2), `6c26b55` (QA spec + design-token
allowlist).
**Risk:** LOW (copy + non-commerce pages; reviewer may auto-merge on green CI).

**Found + fixed before Story 3.2 could proceed (not in the original epic doc):** the admin
promoter-pricing screen (`PromoterAdminClient.tsx`) hard-disabled the "Precio por SKU" input for
any SKU with no `PROMOTER_SKU_BASE_PRICE_MXN` entry — which included `migration`, the exact SKU
Sprint 2 built a whole money path around. An admin could not actually type a price into that
field (the underlying `PATCH /api/admin/promoter/pricing` route was already generic and worked
fine — only the UI gate was wrong). Fixed with a small `DIRECT_PRICE_SKUS` allow-list; `print_ad`
correctly stays disabled (its real price is per-tier and never reads this table). See commit
`0877bb2`.

**Deviation from the original acceptance ("verified against a real export file per platform
during the build"):** no real Tiendanube/WooCommerce/BigCartel export sample existed anywhere in
the repo. Escalated to Daniel before building; resolved as: build the how-to steps from each
platform's official documentation (Tiendanube's and WooCommerce's export menus; confirmed
WooCommerce's default CSV headers — `Name`/`Regular price`/`Categories` — don't match
`lib/catalog-import.ts`'s `HEADER_ALIASES` as originally written, and BigCartel has **no** admin
export button at all — the honest path is its public `/products.json` storefront endpoint routed
through the importer's paste/AI-extract flow, not a CSV upload), cross-checked against the
importer's actual header-alias map. **Live confirmation against a real downloaded export file per
platform is owed to Daniel** — same pattern as this epic's other owed money/account-gated smokes.

## Context
Bucket-1 of the seed: CSV/JSON migrations from Tiendanube/WooCommerce/BigCartel exports already work
on the shipped importer — what's missing is **positioning**: a concrete, jargon-free how-to per
platform. Shopify gets the connector path (S1). The consultant interaction (photograph the shop →
interview → agent sets it up) is the promoter close flow — it needs a runbook, not code. All copy
es-MX, recruiting register (concrete steps, no jargon), **not** on the bilingual allow-list.

## Stories

### Story 3.1 — Per-platform migration landing/how-to pages ✅ built (commit `692afef`)
**As a** merchant on Shopify/Tiendanube/WooCommerce/BigCartel, **I want** a page that shows me
exactly how to move to Miyagi, **so that** I can judge the switch in five minutes.
**Acceptance:**
- [x] One page per platform under `/vende/migracion/*` (+ a hub at `/vende/migracion`): Shopify →
      the connector path (S1, links straight to `/shop/manage/shopify/import`); the CSV/JSON
      platforms → real, numbered export steps (names of their actual export menus, sourced from
      official docs — see the deviation note above) → the existing importer
      (`/shop/manage/import`).
- [x] Each page walks a real export → import end-to-end **on paper** (grounded in official docs +
      a `HEADER_ALIASES` cross-check); **live verification against a real downloaded export file
      per platform is owed to Daniel** (see deviation note above) — no real sample file existed
      to build against.
- [x] The free self-serve baseline and the white-glove option are both stated honestly (no
      enforced "≤500" cap exists in code today — self-serve import is genuinely free with no
      listing ceiling; the copy states the epic's approved framing without implying a code-enforced
      gate that doesn't exist); per-page SEO meta + OG image + sitemap entry; es-MX throughout (not
      on the bilingual allow-list — `en.json` carries the same keys only for `Dictionary` type
      completeness, never served).
**Risk:** low

### Story 3.2 — Consultant runbook + `/vende` + sell-sheet integration ✅ built (commit `921f5f4`)
**As a** promoter, **I want** a photograph-the-shop → interview → agent-sets-it-up runbook,
**so that** I can close a migration in one visit without improvising.
**Acceptance:**
- [x] A runbook page at `/vende/promotor/migracion` (handbook style, like
      `/vende/promotor/sell-sheet`): what to photograph, the interview questions, how to run the
      pull/import, the flat-price / estimate / route-to-Daniel decision tree.
- [x] The migration offer appears on `/vende` (a new `migrationCallout` card on the `negocios` and
      `servicios` persona pages — the two personas most likely already running a shop elsewhere)
      and in the promoter sell-sheet (a glossary card + pitch script + a live price line) — the
      real price read live via `getPromoterSkuPrices()`, never a hardcoded number (unlike
      `custom_domain`/`subdomain` on that same page, which have real compile-time-constant
      prices — `migration` doesn't, so it can't follow that pattern).
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/platform-migrations-seo.spec.ts` — 200/SEO-meta/OG/sitemap coverage for
  all 5 new `/vende/migracion*` pages (mirrors `seller-acquisition-seo.spec.ts`'s established
  pattern); the negocios/servicios migration-callout nudge; the runbook's 200/noindex/print
  markers; two source-level regression guards (the sell-sheet + runbook must call
  `getPromoterSkuPrices()` and never hardcode the epic doc's `$999` reference price; the admin
  pricing screen must no longer unconditionally disable the price input). No repo-wide automated
  "es-MX copy-completeness" script exists (confirmed during research) — copy was hand-reviewed
  against the AGENTS rule #5 gate instead.
- **browser smoke owed:** copy sign-off to Daniel (register/honesty judgment); live verification
  of the 3 CSV/JSON export how-to pages against a real downloaded export file per platform (no
  sample file existed to verify against during the build — see the deviation note above).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` project all green,
  confirmed locally against a production (`next build` + standalone) server on 2026-07-11 (2014
  passed). The new spec's 5 `og:image` live-fetch sub-assertions fail pre-merge by design — they
  fetch the tag's own absolute `https://miyagisanchez.com/...` URL, which 404s until this branch
  is actually deployed (same accepted pattern Sprint 2 documented for its own new route's gating
  spec). 6 further pre-existing failures (`home-auth-leakage`, `launchpad-campaign-vote` ×2,
  `launchpad-submission` ×3, `home-static`) are unrelated to this diff — confirmed via
  `git diff origin/main...HEAD` touching none of those files — and trace to no local Medusa
  backend running in the verification sandbox, the same class of gap Sprint 1 documented.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (once merged + deployed)

1. Go to https://miyagisanchez.com/admin/promoter and set a price for "Migración de tienda" (e.g.
   $999) — the input should now be editable and save successfully (**the S3 fix**: before this
   sprint, this field was hard-disabled and unsaveable for this SKU).
   → `Precio guardado.` confirmation; the field shows the saved amount on reload.
2. Go to https://miyagisanchez.com/vende/negocios and https://miyagisanchez.com/vende/servicios →
   a "¿Vienes de otra plataforma?" card appears near the bottom of each, linking to
   `/vende/migracion`.
3. Go to https://miyagisanchez.com/vende/migracion → a hub page with 4 platform cards (Shopify,
   Tiendanube, WooCommerce, Big Cartel).
   → Click each card → lands on `/vende/migracion/{platform}`. The Shopify page's primary button
   links to `/shop/manage/shopify/import` (the real S1 connector flow); the other three link to
   `/shop/manage/import` (the shipped importer) and state that platform's real, numbered export
   steps (Tiendanube: Productos → Lista de productos → Importar y exportar → Exportar; WooCommerce:
   Products → All Products → Export; Big Cartel: `tudominio.com/products.json`, pasted into the
   importer's "pegar catálogo" option, not uploaded as CSV).
4. Follow one CSV path (Tiendanube or WooCommerce) end-to-end with a **real downloaded export
   file** from that platform.
   → The catalog lands via the existing importer exactly as the page promises; note any column
   that doesn't map cleanly (the page's claims were built from official docs + a header-alias
   cross-check, not a real file — this is the exact gap this step exists to close).
   **(owed to Daniel — no real export file existed during the build)**
5. Go to https://miyagisanchez.com/vende/promotor/sell-sheet → the "Migración de tienda" glossary
   card and 30-second pitch script appear; the price line at the bottom shows the real admin-set
   price (from step 1); a "→ Manual de migración" link is present.
   → Click it → lands on `/vende/promotor/migracion`, a printable runbook: what to photograph, the
   interview questions, and the flat-price ($X, up to the listed cap) / cotización / "pasa el caso
   a Daniel" decision tree — the price shown matches step 1's admin-set amount exactly.

If any step fails, note the step number + what you saw — that's the bug report.
