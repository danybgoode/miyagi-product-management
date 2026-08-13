# US marketplace — handoff

_Written 2026-08-12 at epic close. S1–S5 shipped, S6 deferred. This is what a fresh session needs._

## Where things stand

`/us` is a live, open marketplace. A US merchant signs up and gets a shop whose operating market **is**
`us`; a buyer browses in English and checks out in USD through a Stripe Connect **direct charge** into
the seller's own account. `/mx` is unchanged, structurally and verifiably.

Everything below is either **owed** (someone has to do it) or **deliberately deferred** (a decision was
taken). Nothing here is a surprise.

## Start here

```bash
node scripts/session-resume.mjs          # step 0, always
cat Roadmap/07-agentic-and-federated-commerce/us-marketplace/RETROSPECTIVE.md
```

The retro's *Gaps / follow-ups* and *Found after close* sections are the authoritative list; this file
is the working order.

---

## 1 · The seller portal's body copy (the main build)

**The job.** Roughly **550 strings across 113 files** under `app/(shell)/shop/manage/**` and
`app/(shell)/sell/**` are still es-MX. A US merchant today gets an English *frame* around Spanish
pages: the rail, the shell chrome, the locale seam and the signup path are done.

**Regenerate the population before starting** — a hand-counted number is stale on arrival:

```bash
cd apps/miyagisanchez
grep -rlE '"[^"]{4,80}"' --include="*.tsx" "app/(shell)/shop/manage" "app/(shell)/sell" \
  | xargs grep -lE '[áéíóúñ¿¡]' | wc -l      # 39 files at close
grep -rhoE '"[^"]{4,60}"' --include="*.tsx" "app/(shell)/shop/manage" \
  | grep -cE '[áéíóúñ¿¡]'                     # 56 quoted literals at close
```

**The mechanism already exists — this is extension, not new machinery.**

- `locales/{es,en}.json` — 1,560 leaves each, currently at parity. The bilingual CI guard gates it.
- `lib/seller-nav.ts` shows the pattern that worked: a **transform over one structure**, not a parallel
  English copy. `localizeSellerNav` re-labels the existing tree, and its spec asserts hrefs, icons,
  keys and flag gating are identical across languages. Do the same for page copy — one component, one
  set of props, market-derived words.
- `MySeller` (`lib/get-my-seller.ts`) already carries `market`, `locale` and `currency`, read from
  Medusa. **Never** derive language from a locale, an `accept-language` header or a currency —
  `normalizeLocale('en-US')` returns `es`, which is the exact defect D9 exists to prevent.

**Non-negotiables**

- `/mx` copy must not move by a character. Assert against the *original* constants, as
  `us-seller-nav-locale.spec.ts` does, so the test fails if a transform touches MX at all.
- Brand names stay as authored — "Mercado Libre", "Stripe", "MercadoPago", "WhatsApp".
- Keep the es-MX completeness guard green throughout.

**Risk: LOW.** Per the epic README, S5 takes no review pass; the deterministic gate is the bar. It is
mechanical over a locked contract — a good candidate for the faster model.

---

## 2 · Owed to Daniel — only a human can do these

| # | What | Why it can't be automated |
|---|---|---|
| 1 | **The first real USD charge.** Runbook: `sprint-4.md` smoke step 6 | Moves real money. Proven 21/21 in Stripe **test** mode through the shipped code; the live one is the product owner's by the epic's own ask-first rule. |
| 2 | **An authed `/sell` load** | The one direct confirmation that real Clerk tokens carry the issuer the new JWKS verification expects (backend #148). Evidence is strong but indirect, and the retry-without-issuer fallback is deliberately gone. `logIssuerMismatch` prints claimed-vs-expected on failure. |
| 3 | **A live Connect onboarding round-trip** | Start onboarding → complete at Stripe → land on `/shop/manage/settings/pagos` → shop reports ready. This is how the 404 in backend #150 was found, and by no other means. |

These are registered as `owed to Daniel` markers in the e2e specs, so `node scripts/owed-ledger.mjs`
surfaces them.

---

## 3 · Processor-fee ledger events — pre-existing, both markets

`profit-ledger.ts` already documents this as a named follow-up: native orders carry **no** fee event,
honestly. The S4.1 proof showed the fee **is** readable for a US direct charge (103 of 2500, borne by
the connected account), so the data is at hand.

**Why it wasn't done in this epic:** capturing it means touching the live **MX** money path, which the
epic forbids changing. Doing it for US only would leave the dashboard showing US margin net of fees and
MX margin gross — inconsistent in a way a seller would reasonably read as a bug.

**If you take it on:** it is a money-path change to both markets, so it is HIGH tier — one cross-family
pass plus a fresh reviewer. Make the ledger events **idempotent** (D16), and remember that
`totalsByCurrency` and every bucket key already carry currency, so the fee event must too.

---

## 4 · S6, the US carrier — blocked on evidence, not on effort

D18 stops this sprint until the product owner supplies:

1. the provider **and** an account,
2. a US origin ZIP,
3. a representative parcel.

At close: neither EasyPost nor Shippo exists in the code or the `projects.dev` catalog. **Envía is not
a template** — it has no calculated pricing, idempotent confirm, void or refund.

`/us` is complete without it. S4.2 ships `manual_carrier`: the seller ships with their own carrier and
enters real tracking, which is *required* before an order can be marked shipped, and the copy promises
no rate and no label because none exists.

---

## Traps that will bite a fresh session

- **`/api/stripe/checkout` and `/api/mp/checkout` are MX-ONLY legacy rails.** The first refuses non-MXN
  outright. US agent checkout goes through `/api/ucp/checkout-session`; US listings deliberately carry
  **no** per-listing `checkout_urls`.
- **US sellers persist Stripe Accounts v2** (`api_generation` / `merchant_configuration` /
  `card_payments_status`) — *not* `connected` / `charges_enabled`. Any new consumer must read both
  shapes; `publicShopPaymentAvailability` is the one seam. Reading only v1 made every US shop
  permanently unbuyable, silently.
- **The frontend checkout's `node_modules` is empty (0B).** A new worktree needs its own
  `npm install` — symlinking to `apps/miyagisanchez/node_modules` gets you nothing, and `next` is not
  hoisted to the monorepo root.
- **Local `npm run test:unit` in `apps/backend` shows 4 phantom failures** in
  `publishable-key-channel-move`: it reads `process.cwd()/node_modules/@medusajs/...`, which this
  monorepo hoists to the root. CI checks the repo out standalone and passes. Not a regression — don't
  chase it.
- **CI's changed-files lint runs `--max-warnings=0`** while `npm run lint` tolerates warnings. A local
  green can still redden CI on a file you touched.
- **The frontend Cloud Build intermittently ECONNRESETs** pulling `golden-beans-sdk` from a GitHub
  release. Seen twice this epic. Re-run the trigger; it is not a code failure.
- **A guard will fire on the prose that explains it.** Three times this epic. Strip comments before
  matching, or reword — a guard that rejects correct output teaches people to delete it.

## The one thing worth internalising

The most consequential defect in this epic — 38 routes authenticating on an **unsigned** JWT — existed
because a code comment claimed a control that was never built. The second-most (`/sell/pagos` → 404)
survived three review passes because the fact that made it wrong lived in the *other repository*.

Neither was found by a test. **When a comment claims a control lives somewhere else, go and look at the
somewhere else.**
