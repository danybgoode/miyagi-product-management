# Seller-portal rails foundation — Sprint 2: Adoption sweep + CI token-lint

**Status:** ⬜ not started

> Blocked-by Sprint 1 (the primitives must exist first). Replaces every legacy/raw call-site with the shared
> primitives, then locks the door with a CI lint so the dialects can't come back. **Rails: R1–R6.**

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
2. Go to https://miyagisanchez.com/sell (as a signed-in shop owner) and https://miyagisanchez.com/sell/setup.
   → Inputs and buttons match the rest of the portal (no `bg-white` boxes, no 4px rectangles).
3. Switch to dark mode and reload each of the three pages.
   → Everything keeps contrast; no white cards, no invisible text.
4. Do one real action on each surface: pause a listing (dashboard), bulk-mark an order (orders), publish a
   test draft (wizard).
   → Each still works exactly as before; a single shared toast confirms each, with Deshacer where applicable.
5. On a throwaway branch, add `className="bg-green-100"` to a portal component and push.
   → CI's token-lint fails the check (the rule is enforced, not advisory).

If any step fails, note the step number + what you saw — that's the bug report.
