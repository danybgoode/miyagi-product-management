# PDP follow-ups cleanup — booking_url protocol + personalized-event label

**Status: awaiting Daniel approval — no code yet.**
Source: the open follow-ups captured at PDP-redesign **Sprint 5** close
([`01-discovery-and-shopping/pdp-redesign/sprint-5.md`](../../01-discovery-and-shopping/pdp-redesign/sprint-5.md),
"Follow-ups") and carried from **Sprint 4**. This bundles the **two LOW, frontend-only quick wins** into one
short cleanup epic to ship **before Sprint 6**. The two heavier follow-ups (events tiers, rental backend
pricing) are **routed out** of this scope — see *Out of scope & routing* below.

## Stage-2.5 bucket — **light enhancement** (both stories)
Neither is net-new capability. **C** is a one-line correctness fix generalised into a shared helper that the
PDP already half-implements elsewhere (`lib/supply.ts` `canonicalSourceUrl`). **B** is prop-threading a label
that page.tsx *already computes* into a buy box that doesn't currently receive it. No new tables, no backend
change, no migration, no new bilingual surface.

## Why
Two small correctness gaps were knowingly deferred at S4/S5 close because they were below those sprints'
threshold. They're cheap, they're independent of S6, and one of them (**C**) silently degrades the autos /
inmuebles / services "Agendar" CTAs the redesign just shipped — so it's worth closing before more per-type
work lands on top of it.

## Stories

### C — Normalize protocol-less seller `booking_url`s  *(do first — shared surface)*
**As** a buyer (or an AI agent) on a listing whose seller typed a scheduling link without a scheme
(`cal.com/foo` instead of `https://cal.com/foo`), **I want** the "Agendar" / "Ver disponibilidad" action to
open the seller's real calendar, **so that** the booking CTA never resolves to a broken in-app relative URL.

- **Root cause (verified 2026-06-14):** `booking_url` is resolved once at `app/l/[id]/page.tsx:173-175`
  (`calcomSettings.booking_url` → first `scheduling.links[].url`) and consumed **unguarded** by `AutoHero.tsx:69`,
  `InmuebleHero.tsx:77`, `ServiceHero`, the generic schedule link, and the UCP reads
  (`api/ucp/checkout-session/route.ts:386`, `api/ucp/mcp/route.ts:844`). A value without `https://` renders as a
  same-origin relative link.
