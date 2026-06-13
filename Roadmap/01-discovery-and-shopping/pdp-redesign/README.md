# Epic — PDP redesign: "decide, then act"

> **Macro-section:** [01 · Discovery & Shopping](../README.md) ·
> **Risk: LOW–MED overall** (frontend reorder/polish; one backend sprint; one carved HIGH auth story). Reviewer
> may auto-merge LOW stories on green CI **unless** a story touches shared layout / the buy bar.
> **Status: 🚧 SCAFFOLDED — awaiting build.** Planned 2026-06-13. Scope doc:
> [`00-ideas/2. readyforscope/pdp-redesign-decide-then-act.md`](../../00-ideas/2.%20readyforscope/pdp-redesign-decide-then-act.md).
> Source audit: `handoff/PDP-Audit.dc.html`. Reference end-states in the audit are **inspiration, not signed-off scope.**

## Why
The live PDP (`app/l/[id]/page.tsx`) makes the buyer resolve *"is this the right item?"* and *"can I trust the
seller?"* **last** — seller card + payment methods occupy the upper half, the description sits at the bottom, and
a fixed bar with variable height covers it (the reported bug). The audit reorders the page by buyer intent
(identify → trust → understand cost/delivery → act) and adapts the same skeleton per listing type. Most of it is
**reorder/polish of components that already exist**; the only genuinely-new build is a structured-attributes
primitive (specs) and a few signals.

