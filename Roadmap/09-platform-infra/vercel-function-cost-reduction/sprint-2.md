# Vercel function & Fluid-CPU cost reduction — Sprint 2: /_not-found cost — Bot Protection + cheap 404

**Status:** ⬜ not started

## Stories
<!-- `/_not-found` is the #1 function by BOTH invocations (1.1K/12h) and Active CPU (1m/12h) — scanners
     hitting dead/deleted URLs, each paying a full Medusa fetch before 404ing, with Bot Protection off. -->

### Story 2.1 — Enable Vercel Bot Protection
**As** the platform, **I want** Vercel's managed Bot Protection turned on (it's currently *Inactive*),
**so that** known bad-bot/scanner traffic is challenged before it invokes functions on dead URLs.
**Acceptance:**
- Firewall → Bot Management shows **Active**.
- After ~a day, Firewall traffic shows scanner requests challenged/denied; `/_not-found` invocations fall.
- **No false-positives on intended surfaces:** the agent/UCP endpoints (`/api/ucp/*`, `/llms.txt`, `/api/ucp/mcp`) and the backend's own Cloud Run cron fetches are NOT challenged (verify on the Firewall traffic view; allow-list if needed).
**Risk:** low (dashboard toggle, reversible). No code.

### Story 2.2 — Short-circuit `notFound()` before the data fetch + cache the 404
**As** the platform, **I want** the dynamic listing/shop routes to 404 *without* an upstream Medusa fetch
when the id/slug is obviously invalid, and to serve the 404 with a cache header, **so that** repeat
scanner hits don't burn Fluid Active CPU on a doomed fetch.
**Acceptance:**
- In `app/l/[id]/page.tsx` and `app/s/[slug]/page.tsx`, a clearly-malformed id/slug calls `notFound()` **before** `getListing`/`getShop` (verify via logs/timing: no Medusa call on a junk URL).
- A valid-but-deleted listing/shop still 404s cleanly (unchanged behaviour), now with a cache header so repeats are served cheaply.
- `/_not-found` Active CPU + invocations drop over a comparable window.
**Risk:** low (404-path only; must not change the rendered 404 or break valid pages).

## Sprint QA
- **api spec(s):** add one `e2e/*.spec.ts` asserting a junk listing/shop URL returns 404 (and, where observable, no upstream fetch) — covers Story 2.2.
- **browser smoke owed:** no (anonymous 404 is testable headlessly). The Bot-Protection traffic confirmation (2.1) is a Daniel dashboard eyeball.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (preview URL while testing pre-merge)

1. Enable Firewall → Bot Management; reload the Firewall traffic view after some time.
   → Bot Protection = Active; scanner traffic challenged; intended agent/UCP surfaces unaffected.
2. `curl -sI https://<preview>/l/this-is-not-a-real-id` (and `/s/not-a-real-shop`).
   → HTTP 404 + a cache header; backend logs show **no** Medusa fetch for the junk id.
3. Open a real listing + a real shop.
   → still render normally (no regression).
4. Vercel → Observability → Functions (next day): `/_not-found` invocations + Active CPU down.
   → confirmed drop.

If any step fails, note the step number + what you saw — that's the bug report.
