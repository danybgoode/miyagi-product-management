# Sprint 3 - Collaboration Visual Layer

Goal: make the collaboration feel intentional without layout shifts, heavy assets, or behavior changes.

Status: implemented with QA notes 2026-06-05 on `feat/seasonal-theme-engine`.

Risk tier: Low - decorative/platform presentation layer only.

---

## US-7 - Logo, tagline, and accent treatment

**As a** visitor, **I want** the collaboration identity to appear in the platform chrome, **so that** the seasonal moment is immediately recognizable.

- [x] Header logo treatment swaps through the manifest while preserving dimensions.
- [x] Campaign tagline can appear in a reserved platform slot without pushing nav controls.
- [x] Accent changes flow through semantic variables used by buttons, chips, badges, links, and active states.

## US-8 - Background pattern and spot art

**As a** visitor, **I want** subtle seasonal art in safe places, **so that** the experience feels curated without hiding content.

- [x] Background pattern applies to platform page bands/containers only.
- [x] Spot illustrations render only in reserved, non-interactive placements.
- [x] Assets are CSS-only/lightweight and background-thread friendly.
- [x] Core textual and structural content loads first.

## US-9 - Final QA and documentation

**As the** product owner, **I want** the shipped epic documented and smoke-tested, **so that** the roadmap stays trustworthy.

- [x] Sprint docs are ticked with implementation refs.
- [x] 08 macro README is updated with the in-progress/code-complete epic.
- [x] Team memory is updated with the theme engine facts and gotchas.
- [ ] Product poster and retrospective remain open for final epic closeout.

## QA / smoke

- [x] `npx tsc --noEmit`, focused touched-file lint, `npm run build`, and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npx playwright test e2e/platform-theme.spec.ts` pass.
- [ ] Full `npm run lint` is blocked by existing baseline errors outside this epic.
- [x] In-app browser DOM/geometry smoke covers desktop and mobile widths for eligible/excluded routes.
- [ ] Full click-through browser smoke remains pending until browser binaries or preview QA are available.
