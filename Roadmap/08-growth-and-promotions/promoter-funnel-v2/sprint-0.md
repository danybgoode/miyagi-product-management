# Sprint 0 · Bug — subdomain paywall not gating new sellers

> Epic: [Promoter Funnel v2](README.md) · Risk: **HIGH** (entitlement) — **Daniel merges**
> Status: 📋 planned

## The promise vs the observation
**Promise** (epic `subdomain-pricing`, poster 07): with `subdomain.paywall_enabled` ON, a new unpaid
shop's `slug.miyagisanchez.com` **301-redirects to the free `/s/slug`**, and seller settings shows
the buy upsell (yearly $199 / monthly $25). **Observed** (Daniel, 2026-07-02): a fresh seller signup
got the subdomain serving automatically, with **no option to buy the upgrade**.

## US-0.1 — Reproduce → root-cause → fix + regression spec
**As** Daniel, **I want** a fresh no-promoter seller signup to get the free `/s/slug` only, with the
subdomain offered as a paid upsell, **so that** the subdomain SKU is real (and "GRATIS con promotor"
in this epic means something).

**Reproduction (write it down first):** create a disposable seller with no grant/subscription →
open `https://<slug>.miyagisanchez.com` (expect 301 to `/s/<slug>`; observe what actually happens) →
open the shop settings Canal section (expect the SubdomainSection buy upsell; observe).

**Root-cause hypotheses, in checking order:**
1. **Flag row absent/OFF** — `subdomain.paywall_enabled` **fails open to `false`**
   (`lib/flags.ts`, in-house `platform_flags`). If the Supabase row is missing or OFF (possibly lost
   in the Flagsmith→in-house cutover), the paywall silently disables platform-wide. ⚠️ Supabase is
   **shared dev/prod** — read which project `SUPABASE_URL` points at before any write (LEARNINGS).
2. **`entitled` defaulted `true` upstream** — `SubdomainSection` receives `entitled` ("Defaults true
   (ungated) upstream"); check the settings page's resolver actually calls
   `resolveSubdomainEntitlement` with the seller's Clerk id.
3. **Unintended grant on new shops** — the grandfather backfill was cutover-only; confirm nothing in
   the shop-creation path stamps a grant.

**Acceptance (Daniel can run):**
- A fresh unpaid shop's subdomain 301s to `/s/slug`; the settings Canal section shows the $199/$25 upsell.
- Grandfathered + comped + subscribed shops still serve their subdomains (no regression).
- If the fix is an ops flag-flip: the flip is done + a seed migration/guard prevents silent regression.

**QA stage:** one `api` spec on the pure entitlement deriver (paywall ON + no grant + no subscription
⇒ not entitled) + a middleware-gate spec where testable; flag-row state assertion or seed migration
in the PR. Root cause may replace a code fix with an ops step — document either way.

## Sprint QA
- Deterministic gate: `tsc` + `next build` + Playwright `api` suite green vs the branch preview.
- Regression spec added per acceptance above.

## Sprint 0 — Smoke walkthrough (do these in order)
*(placeholder — fill with real URLs at build time)*
Env: production · https://miyagisanchez.com

1. Create a disposable seller (no promoter code, no payment) at https://miyagisanchez.com/sell.
   → Shop created; note the slug.
2. Open https://<slug>.miyagisanchez.com in a private window.
   → 301 to https://miyagisanchez.com/s/<slug> (URL bar shows the apex `/s/` URL).
3. Open https://miyagisanchez.com/shop/manage/settings (Canal section), signed in as that seller.
   → The subdomain block shows the buy upsell ($199 MXN/año · $25 MXN/mes), not an active subdomain.
4. Open a known grandfathered shop's subdomain.
   → Still serves white-label (no regression).

If any step fails, note the step number + what you saw — that's the bug report.
