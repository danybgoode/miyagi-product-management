# Sprint 2 — claim actually transfers the shop

Goal: the existing claim UX (QR → `/s/[slug]` → Reclamar → email → sign in) ends with the Medusa
seller owned by the claimer — badge gone, `/shop/manage` works.

## Stories

### S2.1 (backend) — claim seam
- [x] `POST /internal/sellers/[id]/claim` (`x-internal-secret`), body `{clerk_user_id}`: sets it iff currently null; idempotent when already claimed by the same user; 409 when owned by another.

### S2.2 (frontend) — claim completion endpoint
- [x] `POST /api/claim/complete` — server-to-server only; auth = shared secret header (`CLAIM_JWT_SECRET`, already held by both apps) + the claim JWT re-verified; body `{token, clerk_user_id}`.
- [x] On success: backend claim (S2.1) → mirror `marketplace_shops` claimed via `metadata->>medusa_seller_id` → `marketplace_claims` approved → `revalidateTag('shops'|'listings')`.

### S2.3 (despachobonsai repo — small PR)
- [x] `app/api/onboarding/claim/complete/route.ts`: keep Clerk auth + `commerce_tenants` upsert; replace the dead direct `marketplace_shops` update with a call to miyagisanchez `POST /api/claim/complete`.

## Verification
- API-level smoke: signed test token → `/api/claim/complete` → Medusa seller `clerk_user_id` set, badge gone (then revert the test claim).
- **Live Clerk-gated browser claim smoke = Daniel** (real email → despachobonsai sign-in → shop transfers).
