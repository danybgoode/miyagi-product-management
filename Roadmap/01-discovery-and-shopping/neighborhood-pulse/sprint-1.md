# Neighborhood Pulse — online community feed — Sprint 1: Feed exists, opt-in-gated, and feels alive

**Status:** ✅ merged to `main` · rollout smoke pending after MED migration + seed opt-in

> The skateboard. Backend-first: ship the opt-in flag, then the feed that reads it, then the trending strip and
> entry points. The feed is **read-only** and starts **empty** by design (deliberate web opt-in) — seed it at
> launch by opting in a batch of existing approved items.

**Merged PRs:**
- App: [`miyagisanchezcommerce#55`](https://github.com/danybgoode/miyagisanchezcommerce/pull/55) → merge commit
  `48e9fc5c567fd4e7f1eac9b909ca9cba6ccfc2d3`.
- Docs: [`miyagi-product-management#4`](https://github.com/danybgoode/miyagi-product-management/pull/4) → merge
  commit `fc06621898b5bd666a32e1ad7251bde536caf7da`.

## Stories

### Story 1.1 — Moderator web opt-in flag (`web_visible`, default OFF)
**As a** moderator, **I want** to deliberately opt an approved contribution into the online feed, **so that**
approving an item for print never auto-publishes it to the web and I control what neighbors see online.
**Detail:** additive `web_visible` boolean (default **false**) on `print_social_submissions`; a "Mostrar en
línea" toggle in the admin social queue, wired through `PATCH /api/admin/print/social/[id]` (extend the existing
`STATUSES` patch handler — add `web_visible` to the allowed patch keys).
**Acceptance:**
- A freshly `approved` item is **not** web-visible until a moderator toggles it on.
- Toggling on then off re-hides it from the feed; its print availability (`approved`/`placed`, edition
  assignment) is unaffected either way.
**Risk:** MED — the one additive **schema change** (`BOOLEAN NOT NULL DEFAULT false`, non-commerce table). **Daniel merges.**
*Deploy backend-first, ahead of S1.2.*
**Build:** ✅ app commit `3d8a03c` (`feat(neighborhood-pulse): add social web opt-in`).

### Story 1.2 — Public `/vecindario` feed of opted-in approved items
**As a** buyer, **I want** to open a public neighborhood feed and see what my community is sharing, **so that**
the marketplace feels alive and local even when I'm not actively shopping.
**Detail:** new public route `/vecindario` rendering `print_social_submissions` where `web_visible = true` AND
status ∈ {`approved`,`placed`}, newest first — type chip, caption, body, photos, colonia/zona tag, submitter
name. Read-only; null-safe (`web_visible ?? false`) so it's a safe no-op during the deploy-lag window.
**Acceptance:**
- `/vecindario` lists only opted-in approved items; it **never** shows `submitted`/`rejected`/not-opted-in items.
- A card with no photo / no zona still renders cleanly (graceful degrade).
- A missing submitter name uses the public fallback copy and never falls back to `submitter_email`.
**Risk:** low.
**Build:** ✅ app commit `0031877` (`feat(neighborhood-pulse): add public feed`).
**Review fix:** ✅ app commit `edef05b` (`fix(neighborhood-pulse): avoid public email fallback`).

### Story 1.3 — Trending-listings strip
**As a** buyer, **I want** to see what's trending locally without searching, **so that** I discover worth-buying
items through neighborhood signal, not just search.
**Detail:** a "Tendencias" strip on `/vecindario` ranking **existing** listings via a pure
`lib/neighborhood-rank.ts` seam (weights over `views` + favorites + recency), null-safe with a recency fallback.
**Acceptance:**
- The strip shows real listings ordered by the stated signal; with thin/zero signals it falls back to recency
  and never renders empty or errors.
**Risk:** low.
**Build:** ✅ app commit `f0c35c5` (`feat(neighborhood-pulse): rank trending listings`).

### Story 1.4 — Entry points + contribute loop
**As a** buyer/contributor, **I want** to find the feed and add to it, **so that** the community surface is
discoverable and the contribute loop is obvious.
**Detail:** link `/vecindario` from discovery nav + the mobile tab/menu; a "Comparte con tu colonia" CTA on the
feed → existing `/comunidad/nuevo`; and link the contribution success screen to the live feed. New es-MX strings
in a next-free `lib/` module.
**Acceptance:**
- `/vecindario` is reachable from the marketplace nav; the contribute loop is two clicks each way.
**Risk:** low.
**Build:** ✅ app commit `80266dc` (`feat(neighborhood-pulse): add feed entry loop`).

## Sprint QA
- **api spec(s):**
  - S1.1 → `e2e/neighborhood-pulse.spec.ts`: admin PATCH sets/clears `web_visible`; default is OFF.
  - S1.2 → same spec: the feed route returns only `web_visible && approved/placed`; excludes draft/rejected/not-opted-in.
  - S1.3 → pure-logic spec on `lib/neighborhood-rank.ts` (ordering + recency fallback + null-safety).
- **browser smoke owed:** **No auth owed to Daniel** — S1.4's render check is an *anonymous* browser smoke
  (`*.browser.spec.ts`): the feed + CTA render with no login. (S1.1's admin toggle is secret-gated, covered by
  the api spec.)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

**Pre-merge verification (local, branch `feat/neighborhood-pulse`):**
- ✅ `./node_modules/.bin/tsc --noEmit`
- ✅ `npm run build`
- ✅ `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 npm run test:e2e` → `267 passed`, `4 skipped`
- ✅ Focused anonymous browser smoke: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 ./node_modules/.bin/playwright test --project=browser e2e/neighborhood-pulse.browser.spec.ts`
- ✅ In-app Browser visual pass on `/vecindario` at desktop + 390px mobile.
- ✅ Post-review local fix gate:
  - `./node_modules/.bin/tsc --noEmit`
  - `npm run build`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 ./node_modules/.bin/playwright test --project=api e2e/neighborhood-pulse.spec.ts` → `9 passed`, `1 skipped` secret-gated smoke
- ✅ PR #55 remote gate after `edef05b`: Type-check + build, Playwright vs preview, Vercel, and Vercel Preview
  Comments all green.
- ✅ Fresh reviewer re-review passed; PR #55 and docs PR #4 were marked ready and merged on 2026-06-09.
- Note: local Supabase does **not** yet have `print_social_submissions.web_visible`; `/vecindario` returned 200
  with the empty state, confirming the backend-first deploy-lag fallback. The secret-gated mutating smoke
  (`NEIGHBORHOOD_PULSE_SMOKE_SECRET`) is available but was not run locally.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

Pre-merge local smoke used `http://127.0.0.1:3013/vecindario`; replace with the Vercel preview URL in PR review,
then production after Daniel merges the MED migration story.

1. Open https://miyagisanchez.com/vecindario in a private window (no login).
   → The neighborhood feed page loads. If no items have been opted in yet, you see an empty-but-tidy state
     (a "Comparte con tu colonia" CTA), **not** an error.
2. **(admin)** In the admin social queue, find an `approved` item and turn ON "Mostrar en línea".
   → The toggle saves; the item now shows `web_visible = true`.
3. Reload https://miyagisanchez.com/vecindario.
   → That item now appears as a card (type chip, caption, photos, colonia tag, submitter name). A `submitted`
     or not-opted-in item does **not** appear.
4. Scroll to the "Tendencias" strip.
   → Real listings render, ordered by the trending signal (or by recency if signals are thin); tapping a card
     opens that listing.
5. **(admin)** Turn the item's "Mostrar en línea" back OFF, reload `/vecindario`.
   → The card disappears from the feed; the item is still available to the print edition.
6. From the feed, click "Comparte con tu colonia".
   → You land on https://miyagisanchez.com/comunidad/nuevo (the existing contribute flow).

If any step fails, note the step number + what you saw — that's the bug report.
