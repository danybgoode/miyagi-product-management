# Sprint 3 — Edge cache: origin probe + a scoped Cloudflare Cache Rule

**Epic:** [Deploy pipeline tuning](README.md) · **Risk:** MED — Daniel sign-off before the Cache Rule goes live

**Status:** ✅ BUILT + LIVE 2026-07-13. Daniel added the missing "Cache Rules"
permission to the `CLOUDFLARE_API_TOKEN`, then gave the explicit go — the rule is provisioned in
prod and verified (see S3.2 below). PR [danybgoode/miyagi-product-management#85](https://github.com/danybgoode/miyagi-product-management/pull/85),
ready for review — **awaiting Daniel's merge** (MED tier, not auto-mergeable on green CI).

11 frontend routes already use `export const revalidate = N`, but that only controls Next's own
regeneration cache **inside** the Cloud Run container — nothing today caches these responses at
Cloudflare's edge (the ALB has Cloud CDN explicitly disabled). Research already found the real
gating fact: `apps/miyagisanchez/app/(shell)/layout.tsx:30` calls `await headers()`, which forces
dynamic rendering on its entire subtree — so 9 of the 11 `revalidate` routes (everything under
`(shell)`, every seller storefront included) never emit a cacheable `Cache-Control` regardless of
their `revalidate` value. The one confirmed exception is the homepage
(`app/(site)/page.tsx`), deliberately architected to stay static. S3.1 confirms this with a live
probe before S3.2 touches anything.

---

## Stories

### S3.1 — Origin `Cache-Control` probe *(data-gathering, no code change)* ✅ DONE 2026-07-13
> **As** the platform, **I want** to know exactly which routes' origin responses are genuinely
> cacheable, **so that** a Cloudflare Cache Rule only ever caches content that's actually safe to
> cache — never something dynamically rendered per-request or per-tenant.

- `curl -sI` the Cloud Run origin URL directly (bypassing Cloudflare) for: `/`, `/faq`,
  `/politicas`, a representative `/s/[slug]`, and `/s/[slug]/c/[collection]`.
- Record the actual `Cache-Control` header per path in this sprint doc.
- **Acceptance:** a clear, evidenced list of which paths are eligible for S3.2 and which aren't
  — expected (not assumed) result: `/` is cacheable, the `(shell)` subtree is not.

**Results** — probed `https://miyagi-web-oehqqtyoia-uk.a.run.app` directly (resolved live via
`gcloud run services describe miyagi-web --project=miyagisanchezback-497722 --region=us-east4
--format='value(status.url)'`), bypassing Cloudflare entirely:

| Path | Status | `cache-control` | Verdict |
|---|---|---|---|
| `/` | 200 | `s-maxage=60, stale-while-revalidate=31535940` (+ `x-nextjs-cache: STALE`, `x-nextjs-prerender: 1`) | **Cacheable** — confirms the hypothesis above |
| `/faq` | **404** | `private, no-cache, no-store, max-age=0, must-revalidate` | Not eligible (see finding below) |
| `/politicas` | **404** | `private, no-cache, no-store, max-age=0, must-revalidate` | Not eligible (see finding below) |
| `/s/panfleto` (representative `(shell)` storefront) | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | Confirmed dynamic, as expected |
| `/s/panfleto/c/algo` | 404 (bad test collection slug — header shape is what matters here) | `private, no-cache, no-store, max-age=0, must-revalidate` | Confirmed dynamic, as expected |

**Finding, out of scope for this epic**: `/faq` and `/politicas` return 404 on BOTH the direct
origin and the live prod domain (`https://miyagisanchez.com/faq` re-checked — same 404, same
`cf-cache-status: DYNAMIC`). `app/(shell)/faq` and `app/(shell)/politicas` exist as source files
but don't resolve live. This is a genuine, pre-existing routing/content bug, unrelated to caching
— **not fixed here**; recommend filing it separately.

**Conclusion: the only confirmed-cacheable path today is `/` (exact match).** No other route
qualifies. This narrows S3.2 to a single path rather than the multi-path list originally assumed
— the correct, evidence-driven outcome per this story's own acceptance bar.

### S3.2 — Cloudflare Cache Rule for the confirmed-static set *(MED — Daniel sign-off required)* — ✅ BUILT + LIVE
> **As** the platform, **I want** genuinely static pages served straight from Cloudflare's edge,
> **so that** they never round-trip to Cloud Run and load faster globally.

- New idempotent script `infra/gcp/cloudflare-cache-provision.mjs`, cloning
  `infra/gcp/cloudflare-waf-provision.mjs`'s exact shape (PUT to a ruleset filtered by its own
  rule description, so a re-run preserves any hand-added rules).
- Cache **only** the paths S3.1 confirmed static (`CONFIRMED_STATIC_PATHS = ['/']`). Mode:
  `edge_ttl: { mode: 'respect_origin' }` — no blanket forced edge TTL, so Next's own
  `s-maxage=60` keeps driving the actual edge TTL.
- Scoped to `http.host eq "miyagisanchez.com" or http.host eq "www.miyagisanchez.com"` (exact
  match, no `contains`) — deliberately excludes every shop subdomain/custom domain, so the
  `x-miyagi-channel` per-host-rendering risk below can't apply to this rule as written.
- Do not extend this to `(shell)` seller routes later without re-running S3.1 first — the
  `x-miyagi-channel` custom-domain routing means the same path can render differently per host,
  and default per-host cache keying only stays correct as long as genuinely-static content is all
  that's ever cached.
