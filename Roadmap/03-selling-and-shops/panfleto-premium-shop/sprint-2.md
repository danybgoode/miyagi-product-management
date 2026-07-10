# Panfleto — the first premium shop — Sprint 2: Rename + dress-up miyagiprints → panfleto

**Status:** ⬜ not started · **Blocked by Sprint 1** (placements must be rehomed first)

## Stories

### Story 2.1 — Rename with 301 + subdomain
**As** the shop owner, **I want** the miyagiprints shop renamed to `panfleto` with the old slug
aliased and the subdomain granted, **so that** every existing link keeps working while the new
identity takes over.
**Acceptance:** `/s/panfleto` is the shop; `/s/miyagiprints` (and its listing URLs) 301 to the new
slug (shipped custom-slugs alias); `panfleto.miyagisanchez.com` renders the shop white-label via an
admin subdomain grant; the `mschz.org/panfleto` flat short link resolves.
**Risk:** low

### Story 2.2 — Full brand dress-up
**As a** visitor, **I want** panfleto to read as an editorial publishing house, **so that** the first
premium shop demonstrates what the tier means.
**Acceptance:** name/logo/announcement bar/hero set; a theme preset applied (S4 may swap in the new
editorial preset later); collections created (Historias · Convocatorias · Stickers — existing sticker
catalog curated into its collection, nothing deleted); Acerca/FAQ/Políticas written. All via
Storefront-as-Code / MCP config (dogfood the agent path). Copy meets the epic's content bar and is
drafted in this sprint doc for Daniel's read before shipping.
**Risk:** low

## Sprint QA
- **api spec(s):** 301 alias + subdomain render → extend `own-shop-seo` / subdomain specs.
- **browser smoke owed:** yes, to Daniel — visual before/after eyeball on phone + desktop.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com

1. Open https://miyagisanchez.com/s/miyagiprints
   → 301 to https://miyagisanchez.com/s/panfleto.
2. Open https://panfleto.miyagisanchez.com in a private window.
   → White-label shop, new brand, no platform chrome.
3. Open https://mschz.org/panfleto
   → 301 to the canonical shop URL.
4. Tap through Historias / Convocatorias / Stickers collections + Acerca.
   → Curated content, es-MX copy, stickers intact under their collection.

If any step fails, note the step number + what you saw — that's the bug report.
