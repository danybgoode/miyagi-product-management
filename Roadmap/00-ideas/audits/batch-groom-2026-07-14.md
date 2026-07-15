# Batch groom — 2026-07-14 (validated, awaiting build-order sign-off)

**What this is.** Daniel dropped five asks at once. Per the groom skill's batch cadence (Stage 9), this
doc is the *consolidated evaluation pass*: live validation done today, each ask classified, a build
order proposed. Full grooming (slicing, seeds, scaffolds) happens one-ask-per-session down the agreed
order. **Gate: nothing scaffolds until Daniel signs off on the order + the per-ask calls below.**

Orientation loaded: `AGENTS.md`, `WAYS-OF-WORKING.md`, `LEARNINGS.md`, `BUILD-ORDER.md`, groom SKILL.md.
All live-site claims below were verified today (2026-07-14) with a **non-JS fetch agent** — the same way
Claude/Gemini/ChatGPT read the site when someone says "ask your AI about miyagisanchez.com".

---

## Ask 1 — "Ask Claude/Gemini about miyagisanchez" must always work · Class: **Bug + light enhancement**

### What already works (validated live — no build needed)
| Surface | Status | Notes |
|---|---|---|
| `robots.txt` | ✅ | Points to sitemap, `llms.txt`, and the UCP manifest |
| `llms.txt` | ✅ | Clean agent briefing; names `/acerca`, `/vende`, `/agent`, manifest |
| `/agent` | ✅ | Full briefing renders to a fetch agent: endpoints, MCP setup, tools |
| `/api/ucp/manifest` | ✅ | Valid JSON, all capabilities/endpoints |
| `/vende` | ✅ | Entire page (comparison tables, FAQ, prompts) readable without JS; canonical + own OG image |
| `/` | ✅ | Server-rendered; nav carries `/agent` link; OG image present |

**Stage-2.5 verdict: the route-awareness ask is ~90% "already possible today."** The agent-discovery
epics (`agent-discovery-and-indexing`, `agent-readable-about-surface`, `agent-connection`) built exactly
this. "Ask Claude about miyagisanchez.com" (bare domain, no path) already resolves: agent hits `/` or
`robots.txt` → finds `llms.txt` → gets the route map. You do NOT need to advertise `/vende` in the phrase.

### The gap that breaks the campaign phrase (P0 bug, reproduced 3×)
**Bare `https://miyagisanchez.com/acerca` returns an empty body to a non-JS fetcher** — no HTML, no
metadata. `llms.txt` lists it as the #1 key page, so an agent asked "what is miyagisanchez?" follows it
and gets nothing. Reproduction facts:
- `GET /acerca` → empty, three attempts across ~10 minutes.
- `GET /acerca?lang=en` → **renders perfectly** (full content, canonical, OG tags).
- Code (`app/(shell)/acerca/page.tsx` on `main`) is a proper server component with `generateMetadata`.
- Hypothesis: a bad/empty response cached at the Cloudflare edge (or in the Cloud Run static/ISR layer)
  for the parameterless path; the query string busts the cache and works. Post-Cloud-Run-migration
  cache config is the prime suspect (frontend moved off Vercel 2026-07-10).
- Fix path: root-cause → purge/fix cache rule → **regression spec** (see below).

### Light enhancements (one small story each)
1. **Social preview consistency `/` vs `/vende`.** Today they differ: `/` = "Infraestructura de comercio"
   + generic OG image; `/vende` = "Vende sin comisiones" + its own OG image. Decision for Daniel —
   (a) identical preview on both, or (b) *same visual template*, per-page headline (recommended: a shared
   branded OG template keeps recognition AND lets `/vende` say "0% comisión" to sellers).
2. **Metadata inconsistencies found:** `/acerca` has **no OG image**; `/agent` has no canonical and its
   `og:url` points at `/`; `/terminos` `og:url` points at `/`. One sweep story.
3. **The industry-grade guard: an agent-readability spec.** A Playwright `api` spec that fetches
   `/`, `/vende`, `/acerca`, `/agent`, `llms.txt`, `robots.txt`, manifest **without JS** and asserts
   real content + correct OG tags on each. Today's `/acerca` failure would have been caught the day it
   regressed. This turns "advertising works" from a hope into a CI-gated invariant. (Reuse: the e2e
   `api` project — zero new harness.)

**Suggested strategy (instead of the instruction):** advertise the bare domain everywhere
("pregúntale a tu IA por miyagisanchez.com"). The infrastructure for routing agents from the bare domain
is live and validated; ship the P0 fix + the guard spec and the phrase becomes durable. Keep
`/vende` for *human* ad clicks, not for the agent phrase.

**Slice (1 sprint):** S1: `/acerca` bug (repro → root-cause → fix → regression spec) + metadata sweep +
agent-readability spec + OG decision implemented. Risk: **low** (no money paths; shared-surface `head`
metadata → announce).

---

## Ask 2 — Process weight-loss ("lose the training wheels") · Class: **Chore (small epic)**

