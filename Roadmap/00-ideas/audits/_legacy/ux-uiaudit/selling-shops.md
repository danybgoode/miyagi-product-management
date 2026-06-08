Role: Senior UX Optimization Architect
Context: We are moving to the next target slice of our headless marketplace UX audit: "03 · Selling & Shops". The stack comprises a MedusaJS backend (medusa-bonsai-backend) and a Next.js/Tailwind frontend (miyagisanchezcommerce). You have live access to both repositories.

Objective: Run a comprehensive, top-shelf, mobile-first UX architectural audit of the Seller experience—from onboarding and listing creation to dashboard management, promotions, and referrals.

CRITICAL WORKFLOW INSTRUCTIONS:
1. Familiarize yourself with the repository structures, looking specifically at seller onboarding flows, listing creators, the seller dashboard, coupon/promotion modules, and the referral implementation.
2. READ-ONLY AUDIT: Do not create feature branches, do not modify files, and do not write code or technical deployment specifications. Keep your focus entirely on high-level UX design heuristics, friction analysis, and user flow mapping.
3. Focus STRICTLY on User Experience (UX) architecture, cognitive load, state clarity, and merchant ergonomics. Ignore visual UI polish, layout aesthetics, and styling rules for this phase.

Audit Focus Areas for "Selling & Shops":
- Decoupled Onboarding Architecture: Analyze the UX of the decoupled store-creation and listing-creation flows. Since they don't block one another, audit the "empty state" of the dashboard if a seller creates a store but drops off before making their first listing. Is the path forward clear and frictionless?
- Contextual Listing Builder: Evaluate the flow of the listing tool as it handles multiple polymorphic types (physical items, services, rentals, and recurring subscriptions). Does the UX gracefully adapt inputs based on what is being sold, or does it feel like a generic, over-complicated form?
- Manual Order Fulfillment Loop: Audit the seller-side UX for managing manual payments (SPEI, cash, WhatsApp arrangements). How foolproof is the mechanism for a seller to confirm "payment received"? Look for potential error states where a seller might accidentally ship an item before verifying funds due to ambiguous UI labeling.
- Retention Tools (Promotions & Referrals Hub): Audit the active coupon/promotion manager (Sprint 1 implementation) and the referral credit UI. How easily can a seller spin up a discount code, monitor its usage statistics, and track platform-owned referral rewards without getting lost in deep nesting?

Your Deliverable:
Provide a top-shelf UX audit report identifying structural friction points, critical cognitive load bottlenecks, and dead-ends in the merchant journey. Conclude with a strategic, prioritized recommendation list of UX improvements before we move into UI design or implementation.