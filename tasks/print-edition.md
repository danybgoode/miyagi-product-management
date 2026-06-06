# Print Edition — "Sal en la edición impresa"

Area: Monetization / Print
Priority: P1
Status: ✅ PHASE 1 BUILT on working tree (2026-06-02) — type-checks clean (frontend + backend tsc 0, eslint 0 errors). NOT committed/deployed yet.
INFRA DONE 2026-06-02: migration applied to linked Supabase (xljxqymsuyhlnorfrnno — 3 tables + miyagiprints provider seeded); `MIYAGI_ADMIN_EMAIL=miyagi@despachobonsai.com` set in Vercel production + local .env.local; `MEDUSA_INTERNAL_SECRET` + `RESEND_API_KEY` confirmed already present in prod.
STILL PENDING to go live: (1) commit + deploy code (frontend→Vercel, backend→Cloud Run for the /internal/print route + listings exclusion); (2) create miyagiprints seller + Stripe Connect onboarding; (3) create + open an edition at /admin/print. Spot-check: Vercel MEDUSA_INTERNAL_SECRET value must equal the backend's (GCP Secret Manager) or placement-product creation 401s.
Plan: `/Users/cosmo/.claude/plans/zazzy-orbiting-origami.md`

North star: Miyagi's first and only monetization channel — a free, ad-funded local print magazine (México 86 retro aesthetic). Tenants pay to feature their shop/listings; QR + WhatsApp bridge print → marketplace. Miyagi designs every ad (the value-add); buyers only provide ingredients.

---

## What was built (Phase 1)

A placement reuses the existing `cart → start-checkout → webhook → order-mirror` flow unchanged.
Two deliberate choices: **`fulfillment_method: 'digital'`** (allows card + MP + manual, no inventory),
and **link the paid order to the ad submission in the webhook by `cart_id`** (shared start-checkout untouched).

**Commerce stays in Medusa; only the editorial/creative layer is new (Supabase)** — consistent with
AGENTS rule #2 (like `marketplace_offers`). All actual money flows through Medusa carts/orders/payments.

### Backend (`apps/backend`)
- `POST /internal/print/placement-product` — mints a digital Medusa product under the **miyagiprints**
  seller for one edition tier (reuses `createProductsWorkflow` + sales-channel/shipping-profile/seller-link
  logic from `sellers/me/products`). Flags metadata `is_print_placement:true`. Guarded by `x-internal-secret`.
- `api/store/listings/route.ts` — excludes `is_print_placement` products from general browse/search.

### Supabase (`apps/miyagisanchez/supabase/migrations/20260601000000_print_edition.sql`)
- `print_providers` (suppliers; **miyagiprints** seeded as `is_default` with default file_spec),
  `print_editions` (issues; `tiers[]` each map to a Medusa product), `print_ad_submissions`
  (ad ingredients + workflow state, linked to Medusa via `cart_id` / `medusa_order_id`).

### Frontend (`apps/miyagisanchez`)
- `lib/print.ts` (types/constants), `lib/print-server.ts` (helpers: seller resolve, capacity,
  `createPlacementProduct`, `ensureTierProducts`, `handlePrintAdPaid`, admin-secret guard).
- Seller API: `GET /api/print/editions`, `GET|POST /api/print/submissions`,
  `GET|PATCH /api/print/submissions/[id]`, `POST /api/print/submissions/[id]/checkout` (server-authoritative;
  re-checks capacity, drives `startCheckout`, stamps `cart_id`).
- Admin API (secret-gated): `/api/admin/print/providers`(+`[id]`), `/api/admin/print/editions`(+`[id]`,
  `[id]/submissions`), `/api/admin/print/submissions/[id]`.
- UI: `PrintEditionCard` in `shop/manage` (self-fetches open editions → CTA), ad builder at
  `app/sell/print/[editionId]` (prefills from `sellers/me`; tier, copy, photos, contact, QR target;
  draft save + pay), admin console at `app/admin/print` (`?secret=ADMIN_SECRET`; providers, edition
  create w/ tier editor, per-edition submissions queue + status dropdown).
