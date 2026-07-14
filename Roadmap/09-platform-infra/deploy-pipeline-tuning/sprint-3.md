# Sprint 3 — Edge cache: origin probe + a scoped Cloudflare Cache Rule

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: MED — Daniel sign-off before the Cache
Rule goes live** · **Status: 🚧 S3.1 done, S3.2 code built + drift-guard green — blocked on a
Cloudflare token permission fix + Daniel's live go-ahead (see S3.2 below)**

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

### S3.2 — Cloudflare Cache Rule for the confirmed-static set *(MED — Daniel sign-off required)* — code ✅ BUILT, NOT YET RUN LIVE
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

**Dry-run finding — blocks the live run, needs Daniel:** ran the script's read-only calls (zone
resolve + read the existing `http_request_cache_settings` entrypoint ruleset) directly against
live Cloudflare with the `CLOUDFLARE_API_TOKEN` currently in Secret Manager. Zone resolution
works fine (`0091f4f96b3c474293bb025635d18e0d`, `miyagisanchez.com`), but the ruleset read itself
403s: `"request is not authorized"`. The token doesn't have the **Cache Rules** zone permission
scope — same shape as the WAF script's Bot Fight Mode gap, except this one can't be soft-failed
since the Cache Rule *is* the entire point of this script. **Needs**: add "Cache Rules: Edit" (or
equivalent) to the existing Cloudflare API token's permission group before this can run live.

---

## Sprint QA
- **Automated drift-guard**: `infra/gcp/test/cloudflare-cache-provision.test.mjs` — 6 cases,
  asserting the script only lists paths S3.1 confirmed static (`['/']`), respects origin
  `Cache-Control` (no forced override TTL), preserves other rules on re-run, targets the Cache
  Rules phase (not the WAF script's firewall phase), and is scoped to an exact apex/www host match
  (never a `contains` that could catch a subdomain/custom domain). All green, plus the full
  `infra/gcp/test/` suite (140/140).
- **Bundled CI fix**: `.github/workflows/infra-guard.yml` only globbed `*.test.js`, silently
  skipping 9 of 13 files in that directory (all `.test.mjs`, including this sprint's new test and
  the pre-existing `cloudflare-waf-provision.test.mjs`). Fixed to glob both extensions — verified
  locally all 140 tests (both patterns) pass.
- **Manual live check (owed, blocked on the token-permission fix above)**: `curl -sI` through
  Cloudflare for `/`, confirm `cf-cache-status: HIT` on a warm second request; confirm a `(shell)`
  route is unchanged (still dynamic, no cache header).

---

## Sprint 3 — Smoke walkthrough (do these in order)
1. ✅ **Ran.** S3.1 origin probe against the LIVE Cloud Run origin URL (bypassing Cloudflare).
   Results recorded above: only `/` is cacheable; `(shell)` confirmed dynamic; `/faq`/`/politicas`
   404 (unrelated pre-existing bug).
2. ✅ **Done.** S3.1 findings above are the confirmed path list (`/` only) `cloudflare-cache-provision.mjs`
   was written against.
3. ✅ **Ran.** Script + drift-guard written, 140/140 `node --test` cases pass locally. Read-only
   dry-run against live Cloudflare (zone resolve + read the existing entrypoint ruleset) confirmed
   the zone resolves correctly, but surfaced a real blocker: the current `CLOUDFLARE_API_TOKEN`
   403s ("request is not authorized") on the Cache Rules phase specifically — it needs the "Cache
   Rules: Edit" permission added before the actual PUT can run.
4. **Owed, blocked on step 3's token-permission fix + Daniel's explicit go.** `curl -sI
   https://miyagisanchez.com/` twice — first request may be `MISS`, second should show
   `cf-cache-status: HIT`.
5. **Owed.** Spot-check a `(shell)` route (e.g. a real seller storefront) is completely unaffected
   — same response as before this sprint, still dynamic.
6. **Owed.** Merge + close out.

If any step fails, note the step number + what you saw — that's the bug report.
