# Roadmap grooming audit — 2026-07-13

**Advisory only — no app code touched, nothing merged/deployed.** Periodic hygiene pass over
`Roadmap/` against the lifecycle defined in `Roadmap/WAYS-OF-WORKING.md` and
`Roadmap/00-ideas/README.md` (seed frontmatter `status:` = raw | ready | queued | scaffolded |
in-progress | shipped | archived; once an epic exists, its README frontmatter `status:` is the
SSOT). Method: read the two governing docs, ran `node scripts/build-order.mjs --check` (green —
the generated board is current), cross-checked every item flagged by the prior
[2026-07-06 audit](roadmap-grooming-audit-2026-07-06.md) for resolution, reviewed the ~45 commits
that landed on `Roadmap/` since then, queried the live Notion "Marketplace Roadmap" board directly
(via the connected Notion MCP — this audit's GitHub/Notion access differs from 2026-07-06's, which
could not query the board), and swept all 112 epic READMEs + 74 seed files for status accuracy.

**Bottom line: the funnel is in good shape overall, with one real production concern surfaced and
one epic closed out sloppily.** Every item from the 2026-07-06 audit was resolved. Nothing here
blocks work in flight. **Item #1 is the one worth acting on first** — it describes a live,
apparently-still-open production incident on the money path, not a doc-hygiene nit.

---

## 1. HIGH — live prod checkout outage sitting un-queued in the funnel

[`Roadmap/00-ideas/seeds/checkout-cloudrun-localhost-fallback-outage.md`](../seeds/checkout-cloudrun-localhost-fallback-outage.md)

The seed's own text says every "Comprar" click on prod fails because `lib/cart.ts`'s client-side
store-URL resolution falls back to `http://localhost:9000` — broken since the Vercel→Cloud Run
cutover (2026-07-10), independently confirmed live against a real prod PDP page and its shipped JS
bundle. It's marked `risk: high`, `type: bug`, and its own prose calls it an "active incident."

As of this audit (2026-07-13, seed `updated: 2026-07-12`): **`status: ready`**, `epic: null`,
`build_order: null` — i.e. still sitting in the un-scaffolded funnel, one lifecycle stage short of
being queued for build. `git log` shows no epic scaffolded and no fix committed against it since
the seed was filed. This repo has no visibility into the separate app repos
(`apps/miyagisanchez`), so it's possible a fix has landed there since — but nothing in this repo's
docs shows it has. The companion seed
[`nextpublic-buildtime-inlining-audit.md`](../seeds/nextpublic-buildtime-inlining-audit.md)
(`status: raw`) is the systemic follow-up and is correctly less urgent.

**Suggested action:** verify directly whether `lib/cart.ts` still resolves to `localhost:9000` on
prod; if the outage is still live, this should jump the funnel (queue → scaffold → ship) ahead of
everything else in flight, per WAYS-OF-WORKING's own HIGH-risk/Daniel-merge money-path rule. If it
was already fixed out-of-band, flip the seed to `status: shipped`/`archived` with a pointer to
where the fix landed so it stops reading as an open incident.

## 2. MEDIUM — `buyer-notifications-money-path` marked `shipped` without the epic-close checklist done

[`Roadmap/05-trust-offers-and-messaging/buyer-notifications-money-path/README.md`](../../05-trust-offers-and-messaging/buyer-notifications-money-path/README.md)

Both sprints show `✅ MERGED + LIVE 2026-07-08` and frontmatter reads `status: shipped`, but:

- `RETROSPECTIVE.md` is a completely unfilled template — literal `_Closed: <date>_`, every section
  (`What shipped` / `What went well` / `What we learned` / `Gaps`) empty except its HTML-comment
  prompts.
- The README's own Definition-of-Done checklist is **0/9 ticked** — including "RETROSPECTIVE.md
  written," "poster updated," and "kill-switch verified in `platform_flags`."
- `sprint-2.md` itself says: *"epic close-out (poster, retro, LEARNINGS) is a separate follow-up
  once the smoke confirms the money path live"* (referring to Daniel's Stripe/MP/pago-directo
  purchase smoke, which "can't be self-run"). Nothing in the repo shows that follow-up happened.
- The product poster (`Roadmap/README.md`) has no Recent-highlights entry for this epic and the
  #5b entry it's a follow-up to (line 648) still describes the pre-epic state ("Compras-via-webhooks
  ... deferred to a follow-up").

This is a HIGH-risk, real-money-webhook epic — code is live, but nothing here confirms Daniel's
required live-money smoke ran, and the close-out paperwork (retro/poster/kill-switch verify) never
happened. **Suggested action:** confirm with Daniel whether the money-path smoke ran; if yes,
backfill the retrospective, tick the DoD, and add the poster line; if the smoke is still
outstanding, the `shipped` status is premature and should read `in-progress` until it's confirmed.

## 3. Already-resolved — every item from the 2026-07-06 audit

Spot-checked all seven flags from
[`roadmap-grooming-audit-2026-07-06.md`](roadmap-grooming-audit-2026-07-06.md); all landed
correctly:

- `mercadolibre-sync`, `custom-print-products`/`ml-orders-native` (drift resolved the derived way,
  as recommended), `profit-analyzer`, `envia-killswitch`, `seller-landing-launch-polish`,
  `feature-flags-inhouse` all now carry the canonical `status: shipped` with a real
  `RETROSPECTIVE.md`.
