# Golden Frijoles integration — Sprint 2: everything on except Envía

**Status:** ⬜ not started

## Stories

### Story 2.1 — Derive the live-vs-target flag diff
**As a** platform owner, **I want** to see exactly which flags differ from the target state, **so
that** the flip is a reviewed list rather than a blind sweep.
**Acceptance:** `npm run flags:inventory` prints, for all 41 flags, the live Golden value beside the
target value and marks each row `match` / `needs-flip` / `unavailable`. An unreachable Golden prints
`unavailable` for every row and exits non-zero — it never prints a confident `match`.
**Risk:** LOW

### Story 2.2 — Bulk activation in `/admin/flags`
**As a** platform owner, **I want** one action that brings every flag to target, **so that** I do not
click 38 toggles and miss one.
**Acceptance:** `/admin/flags` shows a "Poner todo en el estado objetivo" action listing what it will
change before it changes anything; confirming it activates each differing flag through Golden's
admin API carrying my real Clerk actor id; the result reports per-flag changed/unchanged/failed, and
a partial run reports *partial*, never success. Envía is absent from the change list.
**Risk:** HIGH

### Story 2.3 — Assert `rules: []` across the live snapshot
**As a** platform owner, **I want** proof that "on" means on for everyone, **so that** a targeting
rule cannot quietly reduce a flag to a subset of tenants.
**Acceptance:** a spec reads the live Golden snapshot and fails if any Miyagi flag carries a non-empty
`rules` array; the flag inventory output shows a `rules` column that reads `0` for all 41.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 2.1 → `e2e/flag-inventory-target.spec.ts` (pure target-map + diff shaping);
  2.3 → `e2e/flag-rules-empty.spec.ts`.
- **browser smoke owed:** **yes, to Daniel** — Story 2.2's bulk activation is an authenticated admin
  mutation against the live control plane and cannot run from an anonymous smoke.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/admin/flags
   → the table lists 41 flags with their live values and the snapshot version.
2. Click **Poner todo en el estado objetivo**, and read the confirmation list before confirming.
   → the list names every flag that will change and does **not** contain
   `shipping.envia_enabled`. **Owed to Daniel — this is the authenticated control-plane mutation.**
3. Confirm.
   → the result reports each flag changed or unchanged, and the snapshot version advances.
4. Reload the page.
   → every flag except `shipping.envia_enabled` reads ON, and Envía reads OFF.
5. Open https://miyagisanchez.com/mx and buy nothing — just browse.
   → the marketplace still renders. Several flags that were OFF are now ON; this confirms none of
   them broke the buyer surface.

If any step fails, note the step number + what you saw — that's the bug report.
