# PMO operational reports — Sprint 3: Delivery + smoke

**Status:** 🚧 built + Telegram-posted; Daniel phone smoke pending on draft PR

## Stories

### Story 3.1 — Weekly Telegram delivery + on-demand monthly packet ✅
**As** Daniel, **I want** the weekly headline numbers + deck link in Telegram, and a monthly packet
on demand, **so that** reporting happens without me remembering it.
**Acceptance:** weekly run (Claude Routine or local cadence, same rail as standup/weekly-recap)
posts headline metrics + the deck link (telegram-format length guard applied);
`node scripts/pmo-report.mjs --monthly` produces the packet doc + sheet; failure pings ride the
existing failure-ping path (a green routine run ≠ success — route output where Daniel already looks,
per LEARNINGS).
**Built:** `scripts/lib/pmo-delivery.mjs` (Telegram headline formatter, chat-id loader, sendMessage
wrapper), `pmo-report --weekly` Telegram delivery, `--monthly` => packet + sheet, PMO routine prompt
and skill/runbook entries.
**Risk:** low

### Story 3.2 — Live smoke + close-out 🚧
**As** Daniel, **I want** to verify the whole loop on my phone, **so that** the epic closes on
evidence, not narration.
**Acceptance:** the walkthrough below passes end-to-end on a real device; retro written; learnings
promoted; poster updated; board regenerated.
**Built so far:** live weekly Telegram post sent; exact monthly packet command generated packet + sheet;
deterministic gate green. Phone tap/open/forward and Excel-open confirmation remain Daniel-owned on the
draft PR.
**Risk:** low

## Sprint QA
- **api spec(s):** delivery formatting unit spec (headline + truncation), monthly packet+sheet contract,
  stateless on-demand artifact guard.
- **browser smoke owed:** yes, to Daniel — the phone/Telegram walkthrough below.
- **deterministic gate:** `node --test 'scripts/lib/pmo-*.test.mjs'` green.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: Telegram (your admin chat) + phone

1. Wait for (or trigger) the weekly run.
   → A Telegram message arrives: headline numbers + a deck link. Under 4096 chars, readable.
2. Tap the deck link on your phone.
   → The story-deck opens on our instance and swipes like slides.
3. Run `node scripts/pmo-report.mjs --monthly`.
   → Packet doc + a separate `SmallDocs sheet:` link are generated. Open the sheet link (not the weekly
   deck link) and export/open that sheet in Excel; formulas stay live.
4. Forward the deck link to a second device/person.
   → It renders identically (document travels in the URL, no auth needed).

If any step fails, note the step number + what you saw — that's the bug report.

## Sprint 3 — Smoke walkthrough results

Run date: 2026-07-14 · Branch: `feat/pmo-operational-reports-s3` · Risk: LOW

1. ✅ Weekly run triggered with `node scripts/pmo-report.mjs --weekly` using the existing GCP Secret
   Manager values (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID_APP` mapped to `TELEGRAM_CHAT_ID`, values
   not printed). The script posted successfully: `Telegram weekly PMO report sent.` The message included
   headline PMO numbers and a `SmallDocs weekly` story-deck link.
2. ⏳ Phone tap/open is owed to Daniel. Automated side confirmed the SmallDocs host returns `HTTP/2 200`
   from `https://pmo-smalldocs-oehqqtyoia-uk.a.run.app`.
3. ✅ Exact command `node scripts/pmo-report.mjs --monthly` generated both `SmallDocs monthly` and
   `SmallDocs sheet` links. The Excel check uses the separate `SmallDocs sheet:` URL printed by the
   command, not the weekly Telegram story-deck URL. The script printed `On-demand artifact run: window log
   not updated`, so the manual monthly packet does not disturb the weekly delivery window. Excel
   formula-open confirmation is still owed to Daniel because it requires the interactive export/open flow.
4. ⏳ Forward-to-second-device/person is owed to Daniel after opening the Telegram deck link on phone.

Deterministic gate:
- ✅ `node --test 'scripts/lib/pmo-*.test.mjs'` passed 39/39 tests.
- ✅ `node --test scripts/routines.test.mjs` passed 7/7 tests for the new routine prompt guard.

Red checks observed:
- Delivery formatter tests failed when `Story-deck` was intentionally changed to `Deck`.
- Monthly packet tests failed when `--monthly` no longer implied `--sheet`.
- Window-persistence test failed when on-demand monthly/sheet runs were intentionally made stateful.
