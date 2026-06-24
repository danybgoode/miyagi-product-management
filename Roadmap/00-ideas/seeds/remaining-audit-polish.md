---
title: "Remaining audit polish (#3c umbrella)"
slug: remaining-audit-polish
status: shipped
area: "01"
type: feature
priority: wave-3
risk: high
epic: null
build_order: "#3c"
updated: 2026-06-24
---

# Scope — Remaining Audit Polish (BUILD-ORDER #3c)

> **Status: ✅ SIGNED OFF (Daniel, 2026-06-07).** Gate passed. **Scaffolded:** Spike 0 brief
> ([`spike-arranged-only-delivery.md`](spike-arranged-only-delivery.md)) + Epic A
> ([`01-discovery-and-shopping/discovery-polish/`](../../01-discovery-and-shopping/discovery-polish/),
> README + sprint-1..3). **Epics B / C / D are scope-defined here and will be deep-groomed
> individually** as they come up the queue (Daniel's granularity call). Kickoff prompts emitted at
> groom time. Groomed 2026-06-07 off the #3a refresh (`audits/results-refresh-2026-06/`, pinned
> frontend `origin/main@ed447bd` / backend `origin/main@0980253`) + a fresh code re-check this pass.
>
> **Build order (Daniel-approved):** Spike 0 → Epic A + Epic D (parallel, low/med) → Epic C → Epic B
> (heaviest / B.5 blocked-by Spike 0). **Scaffolding granularity (Daniel):** Spike 0 + Epic A scaffolded
> now; B / C / D deep-groomed individually.
> **Class: a wave of work, not one epic** — #3c is the audit's "everything that wasn't a money-path
> P0." BUILD-ORDER says *"sliced as domain epics"*; this doc proposes **1 spike + 4 domain epics**,
> each independently groomable/shippable. **Stage-2.5 bucket: mostly genuinely-needs-build** (real UX
> rebuilds + one durable money-path state machine), with two reuse head-starts that shrink the work.

<!-- Commit provenance: the bulk of this #3c scaffold (this doc, the Spike 0 brief, Epic A README +
sprints, BUILD-ORDER + macro-README edits) was first written into commit 959c167 — it was swept into a
concurrent sibling's granular-notifications commit via a shared-index collision (single worktree). No
content was lost; history was not rewritten (a sibling agent was active). This follow-up commit records
the #3c groom under its own message. -->

## The ask (mirrored back)
*You want to clear the **remaining UX-audit backlog** — everything #3a surfaced that wasn't a #3b
money-path P0 — plus the items #3b and #6 explicitly deferred onto #3c: the full assisted refund
state machine, pickup reserved-slot scheduling, the in-chat shared transaction ledger, the discovery
listing-type taxonomy, the mobile filter rebuild, PDP hierarchy, and the per-channel **storefront**
trust-signal parity audit that moved here from #6. Sliced into clean domain epics so each can ship on
its own. Right?*

## Daniel's decisions this groom (2026-06-07)
1. **Arranged-only delivery policy → SPIKE FIRST.** `onlyCoordinated = false` is hardcoded
   (`backend …/checkout-options/route.ts:160`). Rather than decide blind, run a short investigation
   (who needs arranged-only, what breaks in checkout/quotes/agents) that ends in a **written decision**.
   **The Delivery epic's arranged-only slice is blocked-by this spike.**
2. **Carve = 4 domain epics (A/B/C/D)** — confirmed below.
3. **Refunds → build the FULL assisted multi-step refund state machine** (not the lighter tracked-status
   option). HIGH-risk money path; Daniel merges. #3b already shipped the copy-only honesty fix, so this
   builds the real lifecycle on top of it.

## What the #3a refresh confirmed + this pass re-verified on `main`
All findings still live (`results-refresh-2026-06/`, all five domains). Re-checked the two that the
refresh left "not verified" — both reproduce:
- **Listing-type is displayable but NOT filterable.** `lib/listings.ts:119` normalizes
  `listing_type` onto every listing (`p.type?.value ?? meta.listing_type ?? 'product'`), but
  `buildQuery`'s allow-list (`lib/listings.ts:21-26`) **omits `listing_type`** — so the search query
  never forwards a type filter, and `app/l/SearchBar.tsx` exposes no type affordance. The normalization
  is a genuine head-start; the filter plumbing + UI is the actual work.
