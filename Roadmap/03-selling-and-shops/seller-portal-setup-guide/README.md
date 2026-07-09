---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: seller-portal-setup-guide
---

# Epic: Setup guide on dashboard

> **Area:** 03-selling-and-shops · **Risk:** low · **Archetype:** Grower · **Scope seed:** [`00-ideas/seeds/seller-portal-setup-guide.md`](../../00-ideas/seeds/seller-portal-setup-guide.md)
>
> P0·B of the July-2026 seller-portal UX audit (`references/MiyagiAdminUXAudit/handoff/` — F3 + ONBOARDING-SPEC
> S6). Depends on P0·A [`seller-portal-rails-foundation`](../../09-platform-infra/seller-portal-rails-foundation/README.md)
> primitives. A good early win — works *before* the onboarding three-doors (P1·D) exist.

## Why
Onboarding is a wall, not a path (F3): after a merchant creates a shop there's no setup guide; the "N de 11"
completion counter is buried inside Configuración; payments is revealed as still-a-manual-step *after* setup
succeeds; and the empty dashboard shows two competing CTAs with no recommendation. This epic gives the
merchant a persistent **"Pon tu tienda en marcha"** card on Resumen (`/shop/manage`) that reads the
completion state we already compute and walks them through 5 steps to a sellable shop — **payments named up
front (step 3, "~4 min"), not sprung after the fact** — one step open at a time, dismissible with restore in
Configuración. Grower: acceptance ties to a success signal (guide step-completion events), so we can see
whether the guide actually moves merchants toward payable.

## Medusa-first note
No commerce surface — UI layer + non-commerce settings metadata only (AGENTS rule 1 not engaged). No Medusa
module, no Supabase table, no new API route. The "reuse before rebuild" is the **value-based completion logic
that already computes** in `settings/page.tsx` — the fix is *extraction into a shared seam*, not invention.
The dismiss/share flags reuse the existing shop-settings metadata (Supabase, non-commerce → Rule 2 OK).

## What already exists (reuse, don't rebuild)
- **`app/(shell)/shop/manage/settings/page.tsx`** — `completedSections()` + the value-based `*_ok` checks
  (`stripe_ok || mp_enabled || clabe_ok` → pagos; `envios_ok`; `name && description` → perfil). Comment
  already states the intent: value-based "so a section lights up only when it holds real data." **Extract
  into `lib/setup-guide.ts`; both the settings page and the card consume it.**
- **`app/(shell)/shop/manage/page.tsx`** (Resumen server component) — already loads the seller, the Supabase
  shop mirror, and the product list (`/store/sellers/me/products`). **Product count for step 2 is already in
  hand — no new fetch.**
- **`ManageDashboard.tsx`** — the card host.
- **P0·A primitives** — `<Card>` / `<Button>` / `<StatusBadge>` from `seller-portal-rails-foundation` (build
  on these; fall back to raw `globals.css` tokens if P0·A hasn't merged — see Deploy order).
- **`PATCH /api/sell/shop/route.ts`** — existing shop settings update path; persist `guide_dismissed` +
  `share_done` in `metadata.settings` (non-commerce).
- **CTA target** `/shop/manage/settings/pagos` — exists; the card only *links* to it (no money path touched).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | B.1 — `lib/setup-guide.ts` seam + settings refactor (invisible, regression-guarded) | low |
| 1 | B.2 — "Pon tu tienda en marcha" card on Resumen (payments = step 3, "~4 min") | low |
| 1 | B.3 — Dismiss + restore-in-Configuración + share-completes-step-5 | low |
| 1 | B.4 — Instrument guide step events (the Grower signal) | low |

## Deploy order
Frontend-only, degrades gracefully. **Build after P0·A merges** so the card lands on the shared
`<Card>`/`<Button>` primitives; if P0·A hasn't landed, render on the `globals.css` Design System v2 tokens
directly and swap when P0·A merges (decide at kickoff). Path-scoped commits — B.1 touches `settings/page.tsx`
and B.2 touches `ManageDashboard.tsx`, both also touched by P0·A's sweep and in-flight `catalog-management`;
sequence to avoid merge noise. Vercel preview per PR; verify before merge to `main`.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** the flag slice shipped + the flag
      exists in Flagsmith / Edge Config with the stated polarity. *Verify-only — not a new gate; whether a
      high-risk epic needs one is decided at grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
