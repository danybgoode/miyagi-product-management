# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 2: Cloudflare edge + GCP origin

**Status:** ⬜ not started

Traffic still 100% on Vercel. This sprint stands up the new edge + origin path and proves it on a
staging hostname. The NS flip happens here — decoupled from the traffic cutover (records keep
pointing at Vercel).

## Stories

### Story 2.1 — Cloudflare zone staged from the real Vercel zone export → NS flip
**As a** platform operator, **I want** the `miyagisanchez.com` zone staged in Cloudflare from the
real Vercel zone export — Clerk + all 3 email systems verified record-by-record — then the NS
flipped with every record still targeting Vercel (apex/wildcard **DNS-only**, not proxied),
**so that** DNS moves without touching traffic.
**Acceptance:** scripted zone-diff (export vs staged) shows zero missing records; post-flip
`dig @<assigned>.ns.cloudflare.com` returns the staged values; Clerk login works; a test email
round-trips on each mail system. *(LEARNINGS scar tissue: the zone does NOT auto-import; a `dig`
export misses DKIM/SPF — use the provider's zone export.)*
**Risk:** high (DNS/auth/email blast radius — Daniel executes the walkthrough personally)

### Story 2.2 — External ALB + serverless NEG + origin certs + header passthrough
**As a** platform operator, **I want** a GCP external ALB (serverless NEG → `miyagi-web`, **no
Cloud CDN**) terminating TLS with one-time Cloudflare Origin CA certs (apex + `*.miyagisanchez.com`
+ the SSL-for-SaaS fallback-origin hostname), ingress locked to Cloudflare, and a proxied staging
hostname `gcp.miyagisanchez.com` flowing end-to-end, **so that** the full
Cloudflare→ALB→Cloud Run path exists before any real traffic rides it.
**Acceptance:** `https://gcp.miyagisanchez.com` serves the app through the full path;
header-passthrough api spec proves `Host`/`X-Forwarded-For`/`X-Forwarded-Proto` reach the app and
`detectChannel()` classifies marketplace / subdomain / custom-domain / embed hosts correctly;
direct-to-LB requests (bypassing Cloudflare) are refused.
**Risk:** high (shared infra)

### Story 2.3 — WAF/bot parity with Vercel Bot Protection
**As a** platform operator, **I want** Cloudflare WAF/bot rules matching what Vercel's firewall
mitigates today (probe paths like `/l/wp-admin` → 403 at the edge), **so that** cutover doesn't
newly expose the app to bot traffic Vercel was absorbing.
**Acceptance:** the existing bot-probe spec shape passes against `gcp.miyagisanchez.com` with the
new mitigation evidence (Cloudflare's equivalent of `x-vercel-mitigated`).
**Risk:** low

## Sprint QA
- **api spec(s):** 2.2 → `e2e/api/origin-header-passthrough.spec.ts` (channel detection per host);
  2.3 → update the bot-probe spec for the new edge.
- **browser smoke owed:** **yes, to Daniel — Story 2.1 is the auth/email blast-radius step**
  (Clerk login + email round-trip after the NS flip).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green; infra stories
  gated by idempotent-script + `node:test` config guard (not Playwright — LEARNINGS pattern).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: staging hostname https://gcp.miyagisanchez.com · prod traffic still on Vercel.

1. Run `dig NS miyagisanchez.com` after the flip.
   → The two assigned Cloudflare nameservers; no Vercel NS.
2. Sign out and back in at https://miyagisanchez.com. **(auth path — Daniel personally)**
   → Clerk login works exactly as before the NS flip.
3. Send yourself a test email through each of the 3 mail systems. **(email path — Daniel personally)**
   → All three deliver.
4. Open https://gcp.miyagisanchez.com in a private window.
   → The marketplace renders through Cloudflare→ALB→Cloud Run (check `cf-ray` header present).
5. `curl -s -o /dev/null -w '%{http_code}' https://gcp.miyagisanchez.com/l/wp-admin`
   → 403 (edge mitigation active).

If any step fails, note the step number + what you saw — that's the bug report.
