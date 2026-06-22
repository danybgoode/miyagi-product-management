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
  Merge `main`, don't debug your own diff. **A re-run alone won't fix it** — the mismatch is
  *structural* (CI runs the **merged** test set against the **branch-head** preview, which lacks the
  sibling's feature); only `git merge origin/main` + push (rebuilding the preview) clears it. Confirm with
  `git ls-tree origin/main -- <failing-spec>` vs `HEAD` — the spec is on main but absent from your branch.
  *(2026-06-05 seasonal-theme; reconfirmed 2026-06-09 — delivery-money-polish S3 went red on
  `agent-native-setup-spec.spec.ts` from sibling PR #61; a re-run reproduced it, merging main fixed it.)*
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
- **When your branch is BEHIND `main`, the two-dot `git diff main..HEAD` lies — read the three-dot.**
  Two-dot compares tips directly, so it folds in the *inverse* of every commit `main` gained since you
  branched (a sibling epic's new files show up as "deletions" in your diff — alarming and wrong). Review
  with **three-dot `git diff main...HEAD`** (merge-base→HEAD = only your changes), and **merge `origin/main`
  into the branch before merging the PR** so the merged tree is what actually ships. *(2026-06-11,
  custom-domain-paywall — nav-reorg #80/#81 landed mid-flight; two-dot showed nav files "deleted".)*
- **Shipping a flag-gated paid feature has a load-bearing run-order: code merge → deploy → seed → flip
  flag — and seed prod money infra with the REAL creds, not local `.env`.** The fail-open flag (default off)
  lets the FE+BE merge dark with zero risk; *then* activate deliberately. Backend (Cloud Run, ~12 min, no
  preview) merges + **finishes deploying** before the seed script (which calls its new internal route);
  confirm the live revision actually rolled (`gcloud run services describe … latestReadyRevisionName`) — a
  `SUCCESS` build is not yet a live revision. The seed/activation must use **prod** creds from **Secret
  Manager** (`gcloud secrets versions access`) + the Cloud Run URL — the app's local `.env.local`/`.env` are
  **dev-scoped** (`localhost:9000`, `sk_test_…`), so running with them silently provisions a test-mode plan
  against localhost. Capture secrets into shell vars in the *same* command (shell state doesn't persist) and
  never echo them (a `${KEY:0:7}` mode-prefix is enough to confirm `sk_live`). *(2026-06-11,
  custom-domain-paywall — seed-custom-domain-plan.mjs against prod live Stripe.)*
- **A squash-merged sprint branch is a dead end — start the next sprint on a FRESH branch off `main`.** When
  a sprint PR is **squash**-merged, its branch's individual commits are *not* on `main` (the changes are, as
  one commit), so continuing that same branch for the next sprint re-introduces a messy duplicate diff and
  can't be fast-forwarded. Confirm with `git cat-file -e origin/main:<a-file-the-sprint-added>` (changes are
  on main) and branch the next sprint cleanly: `feat/<epic>-s2` off `origin/main`. *(2026-06-09,
  trust-messaging-polish S2 — S1's #64 squashed → S2 on `feat/trust-messaging-polish-s2`.)*
- **Concurrent planning commits in a shared worktree collide the git index.** App code already gets isolated
  `git worktree`s (`.worktrees/`) — but *planning/scaffold* commits ran in the shared root worktree, so two
  sessions' `git add` raced ("another git process is running" / index lock; commits interleaved). Fix, two
  parts: (1) **path-limited commits** — `git add <your files>` + `git commit -- <those paths>`, never
  `git add Roadmap/` or `-A`; that alone keeps each commit clean regardless of the shared index. (2) For
  parallel planning, **give each planning session its own worktree**, or appoint a single **scribe** for
  shared files (`BUILD-ORDER.md`). The single highest-leverage line is the path-limited commit.
  *(2026-06-07 — planning sessions collided in the shared root worktree.)*
- **Cowork planning sandbox: the mounted `.git` blocks `unlink` on lock files, and GitHub egress is
  proxied-off — `rename` aside to commit, and the human pushes.** Committing from the Cowork desktop
  sandbox, every git index op (`add`/`commit`) leaves a stale `.git/index.lock` (+ `HEAD.lock` /
  `next-index-*.lock`) because the mount returns **EPERM on `unlink`** — so `rm` can't clear them and the
  next op dies with `File exists` / "another git process is running". **`rename` is allowed** (git's own
  commit renames lockfile→target fine), so clear them by moving aside before each commit:
  `for L in .git/*.lock; do [ -e "$L" ] && mv "$L" "$L.stale.$RANDOM"; done` (the harmless
  `unable to unlink … tmp_obj`/lock warnings during commit can be ignored — the commit still lands).
  Separately, **`git push`/`fetch` to GitHub 403 through the sandbox proxy** — planning commits land
  locally on the mounted repo on `main`, and the **human pushes from their own terminal**
  (`git push origin main`); the agent can't push or fetch itself. *(2026-06-12, doc-drift reconciliation.)*

## Tooling gotchas
- **Run the repo binaries directly when `npm`/`npx` chokes.** A sibling worktree that reuses the same
  package name (e.g. `apps/miyagisanchez-seasonal-theme`) breaks npm **workspace resolution** at the
  monorepo root. Use `node /…/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` and
  `/…/node_modules/.bin/{next,playwright}`. New worktrees should use a unique package name or be
  excluded from the root `workspaces` glob. *(2026-06-05.)*
- **Worktree Tailwind-v4 build needs a local `npm install` — which then forces the worktree-local Playwright
  binary.** A fresh `git worktree` resolves `next`/`tsc` fine via walk-up to the root `node_modules`, but the
  Tailwind-v4 **PostCSS** `@import "tailwindcss"` resolve fails (`Can't resolve 'tailwindcss' in app/`) until
  you `npm install` *inside* the worktree. That install adds a worktree-local `@playwright/test`, so running
  the **root** `playwright` binary then throws *"two different versions of @playwright/test"* / "No tests
  found" — switch to the **worktree-local** `node_modules/.bin/playwright`. Its generated `package-lock.json`
  is untracked; don't commit it. *(2026-06-09, trust-messaging-polish S2.)*
- **`gh pr merge --delete-branch` fails when a worktree holds `main`.** The merge still succeeds on
  GitHub; only the local branch-delete errors. Verify with `gh pr view <n> --json state`. Don't
  re-run blindly.
- **A unit-tested pure helper can't live in a module that imports `next/cache`.** The Playwright
  runner can't load `next/cache`, so importing the module to test the pure function throws. Keep the
  pure logic in a next-free module (e.g. `lib/slug.ts`) and let the cached/DB wrapper import *it*.
  *(2026-06-06, custom-slugs.)*
- **Swapping a framework-generated artifact for a hand-rolled route breaks specs on exact format.**
  Converting `app/robots.ts` (typed `MetadataRoute.Robots`) → `app/robots.txt/route.ts` (to carry
  `# …` comment pointers the typed object can't express) silently changed the serializer's
  `User-Agent: *` to a hand-written `User-agent`, and an existing spec (`own-shop-seo.spec.ts`)
  asserted the capitalized form. The **local gate passed** (the new spec didn't assert that casing);
  **CI vs the preview caught it.** When you replace anything a framework generates (robots, sitemap,
  OG image, metadata) with a hand-rolled equivalent, diff the *exact bytes* the old one emitted and
  `grep` the suite for any spec asserting that surface. *(2026-06-09, agent-readable about surface S2.)*
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
  **Corollary — image-only deploys make the full deploy *script* silently DRIFT from live.** Because CI never
  re-applies the full config, the script accumulates gaps: a secret added live-only via `services update` is
  missing from the script's `--set-secrets` (which **replaces**, so a full run would **drop** it), and a var
  bound as a `secret` that live actually carries as a **plain env** (with no secret shell) makes a full run
  **ERROR** ("secret not found"). Reconcile against `gcloud run services describe` (compare the env-name set +
  secret-name set) and **lock parity with a static guard**. *(2026-06-12, backend-prod-readiness S4 — `deploy.sh`
  was missing 3 live secrets + bound `ENVIA_SANDBOX` as a non-existent secret; `infra/gcp/test/deploy-invariants.test.js`.)*
- **Provision GCP monitoring as an idempotent script, rehearsed on staging; a `node:test` config-guard is
  infra's deterministic gate.** Stand up uptime checks + Cloud Run alert policies via a create-if-absent-by-
  displayName script (`infra/gcp/provision-monitoring.sh`, `TARGET=staging|prod` → the existing
  `MiyagiDevopsTele` channel) and **rehearse on staging then tear down** (staging min=0 flaps an uptime check).
  The rehearsal surfaces CLI-shape bugs for free — concretes it caught: alert **threshold conditions support
  only `COMPARISON_LT`/`GT`** (no GE/LE → "active ≥ max" = `GT max-1`); a **log-based (`conditionMatchedLog`)
  alert needs an `alertStrategy.notificationRateLimit`**; build policy JSON via `python3`/a file, **never a
  shell heredoc** (filter strings carry quotes that break inline JSON); pass `--project` per call (a global
  `gcloud config set project` trips an org `environment`-tag warning). Infra isn't Playwright-gated, so the
  deterministic gate is a **pure `node:test` asserting the deploy scripts vs the live config** — same
  anti-erosion shape as the raw-color/monolith guards; monorepo-root needed its **first `.github/workflows/`**
  to host it. **Error tracking went GCP-native** (Error Reporting auto-groups `severity>=ERROR` Cloud Run logs)
  **over adding `@sentry` to the live service — zero new dependency.** *(2026-06-12, backend-prod-readiness S4.)*
- **Stripe Node SDK v22 reshaped promotion-code params under a `promotion:{type:'coupon',coupon}` hash** —
  both the `PromotionCode` object read (`pc.promotion.coupon`) and `promotionCodes.create` (no top-level
  `coupon` in the typed params). `tsc` catches the old top-level shape immediately. Give the coupon + promo
  code **deterministic ids/codes** so find-or-create (an admin "mint" button / seed) is idempotent — no
  duplicate on a repeated press. *(2026-06-11, custom-domain-paywall S3 — coupon `miyagisan`.)*
- **Driving a young foreign CLI (`codex`, `agy`): run `<cli> --help` first, pin the version, degrade — never
  build against a documented flag from memory.** The cross-agent-review sprint AC assumed `agy --output-format
  json`; `agy 1.0.7` has **no such flag** — reality is `agy -p "<prompt+diff>"`, plain text, **no stdin path**.
  By contrast `codex exec "<prompt>"` appends **stdin** as a `<stdin>` block, so you *pipe* the diff to codex
  but must *embed* it in agy's argv — which is why an argv-size guard (E2BIG above ~256 KB) is needed for agy
  only. Pin the known-good version and **warn (not fail)** on a mismatch so a bump surfaces without blocking.
  `scripts/cross-review.mjs` is the reference: a script that runs a non-Anthropic reviewer must `--version`-check
  + branch its context-passing per CLI, and the smoke is "run it against a real PR and read the comment."
  *(2026-06-10, cross-agent-code-review S1 — also: a `git commit -- <paths> -m "msg"` fails because everything
  after `--` is a pathspec; put `-m` before `--`.)*
  **A SECOND single-purpose cross-agent script shares the rail, doesn't fork it.** The planning panel
  (`scripts/cross-panel.mjs` — second opinion on a *plan* instead of a PR) reused ~90% of cross-review by
  extracting the family-agnostic plumbing into one module (`scripts/lib/cross-agent-cli.mjs`: presence/version
  checks, `runCodex`/`runAntigravity` + the agy argv size-cap, the `\n---` prompt-body loader) and keeping each
  script's *framing* (PR diff vs plan doc) and *output* (post a comment vs print a panel) local. Add an
  `opts.soft` mode on the runners so a **non-essential** pass degrades to a stderr note instead of `die()`-ing
  (the panel's contradiction-synthesis uses it). Don't import cross-review.mjs directly — it runs `main()` at
  module load; extract to a sibling lib both import. After `git mv`-ing a module, grep stale path refs in
  **header comments + docs**, not just the imports. *(2026-06-13, cross-agent-planning-panel S1.)*
  **To "surface contradictions" between two single-pass critiques, one constrained synthesis pass beats both
  side-by-side and a debate loop.** Print the critiques verbatim, then a single pass that lists *only*
  opposite-action contradictions (else one "complementary" line) — the tool does the flagging, but it stays
  single-pass (no back-and-forth, the #1 token sink). Keep it *soft* so a failed synthesis still prints the
  lenses. *(2026-06-13, cross-agent-planning-panel S1 — `## SYNTHESIS` in `cross-panel.prompt.md`.)*

- **`process.exit()` truncates piped stdout — flush synchronously, or you ship a tool that works to a file
  but crashes in a pipe.** A Node script that did `console.log(json); process.exit(0)` produced *valid* output
  when redirected to a **file** (sync writes) but **truncated JSON down a pipe** (`execFileSync`), because the
  async stdout write hadn't drained when exit fired — the consumer died on "Unexpected end of JSON input".
  Use `writeSync(1, payload)` (synchronous even on a pipe) before `process.exit`, or exit in the write
  callback. Test a tool the way it's actually invoked (pipe, not just a file redirect). *(2026-06-14,
  build-order.mjs ↔ roadmap-to-notion.mjs --extract.)*
- **Git background auto-maintenance races a burst of commits and leaves stale `*.lock` files.** Rapid commits
  hit intermittent "cannot lock ref 'HEAD' / 'refs/heads/main' — File exists"; the culprit was
  `.git/objects/maintenance.lock` (git's auto-gc/maintenance) running concurrently. Clear locks recursively
  (`find .git -name '*.lock'`) and run the batch with `git -c gc.auto=0 commit …` (and/or
  `git config maintenance.auto false`) so it can't re-trigger mid-sequence. *(2026-06-14, repo-hygiene chore.)*
- **A "resolve the PR from the current branch" tool must read PR `state` — `gh pr view` returns MERGED/CLOSED
  PRs too.** With no `<PR#>`, `gh pr view --json number,state,headRefName,headRefOid` resolves a PR for the
  branch — but for a **reused branch name** whose PR already merged, it silently returns that *merged* PR, so
  the tool would review a stale diff. Treat `state !== 'OPEN'` as "no open PR for branch `<name>` (found #N,
  state MERGED)". Pair it with a **stale-HEAD guard** (`git rev-parse HEAD` vs the PR's `headRefOid` → warn +
  require `--force`) so the *first* run always reviews the right, current diff. And **keep the "no result"
  stderr matcher tight to the tool's actual message** — a broad `isNoPrError` (`could not find` /
  `no default branch` / `no git remotes found`) masks a real repo/auth/`--repo` misconfig as "no open PR" and
  sends the operator chasing the wrong fix; match only `no … pull requests found` and let everything else
  fall through to the generic error. Put the resolver + the **pure** decision (`decideHeadGuard`) in the
  shared rail so a `node:test` (mock gh + git) covers it and siblings inherit it. *(2026-06-21,
  dev-tooling-reliability S3 — `scripts/lib/cross-agent-cli.mjs`; dogfooded on its own PR #17.)*
- **`node --test <dir>` (bare directory) was dropped in Node 24** — it tries to load the dir as a module
  (`Cannot find module '…/scripts/lib'`). Use a glob: `node --test 'scripts/lib/*.test.mjs'`. *(2026-06-21.)*

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

## Repo & deploy hygiene
- **Deleting a git branch does NOT delete its Vercel preview deployments — Vercel retains every deployment
  forever.** 73 merged/dead branches had left **150 orphan preview deployments** on the project (469 total →
  319 after pruning). Pair branch cleanup with a preview prune: `node scripts/vercel-prune-previews.mjs`
  (dry-run by default; `--apply`, `--age N`, `--keep-branch <open-PR branch>` — its preview is the live review
  target; `--project`). It deletes only `target!=='production'` — production deployments are the rollback
  history and are never touched. Token from `VERCEL_API_TOKEN` env or the local `vercel login`. *(2026-06-14,
  repo-hygiene chore.)*
- **A generated doc needs ONE authoritative source + a `--check` gate, or it silently drifts.** `BUILD-ORDER.md`
  (and its Notion projection) drifted because epic status was inferred from brittle prose (story-tick regex +
  `Status:` line) AND a *seed* frontmatter field two seeds could both claim (last-write-wins by readdir order).
  Fix: SSOT = **the epic README's frontmatter `status:`** (set at epic close), read by both generators, with
  the prose/retro derivation kept only as a fallback + surfaced as an advisory drift signal; the board is a
  **generated view, never hand-edited**, guarded by `build-order.mjs --check` in CI (`build-order-guard.yml`).
  When a doc is generated from inputs, give it a single declared source and a freshness gate — don't let two
  heuristics vote. The story counter also has to match the *real* heading shapes agents write (`## US-1`,
  `### Story 1.1`, letter IDs `C.1`/`B1.1`), not just the template's — but since status is now frontmatter-
  driven, a counter slip is only a cosmetic progress count, never a wrong status. *(2026-06-14, branch-cleanup
  + status-reconciliation chore.)*

## Build & QA
- **The deterministic gate is non-negotiable and cheap:** `tsc --noEmit` + `next build` + the
  Playwright suite must be green before merge. Pure-logic specs (no auth, no network) on a shared
  `lib/` helper give real coverage for free — extract the seam, test the seam. *(Personalized
  Products: one `lib/personalization.ts` with sanitise/validate/build/format, covered by 3 specs.)*
- **Add one spec per browser/API-testable story** — coverage accretes with the work, never as a
  separate project.
- **An `api` spec can assert *signed-out* chrome from raw SSR HTML — Clerk `<Show when="signed-out">` /
  `<SignedOut>` render server-side — so an anonymous `request.get('/', {headers:{Accept:'text/html'}})` sees
  the logged-out CTAs/links directly (no browser needed). But verify the *rendered attribute order* against
  the live page before any href-adjacency regex:** Next renders an `<a>`'s `href` **last**
  (`<a class=… href="/x">text`), so `href="/x"[^>]*>\s*text` is robust while an `href…data-testid` adjacency
  assumption is backwards (match both attrs within one `<a …>` instead). Cheapest check: a read-only `curl`
  of the live prod page confirms both that the branch SSR-renders and the exact attribute order — saves a CI
  cycle on a broken regex. *(2026-06-11, nav-reorg S4 — `e2e/nav-entry-points.spec.ts`.)*
- **For Clerk-wrapped root/page HTTP checks, the HTTPS preview can be more representative than local
  `next start`.** Local `127.0.0.1` can loop through Clerk's dev-browser handshake because secure cookies
  never settle over HTTP; don't treat those timeouts as app regressions. Use the Vercel preview CI run with
  the bypass token as the authoritative pre-merge API gate. *(2026-06-11, marketplace-positioning-meta.)*
- **A `not.toContain` copy-completeness check can collide with legit copy.** Asserting a clerk prompt had
  no leftover `'TODO'` failed because Spanish "TODO el texto" (all the text) is legitimate. For
  placeholder/orphan-string guards, assert only *true* placeholder markers (`PEGA_TU_TOKEN`, `XXX`,
  `undefined`/`null`), not natural-language words. *(2026-06-09, agent-native setup S3.)*
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
  "build passes, therefore done." Corollary: **don't write a "verified locally" claim you didn't run** —
  the local dev server can't reach Medusa from the agent sandbox (catalog/`getShop` fetches time out →
  empty render), and the SSO-gated preview needs the CI-only `VERCEL_AUTOMATION_BYPASS_SECRET`, so the
  real pre-merge signal is **CI's "Playwright vs preview" (api) going green against the branch preview**,
  not a local render. *(2026-06-09, cross-channel-trust-parity — caught + corrected a false local-verify note.)*
- **A white-label/channel render can't be header-simulated in a browser smoke — use the path-tagged
  surface.** Middleware **strips spoofed `x-miyagi-*` headers on platform hosts** (only middleware may
  set them), so a Playwright test cannot fake `x-miyagi-channel=custom`/`subdomain` against a preview to
  exercise the white-label shell. But `/embed/*` is tagged white-label by **path** (`x-miyagi-embed=1`,
  un-spoofable) and renders through the **same `ChannelLayout`**, so an anonymous smoke on `/embed/s/<slug>`
  exercises the shared shell for real; the live custom-domain/subdomain look stays owed to Daniel. Before
  planning a "simulate channel X" browser test, check whether middleware trusts or strips the header that
  selects X. **And the path-tagged surface may not cover the page you changed** — `/embed/*` only serves
  the *shop* page (`/embed/s/[slug]`), not the PDP (`/l/[id]`), so there's no anonymous white-label PDP
  render at all. The escape hatch is to keep the new client island **channel-agnostic** (pure props, reads
  no channel header) so it renders byte-identically everywhere and the plain marketplace `/l/[id]` smoke
  covers it. *(2026-06-09 cross-channel-trust-parity D.2; reconfirmed 2026-06-10 PDP image gallery.)*
- **A `.pwa-only` surface is NOT headless-smokeable — Playwright can't emulate `display-mode: standalone`.**
  The installed-PWA bottom bar + its search sheet render only under
  `@media (display-mode: standalone)`, and `page.emulateMedia()` exposes no `display-mode` option, so an
  anonymous browser smoke can't open them — that rendered flow is genuinely **owed to Daniel** on a real
  device. Cover the logic with a **pure `lib/` seam + `api` spec** instead (the recents add/dedupe/cap +
  `/l?q=` encoding), and state the gap honestly in the PR rather than implying a browser smoke ran. Same
  "name the gap, don't fake it" discipline as the authed-money-path smoke. *(2026-06-22, pwa-glass-nav S2.)*
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
  accretes for free. **It bites brand-new client islands too, and only CI catches it:** a fresh `#fff`
  in a new PDP lightbox passed local tsc/build/its-own-spec but the guard failed in CI — for white-on-dark
  chrome reuse the existing `var(--fg-inverse)` (resolves to `#ffffff`), the token the surrounding gallery
  already used. *(#4 design-token foundation, `e2e/design-token-foundation.spec.ts`, 2026-06-07; reconfirmed
  2026-06-10 PDP image gallery.)* **It also false-positives a `#`-prefixed NUMBER that isn't a color** — a
  comment referencing "WebKit **#279904**" (a bug id) reads as a 6-hex and failed CI green-everywhere-else.
  Write external bug/issue ids without the `#` ("WebKit bug 279904") in customer-facing source. *(2026-06-22,
  pwa-glass-nav S2.1.)* **The same shape is a general anti-erosion guard, not just for color:**
  pure offender-finders in a `lib/` module + an `api` spec (real-tree assertion + in-memory negative
  fixtures) also enforce an **anti-monolith** rule — fail CI if any component in a refactored dir exceeds a
  line cap, or if a banned filename reappears. Set the cap above the current largest file with headroom
  (e.g. settings cap 1,200 vs largest section ~1,063 vs the deleted ~4,076-line monolith). *(2026-06-10,
  Shop Settings refactor S4 — `lib/shop-settings/monolith-guard.ts`, `e2e/shop-settings-no-monolith.spec.ts`.)*
- **A write whose result nobody checks is a feature that can silently die.** The gem-claim loop broke
  three ways with zero errors surfaced — a 0-row Supabase `UPDATE` (wrong id namespace: Medusa `sel_…`
  vs mirror UUID) "succeeded", an FK-violating upsert's `error` was never read, and the dead path
  reported `ok:true` for weeks. When an id system migrates (legacy table → Medusa), grep every write
  keyed by that id; and for ownership/money-adjacent writes, check `.error` *and* that rows actually
  matched. *(Gem → Claim Loop, 2026-06-09.)* **Corollary — a best-effort `fetch` POST must check `res.ok`,
  not just sit in a try/catch:** a non-2xx response doesn't throw, so a failed write never reaches the
  `catch` that would alert. The custom-domain webhook's Medusa-activation POST silently swallowed failures
  (seller PAID but isn't entitled, and Stripe won't retry a handler that returns 200) until an explicit
  `if (!res.ok) throw` routed it to a `tg.alert`. Add the status check on any best-effort money-path call.
  *(2026-06-11, custom-domain-paywall S3.)*
- **Unknown API routes on PROD return HTTP 200 (the not-found page), not 404.** So a negative-path
  spec for a *new* endpoint run against prod pre-deploy fails confusingly (expected 401, got 200) —
  that's "route doesn't exist yet", not a logic bug. CI-vs-preview is the authoritative gate for new
  routes; don't chase the prod result. *(Gem → Claim Loop, 2026-06-09.)*
- **A managed WAF/Bot-Protection rule shadows app-level handlers for flagged paths — and applies to PROD
  but NOT previews.** Once Vercel Bot Protection is Active, a bot-probe path (`/l/wp-admin`) returns HTTP
  **403** with header `x-vercel-mitigated: deny` *before* middleware/page runs, so a spec asserting the
  app's own 404 *shape* for such a path fails **on prod only** — CI-vs-preview stays green because the
  firewall isn't enabled on preview deployments. Two corollaries: test app not-found behaviour with a
  **benign junk slug** the WAF won't flag (not `wp-admin`/`.env`/`.git`), and a prod-targeted smoke can
  diverge from a green CI for purely environmental (firewall) reasons — don't read it as a regression.
  *(2026-06-13, vercel-function-cost-reduction — S2.1 firewall shadowed S2.2's `not-found-shape.spec.ts`.)*
- **Close-out validates the *doc* deliverables shipped, not just the code.** A "docs-only" sprint
  inside a mostly-code epic is the easy one to skip: #4's S2/S3 code merged (PR #37) but the **S1
  Roadmap token-contract doc was never written** — it surfaced only at epic close. At DoD, check each
  sprint's deliverable exists (incl. Roadmap docs), not just that `main` has the code. *(#4, 2026-06-07.)*
- **The epic close-out is a distinct step from merging the last PR — skip it and the docs silently lie.**
  #6 (seller-acquisition landing pages) shipped all 4 sprints to prod 2026-06-07 (PRs #42/#44/#45, refs
  recorded *in the sprint files*), but the epic README still read "S3 ⬜ / S4 ⬜", had no RETROSPECTIVE, no
  poster line, and showed 🏗️ in `BUILD-ORDER.md`. The drift was invisible until a *later* groom (nav-reorg)
  hit `/vende` and had to spend a gate validating whether #6 was unfinished or merely undocumented (it was the
  latter — the code was all there). Close the epic in the **same session the last sprint merges**: tick the
  README + sprints with refs, write the RETROSPECTIVE, update the poster + `BUILD-ORDER.md` + seed frontmatter.
  A merged build with stale docs taxes the next groom. *(2026-06-10, #6 doc close-out during nav-reorg groom.)*
- **The cross-agent advisory review (`scripts/cross-review.mjs --agent codex`) earns its keep as a cheap
  pre-merge second opinion — run it on a GREEN PR, treat it as advisory, apply the should-fixes, ignore the
  noise.** First real use (PR #8, backend-staging — shell/infra, not app code): one `codex exec` single pass
  found **no blocking** items but three legit should-fixes (a script that warned-and-exit-0 instead of
  failing on a missing required secret; an inconsistent CORS example; a non-idempotent trigger create) plus
  two nits — all worth fixing, none a false block. Operating notes that held: it's **advisory-only** (never
  gates — CI + the risk-tier rule still decide), **single-pass** (no iterate-to-converge loop, our #1 token
  sink), and **codex is the default** because it takes the diff on **stdin** (handles large PRs), whereas
  `agy` has no stdin and a ~256 KB argv cap. Cheapest insertion point: right after the deterministic gate is
  green and before you ask for the merge. *(2026-06-11, backend-staging S1 — first run of the cross-agent
  flow on a real PR; complements the build-time CLI-driving note under Tooling gotchas.)* **Decline (with a
  written reason) any should-fix that would diverge from an established cross-cutting convention if fixed in
  isolation — that's "noise," not a fix.** On neighborhood-pulse S2, codex flagged the agent `baseUrl` being
  built from the `Host` header; but that's the convention across the *whole* UCP surface (`manifest`, `mcp`,
  `checkout-session`), so patching only the new route creates inconsistency for no security gain (read-only
  link gen, not a boundary) — record it as a possible cross-cutting follow-up instead. Apply the genuine
  should-fixes (there: a NaN-safe limit clamp) + cheap nits, and put the decline + rationale in the fix commit
  so the next reviewer sees it was considered. *(2026-06-13, neighborhood-pulse S2.)* **The Antigravity path
  works the same way and caught a real should-fix the author's context-bias hid: a helper cloned from an existing
  one inherits its latent bug.** `ensureUrlProtocol` was modelled faithfully on `lib/supply.ts` `canonicalSourceUrl`,
  whose `raw.startsWith('http')` scheme test **false-positives a scheme-less domain that merely starts with "http"**
  (`httpbin.org` → left protocol-less → broken relative link) and misses uppercase schemes; the cross-review flagged
  it, fixed to `/^https?:\/\//i` + regression cases before merge. Lesson: **when you model a new helper on an existing
  one, sanity-check its predicate against *your* input domain rather than copying it verbatim** — and run the
  advisory cross-review on a green PR; it's cheapest right before asking for the merge. *(2026-06-21,
  pdp-followups-cleanup S1.1 — `node scripts/cross-review.mjs <PR#> --agent antigravity --repo <app-repo>`.)*
  **Corollary — when a predicate bug turns up, grep for every COPY of it, and relocate the pure logic to a
  shared dependency-free module so copies can't re-diverge.** The follow-up sweep (PR #96) found the same
  `startsWith('http')` bug in 3 more spots — incl. `SupplyClient.tsx cleanUrlForDisplay`, a hand-re-inlined copy
  of `canonicalSourceUrl` that had drifted its own bug. Fix wasn't 4 isolated edits: the pure `canonicalSourceUrl`
  moved to `lib/url.ts` (dependency-free, so the **client** paste UI can import it instead of re-inlining; the
  server `lib/supply.ts` re-exports for back-compat), killing the duplication outright. A pure helper re-inlined
  because its home module drags a heavy import (here `lib/supply.ts` → `./supabase`) is the classic drift seam —
  give it a dependency-free home up front. (Left the UCP `catalog` origin default's `startsWith('http')` alone —
  browser-controlled request origin, a separate baseUrl convention, not user-typed-data.) *(2026-06-21,
  canonicalSourceUrl sweep — PR #96 `5925f1a`.)*
- **VALIDATE-FIRST: confirm a live data source exists before scoping a signal/UI that displays it; if it doesn't,
  ship the static/degraded-but-honest version, defer the dynamic part, and write the gap into the PR — never
  invent the data.** A "check the model before you build the view" discipline, the read-side mirror of the
  Medusa-first "grep the route before scoping a backend story" rule. In the PDP redesign it fired three times and
  saved three rabbit holes: S2.1 had **no seller rating / response-time / ventas source** (the legacy buyer-trust
  scorer undercounts Medusa-order sellers → would show "0 ventas") so it shipped the static capsule and deferred
  the dynamic items; S5.3 found the **paid-ticket QR isn't cleanly resolvable from the PDP read** (it lives on the
  buyer's order, issued by the payment webhook) so it shipped display + a "Ver mi boleto" link, not an inline QR,
  and deferred aforo/tiers (no listing-linked capacity source); rentals showed an **exact estimate + seller
  coordination** because the generic checkout charges one unit and can't honor nights + deposit. Each gap was
  stated in the PR and the smoke walkthrough, not papered over. The failure mode this avoids is a UI that looks
  done but renders invented or wrong numbers. *(2026-06-21, pdp-redesign retro — S2.1 / S5.3 / S4.2.)*

## Medusa gotchas
- **`productModuleService.updateProducts` is `(id|selector, data)` — never pass one merged object.**
  A single-arg call `updateProducts({id, title, metadata})` is read as a **selector**: Medusa builds a
  `WHERE` from every field (incl. the whole `metadata` jsonb) and matches 0 rows → the write 500s
  ("An unknown error occurred") or silently no-ops. Always `const {id, ...data} = obj;
  updateProducts(id, data)`. *(2026-06-05 — Personalized Products S1 added `custom_fields` to product
  metadata, which surfaced this latent bug across the seller edit / soft-delete / view-counter routes;
  Cloud Run SQL logs (`select … where … and metadata->'attrs'->>'brand'=…`) were the tell.)*
  **For delete, reach for the native primitive, not a status hack.** "Delete a listing" had been implemented
  as `updateProducts(id, {status:'draft', metadata:{deleted:true}})` — a *draft*, not a delete — which both
  flirted with the selector trap and left three surfaces disagreeing (Medusa draft "Borrador" / mirror
  `'deleted'` / edit-guard 404). `productService.softDeleteProducts([id])` (explicit id **array**, unambiguous)
  sets `deleted_at` → the product drops out of every list/PDP query that reads the `product` entity (remoteQuery
  excludes soft-deletes by default) while the row is kept so past order line-items still resolve. Prefer the
  module's native delete/soft-delete over a status field whenever "gone" is the intent. *(2026-06-10, seller bug sweep S2.)*
- **`normalizeMedusaOrder` curates *top-level* fields — it does NOT pass raw `order.metadata` through.**
  Client surfaces that read `order.metadata?.X` therefore get `{}` for Medusa orders and silently render
  nothing. This had dead-ended the manual confirm/report/ship sections on both the buyer and seller order
  pages. **Read the normalizer's actual output** and surface what you need as an explicit top-level field
  (the normalizer already does this for `payment_method`, `payment_received`, `fulfillment_state`, etc.);
  don't reach for raw metadata client-side. *(2026-06-07, checkout-state-hardening S1/S2.)*

## Architecture
- **Raising the iOS keyboard from an in-app sheet needs an ALWAYS-MOUNTED input + a SYNCHRONOUS `focus()` in
  the tap handler.** Mobile WebKit only opens the keyboard from a real, already-present element during a user
  gesture — so (a) render the sheet + its input persistently and toggle visibility with a **transform**
  (`translateY`), never a conditional mount, and (b) the trigger calls `inputRef.current.focus()` **before**
  any `setState` (no `setTimeout`), with **`touch-action: auto`** on the input (WebKit bug 279904). Reuse a
  proven bottom-sheet idiom (scrim + `translate-y` + Esc + scroll-lock — Discovery-S2's filter sheet) rather
  than a new overlay. *(2026-06-22, pwa-glass-nav S2.1 — `SearchSheet.tsx` + pure `lib/search-recents.ts`.)*
- **An always-mounted-but-hidden dialog must be `inert` when closed, and `blur()` its input on close.** Because
  the input stays in the DOM (for the synchronous focus above), a plain offscreen/`aria-hidden` sheet leaves
  focus **trapped behind it** (a11y violation) and can leave the mobile keyboard up after close/submit. Set
  `inert={!open}` (drops it from tab order + the a11y tree, moves focus out) and blur the field in a
  `!open` effect so the keyboard dismisses on every close path (scrim / button / Esc / submit). Codex
  cross-review caught both before merge. *(2026-06-22, pwa-glass-nav S2.1.)*
- **Scope a "hide/demote a control on mobile" change to the right `display-mode` — the PWA bottom bar is
  `.pwa-only`.** The installed-PWA bottom bar (and anything it carries) renders only at
  `@media (display-mode: standalone) and (max-width:767px)`; **mobile web has no bottom bar**. So hiding the
  header search on *all* mobile would strand mobile-web users with **no search at all** — hide it `.pwa-hidden`
  (PWA-standalone only) and keep it on mobile web + desktop. And re-surface anything the hidden control
  *uniquely* held (here the in-search agent button → a `.pwa-only` top-bar icon). `.pwa-hidden`/`.pwa-only` are
  the established mirror pair (S1 used them for the Favoritos row). *(2026-06-22, pwa-glass-nav S2.2.)*
- **Visibility-gate every client poll/timer — the cheapest, lowest-risk serverless cost lever.** A
  `setInterval` that fetches (or even just re-renders) keeps firing in **backgrounded tabs**, billing a
  function invocation per tick for a tab nobody's looking at. Gate the work on
  `document.visibilityState === 'visible'` (early-return inside the callback so the interval may tick but
  does nothing while hidden) and add a `visibilitychange` listener that refetches the moment the tab
  returns — then widen the interval too. The global unread-badge poll (`MobileTabBar` /
  `DesktopUnreadBadge`) was hitting `/api/conversations/unread` every 60s from every signed-in tab incl.
  hidden ones; gating + 60s→150s cut it hard with **zero** UX change (realtime in-conversation delivery
  was untouched). Same pattern suits any countdown/animation timer. Test it fast by emulating a hidden
  tab (a mutable flag backing `document.visibilityState` via `addInitScript`) and asserting no request
  fires — no need to wait the real interval. *(2026-06-13, vercel-function-cost-reduction S3.)*
- **Match a cron/scheduled-job cadence to its real freshness need, not the tightest possible.** An
  idempotent no-op job (sweepstakes-draw) firing `*/1` burned ~43K invocations/month doing nothing
  between the rare real events; widening to `*/15` (draw latency ≤15 min is fine) and reconcile to `*/30`
  reclaimed it with no behaviour change. Ask "how stale can this safely be?" before defaulting to per-minute.
  *(2026-06-13, vercel-function-cost-reduction S1.)*
- **Decompose a monolith behind the seam that already fronts it, keep the old path as a coexisting
  fallback, then delete it only once it's provably unreachable.** A 4,076-line `'use client'` settings
  monolith broke into one-component-per-section with **no user-facing change** because the route +
  save seam (`[section]` route → `PATCH /api/sell/shop`) already existed: each section extracted as an
  independent slice while the monolith stayed mounted as a fallback for not-yet-moved sections. Two
  decommission specifics worth reusing: (1) **the only hard coupling at deletion was the monolith's
  exported *types*** — a `lib/types` module re-exported them; relocating the definitions *into* that seam
  (which every extracted section already imported) made the delete a no-op for consumers, so **grep who
  imports the doomed file's types, not just its default export**. (2) **Prove unreachability before
  deleting** — the route's `isValidSection()` gate + an exhaustive `EXTRACTED` registry set meant the
  fallback branch was dead code; confirm that, then remove, instead of a big-bang swap. Lock it in with an
  anti-monolith guard spec (see Build & QA). *(2026-06-10, Shop Settings refactor — PRs #68/#69/#71/#74.)*
- **Medusa-first pays off (AGENTS rule #1).** Model new commerce features on Medusa primitives before
  reaching for Supabase/custom routes. *(Personalized Products shipped with **zero** new tables and
  near-zero backend change — field definitions on product metadata, buyer payload on line-item
  metadata, both flowing natively into the order. Custom-slugs the same: slug was already `unique()` on
  the Medusa seller and `POST` already accepted it, alias history rode `seller.metadata` → 1-field
  backend change, no migration. **Read the backend model + route first — it often re-scopes the epic
  smaller.** Discovery Polish #3c is the limit case: a "data → query → UI" type-filter epic where the
  backend `/store/listings` **already filtered** `listing_type`, the normalizer already emitted it, and
  `/api/ucp/catalog` already forwarded it — so the planned "merge backend first" sprint evaporated and the
  whole epic shipped **frontend-only, no Cloud Run deploy**. Grep the route + normalizer for the field
  before scoping a backend story. 2026-06-08.)* **Corollary — a planned HIGH-risk *migration* story may
  already be shipped; check the live schema + write path before authoring it.** Homepage-polish-b S4.4 was
  scoped as "add `price_cents_at_save` to `marketplace_favorites` (DB migration → Daniel merges)"; a
  five-minute check (the column was in the original table migration, `POST /api/favorites` already wrote it,
  and a live `SELECT` showed every row populated) collapsed the whole HIGH story to verify-and-document — no
  migration, no Daniel-merge gate, the sprint shipped frontend-only LOW. For any additive-column/backfill
  story, `git show` the table's migration + grep the write route, and confirm against the live DB before
  treating it as unbuilt. *(2026-06-12, homepage-polish-b S4.4.)* **The mirror failure mode: a doc that calls a
  migration "rollout pending" when it's already applied.** Neighborhood-pulse's README said the S1.1 MED
  migration + opt-in seed "hadn't been run"; one live-Supabase check showed `web_visible` already present
  (`NOT NULL DEFAULT false`) and the admin toggle live — so the only real residual was an *operational opt-in*,
  not a deploy. Audit the live schema (supabase MCP `execute_sql` on `information_schema.columns`) before
  believing *or re-opening* work a doc calls pending; a "🚧 rollout pending" line drifts as easily as a "✅
  done" one. *(2026-06-13, neighborhood-pulse audit.)*
- **Fix the call the *user* awaits, not the lib the plan named — a proxy makes the named module a red
  herring.** The plan said "time out `lib/envia.ts quoteShipments`," but tracing importers showed that
  frontend lib only feeds the *seller* ship route; the *buyer's* quote is a
  `fetch('/api/checkout/shipping-rates')` that proxies to the backend, which runs its own carrier loop. So
  the buyer-facing timeout belongs on **that fetch in the component**, not the lib the spec pointed at —
  timing out `lib/envia.ts` would have shipped a no-op against the actual hang. Before wiring a fix to a
  file a plan names, `grep -rl` its importers and confirm it's on the path the user actually exercises.
  *(2026-06-09, delivery-money-polish S3 — quote timeout in `CheckoutExperience`, pure `lib/fetch-timeout.ts`.)*
- **For a cross-origin redirect built from order/cart data, the backend STORES the origin and the frontend
  VALIDATES it against the verified-domain set before redirecting — never have the backend construct the
  `success_url`.** The custom-domain checkout "hop" round-trips the buyer through the platform for
  session+payment, then back to the seller's domain; putting `success_url` construction in the backend was
  both an open-redirect risk and impossible (the backend can't read the Supabase verified-domain set). The
  fix: backend only stores `origin_domain` + `channel` in cart→order metadata (sanitized, no redirect built);
  the platform success page validates with `isVerifiedCustomDomain` (anti-open-redirect) + an `onChannel`
  anti-loop check, then redirects. Same guard is non-negotiable at any point that builds a link to the domain
  from order metadata (incl. branded emails). *(2026-06-05, custom-domain-checkout — `lib/checkout-hop.ts`,
  `isVerifiedCustomDomain`.)*
- **Trust the provider's own status over reconstructed DNS checks.** Custom-domain verification was
  brittle because it compared live DNS against **hardcoded** Vercel targets (a generic CNAME + a fixed
  apex IP) — both of which drift (Vercel now issues per-project CNAMEs; apex IPs change; Cloudflare
  flattens root CNAMEs). Switching the source of truth to Vercel's `GET /v6/domains/{domain}/config`
  `misconfigured` flag fixed apex + proxy cases at once. And **apex needs an A record, never a CNAME** —
  the automation must branch apex-vs-subdomain (`dnsRecordFor`), not assume CNAME. *(2026-06-06 hotfix.)*
- **Gate new behaviour on a feature flag / presence check to shrink blast radius.** The personalized
  buy box only mounts when a listing actually has custom fields, so the 99% non-personalized checkout
  path stayed byte-for-byte unchanged — a high-risk seam touched safely.
- **CI/CD → Telegram: mirror the message *format*, not the runtime function, and poll Vercel (free tier)
  from a GHA job.** `lib/telegram.ts` is an *app-runtime* helper — a GitHub Action can't import it, so the
  pipelines reuse its HTML/`esc()` style by convention, not by call. Vercel configurable webhooks are
  **Pro-only**, so on Hobby/free a GHA job polls the Vercel API (reuse `ci.yml`'s resolve-by-commit-SHA +
  poll loop, scoped `target=production`). And Cloud Build aborts on first failure, so subscribe to the
  `cloud-builds` **Pub/Sub** topic for a success-AND-failure backend deploy hook (a trailing cloudbuild
  step only reports success). *(2026-06-06, cicd-telegram-notifications.)*
- **An authoritative, money-adjacent scheduled action belongs in the BACKEND scheduled job (internal auth +
  idempotency), not a Vercel/edge cron.** "Pick the sweepstakes winner once" started on a one-minute Vercel
  cron and was moved onto a Medusa scheduled job on Cloud Run with internal auth — a public/edge cron is the
  wrong trust boundary for a fair, once-only draw, and an idempotency guard makes a repeated trigger a no-op.
  Same shape as any "run this exactly once, server-side" job (draws, reconciliation, payouts). *(2026-06-04,
  sweepstakes S3 — frontend `bb02f93` + backend `50e3af8`.)*
- **A presentation-layer theme/skin must reuse the SAME channel/route signals the layout already uses to
  drop chrome — never invent a parallel scope list, and apply a persisted theme BEFORE first paint.** The
  seasonal `platform-theme` engine excludes white-label / embed / custom-domain / checkout / dashboard
  surfaces by reusing `app/layout.tsx`'s existing channel detection (a second allow-list would silently
  drift and leak the theme into the white-label shell). And it applies the saved preference via an inline
  pre-paint bootstrap with a validated manifest + Core fallback — reading it in a React effect flashes Core
  first; an invalid/expired manifest degrades to Core safely. *(2026-06-05, seasonal-theme-engine —
  `lib/platform-theme.ts`, `PlatformThemeScript`.)*
- **Reorder a block between mobile and desktop positions with the duplicate-render idiom, not flex
  `order`.** Build the block once into a `const`, then render it twice — `md:hidden` in the mobile slot
  and `hidden md:block` in the desktop slot — so exactly one instance is visible per viewport. The PDP
  already used this for `ctaButtons`; S3.2 reused it to lift the extracted `SellerTrustCard` above the
  payment/fulfillment box on mobile while keeping it below on desktop, with zero shared-layout risk and
  no fragile per-child `order` values. Duplicate DOM is benign when CSS shows only one. *(2026-06-08,
  Discovery Polish S3.)* **⚠️ The idiom breaks silently if a toggled element also sets `display`
  inline** — inline style beats a class, so an inline `display:'flex'`/`'block'` overrides `md:hidden` /
  `hidden md:block` and **both** copies render, stacked. Drive show/hide **only from the classes**
  (`flex md:hidden`, `hidden md:block`) and keep `display` out of the inline style on any toggled element
  (set it only on non-toggled surfaces). A pure CSS-class media-query rule wins at its breakpoint; an
  inline declaration always wins — so they don't compose. Guard it cheaply: a Desktop-Chrome browser smoke
  asserting the mobile copy is **attached but hidden** (so exactly one surface shows) catches reintroduction.
  *(2026-06-10, PDP image gallery — shipped stacked on first pass; the thumbnail rail/arrows were fine only
  because they had no inline `display`; hotfix PR #72 squash `5d71462`.)*
- **Parity-first extraction: pass the foreign interstitial as a SLOT, don't reorder.** Extracting an inline
  block into a shared component is a no-regression refactor *only* if the DOM stays byte-for-byte — including
  anything a sibling feature renders *between* its parts. The PDP trust block had S3.2's mobile
  `SellerTrustCard` sitting between the pills and the methods box; `<TrustSignals>` preserved it with an
  `interstitial` ReactNode slot (and a `consultCta` slot for the interactive precio-a-consultar), so the
  component owns the structure while the page keeps placing its own bits. Prove parity with a pure selector
  spec (which groups show) + an anonymous browser smoke (the box still renders). *(2026-06-09,
  trust-messaging-polish S2 — `lib/trust-signals.ts` + `<TrustSignals>`.)*
- **A shared component a parallel epic will consume: nail the prop contract against the REAL type, then hand
  it off in writing.** The sprint sketch proposed `channel: 'marketplace'|'channel'|'embed'`, but the app
  already detects a 5-value `ChannelSource` (`lib/channel.ts`) — reuse the real type so the consumer passes
  `detectChannel()` straight through (no parallel type to sync), and **write the contract + any corrections to
  the consumer's planned stories into *their* sprint doc** so the parallel grooming session inherits the
  truth, not the sketch. Decide explicitly what you did NOT extract (here: the settings→props *derivation*
  stayed inline, so the consumer derives its own inputs) and say so. *(2026-06-09, trust-messaging-polish C.4
  → cross-channel-trust-parity hand-off.)*
- **A server gate must cover every *mutation*, not the route the button names.** "Ship" looked like one
  action but had **two** backend mutations — the Envía `ship` route AND the `[id]` PATCH that the
  frontend `ship-manual` proxies to. Gating only the named route leaves a bypass. Find every write that
  reaches the state you're protecting and gate each (the UI gate is courtesy; the API is the guarantee).
  *(2026-06-07, checkout-state-hardening S2.)* **Corollary — gate the writes that REACH the protected
  state, not every write that touches it.** The custom-domain paywall gates the four *connect/provision*
  mutations (POST domain, POST cloudflare, OAuth start+callback) but deliberately leaves **DELETE
  (removal) ungated**: removal moves *away* from the gated "has a connected domain" state, so gating it
  adds no protection and would trap a lapsed seller's escape hatch. Enumerate mutations by *which direction*
  they move the protected state. *(2026-06-11, custom-domain-paywall S1.)*
- **A lifecycle/state machine lives best as a pure, next-free `lib/` helper** (derivation + transition
  guards + copy), mirrored once in the backend normalizer for agents. One source of truth per side, and
  a pure-logic spec proves invariants for free — e.g. summary ≡ CTA *because both call the one
  `computeCheckoutTotal`*, and an illegal transition (`pending_payment → processing`) is rejected by the
  guard. *(2026-06-07, checkout-state-hardening — `lib/manual-payment-state.ts`, `lib/checkout-total.ts`.)*
  **A one-time redemption (door check-in / single-use ticket) is the same shape:** a pure
  `lib/` token+redemption state machine makes double-redeem an illegal transition (free pure-logic
  coverage), and the server gates **every** mutation that reaches the redeemed state (scan route *and* any
  sibling write), not just the named scan route — the UI gate is courtesy. *(2026-06-08, events-and-ticketing
  S3 — `lib/event-ticket-state.ts`.)*
- **A mirror-resync silently un-sets soft state the source-of-truth doesn't yet reflect — filter the excluded
  set before BOTH render AND resync.** A page that re-syncs a Supabase mirror *from* Medusa on every load
  (`syncSupabaseListingMirror` writes `status: listing.status`) will **clobber** any soft state the mirror holds
  that Medusa doesn't carry — here a just-deleted listing whose mirror row says `'deleted'` got flipped back to
  `'draft'` the moment Medusa still returned it as a draft (deploy-lag window), resurrecting it in the edit guard.
  The fix wasn't only to hide it from the grid: a pure `filterOutDeleted(list, deletedIdSet)` had to run **before
  the resync loop too**, or the next reload undoes the delete. When a backend change makes the source-of-truth
  drop a row, audit every place that writes the mirror *back* from that source, not just the read. Bonus: this is
  exactly what makes the frontend deploy-lag-safe (empty set once the backend omits the row → no-op).
  *(2026-06-10, seller bug sweep S2 — `lib/listing-lifecycle.ts`, `app/shop/manage/page.tsx`.)*
- **A real flag layer now exists — `lib/flags.ts` in BOTH apps (`flagsmith-nodejs`, Flagsmith SaaS).**
  Adding a kill-switch = create the flag in Flagsmith + one `isEnabled('...')` check at the seam. **Rules
  baked in:** fail-open (a hardcoded `DEFAULT_FLAGS` + `isEnabled` never throws → feature stays on if
  Flagsmith is down/absent); build the client at **module load** (no init race / leaked poll timer); set
  `requestTimeoutSeconds:2, retries:0` (the SDK default is **3 retries × 10 s ≈ 33 s** — fatal on a hot
  path). Enforce at the **single source of truth** (e.g. `resolveSellerPaymentMethods`) so UI + agents/UCP
  + checkout are covered at once. The SDK is **not Edge-compatible** → `middleware.ts` flags need a
  different mechanism (Edge Config). *(2026-06-06, Flagsmith epic — `checkout.stripe_enabled` shipped
  front+back; rest of taxonomy deferred, cheap to extend on demand.)*
  **Two flag polarities — pick the fail-open DEFAULT to match.** A **kill-switch** defaults `true` (feature
  stays on if Flagsmith is down; disabling is the deliberate act). An **enablement** flag (e.g.
  `domain.paywall_enabled`) defaults `false` ⇒ **ungated** (a flag outage can never trap users behind a new
  gate; enabling is the deliberate act). Comment the polarity in `DEFAULT_FLAGS`. **And a flag defined in
  code is invisible until you CREATE it in Flagsmith** — absent ⇒ every read returns the code default, so
  there's nothing to toggle in the dashboard until you add it (create it disabled in every environment, then
  flip when ready). *(2026-06-11, custom-domain-paywall — the flag existed in code for days but Daniel "didn't
  see it" in either environment until it was created via the Flagsmith API.)*
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
  **For an AGENT-facing surface with a global audience, one relay directive beats N locales.** es-MX canonical +
  en lingua-franca, then every agent-facing payload (manifest/`/agent`/MCP/`llms.txt`) carries a short
  "present this to the user in their own language" instruction — the **reading agent is the localization layer**
  (same model as Onboarding 0's "mirror the seller's language"). Hold the directive as one constant in the pure
  seam so every surface renders it identically; keep its assertion phrase **apostrophe-free** ("in their own
  language") so it survives HTML escaping on a page and stays a robust spec target. *(2026-06-09, agent-readable
  about surface — `RELAY_LANGUAGE_DIRECTIVE` in `lib/about-agent.ts`, projected onto 4 surfaces from one source.)*
  **Reuse the directive *constant*, don't re-paraphrase it** — a second surface (Onboarding 0's shop-clerk
  operate-prompt) reused `SETUP_LANGUAGE_DIRECTIVE` verbatim, so the mirror rule is byte-identical wherever it
  appears and one stable phrase covers both specs. *(2026-06-09, agent-native setup S3 — `buildClerkPrompt()`.)*
- **A handoff/operate prompt that drives tools should name the tools from ONE shared source the prompt AND its
  spec read.** The shop-clerk prompt renders `SELLER_MCP_TOOLS` (the 8 already-live seller MCP tools) and the
  api spec loop-asserts every name appears — so the named toolset can never drift from what `/api/ucp/mcp`
  actually exposes, and "names a tool that doesn't exist" is caught by the gate. *(2026-06-09, agent-native
  setup S3 — `SELLER_MCP_TOOLS` + `buildClerkPrompt()` in `lib/setup-spec.ts`.)*
- **One shared server builder for a checkout the UI AND an agent both start — AGENTS rule #3 becomes reuse,
  not a parallel implementation.** The custom-domain buy route (seller portal) and the `start_domain_subscription`
  MCP tool both call one `startCustomDomainCheckout({shopId, sellerClerkId, couponCode, …})`, so the
  plan-price lookup, the already-active short-circuit, and the coupon resolution/refusal can't drift between
  the two entry points. Make the agent surface a ~30-line handler over the shared seam (resolve the shop from
  its `ms_agent_` token, then call the builder), not a re-derivation. *(2026-06-11, custom-domain-paywall S3.)*
- **A 100%-off-first-period coupon is a real "gift" only with `payment_method_collection:'if_required'`** —
  Stripe then collects NO card on the $0 first invoice, so the *existing* cancel→lapse path covers the
  no-card renewal end with **zero new lapse code** (the "free year" sprint was mostly "pick the flag + reuse
  the prior lapse"). Apply `if_required` **only on the discounted path** so the full-price checkout still
  collects a card (keep the non-coupon path byte-identical). And **Stripe's own `max_redemptions` is the
  authoritative cap** — a campaign coupon capped at N refuses the (N+1)th server-side even under a race; a
  pure app-side pre-check (`timesRedeemed < max`) is only for a clean message, never the guarantee.
  *(2026-06-11, custom-domain-paywall S3 — coupon `miyagisan`, `lib/domain-coupon.ts` pure + Stripe server seam.)*

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