- **This is the one genuinely new capability in this epic** (first time this repo caches anything
  at Cloudflare's edge) — get Daniel's explicit go before the rule goes live in prod, even though
  it's trivially reversible (delete the rule).
- **Acceptance:** a warm second request to `/` through Cloudflare shows `cf-cache-status: HIT`; a
  `(shell)` route shows no change from today's behavior.

**Dry-run finding, found and resolved:** a read-only dry-run (zone resolve + read the existing
`http_request_cache_settings` entrypoint ruleset) against live Cloudflare initially 403'd
(`"request is not authorized"`) — the `CLOUDFLARE_API_TOKEN` in Secret Manager didn't have the
**Cache Rules** zone permission scope (same shape as the WAF script's Bot Fight Mode gap, except
this one couldn't be soft-failed since the Cache Rule *is* the entire point of this script).
Daniel added that permission to the token; re-running the same dry-run then got a clean 404
("no entrypoint ruleset in this phase yet" — the expected empty state, already handled by the
script's `existingRules = []` fallback), confirming the fix worked before anything mutating ran.

**Live run:** with the permission fixed and Daniel's explicit go, ran
`node infra/gcp/cloudflare-cache-provision.mjs` for real:
```
▶ Zone: 0091f4f96b3c474293bb025635d18e0d (miyagisanchez.com)
  = cache rule in place for / (0 other rule(s) preserved untouched)
```

**Live verification, both passed:**
```
$ curl -sI https://miyagisanchez.com/           # request 1
HTTP/2 200
cache-control: max-age=14400, s-maxage=60, stale-while-revalidate=31535940
cf-cache-status: MISS

$ curl -sI https://miyagisanchez.com/           # request 2, 2s later
HTTP/2 200
cache-control: max-age=14400, s-maxage=60, stale-while-revalidate=31535940
age: 4
cf-cache-status: HIT

$ curl -sI https://miyagisanchez.com/s/panfleto  # (shell) regression check
HTTP/2 200
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
```
`/` graduates `MISS → HIT` on the second request, exactly per acceptance; `/s/panfleto` is
completely unchanged (`DYNAMIC`, still `private, no-cache`) — the `(shell)` subtree is untouched.

## Review findings (fixed pre-merge)
- **Cross-agent (Codex) — PR #85**: **Blocking**, real finding. The entrypoint-ruleset read caught
  *all* errors and treated them as "no ruleset yet" — a transient 403/5xx/network failure could
  fall through to a PUT containing only this script's own rule, silently deleting any OTHER Cache
  Rule a human added by hand, contradicting the preservation contract. Fixed: only Cloudflare
  error code `10003` ("no entrypoint ruleset in this phase") is swallowed; every other failure
  rethrows before any mutating call. Added a drift-guard case (`141/141` now green). The
  already-live prod rule is unaffected (the fix only changes error handling on a read path) — no
  live re-run needed to verify it.

---

## Sprint QA
- **Automated drift-guard**: `infra/gcp/test/cloudflare-cache-provision.test.mjs` — 7 cases,
  asserting the script only lists paths S3.1 confirmed static (`['/']`), respects origin
  `Cache-Control` (no forced override TTL), preserves other rules on re-run, targets the Cache
  Rules phase (not the WAF script's firewall phase), is scoped to an exact apex/www host match
  (never a `contains` that could catch a subdomain/custom domain), and (added post cross-review)
  only swallows the specific "no ruleset yet" error, rethrowing everything else. All green, plus
  the full `infra/gcp/test/` suite (141/141).
- **Bundled CI fix**: `.github/workflows/infra-guard.yml` only globbed `*.test.js`, silently
  skipping 9 of 13 files in that directory (all `.test.mjs`, including this sprint's new test and
  the pre-existing `cloudflare-waf-provision.test.mjs`). Fixed to glob both extensions — verified
  locally all 140 tests (both patterns) pass.
- **Manual live check — done**: `curl -sI` through Cloudflare for `/` showed `MISS` → `HIT` on the
  warm second request (real output above); `/s/panfleto` confirmed unchanged (`DYNAMIC`, still
  `private, no-cache`).

---

## Sprint 3 — Smoke walkthrough (do these in order)
1. ✅ **Ran.** S3.1 origin probe against the LIVE Cloud Run origin URL (bypassing Cloudflare).
   Results recorded above: only `/` is cacheable; `(shell)` confirmed dynamic; `/faq`/`/politicas`
   404 (unrelated pre-existing bug).
2. ✅ **Done.** S3.1 findings above are the confirmed path list (`/` only) `cloudflare-cache-provision.mjs`
   was written against.
3. ✅ **Ran.** Script + drift-guard written, 140/140 `node --test` cases pass locally. Read-only
   dry-run against live Cloudflare (zone resolve + read the existing entrypoint ruleset) first
   surfaced a real blocker (token missing the Cache Rules permission — 403); Daniel added the
   permission, re-run confirmed clean (404 "no ruleset yet", the expected empty state) before
   anything mutating ran.
4. ✅ **Ran, live, with Daniel's explicit go.** Ran the script for real; `curl -sI
   https://miyagisanchez.com/` twice showed `MISS` → `HIT` on the warm second request (real
   output above).
5. ✅ **Ran.** `/s/panfleto` spot-checked through Cloudflare — completely unaffected, still
   `DYNAMIC`/`private, no-cache`, same as before this sprint.
6. **Owed — awaiting Daniel's merge.** PR #85 is ready for review; MED tier means Daniel merges,
   not auto-merge-on-green-CI.

If any step fails, note the step number + what you saw — that's the bug report.
