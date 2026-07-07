# Bookshop launchpad — Sprint 1: Submissions in, works published

**Status:** ✅ merged to `main` 2026-07-07 — squash `b6eca090` (PR #184). Owed: Daniel's money smoke + `launchpad.enabled` flip.
- Story 1.1 ✅ (public portal + upload + email-code verify + opt-in + terms, behind `launchpad.enabled`)
- Story 1.2 ✅ (review queue + transitions + writer emails + MCP read parity)
- Story 1.3 ✅ (publish approved → draft digital product; live-URL email on activation)
- Cross-review (Codex) done — 3 findings fixed pre-merge; merged conflict-free after OSPP S3 landed.

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
Env: production · https://miyagisanchez.com   (or the branch preview URL while testing pre-merge)
**Precondition (owed to Daniel):** flip `launchpad.enabled` **ON** in `/admin/flags` first — the whole
surface 404s/423s while it's OFF (fail-safe). Flip it back OFF after the smoke until launch, if desired.

1. As the seller: open **Configuración → Convocatoria de manuscritos** (the card appears once the flag is
   ON), toggle **"Recibir manuscritos"** ON, optionally add guidelines, **Guardar**.
   → The page also links "Ver mi página de convocatoria".
2. In a private window open `https://miyagisanchez.com/s/<bookshop>/convocatoria`.
   → Guidelines + submission form render (título, nombre, género, sinopsis, archivo, correo, código, términos).
3. Fill the form, attach a **PDF**, click **"Enviar código"**, enter the emailed 6-char code, accept the
   terms, click **"Enviar manuscrito"**.
   → "¡Recibido!" confirmation. Retry with a `.zip`/renamed file → rejected with clear es-MX copy; a file
     over 40 MB → rejected before upload.
4. Back in the seller shell → **Convocatoria** → the new submission appears under "Manuscritos recibidos".
   Click the **PDF download** chip (opens a signed URL), then **"Pedir cambios"** and type a note.
   → The writer receives the change-request email with your note.
5. Re-submit from the public page → **"Empezar revisión"** → **"Aprobar"** → **"Publicar como producto
   digital"**.
   → A **draft** digital listing is minted (synopsis → description, genre → category); you're taken to
     Anuncios. Set price + cover and **activate** it.
   → On activation the writer gets the **"ya está publicado"** email with the live `/l/<id>` URL.
6. **(money path — owed to Daniel)** As a guest, buy the listing with a **test card**.
   → Order completes; the digital-delivery email arrives with the manuscript; re-download works.

If any step fails, note the step number + what you saw — that's the bug report.
