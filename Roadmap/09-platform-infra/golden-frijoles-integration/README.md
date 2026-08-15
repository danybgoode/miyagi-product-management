---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: golden-frijoles-integration
---

# Epic: Golden Frijoles integration — finish the rebrand, turn the platform all the way on

> **Area:** 09 · Platform & Infra · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/golden-frijoles-integration.md`](../../00-ideas/seeds/golden-frijoles-integration.md)

## Why

Golden Beans is now **Golden Frijoles**. Miyagi consumes it through a pinned SDK tarball that still
carries the old package name, so every import, every provider metadata string and every operator
document disagrees with the engine it talks to. At the same time the platform is carrying 41 feature
flags that exist only because an older process flagged everything by default; the product owner wants
every guarded capability available to 100% of tenants, with one exception — the Envía.com integration,
whose carrier account is unfunded.

When this epic is done there is one SDK under one name, and production's flag state is *provably*
"everything on except Envía" — proven against Golden's live snapshot, not against a catalog file that
merely intends it.

## Medusa-first note

Nothing here is commerce. Golden is a standalone growth/flag control plane in its own repo and its own
Supabase project (`slweidgffcfndnskcskc`); Medusa owns no flag primitive and must not grow one. The
three paywall flags do gate commerce entitlements, and those entitlements already live where they
belong — `marketplace_shops.metadata.custom_domain_grant` and the subscription module — so S3 backfills
existing rows and adds no new entitlement store.

## What already exists (reuse, don't rebuild)

- `apps/miyagisanchez/lib/flag-catalog.ts` — 41 typed flags; `FlagKey` derived from the object keys.
- `apps/miyagisanchez/lib/golden-flag-definition-catalog.ts` — the immutable definition seeds. **39 of
  41 already declare `defaultVariantKey: 'on'`**; only `shipping.envia_enabled` and
  `partners.recruiting_v3_enabled` declare `off`. Every definition ships `rules: []`.
- `apps/miyagisanchez/scripts/sync-flag-catalog.ts` (`npm run flags:sync`) — the definition-registration
  path, needs `GOLDEN_BEANS_FLAG_SYNC_KEY`.
- `apps/miyagisanchez/lib/golden-flag-admin.ts` + `app/api/admin/flags/route.ts` + `/admin/flags` — the
  Clerk-admin-gated read/activate path onto Golden's control plane.
- `apps/backend/src/lib/flag-catalog.ts` — the 13 backend mirrors, a strict subset of the frontend's 41.
- `golden-beans/packages/sdk` — already at 0.4.0 in source, additive over 0.3.0.

## Decisions (locked against live code + the live control plane, 2026-08-14)

**D1 — The SDK release is ours to cut.** `@golden-frijoles/sdk` 0.4.0 exists only in the golden-beans
working tree; the newest published release is `sdk-v0.3.0`. Nothing can migrate until we tag and
publish `sdk-v0.4.0` from that repo. Golden is therefore a **fourth repo in this run**, and the release
is S1's first act, not a follow-up.

**D2 — 0.4.0 is additive except for one string, and that string is load-bearing.**
`provider.metadata.name` becomes `'golden-frijoles'` and `'golden-frijoles-scenarios'`. Everything else
new is additive: `explainFlagEvaluation`, `MAX_FLAG_CLAUSES/RULES/VARIANTS`, `SCENARIO_KINDS`,
`SCENARIO_FAULT_KINDS`, `MAX_SCENARIO_ERROR_RATE_BASIS_POINTS`, and the `FlagEvaluationExplanation`
types. Miyagi asserts on neither metadata name today, so the migration is a package rename plus a
lockfile change.

**D3 — The scenario wire protocol keeps the `golden-beans` name. Do not rename it.** Verified on both
sides: Golden still sends and verifies `x-golden-beans-ownership-request`,
`x-golden-beans-ownership-proof`, `x-golden-beans-scenario-request`, and signs
`golden-beans-target-registration-v1` / `-request-v1` / `-response-v1` /
`golden-beans-security-request-v1`. Miyagi's `lib/scenario-target-contract.ts` mirrors them verbatim. A
repo-wide find-and-replace of "golden-beans" during S1 would break the ownership handshake **silently**
— the signature simply stops verifying. S1 renames imports and prose; it never touches a header name or
a signing envelope. A spec pins each of those seven strings so the next agent cannot drift them either.

**D4 — Env var names stay `GOLDEN_BEANS_*` this epic.** `GOLDEN_BEANS_FLAG_READ_KEY`,
`_ADMIN_KEY`, `_SYNC_KEY`, `_ENVIRONMENT`, `_CUTOVER`, `_EVALUATION_SAMPLE_RATE`,
`_PARTNERS_RECRUITING_V3_FLAG_READ_KEY` and `GOLDEN_BEANS_WEBHOOK_SECRET` are set on both Cloud Run
services and in GCP Secret Manager. Renaming them is a production secrets + IAM change — the category
*Operating posture* says gets its own focused decision — for a purely cosmetic gain. Recorded as owed,
not done here.

**D5 — Prior finding corrected: the Golden admin credential is not read-only.** The 2026-08-01 note
"POST returns 401, the admin key is read-only" was a wrong inference from an incomplete request.
Golden's `POST /api/v1/flags/admin` requires an `x-miyagi-clerk-actor` header matching
`^user_[A-Za-z0-9]{1,128}$` and returns the *same* `unauthorized()` body when it is absent as when the
credential is bad — deliberately, so the route is not a credential oracle. A bare curl omits it. The
scope check lives in the `set_flag_admin_boolean` SQL function against a `flag_admin`-scoped,
unrevoked `api_keys` row. **Corollary: the flip must carry a real Clerk actor, so it happens through
Miyagi's own `/admin/flags`, never a script forging an actor id** — forging it would poison Golden's
lifecycle audit, which the route's own comment forbids.

**D6 — "Available to 100% of tenants" is `rules: []`, and that is the assertion.** A Golden flag
resolves through variants plus an ordered rule list; a non-empty `rules` array is exactly how a flag
stops applying to everyone. Every one of the 41 definitions currently ships `rules: []`. Golden has
since shipped a visual rule builder, which makes adding a rule a click. S2 therefore asserts
`rules.length === 0` for every Miyagi flag in the live snapshot — not just that the value reads `true`.
A flag that reads `true` for the evaluating context while carrying a rule is not "on for 100%".

**D7 — Paywall flags are enabled, but only after the grandfather backfill, and in that order.**
`domain.paywall_enabled`, `subdomain.paywall_enabled` and `ml.sync_paywall_enabled` invert the usual
polarity: ON means the gate is *enforced*, so flipping them without preparation cuts off every shop
currently using a custom domain, a subdomain or ML sync for free. The product owner chose
"paywalls ON, grandfather everyone". Sequence, per sprint, and it is not reorderable: backfill the
entitlement for every existing shop → verify the count → flip. The backfill is idempotent and
re-runnable; the flip is the last step.

**D8 — `shipping.envia_enabled` stays OFF and gets a guard.** It is the single stated exception. S2's
sweep is written as an explicit target map, not "set every flag true", so the exception is data rather
than a step someone can forget. A spec asserts the target map's envia entry is `false` — the negation
is allowed, which is what stops the guard from being one that rejects correct output.

**D9 — `partners.recruiting_v3_enabled` flips LAST, alone.** The product owner asked for everything
except Envía, and this is included. But its own epic doc says it is deployed dark pending an authed
operator-versus-Promotor authorization smoke that has never run, and it gates a new authorization
surface on `/us`. It ships in its own PR after the other 38 are live and verified, so that if `/us`
misbehaves the cause is unambiguous.

**D10 — Golden's four new capabilities are surveyed, not adopted.** The rule builder, journey
projections, experiment governance and scenario authoring are all real and all default-OFF in Golden
(`JOURNEY_PROJECTIONS_ENABLED`, `EXPERIMENT_GOVERNANCE_ENABLED`, `SCENARIO_AUTHORING_ENABLED`,
`FLAG_DEFINITION_SYNC_ENABLED` — born OFF). Adopting any of them is a separate epic with its own
outcome. This one records what exists and what it would take, and changes no Golden env var.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Cut `sdk-v0.4.0` from golden-beans | LOW |
| 1 | 1.2 Migrate the storefront to `@golden-frijoles/sdk` | LOW |
| 1 | 1.3 Migrate the backend to `@golden-frijoles/sdk` | LOW |
| 1 | 1.4 Pin the seven wire-protocol strings with a spec (D3) | LOW |
| 2 | 2.1 Derive the live-vs-target flag diff | LOW |
| 2 | 2.2 Bulk activation in `/admin/flags`, Clerk-audited (D5) | HIGH |
| 2 | 2.3 Assert `rules: []` across the live snapshot (D6) | LOW |
| 3 | 3.1 Grandfather backfill for the three paywall SKUs (D7) | HIGH |
| 3 | 3.2 Flip the paywalls, verify no shop lost access | HIGH |
| 3 | 3.3 Flip `partners.recruiting_v3_enabled` alone (D9) | HIGH |

## Deploy order

Golden first (S1.1 — the release must exist before anything imports it), then the two app repos in
either order; the SDK swap is inert at runtime. S2's bulk activation is frontend-only. S3 is
backfill-then-flip, and the backfill must be applied and verified live **before** its flag flips.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Live Golden snapshot shows 40 flags `true`, `shipping.envia_enabled` `false`, and `rules: []` on all 41
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
