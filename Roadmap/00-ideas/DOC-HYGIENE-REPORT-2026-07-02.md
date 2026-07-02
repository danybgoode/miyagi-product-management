<!-- Advisory artifact from the doc-hygiene skill (scripts/doc-hygiene.mjs). Findings are proposals
     only — no LEARNINGS.md/README.md content was changed by this script. -->

# Doc hygiene report — 2026-07-02

🧹 **doc-hygiene skill.** Advisory only — review by hand; nothing here gates or auto-edits.

## Always-read set size

| Doc | Lines | KB |
|---|---|---|
| AGENTS.md | 188 | 10.5 |
| WAYS-OF-WORKING.md | 240 | 22.8 |
| LEARNINGS.md | 981 | 94.4 |
| README.md (poster) | 323 | 112.5 |
| **Total** | **1,732** | **240.4** |

## LEARNINGS.md — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `LEARNINGS.md` line 113: `app/robots.ts`
- `LEARNINGS.md` line 830: `app/shop/manage/page.tsx`
- `LEARNINGS.md` line 859: `lib/notifications/{dispatch,preferences}.ts`

## README.md (poster) — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `README.md (poster)` line 242: `app/l/[id]/Gallery.tsx`

**Mentions an archived epic** (check whether the lesson is superseded):

- `README.md (poster)` line 228: mentions archived epic `neon-egress-and-db-isolation`

---
Advisory only — never auto-edits. Review, then hand-merge any accepted change.
