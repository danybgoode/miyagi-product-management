---
title: "Agent-native setup (Onboarding 0)"
slug: agent-native-setup
status: scaffolded
area: "03"
type: feature
priority: null
risk: high
epic: "03-selling-and-shops/agent-native-setup"
build_order: null
updated: 2026-06-08
---

# Scope — Agent-native setup ("Onboarding 0")

> The deepest, highest-leverage piece of the agent-native GTM. A seller's **own** AI agent does almost
> the entire shop setup: it reads a published spec, emits one standardized **setup JSON** (shop dressing
> + catalog + config), the seller signs up (~20s Google), **pastes/uploads the JSON on a first-run
> onboarding step**, and the shop + catalog are near-fully created. A copied prompt then turns the
> agent into the ongoing **shop clerk** over MCP/UCP. Spawned ask #3 from `seeds/agent-native-gtm/`.
> Sibling to the just-scaffolded `agent-readable-about-surface` (whose `/acerca` "how to start" points
> here). Planning only — no code.

## The one-line ask
*As a prospective seller, I want my own AI agent to set up my entire Miyagi shop — so the only thing I
do is a 20-second signup and a single paste/upload, and then my agent keeps running the shop.*

## Outcome & signal
**After this ships:** a brand-new user can go signup → **one first-run paste/upload** → land in a
populated shop (dressing + catalog + config), with **zero hand-running of the wizard or hunting for
two separate import pages**. And the success screen hands them a **copyable, bilingual "shop clerk"
prompt** that connects their agent over MCP/UCP for ongoing operation.
**How Daniel tests it (real URLs at smoke):**
1. Ask Claude *"set up a Miyagi shop for me"* → it fetches the published setup spec and emits one valid
   combined JSON.
2. Sign up as a fresh user → land on the first-run onboarding step → paste that JSON → see staging →
   confirm → land in a shop with the right brand, products, and settings — **without** visiting `/sell`,
   `/shop/manage/import`, or `/shop/manage/settings/import` separately.
3. On the success screen, copy the "shop clerk" prompt → paste into Claude → the agent connects via the
   per-shop MCP token and can `list_my_listings` / `patch_store_configuration`.

## Stage-2.5 bucket — **mostly "already possible / light-enhancement", a thin slice genuinely new**
**Validated against `main` by reading the real code.** The loop's mechanics are *already shipped* across
two complete epics (03 · Bulk Import & Express Migration; 03 · Seller Agent Operations) + 07 · Agent
Connection. Every step has working code:

