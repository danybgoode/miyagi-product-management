# Epic — Configurable & Personalized Products

*Vende productos personalizados sin idas y vueltas.*

**For sellers who make custom things** — engraved gifts, custom prints, anything where the buyer
tells you what they want. The seller adds custom input fields to a listing (a name to engrave, a
gift message, a size choice); the buyer fills them in on the product page; and that exact text rides
the order all the way to the seller's order screen and the confirmation emails — so fulfillment
never has to chase the buyer to ask "what did you want it to say?"

Status: ✅ shipped · 🚧 in progress · 📋 planned. **✅ EPIC COMPLETE — all 3 sprints shipped to prod 2026-06-05.**

## Why
The industry standard for custom products is full of friction: clunky fields, generic errors, and
"cart anxiety" — the buyer can't tell if their custom text actually saved. The guiding heuristics:
- **Radical transparency** — the buyer's input echoes back at every stage (cart, checkout,
  confirmation email). Ambiguity kills conversion.
- **Frictionless validation** — real-time character counters, clear optional/required labels; never
  punish with abrupt red boxes.
- **Data integrity across the stack** — the payload travels cleanly from the buy box → cart →
  order → seller dashboard, treated as a first-class line-item attribute, not a buried "note".

## Scope (v1, confirmed)
- Field types: **Short Text, Long Text, Select/dropdown** (text only). *File upload deferred.*
- **No price impact** — personalization captures data; it never changes the price. *(Priced add-ons
  = later epic.)*
- **Edit-in-cart deferred** — to change personalization in v1, remove + re-add the item.

## Sprints
- ✅ **[Sprint 1 — Merchant configuration](sprint-1.md)** — the seller attaches custom fields to a
  listing and they persist. *(Shipped — PR #16.)*
- ✅ **[Sprint 2 — Buyer capture + cart/checkout parity](sprint-2.md)** — the buyer fills the fields
  in the buy box; the text echoes through the cart and checkout and lands on the order.
  *(Shipped — PR #18.)*
- ✅ **[Sprint 3 — Fulfillment, emails & agents](sprint-3.md)** — the seller sees the personalization
  on the order; it's in the confirmation emails; agents can read the fields and send them.
  *(Shipped — backend PR #4 + frontend PR #19.)*

## Stretch / future
File-upload field type · priced add-on options · inline edit-from-cart · configuring fields in the
new-listing wizard (v1 configures via the listing edit screen).

## Definition of done (epic)
All three sprints merged + smoke-tested; this README ✅ and every sprint ticked with commit refs;
`RETROSPECTIVE.md` written; product poster `Roadmap/README.md` updated; team memory + index updated;
branches deleted.
