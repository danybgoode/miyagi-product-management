---
status: readyforscope
slug: bookshop-launchpad
macro: 03-selling-and-shops
class: feature
archetype: Grower
risk: MED-HIGH — submission portal (public upload surface) + campaign→coupon automation; no new payout rails in v1
---

# Bookshop launchpad — writer submissions, community votes, and the 50%-print unlock

> Scoped 2026-07-05 from Daniel's raw ask (3 decisions resolved — see *Decisions*). The independent-
> bookshop persona play: a shop runs a Wattpad-style intake (writers submit works, the shop publishes
> them as digital products) plus launch campaigns where community votes unlock a discounted print
> run — while the shop (or miyagiprints) also sells regular-priced book printing via the
> custom-print-products configurator.

**Tagline:** *La librería recibe manuscritos, la comunidad vota, y el libro ganador se imprime al 50% — todo en la tienda de tu barrio.*

## Actors & actions
| Actor | Actions |
|---|---|
| **Writer** | Submit a work to a shop (manuscript file + synopsis + author info) · track status · see it published · rally votes for the print unlock |
| **Bookshop (seller)** | Open/close submissions · review queue (approve/reject/request changes) · publish as digital listing under the shop · attach a free excerpt · launch a voting campaign with threshold + reward · fulfill print (or route to miyagiprints) |
| **Reader/buyer** | Read the excerpt · buy the digital work · vote (email-verified) in campaigns · redeem the unlocked print discount |
| **Print shop (miyagiprints)** | Sell regular-price book printing (CPP configurator product: page count/size/binding × qty tiers + manuscript upload) · fulfill the discounted campaign run |
| **Shop's agent (MCP)** | Manage submissions queue + publish + campaign status over MCP |
| **Platform admin** | Campaign kill-switch (sweepstakes precedent) |

## Stage-2.5 bucket

- **Already possible today (wire, don't build):** digital listing type + delivery (private R2
  digital bucket) — the published work IS a digital product; **"print my book" at regular price =
  a custom-print-products listing** (file upload + size/qty tiers — CPP S2/S3, in flight); seller
  coupons (the 50% instrument); email-code-verified public entries (sweepstakes spine); editorial
  review-queue pattern (print edition); public no-Clerk upload precedent (`/api/supply/upload`);
  submission→listing minting (gem/supply pipeline mints real Medusa products).
- **Genuinely new:** per-shop public **submission portal + review queue** (writer-facing);
  **excerpt/sample** on digital PDPs; **voting campaign** primitive (public page, verified votes,
  threshold → auto-minted reward coupon, end-of-campaign notifications).
- **Out → future:** in-platform chapter reader (own epic if the loop proves out); platform revenue
  share to writers (v2; see Decisions).

## Decisions (resolved with Daniel, 2026-07-05)
1. **Writer payout v1 = shop-managed, offline.** The bookshop owns writer contracts/royalties
   outside the platform; works publish under the SHOP. Zero new money paths. (Platform revenue
   share = explicit v2 candidate once the loop proves out; "writer as sub-seller" rejected — it
   fragments the bookshop-curated catalog.)
2. **Reading v1 = free excerpt on the listing + full work as the existing digital product**
   (PDF/EPUB). In-platform serialized reader = its own future epic.
3. **Campaign mechanic reuses the sweepstakes spine** (email-code-verified entries, public page,
   admin kill-switch) with votes instead of tickets; threshold reached → auto-mint a shop coupon
   (50%) scoped to the print product; voters notified. Not a SEGOB sweepstake (no chance-based
   prize — a vote threshold), but keep the compliance gate posture; confirm framing in plan mode.

## What already exists (reuse, don't rebuild)
- **Digital products** — listing type, R2 private digital bucket, re-download, instant-delivery PDP block.
- **CPP (custom-print-products, in flight)** — the print-a-book product: manuscript upload field,
  size/binding variants, qty price breaks; proof flow. **Launchpad print pricing = a CPP listing.**
- **Sweepstakes** — campaign gate, public `/g/[slug]` page + QR, email-code verification, draw
  automation, winner notifications, global kill-switch — the voting spine.
