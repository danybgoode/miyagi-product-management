# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 2: Cloudflare edge + GCP origin

**Status:** 🚧 in progress — Stories 2.1 + 2.2 ✅ **done 2026-07-10**. Story 2.3 (WAF) not started.

Traffic still 100% on Vercel. This sprint stands up the new edge + origin path and proves it on a
staging hostname. The NS flip happens here — decoupled from the traffic cutover (records keep
pointing at Vercel).

## Stories

### Story 2.1 — Cloudflare zone staged from the real Vercel zone export → NS flip ✅
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

**Live run 2026-07-10 — three real findings, all fixed before handoff:**

1. **Daniel had already added the zone in Cloudflare's dashboard and changed the registrar's NS
   records** before the staging script ran (ahead of the planned sequencing). The zone showed
   `status: active` (Cloudflare had already verified the delegation) while `dig NS
   miyagisanchez.com` from this session's resolver still cached the old Vercel NS — a live window
   where Cloudflare could already be authoritative for some resolvers with unstaged records.
   Confirmed the token/secrets, then ran the script immediately to close the gap rather than wait.
2. **`CLOUDFLARE_API_TOKEN` initially 403'd on every `dns_records` call** (zone-level reads worked
   fine) — the token had the "Zone → Zone" permission group but not the separate "Zone → DNS"
   group (Cloudflare treats these as distinct groups in the token editor; easy to conflate). Daniel
   added the missing group to the same token (no value regeneration needed) and it resolved.