- Emails: `sendPrintAdReceivedToBuyer` + `sendPrintAdReceivedToMiyagi` in `lib/email.ts`; both webhooks
  call `handlePrintAdPaid(cart_id…)` → mark paid + print emails + **skip** generic product emails.

---

## Go-live runbook (do before it works)

1. **Apply migration** — `supabase db query --linked` with the new SQL (creates 3 tables + seeds
   miyagiprints provider). Shared Supabase — additive only, safe.
2. **Create the miyagiprints shop** — as the owner, `POST /store/sellers/me` to create seller
   `slug=miyagiprints`, then complete **Stripe Connect** onboarding (`/api/stripe/connect/*`) + optionally
   MP + SPEI, pointing at the owner's own accounts. (Until Stripe `charges_enabled`, card checkout 422s.)
3. **Env vars** (frontend): `MEDUSA_INTERNAL_SECRET` (to call the backend internal route — must match
   backend), `MIYAGI_ADMIN_EMAIL` (editorial-queue notifications), optional `NEXT_PUBLIC_MIYAGI_WHATSAPP`.
4. **Create an edition** at `/admin/print?secret=<ADMIN_SECRET>` → set status `open`. This mints the
   per-tier Medusa products automatically.
5. Verify: open `/shop/manage` as a test seller → card appears → build + pay (Stripe test) → submission
   flips to `paid`, both emails fire, generic order email does NOT fire.

---

## Decisions / discrepancies vs the approved plan
- **Admin lives at `/admin/print`** (its own segment), not by extending `/admin` — the bare `/admin`
  page redirects to the external scraper app.
- **No i18n system exists** in the app (no `locales/`); strings are hardcoded `es-MX` per the de-facto
  pattern. AGENTS rule #5 (bilingual) is stale.
- **Checkout is server-authoritative** (`/api/print/submissions/[id]/checkout` wraps `lib/cart.ts`
  `startCheckout`) rather than client-side.
- **Manual/SPEI**: submission stores the order id and stays `pending_payment` (holds its slot); no webhook
  fires, so the owner reconciles via the admin queue. Card (Stripe/MP) is the fully-wired path.

## Known limitations (acceptable Phase 1)
- Capacity race on the last slot (mitigated: webhook re-check + admin reject/refund).
- `<img>` lint warnings in the builder (high-res preview intentional; matches existing code).

## Phase 2 — Production pipeline ✅ SHIPPED 2026-06-02 (frontend `ef0758c` → Vercel; no backend changes)
Option A (designer-in-the-loop). tsc + eslint clean. Deps added: `qrcode`, `@types/qrcode`, `jszip`
(no lockfile in this repo — Vercel installs from package.json on build).
- **QR** (`lib/print-qr.ts`): `buildQrTargetUrl` (UTM: utm_source=edicion-impresa&utm_medium=qr&utm_campaign=<editionId>),
  `generateQrPng` (ecLevel H), `ensureSubmissionQr` → R2 `print/qr/<id>.png`, persists `content.qr_url`. `qr_url` added to `PrintAdContent`.
- **Export pack** (`lib/print-export.ts` + `GET /api/admin/print/editions/[id]/export`, secret-gated):
  ZIP of approved ads — per-ad `copy.txt` + hi-res photos + logo + `qr.png`, top-level `spec.txt` (provider file_spec + edition meta + ad index) + printable `index.html` contact sheet. In-memory (maxDuration 60); move to R2 if editions grow large.
- **Editorial console** (`app/admin/print/PrintAdPreview.tsx` + `PrintAdminClient` edits): per-ad retro preview, Aprobar/Rechazar quick actions, "Descargar paquete de producción" button.
- **Manual reconciliation**: `sendPrintAdPaidEmails` extracted in print-server; admin submission PATCH fires it on `pending_payment → paid` (closes the Phase-1 manual gap). Webhooks now delegate to the same helper.

