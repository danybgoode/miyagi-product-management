# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 4: Tenant domain rewrite + migration + Vercel sunset

**Status:** 🚧 Stories 4.1–4.4 built 2026-07-10 (code + infra scripts + specs; live provisioning still
owed to Daniel — see each story). **Story 4.5 (Vercel sunset) deliberately NOT started** — Daniel's
explicit instruction: don't touch it until he separately calls the post-migration soak over.

Earned after platform proof (the S3 soak — confirmed done by Daniel 2026-07-10, bar tomorrow's
cron exactly-once check). The paid custom-domain SKU moves provider: Vercel Domains API →
Cloudflare for SaaS custom hostnames. Then Vercel sunsets to preview-only (later, separately).

## Stories

### Story 4.1 — `lib/cloudflare-domains.ts`: the provider swap behind the same seam ✅
**As a** seller with a custom domain, **I want** domain provisioning to run on Cloudflare custom
hostnames (create → poll validation → delete, against the fallback origin), **so that** my domain
keeps working with automatic SSL after Vercel is gone.
**Acceptance:** same exported API as `lib/vercel-domains.ts` incl. the `DomainConflictError` → 409
mapping; hostnames looked up **by name** (no Cloudflare hostname IDs persisted);
`marketplace_shops.custom_domain_vercel_ok` semantics repointed to "provider validation ok"
(additive migration or documented column-reuse — decided in-story, no Vercel shape leaking into the
public API). Pure-logic specs cover the response-mapping seam.
**Risk:** high (paid SKU — money path)

**Built 2026-07-10** — `lib/cloudflare-domains.ts` (frontend PR, commits `e0e3633`+`ed876f2`):
same exported names/shapes as the Vercel seam, backed by Cloudflare's Custom Hostnames API
(`POST`/`GET ?hostname=`/`DELETE .../custom_hostnames`). **Decision: documented column-reuse** —
`custom_domain_vercel_ok` keeps its name (blast radius across route.ts, the lapse cron, seller
settings UI, admin tenant directory made a rename not worth it); a comment-only migration
(`20260710160000_custom_domain_provider_semantics.sql`) documents the generalized meaning in
Postgres itself, and `lib/types.ts` carries the same note. 15 pure-logic specs
(`e2e/cloudflare-domains.spec.ts`) cover the response-mapping seam, no live network.

Infra: `infra/gcp/cloudflare-saas-fallback-provision.mjs` (root repo commit `5cfc5ed`) — one-time
zone setup creating the `cname.miyagisanchez.com` fallback-origin record + registering it via
Cloudflare's `fallback_origin` endpoint. **Owed to Daniel before this can run live:** (1) confirm
Cloudflare for SaaS / Custom Hostnames is enabled on the zone (paid feature), (2) grant
`CLOUDFLARE_API_TOKEN` the Custom Hostnames / SSL-for-SaaS permission group (same
403-on-missing-scope shape as S2.1/S2.3), (3) after the fallback record exists, reissue the Origin
CA cert to cover it (`node infra/gcp/cloudflare-origin-cert.mjs --hostnames
miyagisanchez.com,*.miyagisanchez.com,cname.miyagisanchez.com`) and update the ALB's
`--ssl-certificates`. None of these were run live in this session — no Cloudflare/Supabase write
credentials were available to the building agent; the code + scripts are prepared and reviewed,
not yet executed against production.

