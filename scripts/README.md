# scripts/

Repo-root tooling for the product/orchestration layer.

## roadmap-to-notion.mjs — one-way docs → Notion projection

Projects the `Roadmap/` docs into the **Marketplace Roadmap** Notion database. Docs are the only
source of truth; the board is a rebuilt projection (board edits are overwritten each run).

- DB: https://app.notion.com/p/eb68a1fd05f443b184b6b5b3db89f47e
- `NOTION_DB_ID` = `eb68a1fd05f443b184b6b5b3db89f47e`

```bash
# Inspect what would be projected (no Notion needed — the testable core):
node scripts/roadmap-to-notion.mjs --extract | less

# Push to Notion (upsert by Slug; rows missing from docs become Archived, never deleted):
NOTION_TOKEN=secret_xxx NOTION_DB_ID=eb68a1fd05f443b184b6b5b3db89f47e \
  node scripts/roadmap-to-notion.mjs --sync
```

**Rows — three grains (full funnel):**
- **Epic** — one per epic folder under `Roadmap/<NN-macro>/<slug>/` (has a `README.md`).
- **Sprint** — one per `sprint-N.md` inside an epic, linked to its Epic via the **Epic** relation property.
- **Seed** — one per seed in `Roadmap/00-ideas/seeds/` whose frontmatter `epic:` is null (un-scaffolded funnel).

**Status (docs-first every run):**
- **Epic — the SSOT is the epic README's frontmatter `status:`** (`scaffolded | in-progress | shipped |
  archived`, set at epic close). The sprint/retro derivation (all Shipped ⇒ Shipped · any active ⇒ In
  progress · all Planned ⇒ Scaffolded, corroborated by a **dated** `RETROSPECTIVE.md`) is kept only as a
  **fallback** when the field is absent, and is also emitted as `status_derived` so the board can flag an
  advisory drift when the two disagree.
- **Sprint** — reads the sprint's `Status:` line first (bold or plain; controlled vocab: ⬜ Planned · 🏗 In
  progress · 🟦 In review · ✅ Shipped), else counts story headings (`## US-1` / `### Story 1.1` / `C.1` /
  `B1.1`) and their ✅ ticks.
- **Seed** — its frontmatter `status` (only seeds with `epic: null` produce a row — the un-scaffolded funnel;
  once `epic:` is set the seed is funnel-only and the epic README frontmatter owns status).

**Notion schema this expects:** Status options `Raw · Ready · Queued · Planned · Scaffolded · In progress ·
In review · Shipped · Archived`; Grain options `Epic · Sprint · Seed`; an **Epic** relation property
(Sprint → Epic, self-relation). Add these once before the first sprint-grain `--sync`.

`NOTION_TOKEN` is a Notion internal-integration token with access to the database (share the DB with
the integration). Zero npm deps — Node 18+ (uses global `fetch`).

**Scheduled:** `.github/workflows/notion-sync.yml` runs `--sync` nightly (08:00 UTC ≈ 02:00 CDMX) +
on `workflow_dispatch`. It needs the `NOTION_TOKEN` repo secret (`gh secret set NOTION_TOKEN`);
`NOTION_DB_ID` is optional (the Marketplace Roadmap id above is the workflow default).

## build-order.mjs — generate the in-repo status board

Renders `Roadmap/00-ideas/BUILD-ORDER.md` from the **same projection** the Notion sync reads
(`roadmap-to-notion.mjs --extract`). The board is a **generated view** — never hand-edit it. Status
SSOT = each epic README's frontmatter `status:` (seed frontmatter owns only the un-scaffolded funnel);
the board groups epics by bucket and lists the funnel, plus an advisory **frontmatter-vs-derived** drift
section when a close-out forgot to set the field.

```bash
node scripts/build-order.mjs          # regenerate Roadmap/00-ideas/BUILD-ORDER.md
node scripts/build-order.mjs --check  # exit 1 if the committed board is stale (CI / pre-commit)
```

**Scheduled/guarded:** `.github/workflows/build-order-guard.yml` runs `--check` on push-to-main + PRs
touching `Roadmap/**` or the scripts (fails if the board is stale). Opt-in local mirror:
`git config core.hooksPath .githooks`. Zero npm deps — Node 18+.

## vercel-env.mjs — set + verify Vercel env vars via the REST API

