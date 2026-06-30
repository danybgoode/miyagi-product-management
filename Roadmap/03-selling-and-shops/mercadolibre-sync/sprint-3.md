# Mercado Libre sync — Sprint 3: Publish Miyagi → ML

**Status:** ✅ MERGED (2026-06-30) — backend
[#46](https://github.com/danybgoode/medusa-bonsai-backend/pull/46) (squash `bbf75a2`, Cloud Run deploy
running) + frontend [#144](https://github.com/danybgoode/miyagisanchezcommerce/pull/144) (squash
`e9b7420`, Vercel prod). Both CI gates green (BE type-check+build+unit; FE type-check+build +
Playwright-vs-preview); cross-review (Codex) applied on both. Reuses despacho `publishItem` (ported),
adds the update/relist/close verbs + the `domain_discovery` category predictor the reference lacked. Ships
**dark** behind a new `ml.publish_enabled` enablement flag (default OFF — created in Flagsmith, feature id
**220945**). **Risk tier: MED** (external write to ML; no money/inventory/migration). **Owed to Daniel:**
the live ML-sandbox publish+edit+close smoke (steps below) + the `ml.publish_enabled` flip once the backend
revision is live.

| Story | Status | Commit |
|---|---|---|
| US-7 — Publish a Miyagi product → ML (create) + persist linkage | ✅ | be `bbf75a2` · fe `e9b7420` |
| US-8 — Update / relist / close parity (Miyagi edits propagate) | ✅ | be `bbf75a2` · fe `e9b7420` |
| US-9 — ML category predictor + manual override | ✅ | be `bbf75a2` · fe `e9b7420` |
| api spec (`e2e/ml-publish.spec.ts`) | ✅ | fe `e9b7420` |

> Goal: a seller pushes a Miyagi product out to ML and keeps the ML item in step with Miyagi edits. The
> linkage from Sprint 1 is the join; the category predictor makes publish reliable.

> **Architecture note (decided in plan mode with Daniel):** US-8 propagation fires via an **explicit
> "Sincronizar con Mercado Libre" action** on the linked product — **not** a `product.updated` subscriber.
> It drives a single reusable backend reconcile seam (`publishOrSyncProduct` → create/update/close/relist
> from the product's live state via `decidePublishAction`); archiving (pause/delete) fires a best-effort
> close via the linkage. The seam is built so **Sprint 4's inventory subscriber calls the same outbound
> path**. ML publish state (status, permalink, category) rides the existing `product_ml_link.metadata`
> json → **no new migration**. The backend never guesses a category on a live write (create without a
> resolved category → 422); the FE surfaces the predictor's override + low-confidence choice (US-9).

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
**Prerequisite (owed to Daniel):** backend #46 deployed (the `POST /internal/ml/publish` +
`GET /internal/ml/predict` routes are live), then flip the **`ml.publish_enabled`** flag **ON** in
Flagsmith. Until then the "Mercado Libre" card on the listing edit page is hidden and the publish/predict
routes 404 by design (dark-ship). Requires a seller already connected to ML (Sprint 1 smoke) with at
least one **product** listing.

1. As a connected seller, open a Miyagi product (Mi tienda → Editar anuncio) → the **Mercado Libre** card →
   "Publicar en Mercado Libre".
   → A predicted ML category shows with an override option; confirm and publish.
2. → An ML item is created; the product shows the ML permalink + status; the linkage exists.
3. Edit the product's price + title in Miyagi and sync.
   → The linked ML item reflects the new price + title.
4. Archive the product in Miyagi.
   → The ML item is closed.
5. Try publishing the same product again.
   → It's recognized as already linked and **not** re-created.

If any step fails, note the step number + what you saw — that's the bug report.
