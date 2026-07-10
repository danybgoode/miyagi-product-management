<!-- Advisory artifact from the doc-hygiene skill (scripts/doc-hygiene.mjs). Findings are proposals
     only — no LEARNINGS.md/README.md content was changed by this script. -->

# Doc hygiene report — 2026-07-10

🧹 **doc-hygiene skill.** Advisory only — review by hand; nothing here gates or auto-edits.

## Always-read set size

| Doc | Lines | KB |
|---|---|---|
| AGENTS.md | 188 | 10.9 |
| WAYS-OF-WORKING.md | 246 | 23.4 |
| LEARNINGS.md | 1,428 | 138.0 |
| README.md (poster) | 506 | 155.1 |
| **Total** | **2,368** | **327.4** |

## LEARNINGS.md — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `LEARNINGS.md` line 171: `app/robots.ts`
- `LEARNINGS.md` line 259: `scripts/standups.log`
- `LEARNINGS.md` line 427: `lib/x.ts`
- `LEARNINGS.md` line 458: `scripts/standups.log`
- `LEARNINGS.md` line 458: `scripts/weekly-recaps.log`
- `LEARNINGS.md` line 1253: `app/shop/manage/page.tsx`
- `LEARNINGS.md` line 1282: `lib/notifications/{dispatch,preferences}.ts`

## README.md (poster) — flagged candidates

**Referenced paths not found in this checkout** (verify against the app repo before treating as stale — this checkout can be behind the app's own `main`):

- `README.md (poster)` line 288: `scripts/standups.log`
- `README.md (poster)` line 288: `scripts/weekly-recaps.log`
- `README.md (poster)` line 425: `app/l/[id]/Gallery.tsx`

**Mentions an archived epic** (check whether the lesson is superseded):

- `README.md (poster)` line 411: mentions archived epic `neon-egress-and-db-isolation`

---
Advisory only — never auto-edits. Review, then hand-merge any accepted change.