## QA fixes (2026-06-02)
- Placement PDP (`/l/<prod>`) was bypassing the builder → hit the coord-only checkout rule (card blocked).
  Fix: PDP now funnels placements to the ad builder ("Diseña tu anuncio impreso" → `/sell/print/[edition]`,
  detected via `metadata.is_print_placement`), and `checkout-options` maps `print_ad`→digital as a safety net.
  Shipped: frontend `4e4063e`, backend `3f1b5bc`. **The intended purchase path is the in-portal builder, not the PDP.**

## Phase 3 — Manual polish · buyer mgmt · social ✅ SHIPPED 2026-06-02 (frontend `58163f5` → Vercel; social migration applied; no backend changes)
tsc + eslint clean. **Frontend-only.**
- **3A manual polish**: builder now reads nested `manual_payment.{spei,dimo,cash}` (was reading flat `result.clabe` → fallback); persists `content.manual_payment`; sends print-specific `sendPrintAdPaymentPending` (not generic) via new `suppressManualEmail` flag on `startCheckout`. "Ya hice el pago" → `/api/print/submissions/[id]/payment-reported` (pings admin via `tgNotify`). Daily cron `/api/cron/print-pending` (in vercel.json): reminds ≤72h before deadline, releases unpaid slots (→`rejected`) once edition closed/past deadline.
- **3B buyer mgmt**: `/account/print-ads` (+ `AccountPrintAdsClient`) — status chips, shared `app/components/PrintAdPreview`, manual instructions, "Ya hice el pago", "Solicitar cambios" (`/change-request`). Builder loads existing submission via `?submission=<id>` (edit drafts; edit+`resubmit` rejected→paid). New emails `sendPrintAdApproved`/`sendPrintAdRejected` fired from admin PATCH transitions; all print emails deep-link to `/account/print-ads`. Entry links in `/account`.
- **3C social**: migration `print_social_submissions` (+ types). Submit at `/comunidad/nuevo` (any signed-in user) → `/api/print/social`. Admin "Sección social" tab in `PrintAdminClient` (curate/assign-edition/editor-add) + `/api/admin/print/social/*`. Export ZIP gains a `social/` folder + section in `index.html` + count in `spec.txt`.
- **Subscriptions + extra providers deferred** (confirmed with owner). Social submitters = any signed-in user.

## To ship Phase 3
Apply migration `supabase/migrations/20260602000000_print_social.sql` (`supabase db query -f … --linked`) + push frontend.

## Phase 3.1 — QA polish ✅ SHIPPED 2026-06-02 (frontend `d376ccd` → Vercel; backend `22ec792` → Cloud Run)
tsc + eslint clean (frontend + backend). Spanned **both repos**.
- **Orders visibility (backend, the real bug):** the 404'd order was a regular (non-print) order. `resolveBuyerCustomerIds` now also returns `emails`; `customers/me/orders` (list) matches `customer_id` **OR** `email` (manual orders can have null/mismatched customer_id) and **excludes print placements**; `customers/me/orders/[id]` (detail) ownership accepts an `email` match. → manual orders show + open again.
- **Print routing:** `payment/success` detects a print order (submission by `cart_id`) → `PrintSuccessUI` ("Recibimos tu anuncio") + CTA `/account/print-ads`, instead of the generic order screen.
- **Manual notify:** `payment-reported` now emails admin (`sendPrintPaymentReportedToMiyagi`) + buyer ack (`sendPrintPaymentReportedToBuyer`), plus the existing Telegram ping.
- **Copy buttons:** `app/components/CopyButton.tsx` used on the builder manual screen + `/account/print-ads` (CLABE, DiMo).
- **Social:** submit sends `sendPrintSocialReceived` confirmation; new `/comunidad/mis-aportes` (+ link from submit success) shows the submitter's posts + status.
- **Flagged:** root cause of null `customer_id` on some manual orders (deeper Medusa customer-linking) — email fallback fixes visibility; linking dig is a separate follow-up.

