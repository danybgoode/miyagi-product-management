# Navigation & Settings Reorg — Sprint 2: Persistent search + Cuenta hub

**Status:** ✅ BUILT 2026-06-10 — draft [PR #77](https://github.com/danybgoode/miyagisanchezcommerce/pull/77),
gate green (tsc + build + `api` 5/5), awaiting fresh review + Daniel's nod on the shared touch ·
**Risk:** LOW (announced: touches shared `app/layout.tsx` + `app/globals.css`) ·
audit §2 + §3 · branch `feat/nav-reorg-s2` off `main` (S1 `dc4c992`) ·
commits: `55a8fd8` (pure seam + api spec) · `76f9a0b` (UI wiring) ·
files: `app/layout.tsx`, `app/globals.css`, new `app/components/CuentaMenu.tsx`,
new `lib/account-menu.ts`, `app/components/AIAgentButton.tsx` (+`affordance` variant),
new `e2e/account-menu.spec.ts` + `e2e/cuenta-search.browser.spec.ts`

## Stories

### Story 2.1 — Persistent header search ✅ (`76f9a0b`)
**As a** buyer, **I want** search always visible on mobile and desktop **so that** I can search from anywhere
without hunting for a control.
**Acceptance:**
- The header search field renders in the **PWA standalone** too (the `.pwa-search-hide` rule is removed).
- On desktop the search bar is **centered** in the header with an inline **"Agente IA"** affordance.
- Submitting search routes to `/l?q=…` exactly as today.
**Risk:** LOW (announce — shared `layout.tsx` + `globals.css`)

### Story 2.2 — Cuenta hub (`CuentaMenu.tsx`) ✅ (`55a8fd8` + `76f9a0b`)
**As a** signed-in buyer, **I want** one Cuenta menu **so that** my account actions live in a single place
instead of scattered across the header.
**Acceptance:**
- A new `CuentaMenu` lists: **Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA ·
  Tema · "Cambiar a modo vendedor" → `/shop/manage`**, each pointing at its existing route
  (`/account/favorites`, `/account/orders`, `/account/subscriptions`, `/account/referrals`,
  `/account/notificaciones`, the theme toggle, etc.).
- The top-level header no longer shows the separate Mi tienda / Favoritos / theme / agent items (they live in the menu).
**Risk:** LOW

### Story 2.3 — One agent entry point ✅ (`76f9a0b`)
**As any** user, **I want** a single agent entry point **so that** the UI isn't littered with bare ✨ icons.
**Acceptance:**
- The standalone ✨ icons are gone (the desktop `/agent` sparks link and the mobile `AIAgentButton`).
- Exactly one agent entry remains — the "Agente IA" affordance (header search area + the Cuenta menu item).
**Risk:** LOW

## Sprint QA — as built
- **api spec ✅:** the eight `CuentaMenu` items live in the pure `lib/account-menu.ts`;
  `e2e/account-menu.spec.ts` (5 tests, in the gate) asserts all eight entries in order, every link's
  href, the `theme` action, "Cambiar a modo vendedor" → `/shop/manage`, and unique keys. (The removed
  top-level header items were signed-in-only or covered by the anonymous browser smoke below — no
  separate link/route spec needed; the anonymous smoke proves the bare ✨ link is gone.)
- **browser smoke ✅ (anonymous, NOT in gate):** `e2e/cuenta-search.browser.spec.ts` asserts the header
  search input renders (no `.pwa-search-hide`), the desktop search sits centered with the **"Agente IA"**
  affordance, and there is **no** bare `a[href="/agent"]` sparks link in the header. Passed locally vs the
  dev server. The **authed** Cuenta-menu open (signed-in) stays **owed to Daniel** (or lights up via the
  local authed-clerk browser run when `MS_TEST_*` is set).
- **deterministic gate ✅:** `tsc --noEmit` (0) + `next build` (compiled successfully) + Playwright `api`
  (5/5) green. Branched off the latest `main` (S1 `dc4c992`); shared `layout.tsx`/`globals.css` touch
  **announced** on PR #77.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: the branch **preview** while PR #77 is open (Vercel preview for `feat/nav-reorg-s2`); production
https://miyagisanchez.com once merged.

1. Launch the installed PWA (standalone, mobile) and look at the top header. **[owed to Daniel — PWA standalone]**
   → A search field is visible in the header (it used to be hidden in standalone).
2. On desktop, open the site.
   → The search bar sits **centered** in the header, with a labeled **"Agente IA"** pill beside it; there is
     **no** bare ✨ icon anywhere in the header.
3. Type a query in the header search and submit.
   → You land on `/l?q=<your query>` with results.
4. Sign in, then open the **Cuenta** menu (the user-icon ▾ button, top-right). **[owed to Daniel — authed]**
   → The menu lists Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA · Tema ·
     "Cambiar a modo vendedor" — each navigating to its existing page (e.g. Favoritos → `/account/favorites`,
     Notificaciones → `/account/notificaciones`). The **Tema** row carries the theme toggle inline.
5. Click **"Cambiar a modo vendedor"**.
   → You land on `/shop/manage`.
6. Scan the whole header + footer for stray ✨ icons.
   → There are none — the only agent entry is the "Agente IA" affordance (search area + the Cuenta menu
     item); the footer "Agent API" link is now plain text.
7. Click the **"Agente IA"** pill in the header.
   → The agent bottom-sheet opens (copy-prompt / "Abrir en Claude") — same sheet as before, now reached
     from one labeled entry instead of a bare ✨.

If any step fails, note the step number + what you saw — that's the bug report.
Automated coverage: steps 2–3 + 6 (header structure, centered search, no bare ✨) are the anonymous
`e2e/cuenta-search.browser.spec.ts`; the Cuenta item list + hrefs (step 4–5) is `e2e/account-menu.spec.ts`.
