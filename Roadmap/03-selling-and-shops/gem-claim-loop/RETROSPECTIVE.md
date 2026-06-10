# Retrospective — Gem → Claimable Shop Loop (2026-06-09)

One-day epic, 3 sprints, 3 repos (backend #18 `0c36f10` · frontend #66 `ed1ee9c` · despachobonsaiVercel #1 `f46708d`), all shipped + prod-verified the same day.

## What happened
A real prod import run (evidence in the kickoff) created a gem that 404'd. The prompt's hypothesis
named the read-model split; investigation confirmed it **and found two more silent breaks stacked
behind it** — claim completion no-opping (Medusa id vs mirror UUID, 0-row update reported as
success) and the claims-table FK upsert erroring unchecked. The fix was almost entirely *wiring
existing seams*: the import's last hop now drives `POST /internal/sellers` (new) +
`POST /internal/seller-products` (existing, built for the MCP agent), and claim drives a new
internal claim route. Las Duelistas went live through the fixed path with photos hosted via the new
secret-gated upload; all 6 end-state criteria verified on prod.

## What worked
- **"Trust only the Evidence" framing.** Treating docs + hypothesis as suspect and reading the real
  code first surfaced the two *extra* silent breaks the 404 was hiding. A fix scoped only to the 404
  would have shipped a claim flow that still didn't claim.
- **Reuse-first kept it small.** `createSellerProduct()` (sales channel, inventory, shipping
  profile, category/type lookups) did all the heavy lifting; the import rewrite is mostly mapping.
  Pure mappers in `lib/supply.ts` made the translation unit-testable.
- **Verification by observable behavior.** The 6 criteria were checked as a buyer/admin would see
  them (HTTP 200, badge text, search hits, claim status codes), not by inspecting rows only.

## What bit us
- **Silent failures stacked three deep** — all the same shape: a write whose error result nobody
  checked (0-row UPDATE, FK-violating upsert, mirror update by wrong id). None threw; all "worked".
- **Unknown API routes on prod return HTTP 200** (the 404 page), so the new endpoints' negative-path
  spec runs against prod *looked* like wrong status codes pre-deploy. CI-vs-preview was the
  authoritative gate.
- **`gh pr merge --delete-branch` fails when another worktree holds `main`** (known LEARNINGS item —
  reconfirmed; merge succeeded on GitHub, only the local delete errored).

## Residue / follow-ups
- QA seller shell `qa-gema-prueba` (sel_01KTQS95ZADC2QK0K0KXQ1WZCY) left claimed by the fake
  `user_qa_gemloop_test`, zero listings, invisible outside its direct URL. No seller-delete API
  exists; purge needs DB access or a new internal route.
- The 90-day scraped-listing expiry cron (`/api/cron/listing-cleanup`) still only touches the
  **mirror**; supply listings now live in Medusa → cron needs a Medusa-side counterpart (idea filed
  in the epic README's out-of-scope note).
- despachobonsai local `main` had 2 unpushed commits during the work; my PR branched off
  `origin/main`. Daniel syncs his local main himself.
- Owed Daniel: the live email-claim browser smoke (Reclamar → email → despachobonsai sign-in →
  shop transfers) — server side is API-smoked.
