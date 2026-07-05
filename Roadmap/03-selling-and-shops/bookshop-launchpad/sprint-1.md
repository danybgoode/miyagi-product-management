# Bookshop launchpad — Sprint 1: Submissions in, works published

**Status:** ⬜ not started

## Stories

### Story 1.1 — Public submission portal
**As a** writer, **I want** to submit my work to a bookshop at `/s/[slug]/convocatoria` (title, synopsis, genre, manuscript file, author info) with just an email code — no account, **so that** submitting feels like Wattpad, not paperwork.
**Acceptance:** shop opt-in setting ("Recibir manuscritos") + guidelines text; upload format allowlist (PDF/EPUB/DOCX) + size cap + format sniffing + rate limits (supply-upload precedent); email-code verification (sweepstakes spine); submission terms state the copyright/takedown posture; white-label on all channels; behind `launchpad.enabled`.
**Risk:** HIGH (public upload surface)

### Story 1.2 — Review queue
**As a** bookshop, **I want** a Convocatoria queue in the seller shell (read the manuscript, approve / reject / request changes), **so that** curation is mine.
**Acceptance:** states submitted → in-review → approved/rejected/changes-requested, each transition emails the writer (es-MX, honest); manuscripts readable/downloadable by the shop only; queue lives under the Catálogo-adjacent nav (placement per seller-nav SSOT); MCP read parity for the shop's agent.
**Risk:** MED

### Story 1.3 — Publish as digital product
**As a** bookshop, **I want** one click to mint an approved submission as a **draft** digital listing (manuscript → private digital bucket, synopsis → description, genre → category), **so that** publishing takes minutes.
**Acceptance:** mint reuses the supply-pipeline Medusa write path; seller sets price/cover then activates; the work sells + delivers like any digital product; writer notified with the live URL.
**Risk:** MED

## Sprint QA
- **api spec(s):** submission validation + state machine spec (pure seam) · upload contract spec (rejects oversize/bad format) · mint payload spec
- **browser smoke owed:** yes, to Daniel — guest submit → approve → publish → **buy the digital product with a test card** (money path) on a real device; then flag flip `launchpad.enabled`
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Enable "Recibir manuscritos" in the shop settings; open https://miyagisanchez.com/s/<bookshop>/convocatoria in a private window.
   → Guidelines + submission form render.
2. Submit a PDF manuscript with a real email; enter the emailed code.
   → "Recibido" confirmation; oversized/wrong-format file is rejected with clear es-MX copy.
3. In the seller shell, open the Convocatoria queue → read → "Solicitar cambios".
   → Writer receives the change-request email.
4. Re-submit → approve → "Publicar como producto digital".
   → Draft listing minted with synopsis/genre; set price + cover → activate.
5. (money path) Buy it as a guest with a test card.
   → Digital delivery email arrives; re-download works; writer got the "ya está publicado" email with the URL.

If any step fails, note the step number + what you saw — that's the bug report.
