# Sprint 1 — booking_url normalize + personalized-event label

> Epic: [PDP follow-ups cleanup](README.md) · **Risk: LOW** (frontend-only; two shared-surface touches → announced
> in the PR; no money/auth, no backend, no migration). **Status: ✅ COMPLETE 2026-06-21 — squash-merged
> [#95](https://github.com/danybgoode/miyagisanchezcommerce/pull/95) `3213f6c`.** Goal: close the
> two LOW follow-ups deferred at PDP-redesign S4/S5 — a scheme-less seller `booking_url` always resolves to a real
> external calendar, and an event listing that's also personalized keeps the "Comprar boleto" label.
>
> - **S1.1** ✅ `ensureUrlProtocol` (`lib/url.ts`) at the `page.tsx` resolution seam + both UCP reads (checkout-session, mcp). Spec `e2e/ensure-url-protocol.spec.ts`. Antigravity cross-review hardened the scheme test (`/^https?:\/\//i` vs `startsWith('http')` — fixes the `httpbin.org` false positive).
> - **S1.2** ✅ `personalizationBuyLabels` + `buyNowLabel`/`signInBuyLabel` props on `PersonalizationBuyBox`; page passes the event labels only for event-led listings (non-event unchanged). Spec `e2e/personalization-buy-labels.spec.ts`.

## Stories

### S1.1 — (C) Normalize protocol-less seller `booking_url`s  *(do first — shared surface)* ✅ `3213f6c`
**As** a buyer (or an AI agent) on a listing whose seller typed `cal.com/foo` (no scheme), **I want** the
"Agendar" / "Ver disponibilidad" CTA to open the seller's real calendar, **so that** the booking action never
resolves to a broken same-origin relative URL.
- Add a pure `lib/` helper `ensureUrlProtocol(value)` modelled on `lib/supply.ts:153` `canonicalSourceUrl`
  (`raw.startsWith('http') ? raw : 'https://' + raw`; return `null` on empty/whitespace). Apply it at the
  **resolution seam** `app/l/[id]/page.tsx:173-175` so every hero consumer (`AutoHero`, `InmuebleHero`,
  `ServiceHero`, the generic schedule link, `RentalBooking` secondary link) inherits it, **and** at the two UCP
  read seams (`api/ucp/checkout-session/route.ts:386`, `api/ucp/mcp/route.ts:844`) so agents and the storefront agree.
- **Acceptance:** a seller `booking_url` of `cal.com/refacciones/visita` renders an "Agendar" CTA with
  `href="https://cal.com/refacciones/visita"`; an already-`https://` value is unchanged; an empty/whitespace value
  yields no broken link (CTA falls back to AskSeller as today); the same normalized URL appears in the UCP
  `checkout-session` / `get_listing` booking field.
- **QA:** pure-logic spec on `ensureUrlProtocol` (scheme-present / scheme-less / empty / garbage) in the `api` gate
  + anonymous browser smoke on an autos or inmuebles listing. **Risk: LOW. Shared surface (autos/inmuebles/services
  CTAs + UCP) → declare in the PR.**

### S1.2 — (B) Personalized-event buy label ✅ `3213f6c`
**As** a buyer of an event listing that **also** has personalization fields, **I want** the buy button to read
"Comprar boleto — $precio" like every other event, **so that** the CTA doesn't contradict the event framing above it.
- Add optional `buyNowLabel?` / `signInBuyLabel?` props to `PersonalizationBuyBox` (`app/components/PersonalizationBuyBox.tsx`,
  hardcoded at `:93`); pass the labels `page.tsx:307-308` already computes (`page.tsx:404`, `:468`); keep the current
  hardcoded strings as the fallback when not provided.
- **Acceptance:** an event listing with personalization fields shows "Comprar boleto — $precio" (and the matching
  signed-out label); a non-event personalized listing is byte-for-byte unchanged.
- **QA:** pure-logic spec on the label selection (event → boleto label; non-event → fallback) + browser smoke on a
  personalized-event listing. **Risk: LOW. Shared surface (`PersonalizationBuyBox`) → declare in the PR.**

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` · `next build` · Playwright `api`.
- Pure-logic specs on both `lib/` seams (`ensureUrlProtocol`; the label selection). Anonymous browser smokes per
  story. **No money/auth path — nothing owed to Daniel.** Both stories touch a shared surface → the PR body must
  declare it (booking_url consumers + UCP for S1.1; `PersonalizationBuyBox` for S1.2).

## Follow-ups (captured at sprint close)
- _(none yet)_

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com once merged (the branch's Vercel **preview** while pre-merge). The
`pdp_redesign` flag must be ON (default). All steps are anonymous — no login.

1. Open an **autos** or **inmuebles** listing whose seller's scheduling link was saved **without** `https://`
   (e.g. set Citas → scheduling link to `cal.com/<shop>/visita`), e.g. https://miyagisanchez.com/l/<auto-id>.
   → The primary "Agendar prueba de manejo" / "Agendar visita" button links to `https://cal.com/<shop>/visita`
   (opens the real calendar in a new tab) — **not** a `miyagisanchez.com/l/...cal.com...` relative link.
2. Open the same listing's UCP read, e.g. the `get_listing` MCP call or
   https://miyagisanchez.com/api/ucp/catalog (find the listing).
   → Its booking field is the fully-qualified `https://cal.com/...` URL.
3. Open an **event** listing that **also** has personalization fields, e.g. https://miyagisanchez.com/l/<event-personalized-id>.
   → The buy button reads **"Comprar boleto — $precio"** (signed-out: the matching boleto sign-in label), not
   "Comprar ahora".
4. Open a **non-event** personalized listing.
   → The buy button still reads **"Comprar ahora — $precio"** (unchanged — the fallback).

If any step fails, note the step number + what you saw — that's the bug report.
