---
title: Notion roadmap sync — field/column map
slug: notion-roadmap-sync
status: shipped
area: "09"
type: chore
priority: wave-0
risk: low
epic: null
build_order: null
updated: 2026-06-24
---

> **Signed off 2026-06-08.** Directions chosen: flatten numbered folders → `seeds/` + `audits/` (frontmatter is the lifecycle); templates + thin generator script; Notion = one new DB with a Grain filter, docs always win. Building now.

# Notion roadmap sync — field/column map (for sign-off)

> **This is the first deliverable: the field/column map only.** No sync is built until you sign off.
> Decisions locked: **one-way docs → Notion**, **new dedicated database**, **grain = epics + seeds (full funnel)**.
> Docs are the **only** source of truth; the board is a rebuilt projection — existing live board columns are treated as untrustworthy and are **not** read.

---

## Target: a new database — "Marketplace Roadmap"

A fresh, clearly-scoped database (separate from the existing accounting/CMO-framed "Miyagi Sánchez" DB, which uses a different lens). One row per **epic** and one row per **un-scaffolded seed/idea**, so the board shows the whole funnel from raw idea → shipped.

## The map: doc lifecycle → board columns

| # | Notion property | Type | Source of truth in docs | Values / mapping |
|---|---|---|---|---|
| 1 | **Name** | Title | seed `title` / epic README H1 | free text |
| 2 | **Status** | Select | lifecycle (frontmatter `status`, cross-checked vs poster + BUILD-ORDER) | `Raw` · `Ready` · `Queued` · `Scaffolded` · `In progress` · `Shipped` · `Archived` |
| 3 | **Area** | Select | macro-section folder / `area` | `01 Discovery` · `02 Checkout & Payments` · `03 Selling & Shops` · `04 Shipping` · `05 Trust/Offers/Messaging` · `06 Print` · `07 Agentic/Federated` · `08 Growth` · `09 Platform-infra` |
| 4 | **Priority** | Select | BUILD-ORDER wave / `priority` | `Wave 0 Enablers` · `Wave 1` · `Wave 2` · `Wave 3` · `Wave 4` |
| 5 | **Type** | Select | groom classification / `type` | `Epic` · `Feature` · `Spike` · `Chore` |
| 6 | **Risk** | Select | `risk` / WAYS risk tier | `Low` · `High` |
| 7 | **Grain** | Select | which kind of row | `Epic` · `Seed` |
| 8 | **Sprint progress** | Text/Number | count of ticked stories in `sprint-N.md` | e.g. `4/7 stories` (epics only) |
| 9 | **Build order ID** | Text | BUILD-ORDER id | e.g. `#5`, `#3b` |
| 10 | **Doc link** | URL/Text | path (+ commit) to epic README or seed | relative repo path |
| 11 | **Last synced** | Date | sync run | set by the sync each run |

### Status — the derivation rule (single source)
Computed from doc signals in this precedence (highest wins):

1. poster `README.md` shows ✅ **or** epic has `RETROSPECTIVE.md` → **Shipped**
2. some `sprint-N.md` stories ticked (not all) → **In progress**
3. epic folder/README exists (poster 🚧) → **Scaffolded**
4. listed in BUILD-ORDER as ⬜ → **Queued**
5. scope doc complete in readyforscope → **Ready**
6. otherwise → **Raw**
7. frontmatter `status: archived` → **Archived** (overrides)

This means **Status is always re-derivable from the docs** — the board never holds state the docs don't.

## Sync semantics (high-level — for context, built only after map sign-off)
- **One-way, idempotent, upsert by `slug`** (stable key; matched via the Build order ID / a hidden slug property).
- **Docs win every field, every run.** A manual edit on the board is overwritten on next sync — by design (board = projection).
- The sync **never deletes** silently: a seed that disappears from docs → set `Archived`, not removed (safer; revisit if you'd rather hard-delete).
- Cadence: on demand now; can be a scheduled task later (e.g. nightly) once trusted.

## Open questions before build
- **Q-N1.** Confirm the **Status vocabulary** above (6 live states + Archived) — add/rename any?
- **Q-N2.** Should **seeds** and **epics** live in **one** database (with a `Grain` filter, as drafted) or **two** linked databases? (Recommend: one + Grain filter — simpler, one board view.)
- **Q-N3.** Priority as **waves** (drafted) or **P0/P1/P2**? (Keep consistent with #1's Q-A3.)
- **Q-N4.** Conflict policy — confirm **docs always overwrite board edits** (recommended), vs. preserve a few human-only fields (e.g. a free-text "Notes" column the sync never touches).

---

## BUILT (2026-06-08)

- **Database:** "Marketplace Roadmap" — https://app.notion.com/p/eb68a1fd05f443b184b6b5b3db89f47e
  (data source `b03c3322-7777-426a-b727-9480ebb2f74b`). Created at workspace level; move it into a teamspace as you like.
- **Schema:** exactly the signed-off map (Name · Slug · Status · Area · Priority · Type · Risk · Grain · Sprint progress · Build order ID · Doc link · Last synced).
- **Initial projection:** 32 rows (23 epics + 9 seeds), populated from the repo.
- **Sync tool:** `scripts/roadmap-to-notion.mjs`.
  - `node scripts/roadmap-to-notion.mjs --extract` → prints the projected rows as JSON (no Notion needed; the testable core).
  - `NOTION_TOKEN=… NOTION_DB_ID=eb68a1fd05f443b184b6b5b3db89f47e node scripts/roadmap-to-notion.mjs --sync` → upsert by Slug (docs always win; rows whose slug vanished from docs are set Archived, never hard-deleted).
- **Run cadence:** on demand; can be wired to a scheduled task once trusted.
