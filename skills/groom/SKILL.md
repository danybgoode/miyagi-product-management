---
name: groom
description: >
  The front door for any new ask — feature, bug, spike, or chore. Use when Daniel
  has a raw idea in his head (or a seed in Roadmap/00-ideas/seeds) and wants to turn
  it into shippable, sliced work. Runs orientation → classification → "can we already
  do this?" → disambiguation → Medusa-first reframe → slicing, lands a Definition-of-
  Ready scope seed in 00-ideas/seeds, and on approval scaffolds + commits the epic +
  sprint docs and emits the per-sprint Claude Code kickoff prompts. Planning only —
  never writes code.
---

# Groom — the planning front door (Cowork)

> **Role split this skill assumes:** *Cowork plans, Claude Code builds.* This skill is the
> Cowork half. It produces and edits **product docs under `Roadmap/`** and **nothing else** —
> no code, no `tasks/` engineering log (that's Claude Code's lane). The handoff is file-based:
> this skill writes (and commits) the epic + sprint docs; Claude Code reads them at session start.

> **Be a partner, not a stenographer.** Orient, suggest ideas, pull Daniel back when an ask is
> bigger/smaller than it looks, and propose the lighter path. Investment in the project beats
> order-taking. *(This is already how we work — stated here so it survives a fresh session.)*

## When to run me
Daniel says any of: "let's groom X", "I've got an idea", "new feature/bug/spike/chore", or points at
a file in `Roadmap/00-ideas/seeds/`. One ask per run.

---

## Stage 0 — Orient (always, same ritual)
Read, in order, before doing anything:
1. `Roadmap/README.md` — the poster (every shipped feature, by domain). **Overlap check lives here.**
2. `Roadmap/WAYS-OF-WORKING.md` — cadence, Definition of Ready/Done, risk tiers, QA gate.
3. `Roadmap/LEARNINGS.md` — cross-cutting wisdom (esp. *"Medusa-first re-scopes the epic smaller"*).
4. The relevant **macro-section README** (01–08) once the domain is known.
5. Team memory index (`apps/miyagisanchez/memory/MEMORY.md`).

State in one line what you loaded, then proceed.

## Stage 1 — Capture
Take the raw brain-dump as given (or read it from `seeds/`). Don't clean it up yet. Mirror it back in
one sentence: *"You want \<X\> so that \<Y\>. Right?"* — surface your understanding before refining it.

## Stage 2 — Classify
Pick one. The class decides the downstream path:

| Class | Tell | Path |
|---|---|---|
| **Feature** | new buyer/seller/agent capability | scope doc → epic + sprint slicing |
| **Spike** | "how does X work / should it be A or B" (`spike-compra-protegida`, `spike-flagsmith`) | time-boxed investigation brief → **a written decision**, not code. No slicing until the decision lands. |
| **Bug** | promised behaviour missing/broken | **reproduce → root-cause → fix story + regression spec.** Single story unless it fans out into an epic. Hotfix variant (live money/auth/checkout breakage) → minimal fix, high-risk, Daniel merges. |
| **Chore** | tooling/infra/docs/deps, no user-facing change | **rationale → single story or small epic.** Usually low-risk; flag if it touches shared surface (`layout.tsx`, `middleware.ts`, deps) — those can break sibling PRs and must be announced. |

> **Bug path detail.** Before proposing a fix, write the **reproduction** (exact steps + where it
> diverges from the promise) and the **root cause** (read the model/route — many "bugs" are an
> unbuilt or half-built promise, not a regression). The fix is a normal user story with an
> acceptance check and a regression spec so it can't silently come back.

> **Cross-agent planning panel — surface it on a Spike.** When the class is **Spike** (an "A vs B" /
> "how should this work" call), you **must surface** a one-line offer to run the advisory planning panel
> *before* the decision lands — a different model family's architecture second opinion on the brief:
> `node scripts/cross-panel.mjs <brief> --lens both --agent codex` (run again with `--agent antigravity`
> for family diversity). It's **single-pass, print-only, advisory — it never gates and never writes the
> doc**; Daniel's decision/scope-doc approval remains the only gate. *Surface = a required offer, not an
> auto-run* (cost-safe, matches `cross-review`). See the full trigger model at Stage 4.

