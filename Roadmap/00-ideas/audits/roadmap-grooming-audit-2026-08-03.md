# Roadmap grooming audit — 2026-08-03

**Advisory only — no app code touched, nothing merged/deployed.** Two-week follow-up to
[`roadmap-grooming-audit-2026-07-20.md`](roadmap-grooming-audit-2026-07-20.md), same method: read
`Roadmap/WAYS-OF-WORKING.md` + `Roadmap/00-ideas/README.md` for the funnel lifecycle (seed frontmatter
`status:` = raw | ready | queued | scaffolded | in-progress | shipped | archived; once an epic exists,
its README frontmatter `status:` is the SSOT), ran `node scripts/build-order.mjs --check`,
`node scripts/doc-format.mjs --check`, and `node scripts/doc-hygiene.mjs`, cross-checked every seed's
and every non-terminal epic's frontmatter against its sprint files and git history, and — same as last
pass — queried the live "Marketplace Roadmap" Notion database directly via the connected MCP.

**Bottom line: the funnel is in good shape, growing fast (139 epics vs 125 two weeks ago), and both
mechanical gates are clean.** One real doc-drift found (§1, a one-line fix), the two owed
retrospectives from the last audit are **still owed and now more overdue** (§2), one new epic is
missing a retrospective but is likely legitimately exempt (§3), the standing status-drift flag is
reviewed and confirmed a false positive again (§4), the Notion board is verified live and current
(§5), and a new institutional-knowledge note about the DoD checklist ritual (§6) — worth recording so
future passes don't waste time on it.

---

## 1. `panfleto-premium-shop` — epic README's Scope table is stale vs. its own `sprint-3.md`

[`03-selling-and-shops/panfleto-premium-shop/README.md`](../../03-selling-and-shops/panfleto-premium-shop/README.md)
Scope table (Sprint 3 row) marks both stories **⬜ not started**:

```
| 3 | The horror convocatoria — created, copy drafted, submission window open | med | ⬜ not started |
| 3 | Voting/excerpt launch plan + share surfaces (announcement, mschz link)  | med | ⬜ not started |
```

But [`sprint-3.md`](../../03-selling-and-shops/panfleto-premium-shop/sprint-3.md) itself opens with
**"🟡 in progress, live pieces landed"** and documents substantial real progress: a production incident
found and fixed mid-sprint (the `bookshop-launchpad` Supabase schema was merged but never applied —
confirmed via `list_migrations` and live Cloud Run logs, then fixed and verified with a real curl
round-trip), a reward listing live (`prod_01KXAHXB98GF5SJEJ8KK0RF3QN`), the announcement bar live, and
the launchpad opt-in/guidelines live and rendering on production. Three of the sprint's five "What I
do" checklist items are still open (publish the seed manuscripts, build/activate the campaign, run the
smoke), so **⬜ not started is wrong but ✅ shipped would also be wrong** — the correct cell is
**🟡 in progress**, matching sprint-3.md's own status line.

**Suggest:** update the two Sprint 3 table cells (and re-check Sprint 4, which correctly reads
⬜ not started and matches its own `sprint-4.md`). One-line, mechanical, no status/board impact —
the epic README frontmatter itself (`status: in-progress`) is already correct.

## 2. Two owed retrospectives — flagged 2026-07-20, still open, now more overdue

Same two items the last audit found, unresolved two weeks later:

- [`github-actions-local-first`](../../09-platform-infra/github-actions-local-first/README.md) —
  shipped 2026-07-16. `RETROSPECTIVE.md` still does not exist (**18 days** since ship, vs. 4 days at
  last audit).
- [`buyer-notifications-money-path`](../../05-trust-offers-and-messaging/buyer-notifications-money-path/README.md)
  — shipped 2026-07-08. `RETROSPECTIVE.md` still exists only as the unfilled scaffold template
  (`_Closed: <date>_` placeholder, all four sections empty). **26 days** since ship, vs. 12 days at
  last audit.