Grounded against `WAYS-OF-WORKING.md`, `skills/groom/SKILL.md`, `scripts/`, `.github/workflows/`.

### 2a. Build-order self-heal (your "start with this one" candidate — agreed, and it's tiny)
Everything already exists: `build-order-guard.yml` (fails CI when the board is stale),
`scripts/build-order.mjs` (regenerator + `--check`), `scripts/build-order-sync.mjs` (regen → `claude/`
branch → PR), and an **opt-in** git hook (`git config core.hooksPath .githooks`) most sessions never
enable. The failure mode: an epic-close session flips README `status:` frontmatter, forgets to regen,
CI reds on the next unrelated PR.

**Recommendation — heal in CI, don't rely on humans/agents remembering:** extend
`build-order-guard.yml` so that when `--check` fails on a PR, the workflow **runs the regenerator and
commits the refreshed board back to the PR branch** (path-scoped to `BUILD-ORDER.md`, `contents: write`,
docs-only = LOW tier), instead of failing. Keep the hard fail only on `main` pushes (belt-and-braces).
This is ~20 lines of workflow YAML reusing `build-order.mjs` as-is. One story, buildable today.
*(Alternative considered: default-enable the git hook — can't be forced across clones; CI is the only
place every path converges.)*

### 2b. Kickoff-prompt + smoke-walkthrough templating (token diet)
The Stage-8 kickoff is ~80% invariant boilerplate that an LLM currently re-types per sprint. Scriptable:
`node skills/groom/emit-kickoff.mjs --epic <slug> --sprint N` reads the epic/sprint doc frontmatter and
prints the finished kickoff (invariant preamble from a template + the sprint delta). Same move for the
Stage-8b smoke-walkthrough skeleton: the scaffolder can emit the numbered-steps skeleton with real URL
stems pre-filled (`/s/<test-shop>/manage/…`), builder fills only the observable results. Zero AI tokens
spent on boilerplate; the *judgment* parts (stories, acceptance) stay human/LLM. One story each.

### 2c. Review-policy flip: cross-agent mandatory, fresh reviewer optional
Current policy (WAYS-OF-WORKING → Review & merge): CI gate + **fresh-reviewer subagent (judgment
layer)** + cross-agent second opinion ("run on every PR", advisory).
**Proposed:** cross-agent (`cross-review.mjs`) becomes the **mandatory** second pair of eyes on every PR;
the fresh-reviewer pass becomes **optional, invoked after cross-review findings are addressed** — *except
HIGH tier, where the fresh reviewer stays mandatory.* Rationale from LEARNINGS: the independent pass has
repeatedly caught real issues **specifically on HIGH-tier money-path PRs** (catalog-management S6:
guard-scope gap + stale money-path return URLs; arranged-only-delivery S2: tier misclassification).
Dropping it there loses proven catches; dropping it on LOW/docs PRs loses almost nothing and saves a
full agent session per PR. Docs-only change (WAYS-OF-WORKING + pr-review routine prompt). Risk: low.

### 2d. Also found while grounding (free fix)
WAYS-OF-WORKING cadence step 7 still says "frontend → Vercel prod" — stale since the Cloud Run cutover
(2026-07-10); AGENTS.md has it right. Fold the correction into the same docs PR.

**Slice (1 sprint, 4 stories):** S1: 2a CI self-heal · 2b kickoff+smoke templating · 2c policy flip
docs · 2d drift fix. All LOW risk. High leverage per token spent.

---

## Ask 3 — ReportHub as the Notion replacement · Class: **Feature (genuinely new — full groom in its own session)**

Grounded: `pmo-operational-reports` shipped; the SmallDocs fork is live at `pmo-smalldocs` (Cloud Run,
us-east4) and **became the branded Miyagi Reports hub today** (stories 1–3 of
`smalldocs-report-hub-plan.md` shipped 2026-07-14, incl. the hosted `/reports` Roadmap library).
So the foundation exists; "act like Notion" adds:
- **Story 4 (already planned): true short links** — the storage decision (Cloud Storage / Firestore /
  Supabase) is the risk fork; this is the moment the hub stops being stateless. MED risk.
- **DB-query-backed views** (sprint/epic status straight from Roadmap frontmatter — the projection rail
  from `roadmap-to-notion.mjs --extract` already exists to reuse), **graphs** (PMO metrics already
  computed by `pmo-report.mjs`), roadmap/sprint dashboards.
- **Notion decommission** as its own final story — LEARNINGS warns decommissioning is bigger than the
  package line: `notion-sync.yml`, `notion-pr-sync.yml`, `roadmap-to-notion.mjs` + tests, board docs.
  Acceptance = grep-clean, workflows removed, WAYS-OF-WORKING updated.

**Not groomed here** (one ask per session). Note for that session: reuse-list is unusually rich — the
`--extract` projection, `reports-data.json` generator, PMO scripts, Telegram rails.

---

## Ask 4 — Hyper-performant website · Class: **Feature epic (Maintainer archetype)** — inputs validated