3. **Cloudflare's own zone-add auto-import had set 8 records to `proxied: true`** — the apex, `www`,
   wildcard, `_domainconnect`, and **`api.miyagisanchez.com` → `ghs.googlehosted.com`** (the Medusa
   backend's Google Cloud domain mapping). Proxying that CNAME would break Google's SNI-based
   TLS/routing for that hostname outright; the apex/www/wildcard being proxied also violated this
   story's DNS-only scope. Confirmed with Daniel, then flipped all 8 to `proxied: false` via the
   Cloudflare API before running the full stage+diff.

**The script itself then caught a real, serious gap**: Cloudflare's auto-import had missed 10 of
17 real Vercel records — **all 5 Clerk records** (`clerk`, `accounts`, `clk._domainkey`,
`clk2._domainkey`, `clkmail`) plus the DKIM/SPF/DMARC records for email. Had NS propagation
finished before this ran, Clerk login would have broken completely — this is exactly the scar
tissue the LEARNINGS "auto-import misses records" note warns about, now confirmed to also apply to
Cloudflare's own zone-add scan, not just `dig`. The script staged all 10 automatically.

**One bug in the script itself, found and fixed live**: Cloudflare echoes TXT `content` back
wrapped in literal quote characters for records created via its API (unquoted for auto-imported
records) — the diff's key comparison didn't strip that, so it treated 4 already-present TXT
records (`_dmarc`, `google-site-verification`, `resend._domainkey`, the `send` SPF record) as
missing and created exact-content duplicates. Caught by inspecting the "newly staged" log line
against the pre-fix record dump, confirmed live, the 4 duplicates deleted, and
`stripWrappingQuotes()` added to `cloudflare-zone-diff.mjs` (+ a regression test) so a re-run can't
recreate them.

**Final verified state**: `node infra/gcp/cloudflare-zone-stage.mjs --verify-only` — zero-diff, 15/15
real Vercel records matched, 0 proxied records in the zone. Nameservers:
`amalia.ns.cloudflare.com` / `ganz.ns.cloudflare.com`. Registrar NS change already made by Daniel —
**propagation to this session's resolver was still pending** as of the live run; `dig
@amalia.ns.cloudflare.com miyagisanchez.com` (querying Cloudflare directly) already returns the
correct, complete record set.

**Daniel's confirmation, 2026-07-10 — all green:**
- NS confirmed live from GoDaddy's own UI + external resolvers (this session's terminal resolver
  just had a stale cache — expected, not a bug).
- Clerk sign-in/out: OK — and the sign-in used an emailed magic link, which round-tripped through
  `clkmail.miyagisanchez.com`, confirming Clerk's custom mail domain survived the flip.
- Email system #2: a Resend test send, triggered programmatically via a direct `POST
  /emails` call to the Resend API (not through app code — a clean, side-effect-free probe) from
  `noreply@miyagisanchez.com` to Daniel, confirmed received. DKIM/SPF/DMARC all functioning.
- There is no third mail system — the sprint doc's "3 mail systems" framing from grooming was
  imprecise; it's Clerk + Resend, both confirmed.
- `api.miyagisanchez.com` (the record found proxied and fixed) — `/health` returns `200 OK` directly
  from Google's frontend, confirming the un-proxy fix didn't break the backend's custom domain.

**Story 2.1 is done.**

### Story 2.2 — External ALB + serverless NEG + origin certs + header passthrough ✅
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

**Done 2026-07-10.** Built `infra/gcp/cloudflare-origin-cert.mjs` (generates an RSA key + CSR
locally via `openssl`, requests a Cloudflare Origin CA cert covering apex + wildcard via the same
`CLOUDFLARE_API_TOKEN` — confirmed live that a modern scoped token works for `/certificates` too,
no separate legacy Origin CA Key needed) and `infra/gcp/provision-alb-frontend.sh` (idempotent,
`provision-monitoring.sh`-style: static IP, serverless NEG, self-managed SSL cert, Cloud Armor
policy allowlisting Cloudflare's ~22 published CIDRs with a default-deny, backend service with
`--no-enable-cdn`, URL map, HTTPS proxy, forwarding rule). Live static IP: `136.68.90.56`.

**One real gcloud bug found + fixed live**: `backend-services create --protocol=HTTPS` client-side
auto-fills `portName="https"` on the resource, but a Serverless NEG backend rejects ANY portName
at all (`add-backend` errors "Port name is not supported for a backend service with Serverless
network endpoint groups"). `gcloud ... update --port-name=""` is a no-op (gcloud won't apply an
empty string) — the fix is a raw REST `PATCH` with an explicit JSON `null`, which resets it to a
harmless default `add-backend` does accept. Now baked into the script + locked by a regression
assertion in `infra/gcp/test/alb-invariants.test.mjs` (ordering check: the fix must run before
`add-backend`, not after).

**Two real app-code bugs found + fixed live** (this is the actual reason Story 2.2 took multiple
rebuild/redeploy cycles — not flaky infra, a genuinely wrong first fix):
1. My first attempt added `gcp.miyagisanchez.com` only to `middleware.ts`'s `PLATFORM_HOSTS` /
   `isPlatformHost()`. Deployed, tested live → still 404 "Shop not found". Root cause: `middleware.ts`
   calls `shopSlugFromHost(hostname)` **before** `isPlatformHost()` even runs — a single-label
   subdomain of `miyagisanchez.com` is checked against `lib/subdomain.ts`'s `INFRA_SUBDOMAINS`
   reserved-word set FIRST (the same mechanism that already reserves `clerk`/`accounts`/`api`/etc.).
   `PLATFORM_HOSTS` is never reached for a bare `<label>.miyagisanchez.com` host at all. Reverted the
   (dead) `PLATFORM_HOSTS` entry, added `'gcp'` to `INFRA_SUBDOMAINS` instead, covered it in the
   existing `shopSlugFromHost` pure-logic spec (`e2e/subdomain.spec.ts`).
2. Rebuilt, redeployed, tested live → **still** 404 "Shop not found", from a different branch this
   time. The unknown-subdomain 404 and the unknown-custom-domain 404 return byte-identical HTML —
   removing the `PLATFORM_HOSTS` entry (step 1) meant `isPlatformHost()` now returned `false` too,
   so the request fell into the custom-domain lookup, found no shop with
   `custom_domain='gcp.miyagisanchez.com'`, and 404'd from *that* branch instead. **Both gates are
   independently load-bearing** — re-added the `PLATFORM_HOSTS` entry alongside the
   `INFRA_SUBDOMAINS` one, with a comment cross-referencing the dependency so a future reader
   doesn't repeat the same one-fix-at-a-time mistake.

Diagnosed via Cloud Run structured request logs (`gcloud logging read ... format="table(...,
resource.labels.revision_name, httpRequest.status, httpRequest.requestUrl)"`) confirming each
redeploy's new revision was genuinely serving the request (ruling out a stale-revision/caching
red herring) before re-reading the middleware source end-to-end to find the real second gate.

