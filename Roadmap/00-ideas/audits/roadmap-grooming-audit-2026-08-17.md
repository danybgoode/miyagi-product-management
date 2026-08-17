# Roadmap grooming audit — 2026-08-17

**Advisory only — no app code touched, nothing merged/deployed.** Follow-up to
[`roadmap-grooming-audit-2026-07-20.md`](roadmap-grooming-audit-2026-07-20.md), same method: read
`Roadmap/WAYS-OF-WORKING.md` + `Roadmap/00-ideas/README.md` for the funnel lifecycle (seed frontmatter
`status:` = raw | ready | queued | scaffolded | in-progress | shipped | archived; once an epic exists,
its README frontmatter `status:` is the SSOT), ran `node scripts/build-order.mjs --check` and
`node scripts/doc-hygiene.mjs`, then cross-checked every seed and every epic touched since the last
audit against its sprint files, `RETROSPECTIVE.md`, git history and the live Notion "Marketplace
Roadmap" database (queried directly via SQL against the connected data source, same as 2026-07-20's §4).

**Bottom line: mostly healthy, but this pass found one finding worth Daniel's attention that the prior
two audits didn't have a live analogue for — the Notion board is silently missing three shipped epics
because a seed-linkage step was skipped at scaffold time (§1).** Everything else is the familiar shape:
a couple of poster lines lagging their epics (§2), one epic's sprint docs not ticked (§3), two
retrospectives still owed from three weeks ago (§4), four seeds whose body prose is stale relative to
their own frontmatter (§5), one mis-stated seed status (§6), and `BUILD-ORDER.md`'s own drift section
reviewed and cleared, same false-positive class as last time (§7).

---

## 1. Notion board has NO row at all for three shipped epics — root cause found

`golden-frijoles-integration`, `marketplace-communications` and `tenant-lifecycle-admin` all shipped
between 2026-08-12 and 2026-08-15 (retrospectives filled in, sprint docs ticked, epic README
frontmatter correctly `status: shipped`). But none of their seed files
([`golden-frijoles-integration.md`](../seeds/golden-frijoles-integration.md),
[`marketplace-communications.md`](../seeds/marketplace-communications.md),
[`tenant-lifecycle-admin.md`](../seeds/tenant-lifecycle-admin.md)) ever had their `epic:` frontmatter
field set when the epic was scaffolded — all three still read `epic:` absent, `status: scaffolded`.

**Live consequence, confirmed by SQL against the connected Notion data source:** for all three slugs,
the "Marketplace Roadmap" database has no `Grain: Epic` row whatsoever. What exists instead is a stale
`Grain: Seed` row (Name = the raw slug, `Status: Scaffolded`, `Doc link` pointing at the seed file) sitting
alongside the correct `Grain: Sprint` rows for every sprint (all three sprints per epic, all `Status:
Shipped`). Anyone reading the Notion board — not the repo — sees these three shipped epics as
"Scaffolded" with no epic-level row at all, only orphaned Sprint rows. `Last synced` on the stale Seed
rows is today, confirming `notion-sync.yml` is running correctly; it's syncing the wrong source object
because the seed→epic backlink was never made.

`BUILD-ORDER.md` is **not** affected — `build-order.mjs` reads the epic README frontmatter directly and
correctly shows all three as shipped. This is purely a Notion-sync consequence of the missing backlink,
which is exactly the class of drift item 5 asked to check for.

**Suggest:** set each seed's `epic:` field to the matching path
(`09-platform-infra/golden-frijoles-integration`, `05-trust-offers-and-messaging/marketplace-communications`,
`09-platform-infra/tenant-lifecycle-admin`) and re-run the Notion sync — the pattern that already works
correctly for every other shipped epic in the same window (`us-marketplace`, `owned-shop-operating-channel`,
`interaction-feedback-and-admin-repair` all synced a correct `Epic`-grain row once their seed carried the
link, or had no seed to begin with).

**Related, lower severity:** [`us-marketplace.md`](../seeds/us-marketplace.md)'s `epic:` field is the bare
slug `us-marketplace`, not the documented `<macro-section>/<slug>` path format. This one happened to sync
correctly (Notion shows a proper `Epic`-grain row, `Status: Shipped`) — the sync script apparently matches
on slug regardless of path shape — but it's inconsistent with the convention every other seed follows and
worth normalizing so a future tooling change doesn't silently break it the way the three seeds above did.

