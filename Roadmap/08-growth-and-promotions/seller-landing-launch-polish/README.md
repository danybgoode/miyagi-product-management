---
status: In progress
slug: seller-landing-launch-polish
---

# Seller landing — launch polish (hero redesign + marketplace voice + benchmark example)

> **Epic — pre-launch polish on the shipped v2 overhaul**
> (`seller-acquisition-landing-content-overhaul`, shipped 2026-06-26). Tightens voice (marketplace +
> full `miyagisanchez.com` brand), **rebuilds the hero around a visible copy-paste prompt block**,
> swaps the right panel to AI-channels + premium features, strips eyebrows and leftover distrust/jargon,
> replaces the anchor social block with a premium-features grid, adds a **worked take-home example**
> under the benchmark, and applies `/vende/mundial` fixes + a whitespace/precision pass.
> **Scope doc (approved 2026-06-26):** `../../00-ideas/2. readyforscope/seller-landing-launch-polish.md`.
>
> **Status: in progress.** ✅ S1 voice & copy precision shipped 2026-06-26 (PR #133 · `d4d6bde`) →
> 🏗️ S2 hero & section redesign **built 2026-06-26, in review** (PR #134 on
> `feat/seller-landing-launch-polish-s2`; S2.1 `3d9d184` · S2.2 `355d7de` · S2.3 `1c840e8`). S1 staged
> all the new copy keys (heroTrustLine, heroValues, premiumFeatures, benchmark example); S2 lays them out.

## Why
The v2 overhaul made the pages persuasive; this round makes them *launch-ready*. The hero now centers
on the copy-paste prompt — but the prompt isn't visible (it only lives behind a button) and the
"Compruébalo tú mismo" message is duplicated across a left band and a right aside. We collapse that to
one line + a visible prompt block, rebuild the right panel to lead with the two sharpest props (sell on
Claude/Gemini/ChatGPT · premium features included), remove clutter (eyebrows, distrust lines, the
"para demos" social block), correct the brand voice (marketplace, full domain), and give cost-sensitive
sellers a concrete take-home example. Goal feel: *"pon a tu IA a configurarte en el marketplace, sin
fricción."*

## Context
| | |
|---|---|
| **Class** | Feature (content + small design) on a shipped surface |
| **Macro-section** | 08 · Growth & Promotions |
| **Risk** | **Low** — marketing pages; no commerce/auth/money. Contained to `locales/es.json` + `app/(shell)/vende/**`. Announce only if a fix reaches `globals.css`/`(shell)/layout.tsx` (it shouldn't). |
| **Relates to** | Polish of `08-growth-and-promotions/seller-acquisition-landing-content-overhaul` (shipped v2). |
| **Decisions (2026-06-26)** | hero right-side panel · "marketplace" woven in, no rigid slogan · remove router-card eyebrows too · anchor value list = 0% / AI channels / premium (personas keep their stats). |

## Medusa-first reframe
**Zero commerce, zero backend, zero new data model.** Copy in `es.json → sellerAcquisition`; hero/sections
render from `_components/SellerAcquisitionSections.tsx` (+ bespoke `mundial/page.tsx`). Two small new
blocks (premium-features grid, benchmark worked-example) wire through `page-config.ts`.

## What already exists (reuse, don't rebuild)
- **`TrustPromptCopy.tsx`** clipboard logic → extend into a `PromptBlock` that *renders* the prompt text + copy icon.
- **`sellerTrustPrompt(id)` helper** (`lib/seller-acquisition.ts`, shipped v2-S2) → per-page directive prompt string for the block.
- **Shared renderer + `page-config.ts`** → hero restructure + new sections land once for all persona pages.
- **v2-S4 responsive idioms** — `clamp()` headings, `minWidth:0`, `minmax(min(100%,Npx),1fr)`, table `overflowX:auto` — reuse for the new hero/blocks.
- **Benchmark block** (`anchor.benchmark`, shipped v2-S3) → append the `example` sub-block + date stamp.
- **Shipped premium features** for the grid: Events & Ticketing · Sweepstakes · Cal.com scheduling · Subscriptions · Seller Coupons · domain/subdomain/widget.

## Scope (stories)
| Sprint | Story | Risk | Owner |
|---|---|---|---|
| **1 — Voice & copy precision** ✅ | US-1 all string changes: marketplace word · `miyagisanchez.com` brand sweep · eyebrow removal (copy) · new hero trust line + value labels · AI-channel note removal + trim · premium-features copy · mundial fixes · benchmark worked-example copy · tightening pass | low | Claude Code |
| **2 — Hero & section redesign** 🏗️ | US-2 `PromptBlock` (visible prompt + copy icon) · right-panel hero · new value list · drop eyebrow badges · steps aside → invite+PromptBlock · anchor social → premium-features grid · benchmark example block · whitespace/icon polish · apply to bespoke `mundial` | low | Claude Code |

## Deploy order
Frontend-only (Vercel). **S1 (copy) → S2 (hero/sections).** S2 depends on S1 strings. Both low-risk,
mergeable per sprint. Could ship as one PR if Daniel prefers (launch urgency) — but keep the copy grep
gate (S1) green first.

## Epic Definition of Done
- [ ] All stories merged to `main` + smoke-tested; real-device mobile pass owed to Daniel.
- [ ] Each `sprint-N.md` has a fool-proof smoke walkthrough (real prod URLs once deployed).
- [ ] Grep clean: no bare `Miyagi` (not `Miyagi Sánchez`), no our-word `mercado`, no removed distrust lines.
- [ ] Hero shows the visible prompt block + copy icon on all `/vende*` (incl. mundial); eyebrows gone.
- [ ] Benchmark worked-example renders under the table, date-stamped; figures re-verified at publish.
- [ ] README ✅; both `sprint-N.md` ticked with commit refs; `RETROSPECTIVE.md`; poster + LEARNINGS fed.
- [ ] Branch deleted; PR(s) merged.
