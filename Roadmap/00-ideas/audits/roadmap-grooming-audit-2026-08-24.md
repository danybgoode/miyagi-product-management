# Roadmap grooming audit — 2026-08-24

**Advisory only — no app code touched, nothing merged/deployed.** Follow-up to
[`roadmap-grooming-audit-2026-07-20.md`](roadmap-grooming-audit-2026-07-20.md) (previously weekly:
07-06 → 07-13 → 07-20; this pass lands ~5 weeks later). Same method: read `Roadmap/WAYS-OF-WORKING.md`
+ `Roadmap/00-ideas/README.md` for the funnel lifecycle (seed frontmatter `status:` = raw | ready |
queued | scaffolded | in-progress | shipped | archived; once an epic exists, its README frontmatter
`status:` is the SSOT), ran `node scripts/build-order.mjs --check` and `node scripts/doc-hygiene.mjs`,
cross-checked every seed's and every epic's frontmatter against its sprint files, `RETROSPECTIVE.md`,
and — new this pass — a direct SQL cross-check of every seed's `epic:` field against the epic directory
it's supposed to resolve to, plus a live spot-check against the connected Notion "Marketplace Roadmap"
data source.

**Bottom line: the funnel is in good shape overall.** One genuine bug found this pass (§1 — a malformed
`epic:` field that's silently dropping Priority/Risk for the #1 build-order epic in the live Notion
board), one retro debt still unresolved from 07-20 (§2), and the two epics BUILD-ORDER currently flags
as status drift are both false positives on inspection (§3) — same class the last three audits kept
finding. Nothing here blocks any in-flight work.

---

## 1. `us-marketplace` seed's `epic:` field is malformed — dropping Priority/Risk in live Notion

[`00-ideas/seeds/us-marketplace.md`](../seeds/us-marketplace.md) — frontmatter:

```yaml
epic: us-marketplace
```

Every other seed with a scaffolded epic points at the **full path**,
e.g. `epic: "07-agentic-and-federated-commerce/agent-connection"` — this is the only one in the whole
`seeds/` directory missing the macro-area prefix. The epic itself
([`07-agentic-and-federated-commerce/us-marketplace`](../../07-agentic-and-federated-commerce/us-marketplace/README.md))
exists, is `status: shipped`, and is correctly listed in `BUILD-ORDER.md` — **this does not affect the
generated board**, because `scripts/build-order.mjs` resolves epics by scanning directories, not by
reading the seed's `epic:` field back.

It **does** break `scripts/roadmap-to-notion.mjs`, which joins each epic row to its seed via
`seedByEpic.get(`${macro}/${slug}`)` (`roadmap-to-notion.mjs:322-329`) to pull `Priority` and `Risk` —
there is no epic-frontmatter fallback for those two fields (unlike `build_order`, which does have one).
Because the seed's `epic:` value (`us-marketplace`) never matches the lookup key
(`07-agentic-and-federated-commerce/us-marketplace`), every sync silently joins against `{}` for this
epic.

