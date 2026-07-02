# Retrospective · Promoter funnel fixes (08, LOW)

**Shipped:** 2026-07-02, 1 sprint. PR [#157](https://github.com/danybgoode/miyagisanchezcommerce/pull/157)
(squash `b3a9956`), following PR [#156](https://github.com/danybgoode/miyagisanchezcommerce/pull/156)
(squash `c922e38`) from an unrelated epic that inherited Story 1.1.

## What shipped
- **Story 1.1** — the `{url}` placeholder in the `/vende/promotor` copy-paste prompt now resolves to the
  real page URL. Delivered by `feat/agent-discovery-and-indexing` S1.2 (`promoterTrustPrompt()` in
  `lib/seller-acquisition.ts`), merged first so this epic inherited it with zero duplicate code.
- **Story 1.2** — `/vende/promotor`'s "Abrir mi panel para cerrar" no longer links to a 404 when
  `promoter.enabled` is off. `buildPromoterPageConfig` takes a server-read `enabled` flag; the CTA
  hides itself (default: hidden, no new copy) via a nullable `primaryCta`/`closingCta` on
  `SellerAcquisitionPageConfig` — the existing optional `secondaryCta` field's pattern, extended.
- **Story 1.3** — the navbar "Agente IA" sheet now pitches selling (`/vende*`, `/sell*`) or recruiting
  (`/promotor/*`, `/vende/promotor`) instead of the generic buyer prompt, via two new
  `AgentPromptContext` kinds in the existing pure `lib/agent-prompt.ts` seam.
- `promoter.enabled` confirmed **ON** in prod (Daniel, 2026-07-02) — the S1.2 guard renders the CTA live.

## What went well
- **Reuse-before-rebuild caught a real duplicate before it happened.** Research (reading the scope docs +
  grepping the actual code) surfaced that `feat/agent-discovery-and-indexing`'s open, green, mergeable PR
  #156 had already fixed Story 1.1's exact root cause — same file, same function shape, same regression
  specs — before this sprint wrote a line of code. Merging that PR first and branching off the result meant
  Story 1.1 needed zero new commits here, instead of two epics independently patching the same bug (and
  risking a real merge conflict whichever landed second).
- **The cross-agent codex review found two genuine, cheap should-fixes** (a test race condition, a small
  duplicate-shape nit) with **zero blocking findings** — applied both in one follow-up commit before merge.
- **The api spec suite caught nothing broken** by widening a shared component's prop type
  (`SellerAcquisitionPageConfig.primaryCta`/`closingCta` → nullable) — all 5 other seller-persona pages that
  still always supply both CTAs passed unchanged, confirming the nullable-CTA change was additive, not
  disruptive, to the shared `SellerAcquisitionSections.tsx`.

## What we learned (promoted to `LEARNINGS.md`)
- **Before building a story, grep for whether another open PR already fixed the identical root cause** —
  not just search this epic's own history. A scope doc approved same-day as a sibling epic's fix can miss
  that the sibling already landed it; the check is cheap (git log on the touched file + `gh pr list`) and
  the alternative is two epics racing to patch the same bug.
- **A shared root-repo checkout can be yanked out from under you mid-session by a concurrent
  agent/routine** — reconfirms the existing LEARNINGS rule ("don't yank a shared branch"), but this time it
  bit the **product-docs root repo**, not an app repo: mid-build, another process checked out a different
  branch in the same physical `medusa-bonsai` directory, and a Roadmap doc commit needed a fresh
  `git worktree` (`.worktrees/<name>`) to land safely without touching the other session's checkout — same
  fix as parallel *planning* work already used, just needed for a build session too.
- **A "should-fix" from an advisory cross-review can already be substantially mitigated by an existing
  design decision** — codex flagged a theoretical race between two sequential live-flag reads in a test, but
  `lib/flags.ts`'s 60-second in-process cache means both reads already return the identical cached value
  outside a vanishingly narrow window. Fixed it cheaply anyway (concurrent `Promise.all` fetch) since the
  should-fix was still directionally correct, but worth naming the mitigating context in the commit so a
  future reader doesn't over-index on the theoretical risk.

## Gaps (stated, not glossed)
- **Browser smoke (copy→paste→agent round-trip) still owed to Daniel** — an automated smoke can assert the
  sheet renders and copies the right text, but can't judge how Claude/ChatGPT/Gemini actually respond to the
  copied prompt.
