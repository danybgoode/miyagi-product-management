# Agent-native setup (Onboarding 0) — Sprint 3: Close the loop — shop-clerk handoff

**Status:** ✅ built (both stories) · **Risk:** low · branch `feat/agent-native-setup`
- Story 3.1 ✅ `559e744` — `buildClerkPrompt()` + `SELLER_MCP_TOOLS` in `lib/setup-spec.ts` + api spec `e2e/agent-native-setup-clerk.spec.ts` (9/9).
- Story 3.2 ✅ `45baabe` — loop-close success screen in `app/sell/setup/SetupClient.tsx` + reusable `components/ConnectAgentPanel.tsx`.

> Goal: close the loop into ongoing operation. After setup, hand the seller a copyable prompt that turns
> their agent into the ongoing **shop clerk** over MCP/UCP, plus the post-setup "what's next" moment.
> Content + UI; no commerce. Division-of-labor (CEO/CMO/COO) ships as prompt guidance in v1.

## Stories

### Story 3.1 — Canonical shop-clerk handoff prompt (language-mirroring) ✅ `559e744`
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

### Story 3.2 — Post-setup loop-close UX (success screen) ✅ `45baabe`
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

## Sprint QA — result
- **api spec:** `e2e/agent-native-setup-clerk.spec.ts` ✅ 9/9 — `buildClerkPrompt()` names every tool in
  `SELLER_MCP_TOOLS` (the 8 live seller tools), carries the language-mirror directive (asserts the stable
  phrase "el mismo idioma que está usando el vendedor"), mentions CEO/CMO/COO modes, references
  `/api/ucp/mcp`, and passes es-MX copy-completeness (no placeholder tokens; every tool `desc` non-empty).
- **deterministic gate:** `tsc --noEmit` clean · `next build` ✅ · Playwright `api` ✅ **363 passed / 4
  skipped**.
- **browser smoke owed:** none required to merge (content + UI, anonymous-renderable). Optional follow-up:
  an anonymous `*.browser.spec.ts` asserting the success screen renders the prompt + copy button.
- **risk tier:** **low** — reviewer may auto-merge on green CI.

## Coordination with `agent-readable-about-surface` (closed epic)
`/acerca`'s "how to start" links only the live generic `/sell` (`ABOUT_CTA_HREF = /sell?from=acerca`) — it
does **not** deep-link `/sell/setup`. No dead-step link is introduced, so the "only links live steps"
requirement is already satisfied. `lib/about-content.ts` is left untouched (that epic is closed).

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the branch Vercel preview while testing pre-merge)

1. As a signed-in seller, go to **/sell/setup**, paste a valid setup file (the example on that page works)
   and click **"Crear mi tienda y catálogo"**; wait for the report.
   → The success report shows "¡Tu tienda está lista!" and, below the "Ir a mi tienda" CTAs, a
     **"Deja que tu agente lleve tu tienda"** section.
2. In that section, confirm step **1 "Tu agente como tu dependiente"** shows a read-only prompt textarea
   with a **"📋 Copiar prompt del dependiente"** button; click it.
   → The button flips to "✓ Copiado"; the pasted prompt names the seller MCP tools and tells the agent to
     answer in the seller's language.
3. In step **2 "Conecta tu agente"**, click **"Generar token de agente"**.
   → A one-time token appears ("no se vuelve a mostrar") and the MCP config snippet below shows
     `Authorization: Bearer <your token>` against `https://miyagisanchez.com/api/ucp/mcp`. (**auth path —
     owed to Daniel:** needs a real signed-in seller session to mint the token.)
4. Confirm step **3 "¿Qué sigue?"** lists: agregar pagos (manual) · comparte tu tienda (links `/s/<slug>`)
   · deja que tu agente la lleve.
   → All three items render; the shop link resolves to the new public storefront.
5. Paste the copied prompt + the MCP config into Claude (or any MCP client) and connect.
   (**auth/MCP path — owed to Daniel:** needs the real per-shop token + a live agent session.)
   → Claude connects over MCP and can run `list_my_listings` / `patch_store_configuration` against the shop.
6. Ask the agent in a non-Spanish language, e.g. "lower all my prices 10%". (**owed to Daniel.**)
   → The agent replies in your language and uses the seller MCP tools to act.

If any step fails, note the step number + what you saw — that's the bug report.
