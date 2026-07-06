# Rental line-item pricing — Sprint 3: agent parity (UCP/MCP)

**Status:** ⬜ not started

> Frontend/API sprint (`apps/miyagisanchez` — the UCP layer). Requires Sprints 1–2. AGENTS rule #3:
> agents are first-class — web and agent must quote and charge the same number.

## Stories

### Story 3.1 — `checkout-session` quotes + links the computed rental total
**As an** AI shopping agent, **I want** `POST /api/ucp/checkout-session` (and MCP
`get_checkout_options`) to accept `check_in`/`check_out` for a rental listing and return the exact
computed breakdown with checkout URLs that charge it, **so that** an agent books a rental
end-to-end and never quotes the per-period rate as the full price.
**Acceptance:**
- With dates: response gains `rental_quote: { check_in, check_out, nights, units, rate_period,
  rate_cents, rent_cents, deposit_cents, total_cents, formatted }` computed by the **same seam**
  (`lib/rental-pricing.ts`); `price`/`line_total` reflect the quoted total; instant-method
  `checkout_url`s carry the dates so the eventual charge is the server-recomputed total; manual
  instructions state it.
- Without dates: today's behavior, with the rate + deposit clearly labeled per-period (never
  presented as the full price) + a hint that dates yield an exact bookable quote.
- Invalid range / non-rental / flag OFF: a structured, agent-legible error (or the coordinate-note
  fallback), never a wrong quote.
- MCP `get_checkout_options` parity; UCP manifest/docs mention the new params.
**Risk:** LOW (quoting is read-only; the charge stays on the Sprint-1 server-recomputed rail)
**QA:** api spec on the quote math + flag states + date-less fallback; MCP tool round-trip smoke
(agent-owned); embed/other UCP consumers regression (existing specs stay green).

## Sprint QA
- **api specs:** quote math (mirrors the pure-seam cases) · flag states · date-less fallback · non-rental unchanged — Playwright `api` project in CI.
- **deterministic gate:** `tsc --noEmit` + `next build` + Playwright `api` green before merge.
- **smoke:** agent-owned MCP round-trip against prod post-merge; no Daniel money step in this sprint (charging was smoked in Sprint 2).

## Sprint 3 — Smoke walkthrough (do these in order)
*(placeholder — written by the building agent before the sprint is called done. Must include: MCP
`get_checkout_options` with dates on the test rental listing returns the same total the web
checkout showed; the returned checkout URL opens a checkout charging that total; a date-less call
labels the rate per-period.)*

If any step fails, note the step number + what you saw — that's the bug report.
