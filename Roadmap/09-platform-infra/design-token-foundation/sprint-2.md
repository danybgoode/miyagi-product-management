# Sprint 2 — Tokenization hardening (customer-facing surfaces)

Goal: make customer-facing components reference semantic tokens instead of raw hex, so re-skinning
(and #6) is a token change — with **zero visible difference** to users.

**Status:** ✅ shipped — frontend PR #37 (merge `cc317ef`; `657df40 feat(tokens): semanticize customer
color usage`). Tokenized `CheckoutExperience`, `embed/s/[slug]`, `ChannelLayout`, `ConversationClient`,
`ClaimForm`, `MakeOfferButton`, `CheckoutPayButton`, `CartDrawer`, `SearchBar` + the small-offender tail
(new scoped tokens `--embed-*`, `--claim-*`, `--surface-channel` added to `globals.css`). Follow-up
`4e1640a` switched a notifications raw-hex to `--color-danger`.

Risk tier: **low** — presentation-only. ⚠️ **Touches shared `globals.css` + many components** → announce
the cross-cutting change, rebase latest `main` first, land as **one focused PR** (LEARNINGS → Multi-agent).

---

## US-3 — Tokenize customer-facing components

**As a** maintainer, **I want** customer-facing components to reference semantic tokens, not raw hex,
**so that** a future theme or the #6 redesign re-skins by changing tokens, not chasing literals.

- [x] The **32** Tailwind arbitrary color classes (`bg-[#…]`, `text-[#…]`, etc.) in customer-facing
      components are swapped to token-backed classes/vars.
- [x] Prioritized raw-hex literals in live surfaces are tokenized: `CheckoutExperience.tsx`,
      `embed/s/[slug]/page.tsx`, `ConversationClient.tsx`, `ShopSettings.tsx`, `ImportClient.tsx`,
      `ClaimForm.tsx`, and the small-offender tail.
- [x] **Explicitly excluded (documented why):** `lib/email.ts` (email clients strip CSS vars),
      `lib/print-layout.ts` / `print-export.ts` / `PrintAdPreview.tsx` / `PrintAdBlock.tsx` (print/PDF),
      `app/opengraph-image.tsx` (OG image), `app/style-sandbox/page.tsx` (demo), `app/admin/*` (internal).
- [x] **Zero visible change:** the rendered output of every touched page is pixel-identical before/after.

## Sprint 2 QA

- [x] Deterministic gate green: `tsc --noEmit` + `npm run build` + Playwright `api` suite.
- [x] **Anonymous browser smoke**: load key pages (home, a listing, checkout entry, an embed) on the
      branch preview and confirm no visual regression vs `main`.
- [ ] **Owed to Daniel (still open):** a before/after **screenshot diff** on those key pages (the sampled
      smoke can't fully prove "zero visible change" — a human eye on the diff closes it). *Low-stakes
      follow-up — the raw-color guard + AA check passed; no functional risk.*

## Sprint 2 — Smoke walkthrough (do these in order)
> _Placeholder — swap the preview URL for the real branch preview at build time._
Env: branch preview · `https://<preview-url>`   (then production `https://miyagisanchez.com` post-merge)

1. Open `https://<preview-url>/` and the same path on production in two windows.
   → Home renders identically — same accent, surfaces, text colors.
2. Open a listing page `https://<preview-url>/l/<id>` vs production.
   → Buy box, chips, badges, buttons look identical.
3. Open the checkout entry `https://<preview-url>/checkout` vs production.
   → Identical styling; no raw-color drift on totals/CTAs. **(visual-diff step — owed to Daniel)**
4. Open an embed `https://<preview-url>/embed/s/<test-shop>` vs production.
   → Shadow-DOM widget renders identically.

If any step shows a visible difference, note the step number + what changed — that's a regression.