- **Seller coupons** — create/redeem/usage stats; promoter auto-grant precedents for auto-minting.
- **Editorial queue** — print-edition review/approve/request-changes pattern.
- **Supply/gem pipeline** — staged intake → real Medusa product minting; no-Clerk upload route.
- **OSPP (in flight)** — collections ("Convocatoria 2026" shelf), hero (feature the campaign), content pages (submission rules).
- **Notifications** — granular channels; sweepstakes winner-notify patterns.
- **Catalog-management epic** — big-catalog handling for the same bookshops.

## v1 scope boundary
**In:** per-shop submission portal (`/s/[slug]/convocatoria`: guidelines + form: title, synopsis,
genre, manuscript file, author info; email-code verify like sweepstakes entries — no account needed);
shop review queue (approve/reject/request-changes + es-MX notifications); one-click "publicar como
producto digital" (minted under the shop, manuscript → private digital bucket, draft first); excerpt
upload + inline sample view on digital PDPs; voting campaigns (`/v/[slug]`: featured works, one
verified vote per email per work, live progress vs threshold, end date; threshold → auto-minted
scoped 50% coupon on the linked CPP print product + voter/writer notifications); shop-agent MCP
parity (queue + campaign reads, publish action); white-label on all channels; es-MX.
**Out:** revenue share/split payouts; in-platform chapter reader; writer accounts/dashboards
(status via emailed magic links); ISBN/metadata tooling; DRM; print-on-demand routing automation
(the shop simply links its CPP product); paid submissions/reading fees.

## Slices
### Sprint 1 — Submissions in, works published — MED-HIGH
| # | Story | Risk |
|---|---|---|
| 1.1 | Public submission portal per shop (opt-in in settings; guidelines page + form + manuscript upload w/ format allowlist + email-code verify + rate limits). | HIGH (public upload surface) |
| 1.2 | Review queue in the seller shell (list, read, approve/reject/request changes; es-MX emails to the writer at each transition). | MED |
| 1.3 | Publish as digital product: one click mints the draft listing (manuscript → private bucket, synopsis → description, genre → category); seller finishes price/cover and activates. | MED |

### Sprint 2 — The excerpt + the shelf — LOW-MED
| # | Story | Risk |
|---|---|---|
| 2.1 | Excerpt field on digital listings (PDF pages or text) + inline sample viewer on the PDP ("Lee un adelanto"). | MED |
| 2.2 | Launchpad shelf: an OSPP collection auto-suggested for published submissions; hero-able; UCP exposes excerpt presence. | LOW |

### Sprint 3 — Voting campaigns + the 50% unlock — HIGH
| # | Story | Risk |
|---|---|---|
| 3.1 | Campaign builder (seller): pick published works, set threshold + end date + reward (coupon % + linked CPP print product); admin kill-switch. | MED |
| 3.2 | Public campaign page `/v/[slug]` + QR: works w/ excerpts, verified one-vote-per-email-per-work, live progress; white-label. | HIGH (public verified-action surface) |
| 3.3 | Threshold/end automation: auto-mint the scoped coupon, notify voters + writer + seller; honest close when threshold unmet ("no se alcanzó" + optional consolation coupon). | HIGH (automation + notifications) |

**Deploy order:** S1 → S2 → S3. **Cross-epic:** CPP S2/S3 (variants + upload) should be merged
before this S3 links a real print product; OSPP S2 (collections) before S2.2.

## QA / smoke commitments
Pure seams + api specs: submission validation, state machine (submitted→approved→published),
vote-dedup deriver, threshold/coupon-mint automation (idempotent on re-fire). Browser smokes owed
to Daniel: full loop on a real device — submit (guest) → approve → publish → excerpt renders → vote
from two emails → threshold → coupon lands → redeem on the print product (money path). Sprint-wise
real-URL walkthroughs.

## Open risks
- Public manuscript uploads: abuse/size (rate limit + caps + format sniff — supply-upload precedent);
  copyright takedown path (reuse report/flag posture; state it in the submission terms).
- Vote integrity: email-code spine deters casual fraud only — state honestly; per-IP rate limits;
  no paid incentives per vote (dark-pattern guard).
- Legal framing of "voting unlocks a discount" vs SEGOB sweepstakes rules — plan-mode confirms with
  the sweepstakes gate's posture (informative, conservative).
- Excerpt viewer performance (PDF inline on mobile) — pick pages-as-images vs pdf.js in plan mode.
- Coupon scoping must be product-scoped (not shop-wide 50%!) — spec it explicitly.
