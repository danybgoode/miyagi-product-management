# Roadmap grooming audit — 2026-07-20

**Advisory only — no app code touched, nothing merged/deployed.** Weekly follow-up to
[`roadmap-grooming-audit-2026-07-06.md`](roadmap-grooming-audit-2026-07-06.md), same method: read
`Roadmap/WAYS-OF-WORKING.md` + `Roadmap/00-ideas/README.md` for the funnel lifecycle (seed frontmatter
`status:` = raw | ready | queued | scaffolded | in-progress | shipped | archived; once an epic exists,
its README frontmatter `status:` is the SSOT), ran `node scripts/build-order.mjs --check` and
`node scripts/doc-hygiene.mjs`, then cross-checked every seed's and every epic's frontmatter against
its sprint files, `RETROSPECTIVE.md`, and git history. New this pass: the connected Notion MCP could
query the live "Marketplace Roadmap" database directly (SQL against the data source) — the 2026-07-06
audit's Notion section couldn't do this (plan-tier limit at the time), so §4 below is a first.

**Bottom line: the funnel is in good shape and every item flagged 2026-07-06 has been resolved.** Two
small, genuine gaps found this pass (both owed retrospectives, §1) and one seed whose body text lagged
its own frontmatter by a few days (§2) — none block anything. The rest is a clean bill of health,
including a live Notion spot-check that wasn't possible last time.

---

## 1. Two shipped epics owe their `RETROSPECTIVE.md`

Epic Definition of Done requires a written retrospective at close (`WAYS-OF-WORKING.md`). Both of these
are `status: shipped` with merged, live work, but the retro is missing or empty:

- [`github-actions-local-first`](../../09-platform-infra/github-actions-local-first/README.md) —
  sprint-1: *"✅ shipped — 2026-07-16."* No `RETROSPECTIVE.md` file exists at all. **Suggest:** write one
  (1 sprint, small scope — should be quick).
