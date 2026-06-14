---
status: shipped
slug: printed-edition-builder
---

# Epic · Printed-Edition Builder ("Maqueta")

**Status:** ✅ Shipped & live — 2026-06-03 · Delivered across 2 sprints (7 user stories)

## The problem
Once advertisers had paid and submitted their ad ingredients, **Miyagi still had to lay out the whole magazine by hand** in design software. That manual typesetting was the bottleneck between selling ads and printing an issue.

## The solution
A visual **layout builder** ("Maqueta") inside the admin, where Miyagi composes the magazine page by page on a canvas — then exports a **print-ready PDF** in one click, ready for the local press.

## Who it's for
**Miyagi, as the magazine's editor.** (Advertisers and the community feed *into* it via the existing ad builder and social submissions.)

## What it does
- **Drag-and-drop canvas** with classic classified-style grids — quarter, half, and full-page blocks — at true paper proportions.
- **Auto-pack** all approved paid ads into pages with one click; switch between a 4-up or 8-up density.
- **Pull in live marketplace listings or shops** as courtesy/house ads, with an auto-generated QR.
- **Editorial pages** — covers, section headers, filler, and the community/social section.
- **Retro styling controls** — México-86 colour palette, frame styles, text size, and show/hide fields per ad.
- **Print-ready output** — exact paper size (Carta / Media Carta), print bleed, crop marks, scannable QR codes, and crisp text — both an in-browser print view and a one-click downloadable PDF.
- **Send to print** — lock the finished issue (it goes read-only) and mark the edition "in production."

## Outcome
The first real issue was laid out and exported in one pass — **a clean, press-ready PDF on the first try.** The manual design bottleneck is gone.

## Sprints
- **[Sprint 1](sprint-1.md)** — the builder foundation: canvas, grid, auto-pack, styling, and the in-browser print view.
- **[Sprint 2](sprint-2.md)** — pulling in live listings, the one-click downloadable PDF, and the production lock.
- **[Retrospective](RETROSPECTIVE.md)** — what we learned.

> Engineering detail, decisions, and runbooks for this epic live in `tasks/print-edition-builder.md`.
