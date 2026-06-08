# 00-ideas — the idea funnel

The front of the pipeline: raw ideas → scoped seeds → scaffolded epics. Lifecycle is tracked in
**frontmatter on each seed**, not in folder names (folders used to drift because nobody moved files
between `1. raw` / `2. readyforscope` / `3. done`).

```
00-ideas/
├── README.md         ← you are here
├── BUILD-ORDER.md    ← the agreed grooming queue (what gets groomed next, in order)
├── seeds/            ← every idea/scope seed, flat, one .md each (with frontmatter)
└── audits/           ← UX/UI audit findings (reference material, NOT seeds)
    ├── results-refresh-2026-06/   ← the current audit (the lens we build against)
    └── _legacy/                   ← superseded audits, kept for history
        ├── results-v1/
        └── ux-uiaudit/
```

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

### Who owns `status` (frontmatter vs. epic signals)

To avoid two sources of truth fighting:

- **Before an epic exists** (`epic: null`) → the seed's `status` (`raw`/`ready`/`queued`) is authoritative; you set it by hand or `groom` sets it.
- **Once `epic:` is set** → the epic's own signals are authoritative for the build stages: poster ✅ / `RETROSPECTIVE.md` ⇒ `shipped`; some sprint stories ticked ⇒ `in-progress`; otherwise ⇒ `scaffolded`. The Notion sync re-derives this each run, so a slightly stale `status:` on a scaffolded seed self-corrects.

## How seeds flow (no file moves)

1. **Capture** — drop a raw idea as `seeds/<slug>.md` with `status: raw` (the `groom` skill does this from a brain-dump).
2. **Scope** — `groom` fills out the Definition-of-Ready and flips `status: ready`.
3. **Queue** — add it to `BUILD-ORDER.md`; `status: queued`.
4. **Scaffold** — on approval, `groom` runs `skills/groom/scaffold-epic.mjs` to create the epic/sprint docs, then sets the seed's `epic:` + `status: scaffolded`. **No file ever moves between folders** — the frontmatter carries the state.

Filenames are kebab-case and match `slug`. Audits live in `audits/`, never in `seeds/`.
