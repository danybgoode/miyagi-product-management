# PMO operational reports — Sprint 3: Delivery + smoke

**Status:** ⬜ not started

## Stories

### Story 3.1 — Weekly Telegram delivery + on-demand monthly packet
**As** Daniel, **I want** the weekly headline numbers + deck link in Telegram, and a monthly packet
on demand, **so that** reporting happens without me remembering it.
**Acceptance:** weekly run (Claude Routine or local cadence, same rail as standup/weekly-recap)
posts headline metrics + the deck link (telegram-format length guard applied);
`node scripts/pmo-report.mjs --monthly` produces the packet doc + sheet; failure pings ride the
existing failure-ping path (a green routine run ≠ success — route output where Daniel already looks,
per LEARNINGS).
**Risk:** low

### Story 3.2 — Live smoke + close-out
**As** Daniel, **I want** to verify the whole loop on my phone, **so that** the epic closes on
evidence, not narration.
**Acceptance:** the walkthrough below passes end-to-end on a real device; retro written; learnings
promoted; poster updated; board regenerated.
**Risk:** low

## Sprint QA
- **api spec(s):** delivery formatting unit spec (headline + truncation).
- **browser smoke owed:** yes, to Daniel — the phone/Telegram walkthrough below.
- **deterministic gate:** `node --test 'scripts/lib/pmo-*.test.mjs'` green.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: Telegram (your admin chat) + phone

1. Wait for (or trigger) the weekly run.
   → A Telegram message arrives: headline numbers + a deck link. Under 4096 chars, readable.
2. Tap the deck link on your phone.
   → The story-deck opens on our instance and swipes like slides.
3. Run `node scripts/pmo-report.mjs --monthly`.
   → Packet doc + metrics sheet generated; sheet opens in Excel with working formulas.
4. Forward the deck link to a second device/person.
   → It renders identically (document travels in the URL, no auth needed).

If any step fails, note the step number + what you saw — that's the bug report.
