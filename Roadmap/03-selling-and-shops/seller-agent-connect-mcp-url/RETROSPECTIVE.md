# Retrospective · Seller agent connect (03, mixed LOW→HIGH)

**Shipped:** 2026-07-02, 2 sprints. S1 [#158](https://github.com/danybgoode/miyagisanchezcommerce/pull/158)
merged `893d23b` · S2 [#159](https://github.com/danybgoode/miyagisanchezcommerce/pull/159) merged `4be2b86`.

## What shipped
- **S1 — `buildSetupPrompt()` interviews instead of emitting a bare skeleton** on thin input (`lib/setup-spec.ts`),
  inherited by `/sell/setup`, `/agent`, and `/api/ucp/setup-spec` (one function, three callers).
- **S2 — an always-on personal MCP URL** (`https://miyagisanchez.com/api/ucp/mcp/c/<slug>`) resolving to the
  exact same seller-tool scope as today's Bearer token, plus a one-click "Agregar a Claude" deep-link. Ships
  behind `seller_agent.connector_url_enabled` (default off, created disabled).

## What went well
- **The auth design held up exactly as planned.** The core idea — one resolver
  (`lib/agent-auth.ts#resolveAgentShop`) recognizing two credential prefixes (`ms_agent_` hash lookup
  unchanged, `ms_connector_` plaintext lookup new) — meant `app/api/ucp/mcp/route.ts`, the file carrying every
  existing seller-tool handler, has **zero lines changed**. The new URL route is a thin gate + forward, not a
  parallel implementation. Confirming this design with Daniel in plan mode *before* writing code (rather than
  after) meant zero rework.
- **The `FLAG_META: Record<FlagKey, FlagMeta>` drift guard worked as designed** (epic 09 ·
  feature-flags-inhouse) — adding the new flag key to `lib/flags.ts` without also registering it in
  `lib/flags-admin.ts` failed `tsc` immediately, not silently at runtime or in an admin-page rendering bug.
- **Codex cross-review (`scripts/cross-review.mjs --agent codex`) caught 2 real bugs** a single-pass human/
  Claude review plausibly would have missed too: a rate-limit-before-flag ordering that let a throttled
  client get `429` instead of a deterministic `404` when the feature is off, and a `revokeConnector()` that
  cleared the shown URL on ANY response (including a non-2xx one, which `fetch` doesn't throw on) — meaning a
  failed revoke could tell a seller "revoked" while the credential was still live. Both fixed same-session,
  before merge.
- **Reusing `ConnectAgentPanel` for the settings page, not just `/sell/setup`,** collapsed a pre-existing
  duplication (the settings page had hand-rolled its own copy of the same token UI) instead of adding a
  *third* copy for the new URL feature.

## What we learned (promoted to `LEARNINGS.md`)
- **Local dev pointing at the same Supabase project as production blocks a whole class of "verify locally"
  plans.** The plan assumed flipping `platform_flags` "locally, dev-only" was safe; it wasn't — there is no
  isolated dev DB, so that verification step was silently unsafe until checked. Caught before acting, not
  after.
- **A generalization of the flag→auth→config ordering rule:** the flag check must precede *every* other
  gate on a flag-off path, including rate-limiting — not just secret/config reads. A throttled request with
  the feature off should still read as "doesn't exist" (404), not "exists but you're rate-limited" (429).
- **Reconfirms** the existing "a best-effort write must check `res.ok`, not just sit in a try/catch" rule —
  this is the third documented instance of the same class of bug.

## Gaps — owed to Daniel
- Applying the seed migration (`supabase/migrations/20260702120000_seller_agent_connector_flag.sql`) and
  later flipping the flag on — deliberately left as a live-infra, deploy-time step (see README DoD).
- The live claude.ai "add connector → paste URL → call a seller tool" round-trip — no automated harness can
  drive the claude.ai modal or judge agent behavior.
- The valid-slug → own-shop-config-only + rotate-breaks-the-old-URL smoke (`sprint-2.md` walkthrough steps
  2–4) — no authed seller Clerk session exists in the build sandbox.
