# Retrospective — Domain-coupon mint fix

**Shipped:** 2026-06-23 · 2 sprints · area 07-agentic-and-federated-commerce · risk high (live coupon mint).
**PRs:** #118 (S1 unmask/harden, `cc73a26`) · #119 (`bad_request` param surfacing, `cf1cf8f`) · #120 (S2.1 name fix, `68af03f`).

## What shipped
A follow-up bug-fix to custom-domain-paywall S3: the admin tool that mints the World-Cup campaign coupon
`miyagisan` (custom-domain subscription, year-1 free, capped at 100) failed on prod with a generic
*"No se pudo crear el cupón."* — and the failure was **masked twice**, so the real cause was invisible.

- **S1.1** — `findCoupon()` swallowed every Stripe error to `null`, making a broken key indistinguishable
  from "coupon not minted yet"; the route returned a blanket message. Fixed: a pure, Stripe-SDK-free
  classifier (`lib/domain-coupon.ts`: `classifyStripeFailure` / `isResourceMissing` / `describeStripeFailure`)
  maps only a real resource-missing to null and surfaces auth/permission/connection/rate-limit/bad-request
  as a sanitized `{error, kind, detail}` that never echoes the key.
- **S1.2** — *Actualizar* always renders a definite state (no more silent no-op).
- **S1.3** — the diagnostic. The merged S1.1 surfacing + a follow-up `bad_request` enhancement (#119,
  exposing `param` + Stripe's safe param-validation `message`) made one prod *Crear cupón* click reveal
  the **real root cause**.
- **S1.4** — `e2e/domain-coupon.spec.ts` (api, 11 pure tests): the error classifier + the cap-of-100
  boundary + a coupon-name-length invariant.
- **S2.1** — the actual fix: the coupon **display name was 46 chars**, over Stripe's **40-char `name`
  limit**, so `coupons.create` threw `StripeInvalidRequestError`/`param: name` and 502'd before the promo
  code. Shortened to *"Dominio propio — primer año gratis"* (34 chars); extracted to `CAMPAIGN_COUPON_NAME`
  + `STRIPE_COUPON_NAME_MAX` with a CI guard. No economics change.
- **S2.2 / S2.3** — Daniel minted the live coupon; it reads **0/100 · activo** and is present in the Stripe
  live dashboard. The giveaway is redeemable.

## What went well
- **Surface, don't guess — on a money path especially.** The first hypothesis (the `promotion:{type,coupon}`
  promotion-code shape, from a LEARNINGS note) was *wrong*. Because S1 made the tool surface the real
  `param`/`message` instead of acting on a hunch, one cheap prod click named the true culprit (`name` too
  long) and we fixed the right thing the first time. The whole epic is a case study in "instrument the
  failure before you patch it."
- **The diagnostic loop was tight.** S1 merged → Daniel clicked → `kind:"unknown"`/`StripeInvalidRequestError`
  told us "not creds, malformed request" → #119 surfaced `param` → Daniel clicked → `param:name`/"40
  characters" → #120 fixed → Daniel minted. Each round-trip was ~10 seconds of Daniel's time and certain.
- **Cross-review + CI on every PR.** Codex flagged a real nit on #118 (the `sk_live…` mode hint) and gave
  #120 a clean pass; CI (tsc + build + Playwright api vs preview) gated all three.
- **Honest gap-stating.** The `STRIPE_SECRET_KEY` mode/scope was genuinely unreadable (Vercel *Sensitive*,
  production-only) — said so rather than faking a check; the self-surfacing UI error closed it instead.

## What we learned (promoted to LEARNINGS.md)
1. **A Stripe Coupon `name` is hard-capped at 40 chars** — exceed it and `coupons.create` throws
   `StripeInvalidRequestError`/`param: name`, *before* anything else in a multi-step mint. Keep money-infra
   string fields under their provider limits and guard the invariant in CI.
2. **On a money path, instrument the failure before you patch it.** A swallow-everything `catch` that maps
   every error to a benign empty state hides the one fact you need; surface a *classified, sanitized* cause
   (`kind` + safe `type`/`code`/`param`/message) and let one real click name the bug — cheaper and more
   certain than guessing from a prior. A LEARNINGS note ("the v22 `promotion` hash") is a *hypothesis to
   test*, not a diagnosis.
3. **Distinguish credential failures from request failures.** `401/authentication`→key, `403`→scope,
   `invalid_request`/`param`→**your params, not the key**. Lumping them as "unknown" sends the operator to
   the wrong fix (we nearly re-scoped Sprint 2 as a "creds fix").
4. **A Vercel _Sensitive_ env var is write-only** — unreadable by `vercel env pull` or the REST API
   (`has_inline_value:false`), and it's per-environment (this key was production-only, so Preview had none).
   You can confirm *presence/target/type* via the v9 `…/env` API but not the value; for a sensitive secret's
   mode/scope, read the provider dashboard or let the app surface it.

## Gaps / owed
- **Optional, not blocking:** one real card redemption end-to-end ($0 year-1 → $499/yr renewal → counter
  1/100). A Stripe test card can't redeem a live coupon, so full proof is a real-money click owed to Daniel.
- **S1.4's test-mode card-4242 rehearsal was skipped** — the bug was a deterministic name-length error, not
  mode-dependent, so we validated on prod via the live n/100 read instead. Stated, not glossed.

## Process notes
- The shared root planning tree got switched to a sibling's branch mid-session; a path-limited doc commit
  landed on the wrong branch. Fixed via a temporary `main` worktree (cherry-pick + push) + restoring the
  sibling's tip. **Do root doc commits in a dedicated worktree** when other planning sessions are live.
