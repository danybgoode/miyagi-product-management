---
status: shipped
slug: agent-native-setup
---

# Epic: Agent-native setup (Onboarding 0) — ✅ COMPLETE (2026-06-09)

> **Area:** 03-selling-and-shops · **Risk:** high (S2) · **Scope seed:** [`00-ideas/seeds/agent-native-setup.md`](../../00-ideas/seeds/agent-native-setup.md)
>
> **Status:** ✅ all 3 sprints shipped to prod. S1 published setup spec ([#60](https://github.com/danybgoode/miyagisanchezcommerce/pull/60) `7ada9f4`); S2 first-run apply ([#61](https://github.com/danybgoode/miyagisanchezcommerce/pull/61) `a592d29`); S3 clerk handoff + loop-close success screen ([#63](https://github.com/danybgoode/miyagisanchezcommerce/pull/63) `d3a1b8e`). See [`RETROSPECTIVE.md`](RETROSPECTIVE.md). Authed/MCP smokes owed to Daniel (per-sprint walkthroughs).

## Why
A prospective seller's **own** AI agent should do almost the entire shop setup. The platform's only job
is the rails + a ~20-second signup. The agent reads a published spec, emits one standardized **setup
JSON** (shop dressing + catalog + config), the seller signs up and **pastes/uploads it on a first-run
onboarding step**, and the shop + catalog are near-fully created — with no hand-running the wizard or
hunting for two separate import pages. A copied prompt then turns the agent into the ongoing **shop
clerk** over MCP/UCP. This is the deepest, highest-leverage piece of the agent-native GTM (spawned ask
#3); the `agent-readable-about-surface` sibling's `/acerca` "how to start" points here.

## Medusa-first note
**No new commerce primitive, no new tables.** The loop's mechanics already ship across two complete
epics (03 · Bulk Import & Express Migration; 03 · Seller Agent Operations) + 07 · Agent Connection. The
shop is created via `POST /api/sell/shop` → `/store/sellers/me`; products via the Store API import;
config rides shop metadata. This epic is **packaging an existing pipeline into a guided first-run agent
loop** — the validated reframe (read the real code) shrinks it to four gaps: no first-run home for the
loop, a fragmented/unpublished spec, no canonical clerk handoff prompt, no loop-close UX.

## What already exists (reuse, don't rebuild)
- **Apply routes (reuse wholesale):** `POST /api/sell/shop` (create-shop-standalone, before any
  listing); `/api/sell/import` + `/api/sell/import/extract` + `/api/sell/import/existing` (catalog);
  `/api/sell/settings-import` + `lib/apply-config-manifest.ts` (config).
- **Schemas + validators + prompts (reuse, then compose):** `lib/catalog-import.ts` (`CatalogImportRow`,
  `buildCopilotPrompt`, `validateRows`/`parseCatalogFile`, `external_id` idempotency),
  `lib/settings-import.ts` (`StoreConfigManifest`, `buildSettingsCopilotPrompt`, `validateConfig`,
  `MANUAL_SECTIONS`), `lib/store-config.ts`.
- **Import UIs (lift the staging grid + copy-prompt pattern):** `app/shop/manage/import/ImportClient.tsx`,
  `app/shop/manage/settings/import/SettingsImportClient.tsx`.
- **MCP/agent surfaces (extend):** `app/api/ucp/manifest/route.ts` (add `seller_onboarding` block),
  `app/api/ucp/mcp/route.ts` (optional `get_setup_spec` resource), `app/agent/page.tsx`,
  `lib/ucp/capabilities.ts`, the "Conecta tu agente" per-shop-token helper. Full seller MCP toolset is
  already live (`get/patch_store_configuration`, `create_listing`, `list_my_listings`, …).
- **Sibling content source:** `agent-readable-about-surface`'s `lib/about-content.ts`.

## Five-rules check
Rule 1 reuses Medusa (no new commerce/tables). Rule 2 no new Supabase tables. **Rule 3 extends UCP/MCP**
(published spec + manifest block + clerk prompt). Rule 4 Clerk untouched (signup is the only gate).
**Rule 5 — es-MX default, no new bilingual surface:** the first-run UI is es-MX; the agent-facing
prompts are instructions to a multilingual agent, so they ship as **one es-MX prompt that tells the agent
to mirror the seller's language** (covers any-language sellers without locale files). QA = es-MX
copy-completeness, not es/en parity.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Published, versioned setup spec + unified emit prompt (agent-fetchable) | **low** |
| 2 | First-run onboarding apply (create-shop-if-missing → config → catalog, one pass) | **high** |
| 3 | Close the loop — shop-clerk handoff prompt + post-setup UX | **low** |

## Deploy order
S1 (spec — low, additive/public, reviewer may auto-merge) → **S2 (first-run apply — HIGH, Daniel
merges)** → S3 (loop close — low). S2 is the spine; S1 unblocks the agent side; S3 is the payoff. All
frontend (Vercel preview per branch). No backend repo change expected (reuses Store API via the existing
Next routes); if any backend touch appears, merge backend-first and degrade gracefully (LEARNINGS).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (authed/MCP gaps stated, owed to Daniel)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] Feature branch deleted; seed frontmatter `status: shipped`
- [x] Coordinate with `agent-readable-about-surface`: `/acerca` "how to start" only links steps that are live (already satisfied — `/acerca` links only the live generic `/sell`, not `/sell/setup`; `about-content.ts` untouched)
