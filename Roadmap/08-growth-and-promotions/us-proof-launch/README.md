---
status: archived   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived.
slug: us-proof-launch
---

# Epic: US owned-shop positioning and proof launch

> **Area:** 08 · Growth & Promotions · **Risk:** low · **Class:** Feature · **Archetype:** Grower · **Appetite:** S · **Scope seed:** [`00-ideas/seeds/us-proof-launch.md`](../../00-ideas/seeds/us-proof-launch.md)

> **⚠️ ARCHIVED 2026-08-10 — superseded by [`07-agentic-and-federated-commerce/us-marketplace`](../../07-agentic-and-federated-commerce/us-marketplace/README.md).**
>
> This epic was a rung on the `#US-2` → `#US-5` validation ladder: prove something, publish the proof,
> then earn the right to build the real thing. The product owner ended that sequence — the platform is
> pre-launch with a single user, so there is nothing to validate against and no audience for a proof.
> `/us` is now built once, as the finished marketplace. Nothing here is scheduled. Kept as history:
> its reuse map and its provider/legal research remain accurate and are cited by the replacement epic.

## Why

Turn a passed three-shop US operator pilot into one honest, proof-led launch that helps the next qualified
operator apply with three real shops. The launch must show what Miyagi observed, what remained partner-led or
external, and what it did not prove. It does not imply an open US marketplace, proven self-service scale,
universal platform parity or a typical result from one cohort.

## Entry gate — execution is blocked

The epic may be scaffolded, but no build, publication or outbound launch starts until:

1. `miyagi-partners-recruiting-v3` (`#US-2`) is shipped, enabled for the founding-operator track and its
   three-shop application/review path has passed Daniel's smoke.
2. `us-operator-commerce-pilot` (`#US-3`) is shipped with a **continue** or explicitly accepted **reshape**
   decision. A **stop** decision archives or re-grooms this epic rather than producing a softer claim.
3. Its evidence includes one real USD order through payment, tax, label, tracking, delivery, reconciliation
   and currency-safe economics. Test-mode or readiness evidence alone does not satisfy the gate.
4. Three post-baseline qualified conversations, including one operator outside the pilot, confirm or reshape
   the persona, job and promise.
5. Operator and merchant publication permissions are separately recorded as attributed, anonymized or not
   publishable.
6. Daniel approves the public matrix, denominator, disclosure, support promise, operating limits and every
   attributed name, logo or quote.

Unavailable evidence is recorded as unavailable and blocks the affected claim. It is never rendered as
absence, zero or a pass.

## Decisions locked at scope approval

1. Appetite is **S**: one proof/publication sprint and one bounded organic launch/decision sprint.
2. `/us` remains the only public surface and the shipped `#US-2` three-shop application remains the only
   application. No route, form, CRM, identity, consent, grant, admin queue, CMS or launch flag is added.
3. Public proof is versioned and permission-safe. Every claim carries its observation boundary, support mode,
   limitation and reviewer; partner-led evidence never becomes a self-service claim.
4. The no-platform-fee founding proof is disclosed as a material connection. One cohort is not presented as
   typical, average or proof of scale.
5. The first distribution wave is founder-led and organic: 12–15 selected contacts, at most two follow-ups
   and at most two permissioned community/partner placements. The product does not send or scrape.
6. The success signal is one screening-passed operator application containing three real shop URLs within
   30 days. Pageviews, generic interest and unqualified applications do not substitute.
7. Paid acquisition remains a later bet and requires both the qualified application and separate approval.
8. No new kill-switch is needed. The existing `partners.recruiting_v3_enabled` seam preserves the honest
   invitation when off and gates the proof-led application experience when on.

## Platform-first note

This is a light enhancement over existing acquisition and proof rails. `#US-2` owns proposition, application,
review, activation, partner workspace and privacy-safe events. `#US-3` owns the private evidence bundle and
close decision. This epic adds only the public-safe proof contract, the observed-results refresh of `/us`,
proof-linked founder materials and one decision-grade measurement cycle.

The public evidence artifact is read-only, dependency-free and contains no private evidence, credentials or
PII. It is the single source imported by the page, metadata and existing agent/about discovery rail. Generic
copy overrides must not detach evidence-backed claims from their version, limitation, permission or reviewer.

## What already exists — reuse, do not rebuild

| Capability | Existing seam | Reuse |
|---|---|---|
| US surface | frontend `app/(site)/us/page.tsx` | Keep `/us`, server-rendered/no-JavaScript readability and structural absence of a US catalog |
| Operator acquisition | shipped `#US-2` contracts | Reuse the exact-three-shop application, validation, review, activation, `/partner` orientation and emails |
| Proof source | shipped `#US-3` evidence bundle and close decision | Derive every capability row, limitation and retained-system statement; keep private evidence private |
| Funnel analytics | frontend `lib/analytics-events.ts` and `lib/analytics-gating.ts` | Add only fixed, PII-free proof version, coarse source and message-variant values |
| Application safety precedent | frontend `lib/fundadoras-application.ts` and `/api/vende/fundadoras/apply` | Preserve server re-enforcement, idempotency, consent separation and PII-free events through `#US-2`; do not reuse its cohort |
| Marketing copy | frontend `lib/copy-overrides*.ts` | Keep general copy rails, but keep evidence-backed claims in the versioned proof artifact |
| Design/SEO | frontend semantic tokens, `/vende` patterns, metadata and readability specs | Reuse the established accessible language and visual system; no US-only component language |
| Research | US needfinding outcome, recruitment brief and outreach sequences | Reuse the approved persona, no-cutover message, fit rules, human-send rules and organic-first baseline |
| Audit lens | June UX refresh `00-rescope-delta.md` | Apply reuse-first and claim-honesty discipline; no direct finding requires a new surface |

