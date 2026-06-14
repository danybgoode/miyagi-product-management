---
status: shipped
slug: sweepstakes
---

# Epic · Sweepstakes

> **✅ EPIC COMPLETE — all 3 sprints shipped to prod 2026-06-04** (both repos; see
> [RETROSPECTIVE.md](RETROSPECTIVE.md) and Implementation refs below). Builds the tenant-run giveaway loop:
> create a compliant campaign, share a focused public entry page, verify entries,
> award purchase bonus tickets, draw a winner automatically, and notify participants.
> **Live giveaway smoke owed to Daniel** (create→verify→purchase-bonus→draw→notify on a real campaign).

**For tenants who want a viral growth loop.** A tenant creates a campaign with a
prize, dates, entry mechanics, legal/permit details, and bilingual public copy.
Supporters enter from a share link without creating a marketplace account.

## Compliance posture

Sweepstakes in Mexico are SEGOB-regulated. Miyagi does not create legal terms or
claim a campaign is compliant on behalf of a tenant. Before a campaign can go
public, the tenant must provide organizer details, permit/reference information,
Spanish and English terms, Spanish and English campaign copy, and an explicit
self-attestation that they are responsible for compliance, prize fulfillment,
tax/legal claims, and participant communications.

The platform also keeps a global kill-switch so Miyagi can suspend sweepstakes
if legal, abuse, or operational risk appears.

## What a tenant gets

- A guided campaign setup page in **Mi tienda → Sorteos**.
- Prize image, title, description, start/end dates, free-entry tickets, and an
  optional purchase bonus.
- A public URL (`/g/[slug]`) and downloadable QR code immediately after save.
- A winner dashboard after the draw, showing masked contact details and the draw
  audit.
- An optional consolation broadcast to non-winners with a seller coupon code.

## What a supporter gets

- A mobile-first public page with prize, countdown, terms, and share actions.
- Email-code verification without creating a full marketplace account.
- A success state showing total tickets and links to share or shop for more
  chances when the tenant enabled purchase incentives.

## Out of scope (v1)

- SMS/phone verification.
- Root-level short links outside `/g/[slug]`.
- Platform-authored legal boilerplate for tenants.
- Post-draw ticket clawback after a later refund.
- New checkout, payment, or coupon redemption behavior.

## Sprints

- [sprint-1.md](sprint-1.md) — tenant campaign setup, legal gate, share URL, QR.
- [sprint-2.md](sprint-2.md) — public verified entry and purchase bonus tickets.
- [sprint-3.md](sprint-3.md) — automated draw, winner dashboard, notifications,
  consolation broadcast.

## Implementation refs

- `652d2bf` — campaign setup, legal gate, seller/public pages, Supabase schema.
- `881d287` — purchase-bonus hooks in Stripe, MercadoPago, reconciliation, direct payment.
- `d477356` — draw endpoint and first idempotency smoke.
- `e07349b` — legal-gate and kill-switch smoke assertions.
- `bb02f93` — remove one-minute Vercel cron and accept backend internal auth.
- Backend `50e3af8` — Medusa scheduled job triggers the draw from GCP Cloud Run.
