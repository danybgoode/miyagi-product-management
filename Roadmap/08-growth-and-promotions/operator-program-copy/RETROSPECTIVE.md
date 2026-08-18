# Retrospective — Operator program: one offering, two markets, new voice

_Closed: 2026-08-17 — 1 sprint; storefront PR #386 (2 commits) + these docs_

## What shipped

`/us/operators` rebuilt on the shared brand landing shell as the US telling of the Promotor program —
open a store for a local business, close in person, keep the commission — with a Shopify/Amazon
comparison table and a five-field application replacing the three-shop dossier. Both locales of
`partnersRecruiting` and all of `sellerAcquisition.promotor` rewritten. `operator_details` v2 plus the
CHECK-constraint migration that was its real contract. `monta` retired platform-wide behind a guard.

Storefront PR #386, two commits. Gate: `tsc` clean, `npm run build` exit 0, 4101 api specs pass.

## What went well

- **The premise got corrected before any code was written** (below). One question, one page of
  fabricated prices avoided.
- **Reuse did almost all the work.** The brand shell, the application rail, the approval/activation
  RPCs and the funnel event vocabulary all already existed. The new page is a pure copy → config
  mapper plus a form; the visual identity came for free and cannot drift from `/vende/*`.
- **Mutation-testing every new guard paid for itself twice** — two guards were passing for the wrong
  reason and one of them was hiding a string that was live in production.

## What we learned


Daniel asked for `/us/operators` to match the brand and communicate the real offering, for the
promoter program's copy to be rewritten in both languages with the AI slop removed, and for the word
`monta` to go from the Spanish. The work was mostly copy — but three things underneath it were not.

### The premise needed correcting before any code

"Make the US page the same as `/vende/promotor`" cannot be taken literally. The Promotor page's whole
substance is MXN-priced SKUs — custom domain $499/yr, subdomain $199/yr, a printed-edition ad, a
Mercado Libre import, a migration — plus a commission split and a WhatsApp claim link. In the US none
of that pricing exists in code, there is no printed edition and there is no Mercado Libre. Saying so
first, and asking, turned a page that would have shipped with invented dollar figures into one that
sells the program and defers the numbers to approval. **Surfacing the false half of a request cost one
question and saved a page full of fabricated prices.**

### The CHECK constraint was the contract, not the TypeScript

Making the US application five fields looked like a form change. It was not: the migration that
created the program had encoded the entire dossier in a Postgres `CHECK` — `operator_details_version =
1`, exactly three `candidate_shops`, `active_shop_count BETWEEN 3 AND 10000`, `checkpoint_90_day =
true`, and an exact key set. The TypeScript validator was a *mirror* of it. Shipping the new form
without the migration would have passed every test and had Postgres reject every real submission.

This is [[paraphrased-contract-drifts-permissive]] from the other direction: the code did not drift
permissive, it drifted *behind*. The lesson generalizes — **when a validator's comment says it mirrors
a database constraint, the constraint is the thing to read before changing the validator.**

### A field name that lies is worse than a rename

The comparison table's rows were `{ miyagi, mercadoLibre, shopify }`. The US table compares against
Shopify and Amazon. The cheap move was to put Amazon copy in the `mercadoLibre` field and change the
column header — every test would have passed, and the next reader would have believed the field name.
Rows are positional `cells[]` now, parallel to `columns`, and the component serves any market.

## The guards, and how two of them were wrong

Every new spec was mutation-tested. Six mutations; **five went red, one did not**, and chasing that one
found a second broken guard.

**The version gate passed with the version check deleted.** The test fed a full v1 dossier and expected
`invalid_payload`. But a v1 dossier *also* fails the unknown-detail-keys check, which returns the same
reason — so the assertion never touched the version gate at all. Rewritten to submit **otherwise-valid
v2 details** tagged with the wrong version, which isolates it. This is
[[a-spec-must-baseline-on-the-state-it-is-not-testing]] in a new costume: the fixture differed from the
control in *two* ways, so the assertion could not attribute the failure.

**The `monta` guard missed the gerund.** Reintroducing `montando tiendas` into `lib/agent-prompt.ts`
left the source scan green. That exact string was live — rendering inside the promoter page's own AI
prompt block, which the dictionary-only sweep had walked straight past. Two lessons stacked:
[[guard-the-population-not-the-door-you-found]] (the dictionary is not the population; `app/` and
`lib/` hold user-facing Spanish too), and the plainer one that **a word ban must enumerate the
conjugation, not the stem.**

