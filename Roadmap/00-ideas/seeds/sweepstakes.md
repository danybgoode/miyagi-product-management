---
title: "Sweepstakes"
slug: sweepstakes
status: in-progress
area: "08"
type: feature
priority: null
risk: low
epic: "08-growth-and-promotions/sweepstakes"
build_order: null
updated: 2026-06-08
---

Gamifying the marketplace with sweepstakes is a massive lever for tenant growth. It drives viral top-of-funnel traffic, accelerates email list building, and incentivizes immediate purchases.

## Feature Evaluation & UX Heuristics

- **The Trust Heuristic:** Sweepstakes inherently trigger skepticism in users ("Is this a scam?"). The UX must aggressively signal legitimacy through clear countdown timers, verifiable automated drawings, and transparent terms of entry.
- **The Zero-Friction Entry:** We must apply the same frictionless logic used in the "Buy me a coffee" widget. If a user has to create a full marketplace account to enter a tenant's giveaway, conversion will plummet. A guest-first, email-or-phone capture is mandatory.
- **The Virality Bridge:** . A tenant should be able to blast miyagisanchez.com/sneaker-draw on their social channels, dropping users directly into an isolated, high-converting entry widget.

I have sliced this into three distinct functional stories.

## User Story 1: Campaign Creation & Mechanic Configuration (Tenant Actor)

*Focus: The admin dashboard experience where the tenant defines the rules of the game.*

**Context**
Tenants need a guided, foolproof interface to launch a sweepstakes campaign. They shouldn't have to worry about legal boilerplate or complex probability math. The platform needs to abstract the campaign setup into simple, modular choices: what the prize is, how long it runs, and what actions grant the user a "ticket."

**User story**
As a marketplace tenant,
I want to configure a sweepstakes campaign by defining the prize, duration, and entry mechanics,
So that I can easily launch a promotional event to capture leads and drive store engagement.

**Acceptance criteria**

- **Campaign Definition:** The UI must provide input fields for the Campaign Title, Prize Description, and an upload zone for the Prize Image.
- **Duration Controls:** The tenant must be able to select a strict Start Date/Time and End Date/Time. Once the End Date is reached, the campaign status must automatically lock to "Completed."
- **Entry Multipliers:** The tenant must be able to toggle and assign ticket values to specific user actions. Examples include:
    - "Free Entry" (e.g., Provide email = 1 ticket).
    - "Purchase Incentive" (e.g., Buy any item from the shop = 5 tickets).
- **Link Generation:** Upon saving the campaign, the UI must immediately generate and display a dedicated short URL and a downloadable QR code for the tenant to share.

## User Story 2: Frictionless Public Entry Experience (End-User Actor)

*Focus: The public-facing landing page/widget optimized entirely for conversion and trust.*

**Context**
When a supporter clicks a tenant's sweepstakes link, they must land on a highly focused, mobile-optimized view. The UX must clearly communicate the value (the prize), the urgency (the timer), and make the actual act of entering feel instantaneous and rewarding.

**User story**
As a supporter of a tenant,
I want to easily enter the sweepstakes through a clear, mobile-optimized landing view without being forced to create a full marketplace account,
So that I can participate quickly and securely from any social media link.

**Acceptance criteria**

- **Focused Presentation:** The public view must prominently display the Prize Image, the Campaign Title, and a live, ticking countdown timer showing the time remaining until the draw.
- **Guest-First Data Capture:** The entry form must only require a Name and a verified contact method (Email or Phone number) to claim a base entry ticket.
- **Clear Value Exchange:** If the tenant configured "Purchase Incentives," the UI must clearly display this upsell directly below the free entry form (e.g., "Want 5 more chances to win? Shop the new collection.").
- **Delightful Confirmation:** Upon successful entry, the UI must transition to a success state with a visual celebration, displaying the user's total "Ticket Count" and providing native share buttons for WhatsApp, Instagram, and X to drive viral loops.

## User Story 3: Automated Resolution & Winner Notification (System/Tenant Actor)

*Focus: The verifiable, automated conclusion of the sweepstakes that protects the tenant from bias accusations.*

**Context**
Drawing a winner manually introduces human error and potential bias. The platform must handle the selection programmatically to ensure absolute fairness. Furthermore, the conclusion of a sweepstakes is a massive marketing opportunity to offer a "consolation prize" (like a discount code) to all the users who entered but didn't win.

**User story**
As a marketplace tenant,
I want the system to automatically and randomly select a winner when the timer expires and notify the participants,
So that the draw is verifiably fair and I can capitalize on the captured leads.

**Acceptance criteria**

- **Automated Draw:** Exactly when the campaign timer expires, the system must freeze all new entries and programmatically select a winning ticket at random from the total pool of validated entries.
- **Winner Dashboard:** The tenant’s dashboard must update to show the winning ticket, displaying the winner's masked contact information (e.g., `j***@gmail.com`) for the tenant to initiate prize fulfillment.
- **Winner Notification:** The system must automatically dispatch a celebratory email to the winning user, instructing them on how to claim their prize.
- **Consolation Broadcast (Optional Upsell):** The tenant dashboard must provide a one-click action to broadcast a customized message to all non-winning entries, allowing the tenant to easily attach a discount code (e.g., "You didn't win this time, but here is 15% off your next order!").