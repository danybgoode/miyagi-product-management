# Learnings — operating notes for every build

**Read this at the start of every session.** It's the distilled, cross-cutting wisdom from past
epics' retrospectives — the things that would have saved the last agent time. The full story of any
item lives in its epic's `RETROSPECTIVE.md`; this file keeps only the *transferable* rule.

**How this file stays useful (Definition of Done, epic):** at epic close, promote any durable,
generalizable learning from your `RETROSPECTIVE.md` into the right section below — a one-liner + a
*why* + the date/source. **Dedupe** (sharpen the existing line, don't append a near-duplicate). If a
rule here is now wrong, fix or delete it. Keep it short — a long digest is an unread digest.

---

## Multi-agent & async deploy coordination
*Several agents work in parallel on their own branches, against two repos that deploy independently.*

- **Two repos, two deploy rails, different speeds.** Frontend (`apps/miyagisanchez`) → Vercel on
  merge, with a per-branch **preview**. Backend (`apps/backend`) → Cloud Build us-east4 → Cloud Run
  on merge, **~12 min, no preview**. When a frontend feature reads data a backend change produces,
  **merge backend first (or together)** and make the frontend **degrade gracefully** (`?? []`,
  null-safe) so the deploy-lag window never breaks prod. *(2026-06-05, Configurable & Personalized
  Products — frontend read `order.personalization ?? []`, a safe no-op until the backend normalizer
  shipped.)*
- **Render is not the active backend deploy rail.** If a stale Render service appears in local CLI
  history, ignore it for Miyagi backend shipping. The source of truth is the backend repo's
  `cloudbuild.yaml`: Cloud Build trigger `backend-main-deploy` in `us-east4`, deploying Cloud Run
  service `medusa-web`. *(Support Widget epic, 2026-06-05.)*
- **`main` moves under you.** Before opening a PR — and again if it sits open — **merge latest
  `main` into your branch**. Tell-tale: CI's "Playwright vs preview" fails on a spec for a feature
  you never touched → a sibling agent landed something on `main` and your preview predates it.
  Merge `main`, don't debug your own diff. *(2026-06-05 — a seasonal-theme spec on `main` failed
  against a preview that lacked the feature.)*