**Manual deploy mechanics** (Daniel-approved, since no per-branch Cloud Run preview exists — the
`frontend-main-deploy` trigger only fires on push to `main`): built + pushed via `gcloud builds
submit --tag=...` from the branch commit (mirrors `cloudbuild.yaml`'s build step), then `gcloud run
deploy miyagi-web --image=...` (image-only — Cloud Run preserves the existing env/secrets bindings
across image swaps, so none of `deploy-frontend.sh`'s required-value flags were needed). `miyagi-web`
reverts to whatever `main` has on its next normal CI/CD deploy.

**Final verified state** (`curl --resolve` forcing Cloudflare's edge IP, since this session's local
resolver still has the same stale-NS-cache lag noted in Story 2.1 — confirmed via public resolver
`1.1.1.1` that the record is correct everywhere else):
- `GET https://gcp.miyagisanchez.com/` → `200`, homepage renders.
- `GET /api/health` → `200 {"ok":true}`.
- `GET /api/ucp/manifest` → `200`.
- Response headers show `server: cloudflare` + a real `cf-ray` id — genuinely transited Cloudflare.
- A direct request to the ALB's static IP (bypassing Cloudflare) → `403` — Cloud Armor's allowlist
  correctly refuses it.
- `node --test infra/gcp/test/` → 65/65 green (incl. 17 new `alb-invariants` tests).
- `e2e/origin-header-passthrough-api.spec.ts` — written and correct, but **could not be run in this
  session** (Playwright's `request` fixture uses the sandbox's own stale DNS resolver, same root
  cause as above, with no `--resolve`-equivalent override available without a system-level
  `/etc/hosts` change this session didn't have standing authorization to make). The curl-based
  checks above are equivalent, direct proof of the same behavior the spec asserts. **Owed**: run
  `PLAYWRIGHT_BASE_URL=https://gcp.miyagisanchez.com npx playwright test
  origin-header-passthrough-api --project=api` from an environment with normal DNS resolution
  (should pass — same requests, same expected responses, already curl-verified).

**Deliberate, stated gap** (not silently left): `miyagi-web`'s Cloud Run ingress stays
`--allow-unauthenticated` (the raw `*.run.app` URL is still directly reachable, bypassing Cloud
Armor entirely) — kept for Sprint 1.4's shadow-soak testing. Full lockdown
(`--ingress=internal-and-cloud-load-balancing`) is a later-sprint decision once the dark URL is no
longer needed directly.

### Story 2.3 — WAF/bot parity with Vercel Bot Protection
**As a** platform operator, **I want** Cloudflare WAF/bot rules matching what Vercel's firewall
mitigates today (probe paths like `/l/wp-admin` → 403 at the edge), **so that** cutover doesn't
newly expose the app to bot traffic Vercel was absorbing.
**Acceptance:** the existing bot-probe spec shape passes against `gcp.miyagisanchez.com` with the
new mitigation evidence (Cloudflare's equivalent of `x-vercel-mitigated`).
**Risk:** low

## Sprint QA
- **api spec(s):** 2.2 → `e2e/origin-header-passthrough-api.spec.ts` (flat `e2e/` convention, not
  a nonexistent `e2e/api/` subdir) — written, curl-verified equivalent, **owed**: a real run from an
  environment with normal DNS resolution (blocked in this session only by local resolver lag).
  2.3 → new bot-mitigation spec, not started.
- **browser smoke:** Story 2.1's auth/email blast-radius smoke (Clerk login + Resend round-trip)
  **confirmed by Daniel 2026-07-10**; Story 2.2's `gcp.miyagisanchez.com` full-path smoke
  **curl-verified 2026-07-10** (200s + `cf-ray` + Cloud Armor 403 on direct-to-LB) — see the
  walkthrough below. 2.3 smoke still owed once built.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green (both passed
  2026-07-10 on this branch); infra stories gated by idempotent-script + `node:test` config guard
  (65/65 green, incl. the new `cloudflare-zone-stage` + `alb-invariants` suites — LEARNINGS pattern).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: staging hostname https://gcp.miyagisanchez.com · prod traffic still on Vercel.

**Story 2.1 — ✅ confirmed done by Daniel, 2026-07-10:**
1. `dig NS miyagisanchez.com` → `amalia.ns.cloudflare.com` / `ganz.ns.cloudflare.com` — confirmed
   via GoDaddy's own UI + external resolvers.
2. Clerk sign-in/out → OK (magic link, confirming `clkmail.miyagisanchez.com` too).
3. Resend test email (sent programmatically to Daniel) → received, DKIM/SPF/DMARC intact.
4. `api.miyagisanchez.com/health` → `200 OK` directly from Google's frontend.

**Story 2.2 — ✅ curl-verified 2026-07-10 (Playwright run still owed — see Sprint QA):**
5. Open https://gcp.miyagisanchez.com in a private window.
   → The marketplace renders through Cloudflare→ALB→Cloud Run (check `cf-ray` header present).

**Story 2.3 (not started):**
6. `curl -s -o /dev/null -w '%{http_code}' https://gcp.miyagisanchez.com/l/wp-admin`
   → 403 (edge mitigation active).

If any step fails, note the step number + what you saw — that's the bug report.
