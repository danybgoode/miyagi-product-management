---
status: shipped
slug: bookshop-launchpad
---

# Epic: Bookshop launchpad — writer submissions, community votes, and the 50%-print unlock

> **Area:** 03 · Selling & Shops · **Risk:** MED-HIGH (public upload + verified-vote surfaces + campaign automation; no new payout rails) · **Archetype:** Grower · **Scope doc:** [`00-ideas/2. readyforscope/bookshop-launchpad.md`](../../00-ideas/2.%20readyforscope/bookshop-launchpad.md)

**Tagline:** *La librería recibe manuscritos, la comunidad vota, y el libro ganador se imprime al 50%.*

## Why
Independent bookshops are a key persona. The launchpad loop: writers submit works to a shop →
the shop reviews and publishes them as **digital products** (shop-managed writer relationships,
no platform payout) → readers sample a free **excerpt** and buy → the shop runs a **voting
campaign** where a verified-vote threshold unlocks an auto-minted, product-scoped **50% coupon on
the print run** (a custom-print-products listing) — while regular-price book printing sells every
day through the same CPP configurator. Wattpad's intake energy + a launch mechanic, on rails that
already exist.

## Context
| | |
|---|---|
| **Role** | Writer (submit, no account), bookshop (review/publish/campaign), reader (sample/buy/vote), print shop (fulfill), shop's agent (MCP), admin (kill-switch) |
| **Macro-section** | 03 · Selling & Shops |
| **Risk** | S1 HIGH (public manuscript upload) · S3 HIGH (verified votes + coupon automation) |
| **Flag** | `launchpad.enabled` (submission portal + campaigns; fail-safe OFF) |
| **Decisions** | 2026-07-05 w/ Daniel: writer payout = shop-managed offline (rev-share = v2 seed) · reading v1 = excerpt + digital file (chapter reader = future epic) · campaign = sweepstakes spine + threshold→coupon |
| **Depends on** | CPP S2/S3 (variants + upload) before S3 links a real print product · OSPP S2 (collections) before S2.2 |
| **Bilingual** | es-MX only |