- Seed fixes landed: `spike-envia-byo` → `scaffolded`, `events-quantity-selector` → `shipped`,
  `buyer-notifications-money-path` → `scaffolded` at the time (now shipped, see #2 above),
  `spike-arranged-only-delivery` → `shipped`.

## 4. Low / no action — one auto-flagged drift is a known false positive

`BUILD-ORDER.md`'s generated "⚠️ Status drift" section currently flags one epic:
[`cms-contenido-restore-and-polish`](../../08-growth-and-promotions/cms-contenido-restore-and-polish/README.md)
(frontmatter `in-progress` vs. sprint/retro-derived `Shipped`). Verified this is the **same
pre-existing tooling gap** documented in the 2026-07-06 audit §6 (`countStories()` counts a sprint
"done" from a summary-line ✅ rather than the story heading, inflating the derived-shipped signal).
The frontmatter is correct: `RETROSPECTIVE.md` is still an empty stub, the DoD checklist is fully
unticked, and Sprint 3's own smoke-walkthrough section states "none of steps 1–5 have been run
against a live [environment]." **No correction needed** — flagging only so it isn't mistaken for a
new issue on the next pass.

## 5. Newer epics (scaffolded/updated since 2026-07-06) — checked, consistent

`home-dynamic-rows-restore-and-polish`, `seller-catalog-null-slot-sweep`, `mcp-parity-core`,
`mcp-parity-config`, `pmo-operational-reports`, `deploy-pipeline-tuning`, `platform-migrations`,
`arranged-only-delivery`, `seller-portal-onboarding-three-doors`, `emoji-to-iconoir-sweep`: sprint
statuses, frontmatter, and (where present) `RETROSPECTIVE.md` stubs are all internally consistent
with each epic's real progress. Three scaffolded-but-not-started epics
(`seller-catalog-null-slot-sweep`, `pmo-operational-reports`, and `home-dynamic-rows-restore-and-polish`
at `in-progress`) carry an empty `RETROSPECTIVE.md` stub pre-close — this is expected scaffold
behavior (per the 2026-07-06 audit's note on `dobby-foundation`), not a mismatch.

## 6. Broader sweep (epics + seeds not already covered) — clean

A second pass covered epic-activity recency, a shipped-status/retrospective-completeness check
across essentially all ~90 shipped epics, all 74 seed files, both legacy `00-ideas/` folders, and
the `BUILD-ORDER.md` funnel section:

- No stalled in-progress/scaffolded epics (the only ones with zero recent activity are freshly
  scaffolded and correctly bucketed "not started").
- No other shipped epic has an unfilled retrospective or a missing one — `buyer-notifications-money-path`
  (#2) is the only real instance.
- No seed carries an invalid `status:` value; no `ready`/`queued` seed is stale relative to its
  `updated:` date.
- The `2. readyforscope/` legacy folder has ~35 docs with stale `status:` fields pointing at
  epics that have since shipped — this matches the documented, accepted legacy-staging behavior
  (frontmatter there is disclaimed as non-authoritative once `epic:` exists) and isn't a real
  drift; no misleading top-banner prose was found contradicting a shipped epic's state.
- All 9 seeds in `BUILD-ORDER.md`'s "Funnel" section genuinely belong at `raw`/`ready`.

## 7. Notion board sync — verified live and current (resolves the 2026-07-06 "couldn't verify" gap)

Unlike the prior audit, this session's Notion MCP connection could query the live "Marketplace
Roadmap" database directly. Spot-checked three rows against their doc source of truth:

- `mercadolibre-sync` → Notion `Status: Shipped`, `Sprint progress: 15/15 stories`, synced
  `2026-07-12` — matches the corrected frontmatter.
- `cms-contenido-restore-and-polish` → Notion `Status: In progress` — correctly reflects the
  frontmatter (not the derived-Shipped false positive from #4), confirming the live sync reads
  epic-README frontmatter directly as SSOT.
- `checkout-cloudrun-localhost-fallback-outage` → present in Notion as `Status: Ready`, synced
  `2026-07-12` — the funnel item from #1 is visible on the board, not hidden by a sync gap.

The sync mechanism (`.github/workflows/notion-sync.yml`, push-triggered + nightly cron) is healthy
and current as of this audit.

**Minor doc-hygiene note (very low severity):** the "Status — the derivation rule" section in
[`seeds/notion-roadmap-sync.md`](../seeds/notion-roadmap-sync.md) (lines 44–55) still describes an
older multi-signal precedence (e.g. "epic has `RETROSPECTIVE.md` → Shipped") that no longer matches
the verified live behavior above — the sync now reads the epic README frontmatter directly, per
`00-ideas/README.md`'s current SSOT rule. Worth a rewrite next time that doc is touched; not
functionally impactful since the actual sync is correct.

## 8. Product poster — current, no gaps

`Roadmap/README.md`'s "Recent highlights" section is up to date through 2026-07-11
(`frontend-vercel-to-cloudrun`, `platform-migrations`, `arranged-only-delivery`,
`seller-portal-onboarding-three-doors`, `catalog-management`, `shipping-provider-expansion`, etc.
all present with dated entries). No shipped epic since the last audit is missing a highlight,
aside from `buyer-notifications-money-path` (#2), whose highlight is appropriately withheld
pending its actual close-out.

---

### Suggested next step
Resolve #1 first (confirm/fix the live checkout outage or correct the seed if it's already fixed
elsewhere) — it's the only item here with a live-money-path blast radius. #2 is a paperwork/status
correction once Daniel confirms whether the smoke ran. Everything else in this audit is
informational; no further doc changes are required to keep the board accurate.
