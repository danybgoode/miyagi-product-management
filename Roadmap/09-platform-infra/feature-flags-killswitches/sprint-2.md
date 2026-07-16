# Sprint 2 — Backend enforcement: make the kill-switch a *true* kill

**Status:** ✅ Merged to `main` 2026-06-06 (PR #9; Cloud Run deploy in flight)
**Risk:** HIGH (live payment path, backend → Cloud Run, no preview → Daniel merged).

Closes **finding #1** from the S1 review: S1 only *hides* Stripe in the human checkout UI. Agents/UCP
read the backend catalog directly, and a buyer whose page loaded before the toggle can still POST a
Stripe checkout — so `start-checkout` still accepts `pp_stripe`. This sprint enforces the kill in the
**backend**, the one place every entry point converges.

---

## US-1 — A killed rail is rejected everywhere, not just hidden

> **As** the platform admin, **I want** `checkout.stripe_enabled = OFF` to actually block Stripe at the
> backend (catalog + checkout), **so that** agents, the UCP API, and stale in-flight pages can't slip a
> Stripe payment through while the rail is killed — and if Flagsmith is down, Stripe still works (fail-open).

**What it ships** (`apps/backend`)
- `src/lib/flags.ts` — backend twin of the frontend helper (`flagsmith-nodejs`, local eval, fail-open,
  `requestTimeoutSeconds:2, retries:0`). Reads the **same** Flagsmith flag via the **Production**
  server-side key, so one toggle governs both apps.
- `src/api/store/_utils/payment-methods.ts` — `resolveSellerPaymentMethods(seller, region, { stripeEnabled })`
  drops the Stripe candidate when OFF. This is *the* single source of truth for the catalog → the backend
  `checkout-options` endpoint (which the frontend proxy **and** agents/UCP read) stops listing Stripe.
- `src/api/store/sellers/[slug]/checkout-options/route.ts` — reads the flag, passes it through.
- `src/api/store/carts/[id]/start-checkout/route.ts` — the **enforcement point**: the Stripe branch
  returns `422 { code: 'PAYMENT_METHOD_DISABLED' }` when the flag is OFF, before creating any Stripe
  session.

**Acceptance (Daniel can run, post-deploy)**
1. Flag ON (default): Stripe checkout works exactly as today. ✅ no change.
2. Flag OFF → `GET /store/sellers/:slug/checkout-options` no longer lists `stripe` (so agents/UCP don't
   offer it).
3. Flag OFF → `POST /store/carts/:id/start-checkout` with `provider: "stripe"` returns **422
   `PAYMENT_METHOD_DISABLED`** (a stale page / agent can't force a Stripe charge).
4. Flag OFF then ON → behaviour returns to normal. Flagsmith unreachable → Stripe works (fail-open).

**Deploy / config note**
- Backend needs **`FLAGSMITH_ENVIRONMENT_KEY` (Production server-side key) in Cloud Run** (+ Secret
  Manager) — owed to Daniel / a deploy step. Until set, the backend runs fail-open (Stripe on), so the
  merge is safe but the kill is frontend-only until the secret lands + the service redeploys (~12 min).
- Backend has **no preview** → verification is `tsc`/`build` pre-merge + an **API smoke against prod**
  after the Cloud Run deploy.

**Out of scope (still deferred):** the rest of the taxonomy (other rails, `checkout.global_pause`), the
`routing.*` middleware switches, and per-shop/seller flags.

---

## Smoke walkthrough (fool-proof) — post-deploy, prod API

> Backend deploys only to prod (Cloud Run, ~12 min, no preview). Run after the deploy + the Cloud Run
> secret is set. Steps use real prod URLs. The card-charge confirmation is **owed to Daniel**.

1. **Flag ON** → `curl ".../store/sellers/<slug>/checkout-options?..."` (with publishable key) → **Expect:**
   `payment_methods` includes a `stripe`/online card entry (for a Stripe-enabled seller).
2. **Toggle `checkout.stripe_enabled` OFF** in Flagsmith (Production) → repeat the curl → **Expect:** no
   `stripe` entry; no deploy happened.
3. **POST** `.../store/carts/<id>/start-checkout` with `{"provider":"stripe",...}` while OFF → **Expect:**
   HTTP **422**, body `code: "PAYMENT_METHOD_DISABLED"`.
4. **Toggle ON** → repeat → **Expect:** Stripe listed again + checkout proceeds. **(Owed to Daniel:** a
   real card payment still completes when ON.)

---

## Status

- [x] US-1 built · `src/lib/flags.ts`, payment-methods opts, checkout-options + start-checkout (422) wiring
- [x] backend `tsc` + `medusa build` green; `npm run test:unit` → 7 passed (4 new)
- [x] PR [#9](https://github.com/danybgoode/medusa-bonsai-backend/pull/9) **MERGED** to `main` (squash, HIGH-risk, Daniel-authorized) *(backend has no CI/preview — gate was local tsc+build+unit)*
- [x] **Cloud Run secret provisioned** (agent, 2026-06-06): Secret Manager `FLAGSMITH_ENVIRONMENT_KEY` = prod key; `secretAccessor` granted to runtime SA `medusa-run@`; wired into `medusa-web` (rev `00087-7mj`). Image-only deploys preserve it, so it survives the merge deploy.
- [x] Cloud Build deploy triggered on merge (`c3e54c3d`, ~12 min)
- [ ] **Owed to Daniel — post-deploy smoke:** once Cloud Run finishes, toggle `checkout.stripe_enabled` OFF → `checkout-options` omits `stripe` + `start-checkout` returns 422 → toggle ON. *(Toggle touches live prod payments → Daniel's to run when convenient.)*
