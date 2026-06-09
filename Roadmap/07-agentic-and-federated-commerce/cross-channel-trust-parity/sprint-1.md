# Sprint 1 — Wire `<TrustSignals>` across the white-label channels

> **Epic:** [Cross-channel Storefront Trust Parity](README.md) · **BUILD-ORDER:** #3c · Epic D ·
> **Status: 📋 PLANNED — ⛔ blocked-by Epic C Sprint 2 (C.4).** Do not start until C.4
> (`<TrustSignals>`) is merged to `main`. Branch: `feat/cross-channel-trust-parity` off latest `main`.
> **All stories LOW / LOW–MED — reviewer may merge on green CI; D.2 announce + PR first.**

---

## 📥 C.4 CONTRACT — HANDED OFF (Epic C Sprint 2, 2026-06-09)

`<TrustSignals>` is **built** on branch `feat/trust-messaging-polish-s2` (Epic C S2; PR pending → merges
to `main`). Wire against this contract. **Two corrections vs. the stories below** — read before building.

**Files** (both land on `main` when C.4 merges):
- `app/components/TrustSignals.tsx` — presentational, no `'use client'` (composes in Server Components).
- `lib/trust-signals.ts` — pure selector `selectTrustSignals()` + `trustChannelBucket()` + `TRUST_COPY`.

**Props contract:**
```ts
import type { ChannelSource } from '@/lib/channel'
interface TrustSignalsProps {
  channel?: ChannelSource            // 'marketplace'|'custom_domain'|'subdomain'|'embed'|'api'; default 'marketplace'
  variant?: 'full' | 'slim'          // full = PDP block (pills + method grids); slim = capsule; default 'full'
  paymentMethods: { icon; label; note }[]
  fulfillmentMethods: { icon; label; note }[]
  processingLabel: string | null
  returnsLabel: string | null
  verified?: boolean                 // slim only — shop.verified
  paymentProtected?: boolean         // slim only — any online card rail (Stripe/MP)
  consultCta?: ReactNode             // full only — PDP "precio a consultar" slot (ignore for D)
  interstitial?: ReactNode           // full only — PDP mobile SellerTrustCard slot (ignore for D)
}
```

**⚠️ Correction 1 — `channel` value.** The stories below write `channel="channel"`; that is **not** a
valid `ChannelSource`. Pass the real detected value: **`channel="custom_domain"`** (or `"subdomain"`) for
D.2, **`channel="embed"`** for D.1 — i.e. pass `detectChannel(req)` / the `x-miyagi-channel` value straight
through. `trustChannelBucket()` collapses `custom_domain`+`subdomain` → `off_platform` for you.

**⚠️ Correction 2 — the component is PRESENTATIONAL; it does NOT derive the data.** `<TrustSignals>` takes
already-computed `paymentMethods` / `fulfillmentMethods` / `processingLabel` / `returnsLabel` / `verified` /
`paymentProtected`. That derivation lives **inline in the PDP** (`app/l/[id]/page.tsx`, the block that
builds `paymentMethods`/`fulfillmentMethods` from `shop.metadata.settings`, ~L105–185). For D.1/D.2 you must
compute the equivalent inputs from the shop settings your surface already loads. **Both D.1 and D.2 need the
same derivation → consider extracting a small pure `lib/trust-inputs.ts` deriver (shop settings → the props
above) as your first D story**, so D.1/D.2 stay pure wiring. (C.4 deliberately did not extract it — it kept
the PDP refactor parity-tight; doing it from the shop-settings shape is your call.)

**Parity-first today.** Every channel currently renders the same signals (C.4 is a no-regression PDP
refactor). The `channel` prop + `trustChannelBucket()` are the hook you flip to differentiate per channel.
The slim variant already emits a **`Pago protegido`** chip when `paymentProtected` — D.2's fuller
*"Pago seguro · Compra protegida"* assurance strip is D-side positioning around the component.

**Pure-logic coverage already exists** in `e2e/trust-signals.spec.ts` (selector + buckets + parity) — D
adds only browser smokes. `ChannelLayout` was **not** touched by C.4 (that wiring is yours).

---

Sprint goal: a buyer reaching a shop off-marketplace — embed, custom domain, or subdomain — sees the
same trust signals the marketplace shows, plus a subtle platform-backed assurance, by **rendering Epic
C's `<TrustSignals>` component** in the two surfaces that still lack it. No new component, no backend
change.

---

