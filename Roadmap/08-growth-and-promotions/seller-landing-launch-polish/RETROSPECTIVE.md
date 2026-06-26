# Retrospective — Seller landing launch polish

**Closed 2026-06-26 · 2 sprints · risk LOW (frontend-only marketing pages) · macro-section 08.**
Pre-launch polish on the shipped v2 seller-acquisition overhaul. PRs **#133** (`d4d6bde`, S1 copy) +
**#134** (`98a09f9`, S2 hero/sections).

## What shipped
- **S1 — Voice & copy precision** (`d4d6bde`): marketplace word woven in, full `miyagisanchez.com` brand
  sweep, eyebrow strings emptied, and **all the new copy keys staged** — `shared.heroTrustLine`,
  `anchor.heroValues`, `anchor.premiumFeatures`, `anchor.benchmark.example` — plus mundial fixes and a
  tightening pass. Guarded by copy specs (`c49f3eb`).
- **S2 — Hero & section redesign** (`98a09f9`): laid the staged copy out.
  - **Visible `PromptBlock`** (`app/(shell)/vende/_components/PromptBlock.tsx`) — the directive prompt is
    now readable text + a copy button, not just behind a button. Clipboard logic extracted to
    `useCopyPrompt.ts`; the old `TrustPromptCopy.tsx` removed.
  - **Right-panel hero** via a **scoped CSS module** (`SellerAcquisitionHero.module.css`) — mobile-first
    DOM order (title → lead → trust line → PromptBlock → value list → CTAs) promoting to a 2-column desktop
    layout with grid-areas. Anchor leads with the value list (0% · IA · Premium); personas keep their 3
    stats. Hero eyebrow gone; anchor adopts `shared.heroTrustLine`.
  - **Sections:** steps-aside → invite + PromptBlock; anchor social-proof block → **premium-features grid**
    (6 icon cards); benchmark **worked-example** under the table (responsive table + punchline + footnotes);
    persona-router card eyebrows dropped.
  - **Bespoke `mundial`** brought to parity (PromptBlock + trust line, no eyebrow).
  - a11y follow-up (`9bfcf4d`): `aria-live="polite"` on the copy button (from the cross-agent review).

## Coverage
- **api gate (pure, no server):** `seller-acquisition-hero-s2.spec.ts` (value-list vs stats fallback,
  prompt+labels, shared trust line, mundial prompt) + `seller-acquisition-sections-s2.spec.ts` (premium
  grid replaces social block, benchmark example contract). Both exercise the `page-config` seam directly.
- **browser project (opt-in, nightly + CI-vs-preview):** hero/mundial PromptBlock copy works, premium grid
  + example render, no eyebrow badges, no horizontal overflow @360/390/414 across all five `/vende*` pages.

## What went well
- **The S1/S2 copy-then-layout split paid off.** Every string S2 needed was already in `es.json` (and
  type-checked through the dictionary), so S2 was pure layout with zero copy churn and a clean grep gate.
- **Scoped CSS module hit the exact mobile order without touching shared CSS.** A grid-areas module let the
  CTAs render last on mobile but sit under the trust line on desktop — impossible with the inline auto-fit
  idiom — while staying LOW (no `globals.css`/layout edits, no announce).
- **Config-seam api specs caught the contract for free.** Asserting `buildAnchorPageConfig(...)` rather than
  rendered HTML kept the blocking gate pure/fast and still pinned the heroValues/premiumFeatures wiring.

## What we learned (promoted to LEARNINGS.md)
- **A `...spread`-then-override in an object literal is intentional, not a duplicate key** — the cross-agent
  reviewer false-flagged `{ ...baseConfig(...), trustLine: copy.shared.heroTrustLine }` as a "blocking"
  duplicate-key build error. It isn't (later key wins; `tsc` is green). Same pass also false-flagged a
  CSS-module class as "undefined" because it's declared **inside an `@media` block**. Triage a foreign-family
  review against the green gate before acting; apply the one genuine should-fix (here, `aria-live`).
- **A squash-merged sprint branch is a dead end — the next sprint starts on a fresh `-s2` branch.** S1's
  `feat/seller-landing-launch-polish` squash-merged into `d4d6bde`, so its remote branch couldn't be
  fast-forwarded for S2; pushing S2 commits onto it was rejected. Branching `…-s2` off `origin/main` was the
  clean path (this reconfirms the existing LEARNINGS rule — it bit again, exactly as documented).

## Gaps / owed to Daniel
- **Real-device mobile pass** — focal hero + PromptBlock tap-to-copy + on-screen-keyboard viewport +
  safe-area insets. A headless viewport can't cover these (the nightly browser spec covers overflow only).
- **Benchmark figures re-verification at publish** — the example + table are stamped `25 de junio de 2026`;
  re-confirm the Mercado Libre / Shopify numbers before the public launch push.
