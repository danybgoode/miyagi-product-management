---
title: "Sweepstakes epic plan (superseded by sweepstakes seed)"
slug: sweepstakes-epic-plan
status: archived
area: "08"
type: feature
priority: null
risk: low
epic: null
build_order: null
updated: 2026-06-08
---

# Sweepstakes Epic Plan

## Summary
- Plan this as `08 · Growth & Promotions → Sweepstakes`, on branch `feat/sweepstakes`.
- Before code, scaffold `Roadmap/08-growth-and-promotions/sweepstakes/README.md` plus `sprint-1.md` through `sprint-3.md`, matching `Roadmap/WAYS-OF-WORKING.md`.
- Build three shippable sprints: tenant campaign setup, public verified entry, automated draw + notifications.
- Defaults chosen: permit/terms fields required before publish, email-code verification for v1, one-minute idempotent Vercel cron for draws.

## Key Changes
- Add Supabase non-commerce tables for campaigns, email verification attempts, entries, tickets, draw audit, and broadcast audit.
- Campaigns are tenant-scoped through the Supabase shop mirror and store the Medusa seller id for purchase matching.
- Public short URL is `/g/[slug]`; root-level aliases like `/sneaker-draw` are out of scope to avoid route collisions.
- Add seller UI at `/shop/manage/sweepstakes` for create/list/detail, prize image upload, mechanic toggles, publish guardrails, generated URL, and QR download.
- Add public mobile-first entry page at `/g/[slug]` with prize, countdown, email-code entry, ticket count success state, and share actions.
- Add `GET /api/cron/sweepstakes-draw`, protected by `CRON_SECRET`, scheduled every minute. Public entry routes reject late entries immediately based on `ends_at`, even before cron finalizes the draw.
- Add purchase-bonus helper called from paid-order paths: Stripe webhook, MercadoPago webhook, checkout reconciliation, and direct-payment confirmation. It awards bonus tickets only when the buyer’s verified entry email matches an order from the same shop during the campaign window.
- Add Resend templates for verification code, winner notification, and optional consolation broadcast. Reuse seller coupon creation/listing for consolation discount codes.

## Interfaces
- Seller APIs: `GET/POST /api/sell/sweepstakes`, `GET/PATCH /api/sell/sweepstakes/[id]`, `POST /api/sell/sweepstakes/[id]/publish`, `POST /api/sell/sweepstakes/[id]/consolation`.
- Public APIs: `POST /api/sweepstakes/[slug]/verification` sends an email code; `POST /api/sweepstakes/[slug]/entries` verifies code, creates or returns the entrant, and returns ticket count.
- Campaign statuses: `draft`, `scheduled`, `active`, `completed`, `cancelled`.
- Ticket sources: `free_entry`, `purchase_bonus`. Draw stores winning ticket id, masked winner contact, locked ticket count, ordered pool hash, random nonce/value, and algorithm version.

## Sprints
- Sprint 1: Tenant campaign creation and sharing
  - Create campaign title, prize description, prize image, start/end time, free-entry tickets, purchase-bonus toggle/ticket value.
  - Require publish metadata: organizer, permit/reference number, legal terms, and self-attestation timestamp.
  - Generate `/g/[slug]` and QR immediately after save.
- Sprint 2: Public entry and purchase incentive
  - Show focused public campaign page with live countdown.
  - Require name + verified email code; no account creation.
  - Create one base entry per campaign/contact hash and show total tickets.
  - Surface purchase upsell when enabled and award purchase tickets idempotently from completed orders.
- Sprint 3: Draw, winner dashboard, notifications
  - Freeze entries at `ends_at`, draw from validated non-void tickets, and mark completed.
  - Show winner to tenant with masked contact only.
  - Send winner claim email.
  - Provide one-click consolation broadcast to non-winners with optional seller coupon code.

## Test Plan
- Add one Playwright/API spec per sprint: seller auth boundaries, public entry validation/late-entry rejection, cron auth/no-op/draw idempotency.
- Manual preview smoke: create campaign from a test seller, publish with permit fields, verify QR/link, enter with email code, trigger purchase bonus with a test order, force cron draw, confirm masked winner and email sends.
- Gate before merge: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test:e2e`, then preview smoke with Vercel bypass token.

## Assumptions
- No files are modified during this planning turn.
- V1 verifies email only; SMS/phone verification is deferred until an SMS provider is chosen.
- Tenant/legal counsel supplies compliant terms and permit/reference data. Current official SEGOB guidance says sorteos require permission through the Dirección General de Juegos y Sorteos and asks for event details, mechanics, dates, prizes, and applicant data; SEGOB FAQ also notes 20 business days’ anticipation and exclusive SEGOB authority: [requirements](https://juegosysorteos.segob.gob.mx/es/Juegos_y_Sorteos/Requisitos_para_Sorteos), [FAQ](https://sitios.segob.gob.mx/es/Juegos_y_Sorteos/Preguntas_de_Sorteos).
- Purchase tickets tied to orders currently marked refunded before draw are excluded; no post-draw clawback in v1.
