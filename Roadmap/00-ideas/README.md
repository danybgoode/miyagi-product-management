# 00-ideas — the idea funnel

The front of the pipeline: raw ideas → scoped seeds → scaffolded epics. Lifecycle is tracked in
**frontmatter on each seed**, not in folder names (the old numbered folders drifted because nobody
moved files between `1. raw` / `2. readyforscope` / `3. done`). The flat `seeds/` model is the
forward path; the numbered folders are **legacy, not yet retired** — see the note below.

```
00-ideas/
├── README.md         ← you are here
├── BUILD-ORDER.md    ← GENERATED status board (run `node scripts/build-order.mjs`) — do NOT hand-edit
├── seeds/            ← every idea/scope seed, flat, one .md each (with frontmatter) — the forward path
├── audits/           ← UX/UI audit findings (reference material, NOT seeds)
│   ├── results-refresh-2026-06/   ← the current audit (the lens we build against)
│   └── _legacy/                   ← superseded audits, kept for history
│       ├── results-v1/
│       └── ux-uiaudit/
├── 1. raw/           ← LEGACY intake folder (pre-`seeds/`) — kept, not yet migrated
├── 2. readyforscope/ ← LEGACY scope-doc folder — STILL an active scaffold source (see note)
└── ux-uiaudit/       ← LEGACY audit folder (superseded by audits/)
```

### Legacy numbered folders — still live, not yet retired

The flat `seeds/` schema above is the SSOT going forward, but the migration isn't finished:
**`2. readyforscope/` is still an active scope-doc source.** Many epics were (and as recently as
2026-06 still are) scaffolded directly from a scope doc in that folder rather than from a `seeds/`
entry — which is why a large share of scaffolded epics have **no** corresponding `seeds/*.md` file.
This is fine (the scaffolded epic README is the SSOT once `epic:` exists), but it means:

- When auditing the funnel, **read both `seeds/` and `2. readyforscope/`** — a missing `seeds/` file
  is not proof an idea was never scoped.
- The endgame is to migrate the remaining un-scaffolded `2. readyforscope/` docs into `seeds/` and
  retire the numbered folders. Until then, treat them as a read-only legacy staging area: **don't add
  new files there** (new ideas go in `seeds/`), but don't assume they're dead either.

## Seed frontmatter (the lifecycle source)

Every file in `seeds/` starts with this block. It is also the **exact source the Notion roadmap
sync reads** (see `seeds/notion-roadmap-sync.md`).

```yaml
---
title: "Granular multi-channel notifications"
slug: granular-notifications        # kebab; matches the filename
status: in-progress                  # raw | ready | queued | scaffolded | in-progress | shipped | archived
area: "05"                           # macro-section 01-09
type: feature                        # feature | spike | chore | epic
priority: wave-2                     # wave-0..wave-4, or null
risk: high                           # low | high
epic: "05-trust-offers-and-messaging/granular-notifications"   # path to the scaffolded epic, or null
build_order: "#5"                    # BUILD-ORDER id, or null
updated: 2026-06-08
---
```

### status — definitions

| status | meaning |
|---|---|
| `raw` | unrefined idea, no scope yet |
| `ready` | Definition-of-Ready scope doc written |
| `queued` | accepted into `BUILD-ORDER.md` (⬜) |
| `scaffolded` | epic + sprint docs created (`epic:` set; poster 🚧) |
| `in-progress` | building (some sprint stories ticked) |
| `shipped` | epic done (epic ✅ + RETROSPECTIVE; poster ✅) |
| `archived` | dropped or superseded |

The enum is **enforced, not advisory**: a present-but-unrecognized `status:` value (on a seed, or on
an epic README — whose enum is `scaffolded | in-progress | shipped | archived`, plus legacy `queued`)
**hard-fails** `scripts/roadmap-to-notion.mjs`, and with it `build-order.mjs`/CI and the Notion sync.
It used to fall back silently to the derived status, which made the drift check unable to fire on
exactly this class of error (see `audits/roadmap-grooming-audit-2026-07-06.md` §1).

### Who owns `status` (seed vs. epic-README frontmatter)

One field is authoritative at each stage — they never both drive the board:

- **Before an epic exists** (`epic: null`) → the **seed's** `status` (`raw`/`ready`/`queued`) is authoritative; you set it by hand or `groom` sets it. This is what the BUILD-ORDER **funnel** shows.
- **Once `epic:` is set** → the **epic README's frontmatter `status:` is the SSOT** (set at epic close: `scaffolded` → `in-progress` → `shipped`). The seed is now **funnel-only** — its `status:` is no longer read for the board, so it can't drift it. Both `scripts/build-order.mjs` and the Notion sync read the epic README frontmatter (falling back to sprint/retro derivation only if the field is absent, and flagging an advisory drift when the two disagree). **`BUILD-ORDER.md` is a generated view — never hand-edit it; change the README `status:` and run `node scripts/build-order.mjs`.**

## How seeds flow (no file moves)

1. **Capture** — drop a raw idea as `seeds/<slug>.md` with `status: raw` (the `groom` skill does this from a brain-dump).
2. **Scope** — `groom` fills out the Definition-of-Ready and flips `status: ready`.
3. **Queue** — add it to `BUILD-ORDER.md`; `status: queued`.
4. **Scaffold** — on approval, `groom` runs `skills/groom/scaffold-epic.mjs` to create the epic/sprint docs, then sets the seed's `epic:` + `status: scaffolded`. **No file ever moves between folders** — the frontmatter carries the state.

Filenames are kebab-case and match `slug`. Audits live in `audits/`, never in `seeds/`.
