---
title: Scaffolding automation + 00-ideas reorg
slug: process-scaffolding-and-00-ideas
status: in-progress
area: "09"
type: chore
priority: wave-0
risk: low
epic: null
build_order: null
updated: 2026-06-08
---

> **Signed off 2026-06-08.** Directions chosen: flatten numbered folders → `seeds/` + `audits/` (frontmatter is the lifecycle); templates + thin generator script; Notion = one new DB with a Grain filter, docs always win. Building now.

# Scaffolding automation + 00-ideas reorg — scope for sign-off

> **Status: awaiting Daniel's sign-off.** Plan only — no files moved, no code written, no commits.
> Directional choices already made: **(1b)** frontmatter status + one-time cleanup; **(1a)** templates + thin generator script.

---

## The problem (why 00-ideas drifts)

*(Historical — describes the pre-flatten `1. raw` / `2. readyforscope` / `3. done` layout that this change replaced.)*

- The raw-idea inbox was **empty** — raw ideas landed in chat or straight in the ready folder, so the inbox was dead.
- The ready folder was a **junk drawer**: ~18 seed docs where most were spent (already scaffolded or shipped), mixed with a few live seeds, mixed with **two audit-result trees** that aren't seeds at all.
- The done folder had only **3 files** — spent seeds never got retired there.
- A **duplicate older audit** shadowed the newer one.
- Filenames were inconsistent (camelCase, spaces, mixed conventions).

**Root cause:** grooming wrote a scope doc + scaffolded the epic, but nothing ever *advanced or retired* the seed. The numbered-folder model depended on manual moves that never happened — fixed by moving lifecycle into frontmatter.

---

## Part A — Frontmatter status (the drift fix, 1b)

Stop encoding lifecycle in *folder location*. Encode it in **YAML frontmatter** on each seed. One final reconciliation pass sets every existing seed's status; after that, status changes are a one-line edit, never a file move. This same block is the **exact projection source the Notion sync (#2) reads** — the two tracks share one schema.

### Proposed seed frontmatter schema

```yaml
---
title: Granular multi-channel notifications   # human label
slug: granular-notifications                  # kebab, stable id
status: shipped        # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "05"             # macro-section 01-09
type: feature          # feature | spike | chore | epic
priority: wave-2       # wave-0..wave-4
risk: high             # low | high
epic: 05-trust-offers-and-messaging/granular-notifications   # path to scaffolded epic, or null
build_order: "#5"      # BUILD-ORDER id, or null
updated: 2026-06-07
---
```

### Status definitions (single source of lifecycle truth)

| status | meaning | doc signal |
|---|---|---|
| `raw` | unrefined idea | seed exists, no scope yet |
| `ready` | Definition-of-Ready scope doc written | scope doc complete |
| `queued` | accepted into the build order | BUILD-ORDER ⬜ |
| `scaffolded` | epic + sprint docs created | epic README exists / BUILD-ORDER ✅ / poster 🚧 |
| `in-progress` | building | some sprint stories ticked |
| `shipped` | epic done | epic ✅ + RETROSPECTIVE / poster ✅ |
| `archived` | dropped / superseded | — |

### One-time cleanup (executed once, on approval)

1. **Add frontmatter** to every existing seed with its true current status (inventory below).
2. **Dedupe audits:** move both audit trees out of the idea pipeline into a dedicated `Roadmap/00-ideas/audits/` (reference findings, not seeds); retire the older duplicate `00-ideas/audits/_legacy/ux-uiaudit/` (keep newest; archive or delete old — your call).
3. **Archive spent seeds:** the scaffolded/shipped ones move once to `seeds/` (or get `status: shipped` in place — see open question Q-A1).
4. **Normalize filenames** to kebab-case matching `slug`.
5. **Add a groom rule** (Stage 7/9): on scaffold, set the seed's `status: scaffolded` + `epic:` path — no file move.

### Seed inventory (draft — confirm before I touch anything)

- **Spent → shipped/scaffolded:** spikeflagsmith, unifiedcdcinotificationsystem, design-token-foundation, ux-audit-refresh, checkout-state-hardening, granular-notifications, buyer-notifications, configurable-personalized-products, custom-domain-checkout, custom-domain-polish, sweepstakes, Sweepstakes-Epic-Plan.
- **Live / un-spent:** own-shop-experience, MiyagiSanchezxDesignerN, buymeacoffeewidget, Themingsystem, SpikeCompraprotegida, spike-ticket-event-management (#7), urlStuff.
- **Not seeds (→ audits/):** `ux-audit/**`, `ux-uiaudit/**`.

---

## Part B — Templates + thin generator script (1a)

Today groom Stage 7 hand-writes the epic README + each `sprint-N.md` from a prose "house format." Replace the boilerplate with templates + a tiny generator; groom still authors the *content*.

### `skills/groom/templates/`
- `epic-README.md` — Why · context table · sprint list · risk · QA placeholder
- `sprint-N.md` — stories block · Sprint QA section · smoke-walkthrough placeholder (Stage 8b)
- `RETROSPECTIVE.md` — shipped / went well / learned / gaps
- `scope-doc.md` — the readyforscope scope doc **with the frontmatter block above**

All use `{{placeholders}}` (slug, title, area, sprint titles, risk).

### `skills/groom/scaffold-epic.mjs` (Node, zero deps)
- **Input:** `--slug --area NN --macro <macro-folder> --title "…" --sprints "S1 title;S2 title;S3 title" --risk low|high`
- **Creates:** `Roadmap/<NN>-<macro>/<slug>/README.md` + `sprint-1..N.md` + `RETROSPECTIVE.md` stub, from templates.
- **Writes** the seed frontmatter (`status: scaffolded`, `epic:` path).
- **Does NOT auto-commit.** Prints the exact **path-scoped** command for the agent/Daniel to run:
  `git add <the new files> && git commit -- <those paths> -m "plan(<slug>): scaffold epic + sprints"`.
  (Respects the path-scoped-commit + own-worktree norms in WAYS / LEARNINGS.)
- Groom Stage 7 calls it instead of hand-rendering structure.

### Why a script, not a CLI/make target
Lower build + maintenance than an `npm run new-epic` target, deterministic structure, and it slots straight into the existing groom flow. (Full CLI was the rejected option.)

---

## Open questions before build
- **Q-A1.** After the one-time archive, do you want to **keep the numbered folders** (`raw`/`readyforscope`/`done`) as a coarse bucket, or **flatten** to a single `seeds/` + `audits/` and let `status:` be the only lifecycle? (Recommend: flatten — folders stop carrying meaning once frontmatter exists.)
- **Q-A2.** Old `ux-uiaudit/` — **archive** (move to `audits/_legacy/`) or **delete**?
- **Q-A3.** Priority vocabulary — keep BUILD-ORDER **waves** (`wave-0..4`) or switch to **P0/P1/P2**? (Recommend: waves — already in use.)

## Build sequence (after sign-off)
1. Land the frontmatter schema + groom rule (doc edits).
2. One-time cleanup pass (inventory → frontmatter → audit move → renames).
3. Templates + `scaffold-epic.mjs`; wire into groom Stage 7.
4. Verify: scaffold a throwaway epic via the script, confirm structure + path-scoped commit line, discard.