| Loop step | Already shipped (reuse, don't rebuild) |
|---|---|
| Agent emits catalog JSON | `lib/catalog-import.ts` — `CatalogImportRow[]` schema, `buildCopilotPrompt()` (es-MX agent prompt), `validateRows`/`parseCatalogFile`, idempotency via `external_id`. Routes `/api/sell/import` (chunked commit), `/api/sell/import/extract` (paste→Gemini Flash→validate), `/api/sell/import/existing` (idempotency preview). |
| Agent emits config JSON | `lib/settings-import.ts` — `StoreConfigManifest` schema, `buildSettingsCopilotPrompt()`, `validateConfig`, `MANUAL_SECTIONS`. Route `/api/sell/settings-import` + `lib/apply-config-manifest.ts` (shared with the MCP patch tool). |
| Paste/upload a file | Two UIs already do paste **and** file **and** show the copyable prompt + staging grid: `/shop/manage/import` (`ImportClient.tsx`) and `/shop/manage/settings/import` (`SettingsImportClient.tsx`). |
| Create shop / catalog / config | `POST /api/sell/shop` creates the seller/shop **standalone, before any listing**; `/api/sell/import` creates products idempotently; `/api/sell/settings-import` applies config atomically. |
| Ongoing "shop clerk" over MCP | Full seller MCP toolset is live: `get_store_configuration`, `patch_store_configuration`, `create_listing`, `list_my_listings`, `update_listing`, `set_listing_status`, `list_offers`, `respond_to_offer` (`app/api/ucp/mcp/route.ts`). Manifest exposes `seller_configuration`; `/agent` already describes "operate as a shop clerk"; "Conecta tu agente" per-shop-token helper exists. |

So Onboarding 0 is **packaging an existing pipeline into a guided first-run agent loop** — not a
from-scratch build. The Medusa-first reframe shrinks it hard: **no new commerce primitives, no new
tables.** The genuinely-new delta is four gaps the loop currently falls into:

- **G1 — No first-run home for the loop.** Both import UIs live under `/shop/manage/*` and **redirect to
  `/sell` when the seller doesn't exist yet** (404). A fresh signup therefore *cannot* paste the full
  setup; today they must hand-run the 3-step `/sell` wizard, then find two separate authed import pages.
  The **paste/upload-on-onboarding step is genuinely new** (exactly what the raw seed predicted).
- **G2 — The setup spec is fragmented and unpublished.** Catalog and config are **two** schemas with
  **two** prompts, and both prompts are buried *inside authed UIs* — invisible to a pre-signup agent.
  There is no single, **versioned, agent-fetchable** "Miyagi Setup JSON" spec the seller's agent can
  read *before* signup to emit the whole shop in one shot. (The manifest has `seller_configuration` but
  no `seller_onboarding`/setup-spec block.) Genuinely new — mostly **contract + content + thin code**.
- **G3 — No canonical "shop clerk" handoff prompt.** The import prompts are one-shot ("emit this JSON").
  There is no canonical, versioned *operate* prompt that turns the agent into the ongoing clerk (connect
  MCP on Claude / discover UCP → polish, price, promote, maintain). `/agent` mentions the concept;
  `AgentHandoff` is an order/refund component, not this. Genuinely new — **content**.
- **G4 — No post-setup loop-close experience.** After setup there's no designed "your shop is live →
  here's your clerk prompt + Conecta tu agente → here's what to do next" moment. Genuinely new — small
  **UX + content**.

## Medusa-first reframe — what already exists (reuse, don't rebuild)
- **Apply routes (reuse wholesale):** `POST /api/sell/shop` (create-shop-standalone),
  `/api/sell/import` + `/api/sell/import/extract` + `/api/sell/import/existing` (catalog),
  `/api/sell/settings-import` + `lib/apply-config-manifest.ts` (config).
- **Schemas + validators + prompts (reuse, then bundle):** `lib/catalog-import.ts`,
  `lib/settings-import.ts`, `lib/store-config.ts`.
- **Import UIs (reuse components/staging):** `app/shop/manage/import/ImportClient.tsx`,
  `app/shop/manage/settings/import/SettingsImportClient.tsx` — lift the staging grid + copy-prompt
  pattern into the first-run step.
- **MCP/agent surfaces (extend, don't rebuild):** `app/api/ucp/manifest/route.ts` (add a
  `seller_onboarding` block), `app/api/ucp/mcp/route.ts` (optional `get_setup_spec` resource),
  `app/agent/page.tsx`, `lib/ucp/capabilities.ts`, the "Conecta tu agente" per-shop-token helper.
- **Sibling content source:** `agent-readable-about-surface`'s `lib/about-content.ts` (whose `/acerca`
  "how to start" links here) — the handoff/clerk prompt copy can live beside or in it.
- **AGENTS five rules:** rule 1 — **reuses Medusa**, no new commerce build, no new tables (shop via
  `/store/sellers/me`, products via Store API, config on shop metadata). Rule 2 — no new Supabase tables
  (config rides shop metadata; supply staging untouched). **Rule 3 — extends UCP/MCP** (published spec +
  manifest block + clerk prompt = agent-first). Rule 4 — Clerk untouched (signup is the only gate).
  **Rule 5 — es-MX default, NOT a new bilingual surface.** The current rule (verified in AGENTS.md +
  conventions.md) is *es-MX by default; only a deliberate allow-list is es/en — don't make a new surface
  bilingual by default.* So: the first-run UI page stays **es-MX** (seller-portal default), and the
  **agent-facing prompts are NOT a dictionary surface** — they're instructions to a multilingual agent,
  so we author **one canonical prompt (es-MX)** that explicitly tells the agent to **mirror the seller's
  language** (respond + generate all catalog/config copy in whatever language the seller uses). That
  covers every language a global seller pool speaks — not just es/en — with zero locale files. The QA
  gate is rule 5 part (a): **es-MX copy-completeness** (no orphan strings) — *not* es/en parity.

