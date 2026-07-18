# Comparador de costos — Sprint 3: URL analyzer (CONDITIONAL)

**Status:** 🟡 built, PR open — condition confirmed MET (`lib/migration-parity.ts` on `origin/main`
since 2026-07-11, verified against PR state per LEARNINGS)

> **Build condition (decided at grooming, 2026-07-09):** build this sprint **only if**
> platform-migrations US-1.2 (the parity-score module) has landed on `main` by the time S2 closes.
> If it hasn't, **skip — do not stub** — and log a fast-follow seed instead. Verify against
> `origin/main` (PR state), not a local checkout (LEARNINGS).

## Stories

### Story 3.1 — Shop-URL analyzer → prefilled comparison + migration effort
**As a** merchant, **I want** to paste my current shop's URL and get a prefilled comparison plus an
estimated migration effort, **so that** the pitch starts from my actual store, not manual data entry.
**Acceptance:** entering a shop URL on `/comparador` detects the platform + a rough section/catalog
inventory, prefills the calculator, and shows an estimated migration effort rendered from the
migrations epic's shared parity-score module (built there, rendered here — no fork); the analyzer is
**rate-limited** (external fetch + token cost) and degrades gracefully to manual entry on any
failure/timeout; anonymous throughout.
**Risk:** med (external fetch + token cost — the rate limit is part of acceptance)

## Sprint QA
- **api spec(s):** analyzer spec with a fixture URL (platform detected, calculator prefilled);
  rate-limit spec (burst → friendly degrade); failure path degrades to manual entry.
  Built: `e2e/shop-url-analyzer.spec.ts` (17 pure fixture specs — detection, inventory,
  parity attach-only-for-Shopify) + `e2e/comparador-analyze-route.spec.ts` (10 HTTP specs —
  validation/SSRF rejection pre-fetch, burst→degrade). Every spec observed RED once
  (module/route deleted, re-run, confirmed fail, restored, confirmed green) before merge.