## 2. Poster (`Roadmap/README.md`) lagging two shipped epics

- **`owned-shop-operating-channel`** (shipped 2026-07-31, retro filled in) — the Feature-map line still
  reads `📋 **Sell on your own shop...** *(scaffolded)*`. Per convention, ✅ means enforced in code; this
  line hasn't been touched since before the epic shipped.
- **`us-marketplace`** (shipped 2026-08-12) — the Feature-map ✅ line is present and correct, but there's
  no **Recent highlights** entry for the close: the chronological list currently jumps from 2026-08-14
  straight to 2026-07-31, skipping the 08-12 close entirely.

**Suggest:** flip the `owned-shop-operating-channel` feature line to ✅ and add the missing
`us-marketplace` highlight entry — both small, mechanical edits against material that's already fully
written up in each epic's `RETROSPECTIVE.md`.

## 3. `interaction-feedback-and-admin-repair` — sprint docs never flipped to shipped

The epic README has read `status: shipped` since 2026-08-15 (commit `1f4c266`), with a filled retro and
a poster highlight — but all four `sprint-N.md` files
([`sprint-1.md`](../../09-platform-infra/interaction-feedback-and-admin-repair/sprint-1.md) through
`sprint-4.md`) still show `**Status:** 🟦 In review · PR #...`, never ticked to shipped. Purely cosmetic
(the epic README frontmatter is the SSOT and nothing reads the sprint-doc status line for the board) but
worth a quick tick for anyone opening the sprint docs directly.

## 4. Two retrospectives flagged 2026-07-20 — still open

Both items from the 2026-07-20 audit's §1 remain unresolved, unchanged, four weeks later:

- [`github-actions-local-first`](../../09-platform-infra/github-actions-local-first/) — `RETROSPECTIVE.md`
  still does not exist at all (directory holds only `README.md` and `sprint-1.md`).
- [`buyer-notifications-money-path`](../../05-trust-offers-and-messaging/buyer-notifications-money-path/RETROSPECTIVE.md)
  — still the empty scaffold template (`_Closed: <date>_` placeholder, all four sections empty/comment-only),
  byte-identical to what was flagged three weeks ago.

**Suggest:** these are small, quick to backfill from existing sprint docs, and have now sat open across
two consecutive audits — worth prioritizing over new findings below.

## 5. Seed body prose stale relative to its own frontmatter (4 seeds)

Frontmatter says `shipped`; the body's own status banner, written before the ship, was never updated —
a reader skimming the body (not just frontmatter) gets the wrong picture in all four:

- [`process-scaffolding-and-00-ideas.md`](../seeds/process-scaffolding-and-00-ideas.md) — frontmatter
  `status: shipped` (updated 2026-06-24); body still opens "**Status: awaiting Daniel's sign-off.** Plan
  only — no files moved, no code written, no commits."
- [`notion-roadmap-sync.md`](../seeds/notion-roadmap-sync.md) — frontmatter `status: shipped` (updated
  2026-06-24); body still reads "**This is the first deliverable... No sync is built until you sign
  off.**" — directly contradicted by this very audit's §1, which queried the live sync.
- [`design-token-foundation.md`](../seeds/design-token-foundation.md) — frontmatter `status: shipped`,
  `epic:` correctly linked (board unaffected); body's first line under the H1 still reads "**Status:
  SCOPE GATE — awaiting Daniel's sign-off.** Nothing scaffolds or commits until approved."
