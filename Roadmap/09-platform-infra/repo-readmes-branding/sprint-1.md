# Repo cleanup + per-repo READMEs — Sprint 1: Per-repo READMEs (flagship root + frontend/backend/zine) + stale-reference sweep

**Status:** ⬜ not started

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

1. Open https://github.com/danybgoode/miyagi-product-management
   → The README tells the Miyagi story: mission, four-repo map, practice highlights, quickstart.
     No Medusa DTC Starter text or badges anywhere.
2. Click 3–4 of the README's links (WAYS-OF-WORKING, LEARNINGS, a skill, an app repo).
   → Each resolves — no 404, no dead relative path.
3. Open https://github.com/danybgoode/miyagisanchezcommerce
   → README says what the frontend owns + how it deploys (Vercel, previews); links AGENTS.md; no
     create-next-app boilerplate.
4. Open https://github.com/danybgoode/medusa-bonsai-backend
   → README says what the backend owns + how it deploys (Cloud Build → Cloud Run, ~12 min, no
     preview); no stock Medusa marketing.
5. Locally, open `apps/zine/README.md`.
   → It exists, explains the zine studio's role, and states plainly: local-only repo, no remote, no
     CI, no deploy.
6. Gut check on any one of the four: every concrete claim ("cross-agent review on every PR", "risk
   tiers decide who merges") links the doc that backs it.
   → Nothing reads as marketing a linked doc can't substantiate.

If any step fails, note the step number + what you saw — that's the bug report.
