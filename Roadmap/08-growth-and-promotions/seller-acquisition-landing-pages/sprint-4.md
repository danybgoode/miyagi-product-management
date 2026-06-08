# Sprint 4 — More personas + SEO/OG + A/B hooks  ·  status: ✅ shipped to prod 2026-06-07 (PR #45 · merge `cfe04ef`)

> **Track B, low-hanging fruit after Sprint 3.** Once S3 ships the reusable section system, new
> persona pages are **config + es-MX copy**, not new layout — so this sprint is cheap. Builds on
> the #4 tokens + the S3 section system. All stories **low-risk** (marketing pages, no commerce).
> Depends on: **Sprint 3 merged** (the section system + anchor router).

## Goal
Round out the funnel: two more durable persona pages, proper per-page SEO/OG so the pages rank and
present well (incl. to agents), and a lightweight A/B layer to tune messaging.

## Stories
### US-6 — Local / brick-and-mortar merchant page
**As** a local business owner ("changarro" / boutique), **I want** a page that pitches going online
without complexity or margin loss, **so that** I open a shop.
**Acceptance:** `/vende/negocios` on the S3 section system; surfaces the **express migration / bulk
import** + **0% comisión** + **print edition** (México-86 magazine + QR bridge) hooks — the print
angle is the differentiator no Shopify/IG competitor has; CTA → `/sell?from=negocios`. es-MX,
mobile-first, agent-fetchable. **Risk: low.**
- *Hero draft:* *"Tu negocio de la esquina, ahora también en línea — y en la revista."*

### US-7 — Services professional page
**As** a services pro (tutor, belleza, oficios, reparación), **I want** a page that pitches easy
booking + payments, **so that** I list my service.
**Acceptance:** `/vende/servicios` on the S3 system; surfaces **service listing type** + **agenda
(Cal.com)** + **0% comisión** + cobra directo; CTA → `/sell?type=service&from=servicios`. **Risk: low.**
- *Hero draft:* *"Cobra y agenda sin complicaciones. Sin comisiones."*
- Add a "Servicios profesionales" card to the anchor router (S3) once this ships.

### US-8 — Per-persona SEO + OpenGraph
**As** organic/social traffic, **I want** each `/vende/*` page to present well in search + shares,
**so that** the pages actually pull traffic.
**Acceptance:** per-page `<title>`/meta description, canonical, and **OG image** for `/vende`,
`/vende/mundial`, `/vende/creadores`, `/vende/negocios`, `/vende/servicios`; pages added to
`sitemap.xml`; structured metadata so an agent fetch returns clean, summarizable content. **Risk: low.**

### US-9 — Lightweight A/B hooks
**As** a maintainer, **I want** to test headline/CTA variants, **so that** we tune conversion with
evidence.
**Acceptance:** a thin variant mechanism (a `?v=` param or a flag via the existing **`lib/flags.ts`**
Flagsmith layer — server-side; not Edge/middleware) that swaps the hero headline/CTA copy; the chosen
variant is tagged into **Microsoft Clarity** / the `?from=` attribution so conversion can be compared.
Default/fallback variant is the locked Sprint-1 copy (fail-safe). Pure variant-resolution logic
extracted to `lib/` and unit-tested. **Risk: low.**

## Sprint QA
- **Deterministic gate:** ✅ local `./node_modules/.bin/tsc --noEmit`; ✅ local `npm run build`;
  ✅ PR CI "Type-check + build"; ✅ PR CI "Playwright vs preview" against Vercel preview.
- **Specs shipped:** anonymous browser smokes for `/vende/negocios`, `/vende/servicios`, and the existing
  seller-acquisition pages; pure `api` spec for persona config + UTM + `?v=` variant attribution; API SEO
  spec for title/description/canonical/OG image + sitemap coverage.
- **Token guard:** ✅ `e2e/design-token-foundation.spec.ts` stayed green; OG fixed colors live behind the
  existing platform-theme color allowlist.

## Sprint 4 — Smoke walkthrough (do these in order)
Env: preview URL pre-merge · `https://miyagisanchez.com` once deployed.

1. Open `https://miyagisanchez.com/vende/negocios`.
   → The local-merchant pitch renders; you see the "y en la revista" (print edition) hook.
2. Open `https://miyagisanchez.com/vende/servicios` and tap the CTA.
   → You land on `/sell?type=service&from=servicios`.
3. Open `https://miyagisanchez.com/vende` (anchor).
   → The persona router now shows the "Negocio local" + "Servicios profesionales" cards too.
4. Share `/vende/mundial` in a chat app (or paste into an OG preview tool).
   → A proper title + preview image renders (not a blank/generic card).
5. Open `https://miyagisanchez.com/vende/creadores?v=b` (if a variant is configured).
   → The B-variant headline shows; Clarity logs the variant.
6. (Agent check) Ask Claude/Gemini: "¿qué es miyagisanchez.com/vende/negocios?"
   → The agent fetches + summarizes the local-merchant pitch.

If any step fails, note the step number + what you saw — that's the bug report.

## Sprint 4 — Smoke walkthrough log
Date: 2026-06-07 · build branch: `feat/seller-acquisition-sprint-4` · PR:
https://github.com/danybgoode/miyagisanchezcommerce/pull/45 · merged: `cfe04ef`.

Implementation shipped:
- US-6: `/vende/negocios` live on the S3 section system; CTA `/sell?from=negocios&v=<variant>`.
- US-7: `/vende/servicios` live on the S3 section system; CTA
  `/sell?type=service&from=servicios&v=<variant>`; anchor router now exposes local + services cards.
- US-8: per-persona metadata + generated OG images for `/vende`, `/vende/mundial`,
  `/vende/creadores`, `/vende/negocios`, `/vende/servicios`; all five are in `sitemap.xml`.
- US-9: server-side `?v=` resolver in `lib/seller-acquisition.ts`; invalid/missing variant falls back
  to locked Sprint-1 copy (`a`); `b` swaps hero/CTA copy and tags Clarity + CTA attribution.

Verified:
- Local: `./node_modules/.bin/tsc --noEmit` ✅; `npm run build` ✅.
- Local targeted Playwright: seller-acquisition pure seam ✅; design-token guard ✅; SEO spec module load ✅.
- PR CI: Type-check + build ✅; Playwright vs preview ✅.
- Deploy: Vercel production deployment for merge `cfe04ef` ✅ (GitHub status success at 2026-06-07 22:55 UTC).

Smoke limitation in this thread:
- Direct localhost Playwright could not run because the sandbox blocked `next start` port binding.
- Direct preview browser smoke could not run because Chromium launch failed before navigation
  (`MachPortRendezvousServer` permission denied).
- Direct production `curl` probes could not run because sandbox DNS failed and unsandboxed network probes were
  rejected by the environment usage limiter.

Pending human/Chrome-enabled smoke:
- Click through steps 1–6 above on `https://miyagisanchez.com` after the production deploy. The automated
  preview Playwright gate and production Vercel deploy are green; only the direct visual/manual walkthrough
  remains environment-blocked from this thread.
