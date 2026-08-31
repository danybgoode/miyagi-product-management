# Roadmap grooming audit — 2026-08-31

**Advisory only — no app code touched, nothing merged/deployed.** Follow-up to
[`roadmap-grooming-audit-2026-08-24.md`](roadmap-grooming-audit-2026-08-24.md) (weekly cadence, one
week later). Same method: read `Roadmap/WAYS-OF-WORKING.md` + `Roadmap/00-ideas/README.md` for the
funnel lifecycle (seed frontmatter `status:` = raw | ready | queued | scaffolded | in-progress |
shipped | archived; once an epic exists, its README frontmatter `status:` is the SSOT), ran
`node scripts/build-order.mjs --check`, `node scripts/doc-format.mjs --check`, and
`node scripts/doc-hygiene.mjs`, cross-checked every epic README's `status:` against its sprint files
and `RETROSPECTIVE.md`, checked every funnel seed's `status:`/`updated:` for staleness, and spot-checked
the connected Notion "Marketplace Roadmap" data source live.

**Bottom line: the funnel is clean. Both items open from the 08-24 audit are now resolved, and nothing
new surfaced this pass.**

---

## 1. Both 08-24 findings are resolved — verified against code and live Notion

- **§1 (malformed `epic:` field on `us-marketplace`)** — fixed in PR #168
  (`fix(roadmap+recap): the seed→epic join, and the recap that could not post`).
  [`seeds/us-marketplace.md`](../seeds/us-marketplace.md) now reads
  `epic: "07-agentic-and-federated-commerce/us-marketplace"`. **Verified live** against the connected
  Notion data source (`collection://b03c3322-…`, "Marketplace Roadmap"): the `us-marketplace` epic row
  now shows `Priority: next`, `Risk: High` (both previously null), `Last synced: 2026-08-30`. The
  Priority/Risk gap is fully closed, in the docs and in the live board.
- **§2 (`github-actions-local-first` missing `RETROSPECTIVE.md`)** — written in commit `ee4a2bf`
  (`fix(session-resume) + docs: a finished draft is stale too, and the retrospective owed since 07-20`).
  [`09-platform-infra/github-actions-local-first/RETROSPECTIVE.md`](../../09-platform-infra/github-actions-local-first/RETROSPECTIVE.md)
  now exists.

Only two roadmap-touching commits landed between 08-24 and today, and both were closing out these exact
findings — the funnel saw no other churn this week.

## 2. `BUILD-ORDER.md`'s "⚠️ Status drift" section (2 entries) — same two false positives, standing note

Unchanged from every audit since 07-20:

| Epic | frontmatter | derived | verdict |
|---|---|---|---|
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | Frontmatter correct — pointer-doc archetype with no `sprint-N.md` files, README carries the full inline close-out. |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | In progress | Shipped | Frontmatter correct — `RETROSPECTIVE.md` explicitly states status stays `in-progress` until Daniel's authenticated operator/Promotor production walkthrough passes. |

No corrections needed. Same standing question as the last four audits: whether to teach the generator
"no sprint files ⇒ don't guess Scaffolded" and "retro states an explicit close-gate ⇒ don't guess
Shipped," or keep treating this as routine human-judgment noise. Still open, still not blocking.

## 3. Three in-progress epics — all legitimately mid-flight, no staleness

| Epic | Last touch | State |
|---|---|---|
| [`panfleto-premium-shop`](../../03-selling-and-shops/panfleto-premium-shop/README.md) | 2026-08-12 | Sprints 1–2 shipped/live, sprint 3 in progress, sprint 4 not started. Frontmatter matches. |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | 2026-08-17 | Explicit close-gate, see §2 above. |
| [`reporthub-as-notion`](../../09-platform-infra/reporthub-as-notion/README.md) | 2026-08-12 | Sprints 1–2 shipped, sprint 3 not started. Frontmatter matches. |

`panfleto-premium-shop` and `reporthub-as-notion` both carry a `RETROSPECTIVE.md` that's still the
unfilled scaffold template (`_Closed: <date>_`, empty sections) — expected for an in-progress epic
(the template is scaffolded up front), not a genuine finding, and clearly distinguishable from a real
retro (contrast `miyagi-partners-recruiting-v3`'s, which is fully written). Noting only so the next pass
doesn't re-discover it as new.

## 4. Everything else checked, no action needed

- **Canonical `status:` enum, repo-wide.** 153 epic READMEs (147 shipped · 3 in-progress · 3 archived)
  and 111 seeds (59 shipped · 39 scaffolded · 7 archived · 3 ready · 3 raw) — zero non-canonical
  spellings anywhere. Epic count is unchanged from 08-24; the shipped count moved 146→147 because
  `hyper-performant-runtime` closed cleanly in between (`#166`, poster updated in the same commit).
- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **`node scripts/doc-format.mjs --check`** → clean (165 enforced paths, 224 advisory findings
  elsewhere — same shape as every prior pass, nothing newly enforced-and-broken).
- **The 6 funnel seeds still without an epic** — unchanged from 07-20/08-24:
  `affinity-marketplace-infrastructure`, `ai-adoption-maturity-benchmark`, `custom-static-pages`,
  `designer-collaboration-portal`, `spike-compra-protegida`, `spike-supabase-colocation`. All still
  read as genuine low-priority backlog, matching `BUILD-ORDER.md`'s own "seeds in funnel: 6" footer.
  `designer-collaboration-portal` is now ~12 weeks untouched (`updated: 2026-06-08`) but its body still
  frames it as intentionally deferred ("deferred from #4"), not stalled.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-08-31.md`](../DOC-HYGIENE-REPORT-2026-08-31.md), committed alongside this
  audit). Same expected noise as every prior pass: unresolvable `apps/**` source paths (git-ignored in
  this checkout, per `WAYS-OF-WORKING.md`'s documentation map) and the one correct historical "archived
  epic" reference in `LEARNINGS.md` (`neon-egress-and-db-isolation`, explaining why it was superseded).
- **Notion board — spot-checked live, current.** `us-marketplace` (§1) shows `Last synced: 2026-08-30`
  with correct Priority/Risk; nothing else this pass gave reason to doubt the sync.

## Known verification gap (repo-scope limitation, unchanged from every prior pass)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — the two app repos
(`miyagisanchezcommerce`, `medusa-bonsai-backend`) aren't reachable, so PR numbers and recent-commit
activity cited in sprint docs for `panfleto-premium-shop` and `reporthub-as-notion` are taken on faith
from the docs, not cross-checked against those repos' own history.

---

### Suggested next step

None required — both items owed from 08-24 are closed, and nothing new was found. §2 (status-drift
false positives) is the same standing generator-tuning question as the last four audits: worth a
decision whenever convenient, not urgent.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
