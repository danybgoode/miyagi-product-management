# Subdomain pricing — Sprint 1: Gate + entitlement + grandfather (behind flag)

**Status:** 🟦 READY — not started. **Risk: HIGH (`middleware.ts`).** Frontend-first. Daniel merges.

| Story | Status | Commit |
|---|---|---|
| US-1 — Gate the middleware subdomain branch (301→/s/slug when unpaid) | ⬜ | |
| US-2 — Grandfather existing shops free at cutover (backfill) | ⬜ | |
| US-3 — Fail-open `subdomain.paywall_enabled` flag | ⬜ | |
| api spec (`e2e/subdomain-pricing.spec.ts`) | ⬜ | |

> Goal: the paywall works end-to-end with entitlement granted by grandfather/hand — **before any checkout
> exists** — and can't trap an existing seller. Mirrors `custom-domain-paywall` Sprint 1.

## Stories

### US-1 — Gate the middleware subdomain branch on derived entitlement
**As a** new shop without entitlement, **I want** `slug.miyagisanchez.com` to redirect to the free
`/s/slug`, **so that** the white-label subdomain is honestly the paid upgrade — and as Daniel, the
subdomain is actually gated. Add `lib/subdomain-entitlement.ts` (clone of the domain seam: grandfather ∨
comp ∨ subscription → `{ entitled, reason }`), keep it **pure + cheap** (it runs in middleware on every
request). In the `middleware.ts` subdomain branch: when the flag is on AND the shop is not entitled,
**301 to `/s/slug`** instead of serving white-label; entitled shops serve exactly as today.
**Acceptance:** flag on + non-entitled shop → `slug.miyagisanchez.com` 301s to `/s/slug`; entitled (or
grandfathered) shop → white-label as today; reserved/infra labels + apex unaffected.
**Risk:** high (`middleware.ts`, every request)

### US-2 — Grandfather existing shops free at cutover
**As an** existing shop, **I want** my subdomain to stay free forever, **so that** nothing is taken away.
A cutover backfill (mirror `scripts/backfill-domain-grandfather.mjs`) stamps a durable
`{type:grandfather}` subdomain grant on **every shop that exists at cutover**; the entitlement seam
recognizes it without a subscription.
**Acceptance:** every shop present at cutover keeps its white-label subdomain after the flag flips (no
301); the backfill is idempotent and has a dry-run.
**Risk:** high

### US-3 — Fail-open rollout flag
**As** Daniel, **I want** to flip the paywall safely, **so that** a Flagsmith outage or bad rollout can
never break live subdomains. Add `subdomain.paywall_enabled` to `lib/flags.ts` (fail-open default
**off ⇒ ungated**, today's free-for-all). US-1 consults it.
**Acceptance:** flag off (or Flagsmith unreachable) ⇒ every subdomain serves white-label as today; flag
on ⇒ US-1/US-2 behavior applies.
**Risk:** low

## Sprint QA
- **api spec(s):** `e2e/subdomain-pricing.spec.ts` (api) — entitlement seam returns entitled /
  not-entitled / grandfathered / flag-off; the middleware decision = white-label vs 301→/s/slug only when
  (flag on AND not entitled); reserved labels + flag-off path ungated.
- **browser smoke owed:** **yes, to Daniel** — with the flag on a preview: a non-entitled test subdomain
  301s to `/s/slug`, and a grandfathered shop's subdomain still renders white-label.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the Vercel preview URL while pre-merge)

1. With `subdomain.paywall_enabled` OFF, open `https://<existing-shop>.miyagisanchez.com`.
   → Renders white-label exactly as today (nothing changed while the flag is off).
2. Run the grandfather backfill dry-run, then for real against the target env.
   → It reports the count of shops stamped; re-running is a no-op (idempotent).
3. Flip `subdomain.paywall_enabled` ON. Reopen `https://<existing-shop>.miyagisanchez.com`.
   → Still white-label (grandfathered).
4. Open a brand-new, non-grandfathered test shop's `https://<new-shop>.miyagisanchez.com`.
   → **301 redirects to `https://miyagisanchez.com/s/<new-shop>`** (the free tier).
5. Open `https://clerk.miyagisanchez.com` / the apex.
   → Unaffected (auth + apex serve normally).

If any step fails, note the step number + what you saw — that's the bug report.
**Risk path:** steps 3–4 change a live universal surface via `middleware.ts` → **owed to Daniel** (and
keep the flag ready to flip OFF as the instant rollback).
