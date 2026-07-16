# Sprint 1 — Token contract (the substrate #6 consumes)

Goal: put the semantic-token contract and the theme-override boundary into the product
source-of-truth, so the #6 redesign styles by intent without re-deriving the system.

**Status:** ✅ shipped — token contract written at epic close (2026-06-07):
[`token-contract.md`](token-contract.md) (semantic-token reference + locked/unlockable matrix).
*(This Roadmap deliverable was the gap when the S2/S3 code merged in PR #37; written during #4 close-out.)*

Risk tier: **low** — Roadmap documentation only; no code, no commerce, no shared surface.

---

## US-1 — Documented semantic-token contract

**As the** #6 redesign builder, **I want** a documented semantic-token contract, **so that** I style
by intent (`--accent`, `--fg-muted`) without re-deriving the system from `globals.css`.

- [x] Every semantic token is listed with its meaning and the raw scale it resolves to: surfaces
      (`--bg`, `--bg-elevated`, `--bg-sunk`), text (`--fg`, `--fg-muted`, `--fg-subtle`, `--fg-inverse`),
      `--accent` family, feedback (`--energy`/`--promo`/`--agent`/success/warning/danger/info), borders,
      radii, spacing, motion easings, type utilities (`.t-*`), component primitives
      (`.btn`, `.chip`, `.card-tile`, `.badge`, `.input`, `.glass`).
- [x] The `--color-*` (Tailwind) ↔ `--accent`/`--bg` (design-system) alias layers are reconciled so
      there is **one canonical name per concept**, with the alias direction stated.
- [x] Doc names match `globals.css` exactly (no doc-drift) and live in Roadmap, cross-linked from the epic.

## US-2 — Locked-vs-unlockable matrix in Roadmap

**As a** designer/PM, **I want** the theme-override boundary in the product source-of-truth, **so that**
what a theme can and cannot change isn't buried in an unwired reference bundle.

- [x] The locked-vs-unlockable matrix (from `references/.../themes/README.md`) is captured in Roadmap:
      overridable (brand marks, accent palette, surfaces, bg pattern, spot illustrations, tagline) vs
      locked (`--fg*`, fonts, layout grid/header height, motion, voice/icon rules).
- [x] Cross-linked to the shipped seasonal engine's enforced guardrails (`lib/platform-theme.ts`).

## Sprint 1 QA

- [x] Doc review by Daniel.
- [x] Token names cross-checked against `app/globals.css` — every documented token exists; no orphan names.
- [x] No code changed; no gate to run.

## Sprint 1 — Smoke walkthrough (do these in order)
> _Placeholder — fill with real paths at build time. Docs-only sprint: the "smoke" is a doc review._

1. Open the new token-contract doc in `Roadmap/09-platform-infra/design-token-foundation/`.
   → Every semantic token from `globals.css` is listed with meaning + resolved value.
2. Pick three tokens at random (e.g. `--accent`, `--fg-muted`, `--bg-sunk`); grep them in `globals.css`.
   → Each exists and the documented resolution matches.
3. Open the locked/unlockable section.
   → It matches the reference `themes/README.md` matrix and links to `lib/platform-theme.ts`.

If any step fails, note the step number + what you saw — that's the bug report.
