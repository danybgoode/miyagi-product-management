# Contextual agent handoff — Retrospective

_Closed: 2026-06-26_

**Area:** 07 · Agentic & Federated Commerce · **Risk:** low · 2 sprints. Frontend-only (Vercel); no
backend, no DB, no migration. **PRs:** S1 #128 (`33ae0b3`) · S2 #130 (`05530a9`).

## What shipped
The navbar "Compra con tu agente IA" card now hands the shopper a prompt that's **es-MX-only** and
**contextual to the page** — so opening it on a product copies a prompt that already names *that* product,
ready to paste into Claude/ChatGPT/Gemini. The agent resolves the listing/shop over the existing UCP/MCP
surface, so the prompt only has to carry the **canonical URL** (+ a human-readable title/price/shop as a
readability nicety). Separately, the seasonal/designer **theme toggle** moved to its own `flask` icon so it
stops sharing the AI **sparks** glyph.

- **S1 — icon split + es-MX + URL-aware prompt** (`33ae0b3`). Theme toggle `sparks → flask`; the old
  half-English hardcoded prompt became a pure, dependency-free builder `lib/agent-prompt.ts`
  (`resolveAgentContext(pathname, searchParams)` → an `AgentPromptContext` discriminated union →
  `buildAgentPrompt(ctx)`), URL-only, derived in the client `AIAgentButton` via `usePathname()`. Catalog
  params are whitelisted + sanitized (never echo the raw query string).
- **S2 — rich human-readable context** (`05530a9`). Because `PlatformShell` (where the card mounts) is
  server/static and reads no per-page data, a server page pushes its details through a **client
  `AgentContext` island** (`SetAgentContext`), and the button merges them with a pure
  `withDetails(ctx, details)` overlay — degrading cleanly to the S1 URL-only prompt when absent.
  - **S2.1** provider + setter + `withDetails` seam; **S2.2** PDP pushes `title` + `formatPrice`, shop
    pushes `shop.name` → prompt reads «{title}» ({price}) / «{shop}» + URL; **S2.3** order route →
    order-help prompt with order ref (from URL) + product title + order URL, leaving the in-page
    `AgentHandoff` refund flow untouched; **S2.4** `e2e/agent-prompt.spec.ts` to 33 `api` cases + an
    anonymous `agent-prompt.browser.spec.ts` (opens the card on a PDP, asserts the prompt names the product).

## What went well
- **The S1 pure seam carried S2 with no rework.** `lib/agent-prompt.ts` stayed dependency-free, so S2 just
  widened the union with optional fields and added one pure `withDetails` merge — all unit-testable in the
  Playwright `api` runner with zero browser. Coverage accreted from 17 → 33 specs alongside the work.
- **"Degrade to the prior behaviour" was the design contract, and it's enforced by a spec.** `withDetails(ctx, null)`
  is byte-identical to the S1 output, asserted directly — so a race (details not yet set) or an unknown route
  can never produce an empty/garbled prompt.
- **Right altitude for the static shell.** Rather than make the shell dynamic to read page data, the client
  context island threads it through — the homepage `/` stayed `○` static (ISR 1m), confirmed in the build.

## What was tricky / what we'd flag
- **A client provider in shared chrome (`app/(shell)/layout.tsx`) is a sibling-PR risk — announce it.** S2.1
  wrapped the shell return in `<AgentContextProvider>`; flagged on the PR per the shared-surface convention.
  It wraps all three shell branches (buyer / white-label / seller-mode); the white-label & seller branches
  don't render the `AIAgentButton` consumer, so a page's `SetAgentContext` value is simply never read there
  (harmless) — worth a precise comment, since "the provider is absent there" is wrong (the *consumer* is).
- **A render-null `SetAgentContext` that clears on unmount needs compare-and-clear, not a blind null.** The
  codex cross-review caught it: during a client navigation the *next* page's island can set its details
  before the *previous* island's cleanup runs, so a blind `setDetails(null)` on unmount erases the new
  page's context (silent fall-back to URL-only). Fix: functional `setState` that only nulls out if the
  context still holds *this* island's object (`prev => prev === mine ? null : prev`).
- **The card is a JS portal sheet — not curl-able.** The render-level check (does the copied prompt actually
  *name* the product?) needs a real browser, so it lives in the **browser** project (nightly, not the gate)
  and runs anonymously off `MS_TEST_PDP_LISTING_ID`. The copy→paste→**agent reply quality** is a human
  judgement that stays owed to Daniel.

## Branch hygiene note (transferable)
Sprint 2 started on a **fresh** `feat/contextual-agent-handoff-s2` off `origin/main`, NOT the literal
`feat/contextual-agent-handoff` — that remote branch still held S1's *pre-squash* commits (already on `main`
as the #128 squash), so reusing it is the standing "squash-merged branch is a dead end" trap. The branch
name in the kickoff prompt was the *epic* slug; the right read was the `feat/<epic>-s2` convention.

## Smoke gap (honest)
- **Machine-verified:** `tsc` + `npm run build` (`/` stays `○`) + Playwright `api` 33/33 (every kind +
  the `withDetails` fallback). CI "Playwright vs preview" green on the branch preview.
- **Owed to Daniel (browser):** shop-card render, the authed order-page card, and every copy→paste→agent
  round-trip — the SSO-gated preview + authed session are his to drive.

## No kill-switch
All Low-risk, frontend-only, no money/auth/commerce path — no flag by design.