- [`pdp-image-gallery.md`](../seeds/pdp-image-gallery.md) — frontmatter `status: shipped` (shipped via
  PR #70, 2026-06-10); body status line still reads "**Status: awaiting Daniel approval — no code
  yet.**"

**Suggest:** a one-line "shipped — see epic README" banner stamped at the top of each body, same fix
pattern used repeatedly in the 2026-07-06 and 2026-07-20 audits for this exact class of staleness.

## 6. One seed's status doesn't match what it describes

[`ucp-buyer-shipping-exposure.md`](../seeds/ucp-buyer-shipping-exposure.md) — frontmatter reads
`status: scaffolded`, which per `00-ideas/README.md`'s own enum means "epic + sprint docs created
(`epic:` set)". But `epic:` is `null` and no matching epic directory exists anywhere under `Roadmap/`;
the body itself says the idea is "proposed, not yet groomed in depth" with "no demand signal yet."
**Suggest:** correct `status:` to `ready` or `queued` to match what's actually true.

## 7. `BUILD-ORDER.md`'s own "⚠️ Status drift" section — both reviewed, both false positives

The generated board currently flags 2 epics where frontmatter disagrees with the sprint/retro-derived
guess. Read each one's full README and cross-checked against the live Notion board:

| Epic | frontmatter | derived | Notion | verdict |
|---|---|---|---|---|
| [`merchant-lifecycle-projection`](../../08-growth-and-promotions/merchant-lifecycle-projection/README.md) | Shipped | Scaffolded | Shipped | **Frontmatter correct.** DoD checklist has 2 items deliberately unticked pending Daniel's manual env-var flip + destination creation (explicit, documented, self-attesting-risk-accepted). The derivation heuristic just counts unticked boxes. |
| [`miyagi-partners-recruiting-v3`](../../08-growth-and-promotions/miyagi-partners-recruiting-v3/README.md) | In progress | Shipped | In progress | **Frontmatter correct — stated explicitly in-doc.** "Closeout state — 2026-08-10" section: *"The epic remains `in-progress` only for Daniel's authenticated destructive-path smoke."* Both sprints are merged/deployed, which is why the heuristic guesses shipped. |

No corrections needed — same false-positive class the 2026-07-06 and 2026-07-20 audits already
identified in the sprint-derivation heuristic (it can't see an explicit "owed to Daniel" close-gate
stated in prose). Live Notion agrees with the frontmatter in both cases, which is independent
confirmation the frontmatter — not the derived guess — is right.

## 8. Everything else checked, no action needed

- **Full sweep of all 106 seeds** for missing/malformed epic backlinks and status-vs-body contradictions
  — beyond §1/§5/§6 above, nothing else found. Ruled out as false leads: `spike-arranged-only-delivery.md`
  and `sweepstakes-epic-plan.md` (both intentionally epic-less, self-documented) and
  `seller-portal-ux-audit.md` (an intentional multi-epic umbrella doc).
- **The 5 funnel seeds still without an epic** (`raw`/`ready`, `epic: null`) — matches `BUILD-ORDER.md`'s
  own "seeds in funnel: 5" footer exactly; these read as genuine low-priority backlog, not stalled work.
- **`node scripts/build-order.mjs --check`** → clean, board is current with the docs.
- **`node scripts/doc-hygiene.mjs`** — wrote a fresh dated report
  ([`DOC-HYGIENE-REPORT-2026-08-17.md`](../DOC-HYGIENE-REPORT-2026-08-17.md), committed alongside this
  audit). Same expected noise as every prior pass: ~50 "referenced path not found" hits are all `apps/**`
  source files the tool itself notes can't be verified here (the app repos are git-ignored in this
  monorepo-root checkout). The one "mentions an archived epic" flag (`neon-egress-and-db-isolation` in
  `LEARNINGS.md`) is a correct historical reference, not a leftover claim. Nothing actionable.
- **Canonical `status:` enum, repo-wide** — spot-checked across the epics touched this window; no
  non-canonical spellings found.

## Known verification gap (repo-scope limitation, unchanged from prior audits)

GitHub access this pass is scoped to `danybgoode/miyagi-product-management` only — PR numbers cited in
sprint docs against the two app repos (`miyagisanchezcommerce#NNN`, `medusa-bonsai-backend#NN`) are
taken on faith from the docs.

---

### Suggested next step

Priority order: (1) §1's Notion backlink fix — three shipped epics are currently invisible as epics on
the live board, the highest-leverage single fix here; (2) the two owed retrospectives (§4), now on their
second audit cycle unresolved; (3) the two poster lines (§2) and the sprint-doc ticks (§3) — small,
mechanical; (4) the seed-body banners (§5) and the one status correction (§6) — cosmetic, non-urgent.
§7 needs no doc change, only a standing decision (already deferred twice) on whether to teach the
derivation heuristic about explicit close-gates or keep it as human-judgment noise.

Advisory only — not a gate. `notion-sync.yml` propagates after merge.