## Proposed slicing (for sign-off) — skateboard → car, 3 lean sprints
### Sprint 1 — The versioned, agent-fetchable **setup spec** (contract + published prompt) · risk **low**
- **US-1.** *As a prospective seller's agent, I want one published, versioned spec + prompt so I can emit
  a single combined setup JSON (shop dressing + catalog + config) before the user signs up.*
  **Acceptance:** a framework-agnostic bundled source (e.g. `lib/setup-spec.ts`) composes the existing
  `CatalogImportRow[]` + `StoreConfigManifest` into one versioned "Miyagi Setup JSON" shape + one unified
  emit prompt (es-MX, with an explicit "mirror the seller's language" instruction so generated copy comes
  out in the seller's own language); published agent-fetchably via a `seller_onboarding` block in
  `/api/ucp/manifest`, a public spec surface (e.g. `/agent` section and/or a JSON endpoint), and
  (optionally) an MCP `get_setup_spec` resource; an example validates clean through **both** existing
  validators. No first-run apply yet — but an agent can now read the spec and emit a valid combined file.
  **QA:** `api` spec asserts the manifest block + spec surface are present/non-empty and the example
  round-trips through `validateRows` + `validateConfig`. Risk **low** (additive, public, no mutation;
  reviewer may auto-merge on green CI). *(Depends on OC-1 schema/versioning decision.)*

### Sprint 2 — **First-run onboarding apply** (the loop's missing home) · risk **HIGH**
- **US-2.** *As a freshly signed-up user, I want to paste/upload one setup JSON and get a populated shop
  in one pass — without hand-running the wizard or finding two import pages.* **Acceptance:** a first-run
  onboarding step (reachable straight after signup) accepts the combined JSON (paste **or** file),
  validates + shows the existing staging preview, then on confirm: creates the shop if missing
  (`POST /api/sell/shop`) → applies config (`/api/sell/settings-import`) → imports catalog
  (`/api/sell/import`) → drops the user into their new shop, with a per-block/per-row delta report.
  Reuses every apply route; the new code is the **orchestration + create-shop-if-missing seam + the
  first-run entry/UI**. Degrades gracefully (a malformed block never blocks the valid ones — already the
  route behavior). **QA:** `api` spec on the orchestration (create-shop-if-missing; partial-apply
  reporting; idempotent re-paste); anonymous browser smoke of the onboarding step render + staging.
  **Smoke owed to Daniel:** the authed end-to-end *create-shop + import* run on a real session. Risk
  **HIGH** — creates a seller/shop and bulk-creates products → **Daniel merges.**

### Sprint 3 — **Close the loop**: shop-clerk handoff + post-setup experience · risk **low**
- **US-3.** *As a new seller, I want a copyable prompt that turns my agent into my ongoing shop clerk, so
  the loop closes into operation.* **Acceptance:** a canonical, versioned "shop clerk" operate-prompt
  (connect MCP on Claude / discover UCP → maintain, price, promote, restock) that **instructs the agent
  to mirror the seller's language**, surfaced on the post-setup success screen alongside the existing
  "Conecta tu agente" per-shop-token helper + a short "what's next" loop-close UX; division-of-labor
  (CEO/CMO/COO) shipped as **prompt guidance inside the clerk prompt** in v1 *(per OC-2 — flip to a real
  feature later if Daniel wants)*. **QA:** `api` spec asserts the clerk-prompt content is present + the
  language-mirroring instruction is present + es-MX copy-completeness (no orphan strings); anonymous
  browser smoke of the success screen rendering the prompt + copy button. Risk **low** (content + UI, no
  commerce; reviewer may auto-merge on green CI).

**Deploy order:** S1 (spec, low, mergeable) → S2 (first-run apply, HIGH, Daniel merges) → S3 (loop close,
low). S2 is the spine; S1 unblocks the agent side; S3 is the payoff.

## In / out of v1
**In:** the bundled versioned setup-spec + unified emit prompt (es-MX, instructs the agent to mirror the
seller's language), published agent-fetchably; the first-run paste/upload onboarding step with
create-shop-if-missing orchestration over the existing apply routes + staging preview; the canonical
es-MX shop-clerk handoff prompt (language-mirroring) + post-setup loop-close UX; CEO/CMO/COO as prompt
guidance.
**Out:** any new commerce primitive, table, or payment/fulfillment change (reuse only); the **outreach
campaign** creative (`seeds/agent-native-gtm/ask-claude-campaign.md` — separate); **pricing / business
model** (custom-domain/subdomain pricing, merch — separate spawned ask); OAuth/money/domain steps stay
manual (already `MANUAL_SECTIONS` — payments, custom domain, Cal.com, agent webhook secret); founder /
philosophy copy (owed by Daniel, lives in the about-surface sibling); CEO/CMO/COO as a *real* multi-agent
feature (deferred unless OC-2 says otherwise); replacing the existing `/sell` wizard or the two authed
import pages (they stay; the first-run step is an additive front door that reuses them).

## Decisions (Daniel, 2026-06-08)
- **OC-1 → One combined versioned object.** `{ "miyagi_setup_version": "1", "profile", "config":
  StoreConfigManifest, "catalog": [CatalogImportRow] }` composing the two existing schemas unchanged.
- **OC-2 → Prompt guidance only in v1.** CEO/CMO/COO baked into the clerk handoff prompt; no new infra.
- **OC-3 → Name `agent-native-setup`.** Working slug stands; epic slug = `agent-native-setup`.
- **OC-4 → Macro-section 03 · Selling & Shops.** Scaffold path `03-selling-and-shops/agent-native-setup/`.
- **OC-5 → Language by prompt, not dictionary.** Rule 5 stands (es-MX default; bilingual only on a
  deliberate allow-list). The agent-facing prompts are **not** added to the es/en allow-list; ship one
  es-MX prompt that instructs the agent to **mirror the seller's language**, so any-language sellers are
  covered without locale files. First-run UI stays es-MX. QA = es-MX copy-completeness, not es/en parity.

## Open calls for Daniel (the sign-off decisions) — *resolved above*
- **OC-1 · Setup-JSON schema & versioning.** Recommend: **one combined top-level object**
  `{ "miyagi_setup_version": "1", "profile": {...}, "config": {StoreConfigManifest}, "catalog": [CatalogImportRow] }`
  that *composes the two existing schemas unchanged* (so both validators keep working and nothing
  drifts), with a simple integer/semver `miyagi_setup_version` and the spec published agent-fetchably.
  Alternative: keep two separate files and just sequence them in the first-run step (less new contract,
  but not the "one JSON" promise). **Your call.**
- **OC-2 · Division-of-labor profiles (CEO/CMO/COO).** Recommend: **prompt guidance only in v1** (baked
  into the clerk handoff prompt — zero new infra), promote to a real feature later. Confirm, or scope it
  as a feature now.
- **OC-3 · A better name than "Onboarding 0."** Working slug for this seed is **`agent-native-setup`**.
  Candidates: *Agent Setup* · *Setup en un prompt / "Tu agente arma tu tienda"* · *Express Setup* (pairs
  with the shipped "Express Migration") · *Onboarding 0* (keep). Pick one — it sets the epic slug.
- **OC-4 · Macro-section for the epic.** Recommend **03 · Selling & Shops** (it's the seller onboarding
  experience; `/sell` + both import UIs already live in 03; the bulk-import + seller-agent epics it
  packages are both 03). Alternative **07 · Agentic & Federated Commerce** (it extends UCP/MCP discovery
  + the published spec, beside the `agent-readable-about-surface` sibling). **Confirm — it sets the
  scaffold path.**

## Open risks / research
- **The "one JSON" contract is the only real new surface.** Keep it a *thin composition* of the two
  shipped schemas (OC-1) so the existing validators remain the source of truth — don't fork a third
  schema that can drift. *(LEARNINGS: "Read the backend model + route first — it often re-scopes the
  epic smaller"; this is that.)*
- **S2 is the HIGH seam.** It creates a shop and bulk-creates products at first run. Gate the new
  orchestration so a malformed/oversized file can't half-create state (the routes already report
  per-block/per-row + idempotent `external_id`; the new code must preserve that). Daniel merges S2.
- **Rule 5 — language by prompt, not by dictionary (Daniel's call, 2026-06-08; verified against
  AGENTS.md + conventions.md).** Rule 5 is *es-MX default; only a deliberate allow-list is es/en — don't
  make a new surface bilingual by default.* The agent-facing prompts (emit + clerk handoff) are
  instructions to a **multilingual** agent, so they do **not** join the es/en dictionary allow-list:
  ship **one es-MX prompt** that tells the agent to *mirror the seller's language* (sellers come from many
  countries; we can't hold a locale for each). The first-run UI page stays es-MX. QA = **es-MX
  copy-completeness** (no orphan strings; the "mirror language" instruction present) — *not* es/en parity.
- **Don't overstate to agents.** The published spec/about copy must describe only what ships per sprint
  (S1: emit-spec exists; S2: first-run apply exists) — no claiming a flow before it lands. Coordinate
  with the `agent-readable-about-surface` sibling so `/acerca`'s "how to start" only links the steps that
  are live.
- **Gemini model string.** `extract/route.ts` defaults to `gemini-3.5-flash` (env-overridable) — confirm
  the live model before relying on the paste→extract path in S2 demos.

## Definition of Ready
- [x] "As a / I want / so that" clear; acceptance Daniel-testable (real-URL smoke listed).
- [x] Stage-2.5 bucket named (mostly already-possible/light-enhancement + a thin genuinely-new slice),
      **validated against `main` by reading the real code** (routes, schemas, MCP tools, import UIs).
- [x] v1 in/out boundary written; campaign + pricing explicitly out.
- [x] Reuse list produced (Medusa-first reframe — no new commerce, no new tables; extends UCP/MCP).
- [x] Stories sliced skateboard→car + risk-tiered (S1 low · S2 HIGH · S3 low); QA + smoke owner named.
- [ ] **Daniel approves this scope + answers OC-1..OC-4** ← the gate. On approval: scaffold under the
      chosen macro-section, set `status: scaffolded` + `epic:`, path-scoped commit, emit per-sprint
      kickoffs.
