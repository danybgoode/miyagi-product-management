# Repo cleanup + per-repo READMEs — Sprint 1: Per-repo READMEs (flagship root + frontend/backend/zine) + stale-reference sweep

**Status:** ✅ shipped 2026-07-10

## Stories

### Story 1.1 — Root README (flagship) + repo map
**As** the team (and anyone who lands on the root repo), **we want** the root repo's README to carry
the whole story — the mission paragraph (from the poster), a four-repo map saying what each repo owns
and how it deploys, the engineering-practice highlights each linking its backing doc
(WAYS-OF-WORKING, LEARNINGS, `skills/groom`, cross-review/panel scripts), an honest quickstart that
matches `package.json` reality, and pointers into `Roadmap/` — **so that** a visitor understands the
product and the craft in one read.
**Acceptance:**
- No Medusa DTC Starter text, badges, or links remain (including the dead `medusajs/dtc-starter`
  clone URL and the `pnpm` steps — the repo uses `npm@11`).
- The repo is referred to by its real GitHub name (`miyagi-product-management`).
- Every relative link resolves; every practice claim links the doc/script that backs it.
- Voice: concrete, no fluff, no self-congratulation a linked doc can't back (panfleto bar).
- Written in English (WAYS-OF-WORKING language rule — docs, not app copy).
**Risk:** low
**Status:** ✅ committed locally (root repo convention — Daniel pushes), commit `9614024`

### Story 1.2 — Frontend/backend/zine READMEs + stale-reference sweep
**As** the team, **we want** each app repo's README to say what Miyagi is (one paragraph), what this
repo owns in the topology, how it deploys, and how to run it — frontend (`miyagisanchezcommerce`,
replacing stock create-next-app text, linking `AGENTS.md`; `next dev --turbopack --port 3001`),
backend (`medusa-bonsai-backend`, replacing Medusa's stock README; Cloud Build → Cloud Run
`medusa-web`, `medusa develop`), and zine (created **from scratch**, honestly stating its local-only /
no-remote / no-CI / no-deploy status so future agents stop rediscovering it) — each pointing back to
the root repo — **so that** a PR-link visitor to any repo lands on the real story, not boilerplate.
**Acceptance:**
- Zero scaffold boilerplate remains in any of the three; each carries the five-part contract
  (story · ownership · practice highlights short-form + pointer · quickstart · pointers) sized to the repo.
