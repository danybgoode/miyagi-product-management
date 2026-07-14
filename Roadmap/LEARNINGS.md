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
- **`main` moves under you.** Before opening a PR — and again if it sits open — **merge latest `main` into
  your branch**. Tell-tale: CI's "Playwright vs preview" fails on a spec for a feature you never touched →
  a sibling agent landed something on `main` and your preview predates it. **A re-run alone won't fix it**
  — the mismatch is structural (CI runs the merged test set against the branch-head preview, which lacks
  the sibling's feature); only `git merge origin/main` + push (rebuilding the preview) clears it. Confirm
  with `git log HEAD..origin/main`. The missing piece may be the *implementation* a spec asserts, not the
  spec file itself — the spec can already be blob-identical on your branch while the feature commit it
  tests sits only on `main`. *(First hit 2026-06-05 seasonal-theme; reconfirmed twice more since —
  delivery-money-polish S3, seleccion-pins S2.2.)*
  **Corollary — the stale-vs-fresh mismatch can hit your own NEW code too, not just an untouched
  spec, when a sibling PR changes a shared file's CONVENTIONS (a lint rule, not a feature).**
  `seller-portal-rails-foundation` S2.5 added `Envios.tsx` to a design-token CI lint's
  enforced-sweep set and converted the file's pre-existing banners to a shared `<Banner>` component
  — landing on `main` mid-flight of `shipping-provider-expansion` S3, which had ALSO edited that
  same file (a new Correos toggle block) using the exact raw-Tailwind pattern the file's *older*
  code had used days earlier. CI failed on the new block, not on anything pre-existing — easy to
  misread as "my new code is broken" when the real cause is "the file's own conventions moved out
  from under it." Same fix (`git merge origin/main`), but the diagnostic tell is different: check
  whether a FAILING assertion is about a rule/convention that changed, not just a feature/data
  mismatch. *(2026-07-11, shipping-provider-expansion S3.2.)*
- **Announce cross-cutting or direct-to-`main` changes**, and prefer a PR even for "engine"
  features. Anything touching shared surface — `layout.tsx`, `middleware.ts`, `globals.css`,
  `package.json`/deps, a new sibling worktree — can break every other open PR. *(2026-06-05 — a
  feature pushed straight to `main` broke this epic's CI and local tooling.)*
- **Don't yank a shared branch out from under another agent — and this bites the product-docs ROOT repo too,
  not just the app repos.** If the repo's working tree is on someone else's branch, do your change in an
  isolated `git worktree` instead of switching it. *(2026-06-05 — backend tree was on another agent's branch;
  used `.worktrees/…` for the S3 change.)* **Reconfirmed 2026-07-02** (promoter-funnel-fixes S1): mid-build, a
  concurrent routine checked out a different branch in the shared `medusa-bonsai` root checkout; a Roadmap doc
  commit still landed safely via its own `.worktrees/<name>` off `origin/main`, then `git push origin
  HEAD:main` (or `main:main` if the local branch itself has the commit) — same fix the parallel-*planning*
  rule already prescribed, just needed mid-*build* too.
  **Corollary — checking CI status and merging a PR need no local checkout at all.** `gh pr checks
  <N>` and `gh pr merge <N>` operate against the pushed remote branch via the GitHub API; they
  don't care what's checked out locally. Mid-session, a concurrent agent switched the shared
  `apps/miyagisanchez` checkout to its own branch with in-progress uncommitted work; rather than
  checking back out to reclaim it (which would have yanked that session's tree), CI status and the
  merge itself were driven entirely through `gh` from wherever the shell happened to be — the
  sibling session's branch and uncommitted changes were never touched. *(2026-07-10,
  repo-readmes-branding S1.)*
- **Before building a story, grep whether a sibling PR already fixed the identical root cause.** Two epics
  approved the same day can target the same bug from different scope docs. `feat/agent-discovery-and-indexing`
  had an open, green, mergeable PR that fixed `promoter-funnel-fixes` Story 1.1's exact root cause
  (`{url}` never resolving in `buildPromoterPageConfig`) before that sprint wrote a line of code — caught by
  `git log --oneline -- <the file the story's root-cause names>` + `gh pr list` during research, not assumed.
  Merging the sibling PR first, then branching the new epic off the resulting `main`, gave zero duplicate code
  instead of two epics racing to patch the same line. *(2026-07-02, promoter-funnel-fixes S1.)*
- **Risk tier decides who merges** (from WAYS-OF-WORKING): low-risk → the reviewer/agent may merge on
  green CI; anything touching payments / checkout / fulfillment / auth / DB / shared infra / money →
  **Daniel merges**. When unsure, treat as high.
  **Corollary — an explicit "merge on green" authorization changes who decides to pause and check in, not
  whether the review layers themselves still run.** Under exactly such an authorization, both the
  cross-agent advisory pass AND the independent fresh-reviewer pass still ran on a HIGH-tier PR before
  merge — and the independent pass still found two real, non-blocking issues (a guard-scope gap, two
  stale money-path return URLs), fixed pre-merge rather than deferred. "Merge on green" is permission to
  proceed through the established gate without re-asking at each step, not permission to skip the gate.
  *(2026-07-11, catalog-management S6.)* **Reconfirmed on a tier-classification finding, not just a
  code-correctness one:** a MED-tier PR's fresh-reviewer pass approved the code but flagged the tier
  itself as worth a second look (a `checkout-session` file, arguably HIGH by the letter of the rule). The
  builder did not self-merge under the standing "merge on green" go-ahead — instead posted the tier
  reasoning back on the PR (the route only describes availability; the actual money-mutating enforcement
  lives in a sibling HIGH-tier PR's guard) and left it ready-for-review. The product owner's later explicit
  "merge on green" message was then read as resolving that specific open question, not as blanket
  pre-authorization that would have let the builder skip past a reviewer's "needs discussion" verdict in
  the first place. *(2026-07-11, arranged-only-delivery S2.)*
- **When your branch is BEHIND `main`, the two-dot `git diff main..HEAD` lies — read the three-dot.**
  Two-dot compares tips directly, so it folds in the *inverse* of every commit `main` gained since you
  branched (a sibling epic's new files show up as "deletions" in your diff — alarming and wrong). Review
  with **three-dot `git diff main...HEAD`** (merge-base→HEAD = only your changes), and **merge `origin/main`
  into the branch before merging the PR** so the merged tree is what actually ships. *(2026-06-11,
  custom-domain-paywall — nav-reorg #80/#81 landed mid-flight; two-dot showed nav files "deleted".)*
- **Shipping a flag-gated paid feature has a load-bearing run-order: code merge → deploy → seed → flip
  flag — and seed prod money infra with REAL creds, not local `.env`.** The fail-open flag (default off)
  lets FE+BE merge dark with zero risk; activate deliberately after. Backend merges + **finishes
  deploying** before the seed script runs; confirm the live revision actually rolled (a `SUCCESS` build is
  not yet a live revision). Seed/activation must use **prod** creds from Secret Manager — local
  `.env`/`.env.local` are dev-scoped (`localhost`, `sk_test_…`), so running with them silently provisions a
  test-mode plan against localhost. Capture secrets into shell vars in the *same* command (shell state
  doesn't persist) and never echo them. *(2026-06-11, custom-domain-paywall.)*
- **Corollary/exception — unlike Stripe/GCP, Supabase has NO separate dev-scoped credential: `.env.local`
  points at the SAME shared project as production** (`xljxqymsuyhlnorfrnno`, see
  `shared-infra-supabase-stripe` in team memory). A plan that says "verify by flipping a flag row locally,
  dev-only" is a plan built on the Stripe/GCP pattern above (local = test-mode, prod = real) — for
  `platform_flags` (and any other Supabase-backed state) that assumption is simply false, and the "local"
  flip IS the prod flip. Catch this **before** running the write, not after: check which project a
  `SUPABASE_URL` env var points to before treating any Supabase table as a safe local sandbox. Because
  `isEnabled()` already fails open to the same default when a flag row is absent, the safe move is to leave
  the seed migration file in the PR (applied at normal deploy time) rather than push it from a build
  session. *(2026-07-02, seller-agent-connect-mcp-url S2 — caught before acting, not after.)*
- **A squash-merged sprint branch is a dead end — start the next sprint on a FRESH branch off `main`.** A
  squash-merged PR's individual commits aren't on `main` (only the one squash commit is), so continuing
  that branch for the next sprint re-introduces a messy duplicate diff and can't fast-forward. Confirm with
  `git cat-file -e origin/main:<a-file-the-sprint-added>`, then branch clean: `feat/<epic>-s2` off
  `origin/main`. *(2026-06-09, trust-messaging-polish S2.)*
- **To verify "is the prior sprint serving?", reason off `origin/main` — never the working tree — and read
  PR *state*, not branch commits.** Local app checkouts routinely sit on *other* agents' branches, so
  on-disk files lie about `main` (a stale checkout can still show a dependency imported after the sprint
  that removed it) — and a squash-merged sprint's individual commits genuinely aren't on `main`, so trusting
  a stale local `origin/main` misreads it as "unmerged." Confirm with `gh pr view <#> --json state,mergeCommit`
  + `gh api repos/<o>/<r>/contents/<path>?ref=main`, or `git fetch` then `git grep <x> origin/main` — an
  `ls`/working-tree read is not evidence about `main`. *(2026-07-01, feature-flags-inhouse S3.)*
  **Corollary — a stale local checkout can also hide an entire prior sprint's UI SHAPE during planning,
  not just its merge status.** Promoter Funnel v2 Sprint 5's planning session found `apps/miyagisanchez`
  one commit behind `origin/main`, missing the immediately-prior Sprint 4 merge — the local
  `PromoterCloseClient.tsx` still showed the pre-S4 shape, silently missing an entire prop + UI sub-flow
  S4 had added. Caught by reading `git show origin/main:<path>` for the specific files a plan will touch,
  *before* trusting "what already exists" from a local `Read`; fast-forwarded before branching. Any
  multi-sprint epic where sessions hand off cold should diff against `origin/main` before planning, not
  only before merging. *(2026-07-03, promoter-funnel-v2 S5.)*
- **Decommissioning a dependency is bigger than the `package.json` line — the acceptance grep is the real
  bar, and post-swap comments go stale.** Removing Flagsmith meant an acceptance of `grep -ri flagsmith apps/`
  clean, which forced scrubbing ~30 comment/spec/script/migration mentions, not just the two `flags.ts`.
  Several comments were *factually wrong* after the earlier reader-swap sprint (they claimed a helper avoids
  pulling in `flagsmith-nodejs` when the reader now imports Supabase) — rewrite comments for the **new**
  reality, don't blind find-replace. *(2026-07-01, feature-flags-inhouse S3.)*
- **Concurrent planning commits in a shared worktree collide the git index.** App code gets isolated `git
  worktree`s already, but planning/scaffold commits ran in the shared root worktree, so two sessions' `git
  add` raced ("another git process is running" / interleaved commits). Fix: (1) **path-limited commits** —
  `git add <your files>` + `git commit -- <those paths>`, never `git add Roadmap/` or `-A` (the single
  highest-leverage line); (2) for parallel planning, give each session its own worktree, or appoint a
  single **scribe** for shared files (`BUILD-ORDER.md`). *(2026-06-07.)*
- **Cowork planning sandbox: the mounted `.git` blocks `unlink` on lock files, and GitHub egress is
  proxied-off.** The mount returns EPERM on `unlink`, so every commit leaves a stale `.git/index.lock` (+
  `HEAD.lock`) that `rm` can't clear — but `rename` works, so move locks aside before each commit:
  `for L in .git/*.lock; do [ -e "$L" ] && mv "$L" "$L.stale.$RANDOM"; done`. Separately, `git push`/`fetch`
  to GitHub 403s through the sandbox proxy — planning commits land locally on `main`, and the **human
  pushes** from their own terminal; the agent can't push or fetch itself. *(2026-06-12, doc-drift
  reconciliation.)*
- **A sprint doc's own gate is worth re-confirming explicitly at the start of the NEXT sprint, even when
  the repo already records it having been met.** A prior sprint's commit trail can show the exact evidence
  a gate demands (e.g. a live round-trip smoke), but a HIGH-consequence action gated on it (deprecating a
  daily-used admin tool) still warrants an explicit in-conversation yes before acting — don't let "it's
  already in the git log" substitute for asking. *(2026-07-03, zine-editing-central S3.)*
- **Before touching a surface a scope doc calls "duplicate" or "deprecated," verify by direct read which
  code paths it actually shares with the surfaces the acceptance requires to keep working.** Two routes can
  look like one feature in prose but be separate code reading the same underlying table — confirming that
  (not just trusting the doc's phrasing) is what keeps a deprecation from over-removing. *(2026-07-03,
  zine-editing-central S3.1 — the Maqueta "builder" and the "print/export" pipeline read the same
  `print_layouts` table but are different routes; only the builder was in scope.)*
- **A subagent/fork that dies mid-task from a shared session rate-limit still returns a `result` — that
  text is its last tool-call narration, not a trustworthy completion claim.** Five parallel forks doing a
  mechanical file-sweep all hit the same account-level rate-limit simultaneously and terminated
  `status: failed`; one fork's dying narration even referenced a different fork's assigned file, reading
  like real confusion but really just whatever it happened to be mid-sentence about. Trusting any of their
  result text would have left 2-3 files silently unfinished or referencing components with no import line
  — `tsc` caught it, the fork's own "looks done" narration would not have. After any subagent/fork batch —
  especially one large enough to plausibly share a rate-limit, or any showing `status: failed` — re-derive
  actual file state directly (grep the real repo) and run the language's type-checker/build before treating
  the batch as complete. *(2026-07-10, seller-portal-rails-foundation S2.)*
- **A CI-lint's hard gate should cover exactly what a sweep actually swept, not the whole tree the
  underlying scan visits.** A settings-tree directory audit found ~50 more seller-portal files than a
  sprint doc named, all with the exact debt the new lint was built to catch — asserting `toEqual([])`
  across the whole `app/`+`lib/` tree would have failed immediately on files that sprint never touched.
  Fix: scan broadly for visibility (future sweeps see what's left), but assert the hard `toEqual([])` gate
  only against an explicit `enforcedSweptPaths`-style allow-list that each sweep extends as it goes — the
  same incremental-adoption shape as the raw-color guard's own file-exclusion list, just inverted (an
  enforced-list of what's covered, not an excluded-list of what's exempt). *(2026-07-10,
  seller-portal-rails-foundation S2.)*

## Tooling gotchas
- **Claude Code's auto-mode permission classifier can flag a `git push origin main` as unauthorized
  AFTER it already landed** — the push itself succeeds (visible on `origin/main`), but a denial message
  attaches to a *later* tool call, reads like it's blocking that unrelated call, and doesn't roll anything
  back. Don't treat "doc-only root-repo commits are low-risk, push them along the way" (WAYS-OF-WORKING's
  own framing) as pre-authorization for an agent to push `main` directly without asking — confirm with
  Daniel first, even for a trivial status-tick commit; queue any further doc commits unpushed until he
  says go. *(2026-07-02, seller-agent-connect-mcp-url S2.)*
  **Corollary — a broad "carry on, you're authorized" phrase covers continuing an already-discussed plan,
  not a brand-new CATEGORY of production mutation.** The permission classifier correctly blocked two
  distinct actions under that umbrella in the same session: reissuing a production TLS Origin CA cert on
  shared ALB infra (a real, globally-effective cert change the plan itself had flagged as a separate,
  deliberate step), and a Supabase PATCH that would have both re-embedded a real shop's live payment
  credentials in the command/transcript AND fabricated a paid-SKU entitlement grant on a real seller's
  shop. Both times, stopping and naming the exact action got a fast, specific yes/no — cheaper than
  guessing wrong either direction. Before acting under a broad-authorization umbrella, ask whether *this
  specific category* (TLS/cert changes, IAM/secret bindings, DB writes touching money/entitlement/
  credentials) was actually named or clearly implied by what was discussed — if not, name it in one
  focused question rather than reaching for broader phrasing or a workaround.
  *(2026-07-10, frontend-vercel-to-cloudrun S4.)*
- **A script with a co-located pure-logic test file MUST guard its `main()` call with an `isMain` check —
  this bit two separate scripts in the same epic before it was caught.** S2's `build-order-sync.mjs`
  incident (unconditional `main()` executed for real when imported for its pure helpers) recorded the fix
  but never got promoted here as its own generalizable rule — and `standup.mjs` had the exact same gap
  the whole epic (S1 through S3), undetected simply because nobody had written `standup.test.mjs` yet.
  When adding a test file for ANY script, check for `const isMain = process.argv[1] && …; if (isMain)
  main()` FIRST, before importing anything from it for pure-function testing — importing a script that
  calls `main()` unconditionally at module scope re-executes the whole script for real (shell-outs,
  Telegram posts, git pushes, all of it) the moment `node --test` loads the file. *(2026-07-03,
  ops-routines-reporting — found while adding `standup.test.mjs`.)*
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
  is untracked; don't commit it (this note is scoped to a WORKTREE'S incidental lockfile — a reused package
  name breaks npm workspace resolution at the monorepo root, so the file that comes out can be malformed;
  it does not apply to a deliberately-generated, CI-validated per-app lockfile — see the `deploy-pipeline-tuning`
  epic, which committed real `package-lock.json`s to both `apps/backend` and `apps/miyagisanchez` on purpose).
  *(2026-06-09, trust-messaging-polish S2.)*
- **`gh pr merge --delete-branch` fails when a worktree holds `main`.** The merge still succeeds on
  GitHub; only the local branch-delete errors. Verify with `gh pr view <n> --json state`. Don't
  re-run blindly.
- **`process.env.NEXT_PUBLIC_SITE_URL ?? \`https://${req.headers.get('host')}\`` is a real
  server-side gotcha, distinct from the client-bundle `NEXT_PUBLIC_*` build-time-inlining bug
  (`444c5cb`/`fc3cf37` — those only affect `'use client'` code).** This is a **server-side runtime**
  `process.env` read, which is normally the *correct*, live-reading pattern — the trap is the Host-header
  fallback when the env var is unset. Daniel hit it reconnecting Stripe locally via a bare Docker run
  (`docker run -p 8080:PORT` with no explicit hostname config): the `Host` header came through as
  `0.0.0.0:8080`, and the fallback happily built `https://0.0.0.0:8080/...` as a real Stripe Connect
  `return_url` — a broken redirect on a money path. `.env.local` had the correct value; `next dev`/`next
  start` read it automatically, but a plain `docker run` only gets `NEXT_PUBLIC_SITE_URL` if it's passed
  as an explicit runtime env var (`-e NEXT_PUBLIC_SITE_URL=...`), not just baked into `.env.local`. Cloud
  Run itself isn't believed exposed — its own reverse proxy forwards a trustworthy `Host` in normal
  operation; the failure shape (a literal `0.0.0.0` bind address) is local-Docker-specific. The identical
  fallback was duplicated across 11 route files (every Stripe/MercadoPago connect/checkout/subscription/
  billing-portal callback builder). Fix: one shared `resolveOrigin()` helper (`lib/request-origin.ts`)
  that rejects obviously-wrong hosts (`0.0.0.0`, `undefined`, `null`, empty) and **throws instead of
  silently building a broken URL** — a loud failure beats a dead redirect on a money path. *(2026-07-13,
  fix/stripe-connect-redirect-bugs.)*
- **A unit-tested pure helper can't live in a module that imports `next/cache`.** The Playwright
  runner can't load `next/cache`, so importing the module to test the pure function throws. Keep the
  pure logic in a next-free module (e.g. `lib/slug.ts`) and let the cached/DB wrapper import *it*.
  *(2026-06-06, custom-slugs.)* **Corollary — the same trap fires for `server-only`/`@clerk/nextjs/server`,
  and the discipline has to be enforced at the FILE level, not the function level.** A new pure predicate
  (`isSellShellCandidatePath`) was itself side-effect-free, but it lived in the same file as an async
  `server-only` gate importing `@clerk/nextjs/server` — importing that file from a Playwright `api` spec
  threw an opaque `Cannot find module '.../routeMatcher'` from *inside* Clerk's package (a resolution
  failure, not a missing file), even though the predicate never touched Clerk. The existing
  `lib/seller-mode.ts` convention (keep the pure predicate in its own zero-import file, precisely so the
  api spec can load it directly) already states the reason; the gap was applying it inconsistently to a
  new sibling file. When adding a pure predicate alongside an async/auth-touching helper, split them into
  separate files from the start. *(2026-07-11, catalog-management S6.1 — `lib/sell-shell-path.ts` split
  out of `lib/seller-shell-gate.ts`.)*
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
- **`vercel env add` silently stores EMPTY values** (both stdin-pipe and `--value`); `vercel env pull` also
  redacts every value to `""`, so it can't verify either. Set vars via the **REST API**
  (`POST /v10/projects/{id}/env`; `PATCH` doesn't reliably update → DELETE+POST) and verify by value
  **length** (decrypt needs a scoped token). Preview env-add also prompts for a git branch — the "all
  branches" non-interactive path loops. *(2026-06-06, Flagsmith epic.)*
  **A Vercel _Sensitive_ env var is write-only — you cannot read its value from the CLI or REST at all.**
  You can confirm its **presence/target/type** programmatically (`type:"sensitive"`, `has_inline_value:false`)
  but not its **mode/scope** (e.g. `sk_live` vs `sk_test`) — read the provider dashboard, or have the app
  surface the cause on use. Sensitive vars are also per-environment: a Production-only key leaves Preview
  with none at all (missing key throws before any HTTP call → classify as auth, not "unknown").
  *(2026-06-23, domain-coupon-mint-fix S1.3.)*
- **Backend Cloud Run deploy is image-only** — `cloudbuild.yaml` runs `gcloud run deploy --image=…` only;
  env vars/secrets/SA/scaling were set once by `infra/gcp/deploy.sh` and Cloud Run **preserves them across
  deploys**. So you can provision a new Secret Manager secret + `gcloud run services update
  --update-secrets` (additive) **before** the merge that needs it, and the merge's image-swap keeps it.
  Grant `secretAccessor` to the runtime SA. *(2026-06-06.)*
  **Corollary — image-only deploys make the full deploy *script* silently drift from live.** CI never
  re-applies the full config, so the script accumulates gaps: a secret added live-only is missing from its
  `--set-secrets` (which **replaces**, so a full run would drop it), and a var bound as a secret that live
  actually carries as a plain env makes a full run **ERROR**. Reconcile against `gcloud run services
  describe` and lock parity with a static guard. *(2026-06-12, backend-prod-readiness S4 —
  `infra/gcp/test/deploy-invariants.test.js`.)*
  **Corollary — retiring a secret is a same-change trio + a strict live order.** Drop it from `deploy.sh`
  `--set-secrets` **and** the drift-guard's expected set in the same change (else the guard reds, or a
  stale binding ERRORs a future full run). Then, live: `gcloud run services update --remove-secrets=X`
  **first** (the new revision must boot without it, proving nothing reads it), only **then** `gcloud
  secrets delete X` — deleting first fail-closes any new revision on an unresolvable `:latest`.
  *(2026-07-01, feature-flags-inhouse S3.)*
- **A `:latest` Secret-Manager binding re-resolves on EVERY new revision — and `latest` = highest-NUMBER, not
  highest-ENABLED.** Two coupled traps from the Cloud SQL cutover. (1) Cloud Run binds `DATABASE_URL:latest`,
  and because image-only deploys *also* re-resolve it, **staging a future-cutover value as the enabled `latest`
  version is a deploy-time landmine** — the next routine deploy silently cuts prod over to it. (2) When you
  realize that and disable/destroy the too-high version, `:latest` does **not** fall back to the prior enabled
  one — `latest` is the highest version *number*, so `access latest` now **errors** (fail-closed: new revisions
  blocked, running revision unaffected). The fix is to **add a fresh higher *enabled* version** (you can't
  reclaim a destroyed slot); **pin `:N` if you need determinism**. *(2026-06-22, postgres-neon-to-cloudsql S1/S2 —
  the v1 provisioner wrote the Cloud SQL DSN as `DATABASE_URL` v2 against a live `:latest` binding.)*
- **In-VPC private-IP Postgres ops need a connector-attached Cloud Run Job, not a laptop.** A private-IP-only
  Cloud SQL (or any DB on the VPC) is **unreachable from a laptop/sandbox**, and a local `pg_dump` 14 refuses a
  PG17 server. Run the dump/restore from a **Cloud Run Job** on `postgres:17-alpine` with
  `--vpc-connector=medusa-conn --vpc-egress=private-ranges-only` + the SA + `--set-secrets` — it has a
  version-matched client *and* reaches both the private Cloud SQL and any public DSN (e.g. Neon) at once.
  Gotcha: **`gcloud --args` splits on commas by default** → a SQL command containing commas silently fails the
  `jobs update` (the job re-runs OLD args); use a custom delimiter `--args="^@^-c@<sql>"`. A gcloud-created
  `medusa_app` is a `cloudsqlsuperuser` (owns/creates in its DB → no extra grants needed). *(2026-06-22,
  postgres-neon-to-cloudsql S2 — the cutover dump/restore ran as a connector-attached Job.)*
- **Provision GCP monitoring as an idempotent script, rehearsed on staging; a `node:test` config-guard is
  infra's deterministic gate.** Stand up uptime checks + Cloud Run alert policies via a
  create-if-absent-by-displayName script (`TARGET=staging|prod`) and **rehearse on staging then tear down**
  (staging `min=0` flaps an uptime check) — the rehearsal surfaces CLI-shape bugs for free: threshold
  conditions support only `COMPARISON_LT`/`GT` (no GE/LE); a log-based alert needs
  `alertStrategy.notificationRateLimit`; build policy JSON via a file/`python3`, never a shell heredoc
  (quoted filter strings break inline JSON); pass `--project` per call. Infra isn't Playwright-gated, so the
  deterministic gate is a pure `node:test` asserting the deploy scripts vs live config — same anti-erosion
  shape as the raw-color/monolith guards. **Error tracking went GCP-native** (Error Reporting auto-groups
  `severity>=ERROR` logs) over adding `@sentry` — zero new dependency. *(2026-06-12, backend-prod-readiness S4.)*
- **A Medusa `MedusaService` auto-generated `update{Models}({id,…})` returns a SINGLE object, not an array —
  array-destructuring it throws "object is not iterable", and `(svc as any)` hides it from `tsc`.** A money-plan
  seed 500'd at ~25 ms (too fast for a DB error → an early synchronous throw) on every UPDATE while the CREATE
  path worked: `const [plan] = await updateSubscriptionPlans({id,…})` destructured a non-iterable. The `create`
  return is a single object used directly (fine); the destructure only bites the update path, so a first-time
  seed (all creates) passes and a re-seed / second-cadence (updates) explodes. Because the service is resolved
  as `(subs as any)`, the build/gate can't type-check the return. Normalize with `Array.isArray(x) ? x[0] : x`
  (the same guard the connect/upsert paths already use), and **verify the UPDATE/re-seed path against live
  Medusa, not just the first-time create** — the gate only exercised create. The generic Medusa 500
  `{"code":"unknown_error"}` masks the real cause; the stack (`object is not iterable (… Symbol.iterator)`)
  is in the Cloud Run **stdout** logs, not the structured error entry. *(2026-07-01, mercadolibre-sync S6 —
  `setup-ml-sync-plan` hotfix #54; `setup-subdomain-plan` has the same latent shape.)*
- **Stripe Node SDK v22 reshaped promotion-code params under a `promotion:{type:'coupon',coupon}` hash** —
  `tsc` catches the old top-level shape immediately. Give the coupon + promo code **deterministic ids/codes**
  so find-or-create (an admin "mint" button / seed) is idempotent. *(2026-06-11, custom-domain-paywall S3 —
  coupon `miyagisan`.)*
  **A Stripe Coupon `name` is hard-capped at 40 characters** — exceed it and `coupons.create` throws before
  anything downstream in a multi-step mint. Keep money-infra provider-string fields under their limits and
  lock it with a CI guard. This was the *actual* prod cause of the `miyagisan` mint failure, not the
  `promotion`-hash shape above. *(2026-06-23, domain-coupon-mint-fix S2.1.)*
- **Driving a young foreign CLI (`codex`, `agy`): run `<cli> --help` first, pin the version, and design for
  degrade — never build against a documented flag from memory.** `agy` has no `--output-format json`; the
  real interface is `agy -p "<prompt+diff>"` (plain text, **no stdin path** — the diff must be embedded in
  argv, so guard against E2BIG above ~256 KB). `codex exec "<prompt>"` takes the diff on **stdin** instead.
  `scripts/cross-review.mjs` is the reference shape: `--version`-check + branch context-passing per CLI;
  smoke-test by running it against a real PR and reading the output. *(2026-06-10, cross-agent-code-review
  S1 — also: `git commit -- <paths> -m "msg"` fails because everything after `--` is a pathspec; put `-m`
  first.)*
  **A young foreign CLI can silently break its own contract on a MINOR version bump.** `agy`'s print mode
  started (a) emitting nothing without an explicit `--model`, and (b) exiting **0 with empty stdout** on a
  quota-exhausted model (the real error only appears in its own `--log-file`, never stdout/stderr) — so a
  non-zero-exit check can't catch it, and the reviewer silently returned empty for weeks. Fixes that
  generalize: pass `--model` explicitly, treat **empty output as failure** (not success), give the model a
  primary→fallback pair, and make the version check **fail loud** (a stderr-only warn gets ignored, which
  is how the bad bump shipped). *(2026-06-23, devops-reliability-cleanup S4 — pinned `agy` 1.0.10; re-verified
  and bumped to 1.0.16 on 2026-07-03 — the guard did its job, forced a manual re-check before bumping, no
  further contract break found. One new wrinkle: an omitted/unrecognized `--model` no longer prints nothing —
  it now silently substitutes a default model, harmless since the pinned model constants are always valid.
  **The manual re-check is now a script** — `scripts/agy-doctor.mjs` re-verifies the live contract
  (help flags, `agy models`, real `-p`/`--model` probes) and `--fix` bumps the pin only on a green
  probe; the pin's own die message names it, and agents are pre-authorized to run it (WAYS-OF-WORKING
  → cross-agent bullet). Two probe gotchas from building it: agy prints `--help` to **stderr** (read
  both streams when probing a foreign CLI), and a listed-but-quota-empty model is a transient warn,
  not drift. 2026-07-06.)*
  **A CLI authed by an interactive/OAuth login is NOT free to run in CI — confirm a portable
  non-interactive credential path AND its cost before automating it in a runner.** `codex` can auth
  headlessly with a token-billed API key; `agy` has **no headless auth at all**. Automating a root-repo
  tool from an app-repo workflow also costs a cross-repo PAT. That bill wasn't worth it for an advisory aid
  that never gates, so the cross-review command shipped **local-only** (run manually on every PR) rather
  than as a CI job. *(2026-06-22, cross-agent-review-always.)*
  **A cloud Routine runs *as you*, which sidesteps that CI foreign-CLI auth blocker — the unlock for
  "auto-review on every PR."** A Claude Code Routine is a full cloud session under your own claude.ai
  identity, so a GitHub-triggered review routine gets auto-on-every-PR with zero CI-credential cost (as the
  Claude family, not codex/agy). Three facts that only surfaced live: **(1)** a GitHub trigger is one
  specific action OR all-actions — you cannot combine `opened` + `ready_for_review`; pick whichever matches
  how PRs actually land (`opened` misses a draft→ready flip). **(2)** the Pro daily cap (5/day) bites
  **scheduled** runs only — GitHub-event/API triggers have separate hourly caps, so a GitHub-triggered
  review is effectively uncapped for solo volume. **(3)** routines have **no built-in failure alert** — a
  green run only means the session exited cleanly, not that the task succeeded, so route the actionable
  output somewhere you already watch (a PR comment) rather than trust silence. Keep any routine
  advisory-only/never-a-required-check (a plain PR comment carries no commit-status, so it structurally
  can't gate). *(2026-06-24, routines-enablement.)*
  **Corollary — a routine that shells out to `gh` needs that CLI provisioned explicitly; it is NOT
  pre-installed in a routine's cloud sandbox.** The sandbox has built-in, read-oriented GitHub tools
  (issues/PRs/diffs/comments) that work with zero setup, but they're scoped to whichever repo the routine
  cloned — a script written around `spawnSync('gh', …)` for multi-repo writes (`gh pr list --repo <any>`,
  `gh run rerun`, `gh pr comment`) fails outright with no `gh` binary at all. Fix: add `apt update ||
  true` then `apt install -y gh` to the environment's **Setup script** (runs once, cached ~7 days) and a
  `GH_TOKEN` env var holding a PAT scoped to the repos needed — `gh` reads `GH_TOKEN` automatically, no
  `gh auth login` needed. `github.com`/`api.github.com` are already in the **Trusted** network-access
  default, so no domain change is needed, only the two steps above. *(2026-07-02, ops-routines-reporting
  — `ops-nightly`'s first two live scheduled fires both failed at step 2 with exactly this gap.)*
  **Corollary — `apt update` is fatal on ANY configured repo's failure, even one the install doesn't
  need, and the sandbox base image ships third-party PPAs that can 403.** The naive `apt update && apt
  install -y gh` setup script failed live (exit 100): the base image pre-configures `deadsnakes` and
  `ondrej/php` PPAs (for extra Python/PHP versions, unrelated to `gh`), and Launchpad returned `403
  Forbidden` on both — a real response from Launchpad's server (shared-sandbox-IP reputation, most
  likely), not a network-access/proxy block — while the actual Ubuntu archives `gh` needs
  (`noble-updates/universe`, where `gh` ships on 24.04) fetched fine in the same run. `apt update`'s
  all-or-nothing exit code doesn't distinguish "a repo I don't need failed" from "the repo I need
  failed," so it aborted before the install step ever ran. Fix: `apt update || true` (matches the docs'
  own general guidance to append `|| true` to non-critical setup-script commands) before `apt install`.
  *(2026-07-02, ops-routines-reporting.)*
  **Corollary — even with `gh` installed and a working `GH_TOKEN`, its GraphQL-backed subcommands can
  still be blocked in a routine sandbox — trace with `GH_DEBUG=api` before assuming a fix worked.**
  After fixing the setup script, `ops-nightly` ran further but its PR/CI signals were still silently
  blank: `gh pr list/view --json` and `gh pr comment` all route through `https://api.github.com/graphql`
  internally (confirmed with `GH_DEBUG=api gh pr list --json … 2>&1 | grep 'Request to'`), and GraphQL
  was blocked in that sandbox even though REST wasn't — `gh run list/rerun` and any `gh api <rest-path>`
  call use REST v3 and worked fine throughout. The fix is a REST-only rewrite (`scripts/lib/gh-rest.mjs`):
  `gh pr list --search` → the REST `/search/issues` endpoint (same `merged:>=`/`base:` qualifiers, and —
  contrary to what you'd guess — genuinely REST, not GraphQL, despite `gh pr list --search` itself routing
  through GraphQL); `gh pr view --json mergeable` → `GET /pulls/{number}`, with GitHub's own documented
  retry-on-`"unknown"` pattern since `mergeable` is computed **asynchronously** (a just-fetched PR can
  report `mergeable_state:"unknown"` on the first try — one retry with a short delay resolves it,
  confirmed live); `statusCheckRollup` → merge `GET commits/{sha}/status` (legacy) +
  `GET commits/{sha}/check-runs` (Actions/Apps) into one rollup, since GraphQL combined what REST splits
  across two endpoints; `gh pr comment`/`gh pr create` → `gh api … --input -` with a JSON body on stdin
  (avoids argv-escaping for multi-line content). Normalize REST's lowercase `conclusion`/`state` values to
  the UPPERCASE casing GraphQL's enums used, so existing pure decision functions (already unit-tested)
  need zero changes — only the I/O layer feeding them does. *(2026-07-02, ops-routines-reporting —
  live-verified end-to-end: a real conflict + a real CI-red run detected correctly, and
  createPullRequest()/postIssueComment() each round-tripped against a real throwaway PR/comment.)*
  **Corollary — a skill's `config.json` (gitignored, written via an interactive `AskUserQuestion` flow)
  cannot be the sole config source for an unattended routine.** Each routine run is a fresh git checkout,
  so a locally-written, gitignored file from one run never reaches the next — a routine session has no
  interactive human to answer `AskUserQuestion` either. The fix is an env-var fallback for anything a
  routine needs unattended: `standup.mjs`/`weekly-recap.mjs`'s `loadChatId()` now tries `config.json`
  first (the right mechanism for a local/interactive run) and falls back to `process.env.TELEGRAM_CHAT_ID`
  — reusing the same var the routines' optional failure-ping already required, so provisioning it once
  covers both call sites. *(2026-07-02, ops-routines-reporting.)*
  **Corollary — a delta-only tool must special-case a missing/wiped baseline as a bounded no-op, never as
  "everything happened."** Diffing the current state against an empty/`null` previous snapshot makes
  every historical item look "new" — `standup.mjs` had no such guard, so a never-committed
  `scripts/standups.log` made it enumerate `gh`'s entire recent-PR history (100+ titles across 3 repos) as
  one night's delta, overflowing Telegram's 4096-char limit and dying before ever posting **or**
  persisting a log — guaranteeing the identical failure every subsequent night (confirmed live,
  2026-07-02/03). The fix: when there's no prior snapshot for a given key (a repo, a window), emit ONE
  bounded "baseline established" summary (counts only) instead of enumerating history, and always keep a
  Telegram-length safety net (`formatPrList`/`truncateForTelegram`, now shared in
  `scripts/lib/telegram-format.mjs`) as defense in depth regardless. Add the regression test for the exact
  reported failure, not just the generic case — `standup.test.mjs`'s bootstrap tests assert directly on a
  120-PR-history fixture. *(2026-07-03, ops-routines-reporting.)*
  **Corollary — a script that has both scheduled window delivery and on-demand artifact generation must
  keep the artifact mode stateless.** PMO reports reused the weekly window-log rail correctly for scheduled
  Telegram delivery, but the first monthly smoke exposed the trap: `node scripts/pmo-report.mjs --monthly`
  would have advanced the weekly window and disturbed the next routine run. Keep `--weekly` stateful, but
  make monthly/sheet-only artifact modes print `window log not updated`, and lock that with a pure
  `shouldPersistWindow()` test. *(2026-07-14, pmo-operational-reports S3.)*
  **Corollary — when a routine-account permission toggle won't save, design the persistence mechanism to
  not need that permission at all, rather than escalating the toggle.** `standup.mjs`/`weekly-recap.mjs`
  originally committed their delta logs straight to `main`, which needs "Allow unrestricted branch
  pushes" — live 2026-07-02/03, that toggle's Save button failed in the claude.ai Routines UI ("Failed to
  save changes") with no further diagnosis available from outside the UI. Redesigned instead: persist the
  log on a dedicated `claude/`-prefixed branch via git PLUMBING only (`hash-object` → `mktree` →
  `commit-tree` → `push <sha>:refs/heads/<branch>`, in `scripts/lib/log-branch.mjs`) — no checkout, no
  working-tree/index touch, and already inside a routine's **default** push scope, so the broken toggle
  becomes moot. Two plumbing gotchas hit live: (1) `git mktree` builds a single-level tree, so a path
  containing `/` fails with "path contains slash" — use a flat filename on a single-purpose log branch,
  not the original nested `scripts/`-prefixed path; (2) an I/O wrapper that swallows a git subprocess's
  stderr on failure turns a one-line, obvious fix into an unexplained `false` — log the stderr at every
  plumbing step, not just at the top level. *(2026-07-03, ops-routines-reporting.)*
  **A second single-purpose cross-agent script should share the rail, not fork it.** The planning-panel
  script (a second opinion on a *plan* instead of a PR) reused ~90% of cross-review by extracting the
  family-agnostic plumbing (version checks, the per-CLI runners, the agy argv size-cap) into one shared
  `scripts/lib/cross-agent-cli.mjs`, keeping only each script's framing/output local. Give a runner an
  `opts.soft` mode so a non-essential pass degrades to a stderr note instead of dying; don't import a
  script with a `main()` that runs at module load — extract to a sibling lib both import. After `git mv`-ing
  a module, grep stale path refs in header comments + docs too, not just imports. *(2026-06-13,
  cross-agent-planning-panel S1.)*
  **To surface contradictions between two single-pass critiques, one constrained synthesis pass beats a
  debate loop.** Print both critiques verbatim, then one pass that lists only genuinely *opposite-action*
  contradictions (else "complementary") — stays single-pass (no back-and-forth, the #1 token sink) and
  degrades gracefully (a failed synthesis still prints the raw critiques). *(2026-06-13,
  cross-agent-planning-panel S1.)*

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
- **The Notion API/MCP can't set a board to group by a FORMULA (or a RELATION) property — it silently
  drops the grouping.** A `GROUP BY "<formula prop>"` update returns success but leaves the board
  *ungrouped* (the `groupBy` field just vanishes). So a "board status" formula (`Lifecycle ?? Status`) is
  great for *reading/filtering* but its **grouping must be flipped in the Notion UI** (owed step), or you
  design around it. For "build-order views" we used a **sorted table** (`SORT BY "Build order ID", "Name"`)
  instead of a board grouped-by-`Epic` relation — a sort clusters each epic's rows in sequence without the
  unsettable grouping. Verify a view edit by **re-fetching the database** (the view JSON shows `groupBy`
  only when it actually took; you can't `fetch` a `view://` URL directly). Two more: **Notion auto-creates
  an unknown select option on write** (an overlay PATCH writing `Lifecycle="In progress"` created the
  option — no pre-add needed); and the **SQL `query_data_sources` mode needs a Business+ plan** (else board
  verification is a visual eyeball, not a programmatic assert). *(2026-06-23, notion-board-hygiene S2 —
  `roadmap-to-notion.mjs` + the `Marketplace Roadmap` DB.)*
- **A heuristic path-existence check in this monorepo needs every known app root, not just the repo
  root.** `apps/miyagisanchez` and `apps/backend` are separate, gitignored repos here, so a doc bullet's
  `lib/x.ts` reference is relative to one of *them*, not the monorepo root — checking only the root
  produced ~50 false "dead path" positives before the fix; checking all known app roots dropped it to a
  handful of genuine edge cases. *(2026-07-02, doc-hygiene-learnings-sweep S1.2 — `scripts/doc-hygiene.mjs`.)*
  **Corollary — a scope doc's named "baseline reference file" can have moved to an entirely SEPARATE,
  un-deployed repo since the doc was written, not just a different app root.** Promoter Funnel v2 Sprint
  5's rate-card story assumed a baseline zine PDF + matching JSON (named in the epic's own "what already
  exists" list) would be readable by the PDF generator at runtime; both had actually moved into
  `apps/zine` — a separate local-only git repo with no CI and no deploy — unreachable from the Cloud Run
  render service regardless of path. Surfaced as a clarifying question before writing code (`git status`
  showed the files untracked; `find` across app roots showed the real JSON living elsewhere), not
  discovered mid-build — the generator was designed to build fresh from existing primitives instead, with
  zero runtime dependency on either file. Before designing a generator/importer around a scope doc's named
  reference asset, confirm it still exists where the doc says AND that the runtime that needs it can
  actually reach it. *(2026-07-03, promoter-funnel-v2 S5.)*
- **A git-log pickaxe scan is a cheap, dependency-free way to detect a specific frontmatter field's flip
  within a date window — no new metadata field needed.** `git log --since=<date> -p -- <pathspec>`,
  regex-matching added (`+`-prefixed) lines against the preceding `diff --git a/<file> b/…` header to
  know which file each hunk belongs to, found every epic README's `status: shipped`/`status: archived`
  flip in a trailing window with zero false positives against a manual tally — the flip's own commit date
  **is** the ship date, so no separate "shipped-on" frontmatter field is needed. Pass `--reverse` so the
  diff arrives oldest-first, making "last write wins" in a dedupe map mean *chronologically* last, not
  textually last in the output. *(2026-07-02, ops-routines-reporting S3 — `scripts/weekly-recap.mjs`.)*
- **"Merging to `main` is the deploy" is a legitimate, zero-new-dependency proxy metric for a reporting
  tool, when the acceptance bar is "matches what a human would count by hand."** A weekly recap needed a
  "deploys" count with no API specified; rather than add a new Vercel-API/gcloud credential surface for a
  LOW-risk read-only report, reusing `WAYS-OF-WORKING.md`'s own framing (merging to `main` on either app
  repo already **is** the production deploy) gave the exact number a manual tally would produce. Reach for
  an existing documented convention before reaching for a new external API. *(2026-07-02,
  ops-routines-reporting S3.)*
- **A periodic-but-not-strictly-cadenced report needs a WINDOW-tracking memory log, not a delta-snapshot
  one — they solve different problems.** The daily standup (`scripts/standups.log`) diffs the current
  full state against yesterday's snapshot (nothing changed → say so); a weekly recap instead needs to
  know **where the last window ended** (`scripts/weekly-recaps.log`: `{windowStart, windowEnd}` per run)
  so back-to-back runs — whether exactly 7 days apart or not — never double-count or leave a gap. Don't
  reach for the delta-diff shape by default just because a sibling script already has one; match the log
  shape to whether the report is "what changed since last look" or "what happened in this period." A
  quiet-period collapse built on either shape must still check every underlying signal actually reported
  in before printing the upbeat "nothing happened" framing — an unavailable read is a different fact from
  a genuinely quiet one, and a fixture test catches the conflation before it reaches a real message.
  *(2026-07-02, ops-routines-reporting S3 — `scripts/weekly-recap.mjs`.)*
- **When the checked-out backend `.env`'s DATABASE_URL turns out to be stale/read-only/wrong (e.g. the
  RETIRED pre-Cloud-SQL Neon instance), provision a fresh THROWAWAY local Postgres instead of giving up
  on a live smoke.** Homebrew `postgresql@14`'s `initdb` + `pg_ctl -o "-p <port> -k /tmp"` (no Docker
  needed) stands up a real cluster in seconds; `medusa db:migrate` against it applies every migration
  from scratch (a strong test in its own right — confirms a new migration is genuinely clean, not just
  additive on an already-migrated DB); a tiny `medusa exec` script can seed a publishable API key + a
  throwaway seller/product when no seed script covers it. When real Clerk/third-party (ML, Stripe)
  credentials aren't available to fake a full authenticated HTTP round-trip, call the shared function
  the route itself calls (e.g. `updateSellerProduct()`) directly via another `medusa exec` script —
  this proves the real write path against a real database, which pure unit tests (mocking nothing,
  since they're pure functions) don't. Tear the whole cluster down after (`pg_ctl stop` + `rm -rf` the
  data dir); never point ANY write at the shared/retired instance to "test" against it — it's read-only
  by design precisely to prevent that. *(2026-07-06, profit-analyzer S2 — validated the Apply-price
  write path + the new `price_apply` activity-log kind this way.)*
- **Never build a Tailwind arbitrary-value class via string interpolation** (e.g.
  `` `text-[var(--${someVariable})]` ``) — Tailwind's JIT compiler scans source text **statically** for
  complete class-name literals, so a dynamically-interpolated class name is invisible to it and silently
  emits **no CSS at all**. Not a build error — the element just renders with inherited/default styling,
  and nothing looks obviously broken until you notice the color is wrong. Fix: build a static
  `Record<YourEnumType, string>` mapping each known branch to a **complete literal class string** and
  index into that (the same pattern `components/ui/StatusBadge.tsx`'s `TOKEN_CLASS` record already uses
  correctly) — never interpolate inside the class string itself. *(2026-07-10,
  seller-portal-rails-foundation S2 — caught mid-sweep in `Negociacion.tsx` before it shipped.)*
- **A production build's `output: 'standalone'` server is the only reliable way to locally
  Playwright-verify a branch when `next dev` is broken for the repo (see the Turbopack corollary
  below) — and `next start` is NOT a safe substitute, despite printing what looks like a routine
  warning.** `next start` prints "`next start` does not work with `output: standalone`" but still
  boots and serves *stale* content — a locale-copy fix tested green against a build that had never
  actually picked it up, across two full `npm run build` reruns in the same session, silently (no
  error, no visibly wrong page — the served page just didn't have the fix). The real fix: run
  `node .next/standalone/<path-to-app>/server.js` directly. Two things `next build` does NOT copy
  into `.next/standalone` that you must copy by hand before it'll serve real pages: `public/` and
  `.next/static/`. And standalone does **not** auto-load `.env.local` the way `next dev`/`next
  start` do — source it into the process env before launching (`set -a; source .env.local; set +a;
  PORT=<p> node .../server.js`). *(2026-07-11, platform-migrations S3.)*
  **Corollary — Turbopack's dev-mode global CSS class scanner can crash on a literal string sitting
  in a `.spec.ts` fixture or a code comment, nowhere near any real Tailwind usage.** A design-token
  CI lint's own negative-fixture string (`rounded-l-[var(--r-*)]`, deliberately invalid syntax
  written to test a regex) got picked up by Turbopack's source-wide class-name scan and threw a hard
  PostCSS parse error on every page load under `next dev --turbopack` — while `next build`
  (webpack) built the identical tree with zero errors. When a `next dev --turbopack` 500 cites a
  nonsensical, non-Tailwind CSS token, `grep` that literal string across the **whole** repo
  (comments and test fixtures included) before assuming a real class-usage bug — this is what
  forced the standalone-server workaround above in the first place. *(2026-07-11,
  platform-migrations S3.)*
- **`scripts/cross-review.mjs` resolves its target repo from the current working directory, and
  gets it silently wrong from the monorepo root.** Running it from `/medusa-bonsai` (the root
  Roadmap repo) against an app-repo PR number printed a clean, unremarkable `cross-review skipped
  (empty diff)` — not an error — because it was diffing the *root* repo, which genuinely has no
  changes for that PR number. Always run it from inside the actual app-repo checkout/worktree the
  PR belongs to, or pass `--repo owner/repo` explicitly. *(2026-07-11, platform-migrations S3.)*
- **`scripts/cross-review.mjs`'s default `gh pr diff` piping used to blow Codex's context window on
  a PR whose diff includes a large auto-generated file (a committed `package-lock.json`, ~12–19K
  lines) — FIXED 2026-07-11, don't re-derive the hand workaround below.** Codex would exit non-zero
  with `ERROR: Codex ran out of room in the model's context window` on either stdout or stderr
  (inconsistent across failure paths), which surfaced as an opaque `codex exec failed (non-auth):
  0` (the "0" is codex's own trailing token-count diagnostic, picked up by `lastLine()`, not a real
  exit code). **Fix landed**: `stripGeneratedFileDiffs()` (`scripts/lib/cross-agent-cli.mjs`)
  replaces whole per-file diff hunks for known lockfile basenames (`package-lock.json`,
  `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`, `Gemfile.lock`, `Cargo.lock`, `poetry.lock`,
  `npm-shrinkwrap.json`) with a one-line placeholder — the reviewer still sees THAT the file
  changed, not its content — applied by **default** in `cross-review.mjs` (opt out with
  `--include-lockfiles`). A new `isContextWindowOverflow()` check + `decideCodexFallback`'s
  `fail-context-overflow` branch is defense-in-depth for a generated-file type the allowlist
  doesn't yet know about — fails with a specific, actionable message (and correctly skips the
  Antigravity fallback, since an oversized input would likely overflow that model too) instead of
  the old opaque text. 14 new `node:test` cases; verified end-to-end against the exact PR that
  originally failed. If a NEW class of huge generated file trips this again, add its pattern to
  `GENERATED_FILE_RE` (or pass `stripGeneratedFileDiffs`'s `extraPatterns` for a one-off) — don't
  reach for the manual `git diff ':(exclude)...' | codex exec -` workaround this entry used to
  describe; the script handles it now. *(2026-07-11, deploy-pipeline-tuning S1/S2 fast-follow.)*
- **When reusing an existing admin "price vs. regular-price comparison" UI field for a new entity
  that has no regular price to compare against, check whether the missing comparison value ALSO
  disables the raw input — those are two different questions a single `base == null` check can
  wrongly conflate.** "No fixed regular price" (correctly hides the discount-math comparison) and
  "admin cannot set ANY price" (a bug, for any entity that IS still directly priced elsewhere) got
  gated by the exact same boolean, so the second entity ever added to the pattern inherited a real,
  live-money-relevant bug that sat undetected through an entire prior sprint — the underlying API
  route worked fine; only the UI gate silently blocked the one path that would have exercised it.
  *(2026-07-11, platform-migrations S3 — the `migration` promoter SKU's admin price field.)*
- **Verify every new spec can fail before trusting that it can pass, especially when written
  after the implementation — a deliberate mutation (break the code, confirm red) is cheap
  insurance against a false-positive tautology test.** Adopted from antoniel's agentic BDD article
  (https://dev.to/antoniel/my-agentic-engineering-process-from-vibe-code-to-bdd-2ne) — the one
  piece worth taking. Explicitly NOT adopted: Gherkin/.feature files, Cucumber ceremony, Stryker
  mutation tooling, or an enforced test-first ordering. *(2026-07-12,
  process-ux-rails-and-red-green S1.)*

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
- **Zero search coverage on a clean, correctly-configured site is usually new-domain crawl-starvation, not a
  code bug.** Before touching code, rule out cloaking/noindex/robots with a **live Googlebot-UA-vs-default
  body byte-diff** + live `robots`/`sitemap`/`llms`/manifest fetches + `whois` domain age; if the config is
  clean, the fix is Search Console verify + submit + *time*, not more code. **A spoofed Googlebot UA from a
  dev IP only proves the app doesn't branch on UA — it cannot prove Vercel Bot/Firewall Protection wouldn't
  challenge a real Googlebot IP;** that gap closes only with Search Console URL-Inspection Live Test.
  *(2026-07-02, agent-discovery-and-indexing S0.)*
- **A DNS-cutover script that selects records by exact name (apex, or the literal wildcard string) can
  silently skip a differently-named record in the same "obviously covered" family.** Sprint 3's
  apex/wildcard/`mschz.org` flip script matched records by `name === domain` or `name === '*.'+domain`
  only — `www.miyagisanchez.com` is neither, so it sat unmigrated, still resolving straight to Vercel,
  for two full sprints until Sprint 4.5 checked it explicitly with a plain `dig`. Before declaring a
  domain family "fully cut over," enumerate every actual DNS record for that zone matching the domain's
  root, not just the ones the flip script's own selector logic explicitly named.
  *(2026-07-10, frontend-vercel-to-cloudrun S4.5.)*
- **A provider-swap's "is it live" check must not conflate the new provider's readiness signal with the
  live-routing fact the OLD provider's equivalent signal implied.** Vercel's `misconfigured: false` only
  ever went true once DNS genuinely pointed at Vercel. Cloudflare for SaaS's custom-hostname
  `status: active` can be reached via TXT ownership validation **before** the seller's DNS changes at
  all — that's what makes pre-provisioning migrations safe by design (see S4.3 below), but it also means
  code ported from the old seam (`checkDns()`'s `dns_ok` decision) silently carried forward the old
  provider's assumption as a latent bug: a domain could read "live!" while actually still serving from
  elsewhere. Caught by cross-agent review, not by the deterministic gate — this class of gap (a new
  provider's status field meaning something narrower than the old one's) doesn't show up in a type-check
  or a green Playwright run against fixture data. *(2026-07-10, frontend-vercel-to-cloudrun S4.1/S4.2.)*
- **Vercel API tokens cannot have their scope narrowed after creation — scope is set only at MINT time.**
  There is no PATCH-style endpoint to reduce an existing token's permissions; `vercel tokens add --project`
  only scopes a **new** token. "De-scope this token to preview-only needs" as a stated acceptance
  criterion is not API-automatable from the token side — it requires minting a new, narrower token and
  rotating every consumer (here: two GitHub Actions secrets) to point at it, then revoking the old one.
  *(2026-07-10, frontend-vercel-to-cloudrun S4.5.)*
- **Tenant-owned DNS cannot be migrated the same way platform-owned DNS is.** Sprint 3's apex/wildcard/
  `mschz.org` cutover worked because the platform controls that zone directly — a single API flip moved
  real traffic in minutes. A seller's own custom domain lives in **their** zone/registrar, which the
  platform doesn't control and (via the one-click OAuth connect flow) has no durable credential to write
  to later — the OAuth token is single-use, never persisted. So a tenant-domain "migration" script can only
  ever pre-provision (TXT ownership validation, no seller DNS change required) + report; the actual traffic
  move is the seller's own action, on their own timeline, and isn't scriptable from the platform side at
  all. Design any future tenant-DNS migration around this from the start, not as a discovered constraint
  mid-build. *(2026-07-10, frontend-vercel-to-cloudrun S4.3.)*

## Repo & deploy hygiene
- **Deleting a git branch does NOT delete its Vercel preview deployments — Vercel retains every deployment
  forever.** 73 merged/dead branches had left **150 orphan preview deployments** (469→319 after pruning).
  Pair branch cleanup with a preview prune: `node scripts/vercel-prune-previews.mjs` (dry-run by default;
  `--apply`, `--age N`, `--keep-branch <open-PR branch>`, `--project`) — it only deletes
  `target!=='production'`. *(2026-06-14, repo-hygiene chore.)*
- **A generated doc needs ONE authoritative source + a `--check` gate, or it silently drifts.** `BUILD-ORDER.md`
  drifted because epic status was inferred from brittle prose AND a *seed* frontmatter field two seeds could
  both claim (last-write-wins). Fix: SSOT = **the epic README's frontmatter `status:`**, read by both
  generators (prose/retro kept only as an advisory fallback signal); the board is a **generated view, never
  hand-edited**, guarded by `build-order.mjs --check` in CI. When a doc is generated from inputs, give it one
  declared source and a freshness gate — don't let two heuristics vote. *(2026-06-14, branch-cleanup +
  status-reconciliation chore.)*
  **Corollary — editing an epic README's `status:` frontmatter mid-PR is itself a trigger for the guard —
  and so is ticking a sprint doc's stories to done, even with the frontmatter untouched.** Any Roadmap PR
  that flips `status:` makes the committed `BUILD-ORDER.md` stale and the guard reds — expected, not a false
  positive. Fix: re-run `node scripts/build-order.mjs` and commit the regenerated file in the same PR
  whenever a story touches epic status. *(2026-07-01, model-split-sonnet5-execution S1.)* The same guard also
  fires from the **other** input it reads: `build-order.mjs`'s status-drift check compares the
  frontmatter-authoritative status against a **sprint/retro-derived** status, so marking a sprint's stories
  done in `sprint-N.md` (without touching the README's `status:` line at all) flips the derived side and
  reds CI on its own — this is the natural epic-close moment, so the fix is the same regen, done as part of
  actually setting `status: shipped`. *(2026-07-02, groom-archetype-lens S1 — closing its own PR.)*
  **Corollary — regenerating from a DIRTY working directory can bake in a sibling's untracked file and pass
  locally while CI's clean checkout reds.** `roadmap-to-notion.mjs`'s status derivation checks whether an
  epic's `RETROSPECTIVE.md` exists **on disk** (not via git) as a fallback signal — so a stray untracked
  retro file left by unrelated in-progress work (a sibling branch/worktree) silently changed another
  epic's derived bucket in the local regen, which then passed `--check` locally but failed CI's clean
  checkout (`build-order-fresh` red) since that file was never committed. Fix: regenerate from a
  disposable clean `git worktree` of the exact commit (`git worktree add <tmp> HEAD`) whenever the working
  tree has any untracked files that aren't your own, diff/copy the result in, then remove the scratch
  worktree — don't trust a `--check` pass in a dirty tree as proof CI will agree. *(2026-07-02,
  ops-routines-reporting S3 close-out.)*

## Build & QA
- **Match a regression spec's TIER to where the fix actually lives, rather than defaulting to whatever
  test type the original scope doc named.** A service/rental card-payment fix lived entirely in backend
  logic (a pure derivation function + a route guard) — the sprint doc's original QA plan assumed a
  frontend Playwright spec would cover it, but writing one would have meant inventing a new
  direct-to-Medusa cart-creation test pattern that doesn't exist anywhere in that repo's harness (every
  existing spec hits the frontend's own Next.js routes). The regression coverage went into the backend's
  existing unit-spec file instead (6 new cases, already part of the `test:unit` CI gate) — matching how
  the backend's own CI gate is designed (no DB-bound integration tests, pure-function unit specs only).
  The deviation from the original plan was stated explicitly in the sprint doc and the PR, not silently
  substituted. When a fix's regression coverage doesn't fit the test tier a scope doc assumed, put it
  where the fix lives and name the deviation, rather than forcing a new test-infra shape into an existing
  harness just to match the plan. *(2026-07-11, arranged-only-delivery S2.2.)*
- **A ported external tariff/pricing table's unit ("per piece" vs "per shipment/order") is easy to get
  wrong even with the source document open, and a single-item-only test suite can't catch it.** Porting
  Correos de México's Impresos tariff (a weight-band table) into a pure calculator, the first pass summed
  every cart item's weight into one combined total before quoting — plausible-looking, and every unit
  test passed, because they all happened to exercise a single item. The source PDF's own column header
  ("peso en gramos por pieza") only got read carefully during a cross-model review, which is what caught
  that two 1500g pieces (each fine alone) summed to 3000g and wrongly returned "no quote" once combined.
  When porting a tariff/pricing table, write the unit the table prices *by* into the calculator's own
  doc-comment, and include at least one MULTI-item test case explicitly — a suite of only single-item
  cases structurally cannot distinguish "quotes correctly" from "quotes correctly only when there's
  exactly one thing to price." *(2026-07-11, shipping-provider-expansion S3.1 —
  `lib/correos-tariff.ts`'s `quoteCorreosForPieces`, caught by Codex cross-review, not the original
  unit-spec suite.)*
- **A synthetic "oversize" test payload must be sized relative to BOTH the app's own cap and the real
  deployment platform's ceiling, not just the app's.** A payload comfortably above the app's own limit
  can still be ABOVE the platform's real body-size ceiling (Vercel Node.js Serverless Functions: ~4.5MB),
  so it only ever exercises the platform's error path in production, never the app-level validation the
  test was written to prove — and this is invisible in local dev (`next dev` enforces no such platform
  limit), so it can pass locally for the life of an epic until it runs against a real deployed preview.
  When a spec asserts "our app-level cap fires," pick a size strictly between the app cap and the
  platform ceiling, and say so explicitly in the test's own comment. *(2026-07-07,
  custom-print-products S4 — `e2e/artwork-upload.spec.ts` sent 5MB against a 4MB app cap, actually
  above Vercel's ~4.5MB ceiling; dropped to 4.2MB.)*
- **Extracting a validate-and-store helper out of a single-caller route can silently reorder a
  fast-fail relative to the expensive operation it exists to short-circuit.** The extracted function's
  own internal checks can look complete in isolation while the NEW caller has already paid for the
  expensive step (e.g. materializing a request body via `.arrayBuffer()`) before ever calling it — the
  cheap check that used to gate that step gets lost in translation. When lifting shared logic out of a
  route with an existing cheap-check-before-expensive-operation shape, explicitly verify the new
  caller preserves that ordering, not just that the extracted function's own checks still exist.
  *(2026-07-07, custom-print-products S4 — `lib/artwork-ingest.ts`'s extraction from
  `/api/artwork/upload`, caught by cross-review.)*
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
- **Horizontal mobile overflow is a BROWSER-project fact, not an api-gate fact — and a fixed heading size +
  `repeat(N, 1fr)` are the two latent offenders.** `document.documentElement.scrollWidth − clientWidth` only
  exists in a real layout, so the honest artifact for a "no overflow at 360/390/414px" story is a
  `*.browser.spec.ts` (opt-in, nightly), NOT an api spec — the api gate structurally can't measure it (the
  user-asked "one api spec" yields to "one *browser* spec" here). Prove it both ways: 15/15 green on the
  fixed build, **and** the same spec catches the bug on current prod (a meaningful spec, not a tautology).
  The two recurring CSS offenders: (1) a hero `<h1>` at a **fixed** `font-size` (e.g. `var(--t-4xl)` 48px) —
  a long word in any language overflows a 360px line; fix with `clamp(min, vw, max)` + `overflow-wrap:
  break-word` (continuous, no breakpoint bookkeeping), not a media query. (2) `repeat(N, 1fr)` is a latent
  **grid blowout** because `1fr` = `minmax(auto, 1fr)` and `auto` = max-content, so a wide/unbreakable child
  pushes the track past the container; guard with `minWidth: 0` on the grid child (the safe
  `minmax(min(100%, Npx), 1fr)` idiom is the other half of the same rule). Keep the fix as inline styles
  inside the page dir so it never touches `globals.css`/shared layout (stays LOW, no announce). The
  real-device pass (font scaling, on-screen-keyboard viewport, safe-area insets) is still genuinely **owed
  to Daniel** — headless viewport ≠ device. *(2026-06-26, seller-acquisition-landing-content-overhaul S4 —
  `e2e/seller-acquisition-mobile.browser.spec.ts`; the `/vende/servicios` fixed-48px h1 overflowed 31px @360px.)*
- **Fresh worktrees need local env before e2e means anything.** `git worktree` does not bring ignored
  `.env.local` / `.env` files. For Miyagi local API e2e, copy the app `.env.local` into the frontend
  worktree, copy backend `.env` into the backend worktree, start Next on `3001` and Medusa on `9000`,
  then run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:e2e`. Otherwise catalog/homepage
  tests fail with `fetch failed` / `ECONNREFUSED`, which looks like a regression but is just Medusa
  not running. *(Support Widget epic, 2026-06-05.)*
  **Corollary — the missing-env failure mode is the SAFE one; the dangerous one is a silent PASS.**
  `playwright.config.ts`'s default `baseURL` is **production** (`https://miyagisanchez.com`) when
  `PLAYWRIGHT_BASE_URL` is unset — so a brand-new API spec for a route/tool that doesn't exist yet on
  prod doesn't error, it just exercises PROD's current (different) behavior and can still report green,
  proving nothing about the local change under test. Two specs in this sprint (`orders-bulk-status`,
  `mcp-order-read`) "passed" against prod on the first run purely by accident (Clerk's blanket
  `/api/orders/*` 401 happened to match the expected status either way) — only caught by deliberately
  re-running with `PLAYWRIGHT_BASE_URL=http://localhost:3001` against a live local `medusa develop` +
  `next dev` pair and seeing the SAME specs exercise the actual new code. Always set
  `PLAYWRIGHT_BASE_URL` explicitly for any spec that hits a route/tool added or changed in the current
  session — don't trust a green run against the default baseURL to mean "my change works."
  *(2026-07-04, ml-orders-native S3.)*
  **Corollary — the same "baseURL defaults to production" fact also produces FALSE FAILURES, not just
  false passes, when prod itself is unstable.** A full local `npm run test:e2e` run showed a large,
  DIFFERENT set of unrelated-file failures on every re-run (`nav-entry-points.spec.ts` one run,
  `static-shell-split.spec.ts`/`platform-theme.spec.ts`/`profit.spec.ts` the next) — an earlier session
  the same day mischaracterized an identical pattern as generic "environment flakiness." The real
  mechanism: these specs use the `request` fixture and hit real production over the network, and prod
  was being actively worked on by concurrent sessions that same day (two separate incident-response
  epics shipped fixes). Before trusting a full local `api` run as a signal about your own branch, check
  which specs actually use the `request` fixture (network-dependent, hits whatever `baseURL` resolves
  to) versus which are pure/local (zero network — the real signal for a lib-only PR); CI's own run
  against the PR's Vercel preview stays authoritative for anything that does need the network.
  *(2026-07-13, cms-contenido-restore-and-polish S4.)*
- **A raw-color guard keeps a tokenized surface tokenized.** Once components move onto semantic CSS
  tokens, add a pure-logic `api` spec that scans customer-facing dirs and **fails CI on a newly-introduced
  raw hex** (allow-list legit hardcoded contexts: email, print/PDF, OG image, admin, sandbox) — cheapest
  way to stop the foundation eroding. **It bites brand-new client islands too, and only CI catches it:** a
  fresh `#fff` in a new PDP lightbox passed local tsc/build but failed CI; reuse the existing token
  (`var(--fg-inverse)`) instead. *(design-token-foundation, 2026-06-07 — reconfirmed on new client islands
  each of 2026-06-10, 2026-06-22, 2026-06-30; and 2026-07-08 bookshop-launchpad S3, where a whole new
  `/v/[slug]` public page + 4 seller-shell files shipped with inline hex — the guard scans the ENTIRE
  `app/(shell)` tree, so any new customer-facing page needs tokens from line one.)* **It also false-positives a `#`-prefixed NUMBER that isn't
  a color** (e.g. a bug id like "WebKit #279904") — write external bug ids without the `#` in
  customer-facing source. *(2026-06-22, pwa-glass-nav S2.1.)*
  **The same shape generalizes beyond color, to an anti-monolith guard:** a pure offender-finder `lib/`
  module + an `api` spec (real-tree assertion + in-memory negative fixtures) fails CI if a component in a
  refactored dir exceeds a line cap, or a banned filename/back-link string reappears — set the cap above
  the current largest file with headroom. *(2026-06-10, Shop Settings refactor — `monolith-guard.ts`.)*
  **When the guard trips because an orchestrator file crept up to the cap, DECOMPOSE — don't bump the cap**
  (that's the erosion it exists to stop): extract the new feature's section AND an existing sibling to
  reclaim headroom, keeping the file's parallel structure. *(2026-07-01, subdomain-pricing Canal UI.)*
  **Corollary — a directory-scoped guard silently stops covering a feature the moment its files move
  outside that directory, and nothing signals the gap.** Splitting the 1074-line `Canal.tsx` moved its
  federation half to a NEW sibling directory (`canal-propio/`, deliberately outside `SETTINGS_DIR` since
  it's no longer a settings section) — the anti-monolith guard, hard-coded to scan only `SETTINGS_DIR`,
  simply never looked there again. The new file immediately re-grew past the old cap (977 lines) with
  the guard reporting green the whole time; only an independent review pass caught it by hand. Fixed both
  ways: decomposed the file (extract a child component, don't just raise the cap — same precedent as
  above) AND added the new directory as a second scan root to the guard itself, so the same class of
  regression can't recur silently. When a refactor moves a guarded feature's files to a new directory,
  re-scope the guard in the SAME change — don't treat "it still passes" as evidence the guard still
  applies. *(2026-07-11, catalog-management S6.2 — `CANAL_PROPIO_DIR` added to `monolith-guard.ts`.)*
- **A grep for the FILE being renamed/deleted doesn't find every reference to the VALUE it represented —
  a taxonomy slug string, a registry count, a config key — those need a separate grep for the literal
  value.** Splitting `Canal.tsx` into `canal-propio/` + a new `apoyo` taxonomy slug correctly swept every
  code IMPORT of the old file (confirmed via grep, zero missed) but missed two Playwright specs hardcoding
  the literal slug string `'canal'` (a `SLUGS` array + a `MANUAL_KEYS` expected-list) and a flag-registry
  count that the new flag key bumped from 24 to 25 — both invisible to a filename-scoped grep, both caught
  only by CI on the first push. After sweeping every import of a file being renamed/retired, separately
  grep the literal string/count VALUE it carried across the whole repo (not just the directory being
  restructured) — the value can be hardcoded in a spec, a seed, or a doc with zero import relationship to
  the file itself. *(2026-07-11, catalog-management S6.2.)*
  **And a grep-to-zero cleanup (e.g. consolidating bespoke back-links onto one shared component) becomes a
  permanent invariant the same way** — an fs-guard scanning for the banned strings catches stragglers a
  first sweep missed. *(2026-06-23, seller-nav-consolidation S2.)*
- **A flag-gated route guard must (a) assert BOTH flag states and (b) gate auth BEFORE any config/secret
  check.** Two coupled traps that only surface on the SSO-gated preview, where `promoter.enabled` is ON (a
  shared-Flagsmith flip flips the preview eval too) and money/secret env vars are prod-only (unset). (a) An
  api guard asserting "feature hidden ⇒ 404" goes red the moment ops launches the flag — assert `[200,404]` /
  `[401,404]` so it's agnostic to the live flag value. (b) If the route checks a prod-only secret
  (`CLAIM_JWT_SECRET`, `MEDUSA_INTERNAL_SECRET`) *before* the auth check, an anonymous guard request gets
  **500, not 401** (the secret is unset on preview) — red CI. Order is **flag → auth → config-secret**, which
  also stops a 500 from leaking that a secret is missing. *(2026-06-30, promoter-program S3+S4 — S3 found the
  both-states rule, S4 the auth-before-secret ordering; `e2e/promoter-close.spec.ts`.)* **Corollary — the flag
  check must precede EVERY other gate on the flag-off path, including rate-limiting, not just secrets.** A
  connector-URL route checked rate-limit before the kill-switch, so a throttled client with the feature OFF
  got `429` instead of a deterministic `404` — same underlying bug as the secret-before-auth case (a
  non-auth gate answering before the flag decides the route "exists" at all), just with a different second
  gate. A cross-review (codex) caught it pre-merge. *(2026-07-02, seller-agent-connect-mcp-url S2 —
  `app/api/ucp/mcp/c/[slug]/route.ts`.)* **Counter-corollary — on a PAGE (not an API route), flag →
  `notFound()` before ANY dynamic API bakes the flag's BUILD-TIME value into a static prerender.** A
  flag-gated page whose first await is `isEnabled()` (with `currentUser()`/`headers()` only after) is
  static-eligible, so Next prerenders the `notFound()` — and the launch flag-flip then serves the baked
  404 forever (`x-vercel-cache: HIT` is the tell; a sibling page that awaits `searchParams` first dodges
  it invisibly). Pair the gate order with `export const dynamic = 'force-dynamic'` on any flag-gated
  page, and make the flag-flip smoke assert the POST-flip status, not just the dark state. *(2026-07-06,
  profit-analyzer S1 — `/shop/manage/profit` caught live at the `ops.profit_enabled` flip; FE #179.)*
- **Split "coerce a blank input to a default" vs "reject it" by whether the action is a PURCHASE or a
  MUTATION.** The same field (a billing `interval`) wants opposite defaulting on two money paths: a *buy* can
  safely back-compat a missing/blank interval to the discounted default (buying yearly is harmless), but a
  cadence *switch* is a money **mutation** — a malformed body or agent call defaulting to yearly would move a
  seller's plan + prorate behind their back, so the switch must **reject** an invalid interval (400 via a
  strict `asX` narrow) rather than coerce it. A cross-review (codex) flagged exactly this on a green PR. Same
  family as the flag→auth→secret ordering above: on a money surface, a permissive default is a latent bug.
  *(2026-06-30, subdomain-pricing S3 — `switchSubdomainCadence` uses strict `asSubdomainInterval`; the buy
  path keeps `coerceSubdomainInterval`.)*
- **"X acts on behalf of Y" usually decouples at the SEAM, not the route — check before forking the money
  path.** When a new actor (a promoter) must pay/operate on a resource they don't own (a seller's shop), look
  at whether the existing *builder + webhook* already separate actor from beneficiary (ours grant to a
  metadata `shop_id`, independent of the payer/`seller_clerk_id`) — the only routes that hardcoded "own shop"
  were the entry points. Then the whole feature is a new route that supplies the **target** id + a provenance
  flag (`paidByPromoter`) threaded into the same session metadata + grant note. The hardest-looking
  requirement needed near-zero new money plumbing; exploring the seam before planning is what surfaced it.
  *(2026-06-30, promoter-program S4 — `startCustomDomainCheckout` + `handleCustomDomainOneTimeComplete` already
  decoupled; only `/api/promoter/close/{domain,print}` were new.)*
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
  *(2026-06-11, custom-domain-paywall S3.)* **Corollary — an admin/mutation write must land where the LIVE
  reader reads; confirm the source before adding the action.** Before building the admin entitlement grant,
  S4.0 traced that the live custom-domain paywall derives from `marketplace_shops.metadata.custom_domain_grant`
  (the connect UI, the domain mutation routes, AND the MCP `get_domain_entitlement` all call the one
  `resolveDomainEntitlement(shop.metadata)` seam reading that field) — so the grant writes there and takes
  effect everywhere with zero extra wiring; writing a Medusa seller field or a new table would have been
  cosmetic. The read-side mirror of "grep every write keyed by the id": grep the consumer's *read* path and
  write to it. And **a "revoke/clear" action scoped to one grant type must refuse the others** — the same key
  (`custom_domain_grant`) holds both a hand-granted `comp` and a permanent `grandfather` grant, so a blind
  `delete key` revoke could silently strip grandfathered entitlement; gate by `type` on **both** server (409)
  and UI (hide the control). A cross-review (codex) caught this as the one blocking bug on the HIGH PR.
  *(2026-06-23, admin-consolidation S4 — `buildCompGrant` + `POST /api/admin/tenants/[id]`.)*
  **Corollary — derive identity/ownership from the CANONICAL store, never a best-effort mirror; a
  fire-and-forget mirror sync drifts and a reader keyed on it silently misfires.** The homepage showed a real
  shop owner the "¿Vendes algo? / Abre tu tienda" *recruit* card because `GET /store/home/personalization`
  read `hasShop` from the Supabase `marketplace_shops` mirror — which the frontend writes
  `ensureSupabaseShopMirror(...).catch(() => {})` (failure swallowed) — instead of the **canonical Medusa
  seller** (`listSellers({clerk_user_id})`, what `/store/sellers/me` uses) that the *same endpoint already
  queried for visitas*. When a fact has a canonical source (Medusa) and a convenience mirror (Supabase),
  derive presence/ownership from the canonical one and use the mirror only for the data it uniquely holds;
  the read-side twin of "grep every write keyed by the id." Harden the consumer too (a shop owner must never
  fall through to the recruit branch). *(2026-06-23, home-personalization recruit-card leak — BE #38 + FE #116.)*
  **Corollary — a revoke/delete button must gate on `res.ok` too, not just the success-path update.** A
  panel's `revokeConnector()` unconditionally cleared the shown credential after `DELETE`, with no `res.ok`
  check — since `fetch` doesn't throw on a non-2xx response, a failed server-side revoke (500, or the flag
  flipping off mid-session) would still show the seller "revoked" while the credential stayed live. The
  adjacent `rotateConnector()` in the same file already gated correctly (`if (res.ok && data.url) …`) — the
  bug was an inconsistency between two near-identical handlers, not a missing pattern; a cross-review
  (codex) caught it. Third documented instance of this exact class. *(2026-07-02,
  seller-agent-connect-mcp-url S2 — `components/ConnectAgentPanel.tsx`.)*
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
  noise.** First real use found no blocking items but several legit should-fixes and nits — all worth
  fixing, none a false block. It's **advisory-only** (never gates), **single-pass** (no iterate-to-converge
  loop, our #1 token sink), and **codex is the default** because it takes the diff on stdin (handles large
  PRs), whereas `agy` has no stdin and a ~256 KB argv cap. Cheapest insertion point: right after the
  deterministic gate is green, before asking for the merge. *(2026-06-11, backend-staging S1.)*
  **Decline (with a written reason) any should-fix that would diverge from an established cross-cutting
  convention if fixed in isolation — that's "noise," not a fix.** Codex once flagged an agent `baseUrl`
  built from the `Host` header, but that's the convention across the whole UCP surface, so patching only
  the new route would create inconsistency for no security gain — recorded as a possible cross-cutting
  follow-up instead, while the genuine should-fixes still landed. *(2026-06-13, neighborhood-pulse S2.)*
  **The Antigravity path works the same way and catches the same class of bug: a helper cloned from an
  existing one inherits its latent bug.** `ensureUrlProtocol`, modelled on `canonicalSourceUrl`, inherited
  its `raw.startsWith('http')` scheme test — which **false-positives a scheme-less domain that merely
  starts with "http"** (`httpbin.org`) — caught pre-merge and hardened to `/^https?:\/\//i`. When you model
  a new helper on an existing one, sanity-check its predicate against *your* input domain rather than
  copying it verbatim. *(2026-06-21, pdp-followups-cleanup S1.1.)* **Corollary — when a predicate bug turns
  up, grep for every COPY of it and relocate the pure logic to a shared dependency-free module** so copies
  can't re-diverge; a follow-up sweep found the same bug in 3 more hand-re-inlined copies, fixed by moving
  the pure helper to a dependency-free `lib/url.ts` that both server and client import. A pure helper gets
  re-inlined when its home module drags a heavy import — give it a dependency-free home up front.
  *(2026-06-21, canonicalSourceUrl sweep.)*
  **Triage a foreign-family advisory review against the green gate before acting — its "blocking" calls can
  be confident false positives on valid TS/CSS idioms.** A quota-degraded Antigravity fallback flagged two
  "blocking" build errors that don't exist (an intended object-spread override misread as a duplicate key;
  a CSS-module class inside an `@media` block misread as undefined) — both refuted by the already-green
  gate. **A "blocking" item that contradicts a green `tsc`/`build` is almost always the reviewer's miss, not
  a real bug** — apply only the genuine should-fix, and record the triage in the PR comment. Lower-
  capability fallback models raise the false-positive rate. *(2026-06-26, seller-landing-launch-polish S2.)*
  **A story's own LOW-risk tier doesn't exempt its gating/availability logic from the same scrutiny as
  charge code — "read-only quoting" can still decide which checkout URL an agent sees as usable.** A
  rental-quoting sprint correctly scoped itself LOW ("the charge stays on the prior sprint's server rail,"
  no new charge code touched) — true, but the *response* still decided which payment options came back
  `available:true`, and the first pass left a date-blind fallback URL reachable exactly when a dated
  booking request had just been rejected (an agent could "succeed" at a one-unit mischarge for the dates
  it was just refused). Codex caught it on a green PR. The risk **tier** label describes how much money
  code changed, not how much the surrounding decision logic deserves review — don't let a LOW tier lower
  the bar on getting a second pass. *(2026-07-08, rental-backend-line-item-pricing S3.1.)*
- **To make a curated/explicit subset authoritative over a "freshest-N" read without un-static-ing an ISR
  page, fetch the subset via its own metadata filter and UNION it into the pool** (dedupe by id, degrade
  per-fetch), mirroring the route's existing filter convention. The homepage Selección showed admin pins
  only when they fell inside the freshest-24 pool; fix: a backend `?featured=true` read-filter (fetch-all →
  filter → paginate, so nothing is missed) + a frontend union into the cached pool seam. Two corollaries:
  **(1)** the union/filter wrappers must degrade on a *throw*, not just `!res.ok` — a network reject or
  malformed JSON would otherwise reject `Promise.all` and break the static prerender (wrap each fetch in
  try/catch → `[]`). **(2)** if a reviewer calls an in-memory filter "after pagination → results missed,"
  check the actual fetch shape first — if the route loads all rows then filters then paginates, it's
  correct; decline with the trace instead of patching. *(2026-06-25, seleccion-pins-authoritative S2.)*
- **VALIDATE-FIRST: confirm a live data source exists before scoping a signal/UI that displays it; if it
  doesn't, ship the static/degraded-but-honest version, defer the dynamic part, and write the gap into the
  PR — never invent the data.** The read-side mirror of "grep the route before scoping a backend story." In
  the PDP redesign this fired three times and saved three rabbit holes: no seller-rating source (shipped a
  static capsule, deferred the dynamic item), a paid-ticket QR not resolvable from the PDP read (shipped a
  link instead of an inline QR), and rentals needing seller coordination (generic checkout can't honor
  nights + deposit). Each gap was stated in the PR, not papered over — a UI that looks done but renders
  invented numbers is the failure mode this avoids. *(2026-06-21, pdp-redesign retro.)*
- **On a money/integration path, INSTRUMENT the failure before you patch it — a prior LEARNINGS note is a
  hypothesis to test, not a diagnosis.** A `catch` that maps every error to one benign empty state hides
  the fact you need; replace it with a classified, sanitized surface (`kind` + safe `type`/`code`/`param`)
  and let one real click name the bug. On the `miyagisan` mint, the tempting prior (the Stripe v22
  `promotion`-hash shape) was **wrong** — the real cause was a 46-char coupon `name` over Stripe's 40-char
  cap. Corollary — **distinguish credential failures from request failures**: `401` ⇒ key, `403` ⇒ scope,
  `invalid_request`/`param` ⇒ your params, not the key; lumping them as "unknown" nearly re-scoped the
  whole fix as a "creds fix." *(2026-06-23, domain-coupon-mint-fix.)*
  **Same discipline applies to a WRITE/agent path: trace the actual code path end-to-end before scoping
  "agents can do X," because two front doors that look equivalent may not be.** Scoping "agents buy N event
  tickets over UCP" assumed agent checkout issues tickets like the web buyer — but the **web** path is
  Medusa-cart-backed while the **agent** path builds a raw Stripe/MP session with no `cart_id`, hitting the
  webhook's legacy branch and issuing **0 tickets even at qty 1**. Re-scoped to surface parity
  (echo/clamp quantity) with issuance deferred, not silently built on sand. *(2026-06-22,
  events-quantity-selector S1.3.)*
  **Corollary — the same "two front doors, one aware / one not" split recurred with the SAME legacy raw
  Stripe/MP endpoints, this time as a MISCHARGE risk rather than a 0-issuance one.** Building rental-aware
  quoting for the UCP `checkout-session` endpoint surfaced that `/api/mp/checkout`/`/api/stripe/checkout`
  are a wholly separate rail from `/checkout`→`startCheckout`, with zero awareness of rental date/deposit
  math — they'd silently charge a bare one-unit rate on any rental listing that reached them, ignoring the
  date range entirely. Currently unreachable (no rental listing in prod yet) but a live landmine once one
  exists. When a listing type gains date/quantity-sensitive pricing, grep for **every** route that resolves
  a charge amount for that type — not just the primary rail the epic is building — before declaring the
  work done; a second "looks equivalent" checkout front door is a recurring shape in this codebase, not a
  one-off. *(2026-07-08, rental-backend-line-item-pricing S3.1.)*
- **An "is there room to push this further" classifier must compare against a reference STRICTLY on the
  far side of its own gate, or the math can never fire.** If the gate is "already at/above margin X" (a
  floor), the headroom check's reference target must be > X, never ≤ X — when the reference price is
  computed by a formula that's monotonic in the target (higher target margin ⇒ higher achievable price,
  same cost/fee), comparing against a target at-or-below the floor a row already clears means the
  reference price can never exceed the row's current price, so "is there headroom" is vacuously false
  100% of the time. Caught by writing the boundary unit tests for a NEW "underpriced" classifier before
  trusting its numbers — the first draft used a target margin of 25% while the gate itself required
  realized margin ≥ 40%. *(2026-07-06, profit-analyzer S2 — `classifyUnderpriced` in `lib/profit.ts`.)*
- **A cache keyed on a stable "rate" dimension still needs re-validation at the actual reference-input
  right before a money-affecting write, not just at whatever input triggered the cache fill.** Caching a
  fee RATE (percentage + fixed fee) by category/listing-type is fine for live/interactive UI feedback
  (a margin slider recomputing locally, no network call per tick) — but if the write that eventually
  happens targets a price far from the one the cache was warmed with, and the underlying rate can
  legitimately vary by price bracket, the cached number can silently mismatch the price actually being
  written. Fix: re-fetch fresh, ONE more time, at the specific candidate value, in the moment right
  before confirming the write — never inherit a cached estimate straight into a mutating action. Caught
  by a cross-agent (codex) review, not the unit suite (which only tested the pure math, not the
  cache-freshness assumption). *(2026-07-06, profit-analyzer S2 — the fee-estimate cache + `PricingCard`'s
  Apply flow.)*
- **A single-item MCP tool and the bulk-import engine it's supposed to reuse can silently diverge on
  field coverage — a schema/contract test alone won't catch it, only actually calling the tool does.**
  `create_listing` (single-listing MCP tool) and `catalog-import.ts`'s `stageRow()`/`validateRows()`
  (bulk-import engine) both existed and both "supported" autos vehicle-spec + financing/trust fields on
  paper, but `create_listing`'s handler built its internal `raw` object from a hand-maintained field
  list that predated those columns — so every car created via the agent tool silently landed with none
  of them (no facets, no $/mes, no inspection/warranty). This was found only by actually driving the
  demo-catalog dry-run against a real shop with a real agent token, not by reading the code or trusting
  the tool's own inputSchema. When a shared validator/engine gains a new field, grep every OTHER caller
  of it (not just the one you're actively extending) to confirm each caller's own field-forwarding list
  was updated too. *(2026-07-08, cars-vertical-tratocar-parity S3 — `handleCreateListing` in
  `app/api/ucp/mcp/route.ts`.)*
- **An MCP tool's declared `inputSchema`/description can under-document a capability the handler
  already implements — confirm with a real live call before writing new pass-through code.**
  `patch_store_configuration`'s `profile` block description didn't mention `theme_preset`/
  `announcement`/`hero` at all, but the handler forwards the *entire* `configuration` object
  unfiltered to `applyStoreConfig()` — so those fields already worked functionally the moment they were
  added elsewhere (own-shop-premium-presentation S1). A single `curl` round-trip against the real tool
  (not just reading the schema or the handler in isolation) distinguished "needs a doc fix" (extend the
  description) from "needs a code fix" (add new forwarding logic) — writing the latter when only the
  former was needed would have been pure duplication. *(2026-07-08, cars-vertical-tratocar-parity S3.)*
- **A shop with zero PUBLISHED listings won't render its own storefront dressing (hero/announcement/
  theme), and a platform's payment-method gate is correctly NOT agent-bypassable — budget "make it
  publicly visible" as a human step, not something an agent-populated demo can finish alone.** Creating
  10 demo products + a full OSPP config (theme/hero/announcement) via MCP on a fresh shop all persisted
  correctly (confirmed via `get_store_configuration`), but every physical listing landed `paused`
  because `listingActivationBlock`'s sale-readiness guardrail needs BOTH a delivery method AND a
  payment method configured, and payment is deliberately OAuth/manual-only with zero MCP path (as it
  should be — an agent token should never be able to touch payment credentials). With zero published
  listings, the shop page shows an honest empty state instead of the configured dressing. When planning
  an "agent populates a demo/test shop" story, the final "flip it publicly visible" step is a human
  action to name explicitly up front, not a gap to discover at the end. *(2026-07-08,
  cars-vertical-tratocar-parity S3.1.)*
- **A merged, CI-green Supabase migration is NOT evidence it was ever run against production — this
  repo applies migrations by hand (SQL editor/MCP), not via an automated `db push` in CI, so the gap is
  both easy to introduce and silent once introduced.** Discovered while applying Sprint 3's own
  `platform_announcements` migration: Sprint 1's `platform_copy_overrides` table (merged cleanly in PR
  #197, two days earlier) didn't exist live at all (`to_regclass('public.platform_copy_overrides')` →
  `null`, confirmed via the Supabase MCP). Because the whole copy-override read path is deliberately
  fail-open (missing table ≡ empty result ≡ "nothing overridden"), a never-created table produces
  **zero visible symptoms** — the feature just silently never did anything, in production, since it
  merged. **After any PR that ships a new Supabase migration, verify the table actually exists live**
  (`to_regclass` or `list_tables` via the Supabase MCP) as part of that PR's own smoke — a green CI run
  proves the code is correct, never that the DDL was applied to the real database.
  *(2026-07-09, admin-content-and-announcements S3.)*
- **A `<input type="datetime-local">` value carries NO timezone — converting it to a real ISO instant
  must happen in the BROWSER, not the server.** The browser's own `new Date(naiveString)` parse
  correctly uses the visitor's real local timezone (the thing you actually want), but a server-side
  `Date.parse()` of that same naive string is parsed in the SERVER's local timezone instead (UTC on
  Vercel) — silently shifting any schedule/date an admin outside UTC enters, by exactly their UTC
  offset. The bug produces a *valid*, differently-wrong ISO string, so nothing type-checks or throws —
  it was caught by a codex cross-review reasoning about the data flow, not by the local build or
  `tsc`. Fix: always convert client-side (`new Date(value).toISOString()`) before the value ever
  leaves the browser; never send the naive `datetime-local` string and let the server interpret it.
  *(2026-07-09, admin-content-and-announcements S3 — the `/admin/contenido` announcement scheduler.)*
- **A test named after a specific claim ("X is open/visible/true by default") can still pass without
  asserting that claim, if it only checks the properties that happen to sit on the same object.** A
  pure-logic spec titled "payments carries the '~4 min' estimate…" checked `.estimate`/`.body`/`.ctaHref`
  (static config, present regardless of state) but never checked `.open` — so it kept passing through a
  real resolution-order bug where payments *wasn't* actually the open step on a fresh shop, the exact
  behavior the test's own name claimed to cover. When a test's title makes a specific behavioral claim,
  assert that specific field explicitly, not just whichever properties are easiest to check on the same
  object — this is the same shape as the tariff-unit lesson above (a suite can look like it covers a
  claim while structurally never exercising it). *(2026-07-11, seller-portal-setup-guide B.1 — caught by
  the `pr-reviewer` subagent, fixed same-session.)*
- **An "extract this logic verbatim" refactor can silently break a lint/CI guard that's keyed on file
  PATH, not file content.** `lib/design-token-audit.ts`'s raw-hex-literal guard allowlists specific
  `(path, literal, contains)` triples — moving an allowlisted expression to a new file (same code, same
  line, new location) broke the guard even though nothing about the code itself changed, because the
  allowlist entry stayed pointed at the old path. A narrower per-story spec run (just the new file) didn't
  catch it; only a full `api`-project run did. Any code-MOVE refactor should grep for path-keyed config
  (lint allowlists, exclusion lists, `enforcedSweptPaths`-style sets) referencing the old path, not just
  run the specs for the new code. *(2026-07-11, seller-portal-setup-guide B.1.)*
- **"One step/item open at a time, first-incomplete-in-order" and "this specific step is always open when
  incomplete" read almost identically in prose, and a plan's one worked acceptance example can fail to
  distinguish them if that example happens to produce the same answer under both rules.** The epic doc's
  stated resolution rule ("payments open by default when incomplete") was correct the whole time; the
  first implementation defaulted to the simpler strict-order rule because the one acceptance example in
  the sprint doc (profile+payments-only) gives the same result either way. When a plan states a resolution
  rule for "one thing active/open/selected at a time" and a straightforward reading of "first in order"
  could diverge from it, work out a SECOND example by hand — one where the two rules actually disagree —
  before writing the code. *(2026-07-11, seller-portal-setup-guide B.1 — `getSetupSteps`'s payments
  escalation; caught in review, would have been cheaper caught before.)*
  **Corollary — a completion/"is X done" gate can read an opt-*out* column as if it were a connected-*state*
  flag, and both compile, type-check, and "look done" in a quick manual test.** The same `getSetupSteps`
  payments step later read `shop.mp_enabled` — a DB column that defaults `true` for EVERY shop
  (`mp_enabled BOOLEAN NOT NULL DEFAULT true`, a "seller hasn't disabled MP checkout" opt-out toggle, not
  "MP is connected") — so the step showed done for every fresh, never-connected shop since the column was
  introduced. It surfaced only because a later feature's acceptance ("the guide's payments step is checked
  after connecting") forced tracing what actually flips the flag. Before trusting an existing "is X
  configured/done" gate, read the underlying column's migration for what its *default* actually means — a
  boolean defaulting `true`/`false` for an unrelated reason (an opt-out toggle, a legacy default) is a
  different signal than "the feature was ever used," even when the column name suggests otherwise. Fixed
  to read the real connected-state field (`metadata.settings.mercadopago.connected`) the OAuth callback
  actually writes, with a regression-guard spec. *(2026-07-11, onboarding-three-doors S3.1.)*
- **A "make every case consistent" fix applied uniformly to every case in scope can regress the cases
  that were already correct.** Fixing "every sibling nav item renders identical text" (real, in
  namespaces where every section genuinely shares one page) by routing every namespace through the
  same generic label-humanizer also touched `sellerAcquisition`, which never had that bug — its
  per-section route labels were already curated and already distinct ("Vende — Autos", "Vende —
  Creadores"). The fix silently downgraded those to plain word-splits ("Autos"), caught by a
  cross-agent review pass, not the deterministic gate (both old and new labels are valid non-empty
  strings — nothing type-checks or asserts differently). The generalizable check: before extending a
  consistency fix to every case a symptom was observed in some of, ask which cases actually exhibit the
  symptom — a namespace whose route label already differentiates its own siblings doesn't need (and is
  actively hurt by) being routed through the same fallback that a genuinely-uniform namespace needs.
  *(2026-07-13, cms-contenido-restore-and-polish S4.)*

## Medusa gotchas
- **Product Collection is `belongsTo` (one per product); Product Category is `manyToMany` — picking the
  wrong one structurally fails a "belongs to several groups" acceptance, and don't guess which is which
  from the name.** Reading `@medusajs/product`'s installed model source directly (not documentation
  memory) settled it in plan mode, before any code — Category was the only primitive that could satisfy
  "a listing lives in multiple seller-defined collections" at all. *(2026-07-07, own-shop-premium-
  presentation S2 — seller-defined collections.)*
  **Corollary — a positional read on a to-many relationship (`arr[0]`) that "works" today because of an
  unstated cardinality assumption becomes a silent-failure landmine the moment a SECOND feature starts
  writing to that same relationship.** The app already derived "the" product category positionally
  (`categories?.[0]?.handle`) — correct only because every product had 0-or-1 category at the time.
  Attaching seller collections to the identical many-to-many pivot would have let `[0]` silently return
  a seller collection instead of the platform category, breaking the site's main category filter — caught
  in the SAME plan-mode source-read above, fixed as a standalone preliminary story (explicit
  platform-vs-collection split) that shipped *before* the feature that would have triggered it. When
  extending a data model another feature already reads positionally, grep for every `[0]`/`.first()`-style
  read on that relationship before assuming the existing code stays safe. *(2026-07-07, same sprint.)*
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
- **A seller-order-scoped write's ownership check must require the seller own EVERY item on the order
  (`.every()`), not just one (`.some()`) — even when a cart-construction invariant makes them equivalent
  today.** Several `resolveOrderForSeller`-shaped helpers (`tags`, `confirm-payment`, and a new `proof`
  route all copied the same pattern) checked `productIds.some(pid => sellerOwns(pid))` before allowing
  an order-level metadata write or payment capture — safe only because a cart can never mix sellers'
  items in this marketplace (enforced at cart-construction time on the frontend, not in these routes).
  Two independent cross-review passes flagged the same class of gap here: once as an outright bypass
  (the check was skipped ENTIRELY when `productIds.length === 0` — no resolvable product ids on the
  order), once as the `.some()`-vs-`.every()` distinction itself. Write it as `.every()` from the start
  — it's a no-op for every real order today, and it's the only version that stays correct if the
  cart-construction invariant it depends on ever weakens elsewhere in the codebase. Treat "ownership
  check on an order-level write" as a checklist item whenever copying an existing
  `resolveOrderForSeller`-shaped helper into a new route. *(2026-07-07, custom-print-products S4 —
  `proof`/`tags`/`confirm-payment` routes, caught across two Codex cross-review rounds.)*

## Architecture
- **A secret-auth internal route must fail CLOSED when its secret env is UNSET — and check idempotency
  BEFORE consuming a single-use credential.** Two money-route defects a cross-agent (Codex) pass caught on
  the launchpad coupon-mint path, both worth generalizing: (1) an `unauthorized()` that returns
  `!!expected && got !== expected` **authorizes everyone when `expected` is unset** — a coupon-minting
  route callable with no secret in a misconfigured env. Invert to `!expected || got !== expected` (missing
  secret ⇒ unauthorized). This shape was copy-pasted from an existing route, so grep siblings when you find
  one. (2) A verify-then-act flow that **consumes** a one-time code before the duplicate check burns a fresh
  code on every retry of an already-done action — do the cheap idempotency read (has this vote/row already
  landed?) *first*, and only spend the credential on a genuinely new write. Make internal mints idempotent
  by the **globally-unique business key** (the coupon code), not just a per-owner index, so a partial write
  (resource created, index append failed) is repaired on replay instead of stranding behind a permanent 409.
  *(2026-07-08, bookshop-launchpad S3.3 — /internal/launchpad-campaign-coupon + castVote.)*
- **A shared app shell can be dynamic for *routing*, not just auth — making a page static needs a route
  split, not just removing its `currentUser()`.** The marketplace homepage cold-started ~30s as a
  per-request Vercel function; dropping `currentUser()` was necessary but not sufficient, because the
  shared `layout.tsx`/chrome read `headers()` (channel detection) **and** Clerk's server `<Show>` calls
  `auth()`→`headers()` — either forces the whole subtree dynamic. Fix: a **route-group split** (header-free
  static `(site)` tree vs dynamic `(shell)`/white-label tree) + **client-gating** the auth-dependent chrome
  (a client `AuthShow`, defaulting signed-out). Diagnose *which* dynamic API traps a page with `export const
  dynamic = 'error'` — the build error names it. URLs/SEO stay byte-identical since route groups are
  URL-transparent. *(2026-06-22, marketplace-static-shell S1/S2.)*
- **Restore signed-in personalization on a static page as client islands hitting a Cloud Run endpoint —
  but the endpoint's CORS must allow the calling origin or the island silently degrades.** The island gets
  a Clerk JWT client-side, does one fetch (not a poll) to a JWT-verified read endpoint, rendering nothing
  during SSR/loading/error so the static page never blocks. Gotcha: CORS allowing only the **prod** origin
  silently degrades the island on any `*.vercel.app` preview — gate the strict "it hydrated" assertion
  behind an env flag for the prod run, keep CI lenient. A client island reading another service's wire JSON
  must also be defensive at the render boundary (guard `Intl.NumberFormat` against a bad currency code,
  `?? 0` numeric fields). *(2026-06-22, marketplace-static-shell S3/S4 — cross-review caught a
  stale-personalization leak on sign-out/account-switch: clear island state + add `userId` to effect deps.)*
- **To feed a static shell component per-page data, thread it through a client *context* island a server
  page renders — and make the unmount cleanup compare-and-clear, not a blind null.** Mount a tiny client
  `Context` provider in the layout; each server page renders a render-null `'use client'` setter that
  `useEffect`-sets the value, degrading to a URL/prop-only default when unset. The trap: a setter that does
  `setValue(null)` on unmount can erase the **next** page's value during a client nav (the new page's
  island can set before the old one's cleanup runs) — clear with a functional `setState` guarded on
  identity instead. *(2026-06-26, contextual-agent-handoff S2.)*
- **Client-side gating is how you add a site-wide third-party loader (GTM/analytics) without un-static-ing
  a static shell.** Mirror the server channel rule from `window.location` in a pure, unit-tested gate, and
  inject from a `useEffect` in a client island mounted in the static root layout — `next build` keeps `/`
  static; the loader still decides per host/path at runtime. A JS-only, env-gated side effect isn't
  coverable by the `api` gate — pair the pure decision (unit spec) + an SSR marker with an opt-in
  `*.browser.spec.ts` behind an env flag. *(2026-06-22, site-wide-analytics-gtm.)*
- **To make a static/ISR surface feel "alive" without un-static-ing it, seed a deterministic shuffle on the
  revalidate time-bucket — not per request.** A per-refresh shuffle needs a per-request function (forbidden on a
  static `○ /`), but a seed of `floor(now / REVALIDATE_MS)` (locked to the page's `revalidate` via the
  cache-policy SSOT) is **stable within a window** (the same prerendered HTML serves every visitor → no hydration
  mismatch) yet **rotates across windows**. Keep the PRNG (`mulberry32`) + Fisher–Yates `seededShuffle` **pure and
  non-mutating** in the next-free seam so the determinism is spec-proven (same seed ⇒ identical order; different
  buckets ⇒ different order; the fixed prefix — pins/admin order — never moves). Threading the seed is pure
  arithmetic on the `now` the page already computes, so **no page edit and no new dynamic API** — the static build
  is preserved. Scope nuance to settle at grooming: **"shuffle the pool" ≠ "reorder the visible N slots"** — the
  former surfaces a *different* (still in-window) subset each window (what "feels alive" needs), the latter shows
  the same items reordered; a cross-review will rightly flag the displacement, so the scope doc must say which.
  *(2026-06-23, homepage-seleccion-curation S3.1 — `windowSeed`/`seededShuffle` in `lib/home-curation.ts`; codex
  flagged shuffle-before-slice, declined because the grooming doc said shuffle the unpinned *pool*.)*
- **Co-locate compute and its database — a cross-cloud DB is a metered egress tax + a fragility, not just a
  latency footnote.** A Neon "near the 5 GB/mo egress cap" alert fired with **zero traffic for a week**: the
  cause wasn't shoppers or backups but the split itself — compute on **GCP** (Cloud Run us-east4), Postgres on
  **Neon/AWS** us-east-1, and an always-on `min=1` backend whose background loops + `/health` probes kept the
  cross-cloud link ~84% active, every query result metered AWS→GCP over the public internet. **"No traffic" ≠
  "no egress" — the always-on backend *is* the traffic.** The fix was architectural, not a knob: move Postgres
  onto **Cloud SQL** (same region, **private IP** on the existing VPC via the connector Redis already used) so
  DB traffic is intra-VPC + unmetered — which *also* let the backend stay `min=1` (warm), making the originally-
  proposed `minScale:0` symptom-treatment unnecessary. Intra-cloud private networking is impossible across
  clouds, so before reaching for read-caching / scale-to-zero to dodge an egress bill, **check whether compute
  and DB are even in the same cloud** — relocation may delete the problem at the root (and for a 43 MB DB, the
  serverless/branching value props don't justify the cross-cloud tax). *(2026-06-22, postgres-neon-to-cloudsql —
  3 sprints; supersedes the neon-egress spike's "keep on Neon + idle the backend" call.)*
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
  reaching for Supabase/custom routes — Personalized Products shipped with zero new tables (field
  definitions on product metadata, buyer payload on line-item metadata); custom-slugs was a 1-field backend
  change (slug already `unique()` on the seller). **Read the backend model + route first — it often
  re-scopes the epic smaller.** Discovery Polish #3c is the limit case: the backend already filtered
  `listing_type` end-to-end, so the planned "merge backend first" sprint evaporated and the epic shipped
  frontend-only. *(2026-06-08.)* **Corollary — a planned HIGH-risk migration story may already be shipped;
  check the live schema + write path before authoring it.** Homepage-polish-b S4.4 was scoped as a DB
  migration; a five-minute check showed the column + write path already existed and every row was
  populated — collapsing the story to verify-and-document, LOW not HIGH. For any additive-column/backfill
  story, `git show` the table's migration + grep the write route, and confirm against the live DB before
  treating it as unbuilt. *(2026-06-12, homepage-polish-b S4.4.)* **The mirror failure mode: a doc that
  calls a migration "rollout pending" when it's already applied.** Neighborhood-pulse's README claimed a
  migration "hadn't been run" when a live-Supabase check showed the column already present and in use —
  audit the live schema before believing (or re-opening) work a doc calls pending. *(2026-06-13,
  neighborhood-pulse audit.)*
- **Fix the call the *user* awaits, not the lib the plan named — a proxy makes the named module a red
  herring.** The plan said "time out `lib/envia.ts quoteShipments`," but tracing importers showed that
  frontend lib only feeds the *seller* ship route; the *buyer's* quote is a
  `fetch('/api/checkout/shipping-rates')` that proxies to the backend, which runs its own carrier loop. So
  the buyer-facing timeout belongs on **that fetch in the component**, not the lib the spec pointed at —
  timing out `lib/envia.ts` would have shipped a no-op against the actual hang. Before wiring a fix to a
  file a plan names, `grep -rl` its importers and confirm it's on the path the user actually exercises.
  *(2026-06-09, delivery-money-polish S3 — quote timeout in `CheckoutExperience`, pure `lib/fetch-timeout.ts`.
  Reconfirmed 2026-06-26, envia-killswitch S1.4: the same pre-build importer trace surfaced a SECOND ungated
  seam — the legacy seller ship route calling `lib/envia.ts` directly — which became its own gated story
  instead of shipping a kill-switch with a live bypass.)*
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
  **Corollary — when a SECOND, independent gate already blocks the outcome a first gate exists to
  prevent, recognize the first gate is redundant for that case rather than layering more state to
  satisfy it.** The shared listing-activation gate (no delivery/payment config ⇒ force-draft) exists so
  no buyer hits a live listing they can't check out on — but a promoter-created shop is always
  *unclaimed*, and `isShopClaimed()` already blocks checkout entirely regardless of publish status.
  Skipping the redundant gate specifically for the unclaimed-shop case (never touching it for claimed
  self-serve shops, where it still matters) let a promoter's listing publish immediately instead of
  needing an invented delivery/payment stub just to satisfy an already-moot check. Before adding state to
  satisfy a gate, check whether a DIFFERENT existing gate already makes it a no-op for your specific case.
  *(2026-07-03, promoter-funnel-v2 S5.)*
- **A lifecycle/state machine lives best as a pure, next-free `lib/` helper** (derivation + transition
  guards + copy), mirrored once in the backend normalizer for agents — a pure-logic spec proves invariants
  for free (e.g. an illegal transition like `pending_payment → processing` is rejected by the guard).
  *(2026-06-07, checkout-state-hardening.)* **A one-time redemption (door check-in / single-use ticket) is
  the same shape:** a pure token+redemption state machine makes double-redeem an illegal transition, and
  the server gates **every** mutation that reaches the redeemed state, not just the named scan route.
  *(2026-06-08, events-and-ticketing S3.)*
  **Per-UNIT issuance keys idempotency on the per-unit subject, never the line_item_id.** "Issue one token
  per admission for a quantity-N line item" looks like a loop, but all N units share one `line_item_id`, so
  a `line_item_id`-keyed dedupe collapses N→1 on replay. Key on `${line_item_id}#${k}` and reuse a matched
  unit verbatim so a redeemed ticket survives re-issue. This is load-bearing because `issue` is re-called
  by the reconcile-checkouts cron AND both payment webhooks, so "exactly N on replay, no dupes" is the
  whole correctness story — extract it to a pure seam and prove it (1→1, 3→3, replay→3, redeemed-survives,
  legacy→1). *(2026-06-22, events-quantity-selector S1.1.)*
  **Scope a new buy-N / quantity feature to its listing TYPE at the server clamp seam — or it leaks into
  every commerce path.** The PDP only renders the event stepper for events, but the *enforcement* must live
  where quantity is honored (checkout + the UCP route): without it, a crafted `?qty=N` buys N of **any**
  listing once the flag is on. Gate the clamp on the type detector, not the UI. And guard the
  **untracked-inventory edge** — `available == null` returning `MAX_SAFE_INTEGER` invites money-math
  overflow; cap it. *(2026-06-22, events-quantity-selector S1.2.)*
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
- **The flag layer — `isEnabled('...')` in BOTH apps' `lib/flags.ts` — is fail-open by contract, whatever
  backs it.** A hardcoded `DEFAULT_FLAGS` + an `isEnabled` that never throws means a feature stays on if the
  store is down/absent; build any client at **module load** (no init race / leaked poll timer) and **bound
  its refresh/timeout** explicitly (the original Flagsmith SDK's 3-retries×10s default was fatal on a hot
  path — any store needs the same explicit cap). Enforce at the **single source of truth** (e.g.
  `resolveSellerPaymentMethods`) so UI + agents/UCP + checkout are covered at once, and keep the reader
  **Node-only** — `middleware.ts` runs on the Node runtime specifically so it can read a flag (the subdomain
  paywall), so don't assume Edge compatibility. *(2026-06-06, Flagsmith epic — `checkout.stripe_enabled`
  shipped front+back.)* **Superseded 2026-07-01** — the backend is now Supabase `platform_flags` (60s
  in-process cache) behind the *same* `isEnabled()` interface; see `feature-flags-inhouse`. Every principle
  above carried over unchanged; only the store moved.
  **Two flag polarities — pick the fail-open DEFAULT to match.** A **kill-switch** defaults `true` (feature
  stays on if the store is down; disabling is the deliberate act). An **enablement** flag (e.g.
  `domain.paywall_enabled`) defaults `false` ⇒ **ungated** (a store outage can never trap users behind a new
  gate; enabling is the deliberate act). Comment the polarity in `DEFAULT_FLAGS`. **And a flag defined in
  code is invisible until you CREATE it in the store** — absent ⇒ every read returns the code default, so
  there's nothing to toggle until you add it (create it disabled in every environment, then flip when
  ready). *(2026-06-11, custom-domain-paywall — the flag existed in code for days but Daniel "didn't see it"
  until it was created.)*
- **Extract a fan-out seam once, then project new events onto it.** A fire-and-forget
  `dispatchToSeller(userId, {group, email?, push?, telegram?})` over a pure preference resolver made adding
  a new money-path event later one line in the event→group map + one route call — every channel + the
  settings UI came for free. Defaults de-risk a HIGH surface: email/push default-on (no regression), a new
  realtime channel (Telegram) opt-in default-off (no flood). *(2026-06-07, Granular Notifications —
  `lib/notifications/{dispatch,preferences}.ts`.)*
  **The same seam projects onto a second *audience*, not just new events** — a sibling `dispatchToBuyer`
  reused the resolver/tables/webhook/grid wholesale because prefs are keyed by **person, not role**.
  Audience-namespace the keys (`buyer.*` event_group values in the same table, no new column); a guest
  fall-through (no resolvable user id ⇒ transactional email only) keeps routing additive; one shared
  `telegram_links` row per person drives a per-audience unlink derived from prefs so neither side's
  disconnect kills the other. *(2026-06-07, Buyer Notifications #5b.)*
- **Notify the *recipient*, not the actor — and resolve them from the data, not the session.** A
  buyer-authed route still has to ping the *seller*: resolve the seller from the order itself, best-effort,
  durable write + admin nudge unaffected if it fails. Corollary: **"complete the lifecycle" ≠ "notify on
  every transition"** — a seller-self-triggered event (payment_confirmed/ship/deliver) notifying the seller
  of their own click is noise; wire only the genuinely buyer-/system-triggered events. *(2026-06-07,
  Granular Notifications S3.)*
  **But check the recipient id is actually *in* the data before assuming a seam can gate.** Buyer
  notifications gate fine for offers + legacy orders, but for **Medusa orders the buyer's Clerk id is
  unrecoverable frontend-side** (the normalizer/mirror don't persist it) — so seller-triggered routes hit
  the guest fall-through and send email only for Medusa orders. No regression, but the feature silently
  doesn't bite on the majority order type until a backend fix. Grep the normalizer + mirror for the id
  before scoping a recipient-gated feature. *(2026-06-07, Buyer Notifications #5b.)*
- **Match the codebase's real i18n reality before writing translations — and don't globalize it.** The
  seller portal + notifications are hardcoded es-MX, so `en` keys there are dead code — but the app isn't
  English-free: `locales/{es,en}.json` is a ~119-key bilingual dictionary feeding a **bilingual allow-list**
  (`app/terminos`, the sweepstakes public flow, the embed widget). The rule is **es-MX default + a defined
  bilingual allow-list** (AGENTS rule #5), not "es-MX everywhere, no en.json." *(2026-06-08 — corrected
  after a drift audit caught an over-generalized rule.)* Grep the dictionary's actual consumers first, and
  make the "bilingual" gate a copy-completeness check (every group non-empty, no orphans). *(2026-06-07.)*
  **For an AGENT-facing surface with a global audience, one relay directive beats N locales.** es-MX
  canonical + en lingua-franca, then every agent-facing payload carries a short "present this to the user
  in their own language" instruction — the reading agent is the localization layer. Hold it as one constant
  in a pure seam so every surface renders it identically (keep the phrase apostrophe-free so it survives
  HTML escaping). *(2026-06-09, agent-readable about surface — `RELAY_LANGUAGE_DIRECTIVE`.)* Reuse the
  constant verbatim on a second surface rather than re-paraphrasing it. *(2026-06-09, agent-native setup S3.)*
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
  no-card renewal end with **zero new lapse code**. Apply `if_required` **only on the discounted path** so
  full-price checkout still collects a card. And **Stripe's own `max_redemptions` is the authoritative
  cap** — a coupon capped at N refuses the (N+1)th server-side even under a race; a pure app-side pre-check
  is only for a clean message, never the guarantee. *(2026-06-11, custom-domain-paywall S3 — coupon
  `miyagisan`.)*
- **A new billing INTERVAL (monthly beside yearly) on a subscription SKU is a second Stripe price on the SAME
  plan — never a second plan row.** One plan keeps the entitlement read simple (still lists by one
  `plan_id`) and makes a cadence **switch** a `stripe.subscriptions.update` price-swap on the same
  subscription (proration ⇒ no double charge; same `stripe_subscription_id` ⇒ no entitlement gap; no Medusa
  row rewrite). Store the alt price where the plan-by-kind reader already looks, and in the activation
  webhook resolve the plan **by kind**, NOT by `by-stripe-price` — a monthly-priced subscription's price ≠
  the plan's column, so it would miss the shared lookup. Before scoping a new cadence, grep the reuse
  target: if the webhook + entitlement seam are already interval-agnostic, "reuse the lapse logic" needs
  zero code — the whole sprint becomes a price + the switch. *(2026-07-01, subdomain-pricing S3 — `metadata.monthly_stripe_price_id` on the one
  `subdomain_plan`; `lib/subdomain-switch.ts`; webhook `handleSubdomainSubscriptionComplete` resolves by kind.)*
- **A content-lock ("don't let X edit this field") is a UI concern, not a data one — keep the underlying
  pure setter usable on any record.** A merchant-ad style setter stayed unaware of the record's provenance
  (`source.type`); the lock is enforced only in the one editor component that reads it, so a future caller
  (a bulk tool, a different screen) isn't blocked by a rule that belongs to a single screen. Push the
  "who's allowed to see this control" decision to the render layer, not into the data-mutation function.
  *(2026-07-03, zine-editing-central S3.2 — `setAdSlotStyle` vs `isContentLocked`.)*
- **A conversation-to-domain-object link scoped narrower than 1:1 must repoint to the LATEST linked
  object on every use, never pin to the first.** A buy-now (non-negotiated) purchase gets no `offer_id`
  at all, so a durable `medusa_order_id` column on the conversation was the only way its ledger/proof
  state could resolve — but the first design ("stamp once, never overwrite") breaks the instant a
  SECOND order reuses that same `(buyer, listing)` conversation (exactly what a reorder feature
  enables), permanently showing the first order's state instead of the current one's. Caught by
  cross-review before merge; the fix is "always repoint on write," not "stamp once." Before shipping
  any conversation/thread → order/domain-object link that isn't guaranteed 1:1, ask "what happens on
  the SECOND link-worthy event," not just the first. *(2026-07-07, custom-print-products S4 —
  `lib/conversations.ts`'s `findOrCreateConversation`, feeding the transaction ledger's
  `medusa_order_id` fallback resolution.)*
- **A scope doc's literal phrasing ("wrap the EXISTING settings page in a wizard shell") can describe the
  wrong architecture when a page it names is also read by users OUTSIDE the flow being designed — check
  who else uses that page before building to the literal wording.** Taken at face value, "wrap
  `settings/pagos`" would have made the flat, general-purpose payments settings panel itself conditionally
  wizard-shaped — forcing a returning seller who already has payments configured through a first-run-shaped
  flow just to tweak an unrelated field (escrow mode, a SPEI CLABE). A NEW dedicated route (confirmed as a
  design decision before building, not assumed) kept the existing page's behavior for ongoing management
  completely untouched, while still satisfying every acceptance criterion the scope doc actually named.
  When a scope doc's literal reading would change behavior for users outside the feature being built, that
  divergence is worth a real check-in, not a quiet assumption either way. *(2026-07-11,
  onboarding-three-doors S3.1 — the cobros mini-wizard vs. `/shop/manage/settings/pagos`.)*
  **Corollary — an existing inline action can quietly own the exact completion flag your new surface is
  about to duplicate; grep for the flag's OTHER writers before wiring your own.** A dashboard guide card's
  `comparte` step already had its own inline share handler (native share/clipboard) marking
  `settings.guide.share_done`, undocumented in the epic's own scope docs — found only by reading the actual
  consumer of the CTA `href` being rewired, not just the string itself. Left unchecked, a new dedicated
  share page would have either duplicated the completion-marking write or left the old inline handler as a
  now-redundant, silently-competing path. Before pointing an existing step's CTA at a new surface, grep for
  every other place that already writes the flag that step's "done" state depends on. *(2026-07-11,
  onboarding-three-doors S3.2 — `SetupGuideCard.tsx`'s retired `handleShare` vs. the new Comparte page.)*

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
- **Model tiers are now named, with an escalate-don't-guess guardrail — one SSOT, don't fork a second
  trigger list.** `WAYS-OF-WORKING.md` → *Conventions → Model tiers* names **Opus 4.8** for
  planning/grooming/spikes/plan-mode/review and **Sonnet 5** for per-story execution, and the per-sprint
  kickoff template (`skills/groom/SKILL.md` Stage 8) carries the same rule to every build session: **stop and
  ask / hand back to Opus, don't guess**, on the same triggers as the high-risk tier (payments / checkout /
  fulfillment / auth / DB migrations / shared infra / money) **plus** plan ambiguity, a decision the plan
  doesn't cover, or 2+ failed attempts at the same problem. Default to escalate when unsure. The trigger list
  is defined once, in WAYS-OF-WORKING; SKILL.md's Model-tiers note and the kickoff prompt both cross-reference
  it rather than duplicating it — if you ever need to change the list, WAYS-OF-WORKING is the only place to
  edit. The behavioral acceptance signal (a fresh Sonnet-5 session actually escalating on an ambiguous story)
  can't be self-certified by the session that writes the docs — it's a standing owed-to-Daniel smoke, not a
  one-time close item. *(2026-07-01, model-split-sonnet5-execution S1 — PR #47.)*
  **Reconfirmed on a non-money-path judgment call: report the honest result and ask, rather than silently
  declaring "done" or guessing how aggressive to be.** A LEARNINGS de-noise pass initially found real
  staleness but almost no true duplication — size barely moved. Rather than either stopping there (not
  meeting the epic's "measurably smaller" signal) or unilaterally deciding how much detail to trade for
  size, surfacing the tradeoff let Daniel pick the aggressiveness. Escalate-don't-guess isn't only for the
  high-risk-tier triggers; it's also for "the plan doesn't specify how far to push a judgment call."
  *(2026-07-02, doc-hygiene-learnings-sweep S1.1.)*

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
- **Shell gotcha (2026-06-05):** don't name a zsh loop var `UID` — it's read-only ("operation not
  permitted"); hit this bulk-deleting orphan Clerk test users via `clerk api /users/<id> -X DELETE --app
  <id> --instance <prod|dev> --yes`.
