---
title: "Design-token / design-system foundation"
slug: design-token-foundation
status: shipped
area: "09"
type: chore
priority: wave-0
risk: low
epic: "09-platform-infra/design-token-foundation"
build_order: "#4"
updated: 2026-06-08
---

# Scope — Design-Token / Design-System Foundation (BUILD-ORDER #4)

> **Status: SCOPE GATE — awaiting Daniel's sign-off.** Nothing scaffolds or commits until approved.
> Groomed 2026-06-06. Class: **Chore (foundation + docs)**. Stage-2.5 bucket: **mostly already
> shipped → light enhancement + documentation** (NOT a rebuild).

## The ask (mirrored back)
*You want a solid, documented design-token foundation — so that the **#6 sellers landing-page
redesign** builds on stable, semantic tokens instead of re-tokenizing as it goes. Right?*

The two seeds (`theming-system.md`, `designer-collaboration-portal.md`) describe a full theme engine, but
that engine **already shipped**. So #4 is not "build the design system" — it's "harden and document
the foundation that exists, and close the tokenization gaps that would cause rework in #6."

## Reconciliation — what already exists (the headline finding)
Per BUILD-ORDER's instruction to reconcile first, this is confirmed an **update, not a rebuild**:

| Seed asks for | Reality | Source |
|---|---|---|
| Design tokens / semantic variable system | **Shipped.** `app/globals.css` (~1,134 lines): raw scales (selva/jamaica/azafran/anil/papel), semantic aliases (`--accent`, `--bg`, `--fg`, `--border`…), Liquid Glass tokens, shadows/radii/spacing/motion, type utilities (`.t-*`), component primitives (`.btn`, `.chip`, `.card-tile`, `.badge`, `.input`) | `memory/project_design_system.md` |
| Theme manifest schema (`--accent`, logo SVG, tagline, spot illustrations, bg pattern) | **Shipped.** `lib/platform-theme.ts` — `PlatformThemeManifest` with all those fields + per-field fallback, contrast guardrails, sunset metadata | `08/seasonal-theme-engine/` |
| Header toggle, persistence, zero-flash, scope-fencing | **Shipped.** `PlatformThemeToggle.tsx`, `PlatformThemeScript.tsx`, localStorage `miyagi:platform-theme`, route/channel scope | `08/seasonal-theme-engine/sprint-2.md` |
| "Locked vs. unlockable per theme" | **Specified but not in Roadmap.** Clean matrix exists only in the *reference bundle* (`references/.../themes/README.md`); engine enforces guardrails but the contract isn't documented in the product source-of-truth | reference bundle |
| 3 sample themes (default / bodega / azul) | **Prototypes only**, in `references/.../themes/`; the live engine is binary (core vs. one active designer theme). *Out of scope for #4 — deferred to a future "palette library" epic.* | — |
| Designer submission portal | **Explicitly deferred** as out-of-scope in the shipped epic. *Out of scope for #4 — future 08-domain feature.* | `08/.../README.md` |

**Decision (Daniel, 2026-06-06):** scope #4 tightly as **foundation hardening + a documented token
contract**. The multi-theme palette library and the designer submission portal are acknowledged
downstream items, explicitly **out of scope** here.

## Tokenization-gap audit (sizing, run 2026-06-06)
- **353** raw hex literals across **50** `.ts/.tsx` files; **32** Tailwind arbitrary color classes
  (`bg-[#…]`); **5** inline-style raw colors.
- **Legitimately hardcoded — leave as-is, document why:** `lib/email.ts` (66 — email clients strip
  CSS custom properties), `lib/print-layout.ts` / `print-export.ts` / `PrintAdPreview.tsx` /
  `PrintAdBlock.tsx` (print/PDF render), `app/opengraph-image.tsx` (OG image generation). These
  *cannot* use runtime CSS variables; they are out of the tokenization remit.
- **Lower-priority / internal:** `app/style-sandbox/page.tsx` (48, a demo page),
  `app/admin/AdminScrapeClient.tsx` (66, admin-only tooling).
- **The real customer-facing gap (the target):** `CheckoutExperience.tsx` (17),
  `embed/s/[slug]/page.tsx` (9), `ConversationClient.tsx` (6), `ShopSettings.tsx` (5),
  `ImportClient.tsx` (5), `ClaimForm.tsx` (5), + the long tail of small offenders and the 32
  arbitrary Tailwind color classes.

## Medusa-first reframe
**Zero backend, zero DB, zero Medusa/Supabase.** This is pure presentation-layer CSS + product
documentation. No data model, no migration, no agent surface, no new user-facing copy (taglines are
already the theme engine's job). AGENTS rules are satisfied trivially (nothing touches commerce,
Supabase, Clerk, or UCP/MCP). **Reuse, don't rebuild:** the existing `globals.css` token layer, the
seasonal engine's override mechanism, and the reference bundle's `colors_and_type.css` +
`themes/README.md` as the canonical spec to distill (*reference end-states are inspiration, never
signed-off scope* — per the guardrail).

