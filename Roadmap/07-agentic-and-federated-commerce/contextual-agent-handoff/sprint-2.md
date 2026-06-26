# Contextual agent handoff — Sprint 2: Rich human-readable context

**Status:** ⬜ ready to build (scaffolded 2026-06-25, not started). **Depends on: Sprint 1 merged**
(the `lib/agent-prompt.ts` builder seam).

> The car — makes the prompt name the actual product/shop ("«Tenis X» ($499) — /l/abc") instead of just the
> URL, adds the account/orders handoff in the navbar card, and locks the builder with specs. Because
> `PlatformShell` is server/static and reads no request state, rich per-page data flows through a **client**
> `AgentContext` island, not the shell. All Low-risk, frontend-only.

## Stories

### Story 2.1 — `AgentContext` provider + per-page setter
**As a** shopper, **I want** the prompt to reflect the real page content, **so that** it's readable and
specific.
**Acceptance:**
- A client `AgentContext` (React context) holds `{ pageType, url, title?, price?, shopName?, searchTerms?,
  orderRef? }`; provider mounted as a client island in the layout (not in the static shell).
- A thin client setter (e.g. `<SetAgentContext .../>`) lets a server page push values without making the
  page a client component.
- `AIAgentButton` consumes the context and passes it to `buildAgentPrompt`; **falls back to the Sprint-1
  URL-only/generic path** when context is absent (race / unknown route) — never empty.
**Risk:** low. **QA:** unit spec — `buildAgentPrompt` with `title`/`price`/`shopName` set.

### Story 2.2 — PDP + shop embed human-readable details
**As a** shopper on a PDP or shop, **I want** the product title/price (or shop name) inside the prompt,
**so that** the copied text is self-explanatory.
**Acceptance:**
- The PDP (`/l/[id]`) sets `title` + `price` (+ url) on `AgentContext`; the copied prompt reads
  «{title}» ({price}) — {url}.
- The shop page (`/s/[slug]`) sets `shopName` (+ url); the prompt reads the shop name + URL.
- Missing price/title degrades to the URL-only phrasing (no "undefined").
**Risk:** low. **QA:** browser smoke (Daniel) — real PDP prompt shows the title + price; **optional**
`*.browser.spec.ts` asserting the rendered prompt text (works anonymously, no login).

### Story 2.3 — Account/orders contextual handoff in the navbar card
**As a** buyer on my orders/account, **I want** the navbar AI card to offer order-specific help,
**so that** I can track or resolve an order fast.
**Acceptance:**
- On order/account routes the card's prompt is an order/account-help template (reuse the `AgentHandoff`
  prompt shape; include the order ref from the route when present).
- Does **not** alter the existing in-page `AgentHandoff` on order/refund screens.
**Risk:** low. **QA:** browser smoke (Daniel) on an order page; unit spec for the order template.

### Story 2.4 — Lock the builder + smoke walkthrough
**Chore/test.**
**Acceptance:**
- `lib/agent-prompt.ts` has unit/`api` specs covering: generic, PDP (url-only + with title/price), catalog,
  shop, account/order, and the graceful-fallback path.
- The Sprint-2 smoke walkthrough below is filled with the real preview/prod URLs and run.
**Risk:** low. **QA:** deterministic gate green.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` (incl. the new builder specs).
- **Shared-chrome note:** Story 2.1 touches the layout/provider — **announce** before merge (can affect
  sibling PRs); per WAYS it stays Low-risk but the shared-surface heads-up applies.
- **Owed to Daniel (browser):** the copy→paste→agent round-trips on PDP / shop / order (an automated browser
  smoke can render-assert the prompt text but can't judge the agent's reply or the phrasing quality).

## Sprint 2 — Smoke walkthrough (do these in order)
_Env: fill the branch's Vercel **preview URL** here pre-merge; swap to https://miyagisanchez.com after merge._

1. Go to a real product `<preview-url>/l/<id>`, open the AI card, click **Copiar prompt**, paste into a notepad.
   → The prompt reads «<product title>» (<price>) and contains the product URL — all in Spanish.
2. On the same PDP, click **Abrir en Claude**.
   → Claude opens with the same product-specific Spanish prompt pre-filled.
3. Go to a shop `<preview-url>/s/<slug>`, open the card, copy.
   → The prompt names the **shop** and contains the shop URL.
4. Sign in as a test buyer, open an order at `<preview-url>/account/orders/<orderId>`, open the navbar AI card.
   → The prompt is an **order-help** prompt (mentions the order); the in-page `AgentHandoff` on the order
     screen is unchanged. *(auth path — owed to Daniel)*
5. Open the card on the homepage.
   → Still the generic Spanish prompt (no leftover product/shop context bleeding across navigation).

If any step fails, note the step number + what you saw — that's the bug report.
