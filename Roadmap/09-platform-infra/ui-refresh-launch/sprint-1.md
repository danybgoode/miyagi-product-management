# UI refresh before launch — Sprint 1: Token spec + site-wide token layer

**Status:** 🟨 in progress — S1.1 spec written, awaiting approval

## Stories

### Story 1.1 — Research + token spec (written decision, no code)
**As** Daniel, **I want** a one-page token spec derived from *current* Material heuristics (web-search
the present-day guidance — don't plan on training memory) mapped onto our existing token taxonomy,
**so that** the re-skin has a named target before any value changes.
Covers: type scale, color roles (incl. dark/theme-engine interplay with `seasonal-theme-engine`),
shape/radius, elevation strategy, motion primitives (calm on reading surfaces — inspiration: Kindle
stillness), density. **Ends in a written decision appended to this doc; Daniel approves it before 1.2.**
**Acceptance:** spec approved in-session; citations included.
**Risk:** low

### Story 1.2 — Site-wide token layer update
**As** every visitor, **I want** the approved token values live across all tokenized surfaces,
**so that** the whole site inherits the new feel in one move.
**Acceptance:** token values updated in the `design-token-foundation` SSOT; raw-color CI guards green;
perf-budget guard green (no new fonts/assets past budget); visual spot-set (home, PDP, /vende, seller
dashboard, embed widget) reviewed by Daniel on the preview; all four channels render correctly.
**Risk:** low (cross-cutting `globals.css`/tokens — **announce**, merge in a quiet window)

## Sprint QA
- **api spec(s):** existing design-token guard suite (values change, enforcement stays); perf-budget spec green
- **browser smoke owed:** yes, to Daniel — preview walkthrough of the spot-set before merge
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: branch preview first, then production · https://miyagisanchez.com

1. Open the preview home, /l, and a PDP side by side with production.
   → New type scale/color roles/radii visible; nothing broken, no raw-color guard failures in CI.
2. Open https://miyagisanchez.com/s/<test-shop> on the preview and the embed widget demo.
   → Channels inherit the new tokens; white-label shells keep their branding logic.
3. Toggle the seasonal theme (admin).
   → Theme engine still composes with the new token values.

If any step fails, note the step number + what you saw — that's the bug report.

## Story 1.1 — Token spec (written decision, PENDING DANIEL APPROVAL)

**SSOT:** all tokens live in `apps/miyagisanchez/app/globals.css` — the `@theme inline` block
(Tailwind `--color-*`) + the `:root` block (`--r-*`, `--s-*`, `--t-*`, `--ease-*`, `--dur-*`,
`--shadow-*`, glass). `globals.css` is on the raw-color guard's `guardExcludedFiles` list
(`lib/design-token-audit.ts`), so editing **values** here is guard-clean by design; 1.2 edits values
only. **Guiding constraint:** re-skin, not rewrite — the palette hues, the brand accent, spacing, motion,
and glass are already close to current Material heuristics; the deltas below are *alignment nudges + an
accessibility/reading upgrade*, not a redesign.

### 1. Change table — only tokens that CHANGE

| Token (current) | Current value | Proposed | M3 role / heuristic | Citation |
|---|---|---|---|---|
| `--t-xs` … `--t-6xl` | absolute **px** (12→84) | same steps re-expressed in **rem** (see §2) | rem respects user font-size / browser zoom — the core calm-reading accessibility rule | [greadme](https://www.greadme.com/blog/seo/best-font-sizes-for-readability-complete-guide) |
| `--t-base` | `15px` | `1rem` (**16px**) | M3 Body Large = 16sp; 16px is the cross-industry readable-body floor | [M3 type-scale](https://m3.material.io/styles/typography/type-scale-tokens), [greadme](https://www.greadme.com/blog/seo/best-font-sizes-for-readability-complete-guide) |
| `--t-md` | `17px` | `1.125rem` (18px) | reading-surface lead size; keeps proportional step above 16px body | [UXPin](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/) |
| `--r-lg` | `18px` | `16px` | M3 shape scale "Large" = 16dp | [M3 shape](https://m3.material.io/styles/shape/corner-radius-scale) |
| `--r-xl` | `24px` | `28px` | M3 shape scale "Extra-large" = 28dp | [M3 shape](https://m3.material.io/styles/shape/corner-radius-scale) |
| *(new)* `--measure-prose` | — | `66ch` | optimal line length 50–75 char (66 sweet spot) for reading surfaces; additive, zero risk | [UXPin](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/) |

**Deliberately left ALONE** (re-skin discipline): all palette scales (`--selva/jamaica/azafran/anil/papel-*`);
the **brand accent** `#1d6f42` (identity — and changing it forces a mirror edit in `lib/platform-theme.ts`,
see §3); spacing `--s-*`; **motion** `--ease-*` + `--dur-*` (already M3-conformant, see §4); all
`--shadow-*` + glass tokens; every semantic color *value* (energy/promo/agent/success/…); the `[data-mode]`
calm + dark blocks and the `[data-shop-preset]` blocks. `--r-xs`(4)/`--r-sm`(8)/`--r-md`(12)/`--r-2xl`(32)
already match the M3 scale exactly — unchanged.

### 2. Type scale — current vs proposed

Convert the whole `--t-*` set from absolute **px** to **rem** at a 16px root (today `html{font-size:var(--t-base)}`
pins root to 15px — 1.2 must set root to the browser default so `rem` = the user's setting, an accessibility win).
Sizes: `--t-xs .75` · `--t-sm .875` · **`--t-base 1` (15→16px, the one real bump)** · `--t-md 1.125` ·
`--t-lg 1.25` · `--t-xl 1.5` · `--t-2xl 1.875` · `--t-3xl 2.375` · `--t-4xl 3` · `--t-5xl 4` · `--t-6xl 5.25` (rem).
Line-height stays: `--lh-normal 1.5` (M3/WCAG body sweet spot) — reading surfaces use 1.5–1.6 + `--measure-prose`.
**Tradeoff for Daniel:** the 15→16 body bump enlarges every tokenized surface ~7%; the conservative
alternative is rem-only at the *existing* pixel sizes (base `0.9375rem`), which keeps today's look but forgoes
the 16px readability target. **Recommendation: take the 16px bump** — it is the single highest-value calm-reading move.

### 3. Color roles + seasonal-theme composition

No color *values* change; this documents the M3 role each token already plays and the composition rule.

| Our token | M3 role | Dark (already implemented) |
|---|---|---|
| `--accent` / `--accent-hover` | `primary` / primary state | dark uses `--selva-400` (lighter/less-saturated primary — M3-correct) |
| `--accent-soft` / `--accent-ink` | `primary-container` / `on-primary-container` | `rgba(selva-400 .12)` |
| `--fg-inverse` | `on-primary` | — |
| `--bg` / `--bg-elevated` / `--bg-sunk` | `surface` / `surface-container` / `surface-container-lowest` | `#14140f` / `#1c1c17` / `#0d0d0a` |
| `--fg` / `--fg-muted` | `on-surface` / `on-surface-variant` | `#f3f2ec` / `#a4a49d` |
| `--border` / `--border-strong` | `outline-variant` / `outline` | `#2a2a26` / `#3a3a35` |
| energy·promo·agent (+`-soft`) | error·tertiary·secondary (+ containers) | inherit base |

Citation: [M3 color roles](https://m3.material.io/styles/color/roles).
**Composition rule (verified in code).** Precedence, highest wins: **(1) seasonal engine inline styles** on
`<html>` — `lib/platform-theme.ts` `buildPlatformThemeBootScript` calls `r.style.setProperty(...)`, and an
inline style beats any `:root`/`:root[data-mode]` stylesheet rule; scoped to `/l`, `/agent` + root, opt-in via
`localStorage`, and it **only touches the accent family + bg-pattern** (`--color-accent`, `--accent*`,
`--fg-inverse`, `--glass-tint-accent`, `--shadow-glow-accent`). → **(2)** `[data-shop-preset]` (white-label,
`--shop-*` only). → **(3)** `:root[data-mode="dark"|"calm"]`. → **(4)** `:root` base. **Consequence for 1.2:**
type/shape/elevation/motion value changes are 100% safe — no layer above base ever touches them. The **one**
coupling: if 1.2 ever changes the base accent, the engine hardcodes `CORE_ACCENT = '#1d6f42'` independently in
`lib/platform-theme.ts` and would drift — hence "leave accent alone" in §1.

### 4. Shape / elevation / motion

- **Shape:** two nudges only (`--r-lg` 18→16, `--r-xl` 24→28) to land exactly on the M3 corner scale; the
  rest already match. [M3 shape](https://m3.material.io/styles/shape/corner-radius-scale)
- **Elevation:** **no value change.** M3 says prefer *tonal* elevation but keep *shadow* for light themes / busy
  backgrounds — our light UI is shadow-based (correct) and our dark `--bg-elevated` is a lighter tint than `--bg`
  (that *is* M3 tonal elevation); calm mode already flattens shadows to hairline borders (the Kindle-stillness
  treatment). [M3 elevation](https://m3.material.io/styles/elevation/applying-elevation)
- **Motion:** **no value change.** `--ease-standard: cubic-bezier(0.2,0,0,1)` already equals M3
  standard/emphasized; durations 120/200/320/520ms sit inside M3's short→long band (50–600ms). Optional additive:
  `--ease-emphasized-decelerate: cubic-bezier(0.05,0.7,0.1,1)` for future entering-content, not required for 1.2.
  [M3 motion tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)

### 5. Risks

- **Raw-color CI guard (`lib/design-token-audit.ts`) — WILL catch** during 1.2: raw hex/rgb + raw palette
  classes (`bg-green-500`) + `bg-white` + literal Tailwind radii introduced in **components** (app + lib,
  minus excluded prefixes), and it asserts `documentedContrastPairs` ≥ 4.5:1. **WON'T catch:** a wrong *value*
  inside `globals.css` itself (guard-excluded) — a bad token ships silently unless a contrast pair covers it;
  and there is **no** automated assertion on type-scale / radius / motion values or on visual regression → the
  spot-set preview review with Daniel is the only gate for those. Also unguarded: seasonal-engine accent drift
  (§3) — a manual check if accent is ever touched.
- **Perf (acceptance constraint, `hyper-performant-website` budgets):** the site loads **one** webfont
  (Space Grotesk, Google Fonts `<link>`). This spec adds **zero** fonts/assets — px→rem and value nudges are
  byte-neutral, no CLS delta. The "Kindle/editorial" pull must **not** introduce a serif webfont for reading
  surfaces; use the existing `ui-serif` system stack (as `[data-shop-preset="papel"]` already does) if a serif
  is ever wanted. No new asset may enter in 1.2.

**Status: PENDING Daniel approval — 1.2 does not start until this is approved.**