## Phase 3.2 — Clerk↔Medusa customer link (orders visibility root cause) ✅ SHIPPED 2026-06-02 (backend `9cf3745` → Cloud Run). RUN BACKFILL ONCE after deploy.
**Backend-only** (`medusa-bonsai-backend`). tsc clean. Root cause: code keyed buyer→customer on `customer.external_id`, but Medusa v2's customer table has **no external_id column**; every customer is a guest-by-email with no Clerk link; the default Clerk session token has **no email claim** → `resolveBuyerCustomerIds` returned empty → buyer orders invisible + 404. Orders live in **Neon** (Medusa DB); frontend already reads detail+seller from Medusa.
- **A (`_utils/clerk-auth.ts`):** `resolveBuyerCustomerIds` now resolves customers by `metadata->>'clerk_user_id'` (raw SQL on PG_CONNECTION) **+** email — email sourced from the JWT **and** a cached `getClerkUserEmails(sub)` Clerk Backend API call (reliable; surfaces existing guest-owned orders, no JWT-email dependency). New `resolveOrCreateBuyerCustomer(scope,…)` helper.
- **B:** `start-checkout` + `customers/sync` now find-or-create ONE canonical customer by email, stamp `metadata.clerk_user_id`, attach `cart.customer_id` (dropped the dead `external_id` path) → orders owned by a stable clerk-linked customer.
- **D:** `POST /internal/backfill-customer-clerk` (x-internal-secret) stamps `metadata.clerk_user_id` on existing customers via Clerk-by-email + creates `customer_clerk_user_id_idx`.
- **C SKIPPED:** leaving the `/account/orders` Supabase+Medusa merge as-is — it already surfaces Medusa-only orders (so A+B alone fix visibility) and the mirror carries shipment/tracking data; fully retiring it is a separate cleanup.
- **To ship:** push backend → Cloud Run; then run the backfill once (`curl -XPOST .../internal/backfill-customer-clerk -H x-internal-secret:…`). Buyer order list/detail already match customer_id OR email (Phase 3.1).

