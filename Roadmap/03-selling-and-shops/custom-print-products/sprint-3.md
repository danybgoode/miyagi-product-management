# Custom print products — Sprint 3: Artwork upload + the configurator buy box

**Status:** ⬜ not started

## Stories

### Story 3.1 — New `file` CustomFieldType
**As a** seller, **I want** an "Arte / archivo" custom field on a listing (required flag, format allowlist PNG/JPG/PDF/AI/SVG, max size), **so that** buyers must attach their artwork to order.
**Acceptance:** extends `lib/personalization.ts` (`CustomFieldDef`) — no new tables; config UI sits with the existing custom-fields editor; a listing with a required file field can't be added to cart without one.
**Risk:** LOW

### Story 3.2 — Buyer artwork upload, echoed end-to-end
**As a** buyer (including guest), **I want** to upload my artwork in the buy box and see it at every step, **so that** I trust the shop prints what I sent (radical-transparency heuristic from the personalization epic).
**Acceptance:** upload lands in R2 via a rate-limited, validated route (size cap, format sniffing — mirror the `POST /api/supply/upload` no-Clerk precedent + `lib/ratelimit.ts`); a thumbnail echoes in cart → checkout → order confirmation → both emails; the seller downloads the **original** from the order screen; payload rides `line_item.metadata.personalization` like every other field.
**Risk:** HIGH (guest upload surface / shared R2 infra)

### Story 3.3 — Low-res preflight warning
**As a** buyer, **I want** a warning when my image is too low-res for the chosen physical size, **so that** I'm not surprised by a blurry print.
**Acceptance:** pure `lib/` validator (pixels vs cm at ~300 PPI, driven by the selected size variant); warns, never blocks; es-MX copy; unit-tested.
**Risk:** LOW

### Story 3.4 — The configurator buy box
**As a** buyer, **I want** one coherent flow — options → upload → live price grid → total, **so that** ordering feels StickerJunkie-grade on mobile.
**Acceptance:** renders only when the product has options/tiers/file field (single-variant listings keep today's PDP — graceful degrade); behind the `configurator.enabled` kill-switch (fail-safe: today's PDP); price grid highlights the active tier as quantity changes; es-MX; no overflow at 360/390/414px.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 3.1 → field-validation spec on `lib/personalization` seam; 3.3 → `e2e/api/artwork-preflight.spec.ts`; 3.2 → upload-route contract spec (rejects oversize/bad-format)
- **browser smoke owed:** yes, to Daniel — **money path with a real file**: guest upload → configure → pay test card → artwork visible on order + in both emails; seller downloads the original
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, edit the die-cut sticker listing → custom fields → add "Arte" (tipo archivo, requerido).
   → Field saves and shows the allowlist + size cap.
2. Open the listing in a private window (guest). Try to add to cart without a file.
   → Blocked with a clear es-MX nudge on the file field.
3. Upload a small 400×400px PNG with size 10cm selected.
   → Preflight warning appears (low-res for 10cm) but doesn't block; thumbnail renders in the buy box.
4. (money path) Add to cart → thumbnail + chosen options echo in cart and checkout → pay with Stripe test card 4242…
   → Confirmation page + buyer email show the thumbnail; the order in `/shop/manage/orders` shows it with a "Descargar original" link that downloads the exact uploaded file.
5. Kill-switch drill: flip `configurator.enabled` off (or confirm polarity on preview).
   → The listing falls back to today's PDP; no dead buy box.

If any step fails, note the step number + what you saw — that's the bug report.
