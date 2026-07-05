# Emoji → Iconoir sweep — Sprint 1: The sweep + the guard

**Status:** ⬜ not started

## Stories

### Story 1.1 — Mapping table + mechanical sweep
**As a** user on any surface, **I want** UI chrome icons to be Iconoir, not emojis, **so that** the product reads as one designed system on every platform.
**Acceptance:** an emoji→iconoir mapping table produced first and reviewed by Daniel (one pass, before mass-apply); sweep covers the 79-file audit list (storefront `/s/[slug]` + ChannelLayout + ClosetListingCard, seller shell `/shop/manage/**` incl. settings `_sections/*`, orders/offers inboxes, import clients); aria-labels preserved/added; **voice emojis stay** (user content, deliberate email tone — rule: chrome → icon, voice → emoji); shared-surface files (`ChannelLayout`, `layout.tsx`) announced; files owned by in-flight OSPP/CPP branches skipped in pass 1 and listed for pass 2.
**Risk:** LOW

### Story 1.2 — CI guard
**As the** team, **I want** an emoji-in-JSX CI check with a voice allowlist, **so that** the sweep can't silently regress (the raw-color-guard lesson: only CI catches new client islands).
**Acceptance:** check runs beside the raw-color guard; allowlist file documents each exception with a reason; advisory on the sweep PR, flipped to required after merge.
**Risk:** LOW

## Sprint QA
- **api spec(s):** the CI guard itself is the spec (self-tested with a fixture); existing specs stay green
- **browser smoke owed:** yes, to Daniel — visual eyeball: storefront header + one settings page + offer inbox, light + dark, real phone
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Open https://miyagisanchez.com/s/miyagiprints.
   → Header/contact chips show Iconoir icons (no 🏪 📍 📸 💬); social links still labeled correctly.
2. Open /shop/manage/settings and two sections (Pagos, Envíos).
   → Card and section icons are Iconoir; nothing lost its meaning.
3. Open /shop/manage/offers and /shop/manage/orders.
   → Inbox states use icons, not emojis.
4. Check a listing description containing an emoji and a system email with deliberate voice.
   → Untouched (voice allowlist).
5. In CI, push a test branch adding `<span>🚀</span>` to a component.
   → The emoji guard flags it.

If any step fails, note the step number + what you saw — that's the bug report.
