# Sprint 2 — Free RSVP surface

> Epic: [Events & Ticketing](README.md) · **Risk: LOW** (Supabase non-commerce; no money path).
> **Status: 🚧 BUILT LOCALLY — migration applied, app PR pending.** Goal: a seller can run a **free** event with a public RSVP page,
> and anyone can register with just email-code verification (no marketplace account). Independent of
> Sprint 1. This forks the sweepstakes **pattern**, not its data model — the unique scannable ticket +
> door check-in come in Sprint 3.

## Stories

### S2.1 — Seller creates a free event + RSVP page
**As** a seller, **I want** to create a free event with a public RSVP page, **so that** people can
register without buying anything.
- New seller surface (Mi tienda → **Eventos**) to create a free event: title, date/time, venue,
  description, optional capacity. Persist to **Supabase** — new `marketplace_events` +
  `marketplace_event_registrations` tables (non-commerce, AGENTS #2). **Do NOT reuse the sweepstakes
  entry table** (raffle/legal-shaped). Public page at **`/e/[slug]`**, scaffolded from `app/g/[slug]`.
- **Acceptance:** a seller creates a free event and gets a public `/e/[slug]` URL (+ a QR to it, reusing
  the QR lib); the page renders title/date/venue/description and a register CTA. es-MX.
- **QA:** api spec on event create/read + public page resolution. **Risk: LOW** (Supabase, non-commerce).

### S2.2 — Attendee registers with email-code verification
**As** an attendee, **I want** to register for a free event with just an email code (no account), **so
that** signing up is frictionless.
- Reuse the `lib/sweepstakes.ts` email-code **send/verify** flow; on verify, write a row to
  `marketplace_event_registrations` (capacity-aware if the seller set one) and send a confirmation email.
- **Acceptance:** a visitor enters email → gets a code → verifies → is registered and sees a success
  state + confirmation email; a second registration with the same email is idempotent; if capacity is set
  and reached, registration closes. No marketplace account is created.
- **QA:** api spec on register + verify + capacity/idempotency; anonymous `*.browser.spec.ts` of the
  public page render + the verify step entry. **Risk: LOW.**

## Sprint QA — plan
- **Deterministic gate (green before merge):** `tsc --noEmit` · `next build` · Playwright `api`.
- **New specs:** event create/read api spec; register+verify api spec (capacity + idempotency); an
  anonymous browser spec of `/e/[slug]`.
- **Deploy order:** **Supabase migration first** (the tables) per LEARNINGS async-deploy, then the app.
  `20260608120000_marketplace_events.sql` was pushed to the linked Supabase project on 2026-06-08
  before app verification.
- **Owed to Daniel:** none required — the public RSVP path is anonymous-testable end to end (email-code
  verify can be exercised with a test inbox / the same harness sweepstakes uses).

## Sprint 2 — Smoke walkthrough
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.
Automated local fixture: set EVENTS_TICKETING_SMOKE_SECRET and run the event API/browser specs against
PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port>. The internal fixture creates disposable rows and deletes
them after the smoke.

1. Open https://<preview-or-production-host>/shop/manage/eventos as a seller.
   → The Eventos page loads from Mi tienda and shows the free-event form.
2. Create a free event with title, date/time, venue, description, and optional capacity.
   → The event appears in the list with registration count, public link, and QR download.
3. Open https://<preview-or-production-host>/e/<slug> in a private/anonymous browser.
   → The page shows the event title, date, venue, description, and registration form without login.
4. Enter name + email, request the code, then enter the code from the email.
   → The page shows a confirmed-registration state and the confirmation email arrives.
5. Register again with the same email.
   → No duplicate row is created; the flow returns the already-registered state.
6. For an event with capacity set, fill the final spot and try a different email.
   → Registration closes with the full/capacity message.

If any step fails, note the step number + what you saw.
```

## Verification Notes
- `npx tsc --noEmit` passed.
- `npm run build` passed after using the app checkout's ignored `node_modules` symlink in the isolated
  worktree.
- Focused touched-file lint passed with no errors; full `npm run lint` remains blocked by pre-existing
  repo-wide baseline errors outside this sprint.
- `EVENTS_TICKETING_SMOKE_SECRET=local-events-smoke PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 npm run
  test:e2e -- e2e/events-create-read.spec.ts e2e/events-registration.spec.ts` passed all 4 tests against
  real Supabase rows.
- `EVENTS_TICKETING_SMOKE_SECRET=local-events-smoke PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 npm run
  test:e2e:browser -- e2e/event-rsvp.browser.spec.ts` passed anonymously against a disposable `/e/<slug>`.
- Full local API suite reached 232 passed / 3 skipped, but 6 unrelated embed/own-shop specs timed out on
  local homepage/catalog/Clerk-handshake routes; the new event specs were green in that run.