## Phase 3.3 — Medusa data hygiene + pipeline review (2026-06-02)
Root cause of the 71 publishable keys / 70 stores: `src/migration-scripts/initial-data-seed.ts` (first-run seed) re-invoked against **prod** Neon (dev + prod share one `DATABASE_URL`), each run creating channel+key+store then aborting at the regions step. Pipeline verdict: **cloud-build-on-push is correct, keep it.**
- ✅ **Seed idempotency guard** (BUILT): `initial-data-seed.ts` now no-ops if any store exists. Prevents recurrence.
- ✅ **Cleanup script** (BUILT, NOT yet run): `src/scripts/cleanup-default-data.ts` — DRY RUN by default; `CLEANUP_APPLY=1` to delete. Keeps store **Bonsai Commerce**, channel **Miyagi Sánchez Storefront** (`sc_01KSK1J0V81P4EPY9G0JAPX353`), key **pk_bac9d8ced544f**; consolidates products to that channel; txn-wrapped.
- ✅ **Channel pin** in `infra/gcp/deploy.sh` (`MEDUSA_SALES_CHANNEL_ID` default → storefront). **Owner must set it on Cloud Run now** (image-only deploys don't pick up new env): `gcloud run services update medusa-web --region us-east4 --update-env-vars MEDUSA_SALES_CHANNEL_ID=sc_01KSK1J0V81P4EPY9G0JAPX353`
- ✅ **P1.6 Neon dev branch (the systemic fix) — DONE:** created `dev` branch on project `shiny-paper-72860331` (`br-long-cake-aqzbj1n4`, endpoint `ep-twilight-poetry-aqbwdhjh`). `.env.template` now documents: local dev → `dev` branch (`neonctl connection-string dev --project-id shiny-paper-72860331 --pooled`), prod `main` branch lives only in Secret Manager, one-off prod ops via gitignored `.env.prod`. **Owner action:** after the cleanup/backfill, point local `apps/backend/.env` `DATABASE_URL` at the dev branch.
- ⏭ **P1.5 DEFERRED (marginal value, real risk):** Medusa already **lock-guards** migrations on boot + `min-instances=1`, so the race is negligible. A proper Cloud Build migrate step must boot the image with the **full** secret set (DATABASE_URL+REDIS_URL+JWT_SECRET+COOKIE_SECRET) + grant the `medusa-cicd` SA `secretmanager.secretAccessor` on each. Do as a deliberate, watched deploy if/when desired — not worth a rushed untestable ship.
- ⏭ **P1.4 DEFERRED (needs build test):** generate a standalone `apps/backend/package-lock.json` (`npm install --package-lock-only --workspaces=false`), verify with a real `docker build`, then switch the Dockerfile builder to `npm ci`. Skipped to avoid a build-breaking unverified change.

### Cleanup runbook (run once, after reviewing dry-run)
```
cd apps/backend
npx medusa exec ./src/scripts/cleanup-default-data.ts            # DRY RUN — prints orphan counts + FK tables
CLEANUP_APPLY=1 npx medusa exec ./src/scripts/cleanup-default-data.ts   # APPLY (txn-wrapped)
```
Verify after: `select count(*) from store` → 1; publishable keys → 1; "Default Sales Channel" gone; storefront has 11 products.

## Orders saga — ✅ RESOLVED 2026-06-03 (4 root causes, all shipped)
Orders never showed for buyer/seller; QA mislabeled it 404 — Cloud Run logs revealed **401**. Four distinct bugs, fixed in sequence:
1. **Clerk↔customer link** (3.2): keyed on non-existent `customer.external_id`; now `customer.metadata.clerk_user_id` + email (Clerk Backend API). Backfill ran (6/7 stamped). Backend `9cf3745`.
2. **Framework auth gate** (the real blocker): custom buyer routes under `/store/customers/me/*` are auto-gated by Medusa's customer-token auth → 401 before our code ran. Moved subtree → **`/store/buyer/me/*`** (same depth, imports intact) + frontend URLs. Backend `07062e5`, frontend `aa1e4ba`.
3. **Seller detail 404 + seller list empty**: `orderService.listLineItems`/`retrieveOrder` don't exist / throw "Shipping method version is required" → use raw SQL (order_item→order_line_item join) + `query.graph`. Backend `07062e5`+`1766a04`.
4. **False "Pago confirmado"**: `normalizeMedusaOrder` defaulted all to 'paid'; manual orders are `authorized` not captured → derive **`pending_payment`**. UI: added `pending_payment` to all status maps + buyer `ACTIVE_STATUSES`; `isSpeiOrder` gate includes `manual`/`dimo` (shows buyer pending notice + seller "Confirmar pago recibido"); buyer "Ya hice el pago" → `/api/orders/[id]/report-payment`. Backend `1766a04`, frontend `f077667`+`3aeeef5`.

**Manual lifecycle now:** buyer pays (authorized) → both see "Pago pendiente" + instructions → buyer "Ya hice el pago" (pings seller) → seller "Confirmar pago recibido" (captures) → both "Pago confirmado". Card/MP = confirmed immediately.
**Key lessons:** never put Clerk-self-authed routes under `/store/customers/me`; commerce DB = Neon; diagnose orders via `gcloud run services logs read medusa-web --region us-east4` (shows true status codes).
**Owner still TODO (optional):** run cleanup script (`CLEANUP_APPLY=1`), point local `.env` at the Neon dev branch.

## Phase 4 — printed-edition builder ✅ FULLY SHIPPED + DEPLOYED 2026-06-03
Miyagi's editorial/layout tool to compose the magazine on the web layer (Option B/C). Full plan + per-story log: `tasks/print-edition-builder.md`. US-0→US-6 live at `/admin/print/[editionId]/builder` → `/print` (+ "⬇ Descargar PDF"); frontend `32e43d8`→`30a7f77`, migration `20260603000000_print_layouts.sql` applied. Cloud Run `print-pdf` service deployed (us-east4) + Vercel env set; prod PDF verified (2.1MB, 3pp, Carta+3mm bleed).
**Still backlog:** subscriptions ("cada edición") · additional/self-serve providers · QR-scan analytics dashboard · optional Medusa managed-inventory capacity backstop.
