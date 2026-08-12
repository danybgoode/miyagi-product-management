# US marketplace — Sprint 2: The shell speaks two languages

**Status:** ✅ shipped — 2026-08-11

**Landed:** frontend PR [#351](https://github.com/danybgoode/miyagisanchezcommerce/pull/351) (`4fa9ccc`) —
bilingual buyer presentation foundations. The dictionary carries 1,560 leaves in each locale, es and en
at parity.

## Outcome

The buyer surface stops hardcoding Spanish. Copy moves into the dictionary, the dictionary grows an
en-US half, and locale is resolved from the market rather than guessed. Mexico's rendering does not
change by a single character — the es-MX completeness guard is what proves it. This sprint is frontend
only and produces no new route; it exists so that Sprint 3 can build `/us` in English instead of
building it in Spanish and rewriting it.

## Build contract

Implement D9–D11 against frontend `origin/main` `5d4df0c`. Use a generated population manifest: buyer
direct routes 67 (68 including the old `/us` page), static-import closure 119; seller direct routes 113 /
closure 146 move to S5; admin direct routes 42 / closure 69 are out of scope except explicitly shared
files. The current dictionaries have nine namespaces and the existing “bilingual allow-list” guards only
admin override eligibility—it is not a global completeness or hardcoded-copy guard. Add recursive
object/array shape + non-empty guards and fix the two missing English FAQ leaves.

Add one market-presentation resolver (`mx → es-MX/es/MXN`, `us → en-US/en/USD`) and prove commerce never
reads locale. Preserve static rendering by introducing market-owned root-layout groups that render the
correct server-side `<html lang>`, Clerk localization and fallback; do not call `headers()` in the global
root and do not mutate `lang` on the client. Extract buyer chrome mechanically with byte-identical MX
render snapshots. Authored merchant content is not translated.

## Stories

### Story 2.1 — Make the shell read its copy from a dictionary, not the source

**As a** developer, **I want** buyer-path copy to come from `locales/*.json` **so that** a second
language is data rather than a second component tree.

**Acceptance:** Every buyer-path string in the sprint's named file list is extracted to a dictionary key
and read through the existing lookup. Extraction is mechanical: the rendered Spanish output is
byte-identical before and after, proven by a snapshot or render diff on a representative page set. No
component is duplicated, no `es`/`en` conditional appears inside a component, and the es-MX completeness
guard passes with no orphan or hardcoded strings introduced.

**Risk:** low

### Story 2.2 — Translate the buyer path to en-US

**As a** US buyer, **I want** the marketplace in English **so that** I can actually read it.

**Acceptance:** Every key added in 2.1 has an `en` value. Translations are commerce-idiomatic American
English, not literal renderings — "Agregar al carrito" is "Add to cart", not "Add to the shopping car".
Currency, date and number formatting derive from the market record's locale, so a USD price renders
`$12.00` and not `$12.00 MXN` or `12,00 $`. Pluralization and empty/error/loading states are covered,
not just the happy path. The bilingual allow-list gate passes with both halves present.

**Risk:** low

### Story 2.3 — Resolve locale from market at every entry point

**As a** buyer, **I want** the page language to follow the market I am in **so that** `/us` is English
and `/mx` is Spanish, consistently and without a language switcher deciding commerce.

**Acceptance:** One resolver derives the render locale from the market record's `default_locale` and is
the only thing that decides language. Locale is never read to decide currency, payment, shipping or
marketplace membership — the registry's separation of the four concepts survives this sprint intact, and
a spec asserts it. `lang` and `hreflang` on every page reflect the resolved locale. Server-rendered
output is correct without JavaScript.

**Risk:** low

## Sprint QA

- **api spec(s):** locale resolution matrix over `mx` / `us` / unknown; a guard asserting no commerce
  decision reads locale; dictionary completeness for both halves.
- **browser smoke owed:** no — anonymous `live-smoke` renders cover it; `/mx` must be visually and
  textually unchanged.
- **deterministic gate:** `tsc --noEmit` + lint + `npm run build` + Playwright `api` green before merge.
- **regression:** es-MX copy-completeness guard, bilingual allow-list guard, both `markets.ts` golden
  specs, MX SEO/metadata specs.
- **review:** LOW — no cross-family pass. Gate green ⇒ merge.

## Sprint 2 — Smoke walkthrough (do these in order)

Env: preview first, then production · https://miyagisanchez.com

1. Go to https://miyagisanchez.com/mx and browse to a product page, then the cart.
   → Every word is exactly as it was before this sprint. This is the whole point of the sprint's risk
     profile: a large diff with zero visible change.
2. View source on https://miyagisanchez.com/mx
   → `<html lang="es-MX">`, and the Spanish copy is present in the server-rendered HTML with JavaScript
     disabled.
3. Open the diff for the sprint and pick five extracted strings at random; find each one in
   `locales/es.json` and confirm `locales/en.json` has a sibling.
   → Both halves present, English reads naturally rather than as a literal translation.

If any step fails, note the step number + what you saw — that's the bug report.
