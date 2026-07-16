---
status: shipped
slug: emoji-to-iconoir-sweep
---

# Epic: Emoji → Iconoir sweep — one icon language, finally

> **Area:** 09 · Platform & Infra · **Risk:** Low · **Class:** Chore

Visual-only; shared-surface files announced. Scope doc: [`00-ideas/2. readyforscope/emoji-to-iconoir-sweep.md`](../../00-ideas/2.%20readyforscope/emoji-to-iconoir-sweep.md)

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
- [x] Sprint merged + Daniel's visual eyeball on storefront + one settings page — merged (frontend [#235](https://github.com/danybgoode/miyagisanchezcommerce/pull/235)), gate green throughout; Daniel's eyeball done 2026-07-15 ("looking good all around")
- [x] CI guard active with allowlist documented — `lib/emoji-guard.ts` + `e2e/emoji-guard.spec.ts`, joins the required `api` gate
- [x] Poster's "no emoji" claim true (for genuine UI chrome); this README `status: shipped`; retro + learnings promoted — see `RETROSPECTIVE.md`. 10 of the 79 swept files still carry emoji the mechanical pass couldn't convert (plain-string data fields with no separate icon slot, or code comments) — documented in `lib/emoji-guard.ts`'s comments as an explicit, scoped-out pass-2 candidate, not a broken promise.

## Fast follows (found + fixed after merge, same epic)
Daniel's visual pass caught unrelated **pre-existing broken Iconoir class names** (a class that doesn't exist in the loaded `iconoir@main` CDN bundle silently renders no icon — no error, nothing catches it short of a class-by-class diff against the real bundle). Four rounds, same verification method each time, all merged:
- [#239](https://github.com/danybgoode/miyagisanchezcommerce/pull/239) — `iconoir-newspaper`/`iconoir-cancel` (the original 2 flagged in the sweep PR) + 2 more found doing the same diff (`iconoir-bag-plus`, `iconoir-lightning-bolt`)
- [#240](https://github.com/danybgoode/miyagisanchezcommerce/pull/240) — seller-nav "Anuncios", admin-nav "Contenido"/"Flags" + a British-spelling typo (`iconoir-colour-filter`) found broadening the check to `.ts` files
- [#260](https://github.com/danybgoode/miyagisanchezcommerce/pull/260) — 5 broken classes in `locales/{es,en}.json` (the `/vende` marketing pages' bilingual copy dictionary — outside `app/`+`lib/`+`components/`, missed until the check was broadened to `.json`)

**11 broken Iconoir classes found and fixed total**, none originally caused by this sweep — all pre-existing, silent, undetectable short of this exact verification method. See `RETROSPECTIVE.md` for the durable lesson.
