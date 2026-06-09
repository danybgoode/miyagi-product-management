# Claude Design — Handoff & Prompts (Ask-Claude / "Mexico 26")

> **Status: DRAFT (2026-06-08) — uncommitted.** First-time guide for using **claude.ai/design** to produce the
> campaign creative. Three ready-to-paste prompts: the **pitch/creative deck**, the **"Mexico 26" trifold**,
> and **social ad tiles**. Source of truth for content: [`ask-claude-campaign-brief.md`](ask-claude-campaign-brief.md)
> + [`creative-variant-matrix.md`](creative-variant-matrix.md).

## What Claude Design is (quick orient)
A chat-on-the-left, canvas-on-the-right tool that generates designs, interactive prototypes, and presentations
from a conversation, **on your org's design system**, and exports to **PDF / PPTX / Canva / standalone HTML**,
or **hands off to Claude Code**. Research preview on your plan.

## Before you start (one-time)
1. **Check the design system.** Output is on-brand only if Miyagi's design system is set up in Claude Design
   (colors, type, components). If it isn't, do the "Set up your design system" step first, or just attach brand
   refs (below) so it has something to match. **Brand hints to give it:** primary green **#1d6f42**, name
   *Miyagi Sánchez*, tone **retro-punk / _This Is England_ subculture**, es-MX copy.
2. **One project per artifact** (deck, trifold, tiles) — don't mix them.
3. **Attach context** to each project (the more, the better):
   - `ask-claude-campaign-brief.md` and `creative-variant-matrix.md` (paste or upload).
   - 3–5 **screenshots of the live site** (`miyagisanchez.com`, a `/s/[slug]` shop, `/vende`) for brand feel.
   - Logo / favicon if you have it; any retro-'86 or _This Is England_ visual refs you like.
   - *(Optional)* link the frontend repo so prototypes use real components — link the **subdirectory**, not the
     whole monorepo (large repos lag).

## How to work it
- **Chat** for structure/big moves ("reorder the deck," "make it grittier"). **Inline comments** for pinpoint
  tweaks ("bigger QR here"). If a comment doesn't take, paste it into chat (known glitch).
- **Be specific**, start simple then layer, and **ask for 2–3 variations** to compare.
- Ask it to **review for accessibility/contrast** before exporting.
- **Export:** deck → **PPTX**; trifold → **PDF** (print) / standalone HTML (digital); tiles → PNG/zip;
  prototypes → **Handoff to Claude Code**.

---

## Prompt 1 — Pitch / creative deck
*(Paste into a new project. Audience default = featured designers / creators / partners + internal alignment;
change the audience line if it's for investors.)*

```
Create a 10–12 slide pitch deck for a Mexican marketplace campaign called "Mexico 26", in a retro-punk,
This-Is-England subculture style. Brand: Miyagi Sánchez, primary color #1d6f42 (green), es-MX copy, confident
and rebellious tone (anti-Bezos, pro-community). Audience: local creators, featured designers, and partners we
want to bring in.

Slides:
1. Title — "Mexico 26" + tagline "No nos creas, pregúntale a Claude."
2. The problem — sellers are told to trust platforms that take 8–20% commission.
3. The flip — don't trust us, ask your own AI (Claude/Gemini/ChatGPT). It's the independent auditor.
4. How it works — reader asks their AI about miyagisanchez.com → grounded answer → claim a free shop, 0%.
5. "Mexico 26" the magazine — a hidden-gems guide for World Cup visitors (food, tours, art, shows).
6. The hidden-gems mechanic — we pre-build claimable shops for featured gems; they claim them free.
7. The offer — 0% commission, free domain year 1, sell your tickets/tours directly.
8. Featured Designer program — one designer per Mexico match, with a merch tie-in.
9. Sample creative — 2–3 ad concepts using "¿No nos crees? Pregúntale a Claude."
10. How to join / be featured.
11. Timeline — World Cup window, Jun 11–Jul 19.
12. Contact / QR to miyagisanchez.com.

Use bold typography, a gritty editorial feel, and leave clear placeholders for QR codes and photos.
```

## Prompt 2 — "Mexico 26" trifold magazine (print)
*(New project. Carta size — 8.5×11 in, the Mexican standard, NOT A4.)*

```
Design a double-sided trifold brochure, Carta size (8.5 x 11 in, landscape, 3 panels per side = 6 panels),
for "Mexico 26" — a hidden-gems city guide for World Cup visitors to Mexico City. Style: retro-punk,
This-Is-England cultural-document zine, halftone textures, bold headlines. Brand: Miyagi Sánchez, green
#1d6f42, es-MX copy. Every gem entry has a QR placeholder linking to its shop.

Panels:
- Front cover: "Mexico 26 — las joyas escondidas" + "¿Solo conoces la Condesa y Coyoacán?"
- "¿Por qué miyagisanchez? Únete a la rev" — short manifesto (anti-commission, pro-community).
- Hidden gems grid: 4–6 entries (name, neighborhood, one line, QR placeholder) — food, tours, art, shows.
- Featured artist guest spread (placeholder for a surprise designer).
- "Pregúntale a Claude sobre Miyagi" — the trust-spine page with a pasteable prompt + QR.
- Back: founder's note placeholder + a small homage box "U. of Aberdeen / Scotland '26" + big QR to the
  digital magazine.

Make QR spots, photo wells, and the founder's-note text clearly marked as placeholders.
```

## Prompt 3 — Social ad tiles
*(New project. Generates a set you can adapt per platform.)*

```
Create a set of 6 social media ad tiles (square 1080x1080 + a 1080x1920 story version of each) for the
"Mexico 26" campaign. Brand: Miyagi Sánchez, green #1d6f42, retro-punk es-MX. Each tile = one bold headline +
a small "pregúntale a tu IA" prompt line + a QR placeholder + the @miyagisanchez handle. Headlines to use:
1. "¿No nos crees? Pregúntale a Claude."
2. "¿Solo conoces la Condesa y Coyoacán?"
3. "Del Chopo al mundo. 0% comisión."
4. "Tu changarro merece estar en la guía del Mundial."
5. "Lucha, tacos y mezcal — saca tus boletos directo."
6. "Esta es la vez que tu IA le baja el negocio a Bezos."
Give me 2–3 layout variations of the set.
```

---

## Also worth taking to Claude Design (later)
- **Persona landing-page prototypes** (new `/vende` variants) — prototype on-brand, then **Handoff to Claude
  Code** to build (ties to the #6 landing-pages epic + #4 tokens).
- **Featured-designer theme mockups** — visualize a per-match designer takeover before wiring `platform-theme`.

> **Note:** for the trifold, this is the **PrintAdBuilder-vs-Claude-Design** decision in the brief (§12). Try
> the trifold in Claude Design; if it nails it, that's the route (richer + exports PDF/PPTX).
