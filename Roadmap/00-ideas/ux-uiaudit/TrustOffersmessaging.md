**05 · Trust, Offers & Messaging UX Audit**

I completed the read-only audit across `apps/miyagisanchez` and `apps/backend`. No files were modified.

**Executive Readout**

The marketplace already has a strong foundation: structured chat stamps, offer states, accepted-offer checkout paths, seller/buyer order views, manual payment confirmation, and return/refund primitives. The main UX risk is not absence of capability. It is fragmentation: offer, chat, checkout, order, payment, and refund states are each understandable in isolation, but they are not consistently projected into one shared conversational transaction record.

That creates the biggest marketplace trust vulnerability: after users negotiate, pay manually, report payment, request a return, or receive a refund, the product often relies on separate pages, status badges, emails, or implied backend state instead of a mutually visible timeline.

**1. Chat-to-Commerce Transactional Handoff**

The chat has a meaningful commerce layer: accepted offers surface a bottom “Pagar ahora” action when payment is available in [ConversationClient.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/apps/miyagisanchez/app/messages/[id]/ConversationClient.tsx:295>). Offer sent/countered events also render as structured bubbles in [ConversationClient.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/apps/miyagisanchez/app/messages/[id]/ConversationClient.tsx:102>).

The friction is that the transaction object is mostly an action bar, not a durable in-chat commerce card. Once a user scrolls, returns later, or switches devices, the historical chat timeline does not reliably show: negotiated price, expiry, who must act next, payment method, checkout/order link, or post-payment state.

There is also an important completion gap. The renderer knows about `purchase_complete`, but purchase completion appears to update listing/offer state through [offer-state.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/offer-state.ts:27>) without emitting a corresponding conversation event. So the chat can help get a buyer to checkout, but it does not become the shared transaction ledger afterward.

Recommendation: make every accepted offer produce an immutable in-chat transaction card with current state layered on top: `Accepted`, `Pay by`, `Pay now`, `Order created`, `Seller confirmed payment`, `Shipped`, `Delivered`, `Return requested`, `Refund pending`, `Refund received`. The chat should become the buyer/seller’s shared memory, not just the place where negotiation began.

**2. Haggling State Machine**

The underlying offer state model is clear: `pending`, `accepted`, `declined`, `countered`, `expired`, `withdrawn`, `paid` in [offers.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/offers.ts:3>). The buyer Make Offer flow is relatively deterministic, with prefilled discount anchors in [MakeOfferButton.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/MakeOfferButton.tsx:415>) and validation in [offers.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/lib/offers.ts:124>).

The cognitive-load issue is “who owns the next move?” That is often implied by button availability rather than explicitly stated. Pending/countered/accepted states exist, but the UX should state the turn owner and deadline everywhere the offer appears: PDP, chat, seller inbox, buyer account, and checkout.

There is also inconsistent expectation-setting: the offer modal says the seller has 48 hours, while another line says the seller responds in under 24h in [MakeOfferButton.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/components/MakeOfferButton.tsx:388>). Seller counter flows still allow open amount and optional open note fields in [OfferInbox.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/offers/OfferInbox.tsx:124>) and [ConversationClient.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/messages/[id]/ConversationClient.tsx:382>).

Recommendation: add a deterministic “next move” model across all offer surfaces: “Seller must accept, counter, or reject by Thursday 4:00 PM,” “Buyer must accept counter or let it expire,” “No action needed.” Countering should default to prefilled choices: midpoint, minimum acceptable, include shipping, final offer, or reject with a selected reason.

**3. Trust Signal Proximity**

Trust signals are strongest on the listing page: payment methods and fulfillment options appear near the CTA in [page.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/[id]/page.tsx:421>), seller verification appears in the seller card in [page.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/l/[id]/page.tsx:547>), and shop pages surface verification/payment badges in [page.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/s/[slug]/page.tsx:142>).

The gap is proximity at negotiation entry points. The chat header and messages list do not carry enough trust context before a buyer negotiates or pays. Buyer trust gating is also mostly discovered after submission: the offer API can reject a buyer below the seller’s minimum trust level in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/offers/route.ts:151>), while the identity endpoint still frames listing-page buyer badges as future-facing in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/ucp/identity/[identifier]/route.ts:7>).