- **Fix:** a pure `lib/` helper `ensureUrlProtocol(value)` (mirror the existing `canonicalSourceUrl` pattern in
  `lib/supply.ts:153` — `raw.startsWith('http') ? raw : 'https://' + raw`, returns `null` on empty/garbage)
  applied at the **resolution seam** in `page.tsx` so every hero consumer inherits it, **and** at the two UCP read
  seams so agents and the storefront agree (AGENTS rule #3).
- **Acceptance:** a listing whose seller `booking_url` is `cal.com/refacciones/visita` (no scheme) renders an
  "Agendar" CTA whose `href` is `https://cal.com/refacciones/visita`; a value that's already `https://…` is
  unchanged; an empty/whitespace value yields no broken link (CTA falls back to AskSeller as today). The same
  normalized URL appears in the UCP `checkout-session` / `get_listing` booking field.
- **QA:** pure-logic spec on `ensureUrlProtocol` (the `api` gate — scheme-present / scheme-less / empty / garbage
  cases) + an anonymous browser smoke on an autos or inmuebles listing. **Risk: LOW** (no money/auth; **shared
  surface — feeds autos/inmuebles/services CTAs + UCP, so announce in the PR**).

### B — Personalized-event buy label
**As** a buyer of an event listing that **also** has personalization fields, **I want** the buy button to read
"Comprar boleto — $precio" like every other event, **so that** the CTA isn't the generic "Comprar ahora" that
contradicts the event framing right above it.

- **Root cause (verified 2026-06-14):** `page.tsx:307-308` computes `buyNowLabel` / `signInBuyLabel` from
  `eventModel`, but `PersonalizationBuyBox` hardcodes `Comprar ahora — {priceLabel}` (`PersonalizationBuyBox.tsx:93`)
  and is rendered (`page.tsx:404`, `:468`) **without** those labels, so the event+personalization combination falls
  back to the generic copy. Rare combination, cross-agent review nit on PR #93.
- **Fix:** add optional `buyNowLabel?` / `signInBuyLabel?` props to `PersonalizationBuyBox`; pass the
  already-computed labels from `page.tsx`; keep the current hardcoded strings as the fallback when not provided
  (zero change for non-event personalized listings).
- **Acceptance:** an event listing with personalization fields shows "Comprar boleto — $precio" (and the matching
  signed-out label); a non-event personalized listing is byte-for-byte unchanged.
- **QA:** pure-logic spec on the label selection (event → boleto label; non-event → fallback) + browser smoke on a
  personalized-event listing. **Risk: LOW** (label only; **touches the shared `PersonalizationBuyBox` — announce**).

## What already exists (reuse, don't rebuild) — verified 2026-06-14
| Capability | Where | Reuse for |
|---|---|---|
| Protocol-normalize pattern | `lib/supply.ts:153` `canonicalSourceUrl` | Model `ensureUrlProtocol` on it (C) |
| Single `booking_url` resolution seam | `app/l/[id]/page.tsx:173-175` | One place to normalize → all heroes inherit (C) |
| Already-computed event labels | `app/l/[id]/page.tsx:307-308`, `lib/event-hero.ts` (`buyLabel`/`signInLabel`) | Pass straight through (B) |
| Buy box | `app/components/PersonalizationBuyBox.tsx` | Add 2 optional props, keep fallback (B) |

## In / out of scope
**In v1:** the two stories above — both frontend-only, both with a pure `lib/` spec seam, both LOW.

**Out of scope & routing (the heavier S5/S4 follow-ups):**
- **A — events aforo / ticket tiers / quantity.** *Mostly orientation:* aforo already exists (native Medusa
  `manage_inventory` on the listing — the S5 note conflated it with the separate *free-RSVP*
  `MarketplaceEvent.capacity`). Per Daniel, the real near-term want is a **quantity selector only** (buy N units of
  one GA listing — leans on Medusa cart quantity + existing inventory). **Route → a light seed in
  `10-events-and-ticketing`** (quantity selector). Full **ticket tiers** = Medusa **variants** and is *already a named
  backlog item* in that domain ("Multi-tier/multi-session tickets — Medusa variants + multi-variant purchase UI") —
  leave there as its own future epic. Not in this cleanup.
- **D — backend rental line-item pricing.** Charging a rental online for real (nights × rate + deposit instead of
  the generic checkout's single-unit charge) is a **HIGH, backend-first, Daniel-merge money path** — its own epic,
  not a pre-S6 squeeze. **Route → its own seed/epic.** Today's seller-coordination "Reservar" flow stays as-is.
- **Owed to Daniel (separate, pre-existing):** the S5.3 events **ticket purchase + QR-after-payment** money/auth
  smoke — already owed, unrelated to this cleanup.

## Risk & ship
- Both stories **LOW** → reviewer may auto-merge on green CI, **except** both touch a shared surface (C: the
  booking_url consumers + UCP; B: `PersonalizationBuyBox`) → **declare the shared-surface touch in the PR** per
  WAYS-OF-WORKING. Frontend-only, no backend deploy, no migration.
- **Nothing owed to Daniel here** — no money/auth path; the smokes are fully anonymous.
- **Research:** none required — both are internal-code corrections (no external standard / provider / framework
  fact in play).

## Definition of Ready check
- [x] "As a / I want / so that" + Daniel-testable acceptance for both stories.
- [x] Stage-2.5 bucket named (light enhancement).
- [x] v1 in/out boundary written; A and D explicitly routed out.
- [x] Reuse list produced (Medusa-first reframe done — no commerce tables touched).
- [x] Each story risk-tiered (both LOW, shared-surface announce); QA stage named (pure `lib/` spec + anonymous smoke).
- [x] Smoke owner: **anonymous / self-serve** (no money/auth path owed to Daniel).
- [ ] **Daniel approves this scope doc** → then scaffold epic + sprint, commit, emit the kickoff.
