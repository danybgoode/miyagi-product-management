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

**Status (re-derived docs-first every run):**
- **Sprint** — reads the sprint's `**Status:**` line first (controlled vocab: ⬜ Planned · 🏗 In progress ·
  🟦 In review · ✅ Shipped), else falls back to counting story ✅ ticks. *Tip: the "Wrap S\<n>" step
  (`Roadmap/SESSION-KICKOFFS.md` §7) should set that line — it keeps this projection trivially reliable.*
- **Epic** — rolled up from its sprints (all Shipped ⇒ Shipped · any active ⇒ In progress · all Planned ⇒
  Scaffolded), corroborated by a **dated** `RETROSPECTIVE.md` ship-marker for closed epics.
- **Seed** — its frontmatter `status`.

**Notion schema this expects:** Status options `Raw · Ready · Queued · Planned · Scaffolded · In progress ·
In review · Shipped · Archived`; Grain options `Epic · Sprint · Seed`; an **Epic** relation property
(Sprint → Epic, self-relation). Add these once before the first sprint-grain `--sync`.

`NOTION_TOKEN` is a Notion internal-integration token with access to the database (share the DB with
the integration). Zero npm deps — Node 18+ (uses global `fetch`).

**Scheduled:** `.github/workflows/notion-sync.yml` runs `--sync` nightly (08:00 UTC ≈ 02:00 CDMX) +
on `workflow_dispatch`. It needs the `NOTION_TOKEN` repo secret (`gh secret set NOTION_TOKEN`);
`NOTION_DB_ID` is optional (the Marketplace Roadmap id above is the workflow default).

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
# Print Codex's findings without posting (safe to trial):
node scripts/cross-review.mjs <PR#> --agent codex --dry-run

# Post the advisory comment:
node scripts/cross-review.mjs <PR#> --agent codex

# A/B with Antigravity:
node scripts/cross-review.mjs <PR#> --agent antigravity

# Target a different repo than the current directory (e.g. the app repo):
node scripts/cross-review.mjs <PR#> --agent codex --repo danybgoode/miyagisanchezcommerce
```

**Flags:** `--agent codex|antigravity` (default codex) · `--repo owner/repo` · `--dry-run` (alias
`--no-comment`) · `--help`. **Dependencies:** `gh` (authed), plus `codex` for `--agent codex` and `agy`
for `--agent antigravity` — each degrades with a clear, fix-naming message if missing/unauthed. `agy` is
pinned to **1.0.7** (it has no `--output-format json`; the script uses text output and **warns** on a
version mismatch). The shared reviewer prompt lives in [`cross-review.prompt.md`](./cross-review.prompt.md)
— the single source both this command and a human reviewer read. Zero npm deps — Node 18+.
