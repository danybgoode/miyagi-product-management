# Marketplace communications — Sprint 1: the catalog

**Status:** ⬜ not started

## Stories

### Story 1.1 — The communications catalog
**As a** platform owner, **I want** every message the platform can send declared in one typed place,
**so that** the map of who tells whom what is a fact in the code rather than an afternoon of reading.
**Acceptance:** `lib/notifications/catalog.ts` declares, for every communication: a stable key, the
triggering action in plain language, the actor who causes it, the actor who receives it, its channels,
its event group, and the sender it calls. Adding a communication without a catalog entry fails the
build.
**Risk:** LOW

### Story 1.2 — Population guard
**As a** future agent, **I want** the catalog checked against the real senders, **so that** it cannot
quietly fall behind the code it describes.
**Acceptance:** a spec derives the exported sender names from `lib/email.ts` and fails when one is
missing from the catalog. A sender may be registered as `deliberately_unwired` with a reason, so a
correct state can never be rejected.
**Risk:** LOW

### Story 1.3 — Resolve the two unwired senders ✅ `feat/marketplace-communications`
**As a** seller, **I want** to be told when a buyer walks away, **so that** I stop holding a dead
offer open — and **as a** platform, **I want** no half-built templates left lying around.
**Acceptance:** withdrawing an offer now emails the seller (`sendOfferWithdrawn`, wired into the
`withdraw` branch of `app/api/offers/[id]/buyer-respond/route.ts`); `sendCounterDeclined` is deleted
because no product action can trigger it; the catalog carries the new `offer.withdrawn` entry and the
population guard is green.
**Risk:** LOW

> **Premise corrected during the build.** The epic's D3 originally said to delete *both* senders as
> duplicates. They are not the same case: withdrawal is a real, reachable buyer action that notified
> nobody, so deleting its template would have removed a notification the seller needs. See the
> corrected D3 in the epic README.

### Story 1.4 — `send()` reports three states
**As a** platform owner, **I want** to distinguish "not configured" from "rejected" from "sent",
**so that** a silent non-delivery cannot look like a delivery.
**Acceptance:** `send()` returns `{ ok: true, id }` or `{ ok: false, reason }` where reason is
`unconfigured`, `rejected` or `too_soon`; the dispatch seam still never throws on the request path and
still does not await delivery.
**Risk:** MEDIUM

## Sprint QA
- **api spec(s):** 1.2 → `e2e/communications-catalog-population.spec.ts`; 1.4 →
  `e2e/email-send-result.spec.ts` (each of the three reasons observed).
- **browser smoke owed:** no — nothing user-visible changes this sprint.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

This sprint ships no visible surface; its proof is the gate plus one behavioural check.

1. Make an offer on any listing as a buyer.
   → the buyer confirmation and the seller notification both still arrive, exactly as before. Story
   1.4 changed the return type, not the sending.
2. Deliberately break the catalog locally by deleting one entry and run the suite.
   → `communications-catalog-population` turns red naming the missing key. That is the guard working.

If any step fails, note the step number + what you saw — that's the bug report.
