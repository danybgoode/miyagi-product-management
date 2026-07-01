# Sprint 3 — Decommission Flagsmith

**Epic:** [In-house feature flags](README.md) · **Goal:** remove the Flagsmith dependency entirely, now that the
in-house store is proven serving live. Run **last** — only after S1 + S2 are confirmed working in prod, so there is
never a window with no flag backend.

> **Shared-surface caution.** This touches both `package.json`s — a dependency change can break sibling PRs' installs.
> Announce before merging (per WAYS-OF-WORKING shared-surface rule).

## Stories

### S3.1 — Remove `flagsmith-nodejs` + Flagsmith env/secrets + doc scrub — **LOW**
> **Status: ✅ MERGED+DEPLOYED 2026-07-01.** FE [miyagisanchezcommerce #152](https://github.com/danybgoode/miyagisanchezcommerce/pull/152) squash `d9eddd1` · BE [medusa-bonsai-backend #51](https://github.com/danybgoode/medusa-bonsai-backend/pull/51) squash `1b44587` · root-repo infra + doc `c853827`. Both app PRs subtractive (comment scrubs + one unused dep-line each). Deterministic gate green: FE `tsc`+build+Playwright-vs-preview all pass in CI; BE `Type-check + build + unit` pass in CI (+ 83 unit tests locally); infra drift guard 19/19. Cross-agent review (codex) clean on both. **Post-merge cleanup DONE:** live `FLAGSMITH_*` secrets deleted — Vercel prod+preview env, Cloud Run binding (revision `medusa-web-00125-6lx`, healthy), Secret Manager secret; Flagsmith MCP server + stale token permission lines removed from local config; `.env.local` cleaned by Daniel. `grep -ri flagsmith apps/` clean on both merged `main`s. **Owed to Daniel:** the live `/admin/flags` flip smoke (browser/session-gated) — money-path `checkout.stripe_enabled` flip especially.

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
Env: production `https://miyagisanchez.com` (post-merge). Steps 4–5 are the **owed-to-Daniel** live parts.

1. **Code is clean.** From the repo root run `grep -ri flagsmith apps/` (on a fresh `main` checkout of both app repos).
   → **No matches** except `.next` / `.medusa` build artifacts. (Historical mentions remain only under `Roadmap/`, which is outside `apps/`.)
2. **Both apps still build with the dependency gone.** In each app repo on `main`: `npm run build`.
   → Green — nothing imported `flagsmith-nodejs` (S1 already swapped the reader to Supabase `platform_flags`).
3. **The flag reader still resolves.** Load any product page `https://miyagisanchez.com/l/<id>`.
   → Renders normally — `isEnabled('pdp_redesign')` reads `platform_flags` (fail-open), no Flagsmith involved.
4. **A flip with Flagsmith fully removed still takes effect** *(owed to Daniel — admin session).*
   Open `https://miyagisanchez.com/admin/flags`, toggle `pdp_redesign` **OFF**, wait ~60 s (cache TTL), reload a product page.
   → PDP reverts to the previous layout. Toggle back **ON**, wait ~60 s, reload → redesign returns. (`admin_audit_log` records both flips.)
   *(Money-path `checkout.stripe_enabled` flip stays **owed to Daniel** — an automated smoke can't cover a real checkout.)*
5. **No `FLAGSMITH_*` secret remains anywhere** *(owed to Daniel to confirm after the post-merge secret deletion).*
   - Vercel (`miyagisanchez` project) env → no `FLAGSMITH_ENVIRONMENT_KEY` / `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY` / `FLAGSMITH_ADMIN_API_TOKEN`.
   - `gcloud run services describe medusa-web --region us-east4` → no `FLAGSMITH_ENVIRONMENT_KEY` secret binding; Secret Manager no longer lists the secret.
   → None present; both apps healthy.

If any step fails, note the step number + what you saw — that's the bug report.