## Public proof contract

- Keep `#US-3`'s private evidence index private. Public rows expose no internal references, order identifiers,
  screenshots, contacts, shop URLs, secrets or credentials.
- Each row is one of **observed**, **supported but not observed**, **retained externally** or **unavailable**.
  Unknown values fail the proof-policy spec and block release.
- Each row identifies **partner-led** or **self-service**, the cohort denominator, proof version/date, reviewer,
  limitation and current publication mode.
- Attribution is permitted only where the current permission record allows it. Revocation removes the
  attribution without inventing a replacement testimonial.
- The launch discloses the founding no-platform-fee relationship. It uses no fake testimonial, manufactured
  counter, unsupported comparison, implied typical result or scale claim.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Version the public proof and case-study contract | low |
| 1 | 1.2 Turn `/us` from hypothesis into proof-led invitation | low |
| 2 | 2.1 Produce the permission-safe founder launch packet | low |
| 2 | 2.2 Measure qualified commitment and close the 30-day decision | low |

## Explicit exclusions

- A new `/partners`, `/case-studies` or campaign microsite; any `/us/*` catalog route; or new commerce,
  checkout, payment, tax, shipping, returns, fulfillment or ledger capability.
- A new application, leads table, CRM, partner identity, consent ledger, grant, admin queue or case-study CMS.
- Automated cold email, bulk messaging, scraped/enriched lists, autonomous follow-up or product-sent posts.
- Paid acquisition, retargeting, affiliate/referral economics, certification, operator pricing or exclusivity.
- Public PII, private proof, exact revenue or unapproved identities, logos, screenshots or quotes.
- “US marketplace,” “all-in-one,” “fully autonomous,” “Shopify killer,” universal parity, accounting/tax
  truth or self-service claims not directly observed.
- Broad bilingual expansion or changes to the live Mexico Promotor funnel.

## Deploy order

1. Confirm the entry gate against the shipped `#US-2` and `#US-3` contracts. If either differs from this plan,
   update the reuse map and re-groom any material expansion before coding.
2. Land the proof-policy artifact/spec and proof-led `/us` page together on a preview. The existing recruiting
   flag remains off in production; no proof is published from incomplete evidence.
3. Daniel approves the preview matrix, disclosure, permissions, attribution, support promise and social
   preview, then authorizes ordinary frontend deployment/flag state separately.
4. Produce and approve the launch packet. Daniel alone chooses recipients and sends/posts it.
5. Run the 30-day organic measurement window and record continue, reshape or stop before any paid work.

## Build and review strategy

Use one normal frontend branch with path-scoped commits, one story at a time. Sprint 1 is the only application
release boundary; Sprint 2 combines product-owned distribution material with a privacy-safe event/scorecard
change only where the shipped `#US-2` contract requires it. There is no backend, database, auth, money or
fulfillment work. If one appears, stop and re-groom it as HIGH.

Every new deterministic spec must be observed red through a deliberate broken implementation or fixture before
restoration. Run frontend TypeScript, lint, build, focused API/unit specs and anonymous desktop/mobile browser
smoke. Use the normal LOW review rail; Daniel owns publication, real recipient selection, sends/posts and the
30-day decision.

## Definition of Done (epic)

- [ ] Entry gate is evidenced; missing/unavailable inputs blocked publication rather than becoming empty proof.
- [ ] Both sprints merged to `main`, deployed and smoke-tested; each sprint records its commit/PR evidence.
- [ ] Every new spec was observed red once through a deliberate implementation or fixture mutation.
- [ ] One approved public proof version powers `/us`, metadata and the existing agent/about discovery pointer.
- [ ] Public output contains no private evidence, PII, secrets or unapproved attributed material.
- [ ] `/us` distinguishes observed/supported/retained/unavailable and partner-led/self-service beside each claim.
- [ ] The shipped `#US-2` application remains the only operator funnel; flag off preserves the honest invitation.
- [ ] `/us/l/<anything>` remains a structural 404 and no US catalog/marketplace implication appears.
- [ ] Daniel approved and human-sent the bounded organic launch packet; the product automated no outreach.
- [ ] The 30-day record reports known-present, known-absent and unavailable separately and records a
      continue/reshape/stop decision against the screening-passed three-shop application signal.
- [ ] `RETROSPECTIVE.md` is written; the poster, team memory and `Roadmap/LEARNINGS.md` are updated only with
      verified durable facts.
- [ ] Feature branch is deleted and this README's authoritative frontmatter is `status: shipped`; regenerate
      `Roadmap/00-ideas/BUILD-ORDER.md`.
