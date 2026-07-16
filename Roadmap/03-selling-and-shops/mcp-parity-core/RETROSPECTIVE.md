# MCP seller-surface parity — core — Retrospective

_Closed: 2026-07-16_

## What shipped

- **Sprint 1 — launchpad unblock + hygiene (LOW), PR #237, 2026-07-12.** 8 launchpad tools
  (campaign CRUD, manuscript review/publish, 2 previously-untested reads), the `launchpad` config
  block, manifest sync for 4 drifted tools + a permanent both-directions dispatch⇄manifest drift
  guard, and the `update_listing` title-validation fix. Built in its own earlier session; directly
  unblocked `panfleto-premium-shop` S3.
- **Sprints 2–4 (all HIGH) — built in ONE session, 2026-07-16**, as a deliberate test of running
  multiple sprints per session (Daniel's call, deviating from the one-sprint-per-session way of
  working):
  - **S2 `configure_listing_options`** (frontend PR #265) — the agent door to the portal
    "Opciones" screen; zero new pricing logic (the backend's shared `updateSellerProduct` owns
    every guard), backend 4xx messages surfaced verbatim, PUT-route mirror-sync parity.
  - **S3 `delete_listing` + `apply_price`** (frontend PR #266 + backend PR #97) — thin
    secret-gated internal service doors extracted verbatim from the portal routes
    (`softDeleteProducts`; the full apply-price pipeline incl. conditional ML push + activity
    log), then MCP handlers with double ownership checks (frontend mirror + backend re-check).
  - **S4 `support` + `checkout` config blocks** (frontend PR #267 + backend PR #97's
    `/internal/support-product` door) — `normalizeSupportSettings` reused verbatim with the
    provisioning side effect surfaced explicitly (the response names the real product created);
    the `checkout` block got the epic's only *authored* validation (the portal never validated
    it), with `bank_transfer`/`contact_email` never agent-settable and the
    `get_store_configuration` snapshot gaining explicit secret-free projections (the stored
    checkout blob holds a real CLABE).
- **All 5 HIGH stories ship dark**: `mcp.configure_options/delete_listing/apply_price/
  support_config/checkout_config.enabled`, enablement polarity, default OFF in `DEFAULT_FLAGS`,
  seeded OFF live and re-verified by direct `platform_flags` query at each merge (the
  migrations-gap learning applied as policy, not retroactively).

## What went well

- **The review lattice caught real bugs at every layer, on every PR.** Codex (advisory, different
  model family) caught: an unchecked mirror write (S2), a genuine multi-variant "desde"-price
  desync in apply_price's card mirror (S3 — the best catch of the epic; the fix recomputes
  min-across-grid instead of blindly writing the applied variant's price), an activity-log write
  that could 500 an already-determined outcome (backend), and a dishonest `appliedAny` on
  provisioning aborts (S4). Fresh Sonnet 5 `pr-reviewer` passes caught: a missing risk-tier
  declaration (backend PR), TWO red-CI hardcoded flag-count assertions the builder's "specs green"
  claim had glossed over, and the delete-not-sensitive-audited gap (now `listing_delete` triggers
  the seller security alert). Builder ≠ reviewer held even with all building in one session.
- **Extract-and-rewire kept the risk honest.** Every mutation reaches Medusa through code the
  portal already runs — the backend PR was verified byte-equivalent against origin/main by an
  independent reviewer reading the actual pre-diff source, not the PR description.
- **The red-green DoD did its job naturally**: every new spec was observed red against prod (tools
  absent) before going green locally — no mutation check needed, the deployment gap provided it.

## What we learned

- **Parallel same-session sprints on one hot file = guaranteed sequential-merge integration tax.**
  S2/S3/S4 each edited the same 5 files (`route.ts`'s TOOLS array + dispatch switch,
  `flags.ts`, `flags-admin.ts`, `capabilities.ts`, the flags-count spec) from independent
  worktrees cut off the same base. Every later merge required manual conflict surgery — including
  one genuinely dangerous mangled seam (two function bodies glued mid-`try` in
  `seller-products.ts`) that only `tsc` caught. The hardcoded `FLAG_KEYS.toHaveLength(N)`
  assertion was red on CI for every branch in turn (each branch counted only its own flags), and
  the count had to be re-fixed at each integration (30 → 32 → 34). **Generalizable:** when
  batching sprints, either (a) stack the branches (each cut from the previous, merged in order) or
  (b) accept the per-merge integration pass and budget for it — and treat any count-style
  assertion as a merge-conflict magnet to fix at integration time, not build time.
- **A sprint doc's assumed guard can be fiction — verify acceptance criteria against the live
  system before building to them.** Story 3.1's acceptance and smoke walkthrough both described an
  "order-linked delete refusal guard" that does not exist anywhere (the portal soft-deletes,
  which is precisely why no guard is needed — order line-items keep resolving). Building the tool
  to the doc would have *invented* a guard the portal doesn't have, breaking parity. Both
  reviewers independently confirmed the correction; the doc now records it.
- **"Same semantics as X" comments must name the constraint that makes X safe.** apply_price's
  first mirror write claimed parity with `update_listing`'s — but `update_listing` can only touch
  single-variant prices (the backend's ambiguity guard routes multi-variant elsewhere), which is
  the hidden constraint that made its blind write safe. apply_price targets any variant, so the
  "same" write was wrong. The reviewer only caught it by asking *why* the precedent was safe.

## Gaps / follow-ups

- **A pre-existing deploy-rail outage was caught during THIS epic's close-out** ("merged" ≠
  "deployed", again): the local-first pre-push hook chore (frontend #264 / backend #96, merged
  before this epic's branches were even cut) added a bare git-touching npm `prepare` script that
  kills `npm ci` inside the gitless Docker deps stage — **every Cloud Build on both repos failed
  from 14:21Z**, including backend PR #97's deploy, while CI (Vercel-preview-based) stayed green.
  Fixed forward same-day (frontend #268 / backend #98, one-line `|| true`); the epic's merges
  deploy once those land. Promoted to `LEARNINGS.md` (Repo & deploy hygiene).
- **All 5 Daniel smokes owed** (sprint-{2,3,4}.md walkthroughs) — every flag stays OFF until its
  smoke passes. Nothing agent-reachable changed at merge time.
- **The `ms_agent_…` test-token fixture gap persists** — every seller-tool spec can only cover
  discovery + auth boundary; flag-on mutation paths are manual-smoke-only. Repeatedly noted since
  the S1 spec; worth a dedicated story in `mcp-parity-config` or the QA backlog.
- **Support-product provisioning concurrency race** (pre-existing, faithfully preserved by the
  extraction): two simultaneous ensure calls for a seller with no support product can both create
  one. Duplicate is hidden-from-catalog and orphaned; needs a lock/uniqueness guard someday.
- **`update_listing`'s own multi-variant mirror-price latent pattern** — narrower exposure than
  apply_price's (the backend guard routes multi-variant pricing away from it), logged here rather
  than fixed in-epic.
- **`mcp-parity-config` (the sibling uniformly-LOW epic)** remains scoped and unbuilt.
