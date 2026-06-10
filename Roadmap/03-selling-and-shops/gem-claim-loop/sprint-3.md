# Sprint 3 — docs, cleanup, the real gem

Goal: the next import "just works" from the docs alone; the orphaned 2026-06-09 prod rows are gone;
Las Duelistas is live and featurable.

## Stories

### S3.1 — docs match reality
- [x] `SUPPLY_IMPORT_SCHEMA.md`: import target = Medusa seller + products (mirror noted), new `POST /api/supply/upload` documented, claim-complete path noted; CSV schema unchanged.
- [x] `/supply` UI copy checked for staleness.

### S3.2 — orphan cleanup + Las Duelistas
- [x] Delete orphaned mirror rows from the failed run: shop `5ed4890f-2363-4ac0-b69c-8231f471d96c`, listing `df12a345-6323-4c6f-87af-909f7b6ab28c`.
- [x] Re-approve the item in batch `1325c9ef-2e56-44dc-ad0d-8513db22b713`, host `gems/las-duelistas/*.jpg` via `POST /api/supply/upload`, attach as `image_url`, re-import through the fixed path → Las Duelistas live at a stable `/s/[slug]`.

### S3.3 — verification + harness
- [x] e2e specs added per testable story (`npm run test:e2e` harness).
- [x] All 6 end-state criteria verified on prod (2026-06-09): Las Duelistas through the fixed import (200 / badge+CTA / full listing fields+photo / search + short code `1ibulh`), upload with no Clerk, docs merged; claim semantics API-smoked on a disposable seller `qa-gema-prueba` (fresh 200 → retry 200 → second claimer 409 → badge gone). Residue: the QA seller shell remains (no delete API) — see RETROSPECTIVE.

## Epic close (DoD)
- [x] `Roadmap/README.md` poster updated · `RETROSPECTIVE.md` · durable learnings → `Roadmap/LEARNINGS.md` · memory updated.
