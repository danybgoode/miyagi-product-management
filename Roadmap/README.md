# Miyagi Sánchez — Product Roadmap & Feature Poster

> **Mission:** make the best of modern e-commerce — trust, fair payments, negotiation, AI-native shopping — **free and high-quality for everyone in Mexico.**
> Miyagi Sánchez is a multi-seller marketplace where anyone can open a shop, list anything (products, services, rentals, digital goods), and sell with no commission — across the marketplace, their own domain, an embeddable widget, or to AI shopping agents.

This folder is the **product source of truth**. It speaks in plain e-commerce language for product, design, and business — **no engineering or tech specs here** (those live in `tasks/` and the team memory).

---

## How this roadmap is organized

```
Roadmap/
├── README.md                ← you are here · the product poster (all features)
├── WAYS-OF-WORKING.md       ← how we plan, build, ship (scrum cadence) + tooling
└── <Macro-section>/         ← a product domain (a journey, not a component)
    ├── README.md            ← what this area is, for whom, current features
    └── <Epic>/              ← a meaningful body of work
        ├── README.md        ← the epic's product overview
        ├── sprint-N.md      ← the sprint's user stories (As a… I want… so that…)
        └── RETROSPECTIVE.md ← what we learned
```

**Levels:** `Roadmap → Macro-section → Epic → Sprint → User Story`. Each user story is a small, independently shippable slice of value.

---

## The macro-sections (product domains)

We organize by **what people do**, not by how it's built. Seven domains cover the whole product:

| # | Domain | In one line |
|---|--------|-------------|
| 01 | [Discovery & Shopping](01-discovery-and-shopping/) | How buyers find, evaluate, and save items |
| 02 | [Checkout & Payments](02-checkout-and-payments/) | Paying safely — cards, transfers, cash, protection |
| 03 | [Selling & Shops](03-selling-and-shops/) | Opening a shop, listing, managing orders, getting paid |
| 04 | [Shipping & Delivery](04-shipping-and-delivery/) | Getting the item to the buyer |
| 05 | [Trust, Offers & Messaging](05-trust-offers-and-messaging/) | Negotiating, chatting, and trusting each other |
| 06 | [Print Edition](06-print-edition/) | The ad-funded local magazine — our first revenue channel |
| 07 | [Agentic & Federated Commerce](07-agentic-and-federated-commerce/) | Selling everywhere — own domain, embed, AI agents |
| 08 | [Growth & Promotions](08-growth-and-promotions/) | Referrals, platform promo codes, and the loops that grow the marketplace |

Status legend: ✅ Live · 🚧 In progress · 📋 Planned

---

## Feature map

### 01 · Discovery & Shopping
- ✅ Search & browse listings with category filters
- ✅ Rich product pages (photos, price, condition, location, seller)
- ✅ Listing types: products, services, rentals, digital goods, subscriptions
- ✅ Favorites / saved items
- ✅ AI shopping assistant entry point
- ✅ Installable mobile app experience (PWA)

### 02 · Checkout & Payments
- ✅ Cart and guided checkout
- ✅ Pay by card (Stripe), MercadoPago, SPEI bank transfer, DiMo, or cash
- ✅ WhatsApp / arranged-payment path for in-person deals
- ✅ Manual-payment lifecycle: "payment pending" → buyer marks paid → seller confirms
- ✅ Single-item and multi-seller bundle checkout
- 📋 Buyer protection / escrow ("Compra Protegida")

