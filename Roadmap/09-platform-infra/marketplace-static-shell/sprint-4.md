# Static marketplace shell — Sprint 4: Personalization client islands (Phase 2)

**Status:** ⬜ Not started. Frontend (Vercel). Risk: **MED** — client islands layered onto the static homepage.
Independent once S3 is live. **Completes the epic.**

## Why
With the static shell (Phase 1) and the Cloud Run personalization endpoint (S3) in place, re-add the signed-in
"welcome back" modules as **client islands** — progressive enhancement that never blocks the instant static page.

## Stories

### Story 4.1 — Retoma rail + offer alerts + seller snapshot as client islands
**As** a signed-in visitor, **I want** my recent favorites, offer alerts, and seller snapshot back on the homepage,
**so that** the static page still recognizes me.
**Acceptance:**
- Client components mount on the static homepage, get a **Clerk JWT client-side** (`useAuth`), call the S3 Cloud
  Run endpoint, and render the three modules — reusing the existing markup from the old `app/page.tsx` signed-in
  block (retoma rail, `deriveOfferAlerts` output, seller snapshot).
- **Degrade gracefully:** while loading, or if the endpoint is slow/unreachable, the islands render nothing
  (no layout shift that blocks the static content; the page is fully usable without them).
- Signed-out visitors render the plain static shell (islands no-op without a session).
**Risk:** med (client data-fetch + auth on a static page).

### Story 4.2 — Visibility-friendly, no-regression hydration
**As** the platform, **I want** the islands cheap, **so that** they don't reintroduce the cost we removed.
**Acceptance:**
- The fetch fires once on mount (not a poll); no `currentUser()` / server function returns to the homepage path.
- A browser spec asserts the island hydrates for a signed-in fixture and is absent/empty anonymously.
**Risk:** low.

## Sprint QA
- **deterministic gate:** `tsc` + `next build` (homepage **stays static** — the islands are client-only, the
  route must not regress to a function) + Playwright `api` green.
- **browser smoke (`*.browser.spec.ts`):** signed-in fixture sees the islands hydrate; anonymous sees the plain
  static shell. Authed fixture reads `MS_TEST_*` and skips gracefully when unset.
- **browser smoke owed:** **Daniel** — a real signed-in homepage load showing the modules return, served on the
  static shell.

## Sprint 4 — Smoke walkthrough
_Written at build time — numbered steps; confirm `/` is still static in `next build`, the islands hydrate for a
signed-in session (owed-to-Daniel if no fixture), and the anonymous page is unchanged._

---

## Epic close (after this sprint)
Run the epic Definition of Done (README): poster, `RETROSPECTIVE.md`, team memory + `MEMORY.md`, `LEARNINGS.md`
(the durable rule: the app shell was dynamic for **channel routing**, not just auth — a static homepage needed a
route-group split + middleware rewrite, not just dropping `currentUser()`). Set the README frontmatter
`status: shipped` and regenerate the board.