Neither affects `BUILD-ORDER.md` or the Notion board (both correctly bucket these as Shipped — see
§5). Both are small, well-scoped epics; the content should be quick to backfill from the sprint docs.
**Suggest:** land both before the next pass, since this is the second consecutive audit to catch them.

## 3. `merchant-lifecycle-projection` — also missing a retrospective, but likely legitimately exempt

[`08-growth-and-promotions/merchant-lifecycle-projection/README.md`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md)
(shipped 2026-07-22) has no `RETROSPECTIVE.md` either. Unlike §2, this looks intentional rather than an
oversight: the README states up front **"This is a CONSUMER story for someone else's epic. The
authoritative spec lives in the golden-beans repo"**, and its own `## Definition of Done (epic)` list
has no "RETROSPECTIVE.md written" line item (every other DoD checklist in the tree has one) —
consistent with "most of the epic-level DoD lives in the golden-beans repo." Flagging so this
assumption is checked rather than silently assumed correct on the next pass, not as an action item.

## 4. `BUILD-ORDER.md`'s "⚠️ Status drift" section (1 item) — reviewed, false positive

The generated board flags one epic where frontmatter disagrees with the sprint/retro-derived guess:

| Epic | frontmatter | derived | verdict |
|---|---|---|---|
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | **Frontmatter correct — stated explicitly in-doc.** The README's own status section reads *"✅ SHIPPED 2026-07-22. Emit LIVE, receive LIVE, return leg DARK... that is the expected steady state until Daniel's flip"* — a deliberately partial-but-shipped state gated on an action in another repo, not an unfinished epic. |

Same class of false positive the 2026-07-20 audit's §3 named (`home-dynamic-rows-restore-and-polish`,
`dobby-foundation`, `gcp-account-migration`): the sprint/retro-derivation heuristic doesn't know about
an explicit "shipped with a named, documented external dependency" state. Not a docs problem — noting
again so the next pass doesn't re-derive the same conclusion.

## 5. Notion board — verified live and current

Queried the "Marketplace Roadmap" data source directly (SQL against the connected data source, same as
2026-07-20). Epic-grain counts match the local doc scan **exactly** — 136 shipped · 2 in-progress ·
1 archived · 139 total — and every row checked (`panfleto-premium-shop`, `reporthub-as-notion`,
`merchant-lifecycle-projection`, `mercadolibre-sync`) shows the correct `Status` with `Last synced =
2026-08-02` (yesterday), confirming `notion-sync.yml` is firing reliably. Seed-grain rows also
reconcile exactly: 31 Notion rows for `epic: null` seeds vs. 30 local — the one-row difference is
`spike-envia-byo`, correctly auto-archived by the sync's stale-slug cleanup the moment it got scaffolded
into `shipping-provider-expansion` under a different slug (the archive branch patches only `Status`, not
`Last synced`, which is why that one row still shows a `2026-07-05` sync date — a quirk of the archival
code path, not a drift in what it reports). No corrections needed.

## 6. New observation — `## Definition of Done (epic)` checkboxes are not maintained after close (not itself a gap)

Scanning every `status: shipped` epic's DoD checklist for unchecked `- [ ]` items surfaced 27 epics with
partially or **fully** unticked checklists (0/9 boxes checked) — including epics independently confirmed
complete in this pass and in previous audits (`mercadolibre-sync`, `ssrf-dns-pinning`: both have a real,
filled `RETROSPECTIVE.md` on disk despite every DoD box reading `- [ ]`). This means **the checkbox
state is not a reliable completion signal in this repo** — closing an epic updates the frontmatter
`status:`, the sprint files, and the prose, but the DoD checklist markdown itself is routinely left as
the unticked scaffold template. Not a new gap (verified against the underlying artifacts, not the
boxes), but worth recording as a pattern: **don't treat an unticked DoD box alone as evidence of missing
work** — check the actual artifact (retro file, poster entry, sprint status) the box claims to track, as
this pass did. Whether to start actually ticking these at close, or drop the checkbox ritual in favor of
the prose-only signal already in use, is a process call for Daniel — not something to silently "fix" by
bulk-ticking boxes.

