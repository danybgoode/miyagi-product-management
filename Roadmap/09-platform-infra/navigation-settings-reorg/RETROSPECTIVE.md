# Navigation & Settings Reorg — Retrospective

_Closed: 2026-06-11_

Separated buyer / seller / agent chrome that had all been jammed into one set of nav. Frontend-only across
all four sprints — `app/` + `globals.css`, **zero backend / Cloud Run / migration / new tables**.

## What shipped
- **S1 · PWA bottom bar** — [PR #75](https://github.com/danybgoode/miyagisanchezcommerce/pull/75) `dc4c992`
  (LOW). Trimmed the bar to **4 tabs + a center ⊕ FAB** (Inicio · Explorar · ⊕ Vender · Mensajes · Cuenta);
  removed the detached search circle, Favoritos, and Vecindario; **contextual hide** — hide-on-scroll (8px
  delta), `visualViewport` keyboard auto-hide, and route-hide (`null`) on `/l/[id]`, `/checkout`,
  `/messages/[id]`, `/sell`. Pure `lib/tabbar-visibility.ts` + api/browser specs.
- **S2 · Persistent search + Cuenta hub** — [PR #77](https://github.com/danybgoode/miyagisanchezcommerce/pull/77)
  `a7d6fe8` (LOW, shared `layout.tsx`/`globals.css`). Header search is now **persistent** (removed
  `.pwa-search-hide`), desktop-centered with an inline "Agente IA" affordance; new **`CuentaMenu.tsx`** +
  pure `lib/account-menu.ts` (8 entries: Favoritos · Pedidos · Suscripciones · Referidos · Notificaciones ·
  Agente IA · Tema · "Cambiar a modo vendedor") collapses the scattered header items; **one agent entry**
  (bare ✨ icons removed).
- **S3 · Seller-mode shell** — [PR #80](https://github.com/danybgoode/miyagisanchezcommerce/pull/80) `d6b0a6b`
  (**HIGH** — alters the global app-shell suppression gate; **Daniel merged**). Buyer chrome is suppressed
  under `/shop/manage` by **extending the existing `layout.tsx` whiteLabel gate** with a pure
  `isSellerModePath` predicate (no new suppression mechanism); new `app/shop/manage/layout.tsx` (dark brand
  top bar + "Volver a comprar") + `SellerNav.tsx`; pure `lib/seller-mode.ts` + `lib/seller-nav.ts`.
- **S4 · Naming + one-agent-entry cleanup** — [PR #81](https://github.com/danybgoode/miyagisanchezcommerce/pull/81)
  `8e12782` (LOW). `/sell` = publish action, `/vende` = signed-out pitch: header "Publicar gratis" + footer
  "Vende gratis" + the signed-out mobile ⊕ now lead to `/vende`; signed-in "Publicar" + the bottom-bar FAB
  stay on `/sell`. Vecindario (which left the tab bar in S1) gets a catalog-independent entry card in the
  Inicio feed. New `e2e/nav-entry-points.spec.ts` + `.browser.spec.ts`. **No `/vende` content touched** (#6).

## What went well
- **The epic re-scoped smaller once the shell was actually read.** Chrome suppression, the Explorar link,
  header search, and every account/manage sub-page already existed — so each sprint *extended a seam* rather
  than inventing a mechanism. The README's "What already exists (reuse, don't rebuild)" section paid for
  itself.
- **One pure, next-free `lib/` seam per sprint** (`tabbar-visibility`, `account-menu`, `seller-mode`,
  `seller-nav`, `nav-entry-points` assertions) → real `api`-gate coverage for free and no logic stuck inside
  a client component.
- **Risk-tiered merge worked as designed:** LOW sprints (S1/S2/S4) were fresh-reviewer auto-merged on green
  CI; the one HIGH sprint (S3, global suppression gate) went to Daniel.
- **CI-vs-preview earned its keep:** S2 shipped a regression where the theme toggle vanished for signed-out
  users; the local gate missed it, CI caught it (`cc6a0f5`).

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md. -->
- **Clerk `<Show when="signed-out">` renders server-side, so an anonymous `request.get('/')` api spec can
  assert signed-out chrome straight from the raw SSR HTML — but verify the *rendered attribute order* against
  the live page before writing any href-adjacency regex.** Next renders the `<a>`'s `href` **last**
  (`<a class=… href="/vende">`), so `href="…"[^>]*>text` matches reliably while an `href…data-testid`
  adjacency assumption is backwards. I confirmed both the SSR rendering and the attribute order with a
  read-only `curl` of prod before committing the spec, avoiding a wasted CI cycle. *(S4.)*
- **Make one always-shown control role-dependent with two mutually-exclusive `<Show>` branches, not one
  ambiguous href.** The mobile ⊕ plus-circle is shown to everyone; splitting it into `signed-in → /sell` /
  `signed-out → /vende` keeps signed-in users on the publish flow without a runtime href conditional. *(S4.)*
- **Reconfirmed: a squash-merged sprint branch is a dead end — branch each next sprint fresh off `main`.**
  The original `feat/nav-reorg` (S1) became a squash dead-end; S3 and S4 each cut a fresh `feat/nav-reorg-sN`
  off latest `main`. *(Already in LEARNINGS; this epic is a second witness.)*

## Gaps / follow-ups
- **Owed to Daniel (anonymous smokes can't cover these):** the **signed-in "Publicar" → /sell** path (S4
  step 2), the **PWA-standalone** look of the trimmed bar + contextual hide (S1/S4), and the **authed
  seller-mode shell** render under `/shop/manage` (S3 steps 1/4/5). Walkthroughs are in each `sprint-N.md`.
- **Deferred by scope (not regressions):** the `/comunidad → /vecindario` content merge + redirects (separate
  ask — migrates live publish routes); Flagsmith A/B + `.tabbar--peek` (const-switchable only). Any `/vende`
  content remains owned by epic #6.
