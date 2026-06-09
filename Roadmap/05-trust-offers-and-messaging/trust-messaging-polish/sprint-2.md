# Sprint 2 — Shared channel-aware trust component

> **Epic:** [Trust & Messaging Polish](README.md) · **BUILD-ORDER:** #3c · Epic C ·
> **Risk: LOW–MED — presentational.** Reviewer may merge per story on green CI. **Announce C.4** (new
> shared component) per LEARNINGS.
> **Status: ✅ BUILT — draft [PR #65](https://github.com/danybgoode/miyagisanchezcommerce/pull/65)
> (branch `feat/trust-messaging-polish-s2` off `main`; S1 was squash-merged → fresh branch).**
> C.4 `9860935` · C.5 `5886493`. Gate green (tsc + `next build` + Playwright `api` 14/14). C.4 contract
> **handed to Epic D** (`f8c4e43` — D's `sprint-1.md` "📥 C.4 CONTRACT — HANDED OFF" block). `ChannelLayout`
> untouched. Owed Daniel: reviewer merge + the authed chat-header capsule smoke (step 2).

Make trust independent of which page you're on: one extracted component, channel-aware, rendered at the
negotiation entry now and (by Epic D) across every white-label/embed render later.

---

## C.4 — Extract the shared `<TrustSignals>` component (channel-aware) ✅ `9860935`
**As a** buyer, **I want** the seller's trust signals (verification, payment-protection, return window,
pickup/contact) shown as one consistent block, **so that** trust doesn't depend on which page I'm on.

> **Built:** new pure seam `lib/trust-signals.ts` (`selectTrustSignals` + `trustChannelBucket` +
> `returnsWindowLabel` + `TRUST_COPY`) + presentational `app/components/TrustSignals.tsx`. `app/l/[id]/page.tsx`
> consumes `<TrustSignals variant="full" channel="marketplace">` — **byte-for-byte the previous PDP DOM**
> (pills → `interstitial` slot for the S3.2 mobile `SellerTrustCard` → methods box; precio-a-consultar on the
> `consultCta` slot). `channel` reuses `ChannelSource` (Daniel's call). `ChannelLayout` untouched. New shared
> surface **announced + contract handed to Epic D**. QA: `e2e/trust-signals.spec.ts` (14 pure tests) +
> anonymous no-regression `e2e/trust-signals.browser.spec.ts`.

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

## C.5 — Trust capsule at the negotiation entry ✅ `5886493`
**As a** buyer about to negotiate, **I want** the key trust/eligibility signals visible at the chat
header / offer entry, **so that** I learn eligibility *before* I submit, not after.

> **Built:** `<TrustSignals variant="slim">` at the `ConversationClient` header (between the listing header
> and the agent CTA) — verification · pago protegido · devoluciones. Derived **server-side** in
> `app/messages/[id]/page.tsx` from the shop the page already loads (`verified` column + Stripe/MP rail ⇒
> `paymentProtected` + `returns_policy.window` ⇒ `returnsLabel` via the new pure `returnsWindowLabel`). The
> bar is omitted when the seller has none of the three. Null-safe. The page is auth-gated, so the rendered
> capsule smoke is **owed to Daniel** (no anonymous browser path).

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
> Pre-merge preview (SSO-gated): `https://miyagisanchez-git-feat-trust-messag-f77641-danybgoodes-projects.vercel.app`
> Post-merge production: `https://miyagisanchez.com`. Use the matching base below.

1. **PDP parity (anonymous — no login).** Open any listing PDP at
   `https://miyagisanchez.com/l/<listing-id>` (e.g. a shop's product from `/s/<slug>`).
   → The order-info pills ("Lista en …", "Devoluciones: …") and the **Métodos disponibles** /
   **Entrega y disponibilidad** box render **exactly as before** — no visible change vs. pre-Sprint-2.
   *(This is also covered automatically by `e2e/trust-signals.browser.spec.ts` against
   `MS_TEST_PDP_LISTING_ID`.)*

2. **Negotiation-entry capsule (authed — owed to Daniel).** As a signed-in buyer, open a conversation
   with a **verified** seller who accepts card payment and has a return window configured:
   `https://miyagisanchez.com/messages/<conversation-id>`.
   → Directly under the listing header (above the "Tu agente puede negociar…" bar) a slim capsule shows
   **✓ Vendedor verificado · Pago protegido · Devoluciones N días** — visible *before* you make an offer.
   → For a seller with none of those configured, **no capsule bar appears** (it's omitted, not empty).

3. **Epic-D handoff sanity (no UI).** Confirm `<TrustSignals>` is importable with a non-marketplace
   channel — `import TrustSignals from '@/app/components/TrustSignals'` and render
   `<TrustSignals channel="custom_domain" variant="full" … />`; it type-checks and renders (parity:
   identical signals today). Actual `ChannelLayout`/embed wiring lands in **Epic D** (PR consuming this).

If any step fails, note the step number + what you saw — that's the bug report.
