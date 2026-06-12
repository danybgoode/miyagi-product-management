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
