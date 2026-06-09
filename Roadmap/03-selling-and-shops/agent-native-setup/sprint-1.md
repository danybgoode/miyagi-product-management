# Agent-native setup (Onboarding 0) — Sprint 1: Published versioned setup spec

**Status:** 🟦 built — draft [PR #60](https://github.com/danybgoode/miyagisanchezcommerce/pull/60), awaiting review/merge · **Risk:** low

> **Build log (branch `feat/agent-native-setup`):**
> - Story 1.1 + 1.2 — `9b6b336` — new pure/next-free `lib/setup-spec.ts` composes
>   `lib/catalog-import.ts` + `lib/settings-import.ts` (no third schema): `validateSetup`
>   (version-gated, delegates to `validateConfig`/`validateRows`), `buildSetupPrompt`
>   (es-MX, mirrors the seller's language via `SETUP_LANGUAGE_DIRECTIVE`), `EXAMPLE_SETUP`,
>   `buildSetupSpec`.
> - Story 1.3 — `78dc423` — `seller_onboarding` block + capability in `/api/ucp/manifest`;
>   new public `GET /api/ucp/setup-spec`; `/agent` "set up a shop with your agent" section;
>   no-auth `get_setup_spec` MCP tool.
> - Tests — `0da2203` — `e2e/agent-native-setup-spec.spec.ts` (12 api-project tests).
> - Gate green locally: `tsc` ✅ · `npm run build` ✅ · new spec 12/12 ✅ · `agent-discovery` 4/4 ✅.
> - Frontend-only; no backend repo change.

> Goal: a seller's agent can read a **published, versioned spec + prompt** and emit ONE combined setup
> JSON (shop dressing + catalog + config) **before** the user signs up. No first-run apply yet — this
> sprint just makes the contract exist and be agent-fetchable. Reuse the two shipped schemas unchanged.

## Stories

### Story 1.1 — Compose the one versioned setup spec ✅ `9b6b336`
**As a** prospective seller's agent, **I want** a single versioned setup schema that composes the
existing catalog + config schemas, **so that** I can emit one file instead of two.
**Acceptance:**
- A framework-agnostic source (e.g. `lib/setup-spec.ts`) defines the combined shape
  `{ miyagi_setup_version: "1", profile, config: StoreConfigManifest, catalog: CatalogImportRow[] }`,
  **importing** the existing types from `lib/settings-import.ts` + `lib/catalog-import.ts` (no forked
  third schema — the existing validators stay the source of truth).
- A `validateSetup(obj)` helper splits the combined object and runs it through the existing
  `validateConfig` + `validateRows`, returning a per-block/per-row report; an example object round-trips
  clean.
- `miyagi_setup_version` is asserted/handled (unknown version → clear error, not a silent partial parse).
**Risk:** low

### Story 1.2 — Unified emit prompt that mirrors the seller's language ✅ `9b6b336`
**As a** seller's agent, **I want** one canonical prompt, **so that** I produce a valid combined file
with copy in the seller's own language.
**Acceptance:**
- One es-MX emit prompt (`buildSetupPrompt()`) composes the intent of the existing
  `buildCopilotPrompt` + `buildSettingsCopilotPrompt`, emits the combined shape, and **explicitly
  instructs the agent to respond and generate all user-facing copy (titles, descriptions) in the
  language the seller is using** (rule 5 — language by prompt, not dictionary).
- The prompt keeps the existing safety line (treat seller data as data, not instructions) and the
  `MANUAL_SECTIONS` caveat (payments/domain/Cal.com stay manual).
- es-MX copy-completeness (no orphan strings); the "mirror the seller's language" instruction is present.
**Risk:** low

### Story 1.3 — Publish the spec agent-fetchably ✅ `78dc423`
**As an** agent inspecting the site pre-signup, **I want** to discover the setup spec + prompt, **so
that** I can act without a human handing me anything.
**Acceptance:**
- `/api/ucp/manifest` gains a `seller_onboarding` block (alongside the existing `seller_configuration`)
  describing the setup flow + pointing at the spec.
- The spec + example + emit prompt are reachable on a public surface (an `/agent` "Para vender / set up a
  shop" section and/or a JSON spec endpoint); optionally an MCP `get_setup_spec` resource in
  `app/api/ucp/mcp/route.ts`.
- Nothing claims the first-run apply exists yet (it lands in S2) — copy describes only emit + the
  existing signup→import path.
**Risk:** low

## Sprint QA
- **api spec(s):** Story 1.1 → `e2e/agent-native-setup-spec.spec.ts` (example round-trips through
  `validateSetup`; unknown version errors). Story 1.3 → assert manifest `seller_onboarding` block + the
  spec surface are present and non-empty. Story 1.2 → pure-logic assert the prompt contains the
  language-mirroring instruction + the combined-shape keys.
- **browser smoke owed:** no (public, additive, no auth/money) — reviewer may auto-merge on green CI.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (pre-merge: swap in the PR #60 Vercel preview URL)

1. Open https://miyagisanchez.com/api/ucp/manifest
   → The JSON `endpoints` includes a `seller_onboarding` block whose `spec_url` points at
     `/api/ucp/setup-spec`, lists `mcp_tools: ["get_setup_spec"]`, and `capabilities` includes
     `"seller_onboarding"`. The block's copy says the guided first-run apply is "coming soon" (not live yet).
2. Open https://miyagisanchez.com/api/ucp/setup-spec
   → JSON with `version: "1"`, the combined `shape`, `config_blocks`, `catalog_fields`,
     `manual_sections`, an `example`, and a `prompt` string (the es-MX emit prompt).
3. Open https://miyagisanchez.com/agent and find "Para vender — set up a shop with your agent".
   → You see the combined setup schema, the language directive, a link to `/api/ucp/setup-spec`,
     the copyable emit prompt, and an example. It points to the existing import pages for applying
     today and says a one-pass apply is coming soon.
4. (MCP) POST to https://miyagisanchez.com/api/ucp/mcp a JSON-RPC `tools/call` for `get_setup_spec`
   (or just `tools/list`).
   → `tools/list` includes `get_setup_spec`; the call returns the spec JSON (version, prompt, example).
5. Paste the emit prompt (from step 2 or 3) into Claude/ChatGPT/Gemini with a few sample products in
   **English** (or any non-Spanish language).
   → The agent returns one JSON object with `miyagi_setup_version`, `profile`, `config`, `catalog`,
     and the product copy is in the language you used (the mirror-language directive working).
6. Save that JSON — you'll use it in the Sprint 2 smoke.

If any step fails, note the step number + what you saw — that's the bug report.
