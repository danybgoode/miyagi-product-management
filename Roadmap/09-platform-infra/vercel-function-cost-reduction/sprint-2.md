# Vercel function & Fluid-CPU cost reduction — Sprint 2: /_not-found cost — Bot Protection + cheap 404

**Status:** ✅ Story 2.2 (cheap cached 404) **MERGED to `main`** via [frontend PR #92](https://github.com/danybgoode/miyagisanchezcommerce/pull/92) (squash `db3c0a3`) → live on Vercel prod; CI green (incl. Playwright-vs-preview HTTP assertions) + antigravity cross-review clean. Story 2.1 (Bot Protection dashboard toggle) is **owed to Daniel** — flagged in the PR, no code.

## Stories
<!-- `/_not-found` is the #1 function by BOTH invocations (1.1K/12h) and Active CPU (1m/12h) — scanners
     hitting dead/deleted URLs, each paying a full Medusa fetch before 404ing, with Bot Protection off. -->

### Story 2.1 — Enable Vercel Bot Protection 🔲 owed to Daniel (dashboard toggle, no code)
**As** the platform, **I want** Vercel's managed Bot Protection turned on (it's currently *Inactive*),
**so that** known bad-bot/scanner traffic is challenged before it invokes functions on dead URLs.
**Acceptance:**
- Firewall → Bot Management shows **Active**.
- After ~a day, Firewall traffic shows scanner requests challenged/denied; `/_not-found` invocations fall.
- **No false-positives on intended surfaces:** the agent/UCP endpoints (`/api/ucp/*`, `/llms.txt`, `/api/ucp/mcp`) and the backend's own Cloud Run cron fetches are NOT challenged (verify on the Firewall traffic view; allow-list if needed).
**Risk:** low (dashboard toggle, reversible). No code.

### Story 2.2 — Short-circuit `notFound()` before the data fetch + cache the 404 ✅ `fc53557` (PR #92)
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
Env: production · https://miyagisanchez.com (Story 2.2 is live; 2.1 pending Daniel's toggle)

1. Enable Firewall → Bot Management; reload the Firewall traffic view after some time.
   → Bot Protection = Active; scanner traffic challenged; intended agent/UCP surfaces unaffected.
2. `curl -sI https://miyagisanchez.com/l/wp-admin` (and `/s/Not-A-Real-Shop`).
   → HTTP 404 + `Cache-Control: public, s-maxage=86400` (served by middleware, before the page function — body is the bare "Not found.", not the branded page). Backend logs show **no** Medusa fetch for the junk id.
3. Open a real listing + a real shop; also hit a well-formed-but-deleted id (e.g. `/l/prod_00000000000000000000000000`).
   → reals render normally; the deleted id still 404s cleanly through the page (no regression).
4. Vercel → Observability → Functions (next day): `/_not-found` invocations + Active CPU down.
   → confirmed drop.

If any step fails, note the step number + what you saw — that's the bug report.
