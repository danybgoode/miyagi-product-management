# Static marketplace shell — Sprint 3: Personalization endpoint on Cloud Run (Phase 2)

**Status:** 🏗️ **BUILT — pre-merge** (branch `feat/static-shell-personalization-endpoint` in `apps/backend` +
the infra change in the monorepo-root repo). Backend (Cloud Run us-east4, ~12 min, **no preview**). Risk:
**HIGH** — new authed read endpoint on GCP that reads money-adjacent offer data + adds a dep/secrets to shared
infra. **Daniel merges.** First sprint of Phase 2 (restore personalization, from GCP).

**Gate (green):** `medusa build` ✓ · `tsc --noEmit` ✓ (exit 0) · `npm run test:unit` ✓ (29 tests, incl. the new
9-test `personalization.unit.spec.ts`) · the infra drift guard ✓ (19 tests, `node --test 'infra/gcp/test/*.test.js'`).

## Why
Phase 1 made the homepage static by dropping personalization from the render. To bring it back **without** a
Vercel function, serve the per-user data from a **Cloud Run** endpoint that client islands (S4) call after
hydration. Honors the "compute on GCP" preference; the static shell never blocks on it.

## Stories

### Story 3.1 — Decide the endpoint home (plan-mode gate) ✅
**As** the builder, **I want** the endpoint placed without muddying the data-domain boundary, **so that** it's
clean to own.
**Acceptance:**
- Settle: a **Medusa custom route** on `medusa-web` (add a Supabase read client there) **vs** a small **standalone
  Cloud Run service**. The data is Supabase (frontend's domain per AGENTS rule #2) — the endpoint *reads* it from
  GCP with a Clerk JWT; pick the option that keeps ownership cleanest. Record the decision + rationale.
**Risk:** low (decision) — but shapes 3.2.

**DECISION (Daniel, 2026-06-22): a Medusa custom route on `medusa-web`** — `GET /store/home/personalization`.
Rationale: reuses the existing Cloud Build → Cloud Run rail (no new infra), `/store/*` CORS already allows
`miyagisanchez.com` (free), `jose` is already a backend dep (real JWKS verify), and the seller snapshot is a
native Medusa read. The data-domain boundary (rule #2) is about *ownership/writes*, not "only the frontend may
read": the backend gains a **read-only** Supabase client; Supabase stays the source of truth (the frontend still
owns all writes). The standalone-service option was rejected as ~5× the moving parts (new repo/Dockerfile/trigger/
service/secrets/CORS + a re-implemented JWT verify + a Medusa hop for the snapshot) for one read endpoint —
against the "reuse rails, lowest infra" learnings.

**DECISION (Daniel, 2026-06-22): the endpoint returns raw DATA; S4 derives the copy.** It returns data-only
`offerAlertInputs` (`OfferAlertInput[]` field subset); the S4 island runs the frontend's pure
`lib/home-offer-alert.deriveOfferAlerts()` for the es-MX titles/subtitles. Keeps es-MX copy single-source in the
frontend (rule #5) and genuinely reuses the pure deriver at S4 — the backend ships **zero** Spanish copy.

### Story 3.2 — Clerk-JWT-gated personalization read endpoint ✅ BUILT
**As** a signed-in visitor, **I want** my home personalization served from GCP, **so that** the homepage can stay
static while still greeting me.
**Acceptance:**
- An authenticated **read** endpoint returns `{ recentFavorites, offerAlerts, sellerSnapshot, hasShop }` for the
  caller, reusing the pure derivers (`lib/home-favorites`, `lib/home-offer-alert` / equivalents) and the same
  query set the old `app/page.tsx` signed-in block used.
- Auth = a validated **Clerk JWT** (reuse `apps/backend/src/modules/auth-clerk/`); an unauth'd/invalid call is
  rejected. **Read-only — no money mutation.** CORS allows the marketplace origin for the client fetch.
- Degrades safely (empty arrays / nulls) so the S4 islands can render nothing rather than error.
**Risk:** med–high (new authed endpoint; cross-origin; reads money-adjacent offer data but does not mutate).

## Sprint QA
- **deterministic gate:** backend `medusa build` + `tsc` + `npm run test:unit` green ✓ + the infra drift guard ✓.
- **api/unit spec:** the auth gate (reject no/invalid JWT) + the response shape + per-section degrade — covered by
  `src/api/store/home/personalization/__tests__/personalization.unit.spec.ts` (9 tests).
- **live confirmation:** post-merge, a real Clerk-JWT call returns the caller's data (agent can curl with a token
  if available; otherwise **owed to Daniel** with a live session).

## What shipped (files)
**Backend repo (`apps/backend`) — branch `feat/static-shell-personalization-endpoint`:**
- `src/api/store/home/personalization/route.ts` — `GET` handler + injectable `buildHomePersonalization(deps)`.
  Verifies the Clerk JWT → 401 on fail; runs the 7 reference reads; returns
  `{ recentFavorites, offerAlertInputs, sellerSnapshot, hasShop }`, each section degrading to empty on error;
  a top-level catch degrades to all-empty (never a 500 to the static-shell islands).
- `src/api/store/_utils/clerk-verify.ts` — `verifyClerkJwt()` (real **jose JWKS** verify, mirroring
  `src/modules/auth-clerk/service.ts`; issuer check + dev-token fallback) + `bearerToken()`. **Not** the
  decode-only `extractClerkUserId` — see the security note below.
- `src/api/store/_utils/supabase-read.ts` — lazy **read-only** Supabase client (mirrors the frontend
  `lib/supabase.ts` singleton + missing-config stub).
- `package.json` — `+@supabase/supabase-js`.

**Monorepo-root repo — infra:**
- `infra/gcp/deploy.sh` — `+SUPABASE_URL,+SUPABASE_SERVICE_ROLE_KEY` in `--set-secrets` (prod; staging deferred,
  degrades via stub) + a comment.
- `infra/gcp/test/deploy-invariants.test.js` — the two secrets added to `PROD.secrets` (drift guard parity).

## Shape (the wire contract S4 consumes)
```jsonc
{
  "recentFavorites":  [{ "medusaId","title","priceCents","currency","condition","location","imageUrl" }],
  "offerAlertInputs": [{ "offerId","conversationId","perspective","status","expiresAt",
                         "amountCents","currency","listingTitle","shopName" }],  // buyer + seller; NO copy
  "sellerSnapshot":   { "shopName","visitas","ofertasNuevas" } | null,
  "hasShop":          true | false
}
```
`visitas` = Σ the seller's listings' `metadata.views` (Medusa-native: seller → products). `ofertasNuevas` =
count of the seller's pending offers. S4 runs `deriveOfferAlerts(offerAlertInputs)` for the es-MX alert copy.

## Security note (in the PR)
The new endpoint **cryptographically verifies** the Clerk JWT (jose JWKS). The pre-existing
`extractClerkUserId` helper (used by `/store/sellers/me`, `/store/buyer/me/orders`, `/store/customers/sync`)
only base64-**decodes** the payload — no signature check — and its comment assumes edge validation by a
`src/api/middlewares.ts` that **does not exist**, so those routes currently trust a **forgeable** `sub`. Flagged
as a **separate security follow-up** (out of scope for this sprint).

## Deploy / provisioning run-order (HIGH — Daniel)
1. **Provision the secrets first** (image-only deploys preserve them): create Secret Manager shells
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (values from `apps/miyagisanchez/.env.local`), grant the runtime
   SA `medusa-run@` `secretAccessor`, and
   `gcloud run services update medusa-web --region=us-east4 --update-secrets=SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest`
   (**additive** — preserves the others). **Owed to Daniel** (prod-infra write + handles the service-role key).
2. Merge code → Cloud Build (~12 min) → confirm the live revision rolled.
3. Run the smoke below.

## Sprint 3 — Smoke walkthrough
Numbered; one action + one expected result. Prod base `https://api.miyagisanchez.com`. `$PK` =
`MEDUSA_PUBLISHABLE_KEY`.

1. **Unauthenticated → 401 (agent-runnable, post-deploy).**
   `curl -i -H "x-publishable-api-key: $PK" https://api.miyagisanchez.com/store/home/personalization`
   → **HTTP 401** `{"message":"Authentication required"}`.
   *(Pre-deploy this returns 200 as the not-found page — that's "route not live yet," not a logic bug; the
   CI/build gate is the real signal for a new route. Unknown prod routes 200, per LEARNINGS.)*
2. **Forged token → 401 (agent-runnable).**
   `curl -i -H "x-publishable-api-key: $PK" -H "Authorization: Bearer not.a.jwt" .../store/home/personalization`
   → **HTTP 401** (the signature can't verify against Clerk's JWKS).
3. **CORS preflight (agent-runnable).**
   `curl -i -X OPTIONS -H "Origin: https://miyagisanchez.com" -H "Access-Control-Request-Method: GET"
   -H "Access-Control-Request-Headers: authorization,x-publishable-api-key" .../store/home/personalization`
   → `Access-Control-Allow-Origin: https://miyagisanchez.com` and `Access-Control-Allow-Headers` includes
   `authorization`. *(If `authorization`/`x-publishable-api-key` are missing from ACAH, the S4 browser fetch
   will be blocked — flag for an `http.storeCors`/headers config follow-up.)*
4. **Revision actually rolled (agent-runnable).**
   `gcloud run services describe medusa-web --region=us-east4 --format='value(status.latestReadyRevisionName)'`
   → matches the merge's build (a `SUCCESS` Cloud Build is not yet a live revision).
5. **Authed happy path — OWED TO DANIEL** (needs a live Clerk session JWT; agent runs it if an `MS_TEST_*`
   token is available, else owed). With a real buyer token:
   `curl -H "x-publishable-api-key: $PK" -H "Authorization: Bearer <clerk-jwt>" .../store/home/personalization`
   → `200` with `{recentFavorites, offerAlertInputs, sellerSnapshot, hasShop}`; a buyer who favorited items sees
   them in `recentFavorites`; a buyer with a pending offer sees a `perspective:"buyer"` entry in
   `offerAlertInputs`. With a **seller** token: `hasShop:true`, a non-null `sellerSnapshot`, and any pending
   offers on their shop appear as `perspective:"seller"` inputs.
6. **No-data degrade — OWED TO DANIEL.** A signed-in user with no favorites / offers / shop →
   `{recentFavorites:[], offerAlertInputs:[], sellerSnapshot:null, hasShop:false}` (200, not an error).
