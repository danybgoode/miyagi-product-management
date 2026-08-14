# Tenant lifecycle — Sprint 1: the status primitive

**Status:** ⬜ not started

## Stories

### Story 1.1 — `status` on the Medusa seller
**As a** platform, **I want** a shop's lifecycle state to live on the commerce primitive every read
already resolves through, **so that** "paused" is one fact instead of a flag some consumers honour.
**Acceptance:** the `seller` model carries `status: 'active' | 'paused' | 'deleted'` defaulting to
`'active'`; the migration is applied live; every existing seller reads `active`; an unrecognised
value is refused at the seam rather than coerced.
**Risk:** LOW

### Story 1.2 — Internal status-transition route
**As an** admin surface, **I want** one authenticated route that changes a shop's status, **so that**
the mutation happens in Medusa and the mirror follows.
**Acceptance:** `POST /internal/sellers/:id/status` accepts a target status and a reason, is gated by
`MEDUSA_INTERNAL_SECRET`, and **503s when that secret is unset** — never authorizes. It validates the
whole transition before it writes anything, so a rejected transition leaves no partial state.
**Risk:** HIGH

### Story 1.3 — The pause/unpause channel-link ledger
**As a** platform owner, **I want** unpausing to restore exactly what pausing removed, **so that**
resuming an owned-shop-only merchant does not publish its private catalog to the marketplace.
**Acceptance:** pausing records every `(product_id, sales_channel_id)` pair it unlinks into
`seller.metadata.paused_channel_links`; unpausing replays that exact set and clears it; a seller with
owned-shop-only products ends up, after pause→unpause, with byte-identical channel membership to
before.
**Risk:** HIGH

## Sprint QA
- **api spec(s):** 1.2 → `src/api/internal/sellers/__tests__/status-route.unit.spec.ts` (validate-
  before-write ordering asserted via a write-trace, and the unset-secret refusal); 1.3 →
  `src/lib/__tests__/paused-channel-links.unit.spec.ts` (pure plan + round-trip identity).
- **browser smoke owed:** no — nothing is reachable from a browser this sprint.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + the unit suite green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production API · https://api.miyagisanchez.com

1. After the migration is applied, read any seller through the internal seller route.
   → it carries `status: "active"`. Every pre-existing shop reads active; none read null.
2. Call the status route with no internal secret configured on the caller.
   → it refuses with 503. **It must not authorize.**
3. Call it with an invalid target status, e.g. `suspended`.
   → it refuses with 400, and re-reading the seller shows the status unchanged.

If any step fails, note the step number + what you saw — that's the bug report.
