# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 3: Canonical cutover (crons, UCP checklist, apex/wildcard)

**Status:** ⬜ not started

The skateboard ships: apex + wildcard + UCP + crons move to the new rail. **Live tenant custom
domains stay on Vercel** (whose prod deploys stay ON) until Sprint 4 — the panel re-slice.

## Stories

### Story 3.1 — Cron swap: Cloud Scheduler, rehearsed, exactly-once
**As a** platform operator, **I want** the 4 vercel.json crons (`order-autoconfirm`,
`print-pending`, `domain-lapse-sweep`, `launchpad-campaigns`) as Cloud Scheduler jobs invoking the
same `/api/cron/*` routes via **OIDC direct to the Cloud Run URL** (outside the public edge path),
created disabled, each manually triggered + idempotency re-checked against the dark URL, then
swapped in **one change** (vercel.json cron block removed + jobs enabled), **so that** every cron —
especially the money-path `order-autoconfirm` — fires exactly once throughout.
**Acceptance:** manual-trigger rehearsal green for all 4 (Scheduler fires on demand — LEARNINGS);
after the swap, `order-autoconfirm` observed firing exactly once per schedule (Cloud Run logs +
absence of a Vercel cron invocation). Rollback documented: re-add vercel.json block + disable jobs.
**Risk:** high (money-path cron; ships as its own release before cutover day)

### Story 3.2 — Webhook/CORS allow-lists + full-path staging smoke
**As a** platform operator, **I want** Clerk, Stripe and MercadoPago webhook/CORS settings
allow-listing the new infrastructure, proven by a full-path staging smoke on
`gcp.miyagisanchez.com` including a Stripe test-card checkout, **so that** money and auth flows are
verified on the new path before any real traffic rides it.
**Acceptance:** test-card checkout completes on the staging hostname; the Stripe webhook lands and
the order reaches the seller's order screen; Clerk session works through the full path.
**Risk:** high (payments/auth)

### Story 3.3 — UCP/MCP cutover checklist (named, asserted — not smoke luck)
**As an** AI agent shopping the marketplace, **I want** the UCP surface fully correct on the new
rail — capability manifest accurate, advertised base/origin URLs, checkout-session links, CORS,
canonical-domain behavior — **so that** Rule 3 (agents are first-class) survives the migration.
**Acceptance:** api specs assert `/api/ucp/manifest` contents (URLs point at the canonical domain,
not `*.run.app`), a `/api/ucp/mcp` JSON-RPC round-trip, and a checkout-session creation through the
new path; CORS headers verified for agent origins.
**Risk:** high (load-bearing agent surface)

### Story 3.4 — Cutover: apex + wildcard + `mschz.org` → the new rail
**As a** platform operator, **I want** `miyagisanchez.com`, `*.miyagisanchez.com` and the
`mschz.org` redirector flipped to proxied records targeting the ALB, **so that** canonical traffic
serves from Cloud Run through Cloudflare.
**Acceptance:** all channels serve from the new rail (marketplace, subdomain shop, embed, `/api/ucp/*`);
tenant custom domains still serve from Vercel untouched; rollback = flip the records back (minutes).
**Risk:** high (the flip — Daniel merges + runs the walkthrough)

### Story 3.5 — Monitoring + deploy-finish Telegram on the new rail
**As a** platform operator, **I want** uptime checks + alert policies on the canonical path
(extending the idempotent provisioning script) and the frontend deploy-finish Telegram ping moved
onto the Cloud Build Pub/Sub rail the backend already uses, **so that** the new rail is observable
before the soak starts.
**Acceptance:** `node:test` config guard green (provision script vs live config); a merge produces
the deploy-finish Telegram for the frontend.
**Risk:** low

## Sprint QA
- **api spec(s):** 3.3 → `e2e/api/ucp-cutover.spec.ts` (manifest URLs, MCP round-trip,
  checkout-session); 3.1 → cron auth spec (route rejects unauthenticated, accepts OIDC).
- **browser smoke owed:** **yes, to Daniel — 3.2's test-card checkout and 3.4's cutover walkthrough
  are the money/auth path.**
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green; infra by
  config-guard `node:test`.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (now on the new rail)

1. Open https://miyagisanchez.com in a private window.
   → Marketplace renders; response carries a `cf-ray` header (Cloudflare edge, not Vercel).
2. Open a shop subdomain, e.g. https://<test-shop>.miyagisanchez.com.
   → White-label shop renders, no platform chrome.
3. Open a live tenant custom domain (e.g. the busiest seller's).
   → Still serves — **from Vercel** (unchanged this sprint).
4. Open https://mschz.org/<a-known-short-link>.
   → Redirects exactly as before.
5. Open https://miyagisanchez.com/api/ucp/manifest.
   → URLs inside point at miyagisanchez.com (not `*.run.app`, not Vercel).
6. **(money path — Daniel)** Add an item to cart → checkout as guest → pay with Stripe test card 4242….
   → Order confirmation email arrives; the seller's order screen shows the order.
7. Next morning: check Cloud Run logs for `order-autoconfirm`.
   → Exactly one invocation at the scheduled time; no Vercel cron fired.

If any step fails, note the step number + what you saw — that's the bug report.
