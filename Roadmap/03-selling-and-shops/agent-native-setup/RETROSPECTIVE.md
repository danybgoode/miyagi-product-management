# Agent-native setup (Onboarding 0) — Retrospective

_Closed: 2026-06-09 · 3 sprints, all shipped to prod._

## What shipped
A prospective seller's **own** AI agent now does almost the entire shop setup, and then keeps running the
shop — the platform's job is the rails + a ~20-second signup.

- **S1 — Published, versioned setup spec + unified emit prompt.** [PR #60](https://github.com/danybgoode/miyagisanchezcommerce/pull/60) `7ada9f4`.
  `lib/setup-spec.ts`: one `MiyagiSetupFile` (shop `profile` + `StoreConfigManifest` `config` +
  `CatalogImportRow[]` catalog) with a version gate, **composing the two already-shipped validators**
  (`validateConfig`, `validateRows`) rather than forking a third schema. `buildSetupPrompt()` emits the
  unified copilot prompt; `buildSetupSpec()` is the agent-fetchable snapshot. `SETUP_LANGUAGE_DIRECTIVE`
  holds the "mirror the seller's language" rule as one constant. Pure (no `next/*`) → UI, endpoint, MCP
  tool, and the `api` runner all import it.
- **S2 — First-run onboarding apply (one pass).** [PR #61](https://github.com/danybgoode/miyagisanchezcommerce/pull/61) `a592d29`.
  New `/sell/setup` entry + a pure orchestration seam `lib/setup-apply.ts` (`planSetupApply` /
  `aggregateSetupReport` / `chunkFailureRows`). It walks the **existing** apply routes wholesale over HTTP
  — create-shop-if-missing (`POST /api/sell/shop`, idempotent 201/200) → config (`/api/sell/settings-import`)
  → catalog (`/api/sell/import`, ≤25-row chunks, live progress) — each step degrading gracefully, folding
  the three results into one staging-preview → confirm → land-in-shop report. A `/sell` nudge points
  shop-less sellers in.
- **S3 — Close the loop: shop-clerk handoff + success screen.** [PR #63](https://github.com/danybgoode/miyagisanchezcommerce/pull/63) `d3a1b8e`.
  `buildClerkPrompt()` + `SELLER_MCP_TOOLS` in `lib/setup-spec.ts` — a canonical operate-prompt that names
  the **8 already-live** seller MCP tools from one shared source, mirrors the seller's language (reuses
  `SETUP_LANGUAGE_DIRECTIVE`), and frames **CEO/CMO/COO as working modes in prompt text, not a built
  feature**. The post-apply `SetupReport` gained a loop-close section: the copyable clerk prompt + a
  reusable `components/ConnectAgentPanel.tsx` (per-shop MCP token + ready-to-paste config) + a "¿Qué sigue?".
  api spec `e2e/agent-native-setup-clerk.spec.ts` (9/9).

## What went well
- **The Medusa-first reframe shrank the epic.** "Read the real routes first" turned a big build into
  *packaging* — S2 reused three apply routes wholesale and added only an entry page + a pure seam; no new
  commerce, no new tables, no backend repo change across all three sprints.
- **One pure `lib/setup-spec.ts` carried the whole contract.** Composing the two existing validators (not a
  third schema) meant the spec, prompt, UI, and tests share one source and can't drift — and pure-logic
  `api` specs gave real coverage for free (no auth, no network, no mutations).
- **Language by prompt-directive, not locale files.** Rule 5 was satisfied for any-language sellers with a
  single es-MX directive constant reused across the setup prompt *and* the clerk prompt — the multilingual
  agent is the localization layer. QA = es-MX copy-completeness, not es/en parity.
- **Low-risk S3 flowed clean.** tsc + build + `api` (363) green locally; CI green; squash-merged on
  authorization. The reusable `ConnectAgentPanel` was kept self-contained so the 3500-line `ShopSettings.tsx`
  was never destabilized.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md (dedupe — sharpen, don't append). -->
- **A handoff/operate prompt should name already-live capabilities from one shared source the prompt AND
  its spec read** — `SELLER_MCP_TOOLS` is the single list `buildClerkPrompt()` renders and the api spec
  asserts, so the named toolset can never drift from what MCP actually exposes. (Promoted.)
- **Reuse a directive *constant*, not a re-paraphrase.** The clerk prompt reused `SETUP_LANGUAGE_DIRECTIVE`
  verbatim, so the language-mirror rule is identical wherever it appears and the spec asserts one stable,
  apostrophe-free phrase. (Sharpens the existing "one relay directive beats N locales" line.)
- **Gotcha: a substring assertion can collide with legit copy.** `expect(prompt).not.toContain('TODO')`
  failed because Spanish "TODO el texto" is legitimate — assert only true placeholder markers
  (`PEGA_TU_TOKEN`, `XXX`, `undefined`/`null`). (Promoted.)

## Gaps / follow-ups
- **Authed / MCP smokes owed to Daniel** (per the per-sprint walkthroughs): S2 signup→paste→create-shop +
  import; S3 mint a real per-shop token, connect a live agent over MCP, and run a non-Spanish operate
  command (`/sell/setup` steps 3, 5–6).
- **`/acerca` deep-link is deliberately *not* added.** It links the live generic `/sell`; deep-linking
  `/sell/setup` was left out (the about-surface epic is closed). Optional future polish.
- **CEO/CMO/COO is prompt guidance only** (OC-2) — not a built division-of-labor feature; a candidate for a
  later epic if sellers want explicit modes in the UI.
