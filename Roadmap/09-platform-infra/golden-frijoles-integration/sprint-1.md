# Golden Frijoles integration — Sprint 1: one SDK, one name

**Status:** ⬜ not started

## Stories

### Story 1.1 — Cut `sdk-v0.4.0` from golden-beans
**As a** platform owner, **I want** the renamed SDK published as a real release, **so that** the apps
have something to depend on instead of a version that exists only on my laptop.
**Acceptance:** `gh release view sdk-v0.4.0 -R danybgoode/golden-beans` shows a
`golden-frijoles-sdk-0.4.0.tgz` asset, and `npm view` of that tarball reports name
`@golden-frijoles/sdk`, version `0.4.0`.
**Risk:** LOW

### Story 1.2 — Migrate the storefront to `@golden-frijoles/sdk`
**As a** builder, **I want** the storefront importing the renamed package, **so that** the flag
provider, the mirror, the definition catalog and the scenario provider all speak one brand.
**Acceptance:** no `@golden-beans/sdk` import remains in `apps/miyagisanchez`; `npx tsc --noEmit`,
`npm run build` and the Playwright `api` project are green; `/`, `/mx` and `/mx/l` still render 200
against the branch preview.
**Risk:** LOW

### Story 1.3 — Migrate the backend to `@golden-frijoles/sdk`
**As a** builder, **I want** Medusa importing the renamed package, **so that** both repos resolve the
same flag snapshot through the same client.
**Acceptance:** no `@golden-beans/sdk` import remains in `apps/backend`, including the four Jest
`jest.mock('@golden-beans/sdk', …)` call sites; the unit suite is green; after merge,
`/store/checkout-admission/:id` still reports `owned_shop_only_enabled=true` against production.
**Risk:** LOW

### Story 1.4 — Pin the seven wire-protocol strings (D3)
**As a** future agent, **I want** a spec that fails if anyone renames the scenario handshake, **so
that** a well-meaning find-and-replace cannot silently break signature verification.
**Acceptance:** a spec asserts the exact literals `x-golden-beans-ownership-request`,
`x-golden-beans-ownership-proof`, `x-golden-beans-scenario-request`,
`golden-beans-target-registration-v1`, `golden-beans-target-request-v1`,
`golden-beans-target-response-v1` and `golden-beans-security-request-v1`; changing any one of them
turns the spec red.
**Risk:** LOW

## Sprint QA
- **api spec(s):** 1.4 → `e2e/golden-scenario-wire-contract.spec.ts`; 1.2/1.3 are covered by the
  existing flag-provider and mirror suites, which must stay green across the rename.
- **browser smoke owed:** no — this sprint is inert at runtime by construction (D2).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge, in
  both app repos; `node --test` green in golden-beans for the SDK build.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://github.com/danybgoode/golden-beans/releases/tag/sdk-v0.4.0
   → the release exists and lists `golden-frijoles-sdk-0.4.0.tgz`.
2. Open https://miyagisanchez.com/mx
   → the marketplace renders normally; no error page, products visible.
3. Open https://miyagisanchez.com/admin/flags (Clerk admin session required)
   → the flag table loads with its snapshot version. **This is the proof the renamed SDK still
   resolves Golden's snapshot** — an empty or errored table means 1.2 regressed the provider.
4. Open a product page, e.g. https://miyagisanchez.com/mx/l — pick any listing.
   → the PDP renders, which exercises `pdp_redesign` through the migrated provider.

If any step fails, note the step number + what you saw — that's the bug report.
