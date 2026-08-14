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

### Story 1.3 — Delete the two unwired senders
**As a** buyer, **I want** the platform not to carry half-built messages, **so that** nobody wires
them up later and sends me mail nobody designed.
**Acceptance:** `sendCounterDeclined` and `sendOfferWithdrawn` are removed; nothing referenced them;
the offer flow's behaviour is unchanged.
**Risk:** LOW

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
