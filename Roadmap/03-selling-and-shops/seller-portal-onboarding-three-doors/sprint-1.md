# Onboarding three-doors — Sprint 1: Intake store + three-doors entry

**Status:** ✅ built, PR open — branch `feat/seller-portal-onboarding-three-doors`

> Rails: R13 (seller shell / nav parity) · R11 (ready-not-blank). Spec: ONBOARDING-SPEC S1–S3.
> Build on P0·A `<Card>`/`<Button>`. Behind `onboarding.three_doors_enabled` (dark, default OFF).

## As-built corrections (confirmed with Daniel before coding — see the plan/PR)
Four real gaps surfaced reading the actual code on `origin/main` that this doc's original scope
didn't cover:
1. **Chrome mechanism.** Neither `isSellerModePath` (`/shop/manage` only) nor the owner-gated
   `sellShellEligible`/`SellerShellChrome` (P1·C, requires an *existing* Medusa seller) cover a
   pre-shop merchant. Added a new, separate pure predicate `lib/onboarding-path.ts` + an additive
   OR-branch in `app/(shell)/layout.tsx` (same pattern P1·C used for `ownerSellShellEligible`) +
   a new lightweight top-bar-only chrome (no `SellerNav` — nothing to nav to pre-shop). Neither
   `isSellerModePath` nor `sellShellEligible` was touched.
2. **Photos/screenshots descoped.** No job-queue/background-job primitive exists anywhere in the
   repo (verified by grep). Sprint 1 ships CSV + JSON + the ML-sync row synchronously; the
   dropzone mentions photos "próximamente" but does not accept them. Fast-follow.
3. **Door 2 gate fixed.** `ImportClient`'s route 404-redirected to `/sell` for anyone with no
   Medusa seller yet — every fresh three-doors merchant. Fixed by extracting the idempotent
   create-or-get shop logic (`lib/ensure-shop.ts`, byte-identical to what `/api/sell/shop` already
   did) so the import page's gate calls it instead of bouncing away.
4. **Entry wiring.** `/sell`'s signed-in branch redirects a flag-on, shop-less, intake-less
   merchant to `/sell/bienvenida`; the ghost CTA / Door 3 set a one-tab-session skip cookie so
   they don't loop back.

## Stories

