---
status: scaffolded
slug: marketplace-communications
area: 05-trust-offers-and-messaging
---

# Marketplace communications — one map, and an email rail proven end to end

The platform sends 62 distinct emails plus web-push and Telegram messages, across four actors:
admin, platform, seller and buyer. Nobody can currently answer "what does this action send, to
whom, on which channel" without reading `lib/email.ts` — 1,966 lines — and the dispatch seam beside
it. Two senders (`sendCounterDeclined`, `sendOfferWithdrawn`) have no call site at all, so two
communications exist in code and can never fire.

**The outcome:** a communications matrix **generated from the code** (a hand-counted number is
stale on arrival), visible to the product owner as a real surface, and an email rail validated by
actually sending — every template rendered and delivered to a real inbox, so email becomes the
bulletproof foundation the other channels are measured against.
