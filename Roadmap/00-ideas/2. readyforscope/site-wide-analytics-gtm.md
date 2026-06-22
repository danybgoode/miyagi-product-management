# Site-wide analytics — GTM container (GA4 + Clarity)

**Status: awaiting Daniel approval — no code yet.**
Macro-section: **09 · Platform & Infra**. Slug: `site-wide-analytics-gtm`.
Class: **Chore** — frontend analytics instrumentation. No buyer/seller/agent capability change.
**Supersedes:** the orphaned, never-built **Sprint 4 of the archived `neon-egress-and-db-isolation` epic**
("Site-wide Clarity loader + UTM") — its Clarity-loader + stale-comment scope is folded in here.

## Mirror-back
> You want Google Analytics (GA4) **and** Microsoft Clarity running across the site, loaded through a **single
> Google Tag Manager container** so tags are managed in the GTM console without redeploys. Right?

## Daniel's grooming calls (2026-06-22)
1. **One GTM container** — load GTM site-wide; configure **GA4 + the Microsoft Clarity tag inside GTM**
   (no separate Clarity snippet in code).
2. **Consent out of v1** — ship analytics now; a cookie-consent banner + LFPDPPP review is a separate epic
   (optionally set GTM **Consent Mode** defaults as a lightweight nod).
3. **Load on all platform surfaces incl. the seller dashboard** — public marketplace, checkout, `/shop/manage`,
   account. *(Recommended boundary, confirm: still exclude seller white-label domains/subdomains + the embed
   widget — see open question 1.)*

## Stage-2.5 bucket — **light enhancement (one loader + a pure gate), half already designed**
The Clarity half is a **re-home** of an approved-but-unbuilt sprint (neon-egress S4). The GA/GTM half is
net-new but shares the same loader seam, gating, and api-spec pattern. With the single-GTM decision, "install
Clarity" is **zero extra code** — it's a tag configured inside GTM; the container loader covers both.

## Current state (validated against the repo 2026-06-22)
- **Clarity is NOT installed** — no base loader anywhere. `/vende`'s `SellerAcquisitionVariantTag` fires
  `window.clarity?.('set', …)` which **no-op** today; the Clarity dashboard shows **~1 session / 30 days**.
  (The Clarity *MCP* is connected, but the site sends it nothing.)
- **No GA / GTM** anywhere in the codebase.
- `lib/print-qr.ts` carries a **stale comment** claiming analytics is "tracked in GA/Clarity" — false until this ships.
- **Static/dynamic split just landed** (marketplace-static-shell S1, merged): `app/(site)/` is deliberately
  **static** (no `headers()`, to kill the per-request homepage function); `app/(shell)/` is dynamic and does
  the channel/theme gating via `headers()` + `PlatformThemeScript`. **Constraint:** the analytics loader must
  **not** reintroduce `headers()` into the static `(site)` subtree, so gating is done **client-side**
  (hostname + pathname), not via server headers.

## What already exists (reuse, don't rebuild)
| Capability | Where | Reuse for |
|---|---|---|
| The approved Clarity-loader design + api-spec shape + stale-comment fix | `Roadmap/09-platform-infra/neon-egress-and-db-isolation/sprint-4.md` | This epic's backbone — fold it in, update for single-GTM + the static-shell constraint |
| Root layout (html/body) — where a site-wide loader belongs | `app/layout.tsx` | Mount the client `<SiteAnalytics>` loader here so it covers `(site)` + `(shell)` without forcing dynamic render |
| Client-side script-injection precedent (before-paint, channel-aware) | `app/components/PlatformThemeScript.tsx` (seasonal/theme pattern) | The injection idiom; adapt to client-gated GTM |
| Existing Clarity custom tags (null-safe) | `app/(shell)/vende/_components/SellerAcquisitionVariantTag.tsx` (`window.clarity?.('set',…)`) | They start attributing the moment the GTM-loaded Clarity tag defines `window.clarity` — no change needed |
| Channel detection (server) for reference | `app/(shell)/layout.tsx` (`x-miyagi-channel` custom/subdomain, `x-miyagi-embed`) | The semantics to mirror **client-side** in the pure gate (hostname → white-label; `/embed` → embed) |
| "pure `lib/` seam + api spec; browser smoke owed to Daniel" pattern | `LEARNINGS.md`, `e2e/nav-entry-points.spec.ts` | The gate is a pure function with unit coverage; real GTM firing is a Daniel smoke |

## Medusa-first reframe (AGENTS five-rule check)
**N/A — zero commerce surface.** Rules 1–3 (Medusa / Supabase / UCP-MCP) untouched. Rule 4 (Clerk)
untouched. Rule 5 (bilingual) N/A — no user-visible copy (loader is invisible; the only strings are an
env-driven container id). Consent UI (which *would* need bilingual copy) is explicitly out of v1.

## In scope (v1)
- A **single GTM container loader site-wide**, mounted once via a client `<SiteAnalytics>` component in
  `app/layout.tsx`. Container id from **env** (`NEXT_PUBLIC_GTM_ID`), no hardcoded id. GA4 + Clarity are
  configured as **tags inside GTM** (operational, not code).
- A **pure client-side gate** `lib/analytics-gating.ts` `shouldLoadAnalytics({ hostname, pathname })` →
  loads on platform surfaces (incl. `/shop/manage`, checkout, account); **excludes** seller white-label
  (custom domain + `*.miyagisanchez.com` subdomain) and the **embed** widget (`/embed/*`). Static-safe
  (client-only; no `headers()` in `(site)`).