- **`SearchBar` is a dense inline `<select>` form** (`app/l/SearchBar.tsx`, 315 lines of stacked
  `<select>`/`<input>` + a submit) — no bottom-sheet/full-screen layer, no deliberate apply, no
  "Show X results" CTA. Confirms the mobile-filter-rebuild finding (Baymard 2026 re-confirmed in the 01 refresh).
- **Per-channel trust divergence is real.** `app/s/[slug]/ChannelLayout.tsx` (the white-label shell for
  custom-domain **and** subdomain renders) is a **bare branded frame** — logo, name, footer, *zero*
  trust signals (no verified badge, no payment-protection, no returns/pickup/contact). `app/embed/s/[slug]/page.tsx`
  reuses the same `ChannelLayout` and is thinner still. Trust capsules live only in the marketplace PDP.
  So the same listing presents materially different trust depending on the channel it's viewed through.

## The shape: 1 spike → 4 domain epics

> Each epic is sized at Definition-of-Ready here (overview · reuse · slice outline · risk · QA). On
> sign-off you choose: **scaffold all four now**, or **deep-groom each individually** before it builds.
> I recommend scaffolding the spike + Epic A immediately and deep-grooming B/C/D as they come up the
> queue, since B is spike-blocked and C/D are lower urgency.

---

### SPIKE 0 — Arranged-only delivery policy *(blocks Epic B's arranged-only slice)*
**Question:** may sellers publish **arranged-only** listings (in-person / coordinated delivery, no
shippable carrier)? `onlyCoordinated = false` is hardcoded (`checkout-options/route.ts:160`), so today
every listing must offer a carrier quote and arranged is only ever an add-on.
**Investigate:** which seller types need it (services, bulky/local goods, in-person deals); what breaks
if `onlyCoordinated` can be `true` (checkout-options, Envía quote path, the agent/UCP checkout, the
"coordina con el vendedor" recovery copy); whether it's a per-listing flag or a per-shop default.
**Output:** a written decision appended to this doc (or its own brief) — **no code.** Class: spike.

---

### EPIC A — Discovery polish *(domain 01)*
**Job:** a buyer can filter by listing type, the mobile filter feels like a real layer, and the PDP
leads with a type-appropriate decision frame.
**Reuse (Medusa-first):** `listing_type` is already normalized on every listing (`lib/listings.ts:119`)
and already in the UCP schema (`lib/ucp/schema.ts:71,212`) — the data exists; add it to `buildQuery`'s
allow-list + the backend `/store/listings` filter + a UI affordance. `CategoryChips` (`app/components/CategoryChips.tsx`)
is the pattern for a type chip-row. The PDP already has the per-type primitives (service/rental/digital
branches in `lib/ucp/schema.ts:157,181`) — reorder, don't invent.
**Slice outline (skateboard → car):**
- A.1 **Type is filterable** — add `listing_type` to `buildQuery` + backend filter + a type chip/segment
  in `SearchBar`; cards render a type affordance. *(LOW-MED — read-only discovery, no money path.)*
- A.2 **Mobile filter layer** — rebuild `SearchBar` mobile as a full-screen/bottom-sheet with a sticky
  "Filtrar y ordenar" trigger, deliberate apply, and a live "Ver X resultados" CTA (Baymard 2026). *(LOW-MED.)*
- A.3 **PDP hierarchy** — lead with a type-specific decision frame; lift seller trust above
  payment/fulfillment on mobile. *(LOW-MED.)*
- *(Deferred tail, P2 — out of Epic-A v1:* query-type→filter mapping, embedded AI catalog assistant.)*
**Risk: LOW-MED overall** (presentational/discovery; no commerce mutation). Reviewer may auto-merge per story on green CI **unless** a story touches shared layout. **QA:** pure-logic spec on the filter-param builder; one api spec asserting `listing_type` round-trips through search; anonymous browser smokes for the mobile layer + PDP order (work without auth).

### EPIC B — Delivery & manual-money polish *(domains 02 + 04; blocked-by Spike 0)*
**Job:** the full assisted refund lifecycle is durable and honest; pickup is a real reserved slot, not a
link; address capture is CP-first; quote failures recover cleanly.
**Reuse (Medusa-first):** the **#3b durable manual-payment state machine shipped 2026-06-07**
(`lib/manual-payment-state.ts`, state on `order.metadata`, mirrored in `normalizeMedusaOrder`) — the
refund machine **mirrors that exact pattern** (a pure `lib/` state helper + metadata + normalizer
projection), it does not invent a new persistence mechanism. The refund anchors are known
(`OrderDetail.tsx:659,1079,1155`). `paymentSettled` (`OrderDetail.tsx:709`) is the gating-predicate
template. #3b already made the refund **copy** honest, so this is purely the lifecycle.
**Slice outline:**
- B.1 **Assisted refund state machine** — durable multi-step lifecycle (`solicitado → aceptado →
  transferencia_pendiente → confirmado`, with a rejected branch) on `order.metadata`, shared across
  buyer / seller / agent, mirroring `lib/manual-payment-state.ts`. *(**HIGH — money path, Daniel merges.**)*
