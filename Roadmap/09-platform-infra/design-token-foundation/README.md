# Epic — Design-Token / Design-System Foundation

**Macro-section:** 09 · Platform & Infra
**Class:** Chore / foundation (cross-cutting presentation substrate; no buyer/seller/agent-facing behavior change).
**Scope doc:** [`Roadmap/00-ideas/seeds/design-token-foundation.md`](../../00-ideas/seeds/design-token-foundation.md) — APPROVED 2026-06-06.

## Why

The #6 sellers landing-page redesign needs to style by **intent** (`--accent`, `--fg-muted`) not by
**value** (`#1d6f42`). The token system already exists — but it isn't documented in the product
source-of-truth, the locked-vs-unlockable theme contract lives only in an unwired reference bundle,
and ~353 raw hex literals still linger across the app. This epic hardens and documents the foundation
so #6 builds on stable ground instead of re-tokenizing as it goes. Pure presentation + docs; no
commerce code.

## Context

| | |
|---|---|
| **Token home** | `apps/miyagisanchez/app/globals.css` (~1,134 lines) — already integrated (Design System v2, May 2026) |
| **Theme engine** | `apps/miyagisanchez/lib/platform-theme.ts` + components — shipped on `feat/seasonal-theme-engine` (June 2026) |
| **Canonical spec** | `references/miyagi-s-nchez-design-system/project/colors_and_type.css` + `themes/README.md` (*inspiration, not signed-off scope*) |
| **Repos touched** | `danybgoode/miyagisanchezcommerce` (frontend) only — no backend, no DB |

## Decisions (Daniel, 2026-06-06)

1. **Tight scope** — foundation hardening + a documented token contract only. The multi-theme palette
   library (default/bodega/azul) and the designer submission portal are **explicitly out of scope**
   (future epics).
2. **Macro-section** — `09-platform-infra/` (cross-cutting platform foundation), not 08.
3. **All sprints low-risk tier** — presentation-layer + docs; the agent may merge on green gate.
   (S2 touches shared `globals.css`/components → announce, rebase `main`, land as one focused PR.)

## Medusa-first note

N/A — zero backend, zero DB, zero Medusa/Supabase. AGENTS five-rule check: rules 1–3 N/A (no commerce /
no Supabase / no UCP-MCP surface), rule 4 (Clerk) untouched, rule 5 (bilingual) N/A — no new user-facing
copy (taglines remain the theme engine's job). This is CSS tokens + product documentation.

## What already exists (reuse, don't rebuild)

- **`app/globals.css`** — the full token layer: raw scales (selva/jamaica/azafran/anil/papel), semantic
  aliases (`--accent`, `--bg`, `--fg`, `--border`, feedback colors), Liquid Glass tokens, shadows, radii,
  spacing, motion easings, type utilities (`.t-*`), component primitives (`.btn`, `.chip`, `.card-tile`,
  `.badge`, `.input`). **S1 documents this; it is not rebuilt.**
- **`lib/platform-theme.ts`** — the manifest schema + contrast guardrails + per-field fallback the seeds
  asked for. **Already shipped — referenced, not touched.**
- **`references/.../themes/README.md`** — the locked-vs-unlockable matrix S1 distills into Roadmap.
- **`references/.../colors_and_type.css`** — the canonical token names/intent S1 reconciles against the
  live `globals.css` `--color-*` ↔ `--accent`/`--bg` alias layers.
- **Playwright `api` project** — S3's no-regression guard rides the existing deterministic gate; a
  pure-logic scan on a `lib/` seam is free coverage (LEARNINGS → Build & QA).

## Scope — stories & risk

| Sprint | Story | Risk |
|---|---|---|
| **1** | US-1 Documented semantic-token contract (one canonical name per concept) | low |
| **1** | US-2 Locked-vs-unlockable matrix in Roadmap | low |
| **2** | US-3 Tokenize customer-facing components (32 `bg-[#…]` + prioritized raw hex; exclude email/print/OG/admin/sandbox) | low |
| **3** | US-4 WCAG AA contrast verification over documented token pairs | low |
| **3** | US-5 No-regression guard (lint/`api`-spec scan, allow-listing email/print/OG) | low |

## Deploy order

Single repo (frontend). S1 is docs-only (Roadmap, monorepo-root repo). S2/S3 are frontend → Vercel on
merge. Land S2 as one focused PR after rebasing latest `main` (shared-surface blast radius). No backend,
so no Cloud Run lag to coordinate.

## Epic Definition of Done — ✅ CLOSED 2026-06-07

- [x] All three sprints' stories merged / delivered; each `sprint-N.md` ticked with refs. *(S2+S3 code
      in **PR #37** `cc317ef`; S1 token-contract doc written at close-out — see note below.)*
- [x] Each sprint has a smoke walkthrough; the S2 visual-diff step is named as **owed to Daniel**.
- [x] **Token contract + locked/unlockable matrix live in Roadmap** — [`token-contract.md`](token-contract.md), cross-linked.
- [~] S2 **zero visible change** — guard + AA pass; the **before/after screenshot diff is owed to
      Daniel** (low-stakes; no functional risk). The only open item.
- [x] No-regression guard green in the deterministic gate (`e2e/design-token-foundation.spec.ts`).
- [x] `RETROSPECTIVE.md` written; `LEARNINGS.md` updated with the durable rule.
- [x] Product poster (`Roadmap/README.md`) updated — Recent-highlights entry; no user-visible feature change.
- [x] Team memory updated (`project_design_system.md` extended with the contract location).
- [x] **PR #37 merged to `main`.** *(Feature-branch deletion is a repo-housekeeping step for Daniel.)*

> **Close-out note (2026-06-07).** The S2 (tokenization) + S3 (contrast + raw-color guard) **code**
> shipped in PR #37, but the **S1 Roadmap deliverable** — the documented token contract + locked/
> unlockable matrix — had not been written. It was authored during this close-out
> ([`token-contract.md`](token-contract.md)) from the live `globals.css`, so #6 now has the
> style-by-intent reference it depends on. One genuine gap remains: the human before/after
> screenshot diff for "zero visible change" (owed to Daniel).
