# The build view — Sprint 1: The frontmatter contract

**Status:** ⬜ not started

**Epic:** [The build view](README.md) · **Risk: LOW**

**The sprint that is actually the epic.** Everything downstream — enforcement, the resolver, the mod,
and `build-order` / `epic-dod` / the Notion projection — reads what this sprint defines.

**Lock D1 against the real corpus first.** 80+ existing epics with varying story shapes decide
whether per-story data belongs in sprint frontmatter or in a fenced block. Deciding it from the
template alone is how the backfill discovers it was wrong.

## Stories

### Story 1.1 — Epic README frontmatter schema
**As a** tool reading the roadmap, **I want** the epic's identity in frontmatter,
**so that** title, area and risk stop being parsed out of a bold prose line.
**Acceptance:** the epic README frontmatter gains `title`, `area`, `risk`, `type`, `sprints_total`,
`stories_total`, and keeps `status`, `slug`, `build_order`. Today it carries **only `status` and
`slug`**. `build-order.mjs` reads the new fields without changes to its parser.
**Risk:** low

### Story 1.2 — `sprint-N.md` frontmatter
**As a** tool, **I want** sprint files to declare themselves,
**so that** the epic/sprint/risk/status a sprint belongs to is data rather than a paragraph.
**Acceptance:** every `sprint-N.md` carries `epic`, `sprint`, `title`, `risk`, `status`,
`stories_total`. **This is the biggest single gap** — sprint files have no frontmatter at all today.
**Risk:** low

### Story 1.3 — The per-story block
**As a** tool, **I want** each story's identity and user story as data,
**so that** the build view can show the actual "As a / I want / so that" instead of a heading.
**Acceptance:** per **D1**, each story carries `id`, `as_a`, `i_want`, `so_that`, `risk`, `status` in
a parser-owned shape. **Scraping `### Story N.M —` headings is explicitly what this replaces.** The
human-readable prose stays — this is additive, and a sprint file must still read well to a person.
**Risk:** low

### Story 1.4 — The six-value status ladder
**As the** product owner, **I want** an executive status on every epic and sprint,
**so that** "what is happening right now" is one word rather than a paragraph.
**Acceptance:** `status` accepts `Shaping · Locking architecture · Building · Verifying · In review ·
Shipped`. Each maps to a cadence event the docs already mandate (see the epic README's table). It is
**written by the agent at those moments, never inferred from prose.** `Shipped` means merged **and
deployed** — not merged — per the doctrine's own *"done means shipped"*.
**Risk:** low

### Story 1.5 — `groom` scaffolder templates emit the new shape
**As a** groom session, **I want** new epics born compliant,
**so that** the contract holds going forward without anyone remembering it.
**Acceptance:** `scaffold-epic.mjs` and `templates/{epic-README,sprint-N}.md` emit the full schema.
CI's existing throwaway-epic render proves substitution still works. **The generator paths and the
GENERATORS-NOT-FOUND stop rule are untouched** — they are what keeps Stage 7 from being hand-written.
**Risk:** low

## Sprint QA
- **api spec(s):** `scaffold-epic` generator tests extended to assert every required field is emitted
  on both the epic README and every `sprint-N.md`; a parser test asserting the per-story block round-trips.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test 'scripts/*.test.mjs'` + the CI throwaway-epic render green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local · `dobby-foundation`

1. Scaffold a throwaway epic with `node skills/groom/scaffold-epic.mjs --slug tmp-check …`.
   → The epic README carries `title`, `area`, `risk`, `type`, `sprints_total`, `stories_total`,
     `status`, `slug`, `build_order`.
2. Open any generated `sprint-N.md`.
   → It has frontmatter — `epic`, `sprint`, `title`, `risk`, `status`, `stories_total`. *(Today it
     has none at all; this is the check.)*
3. Look at the per-story shape.
   → `id`, `as_a`, `i_want`, `so_that`, `risk`, `status` are parser-owned, and the human-readable
     prose is still there and still reads well.
4. Set a sprint's `status` to `Locking architecture`, then to `Nonsense`.
   → The first is accepted; the second is rejected by the schema.
5. Run `node scripts/build-order.mjs` over a corpus containing the throwaway epic.
   → It reads the new fields and the board renders. No parser changes were needed.
6. Run the groom generator tests.
   → Green. The throwaway epic renders and substitutes.

If any step fails, note the step number + what you saw — that's the bug report.
