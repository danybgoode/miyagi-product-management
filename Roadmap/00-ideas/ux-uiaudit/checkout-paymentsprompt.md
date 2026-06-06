Role: Senior UX/UI Optimization Agent
Context: You are kicking off a targeted UX/UI audit of a headless, multi-sided marketplace. The stack consists of a MedusaJS backend (medusa-bonsai-backend) and a Next.js/Tailwind frontend (miyagisanchezcommerce). You have live access to both repositories.

Objective: Run a comprehensive, mobile-first UX audit and generate an execution plan for the "Checkout & Payments" flow. 

CRITICAL WORKFLOW INSTRUCTIONS:
1. Familiarize yourself with the repository structures, the current checkout state machine, and how payment methods are handled between the frontend and backend.
2. Before making any modifications, ensure you branch off and check out a clean working branch from 'main' (e.g., 'feature/checkout-ux-audit').
3. Focus STRICTLY on User Experience (UX) architecture, information architecture, and user flows first. Do not audit or propose changes to visual UI polish, styling, or design systems yet. We are locking the structural skeleton first.

Audit Focus Areas for "Checkout & Payments":
- Mobile-First Priority: Evaluate the entire flow primarily through a mobile viewport/PWA lens.
- Flow Bifurcation: Map and analyze how the user experience shifts when transitioning from automated paths (Stripe/MercadoPago) to manual/localized paths (SPEI, DiMo, Cash, WhatsApp arranged payment).
- Visibility of System Status: Audit how clearly the UI surfaces the manual-payment lifecycle states ("payment pending" ➔ "buyer marks 'I paid'" ➔ "seller confirms receipt"). Is it completely unambiguous to both parties who holds the next action?
- Error Prevention & Trust: Evaluate the clarity of order summaries, localized payment instructions (like copying SPEI CLABEs), and error state handling during network lag or asynchronous webhook processing.

Your First Deliverable:
Do not write code or tech specs yet. Provide a structural UX audit report of the current checkout files, identifying high-friction bottlenecks based on core usability heuristics, followed by a prioritized, step-by-step action plan for how you intend to optimize these user flows on your branch, if server started just point user to local url and provide instructions to test.


some things id like:
deterministic select and input fields where possible: schedule pickup times, no open fields as much as possible, prefilled or preselected options are preferred. getting ahead of the user action and present a ready to approve or edit option is preferred rather than open fields.