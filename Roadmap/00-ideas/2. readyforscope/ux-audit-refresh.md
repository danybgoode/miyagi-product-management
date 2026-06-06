# Scope — UX Audit Refresh (BUILD-ORDER #3a)

> **Status: SIGNED OFF (Daniel, 2026-06-06).** Scope approved. **Next action: run the spike** as a
> read-only Claude Code investigation session (kickoff prompt below) — **do NOT scaffold an epic**;
> the deliverable is written findings + a re-scope delta. Results landing location confirmed:
> `ux-audit/results-refresh-2026-06/` (v1 baseline kept intact for diffing).
> Groomed 2026-06-06. Class: **Spike** (time-boxed read-only investigation → **written findings +
> a decision**, no code, no slicing). Stage-2.5 bucket: **this IS the orientation step** — a
> planning spike whose output re-scopes the waves after it.

## The ask (mirrored back)
*You want the 5 structural UX audits (`ux-audit/results/01–05`) re-run against current `main` — because
personalized products, subdomains, short-links, and the support widget all postdate them — so that
#3b / #5 / #6 are sliced off a current picture instead of a stale one. Right?*

The original audits were captured **2026-06-03/04**. Since then a wave of federated-commerce and
checkout-touching features shipped (see the table below), so several findings may already be fixed,
changed, or newly introduced. #3a is the lens-refresh that the highest-value product work sits on.

## Why / the job
**As** the product owner, **I want** a refreshed, current-state read of the structural UX across the
five core domains **plus** an explicit "what this changes for #3b/#5/#6" delta, **so that** I groom the
money/trust hardening, notifications, and landing redesign off today's reality and don't re-derive scope
from audit findings that the last week of shipping has already moved.

This is a **spike, not a build**: the deliverable is a written set of refreshed findings and a re-scope
note — no branch, no code, no slicing into sprints until those findings land and the downstream items
are groomed individually.

## What's changed since the audits (the reason to refresh)
Everything below shipped **after** the 2026-06-03/04 audit snapshot and touches surfaces the audits
covered — so each is a place a finding may have moved:

| Shipped (postdates audit) | Why it could move a finding | Domains most affected |
|---|---|---|
| **Configurable & personalized products** (2026-06-05) | New buy-box / cart / checkout / order-screen surface; line-item metadata echoes through checkout — directly overlaps the 02 checkout-flow and 03 order-screen findings | 01, 02, 03 |
| **Multi-tenant subdomains** (`shopname.miyagisanchez.com`, 2026-06-06) | Whole storefront renders white-label on a new host → discovery / PDP / trust-signal context (05) now has a per-host dimension the audits never saw | 01, 05 |
| **Ultra-short branded links** (`mschz.org`, 2026-06-06) + custom product slugs | New entry points into PDPs/shops; addressing ladder is now 4 rungs — affects discovery entry + share/trust surfaces | 01, 05 |
| **Support widget** (Buy-Me-a-Coffee, 2026-06-05) | Brand-new guest-checkout handoff + hidden support product → a checkout/payment path (02) that did not exist at audit time | 02 |
| **Custom-domain checkout S1–S3** (2026-06-05) | Buyer can now *buy* on a tenant domain (platform hop + branded confirmation) → new checkout + trust + order-visibility states (02/05) | 02, 05 |
| **Custom slugs + custom-domain DNS hotfix** (2026-06-06) | Shop addressing/identity surface (settings + share) — minor for UX findings, noted for completeness | 03 |

> **Note on #4 (design tokens), running in parallel.** #4's tokenization pass touches the same
> customer-facing components (e.g. `CheckoutExperience.tsx`) but is **invisible-by-design** (same
> rendered pixels). It does **not** change any UX finding here, and #3a is **read-only**, so the two
> don't collide. If #4 lands mid-spike, re-audit against the merged `main`.

## Scope decisions (Daniel, 2026-06-06)
1. **Breadth — all 5, weighted.** Re-run all five domains, but go **deepest on 02 (checkout),
   03 (selling), 05 (trust/offers/messaging)** — the money/trust path that drives #3b and #5 — and
   **lighter on 01 (discovery) and 04 (shipping)**, which mainly feed the later #3c polish.
2. **Deliverable — refreshed findings + re-scope deltas.** Produce updated audit docs **and** a written
   "what this changes for #3b/#5/#6" section, and reflect those deltas back into `BUILD-ORDER.md`. This
   is what makes #3a a real planning input rather than a parallel document.
3. **New surfaces — re-check + audit new.** For each domain, **(a)** verify which original findings still
   reproduce on current `main` (fixed / changed / still-live), **and (b)** surface net-new UX issues
   introduced by the post-audit features in the table above.

## Method (how the spike runs — read-only)
- **Read-only architecture audit**, same posture as the originals: read the live components + backend
  routes, do **not** modify files, branches, or specs. (The original docs cite exact `file:line`
  anchors — re-verify those anchors against current `main`, since the line numbers will have drifted.)
- **Confirm present-day facts, don't trust the 2026-06 citations.** The originals lean on external
  sources (Baymard mobile-filter / search-query guidance; arXiv conversational-shopping papers). Where a
  recommendation still hinges on one, **web-search to re-confirm the current guidance** before carrying
  it forward, and refresh the citation.
