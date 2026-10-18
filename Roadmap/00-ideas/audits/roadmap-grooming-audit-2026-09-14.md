# Roadmap grooming audit — 2026-09-14

**Advisory only — no app code touched, nothing merged/deployed.** Follow-up to
[`roadmap-grooming-audit-2026-08-31.md`](roadmap-grooming-audit-2026-08-31.md) (weekly cadence, two
weeks later — no audit ran on 09-07). Same method: read `Roadmap/WAYS-OF-WORKING.md` +
`Roadmap/00-ideas/README.md` for the funnel lifecycle (seed frontmatter `status:` = raw | ready |
queued | scaffolded | in-progress | shipped | archived; once an epic exists, its README frontmatter
`status:` is the SSOT), ran `node scripts/build-order.mjs --check`, `node scripts/doc-format.mjs
--check`, and `node scripts/doc-hygiene.mjs`, cross-checked every epic README's `status:` against its
sprint files and `RETROSPECTIVE.md`, checked every funnel seed's `status:`/`updated:` for staleness,
verified every seed `epic:` link resolves to a real directory, and spot-checked the connected Notion
"Marketplace Roadmap" data source live.

**Bottom line: the funnel is clean and completely unchanged since 08-31 — this repo saw exactly one
commit in the last two weeks, the 08-31 audit itself. No new drift, no stale statuses, nothing new to
correct.**

---

## 1. Zero roadmap activity since 08-31 — worth naming, not a defect

`git log --since=2026-08-31 -- 'Roadmap/**'` returns exactly one commit: the 08-31 audit's own. No
seed, epic, sprint, or retrospective file has changed in two weeks, and no audit ran on the usual
09-07 slot. This is **not** evidence of drift — a frozen doc tree cannot itself go stale — but it does
mean every finding below is a re-verification of 08-31's state, not new information. GitHub access
this pass is scoped to `danybgoode/miyagi-product-management` only, so whether the app repos
(`miyagisanchezcommerce`, `medusa-bonsai-backend`) had activity in this window can't be confirmed from
here; if real product work landed there without a matching roadmap update, it wouldn't surface until
an epic closes.

## 2. `BUILD-ORDER.md`'s "⚠️ Status drift" section (2 entries) — same two standing false positives

Unchanged since 07-20 (five audits running, now six):

| Epic | frontmatter | derived | verdict |
|---|---|---|---|
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | Frontmatter correct — pointer-doc archetype, no `sprint-N.md` files, README carries the full inline close-out. |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | In progress | Shipped | Frontmatter correct — `RETROSPECTIVE.md` explicitly states status stays `in-progress` until Daniel's authenticated operator/Promotor production walkthrough passes. |

No corrections needed. Same standing generator-tuning question as every audit since 07-20 (teach the
generator "no sprint files ⇒ don't guess Scaffolded" / "retro states an explicit close-gate ⇒ don't
guess Shipped," or keep treating this as routine human-judgment noise) — still open, still not
blocking.

## 3. Three in-progress epics — all still legitimately mid-flight

| Epic | Last touch | State |
|---|---|---|
| [`panfleto-premium-shop`](../../03-selling-and-shops/panfleto-premium-shop/README.md) | 2026-08-12 | Sprints 1–2 shipped/live, sprint 3 in progress, sprint 4 not started. Frontmatter matches. Unchanged this pass. |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | 2026-08-17 | Explicit close-gate, see §2. Unchanged this pass. |
| [`reporthub-as-notion`](../../09-platform-infra/reporthub-as-notion/README.md) | 2026-08-12 | Sprints 1–2 shipped, sprint 3 not started. Frontmatter matches. Unchanged this pass. |

No new staleness — these three carried zero doc changes in the window, consistent with §1.

## 4. Everything else checked, no action needed

- **Canonical `status:` enum, repo-wide.** 153 epic READMEs (147 shipped · 3 in-progress · 3 archived)
  and 111 seeds (59 shipped · 39 scaffolded · 7 archived · 3 ready · 3 raw) — identical to 08-31's
  count, zero non-canonical spellings anywhere.
- **Every seed `epic:` link resolves.** Walked all 111 seeds' `epic:` field against the filesystem —
  no broken links (the class of bug fixed in PR #168 for `us-marketplace` has not recurred).
- **No seed sits at `raw`/`ready`/`queued` while its `epic:` points at a real, scaffolded directory** —
  checked all seeds with a non-null `epic:`, all consistent.
- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **`node scripts/doc-format.mjs --check`** → clean (165 enforced paths, 224 advisory findings
  elsewhere — same shape as every prior pass).
- **The 6 funnel seeds still without an epic** — unchanged from every audit since 07-20:
  `affinity-marketplace-infrastructure`, `ai-adoption-maturity-benchmark`, `custom-static-pages`,
  `designer-collaboration-portal`, `spike-compra-protegida`, `spike-supabase-colocation`. All still read
  as genuine low-priority backlog, matching `BUILD-ORDER.md`'s own "seeds in funnel: 6" footer.
  `designer-collaboration-portal` is now ~14 weeks untouched (`updated: 2026-06-08`) — still framed in
  its own body as intentionally deferred ("deferred from #4"), not stalled, but it's the oldest
  standing item in this backlog and worth a deliberate look (confirm still-deferred vs. archive)
  whenever grooming has spare cycles.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-09-14.md`](../DOC-HYGIENE-REPORT-2026-09-14.md), committed alongside this
  audit). Same expected noise as every prior pass: unresolvable `apps/**` source paths (git-ignored in
  this checkout, per `WAYS-OF-WORKING.md`'s documentation map) and the one correct historical "archived
  epic" reference in `LEARNINGS.md` (`neon-egress-and-db-isolation`, explaining why it was superseded).
- **Notion board — spot-checked live.** The "Marketplace Roadmap" data source (`eb68a1fd-…`) shows
  recent (`2026-09-13`) `last_edited_time` on several shipped epic pages (e.g. `sweepstakes`,
  `seller-agent-operations`) despite those epics' own docs being untouched since an August scaffold
  commit — expected: `notion-sync.yml` runs a nightly full-rebuild cron as a drift safety-net
  independent of pushes to `main`, so a fresh sync timestamp with unchanged content is exactly what the
  pipeline is designed to produce, not evidence of an out-of-band edit. A workspace search this pass
  also surfaced an unrelated **"Golden Beans — Marketplace Roadmap"** database whose page paths
  (`Roadmap/02-commercial/...`, `Roadmap/01-growth-engine/...`) don't match this repo's folder scheme at
  all — that is a different product's board (see `LEARNINGS.md`'s references to the separate "Golden
  Beans" event-router codebase) and out of scope for this audit; noting only so a future pass doesn't
  mistake it for our board out of name-similarity.

## Known verification gap (repo-scope limitation, unchanged from every prior pass)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — the two app repos
(`miyagisanchezcommerce`, `medusa-bonsai-backend`) aren't reachable, so recent-commit activity for the
three in-progress epics is taken on faith from their own docs, not cross-checked against those repos'
history. Combined with §1, this means a real app-side change with no matching roadmap update would be
invisible to this audit.

---

### Suggested next step

None required — the funnel is unchanged and clean. Two low-priority, non-blocking items carried
forward for whenever convenient: the standing §2 status-drift generator-tuning question, and a
deliberate yes/no on `designer-collaboration-portal` now that it's the oldest untouched backlog seed
(~14 weeks).

Advisory only — not a gate. `notion-sync.yml` propagates after merge (and nightly, independent of it).