The same guard then reddened on *correct* copy — `lib/settings-import.ts`'s "tres montos sugeridos",
where `monto` is the money noun. Per [[a-guard-that-rejects-correct-output]] the fix was to narrow the
ban (drop `monto`/`montos`, keep the accented `montó`/`monté`) and add the legitimate phrasing to the
allow-list test, not to add an exception at the call site.

## Two gaps found without being asked

- **`/us/operators` never read the override layer.** `/admin/contenido` has listed
  `partnersRecruiting.landing` and `.application` as editable since the namespace shipped, while the
  page read the raw dictionary — so every edit to those keys did nothing. Fixed here.
  `/partner` has the same gap; flagged, not widened into scope.
- **Three live `monta` strings sat outside the dictionary**, in `agent-prompt.ts`, `email.ts` and the
  promoter close workspace. A dictionary-only sweep would have reported success.

## Process notes

- Two commands ran against the main checkout instead of the worktree because the shell's working
  directory had drifted between calls. Caught by a `git status` that showed changes where there should
  have been none, reverted, redone. **Every verification command in a worktree should carry its own
  absolute `cd`** — the cost of not doing it is a plausible-looking green run in the wrong tree.
- `git checkout --` during a mutation run reverted an *uncommitted real fix* along with the mutation.
  Committing before mutation-testing avoids this; the guard caught the regression on the next run,
  which is the argument for scanning the population rather than the diff.

## Gaps / follow-ups

- **Daniel's authed walkthrough** of `/us/operators` plus one real application submitted end to end.
- **`/us/operators` 404s on a local dev server** because `partners.recruiting_v3_enabled` resolves from
  Golden and a local run cannot reach it, falling through to the compile default `off`. Production has a
  Golden definition serving default-ON, and #384 gave the scoped catalog its own snapshot lane. Not a
  gap — recorded so the local 404 is not re-diagnosed as a regression. (An earlier draft of these docs
  claimed the flag had **no** Golden definition, carried over from a 2026-08-14 note that #384 and #145
  had already superseded — a memory is only true as of when it was written.)
- **`/partner` still reads the raw dictionary**, the same override gap closed on `/us/operators`.
  Flagged deliberately rather than widened into this epic's scope.
- **`GLOSSARY_SKU_ORDER` has four entries for a five-entry glossary**, so the `migration` SKU never gets
  its earnings line appended. Pre-existing, harmless today, not touched — changing it changes rendered
  output on a page this epic was not asked to re-price.

## Applying the migration — what actually blocked it

`20260817210000_operator_details_v2.sql` is **applied and verified live** (2026-08-17). Getting there
was worth recording, because the first diagnosis was wrong.

The CLI reported `Access token not provided`, so it was reported as unauthenticated. It was not: the
CLI is logged in and `bonsaiClerk` is linked. Every `supabase db *` invocation — including a read-only
`select count(*)` and even `--help` — is refused by the **auto-mode permission classifier**, and the
`security find-generic-password` lookup that would have distinguished "no token" from "token I cannot
reach" is blocked too. An auth error at the tool boundary is not evidence about the credential when
the harness sits between them. **Probe with the cheapest read the tool offers before concluding
anything about auth**; `supabase projects list` answered it in one call and was never tried.

`supabase migration list` also retired a stale premise: `AGENTS.md` §6 bans `db push` because "local
migration files are unrecorded remotely, so it would replay all of them". All 40-odd are now recorded
on both sides, with only the new one pending. The ban may still be right, but not for that reason.

Applied via `supabase db query --file` (run by Daniel, since the classifier blocks it for the agent),
then recorded with `supabase migration repair --status applied`, which needs no raw SQL.

**Verification was behavioural, not definitional** — five inserts against the live table proving v2 is
accepted, v2 with nulls is accepted, v2 with an unknown key is refused, a stored v1 dossier is still
accepted, and v3 is refused; every row deleted and the table re-read to prove it was empty again. The
first run **failed on the test, not the migration**: a partial unique index on email fired before the
CHECK on two cases and returned 409s that proved nothing. A verification that reaches the wrong
constraint is not verification — give each case its own fixture.
