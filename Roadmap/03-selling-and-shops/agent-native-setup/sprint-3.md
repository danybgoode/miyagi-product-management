# Agent-native setup (Onboarding 0) — Sprint 3: Close the loop — shop-clerk handoff

**Status:** ⬜ not started · **Risk:** low

> Goal: close the loop into ongoing operation. After setup, hand the seller a copyable prompt that turns
> their agent into the ongoing **shop clerk** over MCP/UCP, plus the post-setup "what's next" moment.
> Content + UI; no commerce. Division-of-labor (CEO/CMO/COO) ships as prompt guidance in v1.

## Stories

### Story 3.1 — Canonical shop-clerk handoff prompt (language-mirroring)
**As a** new seller, **I want** a copyable prompt that turns my agent into my shop clerk, **so that** the
agent keeps running my shop after setup.
**Acceptance:**
- A canonical, versioned operate-prompt (`buildClerkPrompt()` or in the sibling `lib/about-content.ts`)
  instructs the agent to: connect to Miyagi's MCP on Claude / discover UCP capabilities, then polish,
  price, promote, restock, and maintain the shop using the **already-live** seller MCP tools
  (`get/patch_store_configuration`, `create_listing`, `list_my_listings`, `update_listing`,
  `set_listing_status`, `list_offers`, `respond_to_offer`).
- The prompt **instructs the agent to mirror the seller's language** (rule 5 — by prompt, not dictionary).
- Division-of-labor guidance (CEO/CMO/COO as suggested working modes) is included as **prompt text**, not
  a built feature (per OC-2).
- es-MX copy-completeness; the language-mirroring instruction is present.
**Risk:** low

### Story 3.2 — Post-setup loop-close UX (success screen)
**As a** new seller, **I want** a clear "your shop is live — here's your clerk + what's next" moment, **so
that** I actually close the loop instead of dropping off.
**Acceptance:**
- The post-setup success screen surfaces: the copyable clerk prompt (3.1) + the existing "Conecta tu
  agente" per-shop-token helper + a short "what's next" (add payments — still manual; share your shop;
  let your agent take it from here).
- Reuses existing components (the "Conecta tu agente" helper, the copy-button pattern from the import
  UIs); no new commerce.
- Cross-link: from `/acerca`'s "how to start" only once S2 is live (coordinate with the about-surface
  sibling).
**Risk:** low

## Sprint QA
- **api spec(s):** Story 3.1 → `e2e/agent-native-setup-clerk.spec.ts` — the clerk prompt is present,
  names the live MCP tools, contains the language-mirroring instruction, and passes es-MX
  copy-completeness (no orphan strings).
- **browser smoke owed:** no (content + UI, anonymous-renderable) — an anonymous browser smoke can assert
  the success screen renders the prompt + copy button; reviewer may auto-merge on green CI.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Complete the Sprint 2 flow (signup → paste setup → land in shop).
   → On the success screen you see a "Tu agente como dependiente de tu tienda" section with a copyable
     prompt + the "Conecta tu agente" token helper + a short "what's next".
2. Click "Copiar" on the clerk prompt → paste it into Claude (with the per-shop MCP token from "Conecta
   tu agente"). (**auth path — owed to Daniel**: needs the real per-shop token.)
   → Claude connects over MCP and can run `list_my_listings` / `patch_store_configuration` against the shop.
3. Ask the agent in a non-Spanish language, e.g. "lower all my prices 10%".
   → The agent replies in your language and uses the seller MCP tools to act.

If any step fails, note the step number + what you saw — that's the bug report.
