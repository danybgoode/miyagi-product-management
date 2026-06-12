# Raw idea — Digital edition of "Mexico 26" at /mx26

> For grooming. Planning only. Assume nothing — verify every anchor below against the real
> code/docs; treat them as leads, not facts.

## Surfacing copy (from print / flyers)
> **LEE LA EDICIÓN DIGITAL — LA REVISTA COMPLETA** → `miyagisanchez.com/mx26`

## Desired end state (observable behavior)
A public, **mobile-first** page at `miyagisanchez.com/mx26` where anyone — especially someone
who just scanned a QR on a flyer or the printed edition — can read the **full "Mexico 26"
magazine online**. It is the online counterpart of the printed edition.
1. The whole magazine is readable online (editorial + the hidden-gems guide + featured pieces).
2. Every gem entry/section links to that gem's `/s/[slug]` shop, and carries attribution
   parity with print (UTM per section/entry; works as a QR destination).
3. es-MX by default; loads fast on a phone over mobile data.
4. There's a single source of truth so the digital edition doesn't drift from the print one.

## Anchors found (verify — "can we already do this?")
- The **print** magazine builder shipped: the "Maqueta" drag-and-drop canvas →
  print-ready PDF, under `Roadmap/06-print-edition/printed-edition-builder/`. Does it already
  produce structured content/JSON the digital edition could render? Is the PDF reusable?
- Recurring pattern in this repo: content exists for print but **nothing renders it online**
  (see `Roadmap/01-discovery-and-shopping/neighborhood-pulse` — same "missing online surface" gap).

## Open questions for grooming
- Render the **same content the Maqueta builder produces** (reuse its data) vs. a separate web
  layout? What's the single source of truth?
- One long-form scroll vs. a paginated reader vs. embedding the exported PDF? (mobile-first)
- Pull **live** gem shops/listings in, or a frozen snapshot per issue?
- Measurement: per-section UTM/QR, Clarity — tie into the campaign's attribution plan
  (`seeds/agent-native-gtm/ask-claude-campaign-brief.md` §11).

## Constraints
es-MX default · mobile-first · attribution parity with print · don't rebuild commerce
(Medusa owns it; gem shops already render at `/s/[slug]`).
