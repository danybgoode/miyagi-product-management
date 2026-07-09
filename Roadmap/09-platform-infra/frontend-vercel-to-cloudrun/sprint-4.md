# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Sprint 4: Tenant domain rewrite + migration + Vercel sunset

**Status:** ⬜ not started

Earned after platform proof (the S3 soak). The paid custom-domain SKU moves provider:
Vercel Domains API → Cloudflare for SaaS custom hostnames. Then Vercel sunsets to preview-only.

## Stories

### Story 4.1 — `lib/cloudflare-domains.ts`: the provider swap behind the same seam
**As a** seller with a custom domain, **I want** domain provisioning to run on Cloudflare custom
hostnames (create → poll validation → delete, against the fallback origin), **so that** my domain
keeps working with automatic SSL after Vercel is gone.
**Acceptance:** same exported API as `lib/vercel-domains.ts` incl. the `DomainConflictError` → 409
mapping; hostnames looked up **by name** (no Cloudflare hostname IDs persisted);
`marketplace_shops.custom_domain_vercel_ok` semantics repointed to "provider validation ok"
(additive migration or documented column-reuse — decided in-story, no Vercel shape leaking into the
public API). Pure-logic specs cover the response-mapping seam.
**Risk:** high (paid SKU — money path)

### Story 4.2 — Retarget `CNAME_TARGET` + the one-click route + seller copy
**As a** seller adding a domain, **I want** `dnsRecordFor`/`CNAME_TARGET`, the one-click Cloudflare
DNS route, and all seller-facing instructions pointing at the new target, **so that** new domain
setups succeed first try.
**Acceptance:** a fresh domain add walks through end-to-end; copy is **es-MX only** (seller portal
is not on the bilingual allow-list — Rule 5; recorded at grooming so it isn't re-litigated).
**Risk:** high

### Story 4.3 — Migrate every live tenant custom domain
**As a** platform operator, **I want** a dry-run-by-default migration script (the `vercel-prune`
pattern): enumerate live domains from the Vercel project → pre-provision as Cloudflare custom
hostnames → per-domain validation report → flip per domain, **so that** no seller's domain drops.
**Acceptance:** dry-run report reviewed by Daniel before `--apply`; after the flip each domain
serves from the new rail with valid SSL; per-domain rollback (point back at Vercel) documented
until sunset.
**Risk:** high (sellers' live domains — Daniel merges)

### Story 4.4 — Lapse-sweep + DNS-doctor read Cloudflare status
**As a** platform operator, **I want** `lib/domain-lapse-server.ts` and the DNS-doctor checks
reading the Cloudflare custom-hostname status API instead of Vercel's `/v6/domains/*/config`,
**so that** entitlement lapse + domain health keep working. *(LEARNINGS: check live provider
status, never hardcoded targets.)*
**Acceptance:** pure-logic specs on the status mapping; the daily `domain-lapse-sweep` cron
(already on Scheduler since S3.1) runs green against the new provider.
**Risk:** low

### Story 4.5 — Vercel sunset (previews kept)
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

## Sprint QA
- **api spec(s):** 4.1 → pure specs on the hostname-status mapping seam + the existing domain
  route api spec re-pointed; 4.4 → lapse-decision pure spec.
- **browser smoke owed:** **yes, to Daniel — 4.3's per-domain flip on real seller domains** (and
  the 4.5 sunset call itself).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/s/<test-shop>/manage — add a brand-new custom test domain.
   → Instructions show the NEW CNAME target; after DNS, status reaches "verificado" with SSL.
2. Open the busiest seller's live custom domain in a private window.
   → Serves from the new rail (`cf-ray` header), white-label intact, SSL valid.
3. **(money path — Daniel)** On that tenant domain: add to cart → guest checkout → Stripe test card.
   → Order completes; confirmation email branded to the shop.
4. Remove the test domain from step 1.
   → It stops resolving to the shop; the shop's subdomain still works.
5. After the sunset merge: open any PR.
   → A Vercel preview still appears and CI still runs Playwright against it.
6. Merge that PR.
   → Only Cloud Run deploys; the Vercel project shows no production deployment.

If any step fails, note the step number + what you saw — that's the bug report.
