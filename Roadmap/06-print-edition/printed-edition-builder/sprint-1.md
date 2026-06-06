# Sprint 1 — The builder foundation

**Goal:** give Miyagi a working canvas to lay out an issue from the approved paid ads, and preview it at real print size. Shipped & live.

---

### Story 1 — A layout workspace that saves itself
**As** the editor, **I want** a per-issue workspace where my approved ads appear in a tray and I can place them onto magazine pages, **so that** I can start composing without setup or fear of losing work.
**Acceptance:**
- Opening an edition shows its approved ads ready to place.
- Placing an ad on a page sticks — reload and it's still there (auto-saved).

### Story 2 — Auto-fill pages on a classic grid
**As** the editor, **I want** the magazine to use tidy classified-style grids (quarter / half / full page) and to auto-arrange all approved ads with one click, **so that** I skip manual typesetting.
**Acceptance:**
- Choose a page density (4-up or 8-up); "Auto-acomodar" fills pages from the approved ads.
- A denser page automatically uses smaller, tighter ad tiles so nothing overflows.
- I can resize any single ad (¼ → ½ → full) and the page reflows.

### Story 3 — Rearrange, merge & add editorial pages
**As** the editor, **I want** to drag ads between slots and pages, merge two small ads into a bigger feature, and drop in editorial pieces, **so that** the magazine reads like a publication, not a database dump.
**Acceptance:**
- Drag an ad from one page onto another; the layout adjusts.
- Merge two adjacent ads into a half-page "promoted" spot.
- Insert a cover page, section headers, filler, and community/social pieces.

### Story 4 — Style each ad to the retro look
**As** the editor, **I want** quick per-ad styling, **so that** I can hit the México-86 aesthetic fast.
**Acceptance:**
- Pick a background colour from a curated retro palette, a frame style, and a text size.
- Show or hide individual fields (e.g. hide the description so the photo pops).
- Changes save and appear in the print preview.

### Story 5 — Preview & print from the browser
**As** the editor, **I want** a true-to-print preview at the right paper size, **so that** I can save a PDF straight from my browser.
**Acceptance:**
- A print view renders the issue at Carta or Media Carta size with print bleed and crop marks.
- Photos are full-resolution and text is crisp.
- "Save as PDF" from the browser produces a usable file.

---
*Engineering log & decisions: `tasks/print-edition-builder.md` (US-0, US-1, US-2, US-3, US-5a).*
