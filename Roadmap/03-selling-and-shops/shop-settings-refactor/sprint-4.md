# Shop Settings refactor — Sprint 4: Decommission + finalize

**Status:** ✅ SHIPPED — [PR #74](https://github.com/danybgoode/miyagisanchezcommerce/pull/74) squash-merged `19f2831` (fresh-reviewer APPROVE, auto-merged on green CI; branch deleted). Built on `2e7d293`. CI was green (Type-check + build · Playwright-vs-preview `api` 4m29s · Vercel). Authed money-section smoke owed to Daniel. · **Risk: LOW (shared routing — announced; branched fresh off latest `main`)**

> The car: every section now lives in its own component, so the monolith and its fallback can go, the
> dual taxonomy collapses to one, and a guard spec stops the file from ever growing back.

## Stories

### Story 4.1 — Delete the monolith ✅ (`2e7d293`)
**As a** developer, **I want** `ShopSettings.tsx` and the monolith fallback removed once every section
has moved, **so that** the 4,200-line file is gone for good.
**Acceptance:** `ShopSettings.tsx` is deleted; the `[section]` registry no longer imports it; `tsc
--noEmit` + `npm run build` are green with **zero** remaining references to the old component.
**Risk:** LOW (touches shared `[section]` routing → **announce**; merge latest `main` first).

### Story 4.2 — Finalize the unified taxonomy ✅ (`2e7d293`)
**As a** developer, **I want** the legacy dual-key map removed so index + route + nav all use the one
canonical set, **so that** there's a single section vocabulary.
**Acceptance:** the old key-mapping is deleted; every section card links to a key that resolves; no
orphan or unmapped keys remain; the index completion logic reads the canonical map.
**Risk:** LOW

### Story 4.3 — Anti-monolith guard spec ✅ (`2e7d293`)
**As a** developer, **I want** a pure-logic spec that fails CI if any single settings component exceeds a
line threshold (or if `ShopSettings.tsx` reappears), **so that** the foundation can't silently erode back
into a monolith — the way the raw-color guard keeps the token surface tokenized.
**Acceptance:** spec passes against the refactored tree; a deliberately oversized settings file makes it
fail; it's in the `api` gate.
**Risk:** LOW

## Sprint QA
- **api spec(s):** Story 4.3 → `e2e/shop-settings-no-monolith.spec.ts` (pure-logic file/line scan). The
  taxonomy + secret-strip specs from S1/S3 stay green.
- **browser smoke owed:** yes, to Daniel — a final pass over **all** section URLs confirming nothing
  regressed after the monolith deletion (money sections especially). No new money path introduced here.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Confirm `apps/miyagisanchez/app/shop/manage/settings/ShopSettings.tsx` no longer exists in the repo.
   → The file is gone; build is green.
2. Sign in as a test seller and open https://miyagisanchez.com/shop/manage/settings
   → The index renders every section card, same as before.
3. Visit each section URL (perfil, diseno, tipo, negociacion, comunicacion, envios, citas, pedidos,
   notificaciones, politicas, pagos, canal, agentes).
   → Every one renders correctly from its own component — no 404, no blank section, no fallback left.
4. Do one save in a non-money section and one in a money section (test shop). **(money path — Daniel)**
   → Both persist identically to before.
5. (CI) The anti-monolith guard spec is green; temporarily bloating a settings file fails it.
   → The guard bites as intended.

If any step fails, note the step number + what you saw — that's the bug report.
