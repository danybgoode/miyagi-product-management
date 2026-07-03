# Own-shop premium presentation — Sprint 3: Content pages + flagship dogfood

**Status:** ⬜ not started

## Stories

### Story 3.1 — Content pages: Acerca / FAQ / Políticas
**As a** seller, **I want** to author an Acerca page, an FAQ (question/answer pairs), and a Políticas page, **so that** buyers can read who I am and how I work — on my own domain, like a real store.
**Acceptance:** simple structured editor (fields, not a page builder); routes `/s/[slug]/acerca|faq|politicas` render white-label on all channels (middleware pass-through additions announced); Devoluciones content pulls from the existing returns-policy setting (merchandised, never duplicated); unauthored page → link hidden, no 404-linking; length caps + es-MX validation.
**Risk:** MED

### Story 3.2 — Config + agent parity
**As a** seller's agent, **I want** content pages in Storefront-as-Code + `patch_store_configuration`, and an about-shop exposure on UCP, **so that** an agent can answer "¿quién es esta tienda y cuáles son sus políticas?" grounded.
**Acceptance:** schema/validation/audit for the new keys; UCP shop payload carries about/policies (agents already get personalization + trust — this completes the shop story); manifest accurate.
**Risk:** LOW

### Story 3.3 — Dogfood: miyagiprints fully dressed
**As** Daniel, **I want** miyagiprints wearing everything this epic shipped (bar, hero, preset, collections, Acerca/FAQ/Políticas), **so that** the before/after pair proves the premium feel and becomes the poster/marketing artifact.
**Acceptance:** all surfaces populated with real content (ops/content task, ~no code); before/after screenshots captured for the epic close + `Roadmap/README.md` highlight.
**Risk:** LOW (ops)

## Sprint QA
- **api spec(s):** content-page config validation spec · pass-through route-list spec updated (acerca/faq/politicas) · UCP about-shop contract spec
- **browser smoke owed:** yes, to Daniel — miyagiprints full before/after walkthrough on a real device (marketplace + subdomain + custom domain)
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, author Acerca (short story of the shop), 4 FAQ pairs, and confirm Políticas shows your existing returns window.
   → Editor saves; preview links appear.
2. Open https://miyagiprints.miyagisanchez.com/acerca, `/faq`, `/politicas`.
   → All three render white-label with the S1 preset; Políticas shows the same window as the PDP trust chip (one source).
3. On the shop home, footer/nav links to the three pages appear; unauthored pages (delete FAQ to test) hide their link.
   → No dead links.
4. Ask a shopping agent (UCP): "¿cuál es la política de devoluciones de miyagiprints?"
   → Grounded answer from the UCP shop payload.
5. Full flagship pass: marketplace `/s/miyagiprints` → subdomain → custom domain, phone in hand.
   → Bar, hero, preset, collections nav, content pages — the "stepping into StickerJunkie" feel; capture before/after screenshots for the epic close.

If any step fails, note the step number + what you saw — that's the bug report.
