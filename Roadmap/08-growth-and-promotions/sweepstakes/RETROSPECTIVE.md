# Sweepstakes — Retrospective

_Closed: 2026-06-04_

**Area:** 08 · Growth & Promotions · **Risk:** low · 3 sprints. Touches **both repos** (frontend giveaway
loop + backend scheduled draw). Shipped to prod 2026-06-04. **Frontend:** `652d2bf` (campaign setup, legal
gate, seller/public pages, Supabase schema) · `881d287` (purchase-bonus tickets in Stripe/MercadoPago/
reconciliation) · `d477356` (draw endpoint + idempotency smoke) · `e07349b` (legal-gate + kill-switch
smoke) · `bb02f93` (move draw scheduling off the Vercel cron). **Backend:** `50e3af8` (Medusa scheduled
job triggers the draw from GCP Cloud Run).

## What shipped
The tenant-run giveaway loop: a tenant creates a compliant campaign, shares a focused public entry page,
verifies entries, awards purchase-bonus tickets, draws a winner automatically, and notifies participants —
all without supporters creating a marketplace account.

- **S1 — campaign setup + legal gate + share URL/QR** (`652d2bf`). Guided setup in **Mi tienda → Sorteos**
  (prize, dates, free tickets, optional purchase bonus); the **compliance gate** requires organizer details,
  permit/reference info, es+en terms, es+en copy, and an explicit self-attestation before a campaign can go
  public. Public `/g/[slug]` page + downloadable QR on save. Supabase schema (`20260605000000_sweepstakes.sql`).
- **S2 — verified entry + purchase-bonus tickets** (`881d287`, `e07349b`). Email-code verification (no full
  account); purchase-bonus hooks wired into the Stripe + MercadoPago + reconciliation + direct-payment paths.
- **S3 — automated draw + winner dashboard + notifications + consolation** (`d477356`, `bb02f93`, backend
  `50e3af8`). Campaigns close and draw one winning ticket fairly and idempotently; a winner dashboard shows
  masked contacts + draw audit; optional consolation broadcast to non-winners with a seller coupon.

## What went well
- **The platform never authors legal risk.** Mexico's sweepstakes are SEGOB-regulated, so the gate makes the
  *tenant* supply organizer/permit details, bilingual terms, and a self-attestation — Miyagi provides the
  mechanic, not the legal claim. A **global kill-switch** lets Miyagi suspend all sweepstakes if legal/abuse/
  operational risk appears (same fail-safe posture as the Flagsmith kill-switches).
- **Bilingual where it actually renders.** The public flow (`/g/[slug]`, `?lang=en`, per-campaign `*_es/*_en`)
  joined the **bilingual allow-list** deliberately — es-MX canonical + en for a shareable, global-audience page.
- **The authoritative draw lives in the backend, not a Vercel cron.** S3's last fix (`bb02f93` + backend
  `50e3af8`) moved draw scheduling off a one-minute Vercel cron onto a **Medusa scheduled job on Cloud Run**
  with internal auth — one trustworthy trigger, idempotent, not a public hot path.

## What we learned
- **An authoritative, money-adjacent scheduled action (a fair draw) belongs in the backend scheduled job
  with internal auth + idempotency — not a Vercel cron.** A public/edge cron is the wrong trust boundary for
  "pick the winner once"; the Medusa Cloud Run job + an idempotency guard makes a repeated trigger a no-op.
  → promoted to `LEARNINGS.md`.
- **A compliance-gated public surface should make the tenant supply every legal artifact + self-attest, with
  a platform kill-switch** — the platform owns the mechanic and the off-switch, never the legal claim.

## Gaps / follow-ups
- **Live/preview giveaway smoke owed to Daniel:** end-to-end create→verify→purchase-bonus→draw→notify on a
  real campaign (money + email-code + the scheduled draw) wasn't fully exercised on preview at close — the
  api/idempotency/legal-gate/kill-switch specs cover the deterministic parts; the live walkthrough is owed.
- **Out of scope (v1), as designed:** SMS/phone verification, root-level short links outside `/g/[slug]`,
  platform-authored legal boilerplate, post-draw clawback after a later refund, new checkout/coupon behavior.
