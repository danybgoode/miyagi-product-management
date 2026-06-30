# Mercado Libre sync — Sprint 3: Publish Miyagi → ML

**Status:** 🟦 READY — not started. Reuses despacho `publishItem`; adds update parity + category predictor.

| Story | Status | Commit |
|---|---|---|
| US-7 — Publish a Miyagi product → ML (create) + persist linkage | ⬜ | |
| US-8 — Update / relist / close parity (Miyagi edits propagate) | ⬜ | |
| US-9 — ML category predictor + manual override | ⬜ | |
| api spec (`e2e/ml-publish.spec.ts`) | ⬜ | |

> Goal: a seller pushes a Miyagi product out to ML and keeps the ML item in step with Miyagi edits. The
> linkage from Sprint 1 is the join; the category predictor makes publish reliable.

## Stories

### US-7 — Publish a Miyagi product → ML (create)
**As a** seller, **I want** to publish a Miyagi product to Mercado Libre, **so that** I reach ML buyers
without re-keying. Reuse `publishItem` (build the `MlItemPayload` from the Medusa product), then **persist
the linkage** (Sprint 1) so the item can later be updated/synced.
**Acceptance:** publishing a Miyagi product creates an ML item and stores the linkage; the seller sees the
ML permalink + status; a product already linked is not re-created.
**Risk:** med

### US-8 — Update / relist / close parity
**As a** seller, **I want** my Miyagi edits (title, price, images, status) to propagate to the linked ML
item, **so that** the two never drift. Add update/relist/close calls keyed off the linkage (a Medusa
product subscriber or an explicit "sync to ML" action — define which in plan mode). Closing/archiving in
Miyagi closes the ML item.
**Acceptance:** editing a linked product updates the ML item; archiving closes the ML item; relist works
on a previously closed item.
**Risk:** med

### US-9 — ML category predictor + manual override
**As a** seller, **I want** publish to pick a valid ML category automatically, **so that** it doesn't fail
ML validation; **and** I can override it. Integrate the ML category-predictor API to suggest a
`category_id` from the product title/attributes, with a manual override + a safe default when prediction
is low-confidence.
**Acceptance:** publishing predicts a valid category; the seller can override before publish; a low-
confidence prediction surfaces a choice rather than silently guessing.
**Risk:** med

## Sprint QA
- **api spec(s):** `e2e/ml-publish.spec.ts` (api) — publish creates + links + is not-recreated when already
  linked (US-7); update/close/relist propagate via the linkage (US-8); predictor returns a category +
  override path + low-confidence handling (US-9). Mock the ML API.
- **browser smoke owed:** to Daniel — publish one real product to the ML **sandbox**, edit it, confirm the
  ML item updates; close it, confirm the ML item closes.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge) · ML **sandbox**

1. As a connected seller, open a Miyagi product → "Publicar en Mercado Libre".
   → A predicted ML category shows with an override option; confirm and publish.
2. → An ML item is created; the product shows the ML permalink + status; the linkage exists.
3. Edit the product's price + title in Miyagi and sync.
   → The linked ML item reflects the new price + title.
4. Archive the product in Miyagi.
   → The ML item is closed.
5. Try publishing the same product again.
   → It's recognized as already linked and **not** re-created.

If any step fails, note the step number + what you saw — that's the bug report.
