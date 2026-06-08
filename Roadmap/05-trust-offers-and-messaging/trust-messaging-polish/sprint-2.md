# Sprint 2 — Shared channel-aware trust component

> **Epic:** [Trust & Messaging Polish](README.md) · **BUILD-ORDER:** #3c · Epic C ·
> **Risk: LOW–MED — presentational.** Reviewer may merge per story on green CI. **Announce C.4** (new
> shared component) per LEARNINGS.
> **Status: 📋 PLANNED.** C.4 → C.5. **Build C.4 before Epic D's trust-parity slice (D.2)** — D consumes it.

Make trust independent of which page you're on: one extracted component, channel-aware, rendered at the
negotiation entry now and (by Epic D) across every white-label/embed render later.

---

## C.4 — Extract the shared `<TrustSignals>` component (channel-aware)
**As a** buyer, **I want** the seller's trust signals (verification, payment-protection, return window,
pickup/contact) shown as one consistent block, **so that** trust doesn't depend on which page I'm on.

**Reuse:** the inline PDP trust signals (`app/l/[id]/page.tsx:147-175, 709-714`) — payment-methods,
return-policy, pickup, processing time. Extract, don't re-author.

**Acceptance:**
- A reusable `<TrustSignals>` component takes a `channel` prop (`marketplace` | `channel` | `embed`) and
  a slim variant for thin surfaces.
- The marketplace PDP renders the extracted component with **no visible change** (parity first — a
  no-regression refactor).
- The component is **announced as new shared surface** (Epic D will consume it) and documented as the
  single trust block.

**QA:** pure-logic spec on the trust-signal selector (which signals show per channel/variant); anonymous
browser smoke asserting the marketplace PDP still renders the same signals (no regression).
**Risk: LOW–MED · reviewer may merge on green CI** (introduces a shared component but does **not** touch
`ChannelLayout` — that wiring is Epic D).

---

## C.5 — Trust capsule at the negotiation entry
**As a** buyer about to negotiate, **I want** the key trust/eligibility signals visible at the chat
header / offer entry, **so that** I learn eligibility *before* I submit, not after.

**Reuse:** C.4's `<TrustSignals>` (slim variant); the chat header (`ConversationClient.tsx`) +
`MakeOfferButton` context.

**Acceptance:**
- `<TrustSignals>` (slim variant) renders at the negotiation entry (chat header / offer entry),
  channel-aware, surfacing verification + payment-protection + return window.
- Buyer eligibility/trust is discoverable **before** offer submission (closes 05 finding-3).

**QA:** anonymous/authed browser smoke of the capsule at the negotiation entry (authed parts owed to
Daniel). **Risk: LOW–MED · reviewer may merge on green CI.**

---

## Sprint 2 QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api`.
- **New specs:** trust-signal selector pure-logic (C.4); no-regression PDP browser smoke (C.4).
- **Browser smokes:** anonymous PDP parity (C.4) + negotiation-entry capsule where anonymous-renderable
  (C.5); authed chat-header parts **owed to Daniel**.
- **Hand-off:** give Epic D the `<TrustSignals>` contract (props/variants) before D wires it into
  `ChannelLayout`.

## Sprint 2 — Smoke walkthrough (do these in order)
> _Placeholder — fill with real production URLs once deployed (preview URLs pre-merge)._

1. _(TBD)_ Open any listing PDP at `https://miyagisanchez.com/l/<id>`.
   → Trust signals (payment methods, return policy, pickup) render exactly as before — no visible change.
2. _(TBD)_ Open "Hacer oferta" / the conversation header for that listing.
   → A slim trust capsule shows verification + payment-protection + return window before you submit an offer.
3. _(TBD, Epic-D preview)_ Confirm the same `<TrustSignals>` component is importable/renderable on a
   white-label render — wiring lands in Epic D, but the component contract should already support `channel="channel"`.

If any step fails, note the step number + what you saw — that's the bug report.
