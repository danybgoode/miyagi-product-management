---
title: "mschz.org full coverage — short links for every shareable surface"
slug: mschz-full-coverage
status: scaffolded
area: "07"
type: chore
priority: wave-1
risk: high
epic: "07-agentic-and-federated-commerce/mschz-full-coverage"
build_order: null
updated: 2026-07-09
---

# mschz.org full coverage — short links for every shareable surface

**As a** merchant (or promoter) sharing anything on Miyagi, **I want** any shareable `miyagisanchez.com`
URL to have a working `mschz.org` equivalent, **so that** one short branded domain covers the shop, its
listings, its sweepstakes, its events, and any future public surface a merchant can enable.

## Stage-2.5 bucket: light enhancement
The short-link middleware branch already exists and resolves the flat namespace (shop slug → 90-day
alias → product `short_slug` → `short_code`). This ask extends that branch — no new domain, cert, or
minting plumbing.

## Decision (Daniel, 2026-07-09): known-prefix passthrough
`mschz.org/<prefix>/…` 301s to the identical path on `miyagisanchez.com` for an explicit allowlist of
public shareable prefixes. **Deliberately no coverage** for session-bound or private surfaces
(checkout, account, `/shop/manage`, `/admin`, API routes) — nothing shareable lives there, and covering
them would only invite confusing half-working links.

### Allowlist (v1)
| Prefix | Surface | Why it's shareable |
|---|---|---|
| `/g/…` | Sweepstakes public entry | QR + social is the whole point |
| `/e/…` | Event RSVP page | Same |
| `/v/…` | Launchpad voting campaign | Same |
| `/s/…` | Shop + all its public subpages (`/c/[collection]`, `/convocatoria`, content pages) | The canonical shop URL family |
| `/l/…` | Canonical listing URL | Complements the flat product code |

Everything else that is multi-segment → branded 404 (same as unknown flat segments today).
Flat single-segment resolution keeps working unchanged — it stays first in the resolver order.

## What already exists (reuse, don't rebuild)
- `middleware.ts` short-link branch (`isShortLinkHost`, `firstSegment`, flat resolver, branded 404,
  never-500 catch; lines ~158–202) — the passthrough is a ~15-line addition *before* the flat lookup.
- `lib/shortlink.ts` (pure helpers, unit-tested in `e2e/shortlink.spec.ts`) — the prefix matcher
  extracts here for free pure-logic coverage. `lib/shortlink-server.ts` — the namespace-taken check.
- **Reserved words live in `lib/slug.ts` `RESERVED_SLUGS` + the backend mirror**
  (`apps/backend/src/api/store/sellers/me/route.ts` `RESERVED_SLUGS` — separate repo, keep in sync):
  both already contain `s`, `l`, `mschz`; **`g`, `e`, `v` must be added to both**.
- Sweepstakes QR generation (`/g/[slug]`) — once the passthrough lands, campaign QRs can mint
  `mschz.org/g/…` instead of the long domain (copy-length win on print materials).
- Share-link surfaces (where the mschz form gets shown): `lib/sweepstakes.ts:71` (QR URL builder) +
  `SweepstakesManager.tsx:206` (copy link); `lib/events.ts:24` + `EventsManager.tsx:225`;
  launchpad `campaigns/[id]/qr/route.ts:26` + `CampaignsManager.tsx:224`.

## Groom verification (2026-07-09)
- **All five prefixes are real, shareable route families** in `app/(shell)`: `g/[slug]`, `e/[slug]`,
  `v/[slug]`, `s/[slug]` (+ `/c/[collection]`, `/convocatoria`, `/faq`, `/politicas`, `/acerca`),
  `l/[id]`.
- **Reserved-word collisions are structurally impossible today**: every flat-segment write path
  (backend shop-slug PUT, listing `short_slug` PUT, both availability checks) runs `validateSlug`
  with `SLUG_MIN = 3`, so single-char segments can't be claimed; `short_code` is 6-char base36;
  90-day aliases derive from previously-validated slugs. Adding `g`/`e`/`v` to both reserved lists
  is defense-in-depth against a future format relaxation, not a data migration. Acceptance still
  includes a one-off prod SQL sanity check (no `marketplace_shops.slug`, alias key, `short_slug`,
  or `short_code` equal to a single reserved letter) — cheap, closes the legacy-data question.
- **Backend touch = a second small PR** in the backend repo (reserved-list sync); no preview rail —
  post-merge API smoke only, per WAYS-OF-WORKING.
- **Preserve path + query on passthrough**: the flat resolver drops the query string (fine for flat
  codes), but `/e/…?lang=en` is a real, shipped toggle (`lib/events.ts:29`) — the passthrough 301
  must carry `pathname + search` verbatim (lowercase only the matched prefix, not the remainder).
- **Single-segment behavior unchanged**: `mschz.org/g` (no second segment) stays on the flat
  resolver → branded 404; passthrough triggers only for multi-segment paths, per the decision.

## Scope boundary
**In:** prefix passthrough; reserved-word guard; the sweepstakes/event share UI showing the mschz form
where it already shows a share link; case-insensitivity; e2e specs.
**Out:** per-campaign short codes (revisit only if analytics show long slugs hurting scans); any new
minting UI; coverage of non-listed prefixes.

## Slicing (single story, one sprint — fold into a hygiene sprint if preferred)
1. **Prefix passthrough + reserved words + share-UI surfacing.** Risk: **HIGH** (touches shared
   `middleware.ts` → announce the change; Daniel merges). QA: unit spec on the pure prefix matcher
   (extract to `lib/shortlink.ts`), e2e spec asserting 301 targets for each prefix + 404 fallback +
   flat namespace unchanged.

## Kill-switch decision (risk: high)
**Carve-out — rationale corrected at groom (2026-07-09).** The original "middleware is Edge, the
flag reader can't run there" reason is **stale**: `middleware.ts` now runs `runtime: 'nodejs'` and
the in-house `lib/flags.ts` reader is already used inside it (subdomain-pricing US-1), so a runtime
flag IS technically possible. The carve-out stands on the remaining ground: a pure additive 301
allowlist with fail-through to today's behavior, no money/auth path, reverted with `git revert` —
a redirect table doesn't warrant a flag. *(Daniel re-confirms this at the scope-doc gate, since the
option he ruled out on Edge grounds is now cheap.)*

## Smoke walkthrough owner: Daniel (production URLs: one `/g/`, one `/e/`, one `/s/<shop>/c/<collection>`, one flat shop + product, one garbage path).
