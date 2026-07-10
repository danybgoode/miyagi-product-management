# Panfleto — the first premium shop — Sprint 3: The horror convocatoria

**Status:** ⬜ not started · **Blocked by Sprint 2** (the call launches on the panfleto identity)

> `launchpad.enabled` is already **ON** (Daniel, 2026-07-09). No flag work here — this sprint is the
> first live use: the call itself, its copy, and the never-yet-run money smoke as the walkthrough.

## Stories

### Story 3.1 — Create the call: horror stories from Mexican and Latin American authors
**As an** author, **I want** a clear open call at `panfleto`'s convocatoria page — what we're looking
for, how to submit, what happens after — **so that** I can send my story in minutes without an account.
**Acceptance:** the convocatoria is live at https://panfleto.miyagisanchez.com/convocatoria (and
`/s/panfleto/convocatoria`); it states genre (horror), eligibility (authors from México / Latin
America), length guidance, submission window, and the path a story takes (review → excerpt →
publication → voting → print unlock); a test manuscript flows intake → review queue →
publish-as-digital → "Lee un adelanto" excerpt. All copy meets the epic's content bar, drafted in
this sprint doc for Daniel's read first.
**Risk:** med

### Story 3.2 — Launch surfaces + the voting/print plan
**As** the shop, **we want** the call visible and shareable, **so that** it actually reaches authors
and readers.
**Acceptance:** announcement bar on panfleto points at the convocatoria; the Convocatorias collection
shelf shows accepted works as they publish; a voting campaign is configured (threshold, print-product
reward via the CPP-configured listing, window) ready to activate when enough works are in; share
links (`mschz.org` forms once the coverage chore ships — long canonical URLs until then) + social
copy drafted.
**Risk:** med

## Sprint QA
- **api spec(s):** convocatoria render on the panfleto identity → extend the launchpad specs (the
  intake/review/publish specs exist; assert the white-label subdomain path).
- **browser smoke owed:** **yes, to Daniel — the launchpad money path has never run live**: one full
  vote → threshold → coupon → redeem pass (product-scoped coupon on the linked print listing).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://panfleto.miyagisanchez.com

1. Open https://panfleto.miyagisanchez.com/convocatoria in a private window.
   → The horror call renders white-label: genre, eligibility, window, process — no account demanded.
2. Submit a test manuscript (email-code verify).
   → Confirmation lands; the submission appears in the seller review queue.
3. Approve + publish it as a digital product; open its PDP.
   → "Lee un adelanto" excerpt renders; the work appears on the Convocatorias shelf.
4. Activate the voting campaign; cast one email-verified vote at the `/v/[slug]` page; reach the test
   threshold. **(money step — Daniel)**
   → The product-scoped coupon mints; redeeming it discounts ONLY the linked print listing at checkout.

If any step fails, note the step number + what you saw — that's the bug report.