### Validation of `references/PageSpeedInsightsmobile.md` (Google, today 09:02)
Legit and current: Perf **65**, A11y/BP/SEO **100**, Agentic Browsing 3/3. LCP **12.2 s**, payload
**3.9 MB**, homepage mobile. The named culprits check out against the live site and the codebase:
- **R2 images are the whale**: raw `pub-….r2.dev` JPEGs, `Cache-Control: none`, 913 KiB for a 321-px
  card, ~2.6 MB total savings estimated. The public r2.dev URL also bypasses the Cloudflare zone
  (no Polish/cache) — that's why TTLs are `None`.
- **`iconoir.css` from jsDelivr**: 204 KiB render-blocking, ~200 KiB unused. (Related in-flight epic:
  `emoji-to-iconoir-sweep` — align there, don't collide.)
- **One hotlinked external image** (`teatrounam.com.mx`, 369 KiB) — supply-import should ingest external
  images into R2 at import time, not hotlink.
- TTFB is 10 ms — the `marketplace-static-shell` epic did its job; this is an *asset* problem, not a
  server problem.

### Validation of `references/suggestions.md` (Gemini's epic draft) — mostly right, four corrections
1. **Story 1 (R2 pipeline) ✅ keep** — biggest win. Sharpen: route images through the zone (custom
   domain / Cloudflare Images / `next/image` loader) + `srcset`; add bucket-level `Cache-Control`.
2. **Story 2 (iconoir) ✅ keep** — but the fix is build-time subsetting/inline SVG, and it must be
   coordinated with the in-flight iconoir sweep epic.
3. **Story 3 (LCP preload) ⚠️ half-right** — the homepage LCP image is a *dynamic listing card*; a
   hard-coded `<link rel=preload>` would rot. Correct move: `fetchpriority="high"` + no `loading=lazy`
   on the first row, and (optional) a server-rendered dynamic preload since the row is known at render.
4. **Story 4 (Clerk defer) ⚠️ keep, soften acceptance** — "zero long tasks > 50 ms" is unrealistic;
   reframe as a TBT budget (< 200 ms) + lazy-mount Clerk UI bundles on interaction. Clerk itself is
   untouchable (AGENTS rule 4) — this defers *UI bundles*, not auth.
5. **Missing from Gemini:** repeat-visit story (cache TTLs), and a **perf budget guard** so the score
   can't silently erode (Lighthouse-CI or a payload-size spec in the deterministic gate).

**Slice sketch (2 sprints):** S1 images (R2 headers + delivery pipeline + responsive sizes + ingest
hotlinks) — this alone should clear most of the 12.2 s. S2 CSS/JS (iconoir subset, font swap, Clerk
lazy-mount, legacy-polyfill purge) + perf-budget guard. Risk: low-to-med (shared surfaces: `layout.tsx`
head, image components — announce; no money paths).

---

## Ask 5 — UI refresh before launch (material feel, Kindle-like) · Class: **Feature — needs disambiguation before slicing**

Too ambiguous to slice honestly. Open questions for its own groom session:
- "Material feel" = Material-Design-style elevation/motion? And "Kindle-like" = calm, e-ink-ish reading
  experience? Those pull opposite directions (motion vs stillness) — which wins where?
- Which surfaces? Buyer-facing (home, `/l`, PDP) vs seller portal (already got `seller-portal-rails-foundation`)?
- Reuse: `design-token-foundation` shipped tokens + CI raw-color guards — the refresh should be a token
  re-skin, not a component rewrite. That constraint alone decides the size.
Sequence AFTER the perf epic — both touch the same shells/components; doing UI first would double-touch.

---

## Proposed build order (the sign-off)

| # | Item | Class / size | Why here |
|---|---|---|---|
| 1 | **2a Build-order CI self-heal** | Chore, 1 story | Your call to start here — smallest, removes a recurring red |
| 2 | **Ask 1: agent-readability P0 + guard spec + OG** | Bug + 2 stories | `/acerca` breaks the live campaign phrase today |
| 3 | **Ask 2 (rest): token diet + review flip** | Chore, 3 stories | Cheapens every subsequent epic |
| 4 | **Ask 4: performance epic** | Epic, 2 sprints | Pre-launch; validated 65→90 path |
| 5 | **Ask 3: ReportHub-as-Notion** | Epic, groom next | Foundation shipped today; storage fork needs its own session |
| 6 | **Ask 5: UI refresh** | Epic, groom after #4 | Sequenced after perf to avoid double-touching surfaces |

**Decisions Daniel owes at this gate:**
1. Approve/reorder the table above.
2. OG previews: identical on `/` + `/vende`, or shared template with per-page headline (recommended)?
3. Review flip: fresh reviewer stays mandatory on HIGH tier (recommended), or optional everywhere?
4. Confirm items 5–6 get their own groom sessions (per the batch cadence).

On sign-off: seeds get written/committed for 2–6 (path-scoped), item 1 gets its Claude Code kickoff
immediately, and the next-session handoff prompt is emitted for item 2.
