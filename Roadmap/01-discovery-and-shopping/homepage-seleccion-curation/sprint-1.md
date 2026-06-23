# Sprint 1 — Homepage bug sweep (ship first)

**Epic:** [Homepage Selección: bug sweep + admin curation + dynamic rotation](README.md) · **Repo:** `apps/miyagisanchez`
**Goal:** close the two live homepage defects and the auth-state leakage they exposed — **frontend-only, LOW
risk, no money/auth mutation** — and ship it as the quick-win drop before any curation work. Every change keeps
`/` a static CDN asset (`next build` → `○ /`).

## Stories

### S1.1 — Categorías per-row hover · LOW
**As a** buyer on the homepage, **I want** each Categorías row to highlight on hover (and look individually
clickable), **so that** I can tell I'm selecting one category, not the whole list.
- **Root cause:** the Categorías section wraps N `<Link>` rows in one `<div className="card-tile">`; the
  `.card-tile:hover` rule (`app/globals.css:700-704`: border-accent + shadow + `translateY(-1px)`) lights the
  **whole card**, and the individual rows carry no hover style. (`app/(site)/page.tsx` Categorías block.)
- **Fix:** make the container a **non-hover** surface (use `card-panel`, or drop the hover transition for this
  instance) and add a **per-row hover** on each row `<Link>` (`background: var(--surface-muted)` or `--bg-sunk`),
  keyboard-focusable with the same highlight on `:focus-visible`.
- **Acceptance:** hovering one row highlights **only that row**; the container no longer borders/lifts as one
  block; per-row click target unchanged; keyboard focus shows the same single-row highlight.
- **QA:** anonymous browser smoke (Claude-in-Chrome hover on one row + keyboard tab) — visual, eyeball owed to
  Daniel on preview.

### S1.2 — Gate signed-out CTAs on the homepage · LOW
**As a** signed-in user on the homepage, **I want** the "Únete a la comunidad / Crear cuenta" terminal CTA and
any "Abre tu tienda"-type signed-out prompt to **not** show, **so that** the page reflects that I'm logged in.
- **Root cause:** static-shell S2 removed the homepage auth branch; the signed-**in** modules returned as client
  islands (`HomeSellerModule`), but the signed-**out** terminal CTA (`app/(site)/page.tsx`, the "Únete a la
  comunidad" `<section>`) and the empty-state CTAs render server-side for **everyone**, never wrapped in `AuthShow`.
- **Fix:** wrap the signed-out-only blocks in **`<AuthShow when="signed-out">`** (`app/components/AuthShow.tsx` —
  drop-in, client `useAuth`, no `headers()`). Signed-out HTML still prerenders (the `home-chrome` / `home-static`
  specs' anonymous SSR stays green), then hydrates away for signed-in sessions. Confirm `next build` keeps `○ /`.
- **Acceptance:** signed-out visitor sees the terminal CTA as today; signed-in visitor sees it **gone** (and only
  their `HomeSellerModule` island, no duplicate recruit prompt); `next build` still emits `○ /`.
- **QA:** the SSR-marker + decision idiom from `home-static.spec.ts` / `home-personalization.spec.ts` (anonymous
  SSR still carries the signed-out CTA). The **signed-in → CTA-absent** browser smoke is **owed to Daniel on prod**
  (per LEARNINGS, the auth/island path can't false-pass on a `*.vercel.app` preview).

### S1.3 — Full signed-out/in leakage audit + fixes · LOW
**As a** signed-in user, **I want** no public surface to show me signed-out-only prompts (and vice-versa), **so
that** the app is consistent after the static-shell migration.
- **Scope:** grep every `(site)` static surface + shared chrome for hardcoded signed-out/in CTAs **not** gated by
  `AuthShow`. Candidate surfaces: homepage empty-state CTAs (`app/(site)/page.tsx`), `PlatformShell` nav,
  `MobileTabBar`, `/vende`, `/acerca`, the seller-acquisition landing pages, `/l`. Produce a findings table
  (surface · leaked element · which state · fix), then fix each leak by wrapping in `AuthShow` (or the client-island
  idiom where seller-snapshot data is actually needed).
- **Acceptance:** the audit table is written into this sprint doc (below, under *Audit findings*); every identified
  leak gated; no surface shows both states; `next build` keeps `(site)` static.
- **QA:** per-surface anonymous SSR assertion where a spec already exists; authed eyeballs owed to Daniel.

## Sprint QA
- Deterministic gate: `tsc` + `npm run build` (assert `○ /` survives) + the existing `home-*` api specs stay green;
  add/extend an anonymous SSR spec for the gated homepage CTA. No money/auth-mutation path in S1.
- Owed to Daniel (prod, signed-in session): S1.2 CTA-absent eyeball; S1.1 hover eyeball (any session).

## Audit findings (S1.3 — fill during the sprint)
| Surface | Leaked element | Wrong state | Fix |
|---|---|---|---|
| _(to be filled by the builder)_ | | | |

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the branch's Vercel preview (then production after merge). `<preview>` = the PR's preview URL.

1. Open `<preview>` signed-out (private window).
   → You see the **"Selección de la semana"**, then **Categorías**, then at the bottom the **"Únete a la
     comunidad"** CTA with "Crear cuenta" / "Seguir explorando".
2. Hover one row in **Categorías** (e.g. the first category).
   → **Only that row** highlights (subtle background change); the whole card does **not** light up or lift.
3. Tab with the keyboard onto a Categorías row.
   → The same single-row highlight shows on focus; pressing Enter opens that category.
4. Sign in as a normal user, return to `<preview>`. **[owed to Daniel — signed-in session]**
   → The bottom **"Únete a la comunidad / Crear cuenta"** CTA is **gone**; you instead see your seller
     snapshot / "¿Vendes algo?" island. No signed-out "open shop / create account" prompt anywhere on the page.
5. (audit spot-check) As the same signed-in user, visit each surface fixed in S1.3 (see the audit table).
   → None shows a signed-out-only "Crear cuenta / abre tu tienda"-style prompt. **[owed to Daniel — signed-in]**

If any step fails, note the step number + what you saw — that's the bug report.

## Status
- [ ] S1.1 — _pending_
- [ ] S1.2 — _pending_
- [ ] S1.3 — _pending_
