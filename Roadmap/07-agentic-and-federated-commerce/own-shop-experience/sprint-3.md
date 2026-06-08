# Sprint 3 — Checkout return to the domain + communications

Goal (pragmatic scope): even though sign-in/payment use the platform's secure flow, the buyer **returns**
to the custom domain after purchasing, the channel stays tagged `custom_domain` end-to-end, and the
transactional emails reference the seller's domain instead of `miyagisanchez.com`.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **⏭️ DESCOPED (2026-06-05) — NOT built.**

On investigation, this sprint turned out bigger and riskier than the doc said: it requires **backend**
(propagate `channel`/origin through Medusa's new `start-checkout` flow — today the main flow's Stripe
session metadata does **not** carry `channel`; only the legacy routes do) and depends on the **auth/payment
hop to the platform** that doesn't exist yet (Clerk is platform-domain-only, satellite domains were
deferred → today checkout from a custom domain is not functional). Stories US-7/US-8 assume a working
checkout. Daniel's decision: **close the epic at S1+S2** and move this scope to a future epic with explicit
backend scope: `Roadmap/00-ideas/seeds/custom-domain-checkout.md`.

Risk: **HIGH** — adjacent to money/email + auth + backend. Daniel merges.

Main files:
- `app/payment/success/page.tsx` — return links resolve on the tenant host (US-7).
- `lib/channel.ts` — reuse the `custom_domain` detection (cookie/header) end-to-end (US-7).
- `lib/email.ts` — `SITE` based on channel/domain for copy and links (US-8).
- `e2e/own-shop-checkout-return.spec.ts` — **new** Playwright spec.

---

## US-7 — Checkout return continuity 📋 · Risk: HIGH
**As** a buyer who started on a custom domain, **I want** to return to that domain after paying, **so that**
I don't end up confused on another site.
- [ ] A purchase started on a custom domain returns the buyer to the domain (the success-page links, e.g.
      `app/payment/success/page.tsx`, resolve on the tenant host).
- [ ] The channel stays tagged `custom_domain` end-to-end (via `mi_channel`/header).

**Acceptance:** buying from `myshop.mx` and landing back on `myshop.mx` after success.

---

## US-8 — Emails reference the tenant domain 📋 · Risk: HIGH
**As** a buyer on a custom domain, **I want** the confirmation email to link to the shop on its domain, **so
that** I keep trusting the brand.
- [ ] When an order originates on the `custom_domain` channel, the copy and links of the order/confirmation
      emails use the shop's domain instead of the fixed `SITE` (`'https://miyagisanchez.com'`, `lib/email.ts`).

**Acceptance:** a custom-domain order's email links back to the tenant domain.

---

## Sprint smoke
- `tsc` + `build` + Playwright green.
- Daniel: a real test purchase from a real domain → return to the domain + email inspection.
