# mschz.org full coverage — short links for every shareable surface — Sprint 1: Prefix passthrough + reserved words + share-UI surfacing

**Status:** ⬜ not started

## Stories

### Story 1.1 — Known-prefix passthrough in the short-link middleware branch
**As a** merchant (or promoter) sharing a Miyagi page, **I want** `mschz.org/<prefix>/…` to open the
identical path on `miyagisanchez.com` for the public prefixes `/g /e /v /s /l`, **so that** one short
branded domain covers sweepstakes, events, voting campaigns, shops (and their subpages), and listings.
**Acceptance:**
- `mschz.org/g/<live-sweepstake>` 301s to `https://miyagisanchez.com/g/<live-sweepstake>` (same for
  `/e`, `/v`, `/l`, and `/s/<shop>/c/<collection>`).
- Path **and query string** are preserved verbatim (`mschz.org/e/<slug>?lang=en` keeps `?lang=en`);
  only the prefix match is case-insensitive (`mschz.org/G/<slug>` works).
- Flat single-segment links behave exactly as today (shop slug, 90-day alias, product short-slug,
  short code, home, branded 404) — passthrough runs only for multi-segment paths.
- Multi-segment paths with a non-allowlisted prefix (e.g. `mschz.org/checkout/x`,
  `mschz.org/shop/manage`) → branded 404, same as unknown flat segments.
- Pure prefix matcher extracted to `lib/shortlink.ts` (no DB, unit-testable).
**Risk:** high (shared `middleware.ts` — announce the change; Daniel merges)

### Story 1.2 — Reserve `g`, `e`, `v` in both slug lists (defense-in-depth)
**As the** platform, **I want** `g`, `e`, `v` added to `RESERVED_SLUGS` in `lib/slug.ts` **and** the
backend mirror (`apps/backend/src/api/store/sellers/me/route.ts`), **so that** no shop or product can
ever claim a passthrough prefix as a flat segment, even if the ≥3-char format rule is later relaxed.
**Acceptance:**
- The shop-slug editor and the product short-slug field both reject `g`/`e`/`v` (and still reject
  `s`/`l`) with the existing "reservado" copy.
- One-off prod SQL sanity check recorded in the PR: no `marketplace_shops.slug`, alias key,
  `short_slug`, or `short_code` equals any single reserved letter (expected: structurally impossible
  today — confirm and note).
- Backend change lands as its own small PR in the backend repo (no preview rail → post-merge API smoke).
**Risk:** low (additive validation; two-repo sync noted)

### Story 1.3 — Share UIs surface the mschz form
**As a** seller sharing a sweepstake, event, or voting campaign, **I want** the copy-link/QR surfaces
to use `mschz.org/<prefix>/<slug>`, **so that** printed QRs and social posts carry the short domain.
**Acceptance:**
- Sweepstakes QR + copy link (`lib/sweepstakes.ts` / `SweepstakesManager.tsx`) emit `mschz.org/g/…`.
- Events copy link (`lib/events.ts` / `EventsManager.tsx`) emits `mschz.org/e/…`.
- Launchpad QR + public-page link (`campaigns/[id]/qr/route.ts` / `CampaignsManager.tsx`) emit
  `mschz.org/v/…`.
- Each short URL scanned/clicked lands on the correct public page (via the Story-1.1 301).
**Risk:** low (copy/UI on existing surfaces; es-MX copy unchanged or per existing dictionary)

## Sprint QA
- **api spec(s):** extend `e2e/shortlink.spec.ts` (pure prefix-matcher cases: allowlist hit,
  non-allowlisted multi-segment, case-insensitive prefix, query preservation, single-segment
  fall-through) + an api-project spec asserting live 301 `Location` targets for each prefix, the 404
  fallback, and an unchanged flat lookup; reserved-word rejection asserted via the existing
  slug/shortlink check endpoints.
- **browser smoke owed:** yes, to Daniel — QR scan of a printed/mschz sweepstakes code (camera path
  can't be automated); everything else covered by api specs.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://mschz.org / https://miyagisanchez.com   (preview URL pre-merge — note
mschz.org host-routing only exercises fully on prod; pre-merge, assert middleware behavior with a
Host header via curl/Playwright)

1. Open https://mschz.org/g/<live-sweepstake-slug>
   → Browser lands on https://miyagisanchez.com/g/<same-slug>, the sweepstake entry page.
2. Open https://mschz.org/e/<live-event-slug>?lang=en
   → Event RSVP page loads with `?lang=en` still in the URL (English copy).
3. Open https://mschz.org/s/<test-shop>/c/<collection>
   → The shop's collection page loads on miyagisanchez.com.
4. Open https://mschz.org/<test-shop> (flat, no prefix)
   → Still 301s to the shop home — unchanged flat behavior.
5. Open https://mschz.org/checkout/anything
   → Branded 404 (miyagisanchez.com/404), not a half-working page.
6. In Vende → Sorteos, open a campaign's share/QR block.
   → The link and QR now show/encode `mschz.org/g/…`; scanning the QR with a phone opens the entry
   page. **(QR camera scan — owed to Daniel.)**
7. In shop settings, try to set the shop slug to `g`.
   → Rejected: "Ese slug está reservado. Elige otro."

If any step fails, note the step number + what you saw — that's the bug report.
