---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: marketplace-communications
---

# Epic: Marketplace communications — one map, and an email rail proven end to end

> **Area:** 05 · Trust, Offers & Messaging · **Risk:** medium · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/marketplace-communications.md`](../../00-ideas/seeds/marketplace-communications.md)

## Why

The platform sends 62 distinct emails plus web-push and Telegram messages between four actors —
admin, platform, seller and buyer — and nobody can say what fires when without reading a
1,966-line file. The product owner cannot answer the simplest operational question about his own
marketplace: *this action, by whom, reaches whom, on which channel?*

When this epic is done there is a single map of every communication, generated from the code so it
cannot drift, visible as a real admin surface, and the email rail is proven by actually sending —
every template rendered and delivered to a real inbox. Email becomes the bulletproof foundation the
other two channels are measured against.

## Medusa-first note

Communications are not commerce. Medusa owns the *events* (order placed, fulfillment created,
payment captured); the messages about them are platform concerns and stay in the storefront repo,
which is already where every one of them lives — the backend sends no email at all, it calls back
through `lib/ml-notify-seller.ts`. Nothing moves repos. The one Medusa-side fact this epic consumes
is `normalizeMedusaOrder`'s `buyer_clerk_user_id`, already shipped by
`buyer-notifications-money-path`.

## What already exists (reuse, don't rebuild)

- `apps/miyagisanchez/lib/email.ts` — 62 exported senders over one private `send()` helper and one
  `html()` template shell. Two languages (`es` / `en`), per-seller brand override.
- `apps/miyagisanchez/lib/notifications/dispatch.ts` — the fan-out seam: resolves a seller's
  per-channel preferences and delivers to email / push / telegram. Fire-and-forget, never throws on
  the request path.
- `apps/miyagisanchez/lib/notifications/preferences.ts` — the event-group × channel grid, with a
  second buyer namespace over the same tables and one forced-on cell.
- `apps/miyagisanchez/lib/{notify,telegram,shop-notify}.ts` — web push (VAPID) and Telegram.
- `apps/miyagisanchez/lib/admin/{guard,audit,sections}.ts` — the Clerk-gated admin shell the new
  surface registers into.

## Decisions (locked against live code, 2026-08-14)

**D1 — The matrix is a typed registry beside the senders, not a parse of them.** A script that greps
call sites is a guess that rots on the first refactor; the epic's whole point is a map that cannot
drift. Every communication is declared once in `lib/notifications/catalog.ts` — key, trigger, actor
from, actor to, channels, event group, template function — and the senders are unchanged. The
registry is the SSOT and the admin surface renders it directly.

**D2 — A guard asserts the registry covers the population, and the population is derived.** A
registry nobody updates is worse than no registry, so a `node:test` spec reads the exported sender
names out of `lib/email.ts` and fails when one is absent from the catalog — the *"guard the
population, not the door you found"* rule, applied to the thing most likely to grow. The guard also
allows the negation: a sender may be explicitly registered as `deliberately_unwired`, so the check
can never reject a correct state and train someone to bypass it.

**D3 — CORRECTED at build time. The two dead senders are not the same case, and only one is
deleted.** The decision as first written claimed both `sendCounterDeclined` and
`sendOfferWithdrawn` duplicated a communication that already fires, and should therefore both be
removed. Reading `app/api/offers/[id]/buyer-respond/route.ts` disproved it:

- **`sendOfferWithdrawn` is a real gap, and is now wired.** `withdraw` is a first-class buyer action
  (`action: 'accept-counter' | 'withdraw'`). Today it marks the offer withdrawn and emits an
  in-conversation event — and tells the seller nothing. A seller not watching the thread keeps a
  dead offer open indefinitely. The template was written for exactly this moment and had simply
  never been connected.
- **`sendCounterDeclined` has no trigger and is deleted.** The product has no "decline counter"
  action at all; a buyer who does not want the counteroffer withdraws. Sending *"El comprador
  rechazó tu contraoferta"* for a withdrawal would describe an action nobody took, so wiring it to
  the nearest available trigger would have been worse than deleting it.

The original decision would have silently removed a notification the seller needs. Recorded here
rather than quietly worked around, per the `AGENTS.md` rule that a false premise is a reason to stop
and say so.

**D4 — `send()` must report three states — shipped as a SIBLING, not a replacement.** It returned
`null` indistinguishably when `RESEND_API_KEY` is unset, when Resend throws, and when a scheduled
send is inside Resend's 16-minute window. On a rail the product owner wants bulletproof, "I could not
check", "it did not send" and "there was nothing to send" are different facts.

Built slightly differently from the decision as written: `sendWithResult` carries the discriminated
answer and `send` remains a thin adapter over it. The decision implied changing `send`'s own return
type, which would have churned 62 call sites that legitimately ignore the value — a large diff across
every money-path notification, to no behavioural end. The honest result is available where it is
needed (the sample sender) and the fire-and-forget contract is untouched everywhere else.

**D5 — The sample sender is allow-listed to three addresses, in code, and cannot be widened by a
request.** The product owner asked to see each communication first-hand. `/admin/comunicaciones`
offers "send me this one", which renders the real template with fixture data and delivers it. The
recipient is chosen from a **compile-time constant** — `champion327@gmail.com`,
`danielvp1987@gmail.com`, `daniel@despachobonsai.com` — and a caller-supplied address is rejected,
never adopted. This is an admin surface that sends real email from the platform's real domain; a
free-text recipient field on it is a spam cannon with a Clerk login in front of it.

**D6 — Sample sends are marked as samples, in the subject and the body.** Every fixture-rendered
email carries a `[PRUEBA]` subject prefix and a banner naming the template key. An operator who
finds one of these in an inbox six months from now must not mistake it for a real order
notification, and a real buyer must never receive one at all — which D5 already guarantees
structurally.

**D7 — Coverage is measured by sending, not by rendering — and the last mile is Daniel's.** A
template that compiles is not a template that arrives: Resend rejects on `from` domain
misconfiguration, on spam heuristics, and on HTML that renders fine locally and badly in a mail
client. So the sample path calls the REAL sender through the REAL transport.

**Corrected at build time:** the decision said S3 would record a Resend id per template as evidence of
"62 of 62 delivered". It cannot, and claiming it would be the exact overclaim this epic exists to
remove — the 62 senders are fire-and-forget by contract and return no transport result, so the route
honestly reports `dispatched`, not `delivered`. **The inbox is the only proof of delivery, and it is
owed to Daniel.** Every template now has a fixture and a one-click send; confirming what arrives is a
human step by construction, and the sprint doc names it as such rather than pretending otherwise.

**D8 — Push and Telegram are mapped, not overhauled.** The product owner named email as the
priority and the foundation. Both other channels appear in the matrix with their triggers and their
preference defaults, and both keep working exactly as they do today. Proving them to the same
standard needs a device and a linked chat, and that is its own epic.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 The communications catalog — typed registry of every message (D1) | LOW |
| 1 | 1.2 Population guard over `lib/email.ts` (D2) | LOW |
| 1 | 1.3 Delete the two unwired senders (D3) | LOW |
| 1 | 1.4 `send()` returns three states (D4) | MEDIUM |
| 2 | 2.1 `/admin/comunicaciones` — the matrix as a real surface | LOW |
| 2 | 2.2 Filter by actor, channel and trigger | LOW |
| 3 | 3.1 Fixture render for every registered template | LOW |
| 3 | 3.2 Allow-listed sample send, marked as a sample (D5, D6) | MEDIUM |
| 3 | 3.3 Deliver all 62 to a real inbox; record the evidence (D7) | LOW |

## Deploy order

One repo, frontend only, three merges. S1 is pure refactor and ships with no visible change; S2 adds
the surface; S3 adds the send action and then exercises it against production, because Resend's
`from` domain is only correct there.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Every registered email template has been delivered to a real inbox, with its Resend id recorded
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (run `node scripts/build-order.mjs`)