## Context
| Question | Answer |
|---|---|
| **Who** | Buyers on the PDP (web + PWA), signed-out and signed-in, across all 9 listing types |
| **Job** | Identify the item, trust the seller, understand cost/delivery — *then* be asked to act |
| **Outcome signal** | The fixed bar never covers content · description + specs sit above payment/seller on mobile · one clear primary CTA · "compra protegida" sits beside the price · each listing type leads with the block that decides it |
| **In v1** | Base §02/§03 redesign **+** the full per-type system (§05): services · rentals · digital · subscriptions · autos · inmuebles · events · unclaimed |
| **Out (deferred)** | Finding #6 (login wall) → carved HIGH story, Daniel-gated · desktop 2-col rework · PWA edge states · recommendation-algo changes |
| **Risk tier** | LOW–MED (Sprints 1/2/4/5 LOW; Sprint 3 MED–HIGH backend; carved #6 HIGH) |

## Medusa-first note
No new tables expected. Specs = a **metadata-driven per-category attribute schema** in `apps/backend` (Medusa),
matching the live `metadata.repuve` precedent and the "personalized products → zero new tables" learning — escalate
to a custom module + link only if we must query/filter on the attributes (decide in plan mode; it sets Sprint 3's
risk tier). New attributes must also surface in the UCP catalog read (AGENTS rule #3). All new copy es-MX (PDP is
not on the bilingual allow-list). Clerk + Supabase untouched except `marketplace_favorites` reuse for save-counts.
Mobile↔desktop reordering uses the **duplicate-render idiom** (`md:hidden`/`hidden md:block`), not flex-order.

## What already exists (reuse, don't rebuild) — verified 2026-06-13
- **Interactive gallery** (swipe/dots/thumbnails/arrows/lightbox) — shipped PR #70. Add only back/share/"1/6".
- **`<TrustSignals>`** (channel-aware) + slim trust capsule — Epic C; reuse for the by-price cue + confidence capsule.
- **`SellerTrustCard`**, already lifted above payment on mobile — Discovery Polish #3c; reuse for reorder + rating.
- **Offer states in the bar** — PDP `:206–290` branches `activeDeal` pending/countered/accepted_unpaid + countdown
  (poster §05). Section 03 is **hierarchy/anti-stack polish, not new**.
- **Per-type primitives:** `metadata.repuve` (PDP `:468`), Cal.com `booking_url` (`:76–100`), `readEventDetails`
  + ticketing/QR backend, `SubscriptionSection`, digital inline buy, unclaimed contact-only PDP (`isShopClaimed`).
- **Structured fields:** autos (brand/year/km/transmission/fuel) + inmuebles (rooms/surface/property_type) —
  `lib/types.ts`, `lib/listings.ts:23` — seed the specs table for those categories.
- **Seams:** `lib/listing-query.ts` taxonomy, `lib/listings.ts` Store API reads — extend with pure helpers (free spec coverage).

## Scope — stories by sprint
| Sprint | Story | Risk |
|---|---|---|
| **S1 · Base PDP: bug + reorder + primary CTA** | S1.1 Bar/padding overlap fix; offer states replace (not stack) the buy bar (#4) | LOW |
| | S1.2 Right-column reorder by intent — specs + description above payment/seller (#3) | LOW |
| | S1.3 Two-action bar, one primary (#5) | LOW |
| | S1.4 "Compra protegida" cue beside the price (#2) | LOW |
| **S2 · Confidence, liveness & gallery** | S2.1 Confidence capsule + seller rating / response time (#7) | LOW |
| | S2.2 Liveness/FOMO — "X lo guardaron" + <48h "Nuevo" gating | LOW |
| | S2.3 Gallery back + share + "1/6" counter (#1) | LOW |
| **S3 · Attributes primitive + specs table** | S3.1 (BE) Per-category attribute schema (metadata-first) + Store API + UCP read | MED–HIGH |
| | S3.2 (FE) Seller capture of structured attributes | MED |
| | S3.3 (FE) Scannable specs table on the PDP (#7) | LOW |
| **S4 · Per-type A** | S4.1 Services (schedule gallery + "qué incluye") · S4.2 Rentals (dates + deposit + total) · S4.3 Digital (instant-delivery banner) · S4.4 Subscriptions (tiers + interval toggle) | LOW–MED |
| **S5 · Per-type B** | S5.1 Autos (REPUVE anchor + vehicle specs) · S5.2 Inmuebles (property specs + zone map) · S5.3 Events (event block + aforo + QR) · S5.4 Unclaimed (honest notice + contact-only + claim nudge) | LOW–MED |
| **Carved · #6 login wall** *(Daniel-gated, not in flow)* | "Comprar" for everyone; defer auth to checkout (`signInHopHref`) | **HIGH** |

## Kill-switches (decided at grooming · verified at epic DoD)
- **`pdp_redesign`** — epic-level kill-switch, **default `true`** (created **enabled**) once shipped; flips the whole
  new layout back to the old PDP instantly if it regresses.
- **`pdp_defer_auth`** — covers **only the carved #6 story**, **default `false`** (created **disabled**); Daniel
  enables it if/when he chooses to ship the login-wall removal.

## Deploy order (two repos, async)
Sprints 1, 2, 4, 5 are frontend-only. **Sprint 3 deploys backend first** (Cloud Run, ~12 min, no preview) — the
attribute schema/route must be live before the FE specs table + seller capture read it; the frontend degrades
gracefully (no attributes → table simply absent) across the window. Carved #6 is frontend + checkout-path.

## Epic Definition of Done
- [ ] All sprints' stories merged to `main` + smoke-tested (money/auth/events-checkout gaps stated; owed to Daniel).
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs; money/auth steps flagged as owed to Daniel).
- [ ] Epic `README.md` marked ✅; every `sprint-N.md` status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written.
- [ ] Product poster (`Roadmap/README.md`) updated — §01 line + a Recent-highlights entry.
- [ ] Team memory updated (epic memory + `MEMORY.md` index).
- [ ] `LEARNINGS.md` updated with any durable learning.
- [ ] **Kill-switches verified:** `pdp_redesign` exists (default `true`, enabled); if #6 shipped, `pdp_defer_auth`
      exists (default `false`, disabled until Daniel enables).
- [ ] Feature branch(es) deleted; PR(s) merged.