## Stage 2.5 — Orientation: can we already do this? *(do this before disambiguating)*
**Many asks aren't new features or bugs — they're orientation.** Before planning a build, ask: can the
current setup already deliver this outcome, with **existing features + communication, or a light
enhancement**, instead of net-new work?

Three buckets — name which one this ask is:
1. **Already possible today** → no build. Show Daniel *how* (the existing feature + the messaging/positioning
   that exposes it). *E.g. "restaurant delivery" may already be servable via arranged-delivery + a service
   listing + the right copy — no new code.*
2. **Light enhancement** → small story or a copy/config change on top of an existing feature, not an epic.
3. **Genuinely new** → proceed to full disambiguation + slicing.

Always present bucket 1/2 options *first* when they exist, with the trade-off ("you could ship this as
positioning today, or build the dedicated flow later"). Pulling Daniel toward the lighter path when it
exists is the job.

## Stage 3 — Disambiguate (structured Q&A)
Use the question bank below. **Ask in batches**, only the questions actually open. Resolve ambiguity
*before* planning. Make the implicit explicit so the slices are right the first time.

> **Research current reality when it matters.** If the ask leans on anything that changes or is recent —
> a standard (UCP/MCP), a payment-provider capability (Stripe/MercadoPago/SPEI/DiMo), a framework/library
> behaviour (Next.js, Medusa v2), a Vercel/Clerk limit, or a competitor's pattern — **web-search to confirm
> the present-day facts** rather than relying on training memory. Cite what you found in the scope doc. Don't
> plan on a stale assumption.

Core bank (adapt):
- **Role & job:** buyer, seller, agent, or admin? What job are they hiring it to do?
- **Outcome & signal:** what's true after this ships that isn't now? How will *Daniel* test it?
- **Scope boundary:** what's explicitly *in* v1 and *out*? (Write the "out" list — it prevents creep.)
- **Granularity heuristic:** per-shop vs per-product vs per-listing? (Your `spike-compra-protegida`
  football-pitch case — escrow on reservations, not merch — is exactly this. Always ask it for anything configurable.)
- **Data model:** does Medusa already model this? If not, is it truly non-commerce (Supabase), or are we missing a primitive?
- **Agent surface:** per AGENTS rule #3 — how does an AI agent do this over UCP/MCP?
- **Language & channels:** new copy is **es-MX** by default (es/en only on the bilingual allow-list — see AGENTS rule #5)? Behaves on all channels (marketplace / own-domain / subdomain / embed / API)?
- **Overlap:** does the poster already claim this? Reuse or extend, don't rebuild.

## Stage 4 — Medusa-first reframe (the step that shrinks the epic)
Before slicing, **read the backend model + route first.** Per LEARNINGS this repeatedly re-scopes work
smaller (custom-slugs → 1-field backend change; personalized products → zero new tables). Produce the
epic's **"What already exists (reuse, don't rebuild)"** list — concrete files/routes/primitives. Apply the
AGENTS five rules (Medusa owns commerce · Supabase non-commerce only · UCP/MCP first-class · Clerk
untouched · es-MX copy). If the ask violates a rule, flag it now.

> **Cross-agent planning panel — the trigger model (advisory, never a gate).** This is where the expensive
> *architecture forks* surface — and where the panel earns its keep. **You must surface a one-line offer to
> run the panel** whenever the reframe hits a fork worth a second model family's eyes:
> - a **new Medusa module vs Supabase table vs custom Next route** decision (a Rule 1/2 call),
> - a **new primitive** (new table, new public route contract, a new id namespace),
> - an **AGENTS-rule tension** you had to reason about, or
> - any **expensive-to-reverse** choice (migration shape, schema, channel/auth boundary).
>
> Routine work (clear reuse, no fork) is **on-demand only** — runnable via the `Panel:` verb
> (`Roadmap/SESSION-KICKOFFS.md`) but not offered. The panel is **never auto-run** (surface = a required
> *offer*, cost-safe) and **never a gate**: it prints a single-pass, different-family critique
> (`node scripts/cross-panel.mjs <doc> --lens both --agent codex|antigravity`) that ends in a *checkable
> claim*; it does not edit the doc. Daniel's scope-doc approval (Stage 7) stays the only gate — the panel is
> a step *before* it, not a new one.

## Stage 5 — Slice (skateboard → car)
Define the **thinnest end-to-end slice that actually works and ships** — the skateboard — then each
increment toward the car. Every slice is an independently testable, shippable **user story**:
> **As a** \<role\>, **I want** \<capability\>, **so that** \<outcome\>. **Acceptance:** \<plain checks Daniel can run\>.

Group stories into **sprints**. For each story **name the QA/smoke stage** (WAYS-OF-WORKING requires it):
which api spec gets added, and whether a browser smoke is owed (and to whom). Prefer pure-logic specs on
an extracted `lib/` seam (free coverage).

## Stage 6 — Risk-tier every story
Tag each **low** (docs/copy, non-commerce UI, additive agent tools behind auth, tests) or **high**
(payments / checkout / fulfillment / auth / DB migrations / shared infra / money). High → Daniel merges.
When unsure, high.

### Stage 6b — Kill-switch decision for `risk: high` (recommend, don't auto-inject)
A high-risk epic should ship behind a kill-switch — but that's **decided here at grooming**, sliced as
real work, **not** discovered as a checkbox at epic close. For any `risk: high` epic, answer one
question and **write the answer in the scope seed** (the answer is mandatory; the flag itself is not):

> *Is there a runtime seam a kill-switch can gate?*

- **Yes →** *recommend* a kill-switch **story** (Daniel evaluates it at the scope-doc gate — never
  auto-injected). Name four things:
  1. **Flag** — `<domain>.<feature>_enabled`, extending `lib/flags.ts` `DEFAULT_FLAGS` (the taxonomy
     lives in code, not in docs). Same shape as shipped `checkout.stripe_enabled` / `domain.paywall_enabled`.
  2. **Polarity** (pick the fail-open default to match intent):
     - **Kill-switch** (ship live, instantly killable) → default **`true`**, **create it ENABLED in
       every env** (switch *armed*; disabling is the deliberate kill).
     - **Enablement / dark-launch** (merge dark, activate deliberately — esp. money infra that must be
       **seeded first**) → default **`false`**, **create it DISABLED in every env**, flip on when ready.
     - A flag is **invisible until created in Flagsmith** — the story must say "create it in every env."
  3. **Seam** — the single source of truth to gate (e.g. `resolveSellerPaymentMethods`) so UI + agents/UCP
     + checkout are covered by one `isEnabled('…')` check.
  4. **Mechanism** — **Flagsmith** for node/server seams; **Edge Config** for `middleware.ts`/Edge seams
     (the Flagsmith SDK is **not** Edge-compatible — LEARNINGS). Edge Config is the heavier lift; naming it
     here lets Daniel weigh server-side-gate vs carve-out.
- **No →** write the **one-line carve-out reason** (e.g. *DB migration — can't sit behind a runtime flag;
  reversible expand/contract instead*; *gate is the auth provider*; *no new runtime seam*).

The epic Definition of Done then only **verifies** the planned slice shipped + the flag exists — it does
**not** introduce the policy as a new build-time gate. This composes with the merge rule unchanged: the
kill-switch story rides the same `HIGH ⇒ Daniel merges`. See the ADR
`Roadmap/00-ideas/seeds/kill-switch-at-grooming.md`.

## Stage 7 — Scaffold + commit the docs (on Daniel's approval)
1. Write the **scope seed** to `Roadmap/00-ideas/seeds/<slug>.md` — the Definition-of-Ready
   artifact (overview · UX heuristics · acceptance criteria · the reuse list · in/out scope · open risks ·
   any research citations · the Stage-2.5 bucket). It **must start with the seed frontmatter block**
   (`title · slug · status · area · type · priority · risk · epic · build_order · updated` — see
   `Roadmap/00-ideas/README.md`); set `status: ready` here. **This is the gate: nothing scaffolds until Daniel approves it.**
2. On approval, **run the scaffolder** instead of hand-rendering structure:
   ```
   node skills/groom/scaffold-epic.mjs --slug <epic-slug> --area <NN> \
     --macro <NN-macro> --title "<Epic title>" --risk <low|high> \
     --sprints "S1 title;S2 title;S3 title"
   ```
   It creates `Roadmap/<NN-macro>/<epic-slug>/README.md` + `sprint-1..N.md` + a `RETROSPECTIVE.md` stub
   from `skills/groom/templates/`, and prints the exact path-scoped commit command. Fill the generated
   files with the real stories / reuse list / QA stages — the script makes the skeleton, you make the content.
3. **Update the seed:** set its frontmatter `status: scaffolded` and `epic: "<NN-macro>/<epic-slug>"`.
   **Never move the seed between folders** — frontmatter carries lifecycle (this is what stopped 00-ideas drifting).
4. **Commit it.** `Roadmap/` is tracked in git — commit the scaffold so a fresh worktree/agent inherits the
   product context. **Commit only your own paths** — never `git add Roadmap/` or `git add -A` (a shared
   planning worktree races the index → "another git process is running" / index lock). Use the command the
   scaffolder prints, e.g.:
   `git add <the files you scaffolded> <the seed> && git commit -- <those paths> -m "plan(<epic-slug>): scaffold epic + sprints"`.
   For parallel planning, run in your own `git worktree`, or let one **scribe** own shared files like
   `BUILD-ORDER.md`. Docs are low-risk tier.

## Stage 8 — Emit the per-sprint Claude Code kickoff prompts
One per sprint, ready to paste into a fresh Claude Code session:

```
Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/<NN-macro>/<epic-slug>/README.md and Roadmap/<NN-macro>/<epic-slug>/sprint-<N>.md.

You're building Sprint <N> of "<epic title>". Enter plan mode, confirm the plan as user stories with me,
then branch feat/<epic-slug> off latest main and build one story at a time per WAYS-OF-WORKING.
Reuse before rebuild (see "What already exists"). Commit per story with path-limited adds
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A` — a shared worktree races the
index). App copy is es-MX by default (es/en only on the bilingual allow-list — AGENTS rule #5). Add one api spec per testable story; name the
QA/smoke stage and state any browser smoke owed to me. When the deterministic gate (tsc + build + Playwright
api) is green, open a draft PR declaring the risk tier — and write the SPRINT SMOKE WALKTHROUGH (below) into
sprint-<N>.md before you call the sprint done.
```

The invariant preamble (line 1 of the prompt — the orientation reads + skim memory) is the same every
session; it stays in the prompt so a *fresh* Claude Code session re-orients with zero prior context. Keep
the sprint-specific delta (this epic, this sprint, its reuse list, its risk) as the part that actually varies.

**Model tiers:** run the groom/plan and any spike on the strong model (Opus); the per-sprint build can run on
a faster model (Sonnet) once the plan is approved — the kickoff already opens in plan mode, so judgment still
happens up front. (Planning here in Cowork; building in Claude Code.)

For a **spike**, emit instead a short investigation prompt that ends in a written decision in the scope
doc — no branch, no build.

### Stage 8b — The sprint-end smoke walkthrough (fool-proof, real URLs)
Every sprint closes with a **step-by-step manual walkthrough Daniel can follow blind**, written into
`sprint-N.md`. Once deployed, it uses **real production URLs** (preview URLs while pre-merge). Format —
numbered, one action + one expected result per step, no jargon:

```
## Sprint <N> — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. Go to https://miyagisanchez.com/s/<test-shop>/manage/settings
   → You see the new "<thing>" section.
2. Click "<button>".
   → A <result> appears within ~2s.
3. Open https://<test-shop>.miyagisanchez.com in a private window.
   → The <feature> renders white-label, no platform chrome.
4. (money path) Add <item> to cart → checkout as guest → pay with a Stripe test card 4242…
   → Order confirmation email arrives, branded to the shop; the seller's order screen shows <field>.

If any step fails, note the step number + what you saw — that's the bug report.
```

Rules: real clickable URLs (not "the settings page"); the exact button/label; the observable result; and
call out which steps are the **money/auth path** (those are the ones an automated browser smoke can't fully
cover, so they're owed to Daniel by name).

---

## Stage 9 — Close the loop: backlog cadence + next-session handoff
**The backlog keeps growing.** Daniel routinely drops a *batch* of prioritized asks at once. We do **not**
groom a batch in one session. The cadence is:

1. **Agree a consolidated build order first** (a separate evaluation pass — consolidate overlaps, sequence
   by dependency/leverage), and **persist it** to `Roadmap/00-ideas/BUILD-ORDER.md` so it survives the session.
2. **Groom one ask per session**, down that order. (Still *one ask per run* — Stage 0's rule is unchanged.)
3. **At the end of every groom run, do BOTH:**
   - Emit the **Claude Code build/investigation handoff** for the *just-groomed* item (Stage 8) — unchanged.
   - **Tick the item in `BUILD-ORDER.md`** and emit a **next-session Cowork handoff prompt** for the **next ⬜
     item** in the order. *Do not* offer "want me to groom the next one now?" — the next ask gets its **own
     fresh session** (keeps each groom cheap + context-clean). The handoff prompt references the docs that
     already exist (`BUILD-ORDER.md`, the relevant `seeds/` seed, the orientation files) so the
     next session re-enters with zero re-derivation. Template:

   ```
   We're working the agreed build order in Roadmap/00-ideas/BUILD-ORDER.md.
   The last groomed item was <#X · name> — <status>.

   Groom the next ⬜ item: <#Y · name>.
   Read first, in order: Roadmap/00-ideas/BUILD-ORDER.md, then Stage 0 orientation
   (README.md, WAYS-OF-WORKING.md, LEARNINGS.md), then the scope seed
   Roadmap/00-ideas/seeds/<seed>.md and any primitives it names.
   Then run /groom on <#Y> — one ask, the normal stages — and stop at the scope-doc gate for my sign-off.
   ```

If no `BUILD-ORDER.md` exists yet (a one-off ask, not a batch), skip this stage — just close normally.

---

## Guardrails
- **Planning only.** Never edit code or `tasks/`. Only `Roadmap/` docs.
- **Reference end-states are inspiration, never signed-off scope.** (Their own guard against doc-drift.)
- **Orientation before building.** Always check Stage 2.5 — the lightest path that hits the outcome wins.
- **Every plan names a QA stage and ships a smoke walkthrough.**
- **Research present-day facts** when the ask leans on anything recent or changing.
- **One ask per run.** Resist scope-merging two ideas.
- **Batch backlogs → one ask per session.** When Daniel drops many asks, agree + persist a build order
  (`BUILD-ORDER.md`), then groom them one-per-session; end each run with the next-session handoff (Stage 9).

## Definition of Ready this skill must hit before scaffolding
- "As a / I want / so that" clear; acceptance testable by Daniel.
- Stage-2.5 bucket named (already-possible / light / new).
- v1 in/out boundary written; research cited where relevant.
- Reuse list produced (Medusa-first reframe done).
- Each story risk-tiered; QA stage named; smoke-walkthrough owner identified.
- **For a `risk: high` epic: the kill-switch decision is recorded** (Stage 6b) — either a recommended
  flag story (flag · polarity · seam · mechanism) or a one-line carve-out reason.
- Daniel approved the scope doc.
