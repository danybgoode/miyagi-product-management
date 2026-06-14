---
status: shipped
slug: seller-acquisition-landing-pages
---

# Seller-Acquisition Landing Pages (BUILD-ORDER #6)

> **Epic — greenfield, supply-side growth.** Top-of-funnel landing pages that recruit new sellers and
> drive them into the existing `/sell` onboarding. Strategy + creative are locked first (Sprint 1),
> then two build tracks. **Scope doc (approved 2026-06-07):**
> `../../00-ideas/seeds/seller-acquisition-landing-pages.md`.
> **North-star context (raw):** `../../00-ideas/seeds/agent-native-gtm/`.
>
> **Status: ✅ COMPLETE — all 4 sprints shipped to prod 2026-06-07.** S1 strategy lock ✅ · S2 WC wedge
> `/vende/mundial` ✅ [PR #42](https://github.com/danybgoode/miyagisanchezcommerce/pull/42) (`fd0f2df`) ·
> S3 anchor `/vende` + section system + Creator `/vende/creadores` ✅ [PR #44](https://github.com/danybgoode/miyagisanchezcommerce/pull/44) (`ea1ae07`) ·
> S4 `/vende/negocios` + `/vende/servicios` + SEO/OG + A/B ✅ [PR #45](https://github.com/danybgoode/miyagisanchezcommerce/pull/45) (`cfe04ef`).
> Retrospective: [`RETROSPECTIVE.md`](RETROSPECTIVE.md). *(Doc close-out done 2026-06-10 — the build
> shipped 2026-06-07 but the epic README/poster/retro were never updated; reconciled during the
> Navigation & Settings Reorg groom.)*

## Why
There is **no** seller-recruitment landing page today — only the conversion *destination*
(`/sell`, the publish/onboarding wizard). Driving all traffic to one generic page dilutes
conversion: a local artisan and a World-Cup tour operator need different pitches. We split the top of
the funnel into an **anchor page** + **persona pages**, riding the 2026 FIFA World Cup in Mexico
(Jun 11–Jul 19; hosts CDMX / Guadalajara / Monterrey) as a tailwind. The trust spine across all
pages: **"No nos creas, pregúntale a Claude"** — the visitor's own AI fetches the site and recommends
us as an independent auditor.

## Context
| | |
|---|---|
| **Class** | Feature (greenfield presentation; growth) |
| **Macro-section** | 08 · Growth & Promotions |
| **Risk** | **Low** across all stories (marketing pages — no payments/checkout/fulfillment/auth/DB/money). *Caveat:* anything touching `middleware.ts` or shared layout must be announced (LEARNINGS). The `/vende` **path** decision avoids middleware entirely. |
| **Depends on** | **#4 design tokens** — for **Track B** only (durable system). **Track A wedge ships on existing `globals.css` tokens now** (Daniel, 2026-06-07). |
| **Spawns (not in this epic)** | agent-readable why-sell/about surface · Onboarding 0 · "ask Claude" campaign · pricing/business-model · founder/philosophy content (see raw vision). |
| **Quality vs speed** | Two-track approved; **do not sacrifice quality for the Jun 11 date** — tailwind runs to Jul 19. |

## Medusa-first reframe
**Zero Medusa, zero commerce, ~zero backend.** Presentation pages that route to existing onboarding.
AGENTS five rules satisfied trivially: no commerce touched, no new data model (direct-to-`/sell`, no
table), Clerk untouched (public/anonymous pages), copy **es-MX**. Build pages **agent-fetchable**
(semantic HTML, real text, structured metadata) so the "ask Claude" campaign works the day they ship.

## What already exists (reuse, don't rebuild)
- **`/sell` onboarding + `SellWizard`** — the conversion destination; CTAs deep-link in
  (`/sell?type=service`, `?from=<persona>` for attribution).
- **#4 design tokens / `globals.css`** — semantic tokens + UI primitives (`.btn`, `.card-tile`,
  `.badge`, `.chip`, `.t-*`). (Track B builds on the hardened #4 contract; Track A on what ships today.)
- **Microsoft Clarity** (connected) — landing conversion analytics; no new analytics build.
- **WC framing already in product** — "Sube tus promos" coupons + WC referral, for message continuity.
- **Agent rails** — `/agent`, UCP manifest, `.well-known/ucp` (so the "ask Claude" pillar has legs).
- **Wildcard `*.miyagisanchez.com` cert** — only if we later flip the anchor to a subdomain (v1 = path).

## Scope (stories)
| Sprint | Story | Track | Risk | Owner |
|---|---|---|---|---|
| **1 — Strategy & creative lock** | US-1 personas + positioning + IA + per-persona es-MX copy + metrics/attribution + per-track token call | — | low (docs) | **Cowork + Daniel sign-off** |
| **2 — WC wedge** ✅ | US-2 lean WC Experience/Service page at `/vende/mundial`, existing tokens, CTA → `/sell?type=service`, Clarity + UTM — merged in frontend PR #42 (`fd0f2df`) | **A (first)** | low | Claude Code |
| **3 — Anchor + Creator system** ✅ (PR #44 · `ea1ae07`) | US-3 reusable section system (on #4 tokens) · US-4 anchor `/vende` + persona router · US-5 Creator page `/vende/creadores` | **B** | low | Claude Code |
| **4 — More personas + SEO/OG + A/B** ✅ (PR #45 · `cfe04ef`) | US-6 `/vende/negocios` (local/print merchant) · US-7 `/vende/servicios` · US-8 per-persona SEO/OG · US-9 A/B hooks | **B** (after S3) | low | Claude Code |

## Deploy order
Frontend-only (Vercel). No backend, no migration. **Build order: Sprint 1 (lock ✅) → Sprint 2 (Track A
wedge ✅ shipped, PR #42) → Sprint 3 (Track B durable — #4 tokens MERGED, PR #37 → unblocked) →
Sprint 4 (more personas + SEO/OG + A/B, after S3).** Each page is independently shippable; merge per
sprint. All low-risk → reviewer may auto-merge on green CI, **except** any story that ends up touching
`middleware.ts`/shared layout (then announce + treat as higher-care).

## Epic Definition of Done
- [x] All in-scope sprints' stories merged to `main` and smoke-tested (gaps stated).
- [x] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed).
- [x] This `README.md` marked ✅; every `sprint-N.md` ticked with commit refs.
- [x] `RETROSPECTIVE.md` written. *(2026-06-10 close-out.)*
- [x] **Product poster updated** (`Roadmap/README.md`) — recruitment-funnel capability + Recent-highlights entry. *(2026-06-10.)*
- [x] Team memory updated; `Roadmap/LEARNINGS.md` fed any durable learning. *(2026-06-10 — doc-drift learning promoted.)*
- [x] Branch deleted; PR(s) merged. *(PRs #42/#44/#45 merged 2026-06-07.)*