- [`buyer-notifications-money-path`](../../05-trust-offers-and-messaging/buyer-notifications-money-path/README.md)
  — both sprints *"✅ MERGED + LIVE 2026-07-08"* (backend
  [#70](https://github.com/danybgoode/medusa-bonsai-backend/pull/70), frontend
  [#195](https://github.com/danybgoode/miyagisanchezcommerce/pull/195)). `RETROSPECTIVE.md` exists but
  is the unfilled scaffold template — `_Closed: <date>_` placeholder, all four sections empty/comment-only.
  **Suggest:** fill it in; the epic's been live for 12 days, the content is presumably easy to backfill
  from the sprint docs.

Neither affects `BUILD-ORDER.md` or the Notion board (both already correctly bucket these epics as
Shipped — see §4) — this is purely the retro-content gap, not a status/board problem.

## 2. Seed body text lagging its own frontmatter — `spike-arranged-only-delivery.md`

[`00-ideas/seeds/spike-arranged-only-delivery.md`](../../00-ideas/seeds/spike-arranged-only-delivery.md)
— frontmatter is `status: shipped`, `epic: null`, `updated: 2026-07-07`. That status is directionally
right: the spike's **GO with constraints** decision fed directly into
[`04-shipping-and-delivery/arranged-only-delivery`](../../04-shipping-and-delivery/arranged-only-delivery/README.md),
which shipped 2026-07-11 and links back to this exact spike in its own header. Two things are stale
relative to that outcome, both cosmetic:

- **Body banner never updated.** The doc still opens with *"Status: READY TO INVESTIGATE"* and a
  *"Validated still-open 2026-07-06"* callout that says the spike's core question "remains undecided" —
  written the day before the frontmatter flipped to `shipped` and four days before the epic that answered
  it actually shipped. A reader skimming the body (not just frontmatter) gets the wrong picture.
- **`epic:` field is `null`** even though the epic exists and links back to this file by name. Setting
  it to `04-shipping-and-delivery/arranged-only-delivery` would make the backlink two-way and correct,
  matching the convention every other resolved seed follows.

**Suggest:** set `epic: "04-shipping-and-delivery/arranged-only-delivery"` and stamp a one-line
"shipped — see epic README" pointer at the top of the body, same fix pattern used on the legacy
`readyforscope` docs in the 2026-07-06 audit's §4.

## 3. `BUILD-ORDER.md`'s own "⚠️ Status drift" section — reviewed, all 3 are false positives

The generated board currently flags 3 epics where frontmatter disagrees with the sprint/retro-derived
guess. Read each one's sprint docs and DoD checklist to determine which side is right:

| Epic | frontmatter | derived | verdict |
|---|---|---|---|
| [`home-dynamic-rows-restore-and-polish`](../../01-discovery-and-shopping/home-dynamic-rows-restore-and-polish/README.md) | In progress | Shipped | **Frontmatter correct.** Sprint 2's own status line reads *"PR review pending — Daniel's signed-in prod smoke owed before merge"* — not actually merged. `RETROSPECTIVE.md` is (correctly) still an empty placeholder. |
| [`dobby-foundation`](../../09-platform-infra/dobby-foundation/README.md) | Scaffolded | Shipped | **Frontmatter correct — stated explicitly in-doc.** Sprint 1's status line: *"Epic README stays `status: scaffolded` — epic close … is separate, not done in this sprint."* The DoD checklist is entirely unticked. |
| [`gcp-account-migration`](../../09-platform-infra/gcp-account-migration/README.md) | In progress | Shipped | **Frontmatter correct — stated explicitly in-doc.** DoD checklist: *"README stays in-progress until S4"* (S4 decommission is deliberately deferred ≥2 weeks post-cutover for a soak period; S0–S3 done). |
| | | | |

No corrections needed. This is the same class of gap the 2026-07-06 audit's §6 flagged in
`countStories()`/the sprint-derivation heuristic — it doesn't know about an explicit "smoke owed before
close" or "final sprint deliberately deferred" gate stated in the docs, so it will keep flagging these
(or similar) until someone teaches the derivation logic about close-gates. Not a docs problem;
flagging again so the next pass doesn't waste time re-deriving the same conclusion, and because a false
positive sitting in an "advisory" section long enough tends to get corrected reflexively by whoever
next touches it — worth a decision on whether to suppress these 3 specifically in the generator, or
leave the human-judgment step as-is.

## 4. Notion board — verified live and current (previously unverifiable)

Unlike 2026-07-06 (blocked on a Notion plan-tier limit), this pass could query the live "Marketplace
Roadmap" database directly. Spot-checked 8 epics via SQL against the connected data source — all 3
epics historically flagged as drift-prone (§3 above) plus the 5 epics corrected in the 2026-07-06 audit
(`mercadolibre-sync`, `custom-print-products`, `feature-flags-inhouse`) plus this pass's new finds
(`github-actions-local-first`, `buyer-notifications-money-path`):

| Slug | Notion `Status` | Docs frontmatter | Match? |
|---|---|---|---|
| `mercadolibre-sync` | Shipped | shipped | ✅ |
| `custom-print-products` | Shipped | shipped | ✅ |
| `feature-flags-inhouse` | Shipped | shipped | ✅ |
| `home-dynamic-rows-restore-and-polish` | In progress | in-progress | ✅ |
| `dobby-foundation` | Scaffolded | scaffolded | ✅ |
| `gcp-account-migration` | In progress | in-progress | ✅ |
| `github-actions-local-first` | Shipped | shipped | ✅ |
| `buyer-notifications-money-path` | Shipped | shipped | ✅ |

Every row's `Last synced` = **2026-07-20** (today), confirming `.github/workflows/notion-sync.yml`'s
push-to-main trigger is firing reliably. No drift between docs and the live board.

## 5. Everything else checked, no action needed

- **Canonical `status:` enum, repo-wide.** Every epic README (125 total: 117 shipped · 4 in-progress ·
  3 scaffolded · 1 archived) and every seed (87 total: 51 shipped · 28 scaffolded · 4 raw · 2 ready ·
  2 archived) uses one of the documented enum values — zero non-canonical spellings anywhere. This
  matters because a non-canonical value silently defeats the drift detector (the exact mechanism behind
  the 2026-07-06 audit's §1 `mercadolibre-sync` miss) — that class of bug is fully cleared.
- **Every item flagged 2026-07-06 is resolved:** `mercadolibre-sync` → `shipped` + retro exists;
  `custom-print-products` → `in-progress`; `profit-analyzer`, `envia-killswitch`,
  `seller-landing-launch-polish`, `feature-flags-inhouse` → canonical spellings; `spike-envia-byo` →
  `scaffolded`; `events-quantity-selector` → `shipped`, epic-linked; `buyer-notifications-money-path`
  (the seed, not the epic in §1 above) → `scaffolded`, `epic:` set correctly;
  `spike-arranged-only-delivery`'s stale `build_order`-vs-`ready` mismatch → resolved (now `shipped`,
  though see §2 for a *new*, different staleness on the same file).
- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **The 6 funnel seeds still without an epic** (`raw`/`ready`, `epic: null`) —
  `ai-adoption-maturity-benchmark`, `buy-me-a-coffee-widget`, `custom-static-pages`,
  `designer-collaboration-portal`, `spike-compra-protegida`, `url-stuff` — all have no `build_order`
  set and read as genuine low-priority backlog, not stalled work. Matches `BUILD-ORDER.md`'s own
  "seeds in funnel: 6" footer exactly.
- **The other 6 non-shipped/non-archived epics** (`panfleto-premium-shop`, `reporthub-as-notion`,
  `process-token-diet`, `ssrf-dns-pinning`) beyond the 3 in §3, plus the 1 `archived` epic
  (`neon-egress-and-db-isolation`, correctly self-annotated as *"SUPERSEDED by
  postgres-neon-to-cloudsql"*) — all internally consistent, recent activity, no stalls.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-07-20.md`](../DOC-HYGIENE-REPORT-2026-07-20.md), committed alongside this
  audit). Its findings are the expected noise for this checkout: ~46 "referenced path not found" hits
  are all `apps/**` source files the tool itself notes can't be verified here (the app repos are
  git-ignored in this monorepo-root checkout, per `WAYS-OF-WORKING.md`'s documentation map) — not a new
  claim of staleness. The one "mentions an archived epic" flag (`neon-egress-and-db-isolation` in
  `LEARNINGS.md`) is a correct historical reference explaining *why* it was archived, not a leftover
  claim. Nothing here needs action.

## Known verification gap (repo-scope limitation, unchanged from 2026-07-06)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — PR numbers cited in
sprint docs against the two app repos (`miyagisanchezcommerce#NNN`, `medusa-bonsai-backend#NN`) are
taken on faith from the docs, same caveat as last time.

---

### Suggested next step
Land the two retrospectives (§1) and the one-line `epic:`/banner fix (§2) — small, mechanical,
non-urgent. §3 is a standing false-positive worth a decision (teach the generator about close-gates, or
leave as human-judgment noise) rather than a doc fix. Nothing here blocks any in-flight work.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
