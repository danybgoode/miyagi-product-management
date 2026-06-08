# Sprint 2 — Free RSVP surface

> Epic: [Events & Ticketing](README.md) · **Risk: LOW** (Supabase non-commerce; no money path).
> **Status: 📋 PLANNED — not started.** Goal: a seller can run a **free** event with a public RSVP page,
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
- **Owed to Daniel:** none required — the public RSVP path is anonymous-testable end to end (email-code
  verify can be exercised with a test inbox / the same harness sweepstakes uses).

## Sprint 2 — Smoke walkthrough (fill in with real URLs at ship)
```
Env: PR Vercel preview (pre-merge) → production https://miyagisanchez.com after merge.

1. As a seller, go to https://miyagisanchez.com/shop/manage/eventos and create a free event with a date
   and venue.  → You get a public link https://miyagisanchez.com/e/<slug> and a QR.
2. Open https://miyagisanchez.com/e/<slug> in a private window.
   → The page shows the event title, date, venue, and a "Registrarme" CTA — no platform login required.
3. Enter an email → enter the code sent to it.
   → You're registered; a success state shows and a confirmation email arrives.
4. Register again with the same email.
   → No duplicate; the page shows you're already registered.
5. (if capacity set) Fill the event to capacity, then try once more.
   → Registration is closed / full.

If any step fails, note the step number + what you saw.
```
