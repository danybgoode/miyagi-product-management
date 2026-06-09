# Agent-native setup (Onboarding 0) — Sprint 1: Published versioned setup spec

**Status:** ⬜ not started · **Risk:** low

> Goal: a seller's agent can read a **published, versioned spec + prompt** and emit ONE combined setup
> JSON (shop dressing + catalog + config) **before** the user signs up. No first-run apply yet — this
> sprint just makes the contract exist and be agent-fetchable. Reuse the two shipped schemas unchanged.

## Stories

### Story 1.1 — Compose the one versioned setup spec
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

### Story 1.2 — Unified emit prompt that mirrors the seller's language
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

### Story 1.3 — Publish the spec agent-fetchably
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
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/api/ucp/manifest
   → The JSON includes a `seller_onboarding` block describing the setup-JSON flow and pointing at the spec.
2. Open the public spec surface (e.g. https://miyagisanchez.com/agent — "Para vender / set up a shop"
   section, or the spec endpoint).
   → You see the combined setup schema, an example, and the copyable emit prompt.
3. Paste the emit prompt into Claude/ChatGPT/Gemini with a few sample products in **English** (or any
   non-Spanish language).
   → The agent returns one JSON object with `miyagi_setup_version`, `profile`, `config`, `catalog`, and
     the product copy is in the language you used.
4. Save that JSON — you'll use it in the Sprint 2 smoke.

If any step fails, note the step number + what you saw — that's the bug report.
