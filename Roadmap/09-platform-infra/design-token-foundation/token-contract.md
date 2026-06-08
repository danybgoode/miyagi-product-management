# Token Contract — the semantic design-token reference (#4 · S1 deliverable)

> **What this is.** The canonical, product-source-of-truth list of the semantic tokens components
> style by — **the substrate #6 (and every future surface) consumes.** Style by **intent**
> (`--accent`, `--fg-muted`), never by **value** (`#1d6f42`). Source of truth is
> `apps/miyagisanchez/app/globals.css`; this doc mirrors it (token names match exactly — if they ever
> diverge, `globals.css` wins and this doc is the bug). Written 2026-06-07 at epic close.

## The three layers (and the one rule)
1. **Raw scale (`--color-*`)** — literal brand values. *Do not reference these in components.*
2. **Semantic aliases (`--bg` / `--fg` / `--accent` / feedback)** — intent names that *alias* the raw
   layer. **This is the layer components use.**
3. **Scoped/component tokens (`--embed-*`, `--claim-*`, `--surface-*`, `--print-*`, glass)** — narrow
   tokens for one context, themselves resolving to the layers above.

> **One canonical name per concept.** Components reference the **semantic alias** (`--fg-muted`), not
> the raw value (`--color-muted` / `#6b6b67`). The raw `--color-*` layer exists only so the seasonal
> theme engine + per-shop `--shop-accent` can re-point intent without components changing.

## Surfaces & text (the everyday tokens)
| Token | Resolves to | Intent |
|---|---|---|
| `--bg` | `--color-background` `#f9f9f7` | page background |
| `--bg-elevated` | `--color-surface` `#ffffff` | cards, raised surfaces |
| `--bg-sunk` | `--color-surface-alt` `#f0f0ec` | wells, insets |
| `--fg` | `--color-text` `#1a1a18` | primary text |
| `--fg-muted` | `--color-muted` `#6b6b67` | secondary text |
| `--fg-subtle` | `#a4a49d` | placeholders, hints |
| `--fg-inverse` | `--color-accent-foreground` `#ffffff` | text on accent |
| `--border` | `--color-border` `#e2e2de` | hairlines |
| `--border-strong` | `#c7c7c1` | emphasized dividers |
| `--border-glass` | `rgba(26,26,24,0.08)` | glass edges |

## Accent (themeable — the re-skin surface)
`--accent` → `--color-accent` `#1d6f42` · `--accent-hover` `#185a36` · `--accent-soft` `#eef4f0` ·
`--accent-ink` `#114128` · `--fg-inverse` (on-accent text). **Per-shop / per-theme override** flows in
via `--color-accent` / `--shop-accent`; everything referencing `--accent` re-skins for free.

## Feedback (semantic + `-soft` background pair)
Each has a solid + a soft surface: `--energy` `#b04341` / `--energy-soft` · `--promo` `#95590c` /
`--promo-soft` · `--agent` `#1e3a5f` / `--agent-soft` · `--success` `#1d6f42` / `--success-soft` ·
`--warning` `#95590c` / `--warning-soft` · `--danger` `#b04341` / `--danger-soft` · `--info` `#1e3a5f`
/ `--info-soft`. (Strong variants exist where needed: `--success-strong`, `--success-ink`,
`--danger-strong`.)

## Scoped/component tokens (use the semantic layer first; reach here only for these contexts)
- **Embed surface:** `--embed-fg-muted` `#666`, `--embed-fg-subtle` `#888`, `--embed-surface-sunk` `#f3f4f6`.
- **Claim flow:** `--claim-accent` `#3a8a7a`, `--claim-accent-soft`, `--claim-accent-border`, `--claim-muted`.
- **Channel/supply surfaces:** `--surface-muted` `#f7f7f7`, `--surface-channel` `#fafafa`, `--surface-supply` `#f7f8f6`.
- **Agent code:** `--agent-code-fg` `#a8ffc4`.
- **Glass:** `--glass-fill[-warm/-deep/-liquid]`, `--glass-tint-accent/-energy/-agent`, `--glass-stroke[-accent]`, `--glass-blur[-soft]`.

## Elevation, motion, type
- **Shadows:** `--shadow-1..4`, `--shadow-press`, `--shadow-glow-accent/-agent/-danger` (focus rings).
  *(Themes/dark re-define `--shadow-*` to hairline borders — line ~298.)*
- **Motion:** easings `--ease-standard/-emphasize/-spring/-spring-soft/-out/-in`; durations
  `--dur-fast` 120ms / `--dur-base` 200ms / `--dur-slow` 320ms / `--dur-slower` 520ms.
- **Type:** `--font-sans`/`--font-display` (Space Grotesk), `--font-mono`; tracking
  `--tracking-tightest…-wide`, `--tracking-mono`. Type utilities (use these, don't hand-size):
  `.t-eyebrow .t-display .t-h1 .t-h2 .t-h3 .t-h4 .t-lead .t-body .t-small .t-caption .t-mono .t-price`.
- **Radii / spacing:** via Tailwind scale (`rounded-*`, spacing utilities) + the component primitives below.

## Component primitives (compose these before inventing markup)
`.btn` (+ `.btn-primary/-secondary/-ghost/-agent/-energy/-dark/-sm/-lg`), `.input`, `.chip`,
`.card-tile`, `.badge`, `.glass` (+ `.glass-liquid/-soft/-accent/-agent/-deep`). All reference the
semantic tokens above, so they re-skin with the theme.

---

## Locked vs. unlockable (the theme-override boundary) — #4 · US-2
What a seasonal theme or a per-shop brand **may** change vs. what stays fixed. Enforced by the shipped
seasonal engine's guardrails (`apps/miyagisanchez/lib/platform-theme.ts`); this is the product-source
statement of that boundary.

| **Unlockable** (a theme/shop may override) | **Locked** (never theme-overridable) |
|---|---|
| Brand marks (logo, wordmark) | Text tokens `--fg`, `--fg-muted`, `--fg-subtle` (readability) |
| Accent family (`--accent` + hover/soft/ink) | Fonts (`--font-sans/-display/-mono`) |
| Surfaces (`--bg`, `--bg-elevated`, `--bg-sunk`) within contrast guardrails | Layout grid, header height, safe areas |
| Background pattern / spot illustrations | Motion easings + durations (`--ease-*`, `--dur-*`) |
| Tagline / brand copy | Voice + icon rules (Iconoir), component-primitive structure |

**Guardrail:** any unlockable override still passes the **AA contrast check** (S3) — a theme cannot
ship a fg/bg pair below WCAG AA. Multi-theme palette library + designer submission portal remain
**out of scope** (future epics) — this contract is the foundation they'll build on.
