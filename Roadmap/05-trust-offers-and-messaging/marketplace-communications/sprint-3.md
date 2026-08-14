# Marketplace communications — Sprint 3: see every email, first-hand

**Status:** ⬜ not started

## Stories

### Story 3.1 — A fixture render for every template
**As a** platform owner, **I want** each message rendered with realistic sample data, **so that** a
sample email looks like the real thing instead of `{{undefined}}`.
**Acceptance:** every registered email template has a fixture that renders without throwing; a
template added without a fixture fails the suite.
**Risk:** LOW

### Story 3.2 — Allow-listed sample send
**As a** platform owner, **I want** to send myself any message on demand, **so that** I can see
exactly what a merchant or a buyer receives.
**Acceptance:** each row in `/admin/comunicaciones` offers "Enviarme esta"; the recipient is chosen
from a fixed list of three addresses held as a compile-time constant; a caller-supplied address is
refused, not adopted; the subject carries a `[PRUEBA]` prefix and the body names the template key.
**Risk:** MEDIUM

### Story 3.3 — Deliver all of them, and record the evidence
**As a** platform owner, **I want** proof that every template actually arrives, **so that** email is
a foundation I can trust rather than one that compiles.
**Acceptance:** every registered email template has been delivered to a real inbox with its Resend id
recorded in the sprint doc; any template Resend rejects is fixed and re-sent, not excused.
**Risk:** LOW

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