Sets/verifies env vars on the `miyagisanchez` Vercel project **via the REST API, never the CLI** —
`vercel env add` silently stores EMPTY values, and `vercel env pull` redacts everything so it can't
verify either (LEARNINGS → Tooling gotchas). Update = DELETE then POST (PATCH is unreliable); verify
reads the value back through the single-entry endpoint (the only one that decrypts) and confirms by
**value length**, so the secret is never echoed.

```bash
# Set (default: all three targets; --env repeatable/comma-separated):
VERCEL_API_TOKEN=… VERCEL_PROJECT_ID=… \
  node scripts/vercel-env.mjs set MY_KEY "the-value" --env production,preview

# Verify — round-trips the stored length (fails loudly on an empty value):
node scripts/vercel-env.mjs verify MY_KEY

# Remove (optionally scoped by --env):
node scripts/vercel-env.mjs delete MY_KEY
```

**Env:** `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` required; `VERCEL_TEAM_ID` optional (tokens are
team-aware — a team-owned project needs `?teamId=`). Zero npm deps — Node 18+ (global `fetch`).

## vercel-prune-previews.mjs — delete stale Vercel preview deployments

Vercel retains **every** deployment forever, so deleting a merged git branch leaves its preview
deployments lingering as clutter (dozens accumulate). This prunes them — **production deployments are
never touched** (they're your rollback history). Pair it with branch cleanup: delete merged branches →
prune their previews. Dry-run by default.

```bash
node scripts/vercel-prune-previews.mjs                          # DRY-RUN: list previews that would go
node scripts/vercel-prune-previews.mjs --apply                 # delete them
node scripts/vercel-prune-previews.mjs --age 7 --apply         # only previews older than 7 days
node scripts/vercel-prune-previews.mjs --keep-branch feat/x --apply   # protect an OPEN-PR branch's preview
node scripts/vercel-prune-previews.mjs --project despachobonsai-vercel --apply
```

**Always `--keep-branch` any branch with an open PR** (its preview is the live review target), or run
after that PR merges. **Token:** `VERCEL_API_TOKEN`/`VERCEL_TOKEN` env, else the local `vercel login`
(reads the CLI `auth.json`); team auto-detected (`VERCEL_TEAM_ID` to override). Zero npm deps — Node 18+.

## flags.mjs — manage Flagsmith flags via the Admin API

Convenience tool over the Flagsmith Admin API (SaaS project `miyagisanchezmarketplace`, id 39767) —
it does **not** auto-flag epics or gate anything. It exists because a flag defined only in code
(`lib/flags.ts DEFAULT_FLAGS`) is **invisible in the dashboard until created via the API**
(LEARNINGS, custom-domain-paywall). `create` makes the flag at **project level**, so it appears in
**every environment** immediately and is toggleable in the dashboard from minute one.

```bash
node scripts/flags.mjs list                                  # features × environments grid
node scripts/flags.mjs create my.kill_switch --on            # kill-switch ⇒ default ON (fail-open)
node scripts/flags.mjs create my.new_gate --off              # enablement ⇒ default OFF (never traps users)
node scripts/flags.mjs flip my.new_gate --on --env Production  # --env omitted ⇒ flips ALL envs
node scripts/flags.mjs delete my.new_gate
```

**Polarity rule (baked into `--help` + the create output):** a **kill-switch** defaults **ON**
(disabling is the deliberate act); an **enablement** flag defaults **OFF** (a flag outage can never
trap users behind a new gate). Mirror the default in `lib/flags.ts DEFAULT_FLAGS` with a polarity
comment. Both project environments use **v2 feature versioning**, so `flip` writes via the
create-version → patch → publish flow (handled automatically; legacy envs get a direct PATCH).

**Env:** `FLAGSMITH_ADMIN_API_TOKEN` required (staged in `apps/miyagisanchez/.env.local`);
`FLAGSMITH_PROJECT_ID` optional (default `39767`). Zero npm deps — Node 18+ (global `fetch`).

## cross-review.mjs — advisory cross-agent second opinion on a PR

Pipes a PR diff into a **different model family's** CLI (Codex or Antigravity) for one pass and posts the
findings as a clearly-labeled, **non-authoritative** PR comment. It exists to catch a same-family
reviewer's blind spots — **suggested on HIGH-risk PRs, optional on any, advisory only**: it never gates,
blocks, or authorizes a merge (CI + the Claude reviewer + the risk-tier rule stay authoritative), and it
is **single-pass** (no debate loop).

```bash
# Review the open PR for the CURRENT branch (PR# is optional — resolved via `gh pr view`):
node scripts/cross-review.mjs --agent codex --dry-run

# Print a specific PR's findings without posting (safe to trial):
node scripts/cross-review.mjs <PR#> --agent codex --dry-run

# Post the advisory comment:
node scripts/cross-review.mjs <PR#> --agent codex

# A/B with Antigravity:
node scripts/cross-review.mjs <PR#> --agent antigravity

# Target a different repo than the current directory (e.g. the app repo):
node scripts/cross-review.mjs <PR#> --agent codex --repo danybgoode/miyagisanchezcommerce
```

**Right diff on the first run (no wrong-branch tax).** With **no `<PR#>`** the command resolves the open PR
for the **current branch** (`gh pr view --json number,state,headRefName,headRefOid`) and then **refuses a
stale diff**: if your local `git rev-parse HEAD` differs from the PR's head SHA it stops with
`local HEAD … differs from PR #N head … — push first, or pass --force`. A branch with **no open PR** (incl. a
reused branch name whose PR already **merged**) fails with a clear `no open PR for branch \`…\`` message —
never a stack trace. Pass `--force` to review the resolved PR despite a stale HEAD, or an explicit `<PR#>`
to skip resolution **and** the guard entirely (the deliberate escape hatch). The resolver + guard live in
the shared rail `scripts/lib/cross-agent-cli.mjs` (covered by its `node:test`); they're available to
`cross-panel.mjs` from the same module, though it reviews a scope-doc file and so has no PR to resolve.

**Flags:** `--agent codex|antigravity` (default codex) · `--repo owner/repo` · `--force` · `--dry-run`
(alias `--no-comment`) · `--help`. `<PR#>` is optional (omit → current branch). **Dependencies:** `gh`
(authed), plus `codex` for `--agent codex` and `agy`
for `--agent antigravity` — each degrades with a clear, fix-naming message if missing/unauthed. `agy` is
pinned to **1.0.16** and the version check **fails loudly** on a mismatch (a silent warn is what let the
1.0.7→1.0.10 print-contract change ship empty reviews; re-verified against 1.0.16 on 2026-07-03 — no further
contract break, see `cross-agent-cli.mjs` for what changed). The invocation is
`agy -p "<prompt+diff>" --model "<MODEL>"`: `--print` emits **nothing** without an explicit `--model`,
and it *also* emits nothing (exit 0!) when the model is **quota-exhausted** (`RESOURCE_EXHAUSTED 429`) — the
error only lands in agy's log. So the script passes a model and treats empty output as a failure. The default
is **`Gemini 3.1 Pro (High)`** (a different family from *both* the Claude host and the GPT-family Codex), with
an **auto-fallback to `GPT-OSS 120B (Medium)`** (a separate quota pool) when Gemini's tight per-subscription
quota is exhausted — the substitution is announced on stderr. Override either via **`AGY_MODEL`** /
**`AGY_FALLBACK_MODEL`**. The shared reviewer prompt lives in [`cross-review.prompt.md`](./cross-review.prompt.md)
— the single source both this command and a human reviewer read. Zero npm deps — Node 18+.

### Restoring a lapsed Codex token (auto-fallback to Antigravity)

The Codex CLI's token expires periodically. **You don't have to stop:** when `--agent codex` hits a dead
token, `cross-review.mjs` automatically falls back to Antigravity for that run — the comment is headed
`🔎 Cross-agent review (Antigravity — Codex unavailable)` and stderr prints
`⚠ Codex unavailable (token revoked) → falling back to Antigravity. Restore: codex login.` (The fallback
needs `agy` present; if both are unavailable it exits with a one-line message naming both fixes.) The
fallback fires **only on the auth signal** — a non-auth error or an empty diff still fails clearly.

**Detect** a dead token:

```bash
codex exec "ping" </dev/null
# Authed   → a clean reply, exit 0.
# Lapsed   → exit 1, stderr like "Your session has ended. Please log in again."
#            / "your refresh token was revoked" / "401 Unauthorized: refresh_token_invalidated".
```

**Restore** it (interactive, opens a browser):

```bash
codex login
```

Then re-run cross-review with `--agent codex` and the header will read `(Codex)` again. Nothing else needs
resetting — the fallback is per-invocation, not a persisted mode.
