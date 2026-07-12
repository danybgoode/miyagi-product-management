---
title: "Mobile: discoverable Clerk account management (/account/settings)"
slug: mobile-clerk-account-management
status: ready
area: "09"
type: bug
priority: null
risk: high
epic: null
build_order: null
updated: 2026-07-12
---

# Scope — Mobile Clerk account management

## Outcome & signal
A mobile user can find and manage their Clerk account (email, password, connected accounts,
sessions, delete account) from the Perfil tab without hunting. Daniel tests it on his phone:
Perfil → "Administrar cuenta" → full Clerk profile UI.

## Reproduction
On mobile, the desktop header (and its `<UserButton />` + `CuentaMenu`) is `hidden md:flex`
(`PlatformShell.tsx`). The only Clerk entry left is the unlabeled `<UserButton />` avatar in the
`/account` page header (`app/(shell)/account/page.tsx:36`) — a tiny target with zero affordance
that it opens account management. The `/account` LINKS hub (orders, favorites, notificaciones…)
has no account-management row at all. No `<UserProfile />` exists anywhere in the app.

## Root cause
Account management was only ever exposed through `UserButton`'s dropdown — a desktop-header
idiom. When the mobile PWA nav became the tab bar + `/account` hub, no equivalent entry was added.
Unbuilt promise, not a regression.

## Stage-2.5 bucket
**Light enhancement** — Clerk ships the whole UI; we add one route + one row.

## Scope
**In v1:**
- New page `app/(shell)/account/settings/[[...rest]]/page.tsx` hosting
  `<UserProfile routing="path" path="/account/settings" />` (catch-all route — Clerk's path
  routing requires it; verify against current Clerk Next.js docs at build time).
- New row in the `/account` LINKS hub: "Administrar cuenta" — desc "Correo, contraseña y
  seguridad" (es-MX), placed near the top.
- "Cerrar sesión" affordance check: confirm sign-out is reachable on mobile (UserButton provides
  it; if the row replaces prominence, add an explicit sign-out row).

**Out of v1:**
- Replacing `UserButton` anywhere, custom-building any auth/profile UI (AGENTS rule #4),
  desktop `CuentaMenu` changes, notification prefs (already at `/account/notificaciones`).

## What already exists (reuse, don't rebuild)
- `/account` hub page + LINKS array pattern (`app/(shell)/account/page.tsx`) — one array entry.
- Clerk is fully wired (provider, middleware, `auth-clerk` backend module untouched).
- `(shell)` route group = dynamic, auth-capable — right home for the new page.
- Tab-bar routing: `lib/tabbar-visibility.ts` maps profile → `/account/…` already; the new
  subroute inherits correct active-tab state (`pathname.startsWith('/account/')`).

## UX heuristics & rails check
- **CI guards covering this surface:** Iconoir guard — pick an icon that exists in the loaded
  bundle (#235/#240 burned us twice); design-token guard for any custom wrapper styling.
- **Audits-lens findings that apply:** none found for the account hub.
- **Design-language debt (if any):** Clerk's `<UserProfile />` ships its own look — check the
  `appearance` prop against our tokens so it doesn't land as a foreign island (open question).

## Kill-switch / runtime gate (risk:high only — Stage 6b)
**Carve-out (no flag):** additive Clerk-hosted component on a new route with one hub link — no new
runtime seam, no auth-flow change; rollback = revert the route + row. `risk: high` is assigned
because it's auth-surface (per the "when unsure, high" rule) → **Daniel merges**, but a Flagsmith
flag would gate nothing the revert doesn't.

## Acceptance criteria
- Mobile: Perfil tab → /account shows "Administrar cuenta" row → full Clerk profile UI renders at
  `/account/settings`; email/password/sessions manageable; deep link works signed-in; signed-out
  hits the existing auth redirect.
- Desktop unchanged (UserButton + CuentaMenu still work); the new page is also fine on desktop.
- Copy is es-MX, including the Clerk component: use `@clerk/localizations` `esMX` if not already
  configured (verify — nothing in the repo sets it today).
- Regression spec: the hub renders the new row (api-level HTML check like `nav-entry-points.spec.ts`).

## Open risks / research
- Verify current Clerk App Router API for `<UserProfile />` path routing (catch-all segment
  requirement, `appearance` theming) against present-day docs — Clerk moves fast; don't build
  from memory.
- Clerk `esMX` localization coverage — confirm the profile surface is fully translated; if not,
  note the gaps rather than hand-patching strings.