- B.2 **Pickup reserved-slot scheduling** — replace the external-link pickup (02-#7) with a real
  selectable slot persisted on the order. *(HIGH — fulfillment.)*
- B.3 **CP-first address capture** — reorder the mobile checkout form so CP leads (04-#1). *(MED.)*
- B.4 **Quote recovery + timeout** — a selectable coordinated path on Envía failure (04-#2) + a
  UI-level timeout around `fulfillment-envia` quotes (04-#3). *(MED-HIGH — touches checkout.)*
- B.5 **Arranged-only** *(blocked-by Spike 0; built only if the spike says "yes")* — seller toggle +
  `onlyCoordinated` logic + checkout shows the manual/arranged path only. *(HIGH.)*
- *(Also 04 tail: delivery-causality copy, seller publish-readiness gates — fold into B or defer.)*
**Risk: HIGH overall** (money/fulfillment). **Daniel merges B.1/B.2/B.5.** **QA:** pure-logic spec on
the refund state helper (transition guards); api specs asserting persistence + any new gate (422s);
authed money-path browser smokes **owed to Daniel**.

### EPIC C — Trust & messaging polish *(domain 05)*
**Job:** the chat becomes a shared transaction ledger; negotiation shows whose turn it is and when it
expires; trust capsules appear at the negotiation entry, channel-aware.
**Reuse (Medusa-first):** the **in-chat ledger CONSUMES #3b's durable state — it does not re-model it.**
Project `lib/manual-payment-state.ts` + the new refund states (Epic B) into the chat as a read view; the
`purchase_complete` / `buyer_reported_paid` events are the ledger's timeline entries. Offer state already
lives in `lib/offers.ts` / `lib/offer-respond.ts`; the haggling fix is a turn-owner/deadline projection +
the "48h vs <24h" copy reconciliation (`MakeOfferButton.tsx`), not a new state model.
**Slice outline:**
- C.1 **In-chat transaction ledger** — a durable transaction card in chat that reflects the shared
  order/payment/refund state (reads #3b + Epic-B state). *(MED — read projection of existing state;
  higher if it writes.)*
- C.2 **Haggling turn-owner + deadline** — explicit "te toca / espera respuesta" + a real expiry; fix
  the 48h/<24h copy mismatch (`MakeOfferButton.tsx`). *(MED.)*
- C.3 **Trust capsules at negotiation entry** — surface verification/eligibility at the chat header /
  offer entry, **channel-aware** (coordinates with Epic D). *(LOW-MED.)*
**Risk: MED overall** (mostly projection/copy; no new money mutation if the ledger stays read-only —
confirm at deep-groom). **Note:** Epic C is **unblocked** — #3b's durable state it depends on already
shipped. **QA:** pure-logic specs on the offer turn/deadline derivation; anonymous browser smokes for
the ledger render + trust capsules.

### EPIC D — Cross-channel storefront trust parity *(domain 07 / cross-channel; moved from #6)*
> **⤷ Deep-groomed + signed off 2026-06-07 → dedicated scope:
> [`cross-channel-trust-parity.md`](cross-channel-trust-parity.md); scaffolded
> `07-agentic-and-federated-commerce/cross-channel-trust-parity/` (1 sprint).** The Medusa-first code
> read slimmed this below — custom-domain/subdomain/embedded-PDP already render trust (the root layout
> wraps the same pages in `ChannelLayout`); only the **embed shop grid** + a **shell platform-assurance
> strip** are real gaps. **Re-ordered: Epic D is blocked-by C.4** (consumes Epic C's `<TrustSignals>`),
> no longer parallel-ahead of C. The sketch below is the pre-groom version.

**Job:** the trust signals a buyer sees on a listing don't silently disappear when the same shop is
viewed via subdomain, custom domain, or embed.
**Reuse (Medusa-first):** there's **one white-label shell** — `app/s/[slug]/ChannelLayout.tsx` — used by
both custom-domain and subdomain renders, and reused by `app/embed/s/[slug]/page.tsx`. Lift the
marketplace PDP's trust capsules into a **shared trust-signal component** and render it inside
`ChannelLayout` (and a slimmed variant in embed) so parity is structural, not copy-pasted. No backend
change — trust data already rides the listing/shop objects.
**Slice outline:**
- D.1 **Trust-signal inventory** — a short audit story: enumerate which signals (verified, payment
  protection, returns, pickup, contact) render on marketplace vs `ChannelLayout` vs embed today.
  *(LOW — doc/inventory.)*
- D.2 **Shared trust component + parity** — extract the marketplace trust capsules into one component;
  render it in `ChannelLayout` and a slim embed variant. *(LOW-MED — **touches shared `ChannelLayout`,
  so announce it** per LEARNINGS; can break sibling renders.)*
**Risk: LOW-MED** (presentational; the one caution is the shared `ChannelLayout` blast radius). **QA:**
anonymous browser smokes asserting the trust component renders across all three host contexts.

---

## Proposed build order (adjust at sign-off)
1. **Spike 0** (arranged-only) — fast, unblocks B.5.
2. **Epic A** (Discovery) and **Epic D** (channel trust parity) — low/med risk, no money path; good
   parallel early wins (A is independent; D only needs a heads-up on `ChannelLayout`).
3. **Epic C** (Trust & messaging) — unblocked (#3b state shipped); mostly projection.
4. **Epic B** (Delivery & money) — HIGH risk, the heaviest; B.5 waits on Spike 0. Build last / most carefully.

## In / Out of scope (#3c v1)
**In:** the spike + the four epics' v1 slices above; the full assisted refund state machine; pickup
reserved-slot scheduling; in-chat transaction ledger (consuming, not re-modeling, #3b state); listing-type
taxonomy (filterable + card affordance); mobile filter rebuild; PDP hierarchy; haggling turn-owner/deadline;
per-channel storefront trust parity; one api spec per testable story + extracted `lib/` seams; bilingual es-MX.
**Out (deferred to a later wave):** query-type→filter search mapping + embedded AI catalog assistant
(01 P2); delivery-causality copy + seller publish-readiness gates unless folded into B; escrow / Compra
Protegida (its own spike, `spike-compra-protegida.md`); first-run seller onboarding checklist + type-first
listing builder + promotions hub (03 P1s — onboarding/growth, not audit-polish).

## Open risks / questions
- **Multi-epic wave — keep them independent.** Each epic must ship on its own; the only hard dependency
  is **B.5 blocked-by Spike 0**. Epic C consumes #3b state (already shipped) and Epic B's refund states —
  if C builds before B, the ledger projects #3b state now and gains refund rows when B lands (degrade gracefully).
- **`ChannelLayout` is shared surface** (Epic D) — touching it can break every white-label render and any
  sibling PR; announce + prefer a PR (LEARNINGS: "announce cross-cutting changes").
- **Epic B is the high-risk heart** — money/fulfillment, Daniel merges; reuse the proven
  `lib/manual-payment-state.ts` pattern, gate on presence checks to keep the non-manual path unchanged.
- **Decide scaffolding granularity at sign-off** — all four epics now, or deep-groom each as it comes up.
  Recommend: scaffold Spike 0 + Epic A now; deep-groom B/C/D individually.
- **No external-fact research needed** beyond the Baymard 2026 filter guidance already re-confirmed in the
  01 refresh; everything else is internal state/UX, verified against current code this pass.

## Definition of Ready check
- [x] As-a/I-want/so-that clear per epic; acceptance checks are Daniel-runnable.
- [x] Class named (1 spike + 4 feature epics); Stage-2.5 bucket = mostly genuinely-needs-build (two reuse head-starts).
- [x] v1 in/out boundary written; Daniel's 3 decisions captured (spike arranged-only · 4-epic carve · full refund machine).
- [x] Medusa-first reuse list produced per epic (listing_type normalization · `lib/manual-payment-state.ts` pattern · `lib/offers.ts` · shared `ChannelLayout`).
- [x] Each epic risk-tiered; QA stage named; high-risk (Epic B) merge owner = Daniel.
- [x] **Daniel approved this scope doc (2026-06-07)** ← gate passed. Build order + granularity confirmed; Spike 0 + Epic A scaffolded + committed; B/C/D to deep-groom individually; kickoff prompts emitted.
