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
- **Concurrent planning commits in a shared worktree collide the git index.** App code already gets isolated
  `git worktree`s (`.worktrees/`) — but *planning/scaffold* commits ran in the shared root worktree, so two
  sessions' `git add` raced ("another git process is running" / index lock; commits interleaved). Fix, two
  parts: (1) **path-limited commits** — `git add <your files>` + `git commit -- <those paths>`, never
  `git add Roadmap/` or `-A`; that alone keeps each commit clean regardless of the shared index. (2) For
  parallel planning, **give each planning session its own worktree**, or appoint a single **scribe** for
  shared files (`BUILD-ORDER.md`). The single highest-leverage line is the path-limited commit.
  *(2026-06-07 — planning sessions collided in the shared root worktree.)*

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
- **`vercel env add` (the Claude vercel plugin) silently stores EMPTY values.** Both stdin-pipe and
  `--value` created the var but with no value; `vercel env pull` also redacts *all* values to `""` so it
  can't verify. **Set Vercel env vars via the REST API** (`POST /v10/projects/{id}/env`, `PATCH` doesn't
  reliably update the value → DELETE+POST) and verify by value **length** (decrypt needs a scoped token).
  Also: Preview env adds prompt for a git branch — the "all branches" non-interactive path loops. *(2026-06-06, Flagsmith epic.)*
