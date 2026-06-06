# Sprint 2 — Live content, one-click PDF & sending to print

**Goal:** let Miyagi enrich the issue with live marketplace content, get a press-ready PDF in one click, and lock a finished issue. Shipped & live.

---

### Story 6 — Pull in live listings & shops as courtesy ads
**As** the editor, **I want** to search the live marketplace and drop a listing or shop straight onto a page, **so that** I can fill the magazine with editorial/house ads beyond the paid ones.
**Acceptance:**
- A search drawer finds live listings; I pick a page and add one as a "Cortesía" ad or its shop as a spotlight.
- The ad auto-fills with the item's photo, title, price, and a working QR code that links back to the marketplace (tagged so scans are measurable).

### Story 7 — One-click print-ready PDF
**As** the editor, **I want** to download a press-ready PDF without fiddling with browser print settings, **so that** I can hand the file straight to the printer.
**Acceptance:**
- A "Descargar PDF" button produces the issue at the exact paper size, with print bleed, crop marks, full-resolution images, and scannable QR codes.
- Verified on a real issue: a clean 3-page Carta + bleed PDF, first try.

### Story 8 — Send to print (lock the issue)
**As** the editor, **I want** to lock a finished issue, **so that** it can't be changed by accident once it's at the press.
**Acceptance:**
- "Enviar a imprenta" makes the layout read-only and marks the edition "in production."
- A clear banner shows it's locked; "Reabrir" restores editing if needed.

---
*Engineering log, the isolated PDF-rendering service, and its deploy runbook: `tasks/print-edition-builder.md` (US-4, US-5b, US-6).*
