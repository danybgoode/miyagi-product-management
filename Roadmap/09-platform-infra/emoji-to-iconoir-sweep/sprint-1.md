# Emoji → Iconoir sweep — Sprint 1: The sweep + the guard

**Status:** ✅ shipped — merged, Daniel's visual eyeball done 2026-07-15, 4 fast-follow broken-icon PRs merged (#239, #240, #260)

## Stories

### Story 1.1 — Mapping table + mechanical sweep
**As a** user on any surface, **I want** UI chrome icons to be Iconoir, not emojis, **so that** the product reads as one designed system on every platform.
**Acceptance:** an emoji→iconoir mapping table produced first and reviewed by Daniel (one pass, before mass-apply); sweep covers the 79-file audit list (storefront `/s/[slug]` + ChannelLayout + ClosetListingCard, seller shell `/shop/manage/**` incl. settings `_sections/*`, orders/offers inboxes, import clients); aria-labels preserved/added; **voice emojis stay** (user content, deliberate email tone — rule: chrome → icon, voice → emoji); shared-surface files (`ChannelLayout`, `layout.tsx`) announced; files owned by in-flight OSPP/CPP branches skipped in pass 1 and listed for pass 2.
**Risk:** LOW
**✅ Done — commit `37f9962`.** The audit regenerated to **86 files** (the tree moved since the 2026-07-05 scope doc; both `own-shop-premium-presentation` and `custom-print-products` had already shipped, so the "in-flight OSPP/CPP" risk was moot — `gh pr list` showed zero conflicting open PRs). `layout.tsx`/`ChannelLayout.tsx` had **zero** emoji in the current tree, so nothing there needed announcing. The mapping table (27 glyphs → verified-real Iconoir classes, cross-checked against the actually-loaded `iconoir.css` bundle, not memory) was reviewed and approved as part of the plan; execution surfaced ~20 more glyphs the initial sample had hidden (secondary emoji in files already flagged for a different glyph) — all mapped using the same verification discipline, folded in without a second approval round since they were mechanical extensions of the same rule, not new judgment calls. Two genuine pre-existing broken icon references were found and NOT perpetuated (`iconoir-newspaper`, `iconoir-cancel` — neither exists in the loaded bundle; used `iconoir-journal`/`iconoir-xmark` instead). Unicode arrow glyphs (`← → ↑ ↓ ↗`) used as navigational wayfinding were scoped OUT (a different, far more pervasive convention than colorful emoji — see `lib/emoji-guard.ts`'s comment); `↩`/`↻` were scoped IN where they sit in the same status-icon register as pictograph emoji (→ `iconoir-undo`/`iconoir-refresh`). Ten of the 79 touched files still carry emoji this pass could not mechanically convert — the glyph lives inside a plain TS string with no separate icon slot at the render site (`{meta.message}`, `{opt.label}` interpolations, toast strings) or inside a code comment; both are documented per-file in `lib/emoji-guard.ts` as a pass-2 candidate, not silently dropped.

### Story 1.2 — CI guard
**As the** team, **I want** an emoji-in-JSX CI check with a voice allowlist, **so that** the sweep can't silently regress (the raw-color-guard lesson: only CI catches new client islands).
**Acceptance:** check runs beside the raw-color guard; allowlist file documents each exception with a reason; advisory on the sweep PR, flipped to required after merge.
**Risk:** LOW
**✅ Done — commit `fadf20d`.** `lib/emoji-guard.ts` + `e2e/emoji-guard.spec.ts`, same shape as `lib/design-token-audit.ts` / `design-token-foundation.spec.ts`: scans `app/`+`components/` (never `lib/`, where legit notification-voice copy lives), hard-gates the 69 fully-clean files via `enforcedSweptPaths`, documents the 5 `🎉` voice exceptions by file+sentence via `voiceAllowlist`. Caught two real misses during its own build (`SetupClient.tsx`'s two config-chip ternaries) — fixed same session. Joins `npm run test:e2e` (`api` project), the existing required gate — same "advisory now, required forever after merge" framing every prior guard addition here has used.

## Sprint QA
- **api spec(s):** `e2e/emoji-guard.spec.ts` (6 assertions: real-tree hard gate, negative fixture w/ enforced-vs-advisory split, allowlist fixture, allowlist-does-NOT-overreach fixture, admin/api/style-sandbox exclusion fixture, arrow-glyph-out-of-scope fixture) — all green. Full `api` suite: 2061 passed; 6 pre-existing failures unrelated (launchpad flag-gating + 404-middleware specs hitting live prod state, this repo's documented `PLAYWRIGHT_BASE_URL`-defaults-to-prod gotcha — nothing this sweep touched).
- **browser smoke owed:** yes, to Daniel — visual eyeball: storefront header + one settings page + offer inbox, light + dark, real phone. **Not done from this session** — every new Iconoir class was individually verified against the real loaded `iconoir.css` bundle before use, and `tsc`+`npm run build` both compiled clean, but no actual browser render was checked (spinning up the full local stack — Medusa backend + Postgres — was disproportionate for a LOW-risk visual chore). State this gap plainly in the PR.
- **deterministic gate:** `tsc --noEmit` ✅ + `npm run build` ✅ + Playwright `api` ✅ (see above) — all green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: the PR's Vercel preview while pre-merge, then production · https://miyagisanchez.com after merge

1. Open `/s/miyagiprints` (or any live shop slug).
   → Header/contact chips show Iconoir icons (no 🏪 📍 📸 💬); social links still labeled correctly, light + dark.
2. Open `/shop/manage/settings` and two sections (Pagos, Envíos).
   → Card and section icons are Iconoir; nothing lost its meaning; check the escrow-explainer 4-step strip on Pagos specifically (4 icons in a row — easiest place to spot a missing/wrong glyph).
3. Open `/shop/manage/offers` and `/shop/manage/orders`.
   → Inbox states use icons, not emojis; open one order detail page and scan the whole page (it had the most instances of any single file in the sweep).
4. Check a listing description containing a seller-typed emoji, and the celebratory "¡Tu tienda está activa en 2 canales!" banner on `/shop/manage/canal-propio` (once a domain is fully connected) or the launchpad vote success page.
   → Both untouched — user content and celebratory-tone voice both stay emoji by design.
5. In CI (or locally), push a test branch adding `<span>🚀</span>` to any file under `app/` or `components/`.
   → `npm run test:e2e` fails on the emoji-guard spec if that file is in `enforcedSweptPaths`; passes (advisory-only) otherwise — confirms the two-tier gate is wired correctly.

If any step fails, note the step number + what you saw — that's the bug report.