- **Announce cross-cutting or direct-to-`main` changes**, and prefer a PR even for "engine"
  features. Anything touching shared surface — `layout.tsx`, `middleware.ts`, `globals.css`,
  `package.json`/deps, a new sibling worktree — can break every other open PR. *(2026-06-05 — a
  feature pushed straight to `main` broke this epic's CI and local tooling.)*
- **Don't yank a shared branch out from under another agent.** If the repo's working tree is on
  someone else's branch, do your change in an isolated `git worktree` instead of switching it.
  *(2026-06-05 — backend tree was on another agent's branch; used `.worktrees/…` for the S3 change.)*
- **Risk tier decides who merges** (from WAYS-OF-WORKING): low-risk → the reviewer/agent may merge on
  green CI; anything touching payments / checkout / fulfillment / auth / DB / shared infra / money →
  **Daniel merges**. When unsure, treat as high.

## Tooling gotchas
- **Run the repo binaries directly when `npm`/`npx` chokes.** A sibling worktree that reuses the same
  package name (e.g. `apps/miyagisanchez-seasonal-theme`) breaks npm **workspace resolution** at the
  monorepo root. Use `node /…/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` and
  `/…/node_modules/.bin/{next,playwright}`. New worktrees should use a unique package name or be
  excluded from the root `workspaces` glob. *(2026-06-05.)*
- **`gh pr merge --delete-branch` fails when a worktree holds `main`.** The merge still succeeds on
  GitHub; only the local branch-delete errors. Verify with `gh pr view <n> --json state`. Don't
  re-run blindly.
- **A unit-tested pure helper can't live in a module that imports `next/cache`.** The Playwright
  runner can't load `next/cache`, so importing the module to test the pure function throws. Keep the
  pure logic in a next-free module (e.g. `lib/slug.ts`) and let the cached/DB wrapper import *it*.
  *(2026-06-06, custom-slugs.)*
- **GitHub Actions sometimes just doesn't schedule `ci.yml` for a PR.** Seen once: a sibling PR's CI
  ran minutes apart but ours never triggered on `opened`; **close/reopen didn't fix it — an empty-commit
  push (a real `synchronize`) did.** Don't merge on an absent gate: re-trigger, and lean on the local
  gate (tsc + build + specs) + the green Vercel preview as the real signal. *(2026-06-06.)*

## Vercel domains / DNS (the subdomains epic, 2026-06-06)
- **Per-host domain registration doesn't scale: a Vercel project caps at 50 domains.** For "every shop
  gets a subdomain" (164 shops), registering each `slug.host` is a dead end (and consuming the cap also
  blocks premium custom domains). Use a **wildcard**.
- **A wildcard cert (`*.host`) requires the domain on Vercel nameservers** (DNS-01) — Vercel can't issue
  it while the registrar holds NS. Moving NS is the real unlock.
- **Enabling "Vercel DNS" does NOT auto-import existing records — the zone starts empty.** Flipping NS
  before staging records instantly breaks whatever lived there (here: Clerk auth + 3 email systems).
  **Stage every record first (from the registrar's real zone export — `dig` misses records like DKIM/SPF),
  then flip NS.** Verify the staged zone by querying Vercel's NS directly (`dig @ns1.vercel-dns.com`)
  *before* trusting global propagation.
- **Vercel API tokens are scoped + team-aware.** A *project-scoped* token manages project domains but
  **403s on account-level DNS records**; you need an **account-scoped token AND the `?teamId=` query
  param** (find it via `/v2/teams` / the project's `accountId`).
- **A project domain added while on external NS can stick at `misconfigured` after the NS flip** — remove
  + re-add it once on Vercel NS to kick fresh DNS-01 issuance. Cert issuance is async (minutes); poll the
  live `https://` + `/v6/domains/{d}/config` `misconfigured`, don't assume failure.
- **Auto-mode correctly blocks bulk destructive prod ops** (mass domain delete, prod-DNS writes) — get
  explicit user authorization in-conversation rather than working around the denial.
- **A redirector domain (e.g. `mschz.org`) is far lighter than a wildcard.** It's a single CNAME → Vercel:
  add it as a project domain + flip the registrar record to **DNS-only** (proxied = the registrar returns
  its own 404; Vercel never sees the Host) → Vercel serves + HTTP-01 certs it. No nameserver migration.
  First post-deploy/post-flip hits 404 for ~60s while the fresh cert issues — poll, don't conclude failure.
  *(2026-06-06, short-links.)*
- **`%{redirect_url}`/curl inside a zsh `for`-loop one-liner flaked** ("command not found: curl"); run each
  curl as a plain statement (or `/usr/bin/curl`). *(2026-06-06.)*

## Build & QA
- **The deterministic gate is non-negotiable and cheap:** `tsc --noEmit` + `next build` + the
  Playwright suite must be green before merge. Pure-logic specs (no auth, no network) on a shared
  `lib/` helper give real coverage for free — extract the seam, test the seam. *(Personalized
  Products: one `lib/personalization.ts` with sanitise/validate/build/format, covered by 3 specs.)*
- **Add one spec per browser/API-testable story** — coverage accretes with the work, never as a
  separate project.
- **Two test layers (live).** `api` project (`*.spec.ts`, no browser) is the **blocking gate** — fast,
  in CI on every PR. `browser` project (`*.browser.spec.ts`, Chromium) is **opt-in, NOT in the gate**
  — `npm run test:e2e:browser`, nightly via `browser-smoke.yml`. Use it for *rendered* UI an API call
  can't see (field renders before the CTA, counter ticks, required nudge fires). Authed/epic smokes
  read `MS_TEST_*` env and **skip gracefully** when unset — so a browser spec can *replace* a smoke
  that was "owed to Daniel" the moment its fixture exists. Many client-island assertions work
  **anonymously** (e.g. the personalized buy box renders + intercepts before any sign-in), so reach
  for those first — they need no credentials. *(2026-06-05.)*
- **State the smoke gap honestly.** The agent owns API/build/Playwright; the **authed browser
  money-path** smoke is owed to Daniel (he holds the sessions). Say so in the PR rather than implying
  "build passes, therefore done."
- **Fresh worktrees need local env before e2e means anything.** `git worktree` does not bring ignored
  `.env.local` / `.env` files. For Miyagi local API e2e, copy the app `.env.local` into the frontend
  worktree, copy backend `.env` into the backend worktree, start Next on `3001` and Medusa on `9000`,
  then run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:e2e`. Otherwise catalog/homepage
  tests fail with `fetch failed` / `ECONNREFUSED`, which looks like a regression but is just Medusa
  not running. *(Support Widget epic, 2026-06-05.)*

## Medusa gotchas
- **`productModuleService.updateProducts` is `(id|selector, data)` — never pass one merged object.**
  A single-arg call `updateProducts({id, title, metadata})` is read as a **selector**: Medusa builds a
  `WHERE` from every field (incl. the whole `metadata` jsonb) and matches 0 rows → the write 500s
  ("An unknown error occurred") or silently no-ops. Always `const {id, ...data} = obj;
  updateProducts(id, data)`. *(2026-06-05 — Personalized Products S1 added `custom_fields` to product
  metadata, which surfaced this latent bug across the seller edit / soft-delete / view-counter routes;
  Cloud Run SQL logs (`select … where … and metadata->'attrs'->>'brand'=…`) were the tell.)*

## Architecture
- **Medusa-first pays off (AGENTS rule #1).** Model new commerce features on Medusa primitives before
  reaching for Supabase/custom routes. *(Personalized Products shipped with **zero** new tables and
  near-zero backend change — field definitions on product metadata, buyer payload on line-item
  metadata, both flowing natively into the order. Custom-slugs the same: slug was already `unique()` on
  the Medusa seller and `POST` already accepted it, alias history rode `seller.metadata` → 1-field
  backend change, no migration. **Read the backend model + route first — it often re-scopes the epic
  smaller.**)*
- **Trust the provider's own status over reconstructed DNS checks.** Custom-domain verification was
  brittle because it compared live DNS against **hardcoded** Vercel targets (a generic CNAME + a fixed
  apex IP) — both of which drift (Vercel now issues per-project CNAMEs; apex IPs change; Cloudflare
  flattens root CNAMEs). Switching the source of truth to Vercel's `GET /v6/domains/{domain}/config`
  `misconfigured` flag fixed apex + proxy cases at once. And **apex needs an A record, never a CNAME** —
  the automation must branch apex-vs-subdomain (`dnsRecordFor`), not assume CNAME. *(2026-06-06 hotfix.)*
- **Gate new behaviour on a feature flag / presence check to shrink blast radius.** The personalized
  buy box only mounts when a listing actually has custom fields, so the 99% non-personalized checkout
  path stayed byte-for-byte unchanged — a high-risk seam touched safely.

## Working efficiently across a long epic
- **Compact at sprint/PR boundaries.** The cost driver isn't orientation — it's running a whole
  multi-sprint epic in one session, where each sprint's file-level reads accrete. The durable state
  (the **plan file**, the per-sprint docs, team memory) is *designed* to make re-entry cheap, so
  `/compact` after each sprint ships sheds the detail without losing the thread. For a big epic,
  a **fresh session per sprint** caps per-session context — re-orientation is cheap by design.
- **Read targeted ranges, not whole files**, once you know where you're going.

## Adopted-next (not yet wired) — improvements we've agreed on but haven't built
- *(none open — the browser-smoke layer shipped 2026-06-05; see Build & QA above.)*

## Authed browser smokes — @clerk/testing (built; runs LOCALLY)
- **How it works (live).** `e2e/global.setup.ts` runs `clerkSetup()` in Playwright **globalSetup**
  (main process → workers inherit `CLERK_TESTING_TOKEN`); `_helpers/auth.ts` `signIn()` does
  `setupClerkTestingToken({page})` **then** `page.goto('/sign-in')` **then** `clerk.signIn({page,
  emailAddress})` — **ticket** strategy (mints a one-time sign-in token via BAPI, no password/OTP/2FA).
- **Runs locally, not on previews.** Clerk's testing token is **dev-instance only** (`clerkSetup`
  *throws* on a prod `sk_live`), and a dev instance only allows **localhost** origins — so an SSO-gated
  ephemeral Vercel preview can't hydrate clerk-js (`window.Clerk` never readies). Run authed smokes
  against `npm run dev`: `PLAYWRIGHT_BASE_URL=http://localhost:3001 MS_TEST_BROWSER_AUTH=1 CLERK_*=<dev>
  MS_TEST_BUYER_EMAIL=<dev user> npm run test:e2e:browser`. CI runs only the **anonymous** browser
  smokes vs the preview (non-blocking). *(Validated 2026-06-05 — buyer sign-in passes on localhost.)*
- **Instance-match gotcha (cost me ~5 CI iterations).** The app, the test users, and the
  `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` must ALL be the **same** Clerk instance or `clerk.signIn`
  times out on `window.Clerk`. This app's dev/preview uses **`honest-eel-39`** (decode a pk with
  `echo <suffix>|base64 -d` → frontend-API host) — NOT the `evident-catfish-58` shown for "Miyagi
  Sanchez" in `clerk apps list`. Source the keys from `.env.local`, not the apps list. Dev test users
  `playwright-buyer@ / playwright-seller@miyagisanchez.com` exist in honest-eel-39; `MS_TEST_*` +
  `CLERK_*` repo secrets set on `miyagisanchezcommerce`.
- **Also learned:** `auth_password.enabled:true` ≠ UI password login works — the prod instance is
  email-code/OAuth-first (`auth_email.sign_in_strategies:["email_code"]`), which is why ticket
  sign-in (not password) is the right automation path.
- **`MS_TEST_PERSONALIZED_LISTING_ID`: SET (2026-06-05).** Points at the "Configurable" listing
  (`prod_01KTCRH4MTB0XMVJ73Q8SHSPY2`, a required custom field). The anonymous personalization browser
  smoke (`personalization.browser.spec.ts`, AC 2.1/2.2/2.3) **passes against prod** — the agent now
  headlessly verifies the buy-box render + required-field interception, no auth needed.
- **Cleanup DONE (2026-06-05):** the orphan test users (prod + `evident-catfish-58`) were deleted via
  `clerk api /users/<id> -X DELETE --app <id> --instance <prod|dev> --yes`. Shell gotcha: don't name a
  loop var `UID` (read-only in zsh → "operation not permitted").
