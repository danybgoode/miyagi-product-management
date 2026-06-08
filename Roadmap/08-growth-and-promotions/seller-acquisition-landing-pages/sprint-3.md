# Sprint 3 — Track B: Anchor + Creator system  ·  status: ✅ shipped 2026-06-07 (PR #44, merge `ea1ae07`)

> The **durable** track. Builds on the **#4 design-token contract** (wait for #4 to merge — avoid
> re-tokenizing a new system). Reuses the section system across pages so new personas are config +
> copy, not net-new layout. Depends on Sprint 1 creative + #4 tokens.

## Goal
A reusable landing-section system + the anchor page (with persona router) + the durable Local Creator
page — the permanent core of the supply funnel that outlives the World Cup.

## Stories
### US-3 — Reusable landing-section system ✅ built · commit `6bfa484`
**As** a maintainer, **I want** a shared section system, **so that** new persona pages are config +
copy, not new layout.
**Acceptance:** hero / diferenciadores-proof / cómo-funciona / prueba-social / objeciones / CTA
components built on **#4 tokens**; a persona takes a config object (copy, hooks, CTA target). A pure
seam (persona config resolve / UTM parse) extracted to `lib/` and unit-tested. Risk: low.

### US-4 — Anchor page + persona router ✅ built · commit `8e0fce1`
**As** supply-side traffic, **I want** an anchor page that routes me to my persona, **so that** I get
a pitch that fits me.
**Acceptance:** `/vende` renders the general supply promise + the trust spine + a **persona router**
(cards: "Soy creador/diseñador" · "Ofrezco experiencias/servicios" · …) routing to persona pages.
es-MX, mobile-first, agent-fetchable. Risk: low.

### US-5 — Local Creator & Designer page ✅ built · commit `911b359`
**As** a local creator/designer, **I want** a page that pitches "deja Shopify y los DMs," **so that**
I migrate my shop.
**Acceptance:** `/vende/creadores` on the section system; surfaces the **paste-from-Instagram import**
+ **own-storefront (subdomain/embed)** + **0% comisión** hooks; CTA → `/sell?from=creadores`. Risk: low.

## Sprint QA
- **Deterministic gate:** `tsc --noEmit` + `npm run build` green.
- **Specs:** one **anonymous browser smoke** per page (render + CTA navigation); one **`api`/pure-logic
  spec** on the extracted `lib/` seam (persona config / UTM parse) — free coverage per LEARNINGS.
- Perf pass; confirm pages use #4 tokens (no raw hex reintroduced — the #4 guard should catch it).

### Verification log (2026-06-07)
- `tsc --noEmit -p tsconfig.json` — green.
- Scoped ESLint on changed files — green. Full-repo `npm run lint` remains red on pre-existing unrelated
  errors outside this sprint's touched files.
- `npm run build` — green. Note: first sandbox run hit Turbopack's local-port sandbox restriction; reran outside sandbox.
- `npm run test:e2e` — green outside sandbox: 188 passed, 1 skipped. First sandbox run failed only on DNS to `miyagisanchez.com`.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3013 npm run test:e2e:browser -- e2e/seller-acquisition-anchor.browser.spec.ts e2e/seller-acquisition-creators.browser.spec.ts e2e/seller-acquisition-mundial.browser.spec.ts` — green outside sandbox: 3 passed.
- Post-merge production smoke: `PLAYWRIGHT_BASE_URL=https://miyagisanchez.com npm run test:e2e:browser -- e2e/seller-acquisition-anchor.browser.spec.ts e2e/seller-acquisition-creators.browser.spec.ts e2e/seller-acquisition-mundial.browser.spec.ts` — green: 3 passed.
- Social proof note: did **not** print the unconfirmed "160+ tiendas" claim. The public verified-seller route returned `count: 0`, and the all-seller admin route rejected anonymous access, so the page uses non-numeric trust/social proof until a safe count source exists.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: use the PR's Vercel preview URL pre-merge. After deployment, use `https://miyagisanchez.com`.

1. Open `{BASE_URL}/vende`.
   → The anchor page renders with "Vende lo que sea en Mexico. Sin comisiones.", the "preguntale a Claude" trust line, and persona cards.
2. Click "Soy creador o disenador".
   → You land on `{BASE_URL}/vende/creadores`.
3. Return to `{BASE_URL}/vende` and click "Empieza gratis".
   → You land on `{BASE_URL}/sell?from=vende` (UTM params are preserved if present).
4. Open `{BASE_URL}/vende/creadores`.
   → The Creator page renders with the Shopify/DM migration pitch.
5. Read the Creator proof cards.
   → You see the catalog/Instagram import hook and the subdomain/dominio/widget own-storefront hook.
6. Click "Trae tu tienda".
   → You land on `{BASE_URL}/sell?from=creadores` (UTM params are preserved if present).
7. Open `{BASE_URL}/vende/mundial`.
   → The shipped Sprint-2 World Cup page still renders and its CTA goes to `/sell?type=service&from=mundial`.
8. Resize `/vende` and `/vende/creadores` to mobile width.
   → Layout holds without horizontal overflow, clipped CTAs, or overlapping cards.
9. Ask Claude/Gemini/ChatGPT: `que es miyagisanchez.com/vende?`
   → The agent can fetch and summarize the supply-side pitch from semantic page text.

If any step fails, note the step number + what you saw — that's the bug report.
