---
status: shipped
slug: marketplace-positioning-meta
---

# Epic: Marketplace positioning — title, OG & social card

> **Area:** 08-growth-and-promotions · **Risk:** low · **Type:** chore · **Scope seed:** [`00-ideas/seeds/marketplace-positioning-meta.md`](../../00-ideas/seeds/marketplace-positioning-meta.md)
> **Status:** ✅ shipped 2026-06-11 · Frontend PR [#83](https://github.com/danybgoode/miyagisanchezcommerce/pull/83) squash `cf0fa8a`

## Why
The public-facing metadata — the browser/Google `<title>`, the meta description, the OpenGraph/Twitter
tags, and the rendered social-share image — currently leads with *"Infraestructura de comercio,"* B2B
infra jargon that tells a first-time visitor (or Google, or someone who gets a shared link) nothing
about what Miyagi is. After this epic, every one of those surfaces says plainly what it is: **a
marketplace where you buy and sell anything in Mexico, and where you can open your own shop and sell
without commissions** — with the **segundamano** recognition kept in the description/keywords/card so it
still "clicks" for Mexican users. Single-sprint copy chore, frontend-only.

## Medusa-first note
N/A — no commerce primitive involved. This is static page metadata (`export const metadata`) and a
generated OG image (`next/og`). Nothing touches Medusa, Supabase, payments, auth, or any DB. AGENTS
rule #1 not engaged. AGENTS rule #5 (bilingual): these surfaces are **es-MX and NOT on the bilingual
allow-list** — they stay es-MX only; no `en` strings added.

## What already exists (reuse, don't rebuild)
- `apps/miyagisanchez/app/layout.tsx` — `export const metadata` (~L38–73): `title.default` +
  `template`, `description`, `keywords`, `openGraph`, `twitter`. **Edit in place** — structure stays,
  only the strings change.
- `apps/miyagisanchez/app/opengraph-image.tsx` — the `next/og` share card: `alt` (L3), the tagline
  line (L97), the pill-badge array (L102). **Edit the three strings**, leave the layout/styling.
- `apps/miyagisanchez/app/api/ucp/manifest/route.ts` — agent-facing `description` (L31) **already**
  reads *"A P2P marketplace for Mexico…"* → **no change needed** (audited, already aligned).
- **Leave alone:** `app/shop/manage/settings/ShopSettings.tsx` L3256 ("…infraestructura nuestra") —
  unrelated custom-domain settings copy, not the brand tagline.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Rewrite `layout.tsx` public metadata (title/description/keywords/OG/Twitter) | low |
| 1 | Rewrite `opengraph-image.tsx` (alt + tagline + pills) | low |
| 1 | Add `api` meta spec + grep/update any stale suite assertion | low |

## Deploy order
Frontend-only (`apps/miyagisanchez` → Vercel). No backend/Cloud Run, no migration, no deploy-lag
window. One PR; reviewer may auto-merge on a green gate (low-risk tier). Preview validates via the
branch's Vercel preview; nothing is owed to Daniel (no money/auth path).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
