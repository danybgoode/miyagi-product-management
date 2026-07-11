# Seller-portal rails foundation — Sprint 2: Adoption sweep + CI token-lint

**Status:** ✅ built 2026-07-10 — `feat/seller-portal-rails-foundation-s2`, commits `c9f8568` (2.1 core
portal files), `5c6020b` (2.1 settings/_sections), `71819cb` (2.1 settings/_components), `e0f47eb` (2.2
CI token-lint). Deterministic gate green (`tsc` + `npm run build` + `npm run test:e2e`, 1819 passed — 7
pre-existing, environment-dependent failures unrelated to this sweep, confirmed by reproducing them on
the clean pre-sweep tree). Daniel's live visual smoke (light/dark/calm across the swept surface) still
owed — no money/auth path.

> Blocked-by Sprint 1 (the primitives must exist first — merged as PR #208). Replaces every legacy/raw
> call-site with the shared primitives, then locks the door with a CI lint so the dialects can't come
> back. **Rails: R1–R6.**

## Built-vs-planned corrections (found during the build, confirmed before proceeding)
- **`--color-subtle` was never actually fixed in Sprint 1** despite its own doc claiming otherwise — 3
  live call-sites remained (`OrdersInbox.tsx` ×2, `OrderDetail.tsx` ×1). Fixed in this sprint (→
  `--bg-sunk` directly).
- **`lib/design-token-audit.ts` had none of Story 2.2's four checks yet** — only arbitrary-hex, raw-hex,
  one invisible-button-combo check, and WCAG contrast existed. All four new checks (raw palette, `bg-white`,
  literal radii, feedback-import location) are net-new additions, wired as hard Playwright assertions from
  the start (not advisory→required — see below for why that toggle wasn't needed).
- **Story 2.2's hard gate is scoped to the files Story 2.1 actually swept (`enforcedSweptPaths`), not the
  whole `app/`+`components/` tree.** The seller-portal directory tree turned out to have ~50 more files
  (analytics, collections, content, convocatoria, eventos, import, mercadolibre, profit, promotions,
  subscriptions, sweepstakes) with the same raw-palette/`bg-white`/literal-radii debt, never named in this
  sprint's scope. Gating the whole tree today would fail on files this sprint never touched. The underlying
  scan still runs across `app/`+`lib/` broadly (for visibility as future sprints expand coverage); only the
  swept subset is asserted `toEqual([])`. **Confirmed with Daniel before building the lint this way.**
- **The settings tree (`_sections/` + `_components/`) turned out to be ~15 files and ~250 raw-palette hits**
  — roughly doubling the sweep beyond the 4 named files + OfferInbox/OrderDetail. **Confirmed with Daniel
  to include the full tree in this pass** (in path-scoped commit batches) rather than defer it.
- **Two files needed a narrower scope than "sweep the whole file"**: `CatalogTable.tsx`'s `STATUS_LABEL`
  map has its sole consumer inside catalog-management PR #209's edited column range, so only its
  `DeleteDialog` (fully isolated) was swept this pass; `settings/_sections/Envios.tsx` was scoped out
  entirely (shipping-provider-expansion PR #210 territory). **Both PRs merged to `main` mid-sprint** (after
  this branch forked) — merged cleanly, and both files' remaining raw-palette debt (CatalogTable ~14 hits,
  Envios ~38 hits, the latter grown by PR #210's own new UI) is left as an explicit follow-up rather than
  scope-creeping further in this already-large sprint.
- **Two blocks are deliberately-styled dark "terminal" code/DNS-record previews, not status-badge
  violations**: `Agentes.tsx`'s payload-preview `<pre>` (bg-gray-900/text-green-400, terminal-console
  theming) and `Canal.tsx`'s DNS-record card (amber-300/green-300 terminal fields). Allow-listed in
  `lib/design-token-audit.ts` the same way the existing hex-literal guard allow-lists serialized iframe
  fallback colors — not swept, and not counted as violations.
- **`Canal.tsx` had its own hand-rolled duplicate of `SectionSaveBar`** (byte-for-byte the same footer,
  imported `SectionSaveBar` but never rendered it) — replaced with the shared component instead of just
  detoxifying its raw classes, since that's strictly "less code, same behaviour."

## Stories

### Story 2.1 — Adoption sweep across the seller portal
**As a** merchant, **I want** every screen to use the same status colors, buttons, cards, and toasts,
**so that** nothing looks improvised and dark/calm mode works everywhere.
**Build:** replace, across `OrdersInbox.tsx` · `ManageDashboard.tsx` · `SellWizard.tsx` · `SetupClient.tsx`
(+ any settings `_components` that render status/buttons):
- raw Tailwind palette classes (`bg-green-100`, `text-indigo-700`, `bg-amber-50`, …) → `<StatusBadge>` /
  semantic tokens;
- hard-coded `bg-white` → `--bg-elevated`;
- literal radii + the 4 hand-rolled button shapes → `<Card>` / `<Button>`;
- kill indigo/purple status colors (shipped/in_transit → info; ML → promo).
Behaviour and copy unchanged (a **Sweeper**: less code / same behaviour / no regressions). Prove the old
classes are unreachable.
**Acceptance (Daniel-runnable):**
1. `/shop/manage`, `/shop/manage/orders`, `/sell`, `/sell/setup` render identically in light mode and stay
   correct in dark + calm mode (no white boxes, no off-palette chips).
2. Grep proof: zero raw palette classes / `bg-white` / literal radii remain in those four files.
3. No functional change — a listing still pauses/edits/deletes; an order still bulk-updates; the wizard still
   publishes.
**Risk:** low *(shared-surface — announce; sequence around `catalog-management` + `emoji-to-iconoir-sweep`)*

### Story 2.2 — CI token-lint (make the one-language rule enforceable)
**As a** maintainer, **I want** CI to reject a re-introduced dialect, **so that** the portal stays one
language without manual review.
**Build:** extend `lib/design-token-audit.ts` to scan `app/` + `components/` for: raw palette classes,
`bg-white`, literal radius values in JSX, and toast/banner imports outside `components/feedback/`. Ship
**advisory** first (report-only), flip to **required** once 2.1 is green. Document the allow-list.
**Acceptance (Daniel-runnable):**
1. Add a `bg-green-100` to a portal component on a throwaway branch → CI flags it.
2. Import a toast outside `components/feedback/` → CI flags it.
3. On `main` post-sweep, the lint passes required with zero violations.
**Risk:** low

## Sprint QA
- **api spec(s):** extend `e2e/seller-mode.spec.ts` — status chips resolve to semantic tokens; ≤1
  `.btn-primary` per swept route. The lint itself is the durable enforcement (runs in CI).
- **browser smoke owed:** yes, to Daniel (visual only — no money/auth path): eyeball the four swept surfaces
  in light/dark/calm and confirm no behaviour regressed on pause/edit/delete + order bulk-update.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` + the new token-lint green before merge.

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the Vercel preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/shop/manage and eyeball the listing rows + stat cards.
   → Status chips are on-palette; the primary action is one pill; cards share one radius.
2. Go to https://miyagisanchez.com/shop/manage/orders, open one order's detail page, and check
   https://miyagisanchez.com/shop/manage/offers.
   → Order status chips, escrow/pickup/refund banners, and offer status chips are all on-palette; no
     purple/indigo, no leftover `bg-white` boxes.
3. Go to https://miyagisanchez.com/sell (as a signed-in shop owner) and https://miyagisanchez.com/sell/setup.
   → Inputs and buttons match the rest of the portal (no `bg-white` boxes, no 4px rectangles); the 3-step
     wizard (tienda → anuncio → éxito) shows exactly one primary CTA per step.
4. Go to https://miyagisanchez.com/shop/manage/settings and click through each section tab (Perfil, Diseño,
   Pagos, Envíos, Canal, Citas, Negociación, Páginas, Devoluciones, Agentes, Notificaciones, Pedidos).
   → Every section's Save bar looks identical (shared `<SectionSaveBar>`); status/result chips and warning/
     error callouts are on-palette; no stray `bg-white` or literal-radius boxes (except the intentionally
     unswept `Envíos` — see the corrections note above).
5. Switch to dark mode and reload the pages above.
   → Everything keeps contrast; no white cards, no invisible text.
6. Do one real action on each surface: pause a listing (dashboard/catálogo), bulk-mark an order (orders),
   respond to an offer (offers), publish a test draft (wizard), save a settings section (e.g. Perfil).
   → Each still works exactly as before; a single shared toast/banner confirms each, with Deshacer where
     applicable.
7. On a throwaway branch, add `className="bg-green-100"` to one of the swept files (e.g.
   `ManageDashboard.tsx`) and push.
   → CI's token-lint fails the check (the rule is enforced, not advisory, for the swept file set).

If any step fails, note the step number + what you saw — that's the bug report.

## Owed / follow-up
- **Daniel's live visual smoke** (steps 1–7 above) — no money/auth path, safe to do anytime.
- **`CatalogTable.tsx`'s `STATUS_LABEL` map + `<td>` render block** and **`Envios.tsx` entirely** — scoped
  out this pass (in-flight PRs #209/#210 at branch time, both merged mid-sprint). ~14 + ~38 raw-palette/
  radius hits remain; a follow-up sweep (Sprint 2.5, or folded into the next `catalog-management`/
  `shipping-provider-expansion` sprint) should finish these and add both files to `enforcedSweptPaths`.
- **The other ~50 seller-portal files never in this sprint's scope** (analytics, collections, content,
  convocatoria, eventos, import, mercadolibre, profit, promotions, subscriptions, sweepstakes) still have
  raw-palette/`bg-white`/literal-radii debt — visible via the lint's broad scan but not yet gated. Each
  future sweep should add its files to `enforcedSweptPaths` as it goes.