## UX heuristics
- **Invisible by design.** A correct tokenization swap changes *nothing* a user can see — same
  pixels, same contrast, same layout. Any visible diff is a regression, not a feature.
- **Semantic over raw.** Components reference intent (`--accent`, `--fg-muted`) not values (`#1d6f42`),
  so a future theme or the #6 redesign re-skins by changing tokens, not chasing literals.
- **Contrast is locked at AA.** Foreground/background pairs must hold WCAG AA; the hardening pass
  verifies, never weakens, readability.

## Proposed slicing (skateboard → car) — for sign-off
Small epic, three lean sprints. The **contract doc (S1) is itself the deliverable #6 needs**; S2/S3
harden it.

### Sprint 1 — Token contract (the substrate #6 consumes) · risk: **low** (docs/Roadmap only)
- **US-1.** *As the #6 redesign builder, I want a documented semantic-token contract, so that I style
  by intent without re-deriving the system.* **Acceptance:** a Roadmap doc lists every semantic token
  (`--accent`, `--bg`, `--fg`, surfaces, feedback colors, radii, spacing, motion, type utilities,
  component primitives) with its meaning + the raw scale it resolves to; reconciles the
  `--color-*` ↔ `--accent`/`--bg` alias layers so there's one canonical name per concept.
- **US-2.** *As a designer/PM, I want the locked-vs-unlockable matrix in the product source-of-truth,
  so that theme boundaries aren't buried in a reference bundle.* **Acceptance:** the matrix from the
  reference `themes/README.md` is captured in Roadmap, cross-linked to the shipped engine's guardrails.
- **QA:** doc review by Daniel; cross-check token names against `globals.css` (no doc-drift). No code.

### Sprint 2 — Tokenization hardening (customer-facing surfaces) · risk: **low** (presentation-only; *touches shared `globals.css`/components — must be announced per LEARNINGS*)
- **US-3.** *As a maintainer, I want customer-facing components to reference semantic tokens, not raw
  hex, so that re-skinning is a token change.* **Acceptance:** the 32 `bg-[#…]` arbitrary classes and
  the prioritized raw-hex literals in live storefront/checkout/embed/messaging/settings components are
  swapped to token-backed classes/vars; **email, print/PDF, OG-image, sandbox, and admin contexts are
  explicitly excluded** (documented why); the visual diff is nil (same rendered pixels).
- **QA:** `tsc --noEmit` + `npm run build` green; **anonymous browser smoke** (Daniel-owed steps named)
  diffing key pages before/after to prove zero visible change; storefront + checkout render unchanged.

### Sprint 3 — Contrast verification + a no-regression guard · risk: **low**
- **US-4.** *As a visitor, I want every semantic fg/bg pair to hold WCAG AA, so readability is
  guaranteed regardless of active theme.* **Acceptance:** a contrast check over the documented token
  pairs passes AA; any failure is fixed or flagged.
- **US-5.** *As a maintainer, I want new raw-hex in customer-facing components to be caught, so the
  foundation doesn't erode.* **Acceptance:** a lightweight guard (lint rule or a pure-logic Playwright
  `api` spec scanning the target dirs, allow-listing email/print/OG) fails on a new raw color — a
  *free-coverage* `lib/` seam per LEARNINGS.
- **QA:** the new spec runs in the deterministic `api` gate; contrast check is reproducible.

## In / Out of scope (v1)
**In:** documented semantic-token contract + locked/unlockable matrix in Roadmap; tokenization of
customer-facing components; AA contrast verification; a no-regression guard.
**Out:** multi-theme palette library (default/bodega/azul wiring) — future epic; designer submission
portal — future 08-domain epic; any change to the shipped seasonal engine's behavior; re-skinning
(that's #6); email/print/PDF/OG/admin/sandbox color literals; PWA icons/splash/manifest.

## Open risks / questions
- **Macro-section home.** Proposed `09-platform-infra/design-token-foundation/` (cross-cutting platform
  foundation, alongside the new CI/CD epic). Alternative: `08-growth-and-promotions/` beside the
  seasonal-theme-engine sibling. *Confirm at sign-off.*
- **Shared-surface blast radius.** S2 touches `globals.css` + many components → can collide with
  sibling PRs (LEARNINGS: announce cross-cutting changes). Mitigate: land S2 as one focused PR,
  rebase latest `main` first, prefer mechanical token swaps reviewed in one pass.
- **"Zero visible change" is the hard part to prove** without a full visual-regression rig — the
  browser smoke is sampled, so a before/after screenshot diff on a few key pages is owed to Daniel.

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance testable by Daniel.
- [x] Stage-2.5 bucket named (light enhancement + docs, on a mostly-shipped foundation).
- [x] v1 in/out boundary written; reconciliation cited.
- [x] Reuse list produced (Medusa-first reframe done — zero backend).
- [x] Each story risk-tiered (all low); QA stage named per sprint; smoke owner = Daniel (visual diff).
- [ ] **Daniel approves this scope doc** ← the gate.
