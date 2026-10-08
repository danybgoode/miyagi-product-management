---
title: "Navigation, recovery, and welcome finishing"
slug: navigation-recovery-welcome-finishing
status: scaffolded
area: "01"
type: bug
appetite: S
underwritten_by: wave-2026-10
risk: low
epic: "01-discovery-and-shopping/navigation-recovery-welcome-finishing"
build_order: 7
updated: 2026-10-08
intent_ask: verbatim
hypothesis: null
target_metric: null
target_from: null
target_to: null
read_date: null
flag_key: null
intent_match: 86
---

# Pitch — Navigation, recovery, and welcome finishing

Moves · Tests: not grounded — no `Roadmap/00-strategy/` yet.

## The ask, as given

> Hi codex, help me groom and then build the next asks:
> Dropdown menu is aligning to the left. See screenshot in references/favourites-art-display.png
>
> custom error pages, basic styling at least to match brand and voice with clear actions for users to resume navigating easily.
>
> Implement welcome emails, only these ones with the modifications outlined:
> Shop claimed · MX (In that template lets change a bit the copy. Instead of: Tu tienda ya es tuya, lets do SHOP_NAME ya es tuya en Miyagi sánchez)
> New account welcome. The copy is ok
>
> Review the work done previously also by codex, i believe the welcome emails were prepped already. Let me know if not. They are also in render as templates if you need to check, the render cli is authed, so as many other tools visa cli which is preferred for you to interact with if needed.
>
> The grooming plugin has been updated a lot lately, see if you can update its installation first or if we are already all caught up. The repo is: https://github.com/danybgoode/golden-frijoles

### Claims

1. The account dropdown shown over Favoritos should align with its trigger near the right edge.
2. 404 and runtime error pages should use the product's visual language and offer usable recovery actions.
3. Only the MX shop-claimed headline changes to include the escaped shop name; new-account welcome copy stays as prepared.
4. The prior welcome implementation and review templates need an honest status report.

**Teach-back:** not separately answered — the requested outcome is an aligned menu, useful recovery pages, and the two specified welcome emails with only the MX headline changed.

## Problem

The menu appears against the viewport's left edge in the supplied screenshot. A missing route has a bare 404 and unexpected rendering errors have no branded recovery boundary. The prior welcome work exists on an unmerged feature branch, so its status and source of copy need checking before further email work.

## Appetite

S — one fixed-scope builder session. No new email sequence, transport, or feature flag.

quote: $5–40 (S, n=0, wide)

## Outcome & signal

The owner can open the desktop Cuenta menu over Favoritos and see it beside the trigger; visit a missing route and find browse/home/contact actions; see a retry action for a runtime failure; and review the MX shop-claimed headline with the shop name inserted safely. The general welcome message remains the same.

## Stage-2.5 bucket

**Light enhancement.** The account popover, global 404, email send functions, Clerk webhook, claim completion hook, and unpublished Resend review drafts already exist. Error boundaries are the one new UI surface.

## Bill of materials (What / Why)

| What | Why |
|---|---|
| Correct native popover insets and margins | Place the menu beside the account control. |
| Shared 404/500 recovery design | Give people a clear next action when navigation fails. |
| MX claim headline substitution | Name the shop that was claimed; preserve the approved account welcome copy. |
| Review the send path and template status | Distinguish implemented app behavior from unpublished Dashboard drafts. |

## Scope

**In v1:** Desktop account-menu placement; channel-safe 404 and runtime/root-layout error surfaces; the MX claim headline in code; status of the two welcome sends and the Resend drafts.

**Out of v1 (no-gos):** Other transaction templates, campaign invitations, broadcast sending, new flags, new email copy for the account welcome, and database changes.

## Rabbit holes

- Native Popover's user-agent `inset: 0; margin: auto` can defeat the right anchor even when CSS anchor positioning is supported. Clear opposing insets and auto margins, then check actual browser geometry.
- The app has multiple root layouts and custom-domain channels. Recovery UI must work without a platform header and browsing must reach the canonical platform from a merchant domain.
- Resend review Templates are unpublished and are not the app's send source. The app key is send-only; the root `.env.local` has template-manager access.

## What already exists (reuse, don't rebuild)

- `apps/miyagisanchez/app/components/CuentaMenu.tsx` and `app/globals.css` — native account popover and anchor rules.
- `apps/miyagisanchez/app/not-found.tsx`, `lib/contact.ts`, `lib/shortlink.ts` — 404, human contact, and canonical platform origin.
- `apps/miyagisanchez/lib/email.ts` — both welcome sends; `app/api/webhooks/clerk/route.ts` and `app/api/claim/complete/route.ts` trigger them; `lib/notifications/fixtures.ts` supports sample sends.
- `apps/miyagisanchez/campaigns/claim-shop-2026-10/README.md` — links the unpublished Resend review drafts.

## Visuals

```surface
state: recovery-error
route: /missing-route
- head "No encontramos esta página" action "Explorar anuncios"
- note "El enlace pudo cambiar o el anuncio ya no está disponible."
- link "Ir al inicio"
- link "Escríbenos"
```

## UX heuristics & rails check

- **CI guards covering this surface:** Frontend TypeScript, ESLint, Next build, `e2e/contact-address.spec.ts`, `e2e/cuenta-menu-native.spec.ts`.
- **Audits-lens findings that apply:** None specific to the account popover or global recovery pages in `Roadmap/00-ideas/audits/`.
- **Design-language debt:** Existing 404 lacked the shared forest-green/paper/ink treatment and clear action hierarchy.

## Acceptance criteria

- **As a signed-in buyer, I want** the Cuenta menu aligned to its trigger, **so that** I can reach account actions without searching the left edge. **Risk:** low. **QA:** Chromium geometry check and account-menu specs; owner screenshot comparison.
- **As a visitor on a broken link or failed page, I want** clear recovery actions, **so that** I can resume browsing. **Risk:** low. **QA:** production build, local browser 404 smoke and link check; owner visual smoke. A runtime error shows retry.
- **As a merchant claiming a shop in MX, I want** the confirmation to name my shop, **so that** I recognize the email. **Risk:** low for this copy change. **QA:** code review of HTML escaping, welcome path inspection, and sample email before live send. The new-account copy is unchanged.

## Open risks / research

- The prior account welcome and shop-claimed sends are implemented only on the current local feature branch; they are not live until that branch is integrated and deployed. The MX Resend Dashboard review draft now has the new headline and remains unpublished. The app sends code-rendered HTML.
- Next.js 16 error boundaries must be client components; `global-error.tsx` supplies its own document tags when a root layout fails. Source: https://nextjs.org/docs/app/api-reference/file-conventions/error

## Intent match

_Advisory and uncalibrated (intent-match D1, D3): it can add a step, never block one. Regenerate with `node scripts/intent-match.mjs <this seed> --write`._

```text
Intent match — Roadmap/00-ideas/seeds/navigation-recovery-welcome-finishing.md
  coverage in   0.95  (4 claims)
  coverage out  0.95  (3 criteria)
  clarity       0.68  (3 criteria)
  teach-back    —     (not recorded)
  agreement     pending  (the optional reader at the architecture lock)
Total 86 / 100 — uncalibrated · signals: coverage in, coverage out, clarity
Band: build (placeholder bands: 80 build · 60 resolve follow-ups · below 60 sketch or spike)
Gaps: none
```

<!-- intent-match: {"coverage_in":0.953,"coverage_out":0.953,"clarity":0.678,"teach_back":null,"total":86} -->
