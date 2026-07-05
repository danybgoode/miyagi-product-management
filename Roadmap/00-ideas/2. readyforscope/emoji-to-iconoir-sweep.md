---
status: readyforscope
slug: emoji-to-iconoir-sweep
macro: 09-platform-infra
class: chore
archetype: Sweeper
risk: LOW — visual-only, but broad (79 files); shared-surface files announced
---

# Emoji → Iconoir sweep — one icon language, finally

> Scoped 2026-07-05 from Daniel's raw ask ("we keep using emojis instead of iconoir — replace
> them"). The poster already claims "One Iconoir icon language across the buyer surface (no emoji)"
> (Discovery Polish) — this chore makes that claim true everywhere else.

**Why:** an audit today found **79 files** under `app/` + `components/` + `lib/` still rendering
emojis as UI icons — including the shop storefront header (🏪 📍 📸 🎵 💬 ☎ ✉ 👥 📦), most seller
settings `_sections/*`, order screens, offer inbox, import clients, and the manage dashboard.
Emojis render inconsistently across platforms, fight the design system, and undercut the premium-
presentation work (OSPP).

## Scope
- **In:** replace UI-icon emojis with Iconoir classes (already loaded globally in `app/layout.tsx`)
  across seller shell (`/shop/manage/**`, settings sections), shop storefront (`/s/[slug]`,
  ChannelLayout, ClosetListingCard), buyer flows (orders, offers, cart/checkout chrome), and shared
  components; aria-labels preserved/added; es-MX tooltips untouched.
- **Keep as-is (explicit):** emojis inside *user content* (descriptions, messages), emails where
  emoji is deliberate voice, the 404/empty-state illustrations if they're content-tone (decide
  per-case with the one-line rule: *chrome → icon, voice → emoji*).
- **Guard so it can't regress:** extend the existing raw-color/CI-guard pattern with an
  emoji-in-JSX lint check (allowlist for the "voice" cases), advisory→required after the sweep.

## Slice — 1 sprint
| # | Story | Risk |
|---|---|---|
| 1 | Storefront + seller-shell sweep (the 79-file list, mechanical; icon mapping table reviewed once by Daniel before mass-apply) | LOW |
| 2 | CI guard: emoji-in-JSX check + allowlist; wired next to the raw-color guard | LOW |

Files touching shared surfaces (`ChannelLayout`, `layout.tsx`) get announced per WAYS-OF-WORKING.
QA: visual diff pass + the existing specs stay green; browser eyeball owed to Daniel on storefront
+ one settings page. Coordinate timing with in-flight OSPP/CPP branches to avoid merge noise
(sweep AFTER their active sprints merge, or scope those files out of the first pass).