### Story 1.1 — `tenant_intake` store + S1 Bienvenida intake ✅ `dfc3328`
**As a** new merchant (post-signup), **I want** a short optional welcome that asks what I sell and where I
sell today, **so that** the rest of setup is prepared to my case instead of a blank form.
**Acceptance:**
- After signup I land on **S1 Bienvenida** in the new onboarding chrome (no buyer chrome): H1 "Hola,
  {nombre}. Tu tienda está a unos minutos.", two optional multi-select chip questions (Q1 ¿Qué vendes? · Q2
  ¿Dónde vendes hoy?), "Continuar" + a ghost "Prefiero explorar por mi cuenta" that goes to `/sell` (S6's
  guide-at-step-1 destination is Sprint 2 scope; today's `/sell` is the equivalent fallback).
- My answers persist to `tenant_intake` (Supabase) and survive a reload.
**Risk:** low — additive non-commerce Supabase table (Rule 2), fail-safe absent.

### Story 1.2 — S2 Tres puertas (agent door first) ✅ `2ebe3c8`
**As a** new merchant, **I want** three clear, ranked ways to build my store with the agent door first and a
trust line, **so that** I pick a path confidently and know nothing publishes without my approval.
**Acceptance:**
- S2 reads `tenant_intake` and shows a personalized subtitle + **door order** (an existing-channel seller
  sees Door 2 ranked above Door 3; a Mercado Libre seller sees "podemos traer tu catálogo casi solo").
- **Door 1 (recommended)** is visually first ("Recomendado" badge, 2px accent border): "~5 min · tú solo
  revisas y apruebas", body ends "Nada se publica sin tu visto bueno." → `/sell/agente`.
- **Door 2** → `/shop/manage/import` (Story 1.2b fix below); **Door 3** → `/sell` (skip signal set). Footer:
  "Puedes cambiar de camino cuando quieras — nada se pierde."
**Risk:** low — presentational routing; consumes `isOnboardingPath` (this sprint's own new predicate), never
touches `isSellerModePath`.

### Story 1.2b — Door 2 shop-less gate fix ✅ `90ca6ba`
Not in the original scope doc — found while building 1.2 (see corrections above). `/shop/manage/import`
now creates a bare shop on first visit (reusing the existing idempotent `POST /api/sell/shop` logic,
extracted to `lib/ensure-shop.ts`) instead of redirecting a shop-less merchant back to `/sell`.
**Risk:** low — reuses an already-shipped commerce-write path, no new Medusa primitive.

### Story 1.3 — S3 drop-anything intake (CSV/JSON; photos descoped) ✅ `d3a7b4f`
**As a** merchant on the agent door, **I want** to hand over my info however I have it, **so that** I don't
have to start from a blank paste box.
**Acceptance:**
- A dashed dropzone accepts **CSV / JSON** (photos/screenshots descoped this sprint — see corrections
  above); a "Traer de Mercado Libre" row shows when the merchant already has a connected shop; a row copies
  the prompt kit (`lib/setup-spec.ts`) in one tap; paste-JSON exists **only** behind a collapsed "Opción
  avanzada" disclosure.
- CSV and JSON proceed **synchronously**: parsed, stashed via a one-key sessionStorage handoff
  (`lib/onboarding-handoff.ts`), and land on the **existing** `/sell/setup` staging preview (its restyle
  into the S4 card layout is Sprint 2). Footer: "Nada se crea todavía — primero te mostramos el borrador
  completo."
**Risk:** low (intake UI + one additive `useEffect` hook in `SetupClient.tsx`, zero behavior change to the
existing paste/upload path).

## Sprint QA
- **api spec(s):** `e2e/onboarding-three-doors.spec.ts` — pure-logic: `isOnboardingPath`, `personalizeDoors`
  (door order + subtitle across every intake branch), and the CSV/JSON→`MiyagiSetupFile` handoff contract
  (via the same `parseCatalogFile`/`validateSetup` the UI calls). `e2e/tenant-intake-api.spec.ts` — anonymous
  401 on GET/POST. `e2e/flags-admin.spec.ts` — updated flag count (26→27).
- **Deterministic gate:** `tsc --noEmit` clean; `npm run build` clean (all new routes registered:
  `/sell/bienvenida`, `/sell/puertas`, `/sell/agente`); Playwright `api` project — every new/touched spec
  green (52/52 in isolation: `onboarding-three-doors`, `tenant-intake-api`, `flags-admin`, `seller-mode`).
  Full-suite local run showed 7 unrelated pre-existing failures (`launchpad-*`, `home-static`,
  `home-auth-leakage`) that reproduce identically with or without this branch's changes — explained by no
  local Medusa backend running (`MEDUSA_STORE_URL=http://localhost:9000`, nothing listening) and real
  Upstash rate-limiting under a full local run; none of the touched files are in this diff. CI will confirm
  against the PR's live-backed Vercel preview.
- **Browser smoke owed to Daniel:** the full signed-in walkthrough below (real Clerk session) — an
  automated anonymous run can't drive it. The ML-connected row in S3 additionally needs a connected test
  shop; state as a gap if unavailable.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: preview URL while pre-merge · production https://miyagisanchez.com after deploy. Requires
`onboarding.three_doors_enabled` ON (flip in `/admin/flags` — seeds OFF) and a **brand-new signed-in
account with no shop yet**.

1. Sign up (or sign in) with a fresh account that has no shop, and open `/sell`.
   → You're redirected to **`/sell/bienvenida`**: dark top bar (no buyer search/cart), H1 "Hola, …".
2. Pick a couple of chips in Q1/Q2, click "Continuar".
   → You reach **`/sell/puertas`** with **Door 1 "Empezar con mi agente"** first, badged "Recomendado", and
   a personalized subtitle line.
3. Reload `/sell/puertas`.
   → Door order/subtitle unchanged — proves the `tenant_intake` read/write round-trip.
4. Click Door 1.
   → **`/sell/agente`** opens: a dashed dropzone (CSV/JSON), a "¿Ya tienes tu IA lista?" copy-prompt row,
   and "Opción avanzada: pegar JSON" collapsed (not shown by default).
5. Drop a small CSV (e.g. `title,price,category\nMaceta,350,hogar`).
   → You land on **`/sell/setup`** with the staging preview already populated from your CSV (today's
   unstyled table — the S4 card restyle is Sprint 2).
6. **(owed to Daniel)** Go back to `/sell/puertas`, click Door 2 "Traer mi catálogo".
   → `/shop/manage/import` opens directly (no bounce back to `/sell`) — proves the Story 1.2b fix.
7. **(owed to Daniel)** From `/sell/bienvenida`, click "Prefiero explorar por mi cuenta" (or Door 3).
   → Lands on `/sell` rendering `SellWizard` directly; reloading `/sell` does **not** loop back to
   Bienvenida (the skip signal held).
8. Flip `onboarding.three_doors_enabled` OFF in `/admin/flags`, reload `/sell` as a fresh shop-less user.
   → `/sell` renders today's `SellWizard` entry unchanged, no redirect (kill-switch works, no redeploy).

If any step fails, note the step number + what you saw — that's the bug report.