## Medusa-first note
The published work is a **native digital product** (private R2 digital bucket, existing delivery).
The print product is a **CPP listing** (manuscript upload field + size/binding variants + qty
tiers). The 50% unlock is a **seller coupon**, product-scoped, auto-minted (promoter grant-automation
precedent). Submissions + votes are **non-commerce → Supabase** (rule #2), mirroring sweepstakes'
entries tables; the submission→listing mint reuses the supply/gem pipeline's Medusa write path.
Campaign framing: vote-threshold ≠ chance-based prize, so not a SEGOB sweepstake — but keep the
conservative compliance-gate posture; **plan mode confirms the framing** (rule: escalate, don't guess).

## What already exists (reuse, don't rebuild)
- **Digital products** — listing type, private bucket, re-download, instant-delivery PDP block.
- **CPP (in flight)** — file upload + variants + qty tiers + proof flow = the print-a-book product.
- **Sweepstakes** — public `/g/[slug]` + QR, email-code verification, automation + notifications, global kill-switch — the voting spine.
- **Seller coupons** + promoter auto-grant/mint precedents (threshold → scoped coupon).
- **Editorial queue** (print edition) — review/approve/request-changes pattern.
- **Supply/gem pipeline** — staged intake → real Medusa product mint; no-Clerk upload route + rate limits.
- **OSPP** — collections (the launchpad shelf), hero (feature the campaign), content pages (convocatoria rules).
- **Granular notifications** — writer/voter emails ride existing channels.

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Public submission portal per shop (`/s/[slug]/convocatoria`: form + manuscript upload + email-code verify + rate limits; opt-in setting) | HIGH |
| 1 | 1.2 Review queue in the seller shell (approve / reject / request changes + es-MX transition emails) | MED |
| 1 | 1.3 One-click "publicar como producto digital" (draft mint under the shop; manuscript → private bucket) | MED |
| 2 | 2.1 Excerpt field + inline "Lee un adelanto" sample viewer on digital PDPs | MED |
| 2 | 2.2 Launchpad shelf: auto-suggested OSPP collection; hero-able; UCP exposes excerpt presence | LOW |
| 3 | 3.1 Campaign builder: works + threshold + end date + reward (coupon % + linked CPP print product); admin kill-switch | MED |
| 3 | 3.2 Public campaign page `/v/[slug]` + QR: excerpts, one verified vote per email per work, live progress; white-label | HIGH |
| 3 | 3.3 Threshold/end automation: auto-mint product-scoped coupon, notify voters/writer/seller; honest unmet-threshold close | HIGH |

## Deploy order
S1 → S2 → S3. `launchpad.enabled` OFF until Daniel's S1 smoke; campaign surface additionally gated
until the S3 smoke. Cross-epic: CPP S2/S3 merged before S3 links a print product; OSPP S2 before S2.2.

## Definition of Done (epic)
- [x] All sprints merged to `main` (S1 `b6eca090` · S2 `a398d98` · S3 BE `3c0b8c7` + FE `02e12db`) — **smoke owed** to Daniel (real-device vote→coupon→redeem money path; flag OFF so nothing is live-facing)
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; sprints ticked with commit refs
- [x] `RETROSPECTIVE.md` · poster · memory · learnings all updated
- [x] Kill-switch `launchpad.enabled` exists with stated polarity (enablement, default OFF; fail-safe)
- [x] Legal framing of vote-unlock confirmed (threshold ≠ chance → not a SEGOB sweepstake; conservative posture kept — see sprint-3.md)
- [x] Feature branches deleted (BE + FE); frontmatter `status: shipped` (ran `node scripts/build-order.mjs`)

> **Owed at close (not blocking merge — feature is dark):** Daniel's real-device money smoke (sprint-3.md walkthrough) + flip `launchpad.enabled` ON in `/admin/flags` after it passes.

## Fast follows — found during panfleto's first live use (2026-07-12, not blocking)
Daniel's UX feedback submitting the two seed manuscripts for `panfleto-premium-shop` S3. Both are
scoped to the shared launchpad submission form (`app/(shell)/s/[slug]/convocatoria/ConvocatoriaClient.tsx`)
— applies to every shop, not panfleto-specific. Noted for a future grooming pass, not built now.

1. **Género should be a constrained dropdown, not free text.** Today it's an optional
   `<input maxLength={60}>` with a placeholder example ("Novela, cuento, poesía…") — genuinely free
   text, no validation, easy to get inconsistent values across submissions. Should become a
   `<select>` with a shop-defined (or platform-default) list of genre categories matching what the
   convocatoria's own guidelines advertise (e.g. this call is horror-only — the dropdown should
   reflect that, not offer unrelated genres). Small, low-risk, contained to one component + its
   submit payload.
2. **Let a writer type/paste their story directly instead of file-upload-only.** Today `manuscript`
   is a required `<input type="file" accept="PDF,EPUB,DOCX">` — Daniel had to create a local file
   before he could submit, for what turned out to be two short pieces. A textarea alternative (paste
   or write in-browser, then store as plain text / a generated .txt or .md, same private-bucket path
   the file upload already uses) would remove that friction for short-form submissions. **Evaluated
   whether `smalldocs` (the render engine scaffolded for `pmo-operational-reports`,
   `09-platform-infra/pmo-operational-reports`) fits as the engine here — it doesn't, directly.**
   smalldocs is a markdown-**in** → PDF/docx/slides/Excel-**out** *rendering* engine, not an
   in-browser rich-text *editor*; "let someone type text in a box" needs nothing more than a
   `<textarea>` + persisting the text (the manuscript storage path already handles arbitrary file
   bytes, so plain text is a strict simplification, not a new capability). Where smalldocs could
   plausibly add value is a stretch, separate idea: rendering a nicer-formatted reading version from
   pasted markdown for the "Lee un adelanto" excerpt — genuinely optional polish, not a dependency
   for the core ask. Ship the textarea path independent of whether/when the PMO smalldocs instance
   exists.

Neither item is scoped into a sprint yet — surface at the next grooming pass for this epic or fold
into a small standalone chore.
