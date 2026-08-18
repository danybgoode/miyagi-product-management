# Retrospective — Living Shop: social storefront + expressive customization

_Closed: 2026-08-18_

## What shipped

Seven sprints in one orchestrated run, one stacked branch, one PR (#391), ~85 files.

A merchant's own shop is no longer a branded product grid. It has a **Wall** — a
chronological narrative where a note, a product, a collection and an event live
together — a **closed set of seven sections** with one nav across marketplace,
subdomain and custom domain, and **three theme modes**: Default, a finished Retro
Social, and a schema-driven Custom with no code escape hatch. A seller authors all
of it from one studio at `/shop/manage/tienda`, and their agent can do the same
through four MCP Wall tools plus a `presentation` block in Storefront-as-Code.

| Sprint | What it left behind |
|---|---|
| S1 | `shop_wall_entries` (applied live, constraints proven), seller CRUD, the canonical resolver, the composer |
| S2 | The Wall on the shop homepage; native Post / Product / Collection / Event cards |
| S3 | Seven controlled sections; `/tienda`, `/colecciones`, `/eventos` on every channel |
| S4 | The theme resolver, the CSS engine, legacy-preset compatibility with no backfill |
| S5 | The five-tab studio and the owner-only live preview |
| S6 | Storefront-as-Code parity, MCP Wall tools, the public agent representation |
| S7 | Cross-channel parity, sitemap, accessibility, performance budgets, edge states |

~135 new specs; 4300 green in the api project.

## What went well

**The locking pass paid for itself before a single line was written.** Reading the
live code and the live database first corrected three scaffolded premises: the
events primitive holds zero rows platform-wide, middleware already passes every
non-root path through on both owned hosts, and only three shops carry a legacy
preset. Each of those changed what got built — the third one turned a data
migration into a read-time mapping and removed the epic's only real chance of
regressing a live storefront.

**Applying the migration before merging the code that reads it** — and then making
every CHECK actually *refuse* what it forbids inside a transaction that aborted on
purpose — meant the schema was known-good before anything depended on it. A
constraint nobody has seen refuse anything is not known to constrain anything.

**Deriving scheduled visibility instead of running a cron.** There is no job to
fail, so a merchant's scheduled launch cannot silently not happen. The cost is one
comparison per read.

**The existing guards caught five real defects in my own work.** Not review — the
deterministic gate. That is the layer the operating posture bet on, and it paid.

## What we learned

**A pure planner needs the real call shape, again.** `getShop()` returns the
*Medusa seller*, whose `id` is not the `marketplace_shops.id` the Wall's foreign
key points at. The code read correctly and would have matched zero rows with no
error. The fix — one resolver that joins on the slug, with the reason written at
the call site — is cheap; finding it live would not have been. This is the same
class of defect as calling a module with an invented key, which this codebase has
already shipped once.

**A guard's population is the thing to check, not the guard.** Three separate
times this run, a scan was passing because it was not looking:
- `buyer-locale-population` did not scan the owned-host root routes at all.
  Widening it surfaced a **real bilingual leak on `/acerca`** that had been live
  under a comment asserting it was deliberate — on a page that has an English
  toggle.
- My studio guard-coverage spec asserted a directory constant **against itself**
  and survived a mutation repointing it at another directory.
- My sitemap spec used `toContain('navEntries')`, which a mutation satisfied by
  **renaming the import**. A substring match is not a call.

The red-mutation check caught the last two. Without it, both would have passed
forever while proving nothing.

**Making a spec pass is not the same as satisfying it.** When
`market-route-population` failed, my first fix put the literal `market: 'mx'` in a
*comment* so the grep would match. That is gaming a guard. The honest fix changed
the function signature to an options object so the market decision is real code —
and the underlying defect was real: the section routes would have rendered a US
merchant's catalog under the `/mx` prefix.

**"We could not check" is not "it does not exist."** The public Wall route
initially collapsed an unreachable commerce backend into a 404, which would tell a
crawler a live merchant's shop was gone during a blip. Three states, never two —
this keeps recurring because two states is always the shorter code.

**Copy that wraps an inline `<strong>` is copy that cannot be translated.** The
seller boundary substitutes *text nodes*, so a bolded word mid-sentence produced
six untranslatable fragments ("Publica una", "para contar algo, un"). Whole
sentences per node, and a constant spelled out in words gets a spec pinning it to
the constant.

**A preview that renders the real thing is safe only if it proves ownership.**
Previewing the public shop in an iframe with the draft in the URL is the right
design — one renderer, no drift — but it creates a link that could repaint a
merchant's storefront for anyone who followed it. The overlay checks that the
Clerk session owns *this* shop, and because the api project runs anonymously, that
boundary is proven end to end rather than argued.

## Verified live (2026-08-19, `miyagi-web-00110-kdj`)

Production, after `02804ba` deployed:

- **The Wall renders** on `/mx/s/prueba` — pinned entry first, `wall-feed`/`wall-card` in the served
  HTML, the section nav present with `/tienda` as a real destination.
- **The schedule boundary holds on real data.** Three entries were seeded; the public read returns
  **two**. The one scheduled for 2027 is absent from both the API and the HTML — with no cron
  involved, decided at read time.
- **Pinning changes prominence, not chronology.** The pinned entry (21:45) leads the *newer*
  unpinned one (22:45). That is the property the spec asserts, now proven against production rows.
- **Every API boundary answers correctly**: the public read 200s, an unknown slug 404s, a missing
  slug 404s, and all four seller routes 401 anonymously.
- **D5's no-visual-reset guarantee, proven on a real shop.** `champions-not` serves
  `data-shop-theme="custom"` **and** `data-shop-preset="pizarra"`, with `surface="bordered"` /
  `background="tinted"` — its legacy preset preserved *and* mapped to the recipe closest to it.

**A pre-existing divergence this verification uncovered.** `theme_preset` is set on three shops in
`marketplace_shops`, but the public page reads settings from the **Medusa seller** — and only
`champions-not` has it there. `panfleto` (papel) and `autos-demo-miyagi-sanchez` (terracota) have
been rendering *without* their chosen preset since before this epic. Reported, not fixed: syncing
them would change two live storefronts' appearance without anyone asking. The epic README's D5 has
been corrected, because "three live shops" was true of the table and false of the storefront.

**And a mistake of mine that this caught.** The dogfood seed set `theme_mode: retro` on `prueba` by
writing straight to Supabase — which the public page never reads. The theme resolver was demonstrably
running (all five `data-shop-*` attributes emitted, Default recipe values correct); the seed simply
never reached the surface. The real seller path writes both stores (`PATCH /api/sell/shop` syncs the
merged settings into Medusa seller metadata), so this is a gap in my seeding, not in the product. The
half-applied value has been removed rather than left as state nothing reads.

## Gaps / follow-ups

**Owed to Daniel — an authed seller walkthrough.** Local Clerk is `pk_test_` and
production is `pk_live_`, so this machine cannot hold a real seller session. Each
sprint file marks its authed steps **OWED (Daniel)** by name. In short: compose all
four Wall kinds, schedule one with an explicit offset, pin it, reorder sections by
keyboard, switch to Retro and to Custom, and check the preview at both sizes.

**Owed — the foreign-reference refusal against a running route** with two real
shops. The structural argument (no code path accepts a foreign shop id) and the
anonymous 401s are covered automatically; the authed cross-shop attempt is not.

**🚨 `marketplace_events` holds ZERO rows platform-wide.** The Events index is
built against the real primitive and its only observable branch today is the empty
one. Creating one real event is what turns S3.4 and S2.4 from "built" into
"seen working".

**The dogfood is partial.** Default and the legacy-preset compatibility case are
observable on live shops today (see *Verified live*). Retro Social and a
representative Custom recipe need a merchant session to select — a direct database
write does NOT reach the public page, as the seeding attempt proved — so the
three-way visual comparison S7.6 asks for is owed with the walkthrough above.

**Not built, deliberately:** buyer comments, reactions, follows, buyer-authored
posts, arbitrary pages, merchant CSS/HTML/JS, webfont URLs, a canvas editor, and
the embed Wall. All were explicitly out of scope and the embed's exclusion is now
asserted by a spec rather than left to memory.