- **Diff, don't replace.** Keep the originals as the baseline. Land the refresh as a new sibling set
  (proposed: `ux-audit/results-refresh-2026-06/01–05.md`) so the before/after is legible and the
  re-scope deltas can cite "was P0 in v1 → now fixed/changed/still-live."

## Acceptance — the refreshed findings + decision must answer
For **each** of the 5 domains (weighted per the breadth decision):
1. **Reproduction status of every original finding** — fixed / changed / still-live, with the current
   `file:line` anchor (or "anchor gone — feature removed/refactored").
2. **Net-new findings** from the post-audit surfaces (personalized products, subdomains, short-links,
   support widget, custom-domain checkout) — same prioritization rubric (P0/P1/P2) the originals used.
3. **Refreshed external citations** where a recommendation depends on one (re-confirmed present-day).

And **one cross-cutting re-scope section**:
4. **What this changes for #3b** — confirm/adjust the three checkout P0s the build order names for it:
   durable `buyer_reported_paid` (02-#1, 03-P0), block-ship-before-paid gating (02-#3/#4, 03-P0), and
   coupon-vs-CTA total mismatch (02-#5, 04-#7). Are they all still live? Any new money-path P0?
5. **What this changes for #5** (granular notifications) — the manual-payment lifecycle events
   (`buyer_reported_paid → payment_confirmed → shipped …`) are #5's canonical triggers; confirm the
   state model the audits described is still the right trigger set, post-refresh.
6. **What this changes for #6** (landing redesign) + **#3c** (discovery taxonomy, CP-first shipping,
   in-chat transaction ledger) — note any finding that moves their scope.
7. **A one-paragraph go-forward** that updates `BUILD-ORDER.md` (tick #3a; sharpen the #3b/#5/#6/#3c
   lines with the deltas).

## In / Out of scope (v1)
**In:** read-only re-audit of all 5 domains (weighted 02/03/05 deep, 01/04 light); reproduction status
of every original finding; net-new findings from the 5 post-audit surfaces; refreshed external citations;
a written re-scope delta for #3b/#5/#6/#3c; a BUILD-ORDER update on sign-off of the findings.
**Out:** any code, branch, or fix (those are #3b and the downstream epics); slicing #3b/#5/#6 into
sprints (each gets its own groom run, fed by this); re-auditing domains 06 (Print) / 07 (Agentic) /
08 (Growth), which the originals never covered and which no current wave depends on; the older
`00-ideas/ux-uiaudit/` draft set (superseded — ignore).

## Open risks / questions
- **Where the refreshed docs land.** Proposed `ux-audit/results-refresh-2026-06/` (keeps the v1 baseline
  intact for diffing). Alternative: overwrite `results/` and rely on git history. *Confirm at sign-off.*
- **Subdomain/custom-domain adds a host dimension the audits never had.** Discovery + trust findings (01/05)
  may now differ by channel (marketplace vs subdomain vs custom domain vs embed). The refresh should note
  *per-channel* divergence where it exists rather than assuming the marketplace render is universal.
- **`main` moves under the spike** (parallel agents; #4 tokenization in flight). Pin the findings to a
  commit SHA so the re-scope deltas are reproducible.
- **Spike could surface a brand-new P0** (e.g. in the support-widget guest-checkout path) that jumps the
  queue ahead of #3b. That's the spike working as intended — flag it for a priority call, don't silently
  fold it in.

## Investigation kickoff prompt (spike — paste into a fresh Claude Code session; no branch, no build)
```
Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/00-ideas/2. readyforscope/ux-audit-refresh.md (this spike's scope) and the 5 baseline
audits in Roadmap/00-ideas/2. readyforscope/ux-audit/results/01–05.

This is a SPIKE — a read-only UX architecture re-audit. Do NOT modify code, create branches, or write
specs. Pin your work to the current main SHA (record it).

For all 5 domains — going deepest on 02 (checkout), 03 (selling), 05 (trust/offers/messaging) and
lighter on 01 (discovery) and 04 (shipping):
  1. Re-verify every original finding against current main: fixed / changed / still-live, with the
     current file:line anchor.
  2. Surface net-new findings from the surfaces that postdate the baseline — personalized products,
     subdomains, short-links, support widget, custom-domain checkout — using the same P0/P1/P2 rubric.
  3. Where a recommendation leans on an external source (Baymard, arXiv), web-search to re-confirm the
     present-day guidance and refresh the citation.
Note per-channel divergence (marketplace vs subdomain vs custom domain vs embed) where it exists.

Write the refreshed findings to Roadmap/00-ideas/2. readyforscope/ux-audit/results-refresh-2026-06/01–05.md
(keep the v1 baseline intact). Then write ONE cross-cutting re-scope section answering: what changes for
#3b (the 3 checkout P0s), #5 (manual-payment trigger events), #6 (landing) and #3c — and propose the
BUILD-ORDER edits. End in a written go-forward. No code.
```

## Definition of Ready check
- [x] As-a/I-want/so-that clear; acceptance is a written decision Daniel can read + act on.
- [x] Class = Spike; Stage-2.5 bucket named (this *is* the orientation step).
- [x] v1 in/out boundary written; breadth + deliverable + new-surface decisions captured (Daniel, 2026-06-06).
- [x] Method = read-only; present-day citation refresh required; diff-against-baseline.
- [x] No slicing/risk-tiering (spike → written decision, not stories); investigation prompt emitted.
- [x] **Daniel approved this scope doc (2026-06-06)** ← gate passed. Next: run the spike; do NOT scaffold an epic.
