# Tiendas Fundadoras acquisition — Sprint 1: Campaign surface

**Status:** ⬜ not started

## Stories

### Story 1.1 — Focused founding-shop campaign page

**As a** local merchant, **I want** a clear invitation in plain Spanish, **so that** I can decide whether a
hands-on Miyagi setup and private preview is relevant to my business.

**Acceptance:** `/vende/fundadoras` uses the existing landing renderer; the leading promise, 25-shop capacity,
process, requirements, proof, boundaries and one application CTA are clear; no unverified traction, free-service
or publication-without-consent claim appears; mobile and reduced-motion behavior match the design system.

**Risk:** low — additive public content and existing renderer.

### Story 1.2 — Editable content, metadata and agent parity

**As an** admin, **I want** campaign copy and discoverability managed through existing content primitives, **so
that** launch changes do not require rebuilding a page.

**Acceptance:** copy, FAQs, cohort state, title, description and social image use a namespaced editable config;
safe defaults render if optional keys are absent; agent/admin reads return the same published content; canonical,
OG and structured metadata describe the actual offer.

**Risk:** low — existing CMS/content contract.

### Story 1.3 — Capacity-aware closed state and dark-launch flag

**As an** operator, **I want** the campaign safely closed before launch and when capacity is reached, **so that**
Miyagi never promises onboarding it cannot deliver.

**Acceptance:** `growth.founding_merchants_enabled` exists disabled; OFF returns the configured unavailable state;
open/full/waitlist messaging is explicit; cohort count is read from canonical applications, not a client counter;
direct writes are refused when closed/full.

**Risk:** high — public availability and server-enforced capacity; Daniel merges.

## Sprint QA

- **api specs:** page config/defaults, flag OFF/ON, open/full/waitlist capacity and direct-write refusal.
- **browser smoke owed:** no for public rendering; Daniel owns the final flag flip.
- **deterministic gate:** typecheck/build + page and metadata specs + mobile visual smoke green.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. With the flag OFF, open https://miyagisanchez.com/vende/fundadoras.
   → The campaign is safely unavailable/closed and no application can be submitted.
2. Enable the flag in a preview or controlled production window and reopen the page on a phone.
   → One focused promise, the 25-shop constraint and one CTA are immediately clear.
3. Edit one namespaced content key through the existing admin/content surface.
   → The page and agent-readable content agree after refresh.
4. Set capacity to full and reload the route.
   → The application CTA is replaced by the configured full/waitlist state.
5. Inspect canonical, social and structured metadata.
   → Every description matches the actual founding-shop offer.

If any step fails, note the step number + URL — that's the bug report.
