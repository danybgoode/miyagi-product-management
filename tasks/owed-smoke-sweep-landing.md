# Owed-smoke sweep — landed, plus the CI audit it triggered

**Status: ✅ DONE 2026-08-19/20.** Eight PRs across three repos, all merged.

| PR | repo | merge |
|---|---|---|
| #401 | storefront | `b611ddb` — the sweep, de-rotted and guarded |
| #402 | storefront | `43e787d` — one browser run, dead auth env removed |
| #403 | storefront | `fa22c5d` — es-MX suite locale, preview-only skips |
| #163 | backend | `be8708c` — `no-useless-assignment` |
| #164 | backend | `aecee42` — `preserve-caught-error`, 3 money-path rethrows |
| #139 | backend | `c3499d2` — the dependabot bump, green at last |
| #159 | root | `d36b927` — five learnings |
| #160 | root | the MEMORY.md budget guard |

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

## The preview browser layer

Four specs were failing on every preview run. `admin-seleccion` turned out to be the **same `/en`
hop** that had broken `market-selector` — an authorization spec failing on a language feature — so
the fix went to the browser project's default locale rather than to each spec, and
`market-selector`'s earlier per-file pin was removed as a redundant second derivation.

`home-personalization` and `agent-prompt` cannot run on a preview at all: the `x-vercel-protection-bypass`
header CORS-blocks clerk-js, so client session state never resolves. They now skip with a stated
reason and keep their real coverage against production.

Preview browser failures went **12 → 9**, and the job now runs once instead of twice.

## The 9 preview failures — diagnosed 2026-08-20

They were undiagnosable for a structural reason, now fixed. The PR browser job is
`continue-on-error: true`, so it reports success whatever happens; its artifact upload was
`if: failure()`, which in that job **can never fire**. Every browser failure for the life of
the job produced a red ✘ in a log nobody reads and no trace at all. Changing it to
`if: always()` produced **3.7 MB of traces on the next run** (PR #405).

With the evidence, all nine resolve to **one** root cause in a single read: every one of them
rendered the same page —

> 404 — *El anuncio o tienda que buscas no existe o fue eliminado.*

Not four problems across a gallery, a trust box, a claim CTA and an unclaimed PDP. One: **the
preview cannot resolve listings that exist in production.**

What that rules out, with evidence:

- **Not fixture rot.** The nightly runs the same specs with the same Actions secrets against
  production — 9/9 pass, 0 fail (run `32364012183`).
- **Not broken specs.** Same evidence, plus `trust-signals` and `pdp-gallery` reproduced green
  against production locally.
- **Not a stale pin for `pdp-gallery`** — it already discovers its fixture from the live catalog
  and still 404s.

Two candidates remain, and both are infrastructure-side rather than code:

1. **Vercel Preview environment variables.** Vercel scopes envs per environment; if
   `MEDUSA_STORE_URL` / `MEDUSA_PUBLISHABLE_KEY` are set for Production only, a preview has no
   catalog and every PDP 404s. This is the leading candidate.
2. **`STORE_CORS` on `medusa-web` lists only `https://miyagisanchez.com` and `www`** — no
   `*.vercel.app`. Weaker: the storefront reads Medusa server-side, where CORS does not apply.

Settling it needs either the `VERCEL_AUTOMATION_BYPASS_SECRET` (to reach a preview by hand) or a
look at the project's Preview env — both Daniel's to run.

## Owed

- **The two candidates above** — check the Vercel project's *Preview* environment for
  `MEDUSA_STORE_URL` / `MEDUSA_PUBLISHABLE_KEY`. If a preview genuinely cannot carry commerce
  credentials, the honest move is to stop running PDP-dependent specs against previews at all
  (`onVercelPreview()` already exists for exactly that) and let the nightly + the sweep carry them
  against production, where they are green.
- ✅ **A seller test fixture that owns a shop** — done. `qa-playwright-fixture`, documented in
  `e2e/README.md`, probed by the sweep so its absence can never be silent again. It removed one of
  two blockers: `/shop/manage/settings/perfil` went 404 → 500, and the remaining failure is the
  Medusa call.
- A local Medusa on `:9000` for category B's 7 seller entries. Note for whoever picks this up: the
  pre-June **Neon** database is still alive and `apps/backend/.env` still points at it, so a
  non-production commerce DB already exists — see the dev/staging discussion.