### Story 4.2 — Retarget `CNAME_TARGET` + the one-click route + seller copy ✅
**As a** seller adding a domain, **I want** `dnsRecordFor`/`CNAME_TARGET`, the one-click Cloudflare
DNS route, and all seller-facing instructions pointing at the new target, **so that** new domain
setups succeed first try.
**Acceptance:** a fresh domain add walks through end-to-end; copy is **es-MX only** (seller portal
is not on the bilingual allow-list — Rule 5; recorded at grooming so it isn't re-litigated).
**Risk:** high

**Built 2026-07-10** (commit `ed876f2`) — `CNAME_TARGET` → `cname.miyagisanchez.com`.
**Design decision made in-story, flagged for live verification:** Cloudflare for SaaS, unlike
Vercel, does not publish a fixed customer-facing apex A-record IP — its documented model is CNAME
flattening (ALIAS/ANAME) at the root. `dnsRecordFor` now recommends a CNAME for **both** apex and
subdomain (only `isApex` still distinguishes them, for the "needs registrar ALIAS/ANAME support"
UI copy). `APEX_A_RECORD` is retired. The existing `e2e/domain-dns-record.spec.ts` was updated for
this intentional behavior change. The one-click Cloudflare route, its OAuth callback, and the main
domain route all repointed to `lib/cloudflare-domains`; seller copy (`Canal.tsx`) now interpolates
the shared constant instead of 5 hardcoded copies of the old Vercel target — es-MX only, unchanged.
**Owed:** live confirmation that Cloudflare for SaaS actually issues SSL for a root-CNAME/
ALIAS-flattened apex domain — this is a real product-behavior assumption, not yet proven against
the live API (needs Story 4.1's infra prerequisites done first).

### Story 4.3 — Migrate every live tenant custom domain ✅ (pre-provision + report — live run owed)
**As a** platform operator, **I want** a dry-run-by-default migration script (the `vercel-prune`
pattern): enumerate live domains from the Vercel project → pre-provision as Cloudflare custom
hostnames → per-domain validation report → flip per domain, **so that** no seller's domain drops.
**Acceptance:** dry-run report reviewed by Daniel before `--apply`; after the flip each domain
serves from the new rail with valid SSL; per-domain rollback (point back at Vercel) documented
until sunset.
**Risk:** high (sellers' live domains — Daniel merges)

**Built 2026-07-10** (root repo commit `264d7c8`) — `infra/gcp/cloudflare-tenant-domain-migrate.mjs`.
**Scoping reality found while building, stated plainly (not silently reinterpreted):** unlike S3.4's
apex/wildcard flip (our own zone, a direct API write), a tenant's DNS lives in **their** zone/
registrar — we don't control it and have no durable credential to write to later (the one-click
OAuth token is single-use, never persisted). So "migrate" here means: enumerate every live tenant
domain from Supabase, cross-check against Vercel's live project list for drift, then
**pre-provision each as a Cloudflare custom hostname via TXT ownership validation** — which does
**not** require the seller's DNS to point at us yet. `--apply` creates the hostnames and writes a
JSON report + a plain-language per-seller action list ("ask them to repoint their CNAME, or
re-run the one-click connect button"). **Traffic only actually moves once each seller repoints
their own DNS** — Vercel keeps serving every domain unchanged throughout, which is exactly why
`--rollback <domain>` is low-stakes: it only ever deletes the Cloudflare-side custom hostname,
never touches the seller's live DNS. `--status` gives a read-only report with zero writes.
10-case config guard green (131/131 across `infra/gcp/test/`). **Owed:** the actual live run
(needs Story 4.1's infra prerequisites first) — Daniel reviews the dry-run report before `--apply`,
per the standing instruction.

### Story 4.4 — Lapse-sweep + tenant-directory domain health read Cloudflare status ✅
**As a** platform operator, **I want** `lib/domain-lapse-server.ts` and the DNS-doctor checks
reading the Cloudflare custom-hostname status API instead of Vercel's `/v6/domains/*/config`,
**so that** entitlement lapse + domain health keep working. *(LEARNINGS: check live provider
status, never hardcoded targets.)*
**Acceptance:** pure-logic specs on the status mapping; the daily `domain-lapse-sweep` cron
(already on Scheduler since S3.1) runs green against the new provider.
**Risk:** low

**Built 2026-07-10** (commit `9299ba2`) — `releaseCustomDomainForShop()` now calls
`removeDomainFromProject` from `lib/cloudflare-domains`; the daily `domain-lapse-sweep` Scheduler
job needs zero provisioning changes (same route, new code path underneath). **Correction to this
story's original framing:** there is no separate "DNS-doctor" script/route anywhere in the
codebase (checked — it only appeared in this epic's own planning docs); the real existing
health-check surface is `lib/admin/tenant-directory.ts`'s `deriveDomainStatus()`, and it needed
**no change** — it already derives status purely from the DB's `custom_domain_verified` boolean,
which Story 4.2's updated `route.ts` GET handler keeps in sync via the live Cloudflare check. The
status-mapping decision itself (`active`/`active_redeploying`) is already covered by
`e2e/cloudflare-domains.spec.ts`'s `normalizeHostname` specs from Story 4.1 — a separate spec here
would only duplicate that logic.

### Story 4.5 — Vercel sunset (previews kept) — ⬜ NOT STARTED, deliberately
**As a** platform operator, **I want** — after Daniel calls the soak — Vercel prod deploys
disabled (`git.deploymentEnabled.main: false`), production domains removed from the Vercel
project, `VERCEL_API_TOKEN` de-scoped to preview needs, and the docs updated (AGENTS.md workflow
§, WAYS-OF-WORKING deploy/merge/preview sections, team-memory deploy-topology note), **so that**
Vercel is preview-only and no doc claims otherwise.
**Acceptance:** merging to `main` deploys Cloud Run only; PR branches still get Vercel previews +
the CI Playwright gate; `grep -ri "vercel prod"`-style doc sweep clean; `scripts/doc-hygiene.mjs`
run; the rollback runbook records that DNS-flip-back now requires re-enabling Vercel prod deploys
first.
**Risk:** low (docs/config) — but the *sunset decision* is Daniel's, gated on the soak.

**Not started, per Daniel's explicit instruction this sprint** — don't touch Vercel sunset until he
separately says the post-migration soak is over. Stories 4.1–4.4 keep Vercel serving every tenant
domain unchanged throughout (that's the whole point of the pre-provision-not-flip design in 4.3),
so nothing here forces this story before its own gate opens.

## Sprint QA
- **api spec(s):** 4.1 → 15 pure specs on the hostname-status/conflict/error-mapping seam
  (`e2e/cloudflare-domains.spec.ts`) + the existing domain-route/DNS-record specs updated for the
  CNAME-everywhere contract; 4.4 → covered by the same 4.1 specs (no separate spec needed — see
  Story 4.4 above). Infra config guards: 18 new `node:test` cases across the 2 new scripts
  (fallback-provision: 8, tenant-migrate: 10), 131/131 green in `infra/gcp/test/`.
- **browser smoke owed:** **yes, to Daniel — this whole sprint's live provisioning.** Nothing in
  4.1–4.3 was run against real Cloudflare/Supabase credentials in this building session (none were
  available); the code, infra scripts, and config guards are prepared and reviewed, not yet
  executed live. Also owed: 4.3's dry-run report review before `--apply`, and (separately, later)
  the 4.5 sunset call itself.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` all green on this
  branch 2026-07-10 (pre-existing, unrelated flakiness in `launchpad-*`/`not-found-shape`/
  `own-shop-seo`/`promoter-applications` confirmed via `git stash` to predate this branch).

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

**Step 0 — infra prerequisites (Daniel, before step 1 can work at all):**
- Confirm Cloudflare for SaaS / Custom Hostnames is enabled on the `miyagisanchez.com` zone
  (paid feature — dashboard).
- Grant `CLOUDFLARE_API_TOKEN` the Custom Hostnames / SSL-for-SaaS permission group.
- Run `node infra/gcp/cloudflare-saas-fallback-provision.mjs` (creates the
  `cname.miyagisanchez.com` fallback-origin record + registers it with Cloudflare).
- Reissue the Origin CA cert to cover it (`node infra/gcp/cloudflare-origin-cert.mjs --hostnames
  miyagisanchez.com,*.miyagisanchez.com,cname.miyagisanchez.com`) and update the ALB's
  `--ssl-certificates`.
- Populate `CLOUDFLARE_ZONE_ID` in the frontend's Cloud Run env/secrets (new — read by
  `lib/cloudflare-domains.ts`).

1. Go to https://miyagisanchez.com/s/<test-shop>/manage — add a brand-new custom test domain.
   → Instructions show the NEW CNAME target (`cname.miyagisanchez.com`); a Cloudflare custom
   hostname is created behind the scenes (check via `node
   infra/gcp/cloudflare-tenant-domain-migrate.mjs --domain <test-domain> --status`).
2. Point the test domain's real DNS (a domain you control) at the shown CNAME target, wait for
   propagation.
   → Status reaches "verificado" with SSL; the shop renders on the test domain, `cf-ray` header
   present, white-label intact.
3. Run the migration script's dry-run against every live tenant domain:
   `node infra/gcp/cloudflare-tenant-domain-migrate.mjs`.
   → **(Daniel reviews this report before anyone runs `--apply`.)** Confirms no drift between
   Supabase and Vercel's live domain list, and shows each domain's Cloudflare readiness.
4. **(money path — Daniel, on the test domain from step 1-2)** Add to cart → guest checkout →
   Stripe test card.
   → Order completes; confirmation email branded to the shop.
5. Remove the test domain from step 1.
   → It stops resolving to the shop; the shop's subdomain still works; the Cloudflare custom
   hostname is cleaned up (`--rollback <test-domain> --apply`, or automatically via the DELETE route).

If any step fails, note the step number + what you saw — that's the bug report.

**Not this sprint** — a live tenant-domain repoint + the Vercel-sunset walkthrough (both gated on
Story 4.3's `--apply` being run for real and Story 4.5 starting, respectively) will get their own
walkthrough steps when those are actually executed.
