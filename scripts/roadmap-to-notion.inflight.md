# In-flight visibility for the Roadmap → Notion projection — design note

_Companion to `scripts/roadmap-to-notion.mjs` and `.github/workflows/notion-pr-sync.yml`._
_Status: ratified + live. The two new Notion properties (`Lifecycle`, `PR link`) were added to the
Marketplace Roadmap DB on 2026-06-13 and validated end-to-end against a real epic row (set "In review"
→ read back → `--clear` → read back; docs-derived `Status` stayed untouched throughout). The only step
left to activate the live hook is pushing `notion-pr-sync.yml` to `main`._

## The problem

The board jumps **Scaffolded → Shipped** at merge. We want it to also show **In review / PR-open** while an
epic is being built, so the Notion board reflects an epic's lifecycle *as it happens*.

## The hard constraint (must not violate)

`--sync` is a **full board rebuild keyed by slug** — it rewrites every row from one checkout's view of the
docs. Running it from a feature branch would overwrite every *other* epic's row with that branch's worldview,
and two parallel branches would clobber each other. So in-flight updates **must be scoped to only the epic(s)
the PR actually touches**, and must never run the full rebuild from a branch. Everything below follows from
that one rule.

## Decisions

### 1. In-flight status is a separate property, not a `Status` value

`Status` is **docs-derived** — the projection re-computes it every run from the merged docs (Scaffolded /
In progress / Shipped). A PR being open is a **git event, not a doc fact**: nothing has merged yet. Writing
"In review" into `Status` would let a non-docs source author the docs-owned column and the next `--sync` would
stomp it anyway. So in-flight lives in its **own overlay**, leaving the one-way docs → `Status` contract
untouched:

| New property | Type | Set by | Meaning |
|---|---|---|---|
| **`Lifecycle`** | Select | the PR workflow | `In review` while a PR touching the epic is open; empty otherwise |
| **`PR link`** | URL | the PR workflow | the open PR's URL (clears with the overlay) |

`--sync` never reads or writes these, so a full rebuild and the overlay can't fight. (Property names are single
constants at the top of the `--pr` block in the script — rename in one place if Daniel prefers e.g. `PR` over
`Lifecycle`.)

### 2. The signal: a `pull_request` workflow, scoped by changed paths

`.github/workflows/notion-pr-sync.yml` fires on `opened / synchronize / reopened / closed` for PRs touching
`Roadmap/**`. It derives the epic slug(s) from the changed files (`Roadmap/<NN-macro>/<epic>/…` → `<epic>`)
and calls the scoped script mode — **never `--sync`**:

- **opened / synchronize / reopened** → `--pr <slug> --status "In review" --link <pr-url>` — sets the overlay on
  that epic's row **and its sprint rows** (`<slug>` and `<slug>--s*`).
- **closed, NOT merged** → `--pr <slug> --clear` — **reverts** the overlay (the work didn't ship; the epic
  drops back to its docs-derived `Status`).
- **closed, merged** → `--pr <slug> --clear` — also clears the overlay, because the merge pushed to `main`,
  which triggers the existing `notion-sync.yml`; that full rebuild re-derives `Status` from the now-merged docs
  and **takes over**. (`--sync` doesn't touch `Lifecycle`, so without this clear the row would linger on
  "In review" after shipping — hence we clear on every close.)

A non-epic Roadmap change (e.g. a seed under `00-ideas/`) derives no real epic slug and the scoped PATCH simply
no-ops — safe by construction.

### 3. Parallel epics / multiple open PRs — collision-free by scope

Each PR's workflow derives slugs from **its own** changed paths and PATCHes **only** those rows. Two PRs on
**different** epics never address the same row, so they can't clobber each other — this is exactly the property
`--sync`-from-a-branch lacked.

Two PRs touching the **same** epic dir is already off-pattern (WAYS-OF-WORKING: *one working branch per epic*).
If it happens: both set `Lifecycle = In review` (correct — the epic *is* in review), and `PR link` is
last-writer-wins. The only rough edge is that closing one of them runs `--clear` while the other is still open,
prematurely blanking the overlay; the nightly/`workflow_dispatch` `--sync` and the rarity make this acceptable.
We deliberately do **not** add a reference-count state machine for it — that would re-introduce a second source
of truth, which this whole design avoids.

### 4. Planning visibility (Scaffolded) — the cheap path already covers it

Scaffold commits land on `main` (planning commits straight to `main`) and, once the human pushes (the Cowork
sandbox can't push — GitHub egress 403s), `notion-sync.yml`'s push trigger rebuilds the board and the epic shows
**Scaffolded** within ~a minute. No new mechanism is warranted; the only "latency" is the human-push step, which
is inherent to the sandbox and not something an in-flight hook should paper over.

## What was built

- **`scripts/roadmap-to-notion.mjs` — new `--pr` mode** (~40 lines, zero-dependency, reuses `api()`/`sel()`;
  **no new full-rebuild path**):
  - `--pr <epic-slug>[,<slug2>] --status "In review" --link <pr-url>` — scoped PATCH of the overlay.
  - `--pr <epic-slug> --clear` — drop the overlay (PR closed/merged).
  - `--dry` — preview the targeted rows from the projection **without touching Notion** (no token needed;
    this is the smoke path).
- **`.github/workflows/notion-pr-sync.yml`** — the `pull_request` trigger above; mirrors `notion-sync.yml`'s
  `NOTION_TOKEN` secret-guard and adds **per-PR concurrency** (`notion-pr-sync-<pr-number>`) so rapid
  `synchronize` pushes coalesce.

## Activation checklist

1. ~~Add **`Lifecycle`** (Select, option `In review`) and **`PR link`** (URL) to the **Marketplace Roadmap**
   DB.~~ **Done 2026-06-13.** Notion rejects a PATCH to an unknown property, so this had to land first.
2. `NOTION_TOKEN` is already the secret `notion-sync.yml` uses — no new secret needed. Confirm that token's
   Notion integration has access to the Marketplace Roadmap DB (it does, since `notion-sync.yml` writes it).
3. **Push `notion-pr-sync.yml` to `main`** — until then the hook is dormant. (Sandbox can't push; the human does.)

## Validation (done)

- **Script (`--dry`, no token):** `--extract` unchanged (161 rows); `--pr … --dry` for set / clear /
  multi-slug / unknown-slug all targeted the right rows (epic + its `--s*` sprints) and emitted the right
  payload shape.
- **Live board (via the Notion connector — same API + property JSON the script PATCHes):** on the real
  `discovery-polish` epic + its S1 sprint, set `Lifecycle="In review"` + `PR link`, read back (both set;
  `Status` stayed `Shipped` — the overlay is decoupled from docs-derived Status), then `--clear` and read
  back (both empty; `Status` still `Shipped`). The board was returned to its clean projected state.
