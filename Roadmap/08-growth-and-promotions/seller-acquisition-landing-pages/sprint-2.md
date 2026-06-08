# Sprint 2 — Track A: World Cup wedge page  ·  status: ✅ shipped

> **Builds first** (Daniel's call). Lean, time-boxed, on the **existing `globals.css` tokens** (does
> NOT wait for #4). Quality over the Jun-11 date — ship when it's good; the tailwind runs to Jul 19.
> Depends on Sprint 1 creative being signed off (at least the WC page's copy).

**Shipped:** frontend PR
[#42](https://github.com/danybgoode/miyagisanchezcommerce/pull/42) merged to `main`
on 2026-06-07. App commit `b0f5840`; merge commit `fd0f2df`.

## Goal
A sharp, mobile-first landing page that pitches local experience/service providers on capturing World
Cup demand and routes them into onboarding.

## Stories
### US-2 — The WC Experience/Service wedge page ✅
**As** a local experience/service provider, **I want** a page that pitches me on capturing World Cup
demand, **so that** I list my tour / food spot / rental fast.

**Acceptance (Daniel can run):**
1. Page live at **`/vende/mundial`**, es-MX, mobile-first, fast (no heavy assets; good Lighthouse).
2. Hero pitch ≈ *"Captura al público global del Mundial. Publica tus tours, rincones de comida y
   rentas — al instante, sin comisiones."* + the "pregúntale a Claude" trust line.
3. Proof points map to real capabilities (services/rentals listing types · 0% comisión · cobra a tu
   propia cuenta · agenda/Cal.com where relevant).
4. **Primary CTA → `/sell?type=service&from=mundial`** (or the deep-link locked in Sprint 1); lands
   the visitor in the existing onboarding.
5. **Attribution:** `?from=mundial` / UTM captured; Microsoft Clarity tracking present.
6. Built **agent-fetchable** (semantic HTML, real text, page metadata) — the "ask Claude" pillar works.
7. Uses existing `globals.css` tokens/primitives; no `middleware.ts` change (path route).

**Risk:** low (public marketing page; no commerce). Reviewer may auto-merge on green CI **unless** it
ends up touching shared layout/routing — then announce.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green (local + CI).
- **Add one spec:** an **anonymous browser smoke** (`*.browser.spec.ts`) — page renders + clicking the
  primary CTA navigates to `/sell` with the expected query. Anonymous → runs without credentials,
  **not owed to Daniel**. If a pure helper is extracted (e.g. UTM/`from` parse), add an `api` spec on it.
- **Browser smoke:** `e2e/seller-acquisition-mundial.browser.spec.ts` passes locally; CI preview gate
  passed on PR #42.
- Quick Lighthouse/perf pass on mobile remains a follow-up if Daniel wants a formal score; the page uses
  text/CSS only, no heavy assets.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: preview URL pre-merge · `https://miyagisanchez.com` once deployed.

1. Open `https://miyagisanchez.com/vende/mundial` on a phone (or narrow window).
   → The World-Cup seller pitch renders, mobile-first, loads fast.
2. Read the hero.
   → You see the WC value prop + the "pregúntale a Claude sobre miyagisanchez.com" trust line.
3. Tap the primary CTA ("Empieza a vender" / "Configura tu tienda").
   → You land on the `/sell` onboarding, with `from=mundial` in the URL.
4. (Agent check) In Claude/Gemini, ask: "¿qué es miyagisanchez.com/vende/mundial?"
   → The agent can fetch and summarize the page (real text, not image-baked).
5. (Analytics) Open Microsoft Clarity.
   → The new page registers sessions/heatmap.

If any step fails, note the step number + what you saw — that's the bug report.
