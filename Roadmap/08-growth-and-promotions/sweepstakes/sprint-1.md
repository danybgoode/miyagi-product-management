# Sprint 1 — Campaign Setup & Legal Gate

Goal: tenants can create a sweepstakes campaign, pass the compliance gate, and
share a public URL/QR without any purchase-bonus or draw automation yet.

Status: 🚧 implemented on branch (`652d2bf`), preview/manual QA pending.

Risk tier: **Medium** — tenant/public campaign surfaces and legal guardrails, no
money-path hooks.

---

## US-1 — Campaign draft creation ✅
**As a** tenant, **I want** to create a sweepstakes draft with prize and timing,
**so that** I can prepare a campaign before making it public.
- [x] Campaign title, prize description, prize image, start date/time, end date/time.
- [x] Free-entry tickets and optional purchase-bonus ticket value are configurable.
- [x] Tenant can save as draft without legal permit details.

## US-2 — Publish compliance gate ✅
**As the** platform, **I want** publication blocked until legal/compliance fields
are present, **so that** a tenant cannot accidentally run an unreviewed public
sweepstakes.
- [x] Publish requires organizer, permit/reference, ES+EN terms, ES+EN public copy,
      and tenant self-attestation.
- [x] Gate is enforced by API and database constraints/checks, not just the UI.
- [x] Platform kill-switch blocks publish when disabled.
- [x] Public/seller copy links to `/terminos` and states tenant responsibility.

## US-3 — Share URL and QR ✅
**As a** tenant, **I want** a dedicated link and QR code after saving, **so that**
I can share the campaign on social channels and print materials.
- [x] Campaign gets a stable `/g/[slug]` URL after save.
- [x] Tenant can copy the URL and download a QR code.
- [x] Public page shows a disabled/not-live state until the campaign is active.

## QA / smoke
- [x] API spec confirms unauthenticated seller APIs reject.
- [x] Secret-gated smoke confirms missing permit/terms/attestation cannot bypass DB gate.
- [x] Secret-gated smoke confirms kill-switch blocks server-side sweepstakes actions.
- [ ] Manual preview smoke: create draft, add legal fields, publish, copy URL, download QR.
