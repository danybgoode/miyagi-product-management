# Sprint 3 — Automated Draw & Notifications

Goal: campaigns close automatically, draw one winning ticket fairly, and let the
tenant follow up with winners and non-winners.

Status: 🚧 implemented on branch (`652d2bf`, `d477356`, `e07349b`, frontend `bb02f93`, backend `50e3af8`), preview/manual QA pending.

Risk tier: **Medium** — cron, notifications, and seller dashboard actions. If a
change alters checkout or coupon redemption behavior, treat that PR as High.

---

## US-1 — Idempotent automated draw ✅
**As the** system, **I want** to freeze entries and draw one winning ticket after
the campaign ends, **so that** tenants cannot bias the result.
- [x] One-minute Medusa scheduled job on GCP Cloud Run checks ended campaigns and draws once.
- [x] Public entry rejects late submissions based on `ends_at`, even before cron runs.
- [x] Draw stores winning ticket, masked contact, ticket count, pool hash, random
      nonce/value, algorithm version, and timestamp.
- [x] Platform kill-switch blocks draw execution.

## US-2 — Winner dashboard and email ✅
**As a** tenant, **I want** to see the winner and notify them automatically,
**so that** prize fulfillment can begin without exposing full participant data.
- [x] Tenant dashboard shows masked winner contact and draw audit.
- [x] Winner email is sent in the entrant's selected locale.
- [x] Full contact stays in the protected entry table; public/dashboard views mask it.

## US-3 — Consolation broadcast ✅
**As a** tenant, **I want** to message non-winners with an optional discount code,
**so that** the captured audience can still convert.
- [x] One-click broadcast excludes the winner and sends only once per campaign/message.
- [x] Optional seller coupon code can be attached.
- [x] Platform kill-switch blocks broadcast.

## QA / smoke
- [x] API spec confirms cron auth is required.
- [x] Secret-gated smoke confirms double-fired draw creates exactly one winner/audit row.
- [x] Secret-gated smoke confirms kill-switch blocks draw and broadcast.
- [ ] Manual preview smoke: force campaign end, run cron, verify winner dashboard/email,
      send consolation to a test non-winner.
