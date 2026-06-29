<!-- One-off advisory artifact from a roadmap-hygiene pass (Routine C). Not a generated file like
     BUILD-ORDER.md — this is a dated report, kept for history. Findings are proposals only; no
     seed/epic frontmatter was changed by this pass. -->

# Roadmap hygiene report — 2026-06-29

🤖 **Routine C — weekly roadmap hygiene (Claude, cloud).** Advisory docs PR — review & merge by hand;
nothing here gates.

Ran the full funnel/epic/board check described in `Roadmap/WAYS-OF-WORKING.md` and
`Roadmap/00-ideas/README.md` against the live repo (commits, frontmatter, sprint/retrospective docs,
the generator scripts, and the Notion "Marketplace Roadmap" DB). No seed or epic `status:` frontmatter
was edited — per the established rule, status changes are a human call; this report only proposes
them. The three stale-seed and one umbrella-seed findings from
[`HYGIENE-REPORT-2026-06-24.md`](HYGIENE-REPORT-2026-06-24.md) (PR #40) are confirmed fixed —
`notion-roadmap-sync`, `process-scaffolding-and-00-ideas`, `kill-switch-at-grooming`, and
`remaining-audit-polish` all now read `status: shipped`.

## Funnel grooming

Swept all 51 files in `seeds/`. One has a non-canonical `status:` value and one is stale relative to
its scaffolded epic:

- **[`spike-envia-byo.md`](seeds/spike-envia-byo.md)** — `status: seed`. That's not one of the seven
  canonical funnel values (`raw|ready|queued|scaffolded|in-progress|shipped|archived`) defined in
  `Roadmap/00-ideas/README.md`. The doc's own body says "Status: Seed, awaiting groom" and `epic: null`
  is correctly unset — the content is accurate, only the frontmatter literal is wrong.
  `scripts/roadmap-to-notion.mjs`'s `SEED_STATUS_LABEL` lookup silently falls back to `'Raw'` for any
  unrecognized key, so today this happens to render correctly on the board by coincidence, not by
  contract. **Propose:** `raw` (matches the prose and avoids relying on the silent fallback).
- **[`events-quantity-selector.md`](seeds/events-quantity-selector.md)** — `status: scaffolded`,
  `updated: 2026-06-21`. Its linked epic,
  [`10-events-and-ticketing/events-quantity-selector`](../10-events-and-ticketing/events-quantity-selector/README.md),
  is `status: shipped` (closed 2026-06-22, BE PR #33 + FE PR #100 + docs PR #27, with the
  `events.quantity_enabled` Flagsmith flag and "owed to Daniel" items already tracked there). Per the
  SSOT rule, the epic README is authoritative once `epic:` is set, so this doesn't affect the board —
  but the seed's own frontmatter is one week stale. **Propose:** `shipped`.

No orphan `epic:` links and no seeds missing required frontmatter fields.

### Heads-up, not a flag

- **[`seller-landing-launch-polish`](../08-growth-and-promotions/seller-landing-launch-polish/README.md)** —
  epic frontmatter reads `status: Done` (capitalized, non-canonical) instead of `shipped`. The epic is
  genuinely complete (2 sprints, PR #133 + #134, `RETROSPECTIVE.md` present, only a real-device mobile
  pass owed to Daniel) — the content is right, only the literal string is wrong.
  `EPIC_FM_TO_BUCKET` in `scripts/roadmap-to-notion.mjs` doesn't recognize `Done`, so
  `frontmatterStatusBucket()` returns `null` and the generator silently falls through to the
  *derived* status instead of trusting this epic's own frontmatter. Checked `--extract` output: the
  derived status for this epic also resolves to `Shipped`, so **today there is no visible board
  drift** — but the "epic README frontmatter is SSOT" contract is being bypassed by luck, not by
  design. If a future re-scope ever made the derived status disagree, this epic would silently show
  the wrong bucket. **Propose:** normalize the literal to `shipped` (cosmetic, low-risk).
- **[`notion-board-hygiene`](../09-platform-infra/notion-board-hygiene/README.md)** — `status: shipped`
  is accurate; its one remaining action ("board-grouping UI flip") is already explicitly logged in its
  own README as owed to Daniel, not something this pass needs to re-flag.

## Status drift (epic SSOT vs. derived)

`node scripts/build-order.mjs --check` reports **the board is up to date** — zero drift, 65 shipped
epics, 0 building/ready, 8 in the funnel. (The one structural drift noted in the 2026-06-24 report —
the archived Neon-egress epic permanently false-flagging because `deriveEpicStatus()` has no `Archived`
path — was already proposed as a script fix there and remains open; not re-litigating it here.)

### Tooling gap found this pass (not a content error)

22 of the 65 shipped epics display `0/N stories` in `BUILD-ORDER.md`'s `sprint_progress` column despite
being fully shipped (spot-checked
[`contextual-agent-handoff`](../07-agentic-and-federated-commerce/contextual-agent-handoff/README.md),
which has 7/7 stories actually done across two sprints with `**Status:** ✅ SHIPPED` lines and PR
references). Root cause: `countStories()` in `scripts/roadmap-to-notion.mjs` only counts a story as done
when its own `### Story N.N` heading line contains an inline ✅; many sprint docs instead mark
completion on a separate `**Status:** ✅ SHIPPED ...` line below the heading (correctly parsed by the
sibling `deriveSprintStatus()` function for sprint-level status, but that result isn't fed into the
story counter). Full list of affected slugs: `homepage-seleccion-curation`, `gem-claim-loop`,
`printed-edition-builder`, `contextual-agent-handoff`, `custom-domain-paywall`, `custom-slugs`,
`domain-coupon-mint-fix`, `short-links`, `subdomains`, `marketplace-positioning-meta`,
`seasonal-theme-engine`, `admin-consolidation`, `backend-production-readiness`,
`cicd-telegram-notifications`, `cross-agent-code-review`, `cross-agent-review-always`,
`design-token-foundation`, `devops-reliability-cleanup`, `feature-flags-killswitches`,
`seller-nav-consolidation`, `site-wide-analytics-gtm`, `events-and-ticketing`. **Propose:** have
`countStories()` treat a sprint whose `deriveSprintStatus()` result is shipped as fully done for that
sprint's stories, rather than re-deriving completion from headings alone. Scripts/tooling change, not a
docs change — flagging for Daniel to schedule, not doing it in this pass.

## Board regenerated?

No. `--check` confirms `BUILD-ORDER.md` already reflects today's epic/seed state. Nothing to commit
there this pass.

The Notion "Marketplace Roadmap" DB could only be spot-checked this pass, not bulk-audited —
`notion-query-data-sources` and `notion-query-database-view` both rejected with *"This tool requires a
Business plan or higher with Notion AI"* on this workspace. Used `notion-search` +
`notion-fetch` per-page instead: spot-checked `sweepstakes`, `pdp-redesign`, and
`events-quantity-selector`; all three show `Status: Shipped` with sync timestamps (2026-06-28) newer
than the last `Roadmap/` commit (2026-06-26) — no staleness found in the sample, but this is not full
coverage of the ~66-row board.

---

Advisory only — not a gate. notion-sync.yml propagates after merge.
