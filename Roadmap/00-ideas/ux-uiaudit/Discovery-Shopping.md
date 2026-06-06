Role: Senior UX/UI Optimization Agent
Context: We are moving to the next target slice of our headless marketplace UX audit: "01 · Discovery & Shopping". The stack comprises a MedusaJS backend (medusa-bonsai-backend) and a Next.js/Tailwind frontend (miyagisanchezcommerce). You have live access to both repositories.

Objective: Run a comprehensive, mobile-first UX audit and generate an execution plan for the top-of-funnel Buyer Browsing, Searching, and AI-assisted discovery flows.

CRITICAL WORKFLOW INSTRUCTIONS:
1. Familiarize yourself with the repository structures, the routing for product categories, search implementations, and the AI shopping assistant interface.
2. Lets treat this as read only, no modifications to repos whatsoever.
3. Focus STRICTLY on User Experience (UX) architecture, friction reduction, discoverability, and information hierarchy. Do not audit or propose changes to visual UI polish, styling, or aesthetics yet.

Audit Focus Areas for "Discovery & Shopping":
- Listing Polymorphism & Cognitive Load: Because the marketplace supports a wide variety of listings (products, services, rentals, digital goods, subscriptions), audit how clearly the UX differentiates these types on the search grid and Product Detail Page (PDP). Does a service look distinct from a rental? Are the call-to-actions tailored dynamically to the listing type?
- Conversational-to-Catalog Handoff: Analyze the AI Shopping Assistant. When a user asks for something in natural language, how does the UI transition them to actionable items? Is it a closed sandbox, or does it fluidly drop them into filtered catalog states or direct PDP deep-links?
- Mobile PWA Ergonomics & Findability: Audit the thumb-zone accessibility of the bottom tab bar, mobile search entry points, filter slide-outs, and sorting mechanisms. Ensure the mobile filtering UX doesn't require excessive scrolling or hidden taps.
- High-Value Pre-Purchase Trust Signals: In a P2P market, friction occurs when vital information is buried. Audit the availability and visibility of location, seller shop links, and item condition on both the search cards and the primary viewport of the mobile PDP.

Your First Deliverable:
Do not write code or tech specs yet. Provide a structural UX audit report of the discovery, search, AI assistant, and product detail components, identifying high-friction bottlenecks based on e-commerce best practices, followed by a prioritized, step-by-step action plan for how you intend to optimize these user flows on your branch.