# Sprint 3 — Decommission Flagsmith

**Epic:** [In-house feature flags](README.md) · **Goal:** remove the Flagsmith dependency entirely, now that the
in-house store is proven serving live. Run **last** — only after S1 + S2 are confirmed working in prod, so there is
never a window with no flag backend.

> **Shared-surface caution.** This touches both `package.json`s — a dependency change can break sibling PRs' installs.
> Announce before merging (per WAYS-OF-WORKING shared-surface rule).

## Stories

### S3.1 — Remove `flagsmith-nodejs` + Flagsmith env/secrets + doc scrub — **LOW**
**As** the platform, **I want** no trace of Flagsmith in the running apps, **so that** we're off the SaaS entirely
and no one is confused about where flags live.
- Remove `flagsmith-nodejs` from `apps/miyagisanchez/package.json` and `apps/backend/package.json`; update lockfile.
- Delete Flagsmith env vars: `FLAGSMITH_ENVIRONMENT_KEY`, `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY`, `FLAGSMITH_ADMIN_API_TOKEN` from `.env.local` / Vercel / Cloud Run / Secret Manager. Remove the Flagsmith MCP server from local config if still present.
- Scrub Flagsmith references in code comments + doc headers of `lib/flags.ts` (both), replacing with the in-house store description. Leave **historical Roadmap docs** (the shipped epic, spike, retro) as-is — they're the record.
- **Acceptance (Daniel):** `grep -ri flagsmith apps/` returns only `.next` build artifacts + historical Roadmap references; both apps `npm run build` green; flag reads still work off `platform_flags`; a flip via `/admin/flags` still takes effect.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` (both apps) + full `npm run test:e2e` api specs + BE unit specs — all green with Flagsmith gone.
- **No new specs** — this is subtractive; the S1/S2 specs are the guarantee that flags still work without the dependency.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production `https://miyagisanchez.com` (post-merge).

1. Run `grep -ri flagsmith apps/miyagisanchez/lib apps/backend/src` locally.
   → No matches (only historical Roadmap docs mention Flagsmith).
2. Open `https://miyagisanchez.com/admin/flags`, toggle `pdp_redesign` OFF, wait ~60 s, load a product page.
   → PDP reverts — flags still work with Flagsmith fully removed. Toggle back ON.
3. Confirm the Vercel + Cloud Run env no longer lists any `FLAGSMITH_*` var.
   → None present; apps healthy.

If any step fails, note the step number + what you saw — that's the bug report.
