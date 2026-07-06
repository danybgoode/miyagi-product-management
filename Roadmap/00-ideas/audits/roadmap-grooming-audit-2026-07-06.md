# Roadmap grooming audit — 2026-07-06

**Advisory only — no app code touched, nothing merged/deployed.** This is a periodic hygiene pass over
`Roadmap/` against the lifecycle defined in `Roadmap/WAYS-OF-WORKING.md` and `Roadmap/00-ideas/README.md`
(seed frontmatter `status:` = raw | ready | queued | scaffolded | in-progress | shipped | archived; once
an epic exists, its README frontmatter `status:` is the SSOT). Method: read the two governing docs, ran
`node scripts/build-order.mjs --check` (green — the generated board is current), then cross-checked every
seed's and every epic's frontmatter against its own sprint files, `RETROSPECTIVE.md` presence, and git
history; spot-checked the Notion sync mechanism.

**Bottom line: the funnel is in good, actively-maintained shape.** Nothing found here blocks anything —
these are all doc-hygiene corrections. The one item worth prioritizing is #1 (an epic whose header claims
zero progress while it's actually fully shipped).

---

## 1. CRITICAL — `mercadolibre-sync` header says "not started"; it's fully shipped and live

[`Roadmap/03-selling-and-shops/mercadolibre-sync/README.md`](../../03-selling-and-shops/mercadolibre-sync/README.md)

- Frontmatter: `status: ready` (prose: *"READY — scaffolded, not started"*).
- Reality: all 6 sprint docs are marked `✅ MERGED + DEPLOYED` / `✅ MERGED + LIVE` with real PR refs
  (S1 `be#44`/`fe#139`, S2 `be#45`, S3 `be#46`, S4 `be#49`, S5 `be#52`/`fe#153`, S6 `be#53,#54`/`fe#154`,
  all 2026-06-30/07-01, S6 explicitly **LIVE**), plus a same-epic follow-up commit 2026-07-02 (`fe#155`).
  It's also cited elsewhere in the roadmap as "the live `mercadolibre-sync` epic." No `RETROSPECTIVE.md`
  exists yet either.
- **Why the automated drift check missed this:** `scripts/roadmap-to-notion.mjs`'s `EPIC_FM_TO_BUCKET`
  map only recognizes `shipped | in-progress | scaffolded | queued | archived`. `ready` isn't in it, so
  `frontmatterStatusBucket()` returns `null` and the code falls back to the sprint-derived status
  *as if it were* the frontmatter value (`status = frontmatterStatusBucket(fm) || statusDerived`). That
  makes `status` and `status_derived` identical by construction, so the drift detector
  (`status_derived !== status`) can never fire — this is the worst mismatch in the repo and it's
  structurally invisible to `BUILD-ORDER.md`'s own "⚠️ Status drift" section. It only landed in the
  generated board's "✅ Shipped" bucket by accident (the derivation happened to agree with reality).
- **Suggested fix:** set `status: shipped`, add a `RETROSPECTIVE.md`. Separately worth a small follow-up
  ticket against `scripts/roadmap-to-notion.mjs`: hard-fail (or loudly warn) on an unrecognized epic
  `status:` value so an invalid enum value can't silently defeat the drift check again — hard-fail, not
  widening the map: the documented epic enum is `scaffolded → in-progress → shipped` / `archived`, and
  adding `ready` to `EPIC_FM_TO_BUCKET` would legitimize a value the docs don't define. Not done in
  this PR (tooling change, out of scope for a docs-only pass).

## 2. Already-known drift, resolved by inspection

`BUILD-ORDER.md`'s generated "⚠️ Status drift" section already flags 2 epics. Read both to determine
which side (frontmatter vs. mechanical derivation) is actually right:

- [`custom-print-products`](../../03-selling-and-shops/custom-print-products/README.md) —
  frontmatter `scaffolded`, derived `in-progress`. **Derivation is right, frontmatter is stale.**
  Sprint 1 is done (Daniel smoke-confirmed 2026-07-04), Sprint 2 fully merged 2026-07-06
  (`be#60`, `fe#175`, `fe#176`), Sprints 3–4 explicitly "⬜ not started." → **suggest correcting
  frontmatter to `status: in-progress`.**