- **Backend Cloud Run deploy is image-only.** `apps/backend/cloudbuild.yaml` runs `gcloud run deploy
  --image=… ` only — env vars / secrets / SA / scaling were set once by `infra/gcp/deploy.sh` and Cloud
  Run **preserves them across deploys**. So you can **provision a new Secret Manager secret + `gcloud run
  services update --update-secrets` (additive) BEFORE the merge** that needs it, and the merge's
  image-swap keeps it. Grant `secretAccessor` to the runtime SA `medusa-run@`. *(2026-06-06.)*

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
- **A raw-color guard keeps a tokenized surface tokenized.** Once components are moved onto semantic
  CSS tokens, add a pure-logic `api` spec that scans the customer-facing dirs and **fails CI on a
  newly-introduced raw hex** (allow-list the legit hardcoded contexts: email — clients strip CSS vars
  — print/PDF, OG image, admin, sandbox). Cheapest way to stop the foundation eroding; coverage
  accretes for free. *(#4 design-token foundation, `e2e/design-token-foundation.spec.ts`, 2026-06-07.)*
- **Close-out validates the *doc* deliverables shipped, not just the code.** A "docs-only" sprint
  inside a mostly-code epic is the easy one to skip: #4's S2/S3 code merged (PR #37) but the **S1
  Roadmap token-contract doc was never written** — it surfaced only at epic close. At DoD, check each
  sprint's deliverable exists (incl. Roadmap docs), not just that `main` has the code. *(#4, 2026-06-07.)*

## Medusa gotchas
- **`productModuleService.updateProducts` is `(id|selector, data)` — never pass one merged object.**
  A single-arg call `updateProducts({id, title, metadata})` is read as a **selector**: Medusa builds a
  `WHERE` from every field (incl. the whole `metadata` jsonb) and matches 0 rows → the write 500s
  ("An unknown error occurred") or silently no-ops. Always `const {id, ...data} = obj;
  updateProducts(id, data)`. *(2026-06-05 — Personalized Products S1 added `custom_fields` to product
  metadata, which surfaced this latent bug across the seller edit / soft-delete / view-counter routes;
  Cloud Run SQL logs (`select … where … and metadata->'attrs'->>'brand'=…`) were the tell.)*
- **`normalizeMedusaOrder` curates *top-level* fields — it does NOT pass raw `order.metadata` through.**
  Client surfaces that read `order.metadata?.X` therefore get `{}` for Medusa orders and silently render
  nothing. This had dead-ended the manual confirm/report/ship sections on both the buyer and seller order
  pages. **Read the normalizer's actual output** and surface what you need as an explicit top-level field
  (the normalizer already does this for `payment_method`, `payment_received`, `fulfillment_state`, etc.);
  don't reach for raw metadata client-side. *(2026-06-07, checkout-state-hardening S1/S2.)*

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
- **A server gate must cover every *mutation*, not the route the button names.** "Ship" looked like one
  action but had **two** backend mutations — the Envía `ship` route AND the `[id]` PATCH that the
  frontend `ship-manual` proxies to. Gating only the named route leaves a bypass. Find every write that
  reaches the state you're protecting and gate each (the UI gate is courtesy; the API is the guarantee).
  *(2026-06-07, checkout-state-hardening S2.)*
- **A lifecycle/state machine lives best as a pure, next-free `lib/` helper** (derivation + transition
  guards + copy), mirrored once in the backend normalizer for agents. One source of truth per side, and
  a pure-logic spec proves invariants for free — e.g. summary ≡ CTA *because both call the one
  `computeCheckoutTotal`*, and an illegal transition (`pending_payment → processing`) is rejected by the
  guard. *(2026-06-07, checkout-state-hardening — `lib/manual-payment-state.ts`, `lib/checkout-total.ts`.)*
- **A real flag layer now exists — `lib/flags.ts` in BOTH apps (`flagsmith-nodejs`, Flagsmith SaaS).**
  Adding a kill-switch = create the flag in Flagsmith + one `isEnabled('...')` check at the seam. **Rules
  baked in:** fail-open (a hardcoded `DEFAULT_FLAGS` + `isEnabled` never throws → feature stays on if
  Flagsmith is down/absent); build the client at **module load** (no init race / leaked poll timer); set
  `requestTimeoutSeconds:2, retries:0` (the SDK default is **3 retries × 10 s ≈ 33 s** — fatal on a hot
  path). Enforce at the **single source of truth** (e.g. `resolveSellerPaymentMethods`) so UI + agents/UCP
  + checkout are covered at once. The SDK is **not Edge-compatible** → `middleware.ts` flags need a
  different mechanism (Edge Config). *(2026-06-06, Flagsmith epic — `checkout.stripe_enabled` shipped
  front+back; rest of taxonomy deferred, cheap to extend on demand.)*
- **Extract a fan-out seam once, then project new events onto it.** A fire-and-forget
  `dispatchToSeller(userId, {group, email?, push?, telegram?})` over a *pure, next-free* preference resolver
  (`resolvePrefs`/`isChannelEnabled`/`telegramTarget`) made adding the money-path event later one line in the
  event→group map + one call at the route — every channel + the prefs + the settings UI came for free. Defaults
  baked into the resolver de-risk a HIGH surface: email/push **default-on** (absent row ⇒ no regression, no
  backfill), a new realtime channel (Telegram) **opt-in default-off** (no flood). The dispatcher is
  `server-only`; keep the gating in a next-free sibling so the Playwright `api` runner can unit-test the seam
  every channel trusts. *(2026-06-07, Granular Notifications — `lib/notifications/{dispatch,preferences}.ts`;
  `tgNotify`→`tgSend(chatId, …)` with admin default kept every `tg.*` byte-for-byte.)*
  **The same seam projects onto a second *audience*, not just new events** — a sibling `dispatchToBuyer` reused
  the resolver/tables/`/start` webhook/grid wholesale because #5 keyed everything by **person, not role**.
  Make it cheap + migration-free: **audience-namespace the keys** (buyer rows = `buyer.*` `event_group` values
  in the *same* prefs table → a buyer+seller keeps two independent grids, no new column); a **guest
  fall-through** (no resolvable user id ⇒ send today's transactional email, skip prefs/push/TG) makes routing
  money-adjacent mail through the new seam strictly additive (non-regressive); and one shared `telegram_links`
  row per person drives a **per-audience unlink derived from prefs** (`audienceTelegramInUse` — delete the row
  only when the *other* audience has no enabled telegram pref), so neither side's disconnect kills the other.
  The webhook needed **zero** logic change (only audience-neutral copy) because it already bound the chat by
  `clerk_user_id`. *(2026-06-07, Buyer Notifications #5b — `dispatchToBuyer`, `buyer-messages.ts`.)*
- **Notify the *recipient*, not the actor — and resolve them from the data, not the session.** A buyer-authed
  route (`report-payment`) still has to ping the *seller*: resolve the seller from the order itself (Medusa:
  `GET /store/buyer/me/orders/:id` → embedded `marketplace_shops.clerk_user_id`; legacy: the order-mirror join),
  best-effort, durable write + admin nudge unaffected if it fails. Corollary: **"complete the lifecycle" ≠
  "notify on every transition"** — `payment_confirmed`/ship/deliver are *seller-self-triggered*, so notifying the
  seller of their own click is noise. Wire the genuinely buyer-/system-triggered events (`buyer_reported_paid`,
  `return_requested`); name the recipient per event as the test. *(2026-06-07, Granular Notifications S3.)*
  **But check the recipient id is actually *in* the data before assuming a seam can gate.** Buyer
  notifications gate fine for **offers + legacy orders** (those rows carry `buyer_clerk_user_id`), but for
  **Medusa orders the buyer's Clerk id is unrecoverable frontend-side** — `normalizeMedusaOrder` returns
  `buyer_clerk_user_id: null` and `lib/order-mirror.ts` doesn't persist it (and keys the Medusa id in
  `metadata`, not the row `id`). So seller-triggered ship/deliver/return routes hit the guest fall-through and
  send email only (no push/TG) for Medusa orders. No regression, but the feature silently doesn't bite on the
  majority order type until a backend fix. **Grep the normalizer + mirror for the id before scoping a
  recipient-gated feature** — it may shrink (or re-shape) the sprint. *(2026-06-07, Buyer Notifications #5b.)*
- **Match the codebase's real i18n reality before writing translations — and don't globalize it.** The
  **seller portal + notifications are hardcoded es-MX**, so `en` keys *there* are dead code. But the app is **not**
  English-free: `locales/{es,en}.json` is a **~119-key bilingual dictionary** (`getDictionary()` resolves es+en,
  15 call sites incl. `app/layout.tsx`) feeding a **bilingual allow-list** — `app/terminos`, the sweepstakes
  public flow (`app/g/[slug]`, `?lang=en`, per-campaign `*_en/*_es`), and the embed widget toggle. So the rule is
  **es-MX default + a defined bilingual allow-list** (AGENTS rule #5), NOT "es-MX everywhere / no en.json."
  *(2026-06-08 — corrected after a drift audit caught an over-generalized rule; the original note below conflated
  "seller portal is es-MX" with "the site has no English.")*
  **Grep for the dictionary's actual consumers first.** Keep copy in the language the surface really renders, and
  make the "bilingual" gate a **copy-completeness** check (every group has non-empty copy; no orphan copy). es-MX
  copy lives fine in a next-free `lib/` module (`GROUP_COPY` in `preferences.ts`) as the single source the UI
  *and* the spec read, so it can't drift from what the seam sends. *(2026-06-07.)*

## Working efficiently across a long epic
- **Compact at sprint/PR boundaries.** The cost driver isn't orientation — it's running a whole
  multi-sprint epic in one session, where each sprint's file-level reads accrete. The durable state
  (the **plan file**, the per-sprint docs, team memory) is *designed* to make re-entry cheap, so
  `/compact` after each sprint ships sheds the detail without losing the thread. For a big epic,
  a **fresh session per sprint** caps per-session context — re-orientation is cheap by design.
- **Read targeted ranges, not whole files**, once you know where you're going.
- **The two big multi-agent cost sinks are the "communication tax" and the review loop — our process already
  guards both.** Agentic-dev research (Tokenomics / Co-Saving, 2026): agents re-passing large context is the
  top hidden cost, and Code Review is the single biggest token stage (~59%) via iterative refine loops. Our
  countermeasures, already in place: context lives in **durable docs** (pointer-prompts, not content dumps —
  see `SESSION-KICKOFFS.md`); LLM review is **single-pass on a green deterministic gate** (CI carries the
  repetitive checking); and this file is itself the human **"shortcut library"** (distilled past successes so
  the next agent skips rediscovery). The research's headline — an assembly-line SOP beats hierarchical
  agent-to-agent conversation — is the architecture we already run. *(2026-06-08.)*

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
