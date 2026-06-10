# Navigation & Settings Reorg — Sprint 2: Persistent search + Cuenta hub

**Status:** ⬜ not started · **Risk:** LOW (announce: touches shared `app/layout.tsx` + `app/globals.css`) ·
audit §2 + §3 · files: `app/layout.tsx`, `app/globals.css`, new `app/components/CuentaMenu.tsx`

## Stories

### Story 2.1 — Persistent header search
**As a** buyer, **I want** search always visible on mobile and desktop **so that** I can search from anywhere
without hunting for a control.
**Acceptance:**
- The header search field renders in the **PWA standalone** too (the `.pwa-search-hide` rule is removed).
- On desktop the search bar is **centered** in the header with an inline **"Agente IA"** affordance.
- Submitting search routes to `/l?q=…` exactly as today.
**Risk:** LOW (announce — shared `layout.tsx` + `globals.css`)

### Story 2.2 — Cuenta hub (`CuentaMenu.tsx`)
**As a** signed-in buyer, **I want** one Cuenta menu **so that** my account actions live in a single place
instead of scattered across the header.
**Acceptance:**
- A new `CuentaMenu` lists: **Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA ·
  Tema · "Cambiar a modo vendedor" → `/shop/manage`**, each pointing at its existing route
  (`/account/favorites`, `/account/orders`, `/account/subscriptions`, `/account/referrals`,
  `/account/notificaciones`, the theme toggle, etc.).
- The top-level header no longer shows the separate Mi tienda / Favoritos / theme / agent items (they live in the menu).
**Risk:** LOW

### Story 2.3 — One agent entry point
**As any** user, **I want** a single agent entry point **so that** the UI isn't littered with bare ✨ icons.
**Acceptance:**
- The standalone ✨ icons are gone (the desktop `/agent` sparks link and the mobile `AIAgentButton`).
- Exactly one agent entry remains — the "Agente IA" affordance (header search area + the Cuenta menu item).
**Risk:** LOW

## Sprint QA
- **api spec(s):** the `CuentaMenu` items list → a pure module (e.g. `lib/account-menu.ts`) →
  `e2e/account-menu.spec.ts` asserts all eight entries + their hrefs. A link/route spec asserts the header
  no longer renders the removed top-level items.
- **browser smoke owed:** anonymous Chromium smoke asserts the header search renders **without**
  `.pwa-search-hide` and the desktop search is centered with the Agente IA affordance; the **authed** Cuenta-menu
  open (signed-in) is **owed to Daniel** (or covered by the local authed-clerk browser smoke when the fixture is set).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.
  **Merge latest `main` first** (S2 edits shared `layout.tsx`/`globals.css`).

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com  (or the branch preview URL while testing pre-merge)

1. Launch the installed PWA (standalone) and look at the top header. **[owed to Daniel — PWA standalone]**
   → A search field is visible in the header (it used to be hidden in standalone).
2. On desktop, open https://miyagisanchez.com.
   → The search bar sits **centered** in the header with an inline **"Agente IA"** affordance; there is **no** bare ✨ icon.
3. Type a query in the header search and submit.
   → You land on `/l?q=<your query>` with results.
4. Sign in, then open the **Cuenta** menu. **[owed to Daniel — authed]**
   → The menu lists Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones · Agente IA · Tema · "Cambiar a modo vendedor".
5. Click **"Cambiar a modo vendedor"**.
   → You land on `/shop/manage`.
6. Scan the whole header + footer for stray ✨ icons.
   → There are none — the only agent entry is the "Agente IA" affordance.

If any step fails, note the step number + what you saw — that's the bug report.
