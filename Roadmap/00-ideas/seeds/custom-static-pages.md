---
title: "Custom static pages for seller shops"
slug: custom-static-pages
status: raw
area: "03"
type: feature
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-11
---

# Scope seed — arbitrary custom static pages per shop

## Where this came from
Surfaced (not built) during `platform-migrations` Sprint 1 (US-1.2, parity report), while
validating a suspected gap named at grooming: "arbitrary extra static pages (beyond the fixed
content-page set)." Code-verified against `lib/shop-settings/types.ts`, the seller settings UI
(`app/(shell)/shop/manage/settings/_sections/Paginas.tsx`), and the public content routes
(`app/(shell)/s/[slug]/{acerca,faq,politicas}/page.tsx`) — see
`Roadmap/03-selling-and-shops/platform-migrations/sprint-1.md` → Findings for the full write-up.

## The gap
A seller cannot create a new, arbitrary static page (e.g. "Nuestra Historia," "Guía de Tallas,"
a size chart, a brand-story page). Miyagi's content-page model is closed to exactly **three fixed
routes** per shop — `/s/[slug]/acerca` (one free-text field), `/s/[slug]/faq` (one Q/A array, max
12 pairs), and `/s/[slug]/politicas` (not even independently authored — it derives from the
`returns_policy` setting). There is no `pages` table, no dynamic `[page]`/`[slug]` route segment,
no title/slug input in any settings UI, and no API endpoint for creating/listing/deleting pages.

This is a real parity gap against Shopify (and most storefront builders), which allow any number
of custom pages. It surfaced while migrating merchants IN from Shopify, but it's a general seller-
portal gap, not specific to migrations — any seller wanting a page beyond the fixed three hits it.

## Why it might matter
- Blocks a clean 1:1 migration story for merchants coming from a platform with richer content
  pages (surfaced the gap, doesn't have to be fixed to unblock migrations — the parity report just
  reports it honestly today).
- Independently useful for any seller wanting more brand/marketing surface (size guides, brand
  story, shipping info beyond the fixed policy field).

## Not scoped yet
No design taken on shape (a `pages` array/table? a dynamic `[slug]` route? nav-link generation?
authoring UI?) or size. This seed exists so the gap re-enters the grooming funnel rather than being
silently absorbed into `platform-migrations` as an unplanned add-on. Size and slice at a future
grooming pass if/when it's prioritized.
