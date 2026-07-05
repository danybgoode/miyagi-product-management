---
status: scaffolded
slug: emoji-to-iconoir-sweep
---

# Epic: Emoji → Iconoir sweep — one icon language, finally

> **Area:** 09 · Platform & Infra · **Risk:** LOW (visual-only; shared-surface files announced) · **Archetype:** Sweeper · **Class:** Chore · **Scope doc:** [`00-ideas/2. readyforscope/emoji-to-iconoir-sweep.md`](../../00-ideas/2.%20readyforscope/emoji-to-iconoir-sweep.md)

## Why
The poster claims "one Iconoir icon language across the buyer surface (no emoji)" — but a 2026-07-05
audit found **79 files** still rendering emojis as UI chrome (shop storefront header 🏪📍📸💬, most
settings `_sections/*`, order/offer inboxes, import clients, manage dashboard). Emojis render
inconsistently across platforms and undercut the premium-presentation work. Rule: **chrome → icon,
voice → emoji** (user content, deliberate email voice stay).

## Context
| | |
|---|---|
| **Role** | Everyone (visual); no behavior change |
| **Risk** | LOW — but `ChannelLayout`/`layout.tsx` touches are shared-surface: announce |
| **Flag** | none |
| **Timing** | Sweep AFTER in-flight OSPP/CPP sprints merge (or scope their files out of pass 1) to avoid merge noise |

## What already exists
Iconoir loaded globally in `app/layout.tsx`; the raw-color CI guard pattern (the emoji guard sits
beside it); the 79-file audit list (regenerate with the grep in the scope doc).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Icon mapping table (emoji → iconoir class, reviewed once by Daniel) + mechanical sweep of storefront + seller shell + buyer flows; aria-labels preserved | LOW |
| 1 | 1.2 CI guard: emoji-in-JSX check + voice allowlist, advisory → required post-sweep | LOW |

## Deploy order
One sprint; shared-surface files announced; visual-diff pass before merge.

## Definition of Done (epic)
- [ ] Sprint merged + Daniel's visual eyeball on storefront + one settings page
- [ ] CI guard active (required) with allowlist documented
- [ ] Poster's "no emoji" claim true; this README `status: shipped`; retro + learnings if any
