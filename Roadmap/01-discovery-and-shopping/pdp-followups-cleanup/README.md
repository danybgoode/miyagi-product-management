---
status: in-progress
slug: pdp-followups-cleanup
---

# Epic — PDP follow-ups cleanup

> **Macro-section:** [01 · Discovery & Shopping](../README.md) ·
> **Risk: LOW** (frontend-only; two shared-surface touches → announce in PR; no money/auth, no backend, no migration).
> Reviewer may auto-merge on green CI per the risk-tier rule — both stories declare their shared-surface touch.
> **Status: 🚧 SCAFFOLDED — awaiting build.** Planned 2026-06-21. Scope doc:
> [`00-ideas/2. readyforscope/pdp-followups-cleanup.md`](../../00-ideas/2.%20readyforscope/pdp-followups-cleanup.md).
> Source: open follow-ups captured at [PDP-redesign Sprint 5](../pdp-redesign/sprint-5.md) close (carried from S4).

## Why
Two small correctness gaps were knowingly deferred at PDP-redesign S4/S5 close as below-threshold. They're
cheap, independent of Sprint 6, and one of them (**C**) silently degrades the autos / inmuebles / services
"Agendar" CTAs the redesign just shipped — worth closing before more per-type work lands on top. This epic
bundles the **two LOW, frontend-only quick wins**; the heavier follow-ups (events tiers, rental backend
pricing) are routed out to their own seeds.

## Context
| Question | Answer |
|---|---|
| **Who** | Buyers (and AI agents) on the PDP across listing types; sellers who typed a scheme-less scheduling link |
| **Job** | C: the "Agendar" CTA opens the seller's real calendar, never a broken relative link · B: an event that's also personalized still reads "Comprar boleto" |
| **Outcome signal** | A scheme-less `booking_url` resolves to `https://…` everywhere (PDP heroes + UCP) · an event+personalization listing shows the boleto label, non-event personalized listings byte-for-byte unchanged |
| **In v1** | C (normalize `booking_url`) · B (personalized-event buy label) — both frontend-only, both with a pure `lib/` spec seam |
| **Out (routed)** | A events aforo/tiers → quantity-only seed in domain 10 (tiers already a domain-10 backlog epic) · D rental backend line-item pricing → its own HIGH backend epic seed |
| **Risk tier** | LOW (both stories; shared-surface touches announced) |

## Medusa-first note
**No commerce tables touched, no backend, no migration.** C is a pure string helper (`ensureUrlProtocol`)
modelled on the existing `lib/supply.ts` `canonicalSourceUrl`, applied at the one PDP resolution seam **and**
the two UCP read seams so agents and the storefront agree (AGENTS rule #3). B threads two optional props into
an existing buy box. No new bilingual surface — PDP copy is es-MX (AGENTS rule #5). Clerk + Supabase untouched.

## What already exists (reuse, don't rebuild) — verified 2026-06-14
- **Protocol-normalize pattern:** `lib/supply.ts:153` `canonicalSourceUrl` — model `ensureUrlProtocol` on it (C).
- **Single `booking_url` resolution seam:** `app/l/[id]/page.tsx:173-175` — normalize once → every hero inherits;
  also the UCP reads at `api/ucp/checkout-session/route.ts:386` + `api/ucp/mcp/route.ts:844` (C).
- **Already-computed event labels:** `app/l/[id]/page.tsx:307-308` + `lib/event-hero.ts` (`buyLabel`/`signInLabel`) —
  pass straight through (B).
- **Buy box:** `app/components/PersonalizationBuyBox.tsx` (hardcodes the label at `:93`, rendered `page.tsx:404,468`) —
  add two optional props, keep the current fallback (B).

## Scope — stories by sprint
| Sprint | Story | Risk |
|---|---|---|
| **S1 · booking_url + event label** | S1.1 (C) Normalize protocol-less seller `booking_url`s via pure `ensureUrlProtocol` at the PDP resolution seam + the two UCP reads | LOW (shared surface — announce) |
| | S1.2 (B) Thread the event buy label through `PersonalizationBuyBox` (optional props + fallback) | LOW (shared surface — announce) |

## Deploy order
Frontend-only, single PR. **S1.1 first** (it's the shared surface that feeds the per-type CTAs + UCP); S1.2 is
independent. No backend deploy, no Cloud Run window, no migration.

## Epic Definition of Done
- [ ] Both stories merged to `main` + smoke-tested (anonymous; nothing owed to Daniel — no money/auth path).
- [ ] `sprint-1.md` has a fool-proof smoke walkthrough (real prod URLs).
- [ ] Epic `README.md` marked ✅; `sprint-1.md` status ticked with commit refs.
- [ ] `RETROSPECTIVE.md` written (or folded into the next retro if trivial).
- [ ] Product poster (`Roadmap/README.md`) updated — §01 line if warranted + a Recent-highlights entry.
- [ ] Team memory updated if any durable gotcha surfaced.
- [ ] `LEARNINGS.md` updated with any durable learning (e.g. the shared-seam normalize pattern).
- [ ] Feature branch deleted; PR merged.
