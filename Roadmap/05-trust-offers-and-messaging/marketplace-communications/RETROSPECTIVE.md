# Marketplace communications — Retrospective

_Closed: 2026-08-14_

## What shipped

**S1 — the map (#365).** `lib/notifications/catalog.ts` declares all 61 communications: trigger,
causing actor, receiving actor, channels, domain, sender, origin. A population guard
(`e2e/communications-catalog-population.spec.ts`) **derives** the sender list from `lib/email.ts` and
fails in both directions — an unaccounted sender, or a catalog entry naming one that no longer
exists.

**S2 — the surface (#367).** `/admin/comunicaciones` renders the matrix, filterable by actor,
channel and free text through the same pure `filterCommunications` the spec asserts over.

**S3 — see it yourself (#367).** A fixture for every one of the 61, and a one-click send that calls
the REAL sender through the REAL transport. Recipient constrained to a compile-time allow-list;
samples marked `[PRUEBA]` with a banner naming the template, applied at the single transport via
`AsyncLocalStorage` so a sample can never mark a concurrent real notification.

**A notification nobody was getting.** `sendOfferWithdrawn` existed, unwired. Withdrawing an offer
marked it withdrawn, emitted an in-conversation event, and told the seller **nothing on any channel** —
so a seller not watching the thread held a dead offer open indefinitely. Now wired.

## What went well

**Deriving the population, rather than counting it, immediately earned its keep.** The guard was
written to catch future drift and instead caught the present: two senders with no call site, one of
which was a real gap. It then caught its own author twice more — flagging `sendWithResult` (the
transport, correctly excluded) and, via its sibling in the admin registry, the new nav entry.

**Splitting `send()` instead of replacing it kept the diff honest.** The decision implied changing
the return type of a function called 66 times. Building `sendWithResult` as a sibling gave the four
call sites that need the truth exactly that, and left 62 money-path notifications untouched.

**The refusals got the test coverage, not the happy path.** Twelve specs on the allow-list, including
case, whitespace and suffix-appended lookalikes, plus one asserting no fixture contains a literal
email address — so there is no path to an unintended recipient even if the allow-list were bypassed.

## What we learned

**A "dead" code path is not evidence of a duplicate feature — read the trigger before deleting.**
The epic's D3 confidently said both unwired senders duplicated communications that already fire.
Half of that was wrong: withdrawal is a first-class buyer action that notified nobody. Following the
decision would have deleted a notification sellers need, and the decision *sounded* well-reasoned.
**When a decision says "this is redundant", the cheap check is to find what supposedly covers it.**

**"Dispatched" and "delivered" are different claims, and only one of them was available.** S3 was
scoped to record a Resend id per template as proof of delivery. The senders are fire-and-forget by
contract and return no transport result — so the route reports `dispatched` and the inbox is the only
proof. Correcting the scope was better than inventing evidence, which is precisely the failure this
epic was about.

**Marking cross-cutting behaviour belongs at the single chokepoint, not in 62 call sites.** The
`[PRUEBA]` prefix is applied inside the one transport function, so a sender added next year inherits
it without knowing it exists. `AsyncLocalStorage` over a module-level flag because two concurrent
requests must not be able to mark each other's mail.

## Gaps / follow-ups

- **The inbox check is owed to Daniel** and is a human step by construction. Send one of each
  pairing — platform→buyer, platform→seller, seller→buyer, platform→admin — and confirm each renders
  properly with the `[PRUEBA]` prefix and no empty placeholders.
- **Push and Telegram are mapped, not proven** (D8). Both appear in the matrix with their triggers
  and preference defaults and keep working as they do today. Proving them to email's standard needs a
  device and a linked chat — its own epic.
- **The matrix documents capability, not delivery.** A row listing three channels means the message
  *can* travel on all three; the recipient's own preference grid decides what actually goes, and
  `telegram` is default-OFF for every group. That distinction is in the module header and worth
  keeping visible if the surface grows.