- **browser smoke owed:** yes, to Daniel — analyze a real live shop URL end-to-end (see
  walkthrough below).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
  Ran clean in the worktree: `tsc --noEmit` clean, `npm run build` compiled with `/` still
  `○` static (1m revalidate, unchanged), full `api` suite 2459 passed / 7 pre-existing failures
  confirmed unrelated (same 7 fail identically on a clean `origin/main` checkout in this dev-mode
  environment — home-static/home-auth-leakage prerender-in-dev-mode + 5 launchpad flag-gate
  routes returning 404 instead of 423, all environmental, none touch this sprint's files).

## Build notes (2026-07-18)
- **Detection:** regex/signal heuristic on the fetched homepage HTML + hostname
  (`lib/shop-url-analyzer.ts`, next-free/pure) — Shopify (`*.myshopify.com`, `cdn.shopify.com`,
  generator meta), Tiendanube (`tiendanube`/`nuvemshop` signals), WooCommerce
  (`wp-content/plugins/woocommerce`, generator meta), Mercado Libre (hostname). No LLM call —
  "token cost" in the original acceptance read as caution language, not a hard requirement;
  rate-limiting is justified by the external-fetch/abuse surface alone. Rough catalog/section
  counts come from JSON-LD `Product` entries / `/productos/` `/products/` links / `<nav>` anchors
  — honestly approximate, documented as such in the module header (can under/over-count a
  JS-heavy SPA storefront that renders catalog client-side).
- **Migration effort (no fork):** `buildParityReport` from `lib/migration-parity.ts` is called
  as-is, ONLY when the detected platform is `shopify` — two of `PARITY_SECTIONS`'s five notes
  name Shopify explicitly (compares Miyagi against Shopify's storefront model specifically), so
  attaching that table to a detected WooCommerce/Tiendanube shop would misattribute the notes to
  the wrong competitor. Those platforms still get their section/catalog estimate and prefill the
  calculator; the migration-effort table is honestly omitted with a one-line note instead.
- **SSRF hardening** (`lib/shop-url-analyzer-fetch.ts`, `server-only`) mirrors
  `lib/shopify-mcp-client.ts`'s connector discipline (this route is a fully open target — any
  public shop URL, not an allow-listed host like `app/api/img`): `isPublicDomainShape` shape
  check → DNS-resolve every address and reject any loopback/private/link-local/reserved result →
  https-only → `redirect: 'error'` → 8s timeout → 2 MB streamed byte-cap with a running counter
  (never buffers an unbounded body; the boundary chunk that crosses the cap is trimmed and kept,
  not dropped whole) → `text/html`-only content-type gate.
  **CORRECTION (2026-07-18 review round):** an earlier draft of this doc and the PR body
  overclaimed the DNS-resolve step as "closing" the DNS-rebinding gap. It does not — it's
  **substantially mitigated, not closed**: the resolve-then-`fetch()` pattern has an inherent
  TOCTOU window identical to the pre-existing `lib/shopify-mcp-client.ts` connector's own
  `assertPublicHost`. Bounded further by https-only (TLS certificate validation against the
  original SNI/hostname — a rebound IP presenting the wrong cert can't silently succeed),
  `redirect: 'error'`, the 8s timeout, the 2 MB cap, and — specific to this analyzer — the raw
  fetched body is never returned to the caller (only derived counts/booleans), so even a
  successful rebind can't exfiltrate arbitrary bytes through this endpoint. A real fix (DNS-pin
  the resolved IP so the fetch can't re-resolve) is filed as a follow-up seed, not built here:
  [`Roadmap/00-ideas/seeds/ssrf-dns-pinning.md`](../../00-ideas/seeds/ssrf-dns-pinning.md) — also
  applies to the pre-existing `lib/shopify-mcp-client.ts`.
- **Rate limit:** new `comparator_analyze` key in `lib/ratelimit.ts`, 8 analyses per IP per 10
  min (Upstash-backed, fails open if unconfigured, same contract as every other limiter).
- **Prefill:** on a successful detection the calculator's `platform` select is set directly
  (`ComparadorTool`'s `setPlatform`) — tier/band/hosting stay at default (not reliably derivable
  from a homepage scrape); documented as an honest limitation, not silently guessed. Volume/AOV
  are explicitly NOT derived from the catalog/section counts (no sensible mapping — catalog size
  and monthly sales volume are unrelated dimensions) — the UI copy says so directly rather than
  implying a prefill that isn't happening; the visitor still enters volume/AOV manually.
- **Review round 2 (2026-07-18):** fresh reviewer approved the code, recommended a Daniel merge
  (first fully-open SSRF surface in the codebase) rather than auto-merge, and caught the
  DNS-rebinding overclaim above plus three should-fixes, all applied: (a) the byte-cap boundary
  chunk is now trimmed+kept instead of dropped; (b) the "prellenamos" copy no longer implies a
  volume/catalog prefill that wasn't happening (see Prefill note above); (c) natural es-MX
  pluralization (`pluralEs` helper — "1 producto" / "2 productos") replaces the `producto(s)`
  shorthand.
- **PR:** [#280](https://github.com/danybgoode/miyagisanchezcommerce/pull/280) — risk tier MED
  per this doc (external fetch); **Daniel merges** per the round-2 reviewer's recommendation
  (first fully-open SSRF surface in the codebase), not auto-merged. NOT merged by this agent.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/comparador and paste a real Shopify shop URL into "Analiza tu tienda".
   → Within a few seconds the platform is detected and the calculator prefills; an estimated
     migration-effort summary appears.
2. Paste a nonsense URL.
   → A friendly es-MX error; manual entry still works.
3. Repeat the analysis several times quickly.
   → The rate limit engages with a friendly message, not a crash.

If any step fails, note the step number + what you saw — that's the bug report.