## 7. Everything else checked, no action needed

- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **`node scripts/doc-format.mjs --check`** → clean (165 paths enforced, 227 advisory findings
  elsewhere — same noise profile as prior passes).
- **Canonical `status:` enum, repo-wide.** Every epic README (139 total) and every seed (102 total in
  `seeds/`) uses a documented enum value — zero non-canonical spellings.
- **The 10 funnel seeds** (`raw`/`ready`/`queued`, `epic: null`) — `affinity-marketplace-infrastructure`,
  `ai-adoption-maturity-benchmark`, `custom-static-pages`, `designer-collaboration-portal`,
  `miyagi-partners-recruiting-v3`, `spike-compra-protegida`, `us-curated-marketplace`,
  `us-operator-commerce-pilot`, `us-operator-needfinding`, `us-proof-launch` — matches
  `BUILD-ORDER.md`'s own "seeds in funnel: 10" footer exactly. The four US-market seeds and
  `miyagi-partners-recruiting-v3` are freshly queued (`updated: 2026-07-28`, `build_order` set) —
  genuine active backlog, not stalled. `custom-static-pages` (raw, 2026-07-11) and
  `designer-collaboration-portal` (raw, 2026-06-08) are aging but were already called out as
  low-priority backlog in the 2026-07-06 audit — still true, not newly stalled.
- **Prior audit items resolved:** `buy-me-a-coffee-widget` and `url-stuff` (both flagged as
  backlog-not-stalled in 2026-07-20) are now `status: archived`.
- **The other non-terminal epic beyond §1/§4** —
  [`reporthub-as-notion`](../../09-platform-infra/reporthub-as-notion/README.md) (`in-progress`) — its
  own Scope table has no per-story status column to drift, and its sprint files match the README
  narrative (S1/S2 shipped, S3 explicitly gated on a 2–4 week parallel-run checkpoint, not started).
  Consistent, no action.
- **Product poster (`Roadmap/README.md`)** — spot-checked the three epics touched this pass
  (`panfleto-premium-shop`, `merchant-lifecycle-projection`, `reporthub-as-notion`); all three have
  correct, current entries, including `reporthub-as-notion`'s note that its Notion-decommission sprint
  is deliberately still open behind its gate.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-08-03.md`](../DOC-HYGIENE-REPORT-2026-08-03.md), committed alongside this
  audit). Findings are the same expected noise as every prior pass: ~70 "referenced path not found"
  hits are all `apps/**` source files the tool itself can't verify in this checkout (app repos are
  git-ignored here per `WAYS-OF-WORKING.md`'s documentation map), and the one "mentions an archived
  epic" flag (`neon-egress-and-db-isolation` in the poster) is a correct historical reference. Nothing
  needs action.
- **Minor note, not a finding:** [`00-ideas/seeds/agent-native-gtm/`](../../00-ideas/seeds/agent-native-gtm/)
  is a *directory* of nine raw strategy/campaign docs under `seeds/`, which the README describes as
  flat-`.md`-per-idea. The bundle is self-labeled *"raw, pre-scope... will groom into several distinct
  asks — one ask per groom run"* and isn't picked up by `build-order.mjs` (which only reads
  `seeds/*.md` directly, not subdirectories), so it doesn't pollute the funnel count or break tooling.
  Flagging only so a future pass recognizes it as deliberate holding material, not drift.

## Known verification gap (repo-scope limitation, unchanged since 2026-07-06)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — PR numbers cited in
sprint docs against the two app repos (`miyagisanchezcommerce#NNN`, `medusa-bonsai-backend#NN`) are
taken on faith from the docs, same caveat as every prior pass.

---

### Suggested next step
Land the `panfleto-premium-shop` table fix (§1, one line) and the two owed retrospectives (§2, now
overdue two audits running) — small and mechanical. §3 and §4 are standing/likely-false-positive items
worth a decision rather than a doc fix. §6 is a process note for Daniel, not a task. Nothing here blocks
any in-flight work.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
