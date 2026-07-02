# Sprint 0 · Bug — subdomain paywall not gating new sellers

> Epic: [Promoter Funnel v2](README.md) · Risk: **HIGH** (entitlement) — **Daniel merges**
> Status: ✅ closed 2026-07-02 — **not reproducible** (PR [#160](https://github.com/danybgoode/miyagisanchezcommerce/pull/160), test-only, no runtime code changed)

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

## Root cause — NOT REPRODUCIBLE (investigated 2026-07-02)
Checked all three hypotheses, in order, directly against **live production** (no code
changes until the finding was confirmed):

1. **Flag row absent/OFF?** No. Queried the shared Supabase `platform_flags` table
   directly (`select key, enabled from platform_flags where key = 'subdomain.paywall_enabled'`)
   → `enabled: true`, `updated_at: 2026-07-01T19:38:27Z`. The flag has been ON since the
   epic's own cutover. **Ruled out.**
2. **`entitled` defaulted `true` upstream?** No. Traced both call sites:
   - `middleware.ts`'s subdomain gate calls `resolveSubdomainEntitlement(shopMetadata, { sellerClerkId: shopClerkId })` with the real row fetched by slug.
   - `app/(shell)/shop/manage/settings/[section]/page.tsx` (`section === 'canal'`) calls the same resolver with the real shop metadata + the already-fetched `subdomainSub?.active`, and passes the result straight through to `<Canal initial={{ subdomain_entitled: subdomainEntitled, ... }}>` → `<SubdomainSection entitled={initial.subdomain_entitled ?? true} .../>`. Since `subdomainEntitled` is always a real boolean on the `canal` section (never `undefined`), the `?? true` fallback never engages there.
   - The pure deriver (`lib/domain-entitlement.ts` `deriveDomainEntitlement`) correctly returns `{entitled:false, reason:'none'}` for `{paywallEnabled:true, grant:null, hasActiveSubscription:undefined}`.
   **Code path is wired correctly — ruled out.**
3. **Unintended grant stamped on new shops?** No. Grepped every writer of
   `subdomain_grant`/`custom_domain_grant` across both app repos
   (`grep -rln "subdomain_grant" apps/miyagisanchez apps/backend`) — only the admin
   grant/revoke route, the Stripe webhook completion handlers, and the one-time
   grandfather backfill script write it; nothing in `lib/provisioning.ts`'s
   `ensureSupabaseShopMirror` INSERT path, the sweepstakes onboarding
   (`lib/sweepstakes-seller.ts`), or the promoter close flow (`subdomain` isn't wired
   into promoter close yet — only `custom_domain`/`ml_sync` are, per PR #155). Queried
   the two most-recently-created shops in the DB (`miyagi-studios`, 2026-07-01;
   `ricas-tortas`, 2026-07-02) — both carry **no** `subdomain_grant` in metadata.
   **Ruled out.**
4. **Live end-to-end proof:** `miyagi-studios` — a real post-cutover shop (created
   2026-07-01, genuine Clerk-owned seller, no grant, no subscription) —
   `curl -sI https://miyagi-studios.miyagisanchez.com/` returns:
   ```
   HTTP/2 301
   location: https://miyagisanchez.com/s/miyagi-studios
   ```
   Correct gating, live, in production, right now.

**Conclusion (Daniel-confirmed 2026-07-02):** close as non-reproducible. No runtime code
changed — PR [#160](https://github.com/danybgoode/miyagisanchezcommerce/pull/160) adds two
regression tests to `e2e/subdomain-pricing.spec.ts` naming the exact reported scenario as a
permanent guard, so if this ever regresses, CI catches it. Possible (unprovable,
non-actionable) explanation for what Daniel saw: the 60s in-process flag cache
(`lib/flags.ts`) fails open to OFF on a cold serverless-instance miss — a brief,
self-healing window right after a fresh deploy/cold start, not a bug to fix.

## Sprint QA
- Deterministic gate: `tsc` + `next build` + Playwright `api` suite green vs the branch preview — ✅ green (13/13, incl. 2 new tests), PR #160.
- Regression spec added per acceptance above — ✅ (no code fix needed; see Root cause).

## Sprint 0 — Smoke walkthrough (real, as-run 2026-07-02)
Env: production · https://miyagisanchez.com

1. Query the shared Supabase `platform_flags` table for `subdomain.paywall_enabled`.
   → `enabled: true`. (If this ever reads `false`/absent, that IS the bug — flip it back
   ON only after confirming the grandfather backfill already ran; see subdomain-pricing
   epic memory.)
2. Open `https://miyagi-studios.miyagisanchez.com/` (a known real, non-grandfathered,
   non-promoter shop) in a private window — or `curl -sI` it.
   → `301` to `https://miyagisanchez.com/s/miyagi-studios` (URL bar/`location` header
   shows the apex `/s/` URL).
3. Open `https://miyagisanchez.com/shop/manage/settings` (Canal section), signed in as
   that seller (owed to Daniel — needs the real session).
   → The subdomain block should show the buy upsell ($199 MXN/año · $25 MXN/mes), not an
   active subdomain. **Not independently re-verified this pass** (no test session) — the
   code trace above confirms it reads the same entitlement value as step 2.
4. Open a known grandfathered shop's subdomain (e.g. any shop created before
   2026-06-30's cutover backfill).
   → Still serves white-label (no regression) — consistent with steps 1–2 (grant present
   ⇒ `deriveDomainEntitlement` short-circuits to `entitled:true` before ever needing the
   flag/subscription state).

If any step fails, note the step number + what you saw — that's the bug report. Re-run
step 1 first: a flipped-OFF or missing flag row is still the single most likely real
regression path (Supabase `platform_flags` is shared dev/prod — see LEARNINGS — a stray
write from another session could disable it).
