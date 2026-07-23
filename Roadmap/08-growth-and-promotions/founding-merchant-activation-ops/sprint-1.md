# Founding merchant activation operations — Sprint 1: Field record and consent-safe intake

**Status:** 🟦 In review — PR 303 (`4df3d87` S1.1 · `3fb1961` S1.2 · `b18ae84` S1.3)

Migration `20260723100000_activation_crm_s1.sql` **applied and verified live** 2026-07-22: both tables
present by `to_regclass`, backfill 29/29 rows linked to a shop, `promoter.activation_crm_enabled`
present with enablement polarity and `enabled = false`, RLS ON with 0 policies on both tables,
`schema_migrations` version aligned to the file.

## Stories

### Story 1.1 — Canonical relationship schema and dark-launch flag

**As an** activation operator, **I want** one durable merchant relationship record, **so that** intake does not
depend on a spreadsheet or prematurely created shop.

**Acceptance:** additive tables model the merchant, opaque id, steward, lifecycle state and audit timestamps;
`promoter.activation_crm_enabled` is created disabled; the relationship may exist without a Medusa seller;
database constraints protect tenant/owner references and no commerce entity is copied.

**Risk:** high — additive database contract and runtime gate; Daniel merges.

### Story 1.2 — Authorized mobile intake, resume and dedupe

**As a** Founding Merchant Partner, **I want** to save and resume a partial merchant record on my phone, **so
that** an in-person conversation produces a usable next step without duplicate data entry.

**Acceptance:** `/promotor/cerrar` exposes the step only with the flag ON; required fields are minimal; a saved
draft resumes; claimed seller id then normalized phone/email are deterministic matches; fuzzy names only prompt
human confirmation; promoter/grant scope is enforced and OFF leaves today's flow unchanged.

**Risk:** high — authenticated write path and identity/dedupe rules; Daniel merges.

### Story 1.3 — Consent evidence and acquisition attribution

**As an** operator, **I want** permission and acquisition provenance attached to the relationship, **so that**
we know what the merchant allowed and who originated the work.

**Acceptance:** promoter, cohort, source, preferred contact channel and consent-reference fields persist;
permission-dependent stages reject a note without valid consent-preview evidence; edits are audited; the
intake never treats claim, link delivery or silence as publication permission.

**Risk:** high — consent boundary and immutable attribution; Daniel merges.

## Build contract (locked by the architect before the builder started)

Migration `supabase/migrations/20260723100000_activation_crm_s1.sql` — additive, RLS ON with no
policies (same posture as `merchant_previews`: these rows are merchant contact data and the app reaches
Supabase only through the service-role key).

**`merchant_relationships`** — the canonical record. `id` is the opaque merchant subject id (README D1).
- identity: `business_name` (required), `contact_name`, `phone_e164`, `email_normalized`,
  `whatsapp_e164`, `instagram_handle`
- context: `estado`, `municipio`, `location_note`, `category`, `current_channels TEXT[]`,
  `preferred_channel` CHECK (`whatsapp|phone|email|instagram|in_person`), `qualification`
  CHECK (`unknown|strong|medium|weak|disqualified`), `fit_note`, `objections`
- attribution: `promoter_id` → `marketplace_promoters(id)`, `cohort`, `source`
- stewardship: `steward_clerk_user_id`
- links: `shop_id UUID` **UNIQUE NULL**, `preview_id UUID` → `merchant_previews(id)`
- lifecycle: `stage` CHECK over the 13 stages default `scouted`, `stage_entered_at`, `intake_complete`
- audit: `created_by`, `created_at`, `updated_at`

Indexes: `(phone_e164)`, `(email_normalized)`, `(promoter_id, stage)`, `lower(business_name)`.
Deliberately **non-unique** on phone/email — a family business legitimately shares a number, so a
collision must prompt a human, not 23505 the intake. Uniqueness lives on `shop_id` only, because two
relationship records pointing at one shop is a genuine data error.

**`merchant_relationship_field_audit`** — append-only `(relationship_id, field, old_value, new_value,
actor_clerk_user_id, at)`. Attribution and consent fields are audited on every edit (acceptance 1.3).

**Backfill (README D1):** one `merchant_relationships` row per existing `marketplace_shops` row,
`business_name` from the shop name, `shop_id` set, `intake_complete=false`, `created_by='backfill'`.
29 shops live; the backfill is `INSERT … SELECT … ON CONFLICT DO NOTHING` and is re-runnable.

**Flag:** `promoter.activation_crm_enabled`, enablement polarity, `false`, `ON CONFLICT DO NOTHING`.

**Routes** (all `promoter.activation_crm_enabled`-gated; OFF ⇒ 404, indistinguishable from absent):
- `POST /api/promoter/relationship` — create/update. Server-side dedupe runs **before** the insert in
  this precedence: (1) `shop_id` exact, (2) `phone_e164` exact, (3) `email_normalized` exact. A hit
  returns **409** with the existing relationship id and a `match_reason`; the client re-posts with
  `confirm_new: true` to override. Fuzzy `business_name` similarity returns **200 with a `suggestions`
  array** — a prompt, never a block (epic Decision 3).
- `GET /api/promoter/relationship/[id]` — resume. Scope: the caller's own `promoter_id`, an active
  `partner_grants` row for the linked shop, or admin. Anything else is **403 with no body fields** —
  not a partial record.
- `POST /api/promoter/relationship/[id]/consent` — attach consent evidence. Reads
  `merchant_preview_decisions` for the linked preview and requires `decision='approved'` at the
  preview's `current_version`; anything else is **422** and the record stays saved. A note is never
  evidence.

**Normalization** lives in a zero-import `lib/merchant-identity.ts` (`normalizePhoneE164`,
`normalizeEmail`, `businessNameKey`) so the `api` spec calls every branch directly — the split the
`lib/seller-mode.ts` convention already prescribes.

**UI:** a new `RelationshipStep` in `/promotor/cerrar`, rendered only with the flag ON and placed
**first** (the merchant record precedes the shop). Phone-size targets, explicit save state, resume by
id from `localStorage`. Flag OFF ⇒ `PromoterCloseClient` renders exactly today's steps.

## Sprint QA

- **api specs:** extend `e2e/promoter-close.spec.ts`; add relationship specs for flag states, partial resume,
  dedupe precedence, invalid consent evidence and cross-promoter 403s.
- **observed red:** record today's absence of resumable relationship data before implementation.
- **browser smoke owed:** yes, to Daniel — authenticated phone-size promoter intake and resume.
- **deterministic gate:** frontend typecheck/build + Playwright API green; migration verified locally and live.

## Sprint 1 — Smoke walkthrough (do these in order)

Env: production · https://miyagisanchez.com

1. With the flag OFF, sign in as a disposable promoter and open https://miyagisanchez.com/promotor/cerrar.
   → The existing close workflow is unchanged.
2. Turn the flag ON, reopen `/promotor/cerrar`, enter only the minimum merchant facts and save.
   → A relationship id and visible saved state appear without creating a shop.
3. Reload on a phone-size viewport and resume the record.
   → The prior answers and next step return.
4. Submit the same normalized phone/email again.
   → The existing relationship is offered for confirmation; no duplicate is silently created.
5. Try to record permission without consent-preview evidence.
   → The permission stage is refused while the record remains safely saved.

If any step fails, note the step number + URL — that's the bug report.
