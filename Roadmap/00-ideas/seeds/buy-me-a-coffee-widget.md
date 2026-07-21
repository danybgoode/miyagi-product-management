---
title: "Buy-me-a-coffee tip widget"
slug: buy-me-a-coffee-widget
status: archived
area: "08"
type: feature
priority: null
risk: low
epic: null
build_order: null
updated: 2026-07-20
---

# Reconciliation — superseded by the shipped Support Widget epic

> **Archived 2026-07-20 as a duplicate, not dropped work.** The requested capability shipped through
> [`07-agentic-and-federated-commerce/support-widget`](../../07-agentic-and-federated-commerce/support-widget/README.md)
> (frontend PR #25, backend PR #7; later polish PRs #29/#8/#32). Sellers now manage it at
> `/shop/manage/settings/apoyo`; `public/embed.js` serves the external launcher/lightbox, and
> `/api/embed/support{,/checkout}` provides guest-first Stripe Connect / Mercado Pago handoff with presets,
> custom amount, optional name/message/privacy and the hidden Medusa support product. The product poster and
> retrospective already carry the remaining live-money confirmation, so this raw duplicate must not stay in
> the active funnel.

## Context

Marketplace tenants (creators, independent curators, and small merchants) often engage with their audiences outside of the core marketplace site (e.g., blogs, portfolios, personal sites). While they sell products, they also need a lightweight, frictionless way to capture casual financial support, tips, or micro-donations directly within those external environments.

Since **Stripe Connect** and **Mercado Pago** are already integrated at the tenant level, the infrastructure for processing multi-currency and regional localized payments (like Pix, OXXO, or credit cards) is ready. This feature focuses heavily on the **end-user (supporter) checkout experience**: maximizing conversion by minimizing steps, eliminating mandatory account creation, and embedding the entire experience seamlessly into a single, compact UI component. Please do always review that the above assumptions are true, always validate.

Review the documentation in the embeddable-widget folder as this feature adds, supplements it. Always ensure a sound UX/UI, reusing existing components or improving currently available features. Always apply heuristics. This feature should be very similar to buy me a coffee, thats our standard.

## User Story

As a supporter of a marketplace tenant,
I want to send a quick tip or financial contribution through an embedded widget on the web,
So that I can support my favorite creator instantly without setting up a marketplace account, entering a long checkout funnel, or losing my current browsing context.

## Acceptance Criteria

### 1. Embedded UI & Supporter Interaction

- **Lightweight Rendering:** The widget must be optimized to load instantly as an `iframe` or dynamic script tag on external sites without degrading the host site's performance.
- **Context Preservation:** Clicking the support action within the embedded widget must open a modal overlay (lightbox style) *on top* of the current webpage rather than redirecting the supporter away from the host site.
- **Tiered & Custom Inputs:** The supporter must be presented with clear, tap-friendly options as, if configured by tenant:
    - Three tenant-configured preset amounts (e.g., $3, $5, $10 USD / MXN equivalents).
    - A "Custom Amount" input field that validates against currency-specific minimum transaction limits.

### 2. Frictionless End-User Checkout

- **Guest-First Checkout:** Supporters must **not** be forced to register or log into the marketplace to complete a payment. Stripe transparent flow should be good, validate it.
- **Localized Gateway Routing:** The widget must automatically detect the supporter's locale/currency or inherit the tenant's primary setup to route the transaction cleanly:
    - **Stripe Connect:** Render Apple Pay, Google Pay, or Link for 1-click tokenized checkout.
    - **Mercado Pago:** Render fast local card inputs or instant alternative payment options (like regional cash/bank transfers if applicable for micro-transactions).
- **The "Message" Add-on:** Supporter can optionally attach a short message (max 250 characters) and toggle a checkbox to make their name/amount "Public" or "Private" to the tenant's public feed.

### 3. Success State & Feedback Loop

- **Delightful Completion:** Upon successful payment validation, the modal must display an instant confirmation view with a visual celebration state (e.g., a subtle confetti burst) without throwing a jarring page reload.
- **Asynchronous Webhooks:** The widget must close gracefully after 3 seconds, or allow the user to close it manually, returning them exactly to where they were reading on the host site.
- **Notification Flow:** The supporter must receive a clean, transaction-branded email receipt detailing their contribution.

## Sources and References

- **Industry UX Benchmarks:** Buy Me a Coffee embeddable buttons/widgets, Ko-fi widget overlay architecture, and GitHub Sponsors inline funding flows.
- **Technical Frameworks:** Stripe Payment Element (for cross-browser tokenized wallet detection) and Mercado Pago Transparent Checkout SDK (for inline frame styling control).

### Technical Tip for Implementation

Since you already have the Stripe Connect and Mercado Pago accounts mapped to the tenants, the fastest path to an elite end-user UX is building this as a **Web Component** or an optimized **iframe** endpoint (e.g., `miyagisanchez.com/embed/shoppath/widget`). This allows you to serve a clean, single-page app checkout flow that is secure, isolated from host-site CSS pollution, and perfectly responsive on mobile screens.