- [`ml-orders-native`](../../03-selling-and-shops/ml-orders-native/README.md) — frontmatter
  `in-progress`, derived `shipped`. **Frontmatter is right, derivation is the false positive.** Sprint
  1+2 are merged, but Sprint 3 still has **draft, unmerged PRs** (`be#59`, `fe#174`) and the epic is
  explicitly still dark behind the `ml.orders_enabled` flag pending prod migration + Daniel's live smoke.
  No `RETROSPECTIVE.md` (correctly absent — it hasn't closed). → **no change needed**; the mechanical
  derivation is what's wrong here, not the doc.

## 3. Non-canonical `status:` values on epic READMEs (bypass the documented enum)

Beyond `mercadolibre-sync` above, four more epics use a status string outside
`scaffolded | in-progress | shipped | archived`. Content-wise these three are accurate — just the wrong
spelling — but per #1, a non-canonical value isn't purely cosmetic: it silently defeats the automated
drift check, so it's worth normalizing all of these in one pass:

| Epic | current `status:` | actual state | suggested fix |
|---|---|---|---|
| [`profit-analyzer`](../../03-selling-and-shops/profit-analyzer/README.md) | `ready` | scaffolded, 0/6 stories, explicitly gated on `ml-orders-native` shipping first — not started | `scaffolded` |
| [`envia-killswitch`](../../04-shipping-and-delivery/envia-killswitch/README.md) | *(no YAML frontmatter block at all)* | shipped 4/4 stories per checkboxes; prose states the owed live smoke ("awaiting Daniel's live smoke, 2026-06-26"); no `RETROSPECTIVE.md` | add a real frontmatter block — `status: shipped` (repo convention: fully-merged epics with an owed Daniel smoke stay `shipped` with the smoke stated in prose — cf. `subdomain-pricing`, `custom-domain-paywall`, `promoter-program`); `RETROSPECTIVE.md` owed |
| [`seller-landing-launch-polish`](../../08-growth-and-promotions/seller-landing-launch-polish/README.md) | `Done` | 2/2 sprints merged, `RETROSPECTIVE.md` exists | `shipped` |
| [`feature-flags-inhouse`](../../09-platform-infra/feature-flags-inhouse/README.md) | `complete` | 3/3 sprints merged + deployed, `RETROSPECTIVE.md` exists | `shipped` |

`envia-killswitch` having no frontmatter at all means it's entirely invisible to the SSOT mechanism the
rest of the funnel relies on — `BUILD-ORDER.md` only shows it correctly by falling back to a
checkbox-derived guess.

## 4. Seed frontmatter (`Roadmap/00-ideas/seeds/*.md`) — funnel hygiene

Read all 51 seeds plus the legacy `2. readyforscope/` and `1. raw/` folders. `BUILD-ORDER.md`'s funnel
section correctly lists every seed with `epic: null` and `status` in {raw, ready, queued} — no seed is
silently dropped by an unrecognized status value in the funnel view. Flags:

- [`spike-envia-byo.md`](../../00-ideas/seeds/spike-envia-byo.md) — `status: seed`, which is not
  one of the 7 valid values. `epic:` is already set to `04-shipping-and-delivery/shipping-provider-expansion`
  (whose README is `status: scaffolded` and folds this spike in as its Sprint 1), so it doesn't corrupt
  the board, but the value is wrong and the body's inline "Status: Seed, awaiting groom" line is stale
  (predates the epic being scaffolded around it, 2026-07-05). **Suggest:** `status: scaffolded` + refresh
  the inline status line.
- [`events-quantity-selector.md`](../../00-ideas/seeds/events-quantity-selector.md) — frontmatter
  says `status: scaffolded`, but the body banner says *"READY — not scaffolded"*, while `epic:` now points
  at `10-events-and-ticketing/events-quantity-selector`, whose epic README is `status: shipped` (3/3
  stories, listed under BUILD-ORDER's Shipped bucket). Three signals disagree. **Suggest:** flip to
  `status: shipped` (or mark the seed funnel-only/stale) and fix the body banner.
- [`2. readyforscope/events-quantity-selector.md`](<../../00-ideas/2. readyforscope/events-quantity-selector.md>)
  (legacy) — top banner still reads *"awaiting Daniel approval — no code yet"* even though the epic above
  is fully shipped. **Suggest:** stamp a one-line "shipped — see epic README" pointer at the top, the way
  other legacy docs (e.g. `custom-domain-paywall.md`) already do.
- [`2. readyforscope/envia-flagsmith-killswitch.md`](<../../00-ideas/2. readyforscope/envia-flagsmith-killswitch.md>)
  (legacy) — its banner still reads *"awaiting Daniel approval — no code yet,"* while the epic it became
  ([`envia-killswitch`](../../04-shipping-and-delivery/envia-killswitch/README.md)) is fully shipped per
  `BUILD-ORDER.md` (4/4 stories; the epic README itself carries the later "merged — deploying, awaiting
  Daniel's live smoke, 2026-06-26" note). **Suggest:** stamp a one-line "shipped — see epic README"
  pointer at the top, same as the `events-quantity-selector` legacy doc above.
- [`buyer-notifications-money-path.md`](../../00-ideas/seeds/buyer-notifications-money-path.md) —
  `build_order: "#5b"` already set while `status: ready`; per the status table, `queued` = "accepted into
  BUILD-ORDER.md," so having a build-order id while still `ready` reads inconsistently. `updated:
  2026-06-14` (3+ weeks stale) at `priority: wave-2` — exactly the "should be moving" case worth a
  second look. **Suggest:** flip to `status: queued` if #5b is truly locked in (or clear `build_order`
  back to `null` until it is), and refresh `updated:`.
- [`spike-arranged-only-delivery.md`](../../00-ideas/seeds/spike-arranged-only-delivery.md) — same
  pattern, more stale: `build_order: "#3c-S0"` set, `status: ready`, `updated: 2026-06-08` (~4 weeks),
  `priority: wave-3`. **Suggest:** same reconciliation as above.

**Verified healthy, no action needed:** the other ~45 seeds are internally consistent (status matches
linked epic where one exists, dates are current, no other invalid enum values); the raw/ready funnel
seeds without a build-order id (`buy-me-a-coffee-widget`, `designer-collaboration-portal`,
`rental-backend-line-item-pricing`, `spike-compra-protegida`, `url-stuff`) are genuinely just
low-priority backlog, not stale; the two `archived` seeds (`sweepstakes-epic-plan.md`, `theming-system.md`)
correctly self-declare supersession; `own-shop-premium-presentation` (present in both `1. raw/` and
`2. readyforscope/`) is a normal same-day raw→scoped→in-progress progression, not a duplicate.

## 5. Epic activity / retrospective sweep — no stalled epics; two owed retrospectives

- **Recency:** every epic currently `in-progress` / `scaffolded` (and the mislabeled `ready` ones above)
  has commits touching its folder within the last 1–5 days as of 2026-07-06. None show the multi-week
  silence that would indicate an abandoned epic.
- **`RETROSPECTIVE.md` presence:** every epic whose frontmatter status is `shipped` (including the
  `Done`/`complete` spellings in §3) has a real, dated `RETROSPECTIVE.md`. Two *effectively-shipped*
  epics lack one: `mercadolibre-sync` (§1) and `envia-killswitch` (§3) — both owed alongside their
  status corrections. The one placeholder stub found
  (`09-platform-infra/dobby-foundation`, still `scaffolded`) is expected pre-close, not a mismatch.
- **"✅ COMPLETE" title vs. frontmatter:** no genuine mismatches — every epic whose title/status line
  reads "✅ COMPLETE" carries `shipped` or one of the non-canonical equivalents above.
- **Sprint checkbox sweep:** no `scaffolded` epic has a prematurely-ticked story. Several `shipped` epics
  (`custom-domain-checkout`, `own-shop-experience`, `support-widget`, `seasonal-theme-engine`,
  `sweepstakes`, `cicd-telegram-notifications`, `design-token-foundation`, `feature-flags-killswitches`)
  have unticked `- [ ]` lines, but every case checked is an explicit "owed to Daniel" money/auth smoke or
  a documented backlog follow-on — the intended convention per `WAYS-OF-WORKING.md`, not real
  incompleteness.

## 6. Tooling caveat (not a docs bug) — `BUILD-ORDER.md`'s per-epic story-count is unreliable for ~20+ epics

While investigating §1–3, this surfaced independently: `countStories()` in
`scripts/roadmap-to-notion.mjs` only counts a story as "done" when the ✅ appears literally on the
`## US-N.N` / `### Story N.N` heading line itself. A large number of epics instead mark completion in a
summary table or a `**Status:**` line above the headings, leaving the headings themselves un-checked —
`grep` across all `sprint-*.md` files found **34 sprint files across ~20 epics** with this pattern,
including `mercadolibre-sync`, `profit-analyzer`, `custom-slugs`, `subdomain-pricing`, `support-widget`,
`seasonal-theme-engine`, `promoter-program`, `promoter-funnel-v2`, `design-token-foundation`,
`feature-flags-killswitches`, and `cicd-telegram-notifications`. Concretely verified on
`promoter-funnel-v2`: `BUILD-ORDER.md` shows "7/19 stories" for an epic whose own README/DoD/
`RETROSPECTIVE.md` confirm all 6 sprints fully merged 2026-07-03. This doesn't affect the epic-level
Shipped/In-progress/Scaffolded bucket (that's driven by frontmatter, not story counts) — only the
displayed fraction, which understates real progress and could read as "barely started" for a genuinely
finished epic. **Flagging for whoever next touches `countStories()`; no script change made here** — this
PR is docs-only per its scope.

## 7. Notion board sync — mechanism looks healthy, couldn't verify live state directly

- `.github/workflows/notion-sync.yml` re-syncs on every push to `main` touching `Roadmap/**` (plus a
  nightly 08:00 UTC cron safety net and manual `workflow_dispatch`). Roadmap-touching commits landed on
  `main` multiple times today, so the mechanism itself is exercised constantly and looks healthy.
- Could **not** directly query the live "Marketplace Roadmap" Notion database (row-level `Status` /
  `Last synced` values) via the connected Notion MCP tools — both `query_data_sources` (SQL) and
  `query_database_view` returned `validation_error: requires a Business plan or higher with Notion AI`,
  which this workspace doesn't have. So the Notion board's actual current values are **unverified by this
  audit** — only the sync *mechanism* (workflow triggers + the shared extractor script) was checked.
- Whatever gaps the extractor has (§1, §3, §6 above) apply identically to the Notion projection, since
  `scripts/roadmap-to-notion.mjs` feeds both `BUILD-ORDER.md` and the Notion sync from the same code path.
- **Suggest:** a manual spot-check of `mercadolibre-sync`, `custom-print-products`, and
  `feature-flags-inhouse` rows in the Notion DB (linked from
  [`00-ideas/seeds/notion-roadmap-sync.md`](../../00-ideas/seeds/notion-roadmap-sync.md)) once
  §1–3's frontmatter fixes land, to confirm the next sync run picks them up.

## Known verification gap (repo-scope limitation)

This audit's GitHub access is scoped to `danybgoode/miyagi-product-management` only. Many epic/sprint
docs cite PR numbers in the separate app repos (`miyagisanchezcommerce#NNN`,
`medusa-bonsai-backend#NN`) as evidence of what shipped — those PRs' existence/merge state were taken on
faith from the docs and could not be independently verified against live GitHub state. Only §1
(`mercadolibre-sync`) surfaced a case where the sprint-level PR evidence and the epic-level status
frontmatter flatly contradicted each other; nothing else here suggested the cited PRs are inaccurate.

---

### Suggested next step
Land the frontmatter corrections in §1–3 (5 one-line `status:` edits + 1 new frontmatter block) and the
seed corrections in §4 in a small follow-up docs PR, then regenerate `BUILD-ORDER.md`
(`node scripts/build-order.mjs`) in that same PR per the epic Definition-of-Done. The two owed
`RETROSPECTIVE.md`s (§5: `mercadolibre-sync`, `envia-killswitch`) are a proper close-out task, not a
mechanical edit — they can follow separately. This PR intentionally makes none of those changes itself —
it's the advisory flag list only.
