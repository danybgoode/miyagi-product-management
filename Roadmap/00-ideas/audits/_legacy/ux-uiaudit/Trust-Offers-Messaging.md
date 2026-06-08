Role: Senior UX Optimization Architect
Context: We are moving to the next target slice of our headless marketplace UX audit: "05 · Trust, Offers & Messaging". The stack comprises a MedusaJS backend (medusa-bonsai-backend) and a Next.js/Tailwind frontend (miyagisanchezcommerce). You have live access to both repositories.

Objective: Run a comprehensive, top-shelf, mobile-first UX architectural audit of the negotiation (offers), real-time messaging, trust signal placement, and assisted refund flows.

CRITICAL WORKFLOW INSTRUCTIONS:
1. Familiarize yourself with the repository structures, specifically looking at the messaging interface, the offer submission state machine, how buyer/seller profiles display trust contexts, and the logic governing order visibility/refund triggers.
2. READ-ONLY AUDIT: Do not create feature branches, do not modify files, and do not write code or technical deployment specifications. Keep your focus entirely on high-level UX design heuristics, friction analysis, and user flow mapping.
3. Focus STRICTLY on User Experience (UX) architecture, context sharing, cognitive load, and conversational ergonomics. Ignore visual UI polish, layout aesthetics, and styling rules for this phase.

Audit Focus Areas for "Trust, Offers & Messaging":
- The "Chat-to-Commerce" Transactional Handoff: Audit the real-time chat interface on mobile. When an offer is made, countered, or accepted, does the UX inject actionable, contextual widgets directly into the chat timeline (e.g., an in-chat "Pay Now" card reflecting the newly negotiated price)? Audit the friction involved in moving from a verbal agreement to a locked-in transaction block.
- The Haggling State Machine (Offers): Analyze the cognitive load of the "Make an Offer" flow. How clearly are the states differentiated for both parties (e.g., Pending, Countered, Accepted, Expired, Rejected)? Ensure the UX prevents conversational deadlocks where both users are confused about who holds the next move.
- Trust Signal Proximity & Context: Audit where and when buyer/seller reputation and identity context are surfaced. Are trust signals placed natively within the discovery and messaging entry points to enable informed decision-making *before* a user initiates negotiation, or are they buried behind multiple profile taps?
- Asynchronous Manual Refund Lifecycle: Since the platform handles manual payment methods (like SPEI and cash arrangements), a refund cannot always be fully automated by a backend API call. Audit the "assisted handoff" refund UX. How explicitly does the UI guide the seller to execute the manual transfer, and how does the buyer verify receipt without generating anxiety or platform distrust?
- Order Visibility & Cross-Domain Sync: Review the dual-sided view of active orders. When an order state updates via a backend event, does the UI clearly communicate the real-time historical log to both the buyer and seller simultaneously, keeping them aligned on the item's escrow/fulfillment status?

Your Deliverable:
Provide a top-shelf UX audit report identifying structural friction points, conversational context gaps, and trust vulnerabilities within the interaction loops. Conclude with a strategic, prioritized recommendation list of UX architectural updates before we transition to UI design or implementation.

must haves and general needs:
deterministic select and input fields where possible: no open fields as much as possible, prefilled or preselected options are preferred. getting ahead of the user action and present a ready to approve or edit option is preferred rather than open fields.