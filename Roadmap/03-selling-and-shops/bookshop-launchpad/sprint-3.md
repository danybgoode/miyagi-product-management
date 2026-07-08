# Bookshop launchpad — Sprint 3: Voting campaigns + the 50% unlock

**Status:** 🚧 built — draft PRs open, not merged (FE [#189](https://github.com/danybgoode/miyagisanchezcommerce/pull/189), BE [#68](https://github.com/danybgoode/medusa-bonsai-backend/pull/68)). Behind `launchpad.enabled` (OFF). Owed: BE merge+deploy first (Daniel), then FE merge; Daniel's real-device money smoke (below) + flag flip.
- Story 3.1 ✅ built (`ae9ad0d`) — campaign builder + state machine + activation gate + `list_launchpad_campaigns` MCP tool
- Story 3.2 ✅ built (`2c80142`) — public `/v/[slug]` + email-verified votes (one per email per work) + honest progress + QR
- Story 3.3 ✅ built (`ecd2801` FE + `601433b` BE) — threshold→mint automation + close cron + **product-scoped** coupon money path

**Plan-mode legal framing (recorded):** a vote **threshold** unlocking a **fixed, known** discount is **not** a chance-based prize → **not a SEGOB sweepstake** (no random draw, no chance element — every voter who helps hit the threshold gets the identical, known reward). We nonetheless adopt the sweepstakes spine's conservative posture: email-verified one-vote-per-work, honest live counts, explicit terms, a global kill-switch, and no inflated progress. The reward coupon is **product-scoped** to one CPP listing — never shop-wide (enforced at checkout by the backend `resolveCouponForCheckout`, `foreign_product` fail-closed).

**Decisions (confirmed with Daniel 2026-07-07):** campaign-wide total threshold (one vote per email per work) · reward % configurable, default 50 · no consolation coupon in v1.

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

**Preconditions:** BE #68 merged + **deployed** (Cloud Run revision live, ~12 min) → FE #189 merged → flip `launchpad.enabled` **ON** in `/admin/flags`. The bookshop must already have ≥2 **published launchpad works** (from S1) and ≥1 **CPP-configured print product** (custom-print listing with size/binding variants or quantity tiers).

1. As the bookshop, open **Vende → Convocatoria → Campañas de votación** (`/shop/manage/convocatoria/campanas`). Create a campaign: title + description, **2 works**, **umbral 3**, **50%**, future end date, and pick the print listing as **Producto de recompensa**; **Crear borrador**, then **Activar**.
   → If a field is missing (or the reward isn't a configurable print product) the activate button reports exactly what's missing. On success the campaign is live; its card links to `/v/<slug>` and a QR downloads from the campaign row.
2. In three private windows, open `https://miyagisanchez.com/v/<slug>`, pick **work A**, enter a different email each time → **Enviar código** → paste the emailed code → **Confirmar voto**.
   → Progress climbs 1/3 → 2/3 → 3/3 (honest server count). A 4th attempt from an **already-used email on the same work** is refused politely ("ya habías votado"). Each work shows its excerpt + a "Lee un adelanto" link.
3. On the 3rd vote (threshold hit).
   → The page shows "¡Se alcanzó la meta!". Voters receive the **coupon email** (code `VOTO-50-<slug>`, product-scoped, ~60-day expiry); writer(s) + the shop's `contact_email` get the "meta alcanzada" email. (If notifications lag, the daily cron `/api/cron/launchpad-campaigns` re-mints idempotently.)
4. **(money path)** Add the **print product** to a cart, choose size/binding, upload the manuscript, **qty 25**; at checkout enter the coupon code.
   → **50% applies to that product only**; the pay-button total equals the summary. Now try the SAME code on a **different** product → rejected ("solo aplica a un producto específico que no está en tu carrito").
5. Create a second campaign with a near-future end date and **let it expire below threshold** (or wait for the 06:00 cron).
   → Honest **"no se alcanzó"** close (`closed_unmet`); **no coupon minted**; participants + writer + seller notified.

If any step fails, note the step number + what you saw — that's the bug report.

**Gaps / notes for the smoke:**
- The money path (step 4) exercises the **backend** product-scope — confirm BE #68 is the **live** Cloud Run revision, not just a green build.
- Seller notification (step 3/5) uses `marketplace_shops.metadata.contact_email`; if a shop has none set, only voters + writers are emailed (the seller still sees the coupon code + status on the campaign card).
- Automated coverage is the deterministic gate only (pure state machine / gate / vote-dedup / close-decision + the product-scope unit tests + dark-launch HTTP contracts). The full vote→mint→redeem loop is **not** automated (it needs real email codes + a real money checkout) — this manual smoke is the owed proof.