### 03 · Selling & Shops
- ✅ Open a shop in minutes (store + first listing onboarding)
- ✅ Create & edit listings with photos and rich details
- ✅ Seller dashboard: orders, offers, analytics, content, settings
- ✅ Get paid to your own Stripe / MercadoPago / SPEI account (no commission)
- ✅ Order management with manual-payment confirmation
- ✅ Seller subscriptions / recurring offerings
- ✅ Seller coupon codes (create/manage + checkout redemption + usage stats)
- ✅ Bulk import & express migration — bring a whole catalog + shop config in minutes (file or paste → AI parse → staging → idempotent import; "Storefront-as-Code" config file; seller's AI agent can read/patch shop config via MCP)
- ✅ Seller AI agent operations — a seller's own agent handles price offers (list / accept / counter / decline) and runs the full listing lifecycle (create / edit / pause / activate) via MCP, scoped + audited
- ✅ Configurable & personalized products — sellers add custom input fields (short/long text, dropdown) to a listing; buyers personalize in the buy box (live counter, required-field nudge); the input echoes through cart + checkout, lands on the order line item, and shows on the seller's order screen, both confirmation emails, and the UCP catalog for agents

### 04 · Shipping & Delivery
- ✅ Real-time shipping quotes & labels (Envía — Estafeta live)
- ✅ Address capture tuned for Mexico (CP-first, alcaldía/colonia)
- ✅ "Entrega acordada" (arranged delivery) and pickup options
- ✅ Delivery-method-aware checkout (arranged-only listings show manual payment)

### 05 · Trust, Offers & Messaging
- ✅ Make-an-offer / price negotiation
- ✅ Buyer–seller messaging (real-time + push notifications)
- ✅ Buyer trust signals
- ✅ Refunds with assisted handoff
- ✅ Order visibility for both buyer and seller

### 06 · Print Edition — *"Sal en la edición impresa"*
The ad-funded local print magazine (México-86 retro aesthetic) — Miyagi's first and only monetization channel. Tenants pay to feature their shop/listings; QR + WhatsApp bridge print → marketplace.
- ✅ Buy an ad placement (full / half / quarter / card tiers)
- ✅ Self-serve ad builder for advertisers (copy, photos, QR target)
- ✅ Community / social section (recommendations, events, shout-outs)
- ✅ Editorial review & approval queue
- ✅ Production export pack for the designer
- ✅ **Layout builder ("Maqueta")** — compose the magazine on a visual canvas → **[Epic ›](06-print-edition/printed-edition-builder/)** *(shipped this session)*
- ✅ **One-click print-ready PDF** (Carta / Media Carta, bleed, crop marks, QR)
- 📋 Subscriptions ("cada edición") · self-serve print providers · QR-scan analytics

### 07 · Agentic & Federated Commerce
- ✅ **Pick & change your shop URL** — sellers choose a clean `miyagisanchez.com/s/[slug]` at creation and edit it later (live availability, reserved words); the old slug 301s for 90 days, with a copy button + upsell to a full custom domain. *(Free tier of shop addressing.)*
- ✅ **Every shop gets a subdomain** — `shopname.miyagisanchez.com` serves the whole storefront white-label (a real `*.miyagisanchez.com` wildcard cert; apex on Vercel nameservers), automatic for every shop, sales attributed to the `subdomain` channel.
- ✅ **Ultra-short branded links** — `mschz.org/[shop]` and `mschz.org/[product-code]` 301-redirect to the canonical storefront URL (case-insensitive; unknown → branded 404). Every listing auto-gets a short code. *(Completes the addressing ladder: free slug → subdomain → short link → custom domain.)*
- ✅ Sell on the marketplace or your **own custom domain** — the **whole storefront** (home, product pages, cart) renders white-label under the tenant domain, scoped to that one shop, with SEO consolidated there (canonical/OG + per-host robots/sitemap + legacy 301s).
- ✅ **Buy on a custom domain too** — tapping buy hops the buyer to the platform's secure sign-in + payment (pragmatic; Clerk is platform-only), then **returns them to the tenant domain** on success; the sale is attributed `custom_domain` and the buyer's confirmation email is **branded to the seller's domain**. *(S3 — email branding + order badge — in final review.)*
- ✅ AI-agent-native commerce (UCP/MCP): agents can browse, negotiate, and buy
- ✅ Open catalog & checkout APIs + accurate machine-readable discovery (`/agent`, manifest, `.well-known/ucp`)
- ✅ Seller-side agent tools (MCP): read/patch shop config, manage offers & listings, **create new listings** — per-shop token, "Conecta tu agente" helper
- ✅ **Embeddable widget** — drop your shop, a product card, or a buy-button onto any website: Shadow-DOM custom elements + full-shop iframe, checkout always hands off to our hosted flow (`channel=embed`), self-serve snippet generator in seller settings
- ✅ **Support widget** — Buy Me a Coffee-style contribution button for any seller site: presets/custom amount, optional message, guest checkout handoff, hidden Medusa support product, Stripe Connect / Mercado Pago rails, and UCP/MCP support tools

### 08 · Growth & Promotions
- ✅ Referral program: invite friends, earn print-ad credit on their first purchase
- ✅ Platform / admin promo codes (redeemable on print-ad checkout)

---

## Recent highlights

- **2026-06-06 — Ultra-short branded links shipped (`mschz.org`).** The last rung of the shop-addressing ladder (free slug → subdomain → short link → custom domain): `mschz.org/mitienda` and `mschz.org/[product-code]` 301-redirect to the canonical storefront, case-insensitive, unknown → branded 404. Every listing auto-gets a short code (257 backfilled). It's a thin redirector reusing slugs + the 90-day alias + canonical resolution; infra was just a Cloudflare DNS-only flip + the domain on the Vercel project (no nameserver migration — much lighter than subdomains). Verified live end-to-end. Fast-follows also shipped (PR #31): the per-product short-link copy UI in the listing editor + seller-set **custom product slugs** (`mschz.org/[their-slug]`, live availability across the flat namespace). See [07 · Agentic & Federated Commerce › Short links](07-agentic-and-federated-commerce/short-links/).
- **2026-06-06 — Multi-tenant subdomains shipped (`shopname.miyagisanchez.com`).** Every shop is now reachable at its own subdomain, serving the full storefront white-label — the mid-tier of shop addressing (free slug → subdomain → custom domain). It reuses the white-label render + the custom-domain middleware + the 90-day slug-alias redirect; the subdomain *is* the slug. The notable part was the **infra**: the per-host approach (registering each `slug.miyagisanchez.com` on Vercel) hit the **50-domain project cap** against 164 shops, so we moved the apex to **Vercel nameservers** and issued a single **`*.miyagisanchez.com` wildcard cert** (DNS-01) covering every shop, unlimited. The DNS cutover carried Clerk auth + three email systems (Clerk/SendGrid, Resend, AmazonSES) — staged from the real GoDaddy zone export and verified against Vercel's nameservers before the flip, so login never blipped. Verified live: `miyagiprints.miyagisanchez.com` → 200 white-label. See [07 · Agentic & Federated Commerce › Subdomains](07-agentic-and-federated-commerce/subdomains/).
- **2026-06-06 — Custom shop slugs shipped (free-tier URLs) + a custom-domain DNS hotfix.** Sellers can now **pick and change** their shop URL (`miyagisanchez.com/s/[slug]`) — auto-suggested from the shop name, with live availability (✓/✗), reserved-word guards, and a **90-day 301** from the old slug so shared links keep working; settings shows the URL with copy + a "Mejora a dominio propio" upsell. Medusa-first with **zero new tables** (slug is already `unique()` on the seller; alias history rides `metadata`). The only backend change was `PATCH /store/sellers/me` accepting `slug`. Alongside it, a **hotfix to the custom-domain setup**: the one-click Cloudflare automation was writing a **CNAME even for apex domains** (an apex can't take one) so apex sellers were stuck on "Tu dominio aún no apunta a nosotros" — now it writes the correct **A record for apex / CNAME for subdomain** and verification trusts **Vercel's own `/config` status** (immune to per-project CNAME / apex-IP drift) with a "turn off Cloudflare's orange cloud" hint. Live seller-session smokes owed to Daniel. See [07 · Agentic & Federated Commerce › Custom Slugs](07-agentic-and-federated-commerce/custom-slugs/). Next addressing tiers (deferred, infra-ready): wildcard subdomains + `mschz.org` short links.
- **2026-06-05 — Support Widget shipped.** Sellers can now enable a Buy Me a Coffee-style support widget from settings, configure three preset amounts plus a custom range, and paste `<miyagi-support-widget>` on external sites. The widget keeps payment fields off the third-party origin: supporters open a Miyagi lightbox, leave optional name/email/message/privacy, and hand off to hosted Stripe Connect or Mercado Pago checkout as guests. Commerce stays Medusa-owned via a hidden support product and cart/order/payment metadata; UCP/MCP exposes support discovery and checkout initiation for agents. Agent/API smoke is green in production; Daniel will run the real Stripe/MP support transaction in production. See [07 · Agentic & Federated Commerce › Support Widget](07-agentic-and-federated-commerce/support-widget/).
- **2026-06-05 — Custom-domain checkout (S1+S2 live, S3 in review).** Browsing a custom domain was white-label, but you couldn't *buy* there — the buy CTAs hit a relative `/sign-in` that breaks off-platform (Clerk is platform-only). Now a buyer on `mitienda.mx` hops to the platform for the secure sign-in + payment (carrying their origin domain), and on success is **returned to their own domain's success page**. The sale is tagged `custom_domain`, and (S3, in final review) the buyer's confirmation email is **branded to the seller's domain** with the seller seeing a "Dominio propio" badge on the order. The standout was the **security architecture**: the backend only *stores* the origin (it builds no redirect), and every return-to-domain hop is gated by an `isVerifiedCustomDomain` check — so a value forged into order metadata can never become an open redirect. Chose the pragmatic platform hop over Clerk satellite domains. See [07 · Agentic & Federated Commerce › Custom-Domain Checkout](07-agentic-and-federated-commerce/custom-domain-checkout/).
- **2026-06-05 — Own-shop white-label experience shipped (S1+S2).** A custom domain is no longer just a branded homepage — the **entire storefront** now renders natively under the tenant domain. The middleware pivoted from blindly rewriting every path to the shop home (the old behaviour, which dead-ended every product/cart/API call) to resolving the shop once and passing the whole storefront through white-label; platform chrome is dropped and each page wraps in the shop's brand. The domain is **scoped to its own shop** (foreign products 404, the platform slug + cross-shop browse never surface, trust headers are spoof-proof). And **SEO follows the brand**: pages canonicalize to the live custom domain, legacy `/s/[slug]` + `/l/[id]` marketplace links 308-redirect to it, and host-aware `robots.txt`/`sitemap.xml` advertise the tenant domain — all reverting instantly if the domain is disconnected. Checkout isolation was deliberately scoped as pragmatic (platform secure flow); full custom-domain checkout is split into its own future epic. See [07 · Agentic & Federated Commerce › Own Shop Experience](07-agentic-and-federated-commerce/own-shop-experience/).
- **2026-06-04 — Custom-domain setup polish shipped (Canal propio).** The seller's own-domain flow is now clear and error-proof end to end: four explicitly labelled states (`active` / issuing-SSL / `error` / not-pointing-yet / configuring) with actionable fix hints, real SSL-provisioning status, a non-destructive "replace domain" flow (the server releases the old domain from Vercel — fixing a latent orphaned-domain bug), a clear "already in use" message, a mobile pass, and — crucially — **correct DNS records for both apex and subdomains**: apex now uses an A record (`76.76.21.21`) so domains on registrars that reject root CNAMEs (GoDaddy/Namecheap) and `.com.mx` apexes finally work. See [07 · Agentic & Federated Commerce › Custom Domain Polish](07-agentic-and-federated-commerce/custom-domain-polish/).
- **2026-06-04 — Embeddable Widget epic complete (all 3 sprints).** The fourth federated channel is real: a seller drops a `<miyagi-buy-button>`, a `<miyagi-product>` card, or their whole shop (iframe) onto any website with one `<script>`/snippet. Surfaces render in style-isolated Shadow DOM (no CSS bleed); buying always hands off to our hosted checkout (`channel=embed`), so **no payment ever touches the third-party page**. Sellers self-serve from a settings snippet generator (brand accent + es/en). Closes long-standing doc-drift — the widget was claimed in docs but never built. See [07 · Agentic & Federated Commerce › Embeddable Widget](07-agentic-and-federated-commerce/embeddable-widget/).
- **2026-06-05 — Configurable & Personalized Products epic complete (all 3 sprints).** Sellers add custom input fields (short/long text, dropdown) to a listing; buyers personalize right in the buy box with a live character counter and a gentle required-field nudge; the exact input echoes through the cart and checkout review, rides the Medusa line item onto the order, and surfaces on the seller's order screen, both buyer + seller confirmation emails, and the UCP catalog (so agents collect it too). Built Medusa-first — zero new tables, definitions on product metadata, payload on line-item metadata. See [03 · Selling & Shops › Configurable & Personalized Products](03-selling-and-shops/configurable-personalized-products/).
- **2026-06-04 — Agent listing creation shipped (Seller Agent Operations · Sprint 3).** A seller's own AI agent can now *create* a brand-new listing over MCP (`create_listing`), completing the listing lifecycle it already manages (create → edit → pause/activate). Reuses the bulk-import schema/validation + image-ingest pipeline behind the per-shop token, with a create-as-draft guard so a physical product a shop can't yet sell never goes live. Added the create counterpart of Sprint 2's internal backend route. See [03 · Selling & Shops › Seller Agent Operations](03-selling-and-shops/seller-agent-operations/).
- **2026-06-03 — Seller AI Agent Operations shipped & live-QA'd.** A seller's own AI agent can now run the shop over MCP: list and respond to price offers (accept / counter / decline, same path as the portal) and manage listings (edit price/title/stock, pause/activate) — all scoped to one shop by a per-shop token, validated, and audited. Needed a new backend service route since listing writes were Clerk-gated. See [03 · Selling & Shops › Seller Agent Operations](03-selling-and-shops/seller-agent-operations/).
- **2026-06-03 — Bulk Import & Express Migration epic complete (all 4 sprints).** Bring a whole catalog and shop configuration in minutes — upload a file or paste raw text (AI extracts), "Storefront-as-Code" config file dresses the shop, and a seller's agent can read/patch config via MCP. See [03 · Selling & Shops › Bulk Import](03-selling-and-shops/bulk-import-migration/).
- **2026-06-03 — Agent Connection & Discoverability shipped.** The public agent docs (`/agent`, UCP manifest, `.well-known/ucp`) now reflect the real API from a single source of truth, sellers get a copy-paste "Conecta tu agente" MCP config, and the platform got its first automated tests (Playwright). See [07 · Agentic & Federated Commerce › Agent Connection](07-agentic-and-federated-commerce/agent-connection/).
- **2026-06-03 — Referral Program (+ platform coupons) shipped & live-QA'd.** Invite a friend with `/?ref=CODE`; when they make their first purchase you earn print-ad credit (funded by the platform-owned print shop, so no seller eats the discount). Admins can also issue marketplace promo codes from `/admin/coupons`. All 5 stories live; full QA passed. See [08 · Growth & Promotions › Referral Program](08-growth-and-promotions/referral-program/).
- **2026-06-03 — Seller coupon codes shipped & live.** Sellers create discount codes in their dashboard; buyers redeem at checkout. See [03 · Selling & Shops › Promotions](03-selling-and-shops/promotions/).
- **2026-06-03 — Print Edition Builder ("Maqueta") shipped & live.** Miyagi can now lay out the whole magazine on a drag-and-drop canvas (auto-pack paid ads, pull in live listings as courtesy ads, retro styling, editorial pages) and export a print-ready PDF in one click. See [06 · Print Edition › Builder](06-print-edition/printed-edition-builder/).