## D.1 — Embed shop-grid trust parity

> **As a** buyer browsing a shop embedded on a third-party site,
> **I want** to see the shop's verification badge and payment / returns / pickup signals,
> **so that** the embedded storefront feels as trustworthy as the marketplace listing.

**Build:** render `<TrustSignals channel="embed">` (Epic C / C.4) on the embed shop grid
(`app/embed/s/[slug]/page.tsx`), fed by the same `shop.metadata.settings` the page already loads. Match
the slim embed visual density; don't reintroduce platform chrome.

**Acceptance (Daniel-runnable):**
- Open an embed shop grid (`/embed/s/[slug]`) for a verified shop with returns + pickup configured →
  the ✓ Verificado badge + the payment / returns / pickup signals render, matching the marketplace shop page.
- A shop with none of those configured → no empty/placeholder trust block (the component renders nothing).

**Risk: LOW** — presentational, embed surface, consumes C.4. Reviewer may auto-merge on green CI.
**QA:** anonymous browser smoke asserting the badge + signals render on `/embed/s/[slug]`.

---

## D.2 — White-label shell trust + subtle platform-assurance strip

> **As a** buyer on a seller's own domain or subdomain,
> **I want** to see the shop's trust signals plus a discreet "pago seguro · compra protegida" assurance,
> **so that** I trust the purchase even though I'm off the marketplace and may not know Miyagi.

**Build:** render `<TrustSignals channel="channel">` inside `ChannelLayout`
(`app/s/[slug]/ChannelLayout.tsx`) — covering custom domain + subdomain via `app/layout.tsx:359` — and
the embed shell, including the subtle es-MX *"Pago seguro · Compra protegida"* payment-protection facet
(Daniel's "subtle assurance" call). Keep it discreet/neutral; it is assurance, not platform navigation.
Prefer rendering off the `whiteLabel` flag so subdomains are covered (see the subdomain nuance in the
scope doc).

**Acceptance (Daniel-runnable):**
- Visit a live custom domain and a subdomain (`<shop>.miyagisanchez.com`) → the shell shows
  `<TrustSignals>` + the subtle "Pago seguro · Compra protegida" strip; seller branding is intact and
  the strip reads as discreet assurance, not Miyagi chrome.
- The embed shell shows the same strip.
- Disconnecting the custom domain reverts cleanly (no orphaned platform strip on the marketplace render).

**Risk: LOW–MED** — **touches shared `ChannelLayout`** (every white-label render). **Announce the change
before building, ship via PR (not direct-to-`main`).** No money/auth/fulfillment path. Reviewer may
auto-merge on green CI after the announce, or Daniel merges given blast radius.
**QA:** anonymous browser smoke across a host-/channel-simulated request (`x-miyagi-channel=custom`) +
the embed shell; the **live subdomain + custom-domain cosmetic look is owed to Daniel**.

---

## Sprint QA
- **Deterministic gate (must be green before merge):** `tsc --noEmit` + `npm run build` + Playwright
  `api` suite.
- **Pure-logic coverage lives in C.4** (the trust selector spec) — Epic D adds none; D is wiring.
- **One new anonymous `*.browser.spec.ts`** asserts `<TrustSignals>` renders on the embed grid + the
  white-label shell (channel-header-simulated) — no auth, works on the preview.
- **Owed to Daniel (cosmetic, not a money path):** a real-eyes look at a live subdomain + custom domain
  confirming the strip reads well and doesn't clash with seller branding.

## Sprint 1 — Smoke walkthrough (do these in order)
> _Placeholder — the building agent fills this with real preview/prod URLs + the exact shop slug before
> calling the sprint done (groom Stage 8b). Format: numbered, one action + one expected result per step._

Env: production · https://miyagisanchez.com (or the branch preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com/embed/s/<test-shop>` (a verified shop with returns + pickup set).
   → The grid shows the ✓ Verificado badge + payment/returns/pickup signals.
2. Open `https://<test-shop>.miyagisanchez.com` in a private window.
   → The white-label shell shows `<TrustSignals>` + a discreet "Pago seguro · Compra protegida" strip; seller branding intact.
3. Open the shop's live custom domain (if set) in a private window.
   → Same as step 2 — strip present, no Miyagi navigation chrome.
4. Open `https://miyagisanchez.com/s/<test-shop>` (marketplace render).
   → No change vs today (the platform strip does not appear on the marketplace render).

If any step fails, note the step number + what you saw — that's the bug report.