- **Fix the stale `lib/print-qr.ts` comment** to reflect reality (analytics now loaded site-wide via GTM).
- **api/unit spec:** the pure gate's in/out fixtures (load on marketplace/dashboard; skip white-label/embed) +
  a loader-marker assertion where SSR-observable.

## Out of scope (v1)
- **Cookie-consent banner + LFPDPPP review** — separate epic. (May set GTM Consent Mode *defaults* here as a
  lightweight nod; the UX/storage/bilingual banner is out.)
- **Configuring the GA4 property + Clarity tag inside GTM** — operational (GTM console), owed to Daniel; this
  epic ships the *container loader*, not the tag config.
- **Server-side / Measurement Protocol events, custom GA4 events beyond what GTM auto-collects, dashboards.**
- **Renaming/replacing** the existing `/vende` clarity custom tags — they keep working as-is.

## Slicing — skateboard → car (1 sprint, LOW)
Branch `chore/site-wide-analytics-gtm` (frontend repo only). QA = pure-logic spec on the gate (free) + the
loader-marker api assertion; real GTM/GA/Clarity firing is a **browser smoke owed to Daniel** (needs the live
container id + the consoles).

### Sprint 1 — GTM container, site-wide & static-safe · **risk: LOW**
- **S1.1 — Pure gating lib + unit spec.** `lib/analytics-gating.ts` `shouldLoadAnalytics({hostname,pathname})`:
  true on the platform host (incl. dashboard/checkout/account), false on a custom domain / `*.miyagisanchez.com`
  subdomain / `/embed/*`. *Acceptance:* fixtures cover each case. *QA:* pure `lib/` spec (no network).
- **S1.2 — `<SiteAnalytics>` GTM loader in `app/layout.tsx`.** Client component: reads `location`, calls the
  gate, injects the **single GTM container** (env id) when eligible; emits a marker attribute. No `headers()`
  → `(site)` stays static. *Acceptance:* on the public marketplace + `/shop/manage`, GTM initializes
  (`window.dataLayer`/`google_tag_manager` present); on `/embed/*` and a white-label host it does **not**.
  *QA:* browser smoke owed to Daniel (live container id); the gate logic is covered by S1.1.
- **S1.3 — api spec + stale-comment fix.** Assert the loader marker is present in the public root render and on
  the dashboard, and the gate excludes embed/white-label; correct the `lib/print-qr.ts` comment. *Acceptance:*
  spec green; comment matches reality. *QA:* Playwright `api` + grep.

**Operational (owed to Daniel, post-merge):** create/confirm the GTM container; add the GA4 config tag + the
Microsoft Clarity tag inside GTM; set `NEXT_PUBLIC_GTM_ID` in Vercel; then verify GA4 realtime + the Clarity
dashboard start recording and `/vende` `seller_acquisition_*` tags land.

## Risk tier (WAYS §6 / groom Stage 6)
**LOW** — additive client-side script; no commerce/money/auth/DB. **Two caveats to announce in the PR**
(LEARNINGS — cross-cutting): (1) it edits the **shared `app/layout.tsx`**, which can affect sibling PRs; and
(2) the **marketplace-static-shell** epic is mid-flight — the loader must keep `(site)` static (client-gated,
no `headers()`); coordinate so the two don't collide.

## Open questions (validate before/at the sprint — don't assume)
1. **White-label + embed exclusion (gating):** you chose "everything incl. dashboard" — confirm that still
   **excludes** seller white-label domains/subdomains and the embed widget (recommended: yes — the platform
   shouldn't inject its GTM onto a seller's own domain or a third-party embed host). If you actually want
   analytics there too, say so (it changes the gate + has privacy implications).
2. **GTM container provisioning:** do you already have a GTM container + GA4 property, or should that be created?
   Either way the **container id is operational** (env var) — confirm who sets it.
3. **Consent Mode defaults:** set GTM Consent Mode defaults (analytics_storage denied→granted scaffolding) now,
   or leave entirely to the future consent epic? (Cheap to include; affects how GA cookies behave pre-consent.)
4. **neon-egress S4 pointer:** OK to add a one-line "superseded by `site-wide-analytics-gtm`" note to that
   archived sprint doc for hygiene? (Optional.)

## Research note
GTM/GA4/Clarity are stable, well-documented surfaces; no load-bearing recent-change risk. The one current
reality that *did* change under the original (neon-egress S4) design is **internal**: the static `(site)` /
dynamic `(shell)` split, already read for this doc — hence the client-gated, static-safe loader.

## Definition of Ready — checklist
- [x] "As a / I want / so that" clear; acceptance testable by Daniel (GTM/GA/Clarity record on prod; off on
      embed/white-label; `/vende` tags land).
- [x] Stage-2.5 bucket named (light — one loader + pure gate; Clarity half already designed).
- [x] v1 in/out boundary written (consent UI, GA4/Clarity tag config, custom events all out).
- [x] Reuse list produced (neon-egress S4 design, root layout, PlatformThemeScript idiom, existing /vende tags).
- [x] Risk-tiered (LOW); QA stage named (pure gate spec + marker api assertion; real-firing smoke owed to Daniel).
- [ ] **Daniel approves this scope doc** → then scaffold the epic + 1 sprint doc and emit the kickoff.
