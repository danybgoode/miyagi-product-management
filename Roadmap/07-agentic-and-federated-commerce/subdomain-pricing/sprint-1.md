# Subdomain pricing — Sprint 1: Gate + entitlement + grandfather (behind flag)

**Status:** ✅ MERGED — PR [#145](https://github.com/danybgoode/miyagisanchezcommerce/pull/145)
squash `3892006`, deployed to prod **inert** (flag off). **Risk: HIGH (`middleware.ts` + Edge→Node
runtime), Daniel-merged.** Cutover (backfill `--apply` → flip flag) + browser smoke still owed.

| Story | Status | Commit |
|---|---|---|
| Step A — pure entitlement seam (`lib/subdomain-entitlement.ts`) | ✅ | `9b3f902` |
| US-1 — Gate the middleware subdomain branch (301→/s/slug when unpaid) | ✅ | `a703f0d` |
| US-2 — Grandfather existing shops free at cutover (backfill) | ✅ | `0d1b8b0` (+ hardening `a60fd86`) |
| US-3 — Fail-open `subdomain.paywall_enabled` flag | ✅ | `ff8454e` |
| api spec (`e2e/subdomain-pricing.spec.ts`) | ✅ | `db2bdb5` |

> **Merged note.** Gate decision confirmed with Daniel: flag stays in **Flagsmith** (no Vercel Edge
> Config) and the middleware is switched to **`runtime: 'nodejs'`** so `lib/flags.ts` reads in-process
> (~0ms, ~5-min flip propagation). Non-entitled subdomains **collapse every path** to the apex
> `/s/slug`. Subdomain entitlement reads its **own** `metadata.subdomain_grant` key (never
> `custom_domain_grant`); the backfill stamps **all** shops (paginated, validity-checked, row-confirmed).
> Deterministic gate green at merge: `tsc` + `npm run build` (proves the Node-runtime middleware bundles
> the Flagsmith SDK) + api spec (11/11) + CI Playwright-vs-preview. **Reviews:** codex cross-review
> (caught the unpaged-backfill bug → fixed `a60fd86`) + an independent fresh-agent review (nothing
> blocking; fixed the stale `lib/flags.ts` docstring `c887d81`). **Flagsmith flag created** —
> `subdomain.paywall_enabled` id **220951**, created **disabled** (Production), awaiting Daniel's flip.
>
> **Eyes-open tradeoff (Daniel-approved):** `runtime:'nodejs'` is **global** to the matcher → Node
> middleware now fronts *every* request, including the static `(site)` homepage. Accepted for S1; a
> narrower scope (a `proxy.ts` split) is the follow-up if `/` cold-start/cost proves material.
> **Deferred to S2:** a `lib/subdomain-entitlement-server.ts` composer (mirror of the domain one), once
> the billing/settings UI needs it. **Pre-existing:** Next 16 wants `middleware.ts`→`proxy.ts` (separate
> shared-surface migration, not this epic).

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

1. With `subdomain.paywall_enabled` OFF (its default), open `https://<existing-shop>.miyagisanchez.com`.
   → Renders white-label exactly as today (nothing changed while the flag is off).
2. Dry-run the backfill, read the count, then apply it against the target env:
   `node --env-file=.env.local scripts/backfill-subdomain-grandfather.mjs`   (prints "would stamp …")
   then `node --env-file=.env.local scripts/backfill-subdomain-grandfather.mjs --apply`.
   → Dry-run writes nothing; `--apply` stamps `metadata.subdomain_grant` on every shop and reports
     `grandfathered=N`. Re-running `--apply` is a no-op (`skipped(existing grant)=N`, idempotent).
3. Flip `subdomain.paywall_enabled` ON in Flagsmith (allow ~5 min for propagation). Reopen
   `https://<existing-shop>.miyagisanchez.com`.
   → Still white-label (grandfathered).
4. Open a brand-new, non-grandfathered test shop's `https://<new-shop>.miyagisanchez.com` (any path).
   → **301 redirects to `https://miyagisanchez.com/s/<new-shop>`** (the free tier).
5. Open `https://clerk.miyagisanchez.com` / the apex `https://miyagisanchez.com`.
   → Unaffected (auth + apex serve normally; the gate only touches resolved shop subdomains).
6. (Rollback drill) Flip `subdomain.paywall_enabled` OFF again.
   → Within ~5 min the new shop's subdomain serves white-label again — the instant rollback.

If any step fails, note the step number + what you saw — that's the bug report.
**Risk path:** steps 3–4 change a live universal surface via `middleware.ts` → **owed to Daniel** (and
keep the flag ready to flip OFF as the instant rollback).
