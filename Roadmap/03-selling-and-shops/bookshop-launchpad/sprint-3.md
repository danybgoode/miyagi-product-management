# Bookshop launchpad — Sprint 3: Voting campaigns + the 50% unlock

**Status:** ⬜ not started

> ⚠️ **Plan-mode gates:** (1) confirm the legal framing — a vote **threshold** unlocking a discount
> is not a chance-based SEGOB sweepstake, but adopt the sweepstakes gate's conservative posture and
> record the reasoning; (2) the reward coupon MUST be **product-scoped** to the linked CPP print
> listing — never shop-wide; (3) CPP S2/S3 merged first (the print product needs variants + upload).

## Stories

### Story 3.1 — Campaign builder
**As a** bookshop, **I want** to create a campaign: pick published works, set a vote threshold, end date, and the reward (coupon % + the linked CPP print product), **so that** launches are self-serve.
**Acceptance:** validation (threshold > 0, end date future, linked product exists + is CPP-configured); campaign states draft → active → closed(met/unmet); admin kill-switch (sweepstakes precedent); MCP read parity.
**Risk:** MED

### Story 3.2 — Public campaign page
**As a** reader, **I want** `/v/[slug]` (+ QR): the candidate works with excerpts, one **email-verified vote per email per work**, live progress toward the threshold, **so that** rallying votes is shareable and legible.
**Acceptance:** email-code verification (sweepstakes spine) + per-IP rate limits; live progress honest (no inflated counts); white-label on all channels; og/social card for sharing; behind the campaign gate.
**Risk:** HIGH (public verified-action surface)

### Story 3.3 — Threshold + close automation
**As a** voter, **I want** the promised unlock to actually happen — threshold met → the product-scoped 50% coupon auto-mints and lands in my inbox (+ writer + seller notified); threshold unmet at end date → an honest "no se alcanzó" close (optional consolation coupon), **so that** the campaign's promise is mechanical, not manual.
**Acceptance:** automation idempotent on re-fire (webhook/cron replay-safe — events-quantity precedent); coupon scoped + expiry-dated; all notifications es-MX; redemption works on the CPP print product's checkout (money path).
**Risk:** HIGH (automation + notifications)

## Sprint QA
- **api spec(s):** vote-dedup deriver · campaign state machine · threshold→mint automation (idempotency) · coupon-scope assertion spec
- **browser smoke owed:** yes, to Daniel — full loop on a real device: vote from two emails → hit threshold → coupon email → **redeem at checkout on the print product** (money path)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As the bookshop, create a campaign: 2 works, threshold 3, reward 50% on the linked print listing; activate.
   → Campaign live at https://miyagisanchez.com/v/<slug> with a QR.
2. In private windows, vote for work A from three different emails (code-verified each time).
   → Progress bar climbs 1/3 → 3/3; a 4th vote from a used email is refused politely.
3. On threshold hit.
   → Voters receive the coupon email (product-scoped, expiry stated); writer + seller notified.
4. (money path) Redeem the coupon at checkout on the print product (choose size/binding, upload the manuscript, qty 25).
   → 50% applies to that product only; pay-button total equals the summary; a different product does NOT accept the coupon.
5. Let a second campaign expire below threshold.
   → Honest "no se alcanzó" close; no coupon minted; participants notified.

If any step fails, note the step number + what you saw — that's the bug report.
