# Platform migrations — Shopify connector, parity score, consultant white-glove SKU — Retrospective

_Closed: 2026-07-11_

## What shipped

- **Sprint 0 — Bug: ML re-auth churn.** ✅ MERGED + LIVE 2026-07-11, backend
  [#82](https://github.com/danybgoode/medusa-bonsai-backend/pull/82) → squash `dbe484b`, live on
  Cloud Run revision `medusa-web-00158-8pt`. Reproduced from the actual cron schedule (two
  reconcile jobs on the identical `*/30 * * * *` tick, both calling
  `getAccessTokenForSeller` unserialized) rather than live data (prod's `ml_sync_event` had zero
  `token_refresh` rows to inspect — an honest non-finding, not a clean confirmation). Fixed with a
  check-before-act re-verify + snapshot-and-compare write guard + failure-classification (raced
  vs. transient vs. genuinely dead), deliberately rejecting a full distributed lock as too wide a
  blast radius for a narrow HIGH-risk auth bug. Live prod DB check post-deploy found only 2
  connections, both never-linked, both never-refreshed — meaning the race this fix targets has
  never fired in prod yet, so today's live state can't distinguish "fixed" from "never exercised."
- **Sprint 1 — Shopify connector → staging + parity score.** ✅ MERGED + LIVE 2026-07-11
  (PR [#220](https://github.com/danybgoode/miyagisanchezcommerce/pull/220)). A shop domain in →
  Shopify's UCP-conformant Storefront MCP (`/api/ucp/mcp`, not the simpler but deprecating
  `/api/mcp`) pulls catalog + policies into a staged `supply_batch`, reusing the existing bulk-import
  pipeline end to end — nothing publishes without the existing review/confirm step. A pure parity
  scorer rates 5 sections (announcement/hero/theme/collections/content pages) against Miyagi's
  primitives; validated a real, permanent gap along the way (Miyagi has no arbitrary custom-pages
  model — content pages are 3 fixed routes) and fed it back into the idea funnel instead of
  silently absorbing it. Behind `migrations.connector_enabled` (enablement, created DISABLED,
  confirmed ON in prod same day).
- **Sprint 2 — Money path: `migration` SKU + quoted estimate.** ✅ MERGED + LIVE 2026-07-11
  (PR [#224](https://github.com/danybgoode/miyagisanchezcommerce/pull/224)). `migration` rides the
  existing promoter-SKU rails ($999 MXN flat ≤150 listings, 50% commission) with **no separate
  discount layer** — the admin-set price or the stored quote total IS the number both sides see, by
  construction. Above 150 listings, a pure estimator computes a deterministic tiered price
  ($999 + $3/listing + $199/non-mapped section) and the platform persists it as a quoted-estimate
  record; the close route has no client-suppliable amount field at all, so a close can never charge
  a different number than the quote (proven structurally, not by a runtime comparison). A "very
  custom" (truncated-pull) batch generates no price at all and Telegrams Daniel with the parity
  report link instead.
- **Sprint 3 — Packaging: landing pages + consultant runbook.** ✅ MERGED + LIVE 2026-07-11
  (PR [#230](https://github.com/danybgoode/miyagisanchezcommerce/pull/230), squash `56a4ddd`),
  **built in a dedicated session after S0-S2's deferral.** New `/vende/migracion` hub + one page
  per platform (Shopify → the S1 connector; Tiendanube/WooCommerce → real numbered CSV export
  steps into the shipped importer; Big Cartel → its public `/products.json` endpoint routed
  through the paste/AI-extract path, since it has **no admin export button at all**). A printable
  consultant runbook (`/vende/promotor/migracion`) + a sell-sheet glossary/pitch-script addition +
  a "coming from another platform?" callout on the `negocios`/`servicios` persona pages. Found +
  fixed a real, unrelated pre-existing bug along the way: the admin promoter-pricing screen
  couldn't actually save a price for the `migration` SKU (a UI gate conflated "no discount
  comparison price" with "can't be priced at all"). Every migration price display reads
  `getPromoterSkuPrices()` live, never a hardcoded number — enforced by a source-level regression
  spec, not just a code-review promise.

Every sprint went through this epic's full review sequence where risk warranted it: CI green
(`tsc` + `build` + Playwright), a fresh `pr-reviewer` pass, and (S2, S3) an advisory cross-agent
(Codex) pass. All three review layers caught real, non-blocking issues across the epic, every one
fixed pre-merge — see the sprint docs for specifics.

## What went well

- **Bucket-1/2/3 grooming (Stage 2.5) kept two-thirds of this epic from being built at all.** The
  seed doc explicitly separated "already possible today" (the CSV/JSON import spine — S3 turned
  out to be *positioning*, not code), "light enhancement" (the promoter SKU — a one-line
  `PROMOTER_SKUS` extension riding rails that already existed), from "genuinely new" (the Shopify
  connector, the parity score, the estimate generator). Confirming reuse-first at the gate meant
  the actual net-new surface area across 4 sprints was small and well-bounded.
- **A wire-contract correction caught by building against the real Shopify Storefront MCP, not
  its docs summary.** Sprint 1 discovered live that Shopify actually exposes catalog search on
  two endpoints, one of them carrying a hard deprecation notice for 2026-08-31 — escalated to
  Daniel before building, and the connector was built against the durable `/api/ucp/mcp` endpoint
  instead. The actual payload shape (a JSON *string*, not `structuredContent`; images per-variant,
  not per-product) also differed materially from Shopify's own docs summary — cited and built
  against the real, verified shape.
- **A tamper-proof money guarantee proven structurally, not by a runtime check.** Sprint 2's
  close-from-quote route has no client-suppliable amount field in its request body at all — a
  tamper attempt has nothing to act on, by construction. This shape (verified in a pure, unit-tested
  decision function) is a stronger guarantee than "we compare the submitted amount to the stored
  one and reject a mismatch," and it composed cleanly with the S3 QA discipline of asserting "no
  hardcoded price" at the source level rather than trusting a code-review promise.
- **Two independent review layers repeatedly caught different classes of bug, across every
  reviewed sprint.** S2: a notify path hidden behind the exact condition it existed to catch,
  a broken `.eq(null)` dedupe guard, a hardcoded price duplicated instead of shared. S3: a
  silent `href={undefined}` risk from admin-editable copy-override data (Codex), a bare-brand-name
  cosmetic slip in never-served English copy (`pr-reviewer`). Different mechanisms — diff-pattern
  cross-agent read vs. independent full re-derivation — kept finding real things a single pass
  would have missed.
- **A real, unrelated bug surfaced by simply trying to use the feature the sprint was building
  on.** S3 discovered the admin pricing screen's `migration`-SKU bug only because building the
  runbook/sell-sheet's "read the live price" requirement required actually trying to set one —
  the gap had been latent since Sprint 2 shipped, invisible to code review because the underlying
  API route worked fine; only the UI gate was wrong.

## What we learned

- **A production build's `output: 'standalone'` server (`node .next/standalone/.../server.js`) is
  the only reliable way to locally Playwright-verify a branch when `next dev` doesn't work for the
  repo — and `next start` is NOT a safe substitute despite looking like one.** `next start` printed
  its own warning ("does not work with `output: standalone`") but still served *stale* pre-fix
  content across two full rebuilds in the same session, silently — a real content bug (a locale-copy
  fix) tested green against a build that had never actually picked it up. The standalone server
  needs `public/` and `.next/static/` manually copied in (not included by default) and the real
  server-side env (`.env.local`) sourced into the process env before launch (standalone does not
  auto-load `.env.local` the way `next dev`/`next start` do). *(2026-07-11, platform-migrations S3.)*
- **Turbopack's dev-mode global CSS scanner can crash on a literal string sitting in a `.spec.ts`
  test fixture or code comment — nowhere near any actual Tailwind class usage.** A design-token
  CI lint's own negative-fixture string (`rounded-l-[var(--r-*)]`, deliberately crafted invalid
  syntax to test a regex) got picked up by Turbopack's source-wide class-name scan and produced a
  hard PostCSS parse failure on every `next dev --turbopack` page load — while `next build`
  (webpack production path) built the exact same tree cleanly. When a `next dev --turbopack` 500
  cites a nonsensical, non-Tailwind CSS token, grep the literal string across the whole repo
  (including tests/comments) before assuming a real class-usage bug. *(2026-07-11,
  platform-migrations S3 — matches the shape of the existing Tailwind-JIT-interpolation gotcha,
  but the source this time was a test fixture, not app code.)*
- **`scripts/cross-review.mjs` resolves its target repo from the current working directory, and
  gets it silently wrong from the monorepo root.** Running it from `/medusa-bonsai` (the root
  Roadmap repo) against an app-repo PR number produced `cross-review skipped (empty diff)` — a
  clean, unremarkable-looking skip, not an error — because it was diffing the wrong git repo
  entirely. Always run it from inside the actual app-repo checkout (or worktree) whose PR you're
  reviewing, or pass `--repo owner/repo` explicitly. *(2026-07-11, platform-migrations S3.)*
- **When reusing an existing admin "price vs. regular-price comparison" UI for a new entity that
  has no regular price, check whether the missing comparison value ALSO disables the raw input —
  those are two different questions a single `base == null` check can wrongly conflate.** The
  promoter-pricing screen's "no fixed regular price" state (correctly: hide the discount-math
  comparison) and "admin cannot set ANY price" state (a bug, for any SKU that *is* still directly
  priced at checkout) were gated by the exact same boolean, so the second SKU ever added to this
  pattern (`migration`, after `print_ad`) inherited a real, live-money-relevant bug that sat
  undetected through an entire prior sprint (S2) because the underlying API route worked fine —
  only the UI gate silently blocked the one path that would have exercised it. *(2026-07-11,
  platform-migrations S3.)*

## Gaps / follow-ups

- **S0:** the ≥48h live-connection browser smoke (owed to Daniel) — and per the sprint doc's own
  finding, it needs a test seller with at least one **linked, sync-enabled product**; an idle
  connection (like both of prod's real ones today) never exercises the fixed refresh path at all.
- **S1:** one real Shopify store pulled to staging + the parity report eyeballed for honesty
  (owed to Daniel — a quality judgment an assert can't make).
- **S2:** the full money-path smoke — admin price → promoter close ≤150 cash; generate + close
  from an estimate >150 (including a cross-shop tamper attempt); trip the very-custom Telegram
  notification. None of this is agent-verifiable (real money, real Stripe/net-remittance flows).
- **S3:** copy sign-off is **done** (confirmed by Daniel 2026-07-11). Still owed: setting the
  `migration` SKU's actual live prod price (currently unset — the sell-sheet/runbook price lines
  correctly show nothing until this happens, not a bug), and live verification of the 3 CSV/JSON
  export how-to pages against a **real downloaded export file** per platform — none existed
  anywhere in the repo to build against, so the steps are grounded in official platform
  documentation only.
- **A deliberate v1 scope boundary, not a gap:** two-way/continuous sync back to source platforms,
  a Shopify Admin-API app (heavier, merchant-installed), and direct Tiendanube/WooCommerce/BigCartel
  connectors (their CSV/JSON exports ride the existing importer by design) were all explicitly
  out of scope per the seed doc and remain so.
- **Custom static pages** — the real, permanent parity gap Sprint 1 validated (Miyagi has 3 fixed
  content-page routes, no arbitrary pages model) — was fed back into the idea funnel as
  [`00-ideas/seeds/custom-static-pages.md`](../../00-ideas/seeds/custom-static-pages.md) rather
  than absorbed here; sizing/scheduling that is a future epic's decision, not this one's.
