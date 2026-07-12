---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: home-dynamic-rows-restore-and-polish
---

# Epic: Homepage dynamic rows — restore on prod + polish to spec

> **Area:** 01-discovery-and-shopping · **Risk:** low · **Scope seed:** [`00-ideas/seeds/home-dynamic-rows-restore-and-polish.md`](../../00-ideas/seeds/home-dynamic-rows-restore-and-polish.md)

## Why
The homepage lost its "welcome back" energy when personalization was stripped for the static-shell
migration. The rows were rebuilt as client islands (static-shell S4) but signed-in visitors on prod
still see a generic page — the island fetch fails silently. This epic makes the two top rows
("Retoma donde te quedaste" + pending-offer ribbon) actually appear on prod, then polishes both
the signed-in and signed-out first-visit experience to the reference mockups
(`marketplace_search_results_mobile.png` / `mercado-libre-search-results.png`), now that Vercel
load is no longer a constraint (frontend runs on Cloud Run).

## Medusa-first note
No new commerce primitives. Listings/prices stay Medusa (curated reads already cached);
favorites/offers stay Supabase (`marketplace_favorites` / `marketplace_offers`). The one data-model
addition (S2 price-drop) is a snapshot column on `marketplace_favorites` — non-commerce, Supabase,
rule 2 compliant. Recently-viewed is device-local (`localStorage`) in v1 — no backend at all.

## What already exists (reuse, don't rebuild)
- `app/components/HomeRetomaOffers.tsx` — both rows, fully built (static-shell S4, #104).
- `app/components/HomePersonalizationProvider.tsx` — Clerk JWT + one fail-open fetch.
- `apps/backend/src/api/store/home/personalization/route.ts` — verified-JWT data endpoint (+ unit tests).
- `lib/home-offer-alert.ts` · `lib/home-favorites.ts` · `lib/home-personalization.ts` — derivation + copy.
- `AuthShow` — client auth-gate that keeps `/` static (already gates the terminal CTA both ways).
- `getCuratedListings` / `isRecentForBadge` / `timeAgo` — Recién llegado is a newest-first variant.
- `getCategoryCounts` + `CategoryChips` — Pasillos with counts.
- `home.*` dictionary keys via `getOverriddenDictionary` (admin-editable, #198).
- Specs: `home-static.spec.ts`, `home-personalization*.spec.ts`, `home-offer-alert.spec.ts`,
  `home-auth-leakage.spec.ts`.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Restore rows on prod — observed red, root cause, fix + breadcrumb | low (env/CORS story → Daniel merges) |
| 2 | Signed-in polish to spec — ribbon gating, price-drop badge, recently-viewed | low |
| 3 | Signed-out first-visit iteration — hero, Recién llegado, Pasillos, seller block | low |

## Deploy order
S1 may be config-only (Cloud Run env / `STORE_CORS`) — backend env change lands first, frontend
needs no deploy unless `NEXT_PUBLIC_*` vars were missing at build time (then rebuild frontend).
S2 backend (snapshot column + endpoint field) before frontend badge — endpoint field is additive,
frontend degrades gracefully. S3 is frontend-only. **Hard rail throughout: `/` stays an ISR static
asset** — `next build` must keep the static marker for `/` (no `ƒ`), and `home-static.spec.ts`
must stay green (signed-in testids absent from anonymous HTML).

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** n/a — risk:low; the islands
      are already fail-open progressive enhancement (inherent kill behavior).
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
