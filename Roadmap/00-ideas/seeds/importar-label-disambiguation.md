---
title: "Disambiguate the two 'Importar' doors — dashboard label copy tweak"
slug: importar-label-disambiguation
status: shipped                      # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "03"                           # touches app/(shell)/shop/manage/ManageDashboard.tsx — closest home is catalog-management's own footprint, but see note below
type: polish
priority: low
risk: low
epic: null
build_order: null
updated: 2026-07-11
---

# Disambiguate the two "Importar" doors

**Origin:** surfaced during catalog-management Sprint 5, Story 5.3 (mobile-hidden Importar button
fix). Two separate, genuinely different features share the word "Importar" in the seller portal:

1. `ManageDashboard.tsx`'s dashboard button → `/shop/manage/import` — **catalog/product import**
   (CSV/staging bulk import via `ImportClient.tsx`, Supabase `supply_batches`/`supply_items`).
2. `settings/page.tsx`'s settings-index banner → `/shop/manage/settings/import` — **store
   configuration import** (`SettingsImportClient.tsx`, "Importa tu configuración" — a Storefront-
   as-Code-style migration tool for the whole shop setup, not products).

Sprint 5's own acceptance text conflated these as "one import door" and would have repointed the
settings banner at the catalog importer, silently orphaning the config-import route — caught during
planning and confirmed with Daniel not to do that. Both doors are correct and should stay separate;
they're just confusingly named from the dashboard's side.

## The actual gap

`/shop/manage/settings/import`'s own page title is already disambiguated ("Importar
configuración — Miyagi Sánchez"), and the seller-nav rail already labels its catalog-import entry
precisely (`{ key: 'importar', label: 'Importar catálogo', href: '/shop/manage/import' }` in
`lib/seller-nav.ts`). Only the **dashboard button's own label** is the generic "Importar" — the one
place a seller could plausibly not know which importer they're about to open.

## Proposed fix (small)

Rename `ManageDashboard.tsx`'s button text from "Importar" to "Importar catálogo" — matching the
rail entry's existing label, zero new routes, no structural change. One-line copy tweak, LOW risk.

## Why not folded into catalog-management as a real story

Too small for a groomed user story (no acceptance criteria beyond a label string), and the
counterpart page (`/shop/manage/settings/import`) isn't catalog-management's domain at all — it's
closer to whatever epic owns the seller settings/onboarding IA (`lib/setup-guide.ts`'s neighborhood,
`seller-portal-rails-foundation` / `seller-portal-setup-guide`-adjacent). Logged here rather than
built immediately so it isn't lost, but also doesn't force a branch/PR/CI cycle for a one-line
change during a sprint wrap-up.

## Shipped

2026-07-11 — PR [#218](https://github.com/danybgoode/miyagisanchezcommerce/pull/218) squash `2cc1d26`.
LOW risk, agent-merged on green CI (tsc/build/Playwright vs preview) per WAYS-OF-WORKING's low-risk
auto-merge tier — copy-only, no commerce/auth/DB/money surface. The mobile-width visual check
(390px, alongside "+ Nuevo anuncio") wasn't separately verified live — worth a glance next time
someone's on that dashboard on a phone, not blocking.
