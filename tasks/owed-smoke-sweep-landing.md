# Owed-smoke sweep — landed, plus the CI audit it triggered

**Status: 🟦 IN REVIEW 2026-08-19.** Storefront [PR #401](https://github.com/danybgoode/miyagisanchezcommerce/pull/401)
open (gate green). Backend [PR #163](https://github.com/danybgoode/medusa-bonsai-backend/pull/163)
**merged** → `be8708c1`. Root docs: this file + five `LEARNINGS.md` entries.

`chore/smoke-sweep` was a local-only commit from 2026-07-12 (`34a48e7`) — a 41-entry manifest and a
thin walker over `live-smoke.mjs`, built to work through the "owed to Daniel" smoke backlog. The
2026-08-19 hygiene sweep found it unpushed, proved it rebased clean, and left the landing decision
open because landing it honestly meant *actually running it*. This is that run.

## What the sweep found about itself

Both problems were silent by construction:

- **Two entries pointed at `/vende/migracion` and `/vende/promotor/migracion`**, moved to `/mx/vende/…`
  by #399 behind a `308`. Both kept **passing**.
- **The manifest hand-picks its population** — four browser specs had shipped since it was written
  and nothing anywhere said so.

`e2e/smoke-sweep-manifest.spec.ts` now guards coverage, liveness and freshness. Its freshness check
is scoped to category A / unauthed on purpose: the admin paths `307` for an anonymous caller because
`requireAdmin` works, and failing those would be a guard rejecting correct output.

## Category A — 29/29 against production

26/29 on the first run. `pdp-gallery` did not reproduce (four subsequent greens; a cold 30s `goto` on
a multi-image PDP). The other two were real and are covered in `LEARNINGS.md`:

- **`interaction-feedback`** — a spec defect with a working feature. Its "make the navigation slow"
  setup delayed requests that a prefetched destination never makes.
- **`market-selector`** — stale since #399, and the **only** thing that noticed the `/` ↔ `/en` hop
  shipped at all. `mode: 'serial'` then masked the file's other three tests as "did not run".

`e2e/root-language-hop.browser.spec.ts` now asserts the hop deliberately, which closes the browser
half of the owed one-landing-per-market walkthrough (the ES/EN switcher outranking the browser is
covered; the `en-MX` → immutable-US-market product call is **not** — that is still Daniel's).

## Category B — first run anywhere, and why

It has never run in CI. `ci.yml` set `MS_TEST_BROWSER_AUTH: "1"` and mapped two secret names that do
not exist, and GitHub substitutes an empty string for an unknown secret. Locally, with the documented
dev fixtures: **9 passed, 0 failed, 7 unavailable.**

The seven are blocked on two things, neither a product defect:

1. **No local Medusa on `:9000`** — every `/shop/manage/*` surface calls `getMySeller()`.
2. **No dev Clerk fixture owns a shop** — verified, zero rows in `marketplace_shops` for
   `playwright-buyer`, `playwright-seller` and `agentsm`.

## Owed

- **`.github/workflows/ci.yml` is not in PR #401.** The push token lacks GitHub's `workflow` scope
  and the contents API 404s on workflow paths. Patch: `scratchpad/ci-browser-job.patch`. To land it,
  `gh auth refresh -s workflow`, then push. It deletes a duplicated browser step (the suite ran
  **twice** per PR) and removes the auth env that never resolved.
- **A seller fixture that owns a shop.** Writing one creates a visible merchant on the live
  marketplace — a product-owner call, not a builder's.
- A local Medusa for category B's seller half.
- `pdp-gallery`'s cold-cache `goto`, observed once.
