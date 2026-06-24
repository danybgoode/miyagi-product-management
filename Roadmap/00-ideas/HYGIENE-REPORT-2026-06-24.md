<!-- One-off advisory artifact from a roadmap-hygiene pass (Routine C process, run manually before
     scripts/routines/roadmap-hygiene.prompt.md merged on PR #39). Not a generated file like
     BUILD-ORDER.md — this is a dated report, kept for history. Findings are proposals only; no
     seed/epic frontmatter was changed by this pass. -->

# Roadmap hygiene report — 2026-06-24

🤖 **Routine C — weekly roadmap hygiene (Claude, cloud).** Advisory docs PR — review & merge by hand;
nothing here gates.

Ran the full funnel/epic/board check described in `Roadmap/WAYS-OF-WORKING.md` and
`Roadmap/00-ideas/README.md` against the live repo (commits, PRs, RETROSPECTIVE.md files, the Notion
"Marketplace Roadmap" DB). No seed or epic `status:` frontmatter was edited — per the established
rule, status changes are a human call; this report only proposes them.

## Funnel grooming

Three seeds have `status:` that's stale relative to verifiable repo state — the described work is
done, but the frontmatter was never flipped:

- **[`notion-roadmap-sync.md`](seeds/notion-roadmap-sync.md)** — `status: in-progress` (updated
  2026-06-08, header says "Building now"). The sync is live: `scripts/roadmap-to-notion.mjs` +
  `.github/workflows/notion-sync.yml` run nightly + on push, and the Notion board shows current
  syncs. A follow-up epic, [`notion-board-hygiene`](../09-platform-infra/notion-board-hygiene/README.md),
  already shipped further hardening on top of it. **Propose: `shipped`.**
- **[`process-scaffolding-and-00-ideas.md`](seeds/process-scaffolding-and-00-ideas.md)** —
  `status: in-progress` (updated 2026-06-08, header says "Building now"). The proposed flat
  `seeds/`+`audits/` model and frontmatter schema it describes is in universal active use (all current
  seeds use it), and `skills/groom/scaffold-epic.mjs` exists and implements it. **Propose: `shipped`.**
- **[`kill-switch-at-grooming.md`](seeds/kill-switch-at-grooming.md)** — `status: ready` (updated
  2026-06-13), but the doc's own header says "ratified 2026-06-13... decision is live," and the ratified
  content is merged: `Roadmap/WAYS-OF-WORKING.md` (kill-switch DoD checklist item) and
  `skills/groom/SKILL.md` ("Stage 6b — Kill-switch decision for `risk: high`") both contain it.
  **Propose: `shipped`.**

One umbrella seed is stale by extension — all of its scaffolded children are done:

- **[`remaining-audit-polish.md`](seeds/remaining-audit-polish.md)** (BUILD-ORDER `#3c`) —
  `status: scaffolded`, `epic: null` (it's a wave doc, not a single epic). Of its 4 spawned domain
  epics, all are shipped: [Epic A — Discovery Polish](../01-discovery-and-shopping/discovery-polish/README.md),
  [Epic B — Delivery & Manual-Money Polish](../02-checkout-and-payments/delivery-money-polish/README.md)
  (explicitly minus B.5, deferred behind Spike 0 by decision), [Epic C — Trust & Messaging
  Polish](../05-trust-offers-and-messaging/trust-messaging-polish/README.md), [Epic D — Cross-channel
  Storefront Trust Parity](../07-agentic-and-federated-commerce/cross-channel-trust-parity/README.md).
  Only **Spike 0** remains open, and it's already tracked independently under
  [`spike-arranged-only-delivery.md`](seeds/spike-arranged-only-delivery.md) (`status: ready`, correctly
  unstarted). **Propose: `shipped`** on the umbrella, with Spike 0 continuing to track separately.

No orphan `epic:` links (every seed's `epic:` path resolves to a real README) and no seeds missing
required frontmatter fields.

### Heads-up, not a flag

- **[`routines-enablement`](../09-platform-infra/routines-enablement/README.md)** — `status:
  scaffolded` is currently accurate (PR #39, opened today, builds Sprint 1). Update to `in-progress`/
  `shipped` once it merges — no action needed today.

### Legacy intake folders are still live (doc-accuracy gap)

`Roadmap/00-ideas/README.md` describes the funnel as flat `seeds/` + `audits/` only, and frames the old
numbered folders as superseded ("folders used to drift because nobody moved files between
`1. raw` / `2. readyforscope` / `3. done`"). In practice, **`00-ideas/2. readyforscope/` is still an
active scope-doc source**: 11 of its 17 docs already have a scaffolded epic (e.g.
`notion-board-hygiene.md`, `devops-reliability-cleanup.md`, `domain-coupon-mint-fix.md`,
`seller-nav-consolidation.md`), scaffolded as recently as 2026-06-22/23 directly from that folder
rather than from a `seeds/` entry — which is why 26 of the repo's 61 scaffolded epics have no
corresponding `seeds/*.md` file. The routines-enablement decision doc itself
(`2. readyforscope/spike-claude-routines.md`, per its own header comment) was scoped this way too.
`pdp-redesign-decide-then-act.md` in that folder is now fully redundant — its epic
([`pdp-redesign`](../01-discovery-and-shopping/pdp-redesign/README.md)) shipped 18/18 stories.

This isn't a content error — the scaffolded epics are fine — but the README's "no file ever moves
between folders" framing no longer matches practice, and it under-explains where ~40% of epics came
from. **Propose:** either (a) update `00-ideas/README.md` to acknowledge `2. readyforscope/` as a
still-used scope-doc staging area until its remaining 6 un-scaffolded docs are migrated to `seeds/`,
or (b) do that migration and retire the folder outright. Either is a Daniel call, not made here.

## Status drift (epic SSOT vs. derived)

`node scripts/build-order.mjs` flags exactly one drift, and it's a known tooling artifact, not a real
status error:

- **Neon egress reduction + DB account isolation + site-wide Clarity** — frontmatter `Archived` vs.
  derived `In progress`. The epic is correctly archived (superseded by
  [`postgres-neon-to-cloudsql`](../09-platform-infra/postgres-neon-to-cloudsql/README.md), closed
  2026-06-22) — the README explains this. The drift is permanent and structural:
  `deriveEpicStatus()` in `scripts/roadmap-to-notion.mjs` can only return `Shipped`/`In
  progress`/`Scaffolded` — it has no path to `Archived`, so any archived epic with open-looking
  sprints will false-flag here forever. **Propose:** add an `Archived` short-circuit to
  `deriveEpicStatus()` (e.g. read the epic README frontmatter directly when it says `archived`) so this
  stops re-appearing on every regeneration. Scripts/tooling change, not a docs change — flagging for
  Daniel to schedule, not doing it in this pass.

No other epic shows drift; the other 60 scaffolded epics' frontmatter and derived status agree.

## Board regenerated?

No. `node scripts/build-order.mjs --check` reports the board is current — `BUILD-ORDER.md` already
reflects today's epic/seed state (61 epics, 8 in the funnel, the 1 known drift above). Nothing to
commit there this pass.

The Notion "Marketplace Roadmap" DB was spot-checked via search and is in sync (recent sync
timestamps present); `.github/workflows/notion-sync.yml` runs nightly + on push, so it will pick up
whatever Daniel applies from this report on the next merge.

---

Advisory only — not a gate. notion-sync.yml propagates after merge.
