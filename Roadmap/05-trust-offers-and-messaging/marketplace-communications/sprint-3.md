# Marketplace communications — Sprint 3: see every email, first-hand

**Status:** 🟨 code shipped `1ed0b44` (#367) — inbox verification owed to Daniel

## Stories

### Story 3.1 — A fixture render for every template ✅ `1ed0b44`
**As a** platform owner, **I want** each message rendered with realistic sample data, **so that** a
sample email looks like the real thing instead of `{{undefined}}`.
**Acceptance:** every registered email template has a fixture that renders without throwing; a
template added without a fixture fails the suite.
**Risk:** LOW

### Story 3.2 — Allow-listed sample send ✅ `1ed0b44`
**As a** platform owner, **I want** to send myself any message on demand, **so that** I can see
exactly what a merchant or a buyer receives.
**Acceptance:** each row in `/admin/comunicaciones` offers "Enviarme esta"; the recipient is chosen
from a fixed list of three addresses held as a compile-time constant; a caller-supplied address is
refused, not adopted; the subject carries a `[PRUEBA]` prefix and the body names the template key.
**Risk:** MEDIUM

### Story 3.3 — Deliver all of them, and see them ⬜ OWED TO DANIEL
**As a** platform owner, **I want** proof that every template actually arrives, **so that** email is
a foundation I can trust rather than one that compiles.
**Acceptance:** every registered communication has been sent from `/admin/comunicaciones` and seen in
a real inbox; any template Resend rejects is fixed and re-sent, not excused.
**Risk:** LOW

> **Scope corrected at build time.** The story originally asked for a Resend id recorded per
> template. The route cannot supply one: the 62 senders are fire-and-forget by contract and return no
> transport result, so it reports `dispatched`, not `delivered`. Rather than fabricate evidence, the
> proof is the inbox — which makes this a human step by construction. All 61 fixtures exist and every
> row has a one-click send; what remains is looking.

## Sprint QA
- **api spec(s):** 3.1 → `e2e/communications-fixtures.spec.ts`; 3.2 →
  `e2e/sample-send-allowlist.spec.ts` (a caller-supplied recipient is refused).
- **browser smoke owed:** **yes, to Daniel** — 3.3 is inbox verification, which only a human holding
  the mailbox can do.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com/admin/comunicaciones

1. Pick any row and click **Enviarme esta**, choosing `danielvp1987@gmail.com`.
   → the page reports sent, with a Resend id.
2. Open that inbox.
   → the email is there, subject prefixed `[PRUEBA]`, body naming the template key, and it renders
   properly — not a wall of raw HTML, no empty placeholders.
3. Repeat for one message of each actor pairing: platform→buyer, platform→seller, seller→buyer,
   platform→admin.
   → all four arrive, and each reads as the right message for that audience.
4. Try to send to an address that is not on the list, by editing the request.
   → it is refused.

If any step fails, note the step number + what you saw — that's the bug report.
