# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 2: Cloudflare edge + GCP origin

**Status:** 🚧 in progress — Story 2.1 built + unit-tested, live staging run pending a Cloudflare
API token from Daniel.

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

**Built 2026-07-09** — `infra/gcp/cloudflare-zone-stage.mjs` (+ pure diff/normalize logic in
`infra/gcp/lib/cloudflare-zone-diff.mjs`, unit-tested in
`infra/gcp/test/cloudflare-zone-stage.test.mjs`, 11/11 green, no live API calls). Pulls the REAL
Vercel export via `GET /v4/domains/miyagisanchez.com/records` (not `dig`), create-if-absent zone +
create-if-absent per-record into Cloudflare (`proxied: false` — DNS-only, matches the story's
scope), then re-fetches and diffs record-for-record — exits non-zero on any missing record before
ever printing nameservers.

**Blocked on a live credential, not yet run live**: `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID` Secret Manager shells created empty in `miyagisanchezback-497722` — Daniel
confirmed he already has a Cloudflare account for the domain but the actual scoped token hasn't
been generated/stored yet. Needed scopes: **Zone → DNS → Edit**, **Zone → Zone → Read**,
**Zone → SSL and Certificates → Edit** (the last one is for Story 2.2's Origin CA cert, not needed
until then, but simplest to provision once). Once the token is in Secret Manager, run:
```
node infra/gcp/cloudflare-zone-stage.mjs
```
— it stages the zone, prints the diff result, and prints the two assigned nameservers for the walk
through below. **Only after that succeeds** does Daniel run the NS-flip steps personally.

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