**Verified live** against the connected Notion data source (`collection://b03c3322-…`, "Marketplace
Roadmap"), synced today (`Last synced: 2026-08-24`):

| Slug | Grain | Priority | Risk |
|---|---|---|---|
| `us-marketplace` | Epic | **null** | **null** |
| `us-marketplace--s1` … `--s6` (all 7 sprint rows) | Sprint | **null** | **null** |
| `panfleto-premium-shop` (well-formed sibling, for contrast) | Epic | Wave 1 | High | 
| `miyagi-partners-recruiting-v3` (well-formed sibling, for contrast) | Epic | Wave 1 | High |

`us-marketplace` carries `build_order: 1` — the single highest-priority item in the entire roadmap — and
its Priority/Risk columns have been silently blank in the live board since this field was set
(`updated: 2026-08-10`).

**Suggested fix:** one-line frontmatter correction —

```yaml
epic: "07-agentic-and-federated-commerce/us-marketplace"
```

— then let the next `notion-sync.yml` run (push-to-main trigger) repopulate Priority/Risk for the epic
and its 7 sprint rows. No script change needed to fix this specific case; a script hardening — an
epic-frontmatter fallback for Priority/Risk mirroring the existing `build_order` fallback, so a future
malformed `epic:` field degrades to "epic's own values" instead of silently blank — is a reasonable
follow-up but out of scope for a docs-only advisory pass.

## 2. `github-actions-local-first` still owes its `RETROSPECTIVE.md` — unresolved since 07-20

Flagged in the 2026-07-20 audit ("1 sprint, small scope — should be quick") and still missing over a
month later:
[`09-platform-infra/github-actions-local-first`](../../09-platform-infra/github-actions-local-first/README.md)
is `status: shipped`, sprint-1 reads *"✅ shipped — 2026-07-16"* plus a dated
*"Post-epic correction (2026-07-19)"* addendum, but no `RETROSPECTIVE.md` file exists in the epic
directory. **Suggest:** write it — the sprint doc already has the full narrative to draw from.

**Separately noted, not the same class of gap:**
[`08-growth-and-promotions/merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md)
is also `status: shipped` with no `RETROSPECTIVE.md` and no `sprint-N.md` files at all — but this epic is
explicitly a **cross-repo pointer doc** ("This doc exists so a future agent working in *this* repo can
find the feature. It is a pointer, not a second source of truth" — the authoritative spec lives in the
`golden-beans` repo). Its README already carries a full close-out record inline (a "Status — ✅ SHIPPED
2026-07-22" section with PR link, migration IDs, smoke results, and a follow-up runbook). Whether the
Definition of Done's retrospective requirement should apply to this pointer-epic archetype, or whether
the inline section already satisfies it, is a human call — flagging rather than deciding.

## 3. `BUILD-ORDER.md`'s "⚠️ Status drift" section (2 entries) — both false positives on inspection

| Epic | frontmatter | derived | verdict |
|---|---|---|---|
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | **Frontmatter correct.** README body states *"Status — ✅ SHIPPED 2026-07-22"* with prod PR `#298`, two applied migrations, and a live-verified smoke record. The derivation guesses "Scaffolded" only because there are no `sprint-N.md` files to read from — expected for this pointer-doc archetype (see §2). |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | In progress | Shipped | **Frontmatter correct — stated explicitly in-doc.** `RETROSPECTIVE.md`: *"epic status remains in progress only for the authenticated operator and Promotor production walkthrough … Only after those pass may the epic move from `in-progress` to `shipped`."* Both sprints and the retro are merged/written, which is exactly what makes the derivation guess "Shipped" — it doesn't know about the explicit smoke-owed close-gate. Same false-positive class the 07-20 audit found in `dobby-foundation`/`gcp-account-migration`. |

No corrections needed. This is the fourth audit in a row where the drift section's flagged epics turn
out to be correct-as-written pointer/close-gate cases rather than actual staleness — worth the same
standing note as 07-20: a decision on whether to teach the generator about "no sprint files = don't
guess Scaffolded" and "retro exists but states an explicit close-gate = don't guess Shipped," or to keep
treating this as routine human-judgment noise, is still open.

## 4. Notion board — spot-checked, current except for §1

All rows checked (`merchant-lifecycle-projection`, `miyagi-partners-recruiting-v3`,
`panfleto-premium-shop`, `us-marketplace` + its 7 sprints) show `Last synced: 2026-08-24` (today),
confirming `.github/workflows/notion-sync.yml` is still firing reliably on push-to-main. `Status` values
match docs frontmatter for every sampled row. The only live discrepancy found is the Priority/Risk gap
in §1.

## 5. Everything else checked, no action needed

- **Canonical `status:` enum, repo-wide.** 153 epic READMEs (146 shipped · 4 in-progress · 3 archived)
  and 111 seeds (59 shipped · 39 scaffolded · 7 archived · 3 ready · 3 raw) — zero non-canonical
  spellings anywhere, on either side.
- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **Seed-status-vs-linked-epic-status cross-check (84 seeds with `epic:` set, scripted).** Every case
  where the seed stays `status: scaffolded` while its epic has since moved to `in-progress`/`shipped` is
  the documented, intended behavior — `00-ideas/README.md`: once `epic:` is set, the seed's `status:` is
  "funnel-only" and no longer read for the board. Not drift; checked to be sure no seed had regressed to
  a genuinely wrong pre-scaffold status (`raw`/`ready`/`queued`) after its epic moved on — none had,
  other than the one path-format bug in §1.
- **The 6 funnel seeds still without an epic** (`raw`/`ready`, `epic: null`, no `build_order`) —
  unchanged from 07-20: `affinity-marketplace-infrastructure`, `ai-adoption-maturity-benchmark`,
  `custom-static-pages`, `designer-collaboration-portal`, `spike-compra-protegida`,
  `spike-supabase-colocation`. All still read as genuine low-priority backlog, matching
  `BUILD-ORDER.md`'s own "seeds in funnel: 6" footer. `designer-collaboration-portal` is the oldest
  (`updated: 2026-06-08`, ~11 weeks untouched) but its own body still frames it as intentionally deferred
  ("deferred from #4"), not stalled.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-08-24.md`](../DOC-HYGIENE-REPORT-2026-08-24.md), committed alongside this
  audit). Same expected noise as every prior pass: unresolvable `apps/**` source paths (git-ignored in
  this checkout, per `WAYS-OF-WORKING.md`'s documentation map) and the one correct historical
  "archived epic" reference in `LEARNINGS.md` (`neon-egress-and-db-isolation`, explaining why it was
  superseded, not a leftover claim).

## Known verification gap (repo-scope limitation, unchanged from every prior pass)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — PR numbers cited in
sprint docs against the two app repos (`miyagisanchezcommerce#NNN`, `medusa-bonsai-backend#NN`) are
taken on faith from the docs.

---

### Suggested next step

Land the one-line `epic:` path fix (§1) — small, mechanical, and the only item with a **live** effect
(restores Priority/Risk on the #1 build-order epic in Notion on the next sync). Write
`github-actions-local-first`'s retrospective (§2) — now overdue by one audit cycle. §3 is the same
standing false-positive question as 07-20, still undecided. Nothing here blocks any in-flight work.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