Recommendation: add trust capsules to the Make Offer modal and chat header: seller verified status, payment protection level, return window, fulfillment method, and buyer eligibility. If the buyer cannot make an offer, show deterministic recovery actions: verify phone, complete profile, choose listed price checkout, or message seller without offer.

**4. Assisted Manual Refund Lifecycle**

This is the highest-risk UX area. The product acknowledges manual refunds, but the state language can overstate what has actually happened.

The seller UI warns that SPEI/cash refunds require the seller to transfer money manually in [OrderDetail.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:1115>). But after action, the UI can present “Reembolso emitido” in [OrderDetail.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:1038>). Backend manual payment refunds also return success-like semantics even though the transfer is off-platform in [base.ts](</Users/cosmo/dobby/medusa-bonsai/apps/backend/src/modules/payment-manual-mx/base.ts:77>). The Medusa seller return route marks manual cases as `refunded` / `manual` while saying manual refund is required in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/[id]/return-request/route.ts:235>).

There is also a state vocabulary mismatch: buyer return requests are created as `requested` in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/buyer/me/orders/[id]/return-request/route.ts:81>), while seller UI actionability appears keyed around `pending` in [OrderDetail.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:958>). That can make return handling feel invisible or stuck.

Recommendation: split manual refund into explicit assisted states: `Refund approved`, `Seller transfer pending`, `Seller marked transfer sent`, `Buyer confirms received`, `Disputed / needs help`. Amount should be prefilled, method preselected from original payment, recipient details shown, and seller confirmation should require deterministic fields like transfer method, date, reference number, and optional proof. Buyer should get one clear confirmation CTA: “I received the refund” or “I need help.”

**5. Order Visibility & Cross-Domain Sync**

Buyer and seller order views are functional, and manual payment confirmation is represented on both sides. Buyer pending-payment instructions are clear in [OrderTrackingClient.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/account/orders/[id]/OrderTrackingClient.tsx:371>), while sellers get a confirmation panel for SPEI/cash in [OrderDetail.tsx](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/shop/manage/orders/[id]/OrderDetail.tsx:801>). Backend normalization also accounts for manual payment state in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/route.ts:104>).

The missing UX object is a shared historical activity log. Buyer “I paid” reporting only notifies; it does not become a visible shared event in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/miyagisanchez/app/api/orders/[id]/report-payment/route.ts:1>). Seller fulfillment changes persist as order metadata in [route.ts](</Users/cosmo/dobby/medusa-bonsai/apps/backend/src/api/store/sellers/me/orders/[id]/route.ts:164>), but they are not projected back into the conversation or a mutual timeline.

Recommendation: introduce one buyer/seller-facing order activity timeline that is also mirrored into chat. It should log: offer accepted, checkout started, manual payment instructions shown, buyer reported payment, seller confirmed payment, fulfillment updates, delivery confirmation, return request, refund approval, manual transfer sent, buyer refund receipt.

**Priority Recommendations**

1. Create a shared transaction timeline across chat and order pages. This is the largest trust unlock.

2. Replace implicit offer states with explicit “next actor + deadline + available actions” across PDP, chat, seller inbox, and checkout.

3. Convert manual refunds into an assisted, multi-step handoff instead of treating “registered” as “refunded.”

4. Surface trust context before negotiation: seller trust, payment protection, return policy, and buyer offer eligibility inside the Make Offer modal and chat header.

5. Prefer deterministic inputs everywhere: offer anchors, counter presets, rejection reasons, refund reasons, refund method, transfer reference, and confirmation checklists. Open text should be optional context, not the core action.

6. Emit commerce events into conversations for purchase completion, manual payment reports, seller payment confirmation, fulfillment updates, return requests, and refund milestones.

The strategic UX direction is clear: make negotiation feel less like a chat that eventually sends users elsewhere, and more like a guided transaction room where both parties always know the current state, the next move, and why the platform can be trusted.