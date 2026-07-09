# Catalog management — Sprint 6: Structural refactor (seller shell over `/sell` · Canal split)

**Status:** ⬜ not started · **Sequence gate: after S3 merges** (and best after S5, which lays the nav SSOT groundwork). The two changes here touch **shared surface** — run each in **plan mode** first.

> P1·C IA restructure remainder (F6/F7) — the seller-portal UX audit fold-in. Scope seed:
> [`00-ideas/seeds/catalog-management-ia-remainder.md`](../../00-ideas/seeds/catalog-management-ia-remainder.md).
> These are the two structural changes isolated out of S5: a shared-`layout.tsx` touch and a
> 1117-line file split. Folds into this HIGH epic ⇒ Daniel merges. **Cross-agent planning panel offer
> stands on 6.1** (an expensive-to-reverse chrome-gate fork).

## Stories

### Story 6.1 — Seller shell over `/sell` + `/sell/setup` (F6)
**As a** shop owner, **I want** publishing to happen inside the seller frame, **so that** I'm not flipped into buyer chrome (search/cart) at the moment of max concentration.
**Acceptance:** for a **signed-in shop owner**, `/sell` and `/sell/setup` render the seller shell (dark brand top bar + `SellerNav`), no buyer search/cart. **Signed-out `/sell` keeps buyer chrome** (acquisition — owned by the `/vende` epic). The white-label double-suppression guarantee is unchanged (a manage/sell page on a custom domain/subdomain still defers to `ChannelLayout`). `isSellerModePath` stays a **pure path predicate** (its api spec stays green) — ownership is decided in the layout, not in the predicate.
**Risk:** MED — touches the shared `app/(shell)/layout.tsx` chrome decision (blast radius: every page). Daniel merges.
**Kill-switch:** `seller.shell_on_sell_enabled` — **kill-switch polarity, default `true`, created ENABLED in every env** (Flagsmith, server seam — the branch lives in a server layout, not `middleware.ts`). Disabling instantly reverts `/sell` to buyer chrome without a redeploy. Gate the owner-aware branch on `isEnabled('seller.shell_on_sell_enabled')`.
**Approach (plan-mode + cross-panel offer):** (1) extract the seller shell (currently inline in `app/(shell)/shop/manage/layout.tsx`) into a shared component; (2) add an owner-aware branch to `app/(shell)/layout.tsx` — it already reads `headers()`, and `(shell)` is already dynamic, so an `auth()`/owner check is safe (per the `marketplace-static-shell` learning: auth-in-layout forces the subtree dynamic, which is fine here); (3) render the shared shell over `/sell` for owners behind the flag.
**Reuse:** `app/(shell)/shop/manage/layout.tsx` shell markup; `lib/seller-mode.ts` (unchanged, stays pure); the `navigation-settings-reorg` `isSellerModePath` precedent.

### Story 6.2 — Split `Canal.tsx` (F7, change #7)
**As a** seller, **I want** channels and support to be separate homes, **so that** a 62KB mega-section isn't one wall.
**Acceptance:** the 1117-line `settings/_sections/Canal.tsx` is split — **federation (dominio/subdominio/embed/agents) → a Canales page** under Catálogo; **the support widget → its own settings card**. `lib/shop-settings/taxonomy.ts` updated. No behavior change (Sweeper: same behavior, less code, no regressions). An **anti-monolith guard** fails CI if a >N-line Canal mega-section reappears.
**Risk:** MED (Sweeper)
**Approach:** follow the `shop-settings-refactor` playbook — **grep who imports the doomed file's *types*, not just its default export**; prove the old mega-section unreachable (exhaustive taxonomy registry) before deleting; then lock with the anti-monolith fs-guard.
**Reuse:** `lib/shop-settings/taxonomy.ts`; the `shop-settings-refactor` anti-monolith guard spec + decommission playbook.

## Sprint QA
- **api spec(s):** extend `e2e/seller-mode.spec.ts` — `/sell` renders the seller shell for an owner and buyer chrome when signed-out (6.1); flag OFF ⇒ `/sell` reverts to buyer chrome (kill-switch assertion); `isSellerModePath` purity spec unchanged. Canales page + support card render, and the **anti-monolith fs-guard** on `Canal` (6.2).
- **browser smoke owed:** yes, to Daniel — the **authed** owner-shell on `/sell` (he holds the seller session). The signed-out `/sell` (buyer chrome) case runs anonymously in the browser project.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 6 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. **(owed to Daniel — authed)** Signed in as a shop owner, open `/sell`.
   → You see the seller frame (dark "Miyagi Sánchez · Vendedor" top bar + the seller nav), **not** the buyer header/search/cart. Same on `/sell/setup`.
2. Open `/sell` in a private window (signed out).
   → Buyer chrome (search/cart) renders as before — the acquisition path is untouched.
3. Flip `seller.shell_on_sell_enabled` OFF, reload `/sell` as the owner.
   → `/sell` reverts to buyer chrome instantly (kill-switch works, no redeploy). Flip it back ON.
4. Open a shop on its own custom domain / subdomain and go to a manage page.
   → The branded channel shell still owns the chrome — no stacked/double shell (the white-label guarantee held).
5. Open Configuración → the channels area.
   → Federation (dominio/subdominio/embed/agentes) now lives on the **Canales** page under Catálogo; the **support widget** is its own settings card. Both work exactly as before.

If any step fails, note the step number + what you saw — that's the bug report.
