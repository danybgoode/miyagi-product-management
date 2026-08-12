# US marketplace — Retrospective

_Closed: 2026-08-12 · S1–S5 shipped, S6 deferred at its evidence gate_

## What shipped

| Sprint | PRs | Commit | What it does |
|---|---|---|---|
| S1 | be [#141](https://github.com/danybgoode/medusa-bonsai-backend/pull/141) [#142](https://github.com/danybgoode/medusa-bonsai-backend/pull/142) [#143](https://github.com/danybgoode/medusa-bonsai-backend/pull/143) [#144](https://github.com/danybgoode/medusa-bonsai-backend/pull/144) | `92f407b`…`05a7503` | The US commerce resource pack: Region, both channels, stock location, publishable key |
| S2 | fe [#351](https://github.com/danybgoode/miyagisanchezcommerce/pull/351) | `4fa9ccc` | Bilingual buyer presentation; 1,560 dictionary leaves at es/en parity |
| S3 | be [#145](https://github.com/danybgoode/medusa-bonsai-backend/pull/145), fe [#352](https://github.com/danybgoode/miyagisanchezcommerce/pull/352) [#358](https://github.com/danybgoode/miyagisanchezcommerce/pull/358) | `d5194c5`, `a291331` | `/us` becomes a marketplace |
| S4 | be [#146](https://github.com/danybgoode/medusa-bonsai-backend/pull/146) [#149](https://github.com/danybgoode/medusa-bonsai-backend/pull/149), fe [#359](https://github.com/danybgoode/miyagisanchezcommerce/pull/359) [#360](https://github.com/danybgoode/miyagisanchezcommerce/pull/360) | `4eb3a07`, `4b6500e`, `d2e8aaa`, `6995d6e` | USD direct charges, manual-carrier delivery, currency-correct money |
| S5 | fe [#361](https://github.com/danybgoode/miyagisanchezcommerce/pull/361) | `a33ac41` | US seller signup; seller rail in the shop's language |
| — | be [#148](https://github.com/danybgoode/medusa-bonsai-backend/pull/148) | `b8abc19` | **Security:** Clerk JWTs were never verified |
| S6 | — | — | Deferred at D18's evidence gate |

**Verified live after deploy.** The US fixture shop returns `["manual_carrier"]` from
`checkout-options`; real Mexican shops (`ylai-studio`, `panfleto`) still return
`["local_pickup","shipping"]`. `/`, `/mx`, `/mx/l`, `/us`, `/us/l`, `/sell?market=us` and
`/api/ucp/manifest` all 200.

**S4 proven in Stripe test mode, 21/21**, driven through the shipped code rather than
hand-written params: `planStripeMarketStrategy` → `checkout.sessions.create` → a real charge →
`stripeRefundParams` → a real refund. The platform account **404s** on the charge (that is what
"direct" means), the fee is borne by the connected account with `application: null`, and a
negative control confirmed Stripe rejects `reverse_transfer` on a direct charge — so that rule is
load-bearing, not decorative.

## What went well

**The pure/IO seam paid for itself on the money path.** Every S4 decision —
`planStripeMarketStrategy`, `admitUsDelivery`, `stripeRefundParams`, `totalsByCurrency` — is a pure
function with a spec. That is what made a 21-check live Stripe proof possible in one script: the
harness could import the real decision functions and feed their output straight to Stripe, so the
proof tested the shipped code rather than a re-implementation of it.

**Mutation testing found things review did not.** Fifty-one deliberate mutations across the epic,
each observed red. Several specs were vacuous until mutated — most instructively, the S4.2 ordering
spec: asserting that `admitUsDelivery` returns 422 stayed green when the call was moved *below* the
cart writes, because the refusal was still a 422 and a partial cart already existed behind it. Only
asserting the **position** caught it.

**Structural MX-safety beat careful MX-safety.** `admitUsDelivery` returns on `market !== 'us'`
before any US rule is read. No amount of future editing of the US matrix can change an MX checkout,
because control flow never reaches it. That is a stronger guarantee than a test suite, and it costs
one line.

## What we learned

**A comment asserting a control is not a control.** `clerk-auth.ts` said *"Clerk's public key
validation happens at the edge (middleware)"*. There was no middleware — no `src/api/middlewares.ts`
existed in the repo at all. `extractClerkUserId` base64-decoded the payload and returned `sub`, so
38 routes authenticated on an attacker-supplied string. Confirmed live before the fix: a forged
`alg:none` token returned `404 No seller profile found` (the route went looking for that user's
shop) where an anonymous request returned 401. Real Clerk id in that payload → that shop's products,
orders, coupons, payouts and Stripe onboarding.

Reported as one finding about one new route. Thirty-seven siblings had the identical hole.

**One bug, two copies.** The same issuer bug lived in `clerk-verify.ts` and
`auth-clerk/service.ts` — each with its own `getFrontendApiFromKey`, each building
`https://clerk.${frontendApi}` (wrong for both key shapes), each catching the resulting throw and
retrying with **no issuer check at all**. Fixing one copy is how a class of bug survives its own
fix. Both now share `lib/clerk-issuer.ts`, and a repo-wide guard makes a third copy impossible.

**Two representations of one fact, and only one being read.** A US seller persists the Stripe
**Accounts v2** shape (`api_generation`/`merchant_configuration`/`card_payments_status`); the
storefront recognised only **v1** (`connected`/`charges_enabled`). A fully onboarded US shop would
have read as "no payment method" → `seller_payment_unavailable` → `buy_now` suppressed everywhere,
permanently, with no error anywhere. The backend was ready to charge and the frontend never offered
the button.

**Correct arithmetic, ambiguous presentation, still a wrong answer.** Splitting profit aggregation
by currency was not enough: `$` is the symbol for *both* markets (es-MX renders MXN as `$1,250`;
en-US renders USD as `$12.50`), so two correctly-separated rows still read identically. Caught by
cross-family review, not by me.

**Guards fire on the prose that explains them.** Three times this epic: a design-token guard read
`PR #359` as the hex `#359`; a "never infer market from locale" guard reddened on the docblock
citing `normalizeLocale` as the defect it closes; an issuer guard reddened on the one file
documenting the issuer bug. Match code, not comments — or reword. A guard that rejects correct
output teaches people to delete it.

**Confident external findings are ~50/50 on the money path.** Antigravity filed two blocking
findings on the auth PR; both were wrong, and disproving one took a standalone Express app to
settle empirically rather than by argument. But its *should-fix* was real, and its blocking claim
still improved the work — it exposed that my spec **modelled** Express prefix semantics rather than
executing them, and a model wrong in the same direction as the code proves nothing. Codex's
findings on S4 were 3-for-3 real. Verify; don't dismiss, and don't defer.

**Reducing a value before the function that judges it is where the bug goes.** `hasShippingAddress`
was computed at the call site as `address_1 || city`, so a US cart carrying only `{ city: 'Austin' }`
was admitted as deliverable. The fix was not a longer boolean at the call site — it was passing the
address *whole* so the rule could decide.

## Gaps / follow-ups

**Owed to Daniel — real money.** The first live USD charge (sprint-4 smoke step 6) is unrun and
stays Daniel's action per the epic's ask-first rule. Everything up to it is proven in test mode.

**Owed — the seller portal's body copy.** ~550 strings across 113 files are still es-MX. The rail,
the shell chrome, the locale seam and the signup path are done; page bodies are not. A US merchant
gets an English frame around Spanish pages.

**Owed — processor-fee ledger events, for BOTH markets.** `profit-ledger.ts` already documented
this as a named follow-up before the epic. The S4.1 proof showed the fee *is* readable for a US
direct charge (103 of 2500), so the data is at hand — but capturing it means touching the live MX
money path, which this epic forbids changing. Left honestly absent rather than half-built for one
market.

**S6 — deferred at D18's evidence gate**, by Daniel's decision. Needs a named provider and account,
a US origin ZIP and a representative parcel.

**Not verified: a real Clerk session token's `iss` claim.** The removed retry-without-issuer-check
was the safety net, and the evidence for the replacement is strong but indirect (the instance's own
OIDC discovery document, the `pk_live` decode, no satellite config). `logIssuerMismatch` exists
precisely so that if this is ever wrong, the logs say so in one line instead of an hour of guessing.
Daniel's authed `/sell` + `/sell/pagos` load is the direct confirmation and is owed.

**Deliberately deferred, unchanged from the plan:** calculated sales tax and any
marketplace-facilitator obligation. The seller is merchant of record and tax-liable.

## Numbers

- **51** deliberate mutations, each observed red before its fix was accepted.
- **1,111** backend unit tests (93 suites) · **3,893** frontend API specs.
- **1** live authentication bypass found and closed, affecting **38** routes.
- **4** defects found by cross-family review that the deterministic gate could not catch; **2**
  blocking claims disproved with evidence.
