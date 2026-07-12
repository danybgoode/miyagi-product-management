# Sprint 3 — Edge cache: origin probe + a scoped Cloudflare Cache Rule

**Epic:** [Deploy pipeline tuning](README.md) · **Risk: MED — Daniel sign-off before the Cache
Rule goes live** · **Status: 📋 not started**

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

### S3.1 — Origin `Cache-Control` probe *(data-gathering, no code change)*
> **As** the platform, **I want** to know exactly which routes' origin responses are genuinely
> cacheable, **so that** a Cloudflare Cache Rule only ever caches content that's actually safe to
> cache — never something dynamically rendered per-request or per-tenant.

- `curl -sI` the Cloud Run origin URL directly (bypassing Cloudflare) for: `/`, `/faq`,
  `/politicas`, a representative `/s/[slug]`, and `/s/[slug]/c/[collection]`.
- Record the actual `Cache-Control` header per path in this sprint doc.
- **Acceptance:** a clear, evidenced list of which paths are eligible for S3.2 and which aren't
  — expected (not assumed) result: `/` is cacheable, the `(shell)` subtree is not.

### S3.2 — Cloudflare Cache Rule for the confirmed-static set *(MED — Daniel sign-off required)*
> **As** the platform, **I want** genuinely static pages served straight from Cloudflare's edge,
> **so that** they never round-trip to Cloud Run and load faster globally.

- New idempotent script `infra/gcp/cloudflare-cache-provision.mjs`, cloning
  `infra/gcp/cloudflare-waf-provision.mjs`'s exact shape (PUT to a ruleset filtered by its own
  rule description, so a re-run preserves any hand-added rules).
- Cache **only** the paths S3.1 confirmed static. Mode: respect origin `Cache-Control` — do not
  set a blanket forced edge TTL that would override Next's own `revalidate` directive.
- Do not extend this to `(shell)` seller routes later without re-running S3.1 first — the
  `x-miyagi-channel` custom-domain routing means the same path can render differently per host,
  and default per-host cache keying only stays correct as long as genuinely-static content is all
  that's ever cached.
- **This is the one genuinely new capability in this epic** (first time this repo caches anything
  at Cloudflare's edge) — get Daniel's explicit go before the rule goes live in prod, even though
  it's trivially reversible (delete the rule).
- **Acceptance:** a warm second request to `/` through Cloudflare shows `cf-cache-status: HIT`; a
  `(shell)` route shows no change from today's behavior.

---

## Sprint QA
- **Automated drift-guard**: `infra/gcp/test/cloudflare-cache-provision.test.mjs` asserting the
  script only lists paths S3.1 confirmed static, respects origin `Cache-Control` (no forced
  override TTL), and preserves other rules on re-run.
- **Manual live check**: `curl -sI` through Cloudflare for `/`, confirm `cf-cache-status: HIT` on
  a warm second request; confirm a `(shell)` route is unchanged (still dynamic, no cache header).

---

## Sprint 3 — Smoke walkthrough (do these in order)
1. Run the S3.1 origin probe against the LIVE Cloud Run origin URL (bypassing Cloudflare). Record
   results in this doc.
2. **(Daniel sign-off checkpoint)** Share the S3.1 findings; confirm the exact path list before
   writing `cloudflare-cache-provision.mjs`.
3. Write + dry-run the script, confirm it only targets the confirmed-static paths.
4. Run it live. `curl -sI https://miyagisanchez.com/` twice — first request may be `MISS`, second
   should show `cf-cache-status: HIT`.
5. Spot-check a `(shell)` route (e.g. a real seller storefront) is completely unaffected — same
   response as before this sprint, still dynamic.
6. Merge + close out.

If any step fails, note the step number + what you saw — that's the bug report.
