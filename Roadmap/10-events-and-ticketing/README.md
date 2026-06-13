# 10 · Events & Ticketing

**For sellers who run events and the people who attend them.** Sell admission to an event, let people
register for a free one, and check everyone in at the door with a unique scannable ticket — all on the
same commerce + public-page rails the marketplace already runs.

The domain has one spine and two front doors: a **per-attendee ticket primitive** (a unique token, a QR
that encodes *that token*, and a one-time door check-in) feeds off both a **paid checkout** (admission
sold as a listing) and a **free RSVP page** (register without buying). Selling admission is already
largely servable today; the new capability is the *ticket* — a credential that's unique per attendee and
can be validated once at the door.

## Current features
- ✅ **Paid event admission** — sell admission as a listing with event date/venue/aforo; buyers re-download their ticket/confirmation.
- ✅ **Free RSVP page** (`/e/[slug]`) — register for a free event with email-code verification, no marketplace account.
- ✅ **Per-attendee scannable ticket + door check-in** — a unique token + QR, redeemed once at the door, with an attendance roster. *(Shipped 2026-06-08; authed door-scan live smoke owed to Daniel.)*

What's **already servable today without this domain** (positioning, not a feature here): a seller can
sell event admission as a `service` or `digital` listing through the real checkout, cap seats with
inventory (aforo), and — for appointment-style events — attach Cal.com scheduling. The epic below turns
that from "a listing that happens to be an event" into first-class event + ticketing support.

## Epics
- **[Events & Ticketing](events-and-ticketing/)** — ✅ *Shipped 2026-06-08 (all 3 sprints)* — paid admission
  made real (event attrs + buyer re-download, PR #48) · a free RSVP surface (`/e/[slug]`, PR #49) · the shared
  attendee-ticket primitive + door check-in + roster (PR #52). Authed door-scan live smoke owed to Daniel.
  Scope/decision: [`../00-ideas/seeds/spike-ticket-event-management.md`](../00-ideas/seeds/spike-ticket-event-management.md).

## Backlog / ideas (deferred from the #7 spike)
- 📋 Multi-tier / multi-session tickets (Medusa variants + a multi-variant purchase UI)
- 📋 Assigned / reserved seating
- 📋 Ticket resale / transfer
- 📋 Auto-offer a marketplace event into the print-social events section (06)