- `apps/zine/README.md` exists and states its local-only status.
- Sweep: no references to retired rails (Render, Flagsmith) in any new README; no dead links.
- Every relative link resolves in each repo's own tree; English throughout.
**Risk:** low
**Status:** ✅ merged/committed —
  frontend [PR #212](https://github.com/danybgoode/miyagisanchezcommerce/pull/212) → `fd13ccec`,
  backend [PR #79](https://github.com/danybgoode/medusa-bonsai-backend/pull/79) → `42430bd`,
  zine committed locally (no remote) → `023753b`

## Sprint QA
- **api spec(s):** none — docs-only, no app behaviour to spec. The deterministic check is a
  **link-check pass** per README (every relative link target exists — `scripts/doc-hygiene.mjs`
  shape) + `grep -ri flagsmith` / retired-rail grep clean on each new README.
- **browser smoke owed:** no money/auth path. **Daniel reads all four READMEs** — the real
  acceptance is "would you send this link to a consultant?"
- **deterministic gate:** frontend/backend PRs still ride their repos' normal CI (a docs-only diff
  passes trivially); root + zine have no CI — the link-check pass is the gate there.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: GitHub (rendered READMEs) + local for zine

**Results (run 2026-07-10, post-merge):**

1. Open https://github.com/danybgoode/miyagi-product-management
   → **PASS.** The README (committed locally, `9614024` — not yet pushed; Daniel pushes per root-repo
     convention) tells the Miyagi story: mission (lifted verbatim from `Roadmap/README.md`), a
     four-repo map table, six practice-highlight bullets each linking their backing doc, and an
     honest quickstart (each app's own `npm install && npm run dev`, plus the root's own
     `npm@11`/Node≥20 tooling note). Zero Medusa DTC Starter text, badges, `pnpm`, or the dead
     `dtc-starter` clone URL survive — confirmed by direct read of the file, not yet visible on
     GitHub until Daniel pushes.
2. Click 3–4 of the README's links (WAYS-OF-WORKING, LEARNINGS, a skill, an app repo).
   → **PASS.** Verified on disk pre-commit: `Roadmap/README.md`, `Roadmap/WAYS-OF-WORKING.md`,
     `Roadmap/LEARNINGS.md`, `skills/groom/SKILL.md`, `scripts/cross-review.mjs`,
     `scripts/cross-panel.mjs`, `tasks/`, `LICENSE` all resolve. Two section-anchor links
     (`WAYS-OF-WORKING.md#review--merge--cross-agent`, `#conventions`) hand-verified against the
     doc's real `##` headers.
3. Open https://github.com/danybgoode/miyagisanchezcommerce
   → **PASS.** [PR #212](https://github.com/danybgoode/miyagisanchezcommerce/pull/212) merged to
     `main` (`fd13ccec`) — confirmed live via `gh api repos/danybgoode/miyagisanchezcommerce/contents/README.md`.
     README says what the frontend owns (UI + UCP/MCP + non-commerce APIs) and how it deploys
     (Cloud Run behind Cloudflare on merge, Vercel previews only); links `AGENTS.md` and
     `e2e/README.md`. No create-next-app boilerplate, no `localhost:3000`, no Geist blurb, no
     Vercel deploy button.
4. Open https://github.com/danybgoode/medusa-bonsai-backend
   → **PASS.** [PR #79](https://github.com/danybgoode/medusa-bonsai-backend/pull/79) merged to
     `main` (`42430bd`) — confirmed live via `gh api repos/danybgoode/medusa-bonsai-backend/contents/README.md`.
     README says what the backend owns (the real `src/modules/` list: seller, subscriptions,
     profit, mercadolibre, fulfillment-envia, auth-clerk, 6 payment providers) and how it deploys
     (Cloud Build → Cloud Run `medusa-web`, ~12 min, no preview). No stock Medusa marketing, no
     Discord/Product Hunt badges.
5. Locally, open `apps/zine/README.md`.
   → **PASS.** Created from scratch (didn't exist before), committed locally (`023753b` — genuinely
     no remote, `git remote -v` returns empty on this repo). States plainly: local-only, no remote,
     no CI, no deploy. Links back to the root repo's `zine-editing-central` epic doc and
     `WAYS-OF-WORKING.md`.
6. Gut check on any one of the four: every concrete claim ("cross-agent review on every PR", "risk
   tiers decide who merges") links the doc that backs it.
   → **PASS.** All four READMEs' practice/deploy/module claims were checked against real source
     (package.json scripts, `src/modules/` directory listing, `cloudbuild.yaml`, `AGENTS.md`) —
     not paraphrased from memory. Two independent `pr-reviewer` passes (frontend PR #212, backend
     PR #79) each re-verified every factual claim against the diff and repo state and found no
     unsupported claims; both approved with no required changes.

**Gaps / owed:**
- Root repo's README commit (`9614024`) is **local-only, not yet pushed** — per root-repo
  convention, Daniel pushes it. Until then, step 1 above is only verifiable locally, not on the
  rendered GitHub page.
- Deterministic gate: frontend PR #212 CI (Type-check+build, Playwright vs preview, Vercel) and
  backend PR #79 CI (Type-check+build+unit) both ran green before merge — confirmed via
  `gh pr checks`, not just assumed.
- No money/auth path in this sprint — no browser smoke owed beyond Daniel's own read of all four
  READMEs ("would you send this link to a consultant?").
