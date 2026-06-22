# Static marketplace shell — Sprint 3: Personalization endpoint on Cloud Run (Phase 2)

**Status:** ⬜ Not started. Backend (Cloud Run us-east4, ~12 min, **no preview**). Risk: **MED–HIGH** — new
authed read endpoint on GCP. **Daniel merges.** First sprint of Phase 2 (restore personalization, from GCP).

## Why
Phase 1 made the homepage static by dropping personalization from the render. To bring it back **without** a
Vercel function, serve the per-user data from a **Cloud Run** endpoint that client islands (S4) call after
hydration. Honors the "compute on GCP" preference; the static shell never blocks on it.

## Stories

### Story 3.1 — Decide the endpoint home (plan-mode gate)
**As** the builder, **I want** the endpoint placed without muddying the data-domain boundary, **so that** it's
clean to own.
**Acceptance:**
- Settle: a **Medusa custom route** on `medusa-web` (add a Supabase read client there) **vs** a small **standalone
  Cloud Run service**. The data is Supabase (frontend's domain per AGENTS rule #2) — the endpoint *reads* it from
  GCP with a Clerk JWT; pick the option that keeps ownership cleanest. Record the decision + rationale.
**Risk:** low (decision) — but shapes 3.2.

### Story 3.2 — Clerk-JWT-gated personalization read endpoint
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
- **deterministic gate:** backend `medusa build` + `tsc` + `npm run test:unit` (or the chosen service's gate) green.
- **api/unit spec:** the auth gate (reject no/invalid JWT) + the response shape (pure-deriver coverage).
- **live confirmation:** post-merge, a real Clerk-JWT call returns the caller's data (agent can curl with a token
  if available; otherwise **owed to Daniel** with a live session).

## Sprint 3 — Smoke walkthrough
_Written at build time — numbered steps; the authed live call flagged owed-to-Daniel if no test token; include the
unauth'd-rejection check (agent-runnable)._
