# Sprint 1 — Merchant configuration

Goal: a seller can attach custom input fields to a listing and they persist — the data foundation
for the whole epic. No buyer-facing change yet.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **✅ SHIPPED to prod 2026-06-05 — PR #16 merged (`76f4053`, commit `0a44bb9`), CI green.**

> Frontend + thin API only. Field definitions are stored on the **Medusa product metadata**
> (`metadata.custom_fields`) — no new tables, no Supabase. The backend update path already merges
> arbitrary product metadata, so persistence needs only a frontend API passthrough.

Maps to epic acceptance criteria **AC 1.1, AC 1.2, AC 1.3**.

---

## US-1 — Define the data model + shared helpers ✅
**As a** platform, **I want** one shared definition of what a custom field is, **so that** every
stage (config, buy box, cart, order, email) reads and validates it the same way.
- [x] New `lib/personalization.ts`: `CustomFieldDef` type (`short_text | long_text | select`, with
      `label`, `placeholder?`, `max_length?`, `required`, `options?`), the buyer-payload type, and
      helpers `sanitizeFieldDefs` (cap count/lengths, allowed types), `validatePersonalization`,
      `formatPersonalizationLines`.

## US-2 — Seller adds custom fields to a listing ✅
**As a** seller, **I want** to add custom input fields to a product (a label, a type, optional/
required, a max length), **so that** buyers can personalize it.
- [x] New `app/sell/edit/[id]/PersonalizationSection.tsx` — add / remove / reorder fields; choose
      type; write the label + placeholder; set max length; toggle required. State lifted into
      `EditForm.tsx` and included in the save payload as `custom_fields`.
- [x] Each field has a seller-authored **label** and **placeholder** to guide the buyer (AC 1.3).
- [x] Supports at least Short Text + Long Text, plus a Select; with max-length + required rules
      (AC 1.2).

## US-3 — Persist to the product ✅
**As a** seller, **I want** my custom fields saved with the listing, **so that** they're there when
I come back.
- [x] `app/api/sell/listing/[id]/route.ts` PATCH accepts `custom_fields`, runs `sanitizeFieldDefs`,
      and forwards as `metadata: { custom_fields }` to `/store/sellers/me/products/:id`.
- [x] Round-trips: save → reload the edit form → the fields are still there.

---

## QA / smoke-test stage
- `tsc --noEmit` + `npm run build` green.
- **Playwright spec** (one): PATCH a test listing with `custom_fields` via the seller API, then GET
  `/store/listings/:id` and assert `metadata.custom_fields` is present and well-formed.
- Manual: on the branch preview, add 2 fields to a disposable listing, save, reload → persists.

## Definition of done (sprint)
A seller adds Short/Long/Select custom fields to a listing, saves, and they persist across reloads;
the definitions live on the Medusa product metadata in the shared shape; nothing buyer-facing
changed yet. Risk tier: **low**.
