## Bug report
Custom domain feature:
the added config from when a tenant provides a token is incorrect, it adds a cname instead of an a record, on the ui, it says a record, but the template adds a cname in cloudflare specifically, which should it be?
i tried:
as per token (using template) , it never lit up
changed manually status to proxied in cloudflare, it didnt work
manually changed record to A and target 76.76.21.21 also didnt work
it keep saying Tu dominio aún no apunta a nosotros on our site
lets validate all around please.

END OF BUG REPORT

BEGINNING OF NEW REQUESTS

## Context

Custom domains are the premium offering. Subdomains are a second tier offering. Shops under subdomains are the low cost alternative — good enough for most sellers and a stepping stone toward the custom domain upgrade.

**User Story: Dynamic Multi-Tenant Subdomains (`shopname.miyagisanchez.com`)**

**Context**

Sellers on e-commerce platforms want to feel like independent business owners rather than entries in a shared directory. Moving storefront paths from a sub-directory structure (`miyagisanchez.com/s/shopname`) to a dedicated subdomain (`shopname.miyagisanchez.com`) visually isolates the seller's brand, elevates their professional credibility, and creates a clear architectural path toward supporting full custom domains in the future.

**User story**

As a marketplace seller,

I want my storefront to live on its own dedicated subdomain (`shopname.miyagisanchez.com`),

So that my business feels like a premium, standalone digital storefront independent of the main marketplace landing pages.

**Acceptance criteria**

- **Wildcard Routing:** The infrastructure must catch all incoming traffic on `.miyagisanchez.com` and route it to the application layer without requiring manual DNS additions per shop.
- **Context Extraction Middleware:** Application middleware must parse the incoming `Host` header to isolate the subdomain string, verify its status against the tenant database/cache, and render the correct storefront data.
- **Reserved Subdomains:** The system must block users from registering subdomains that match system-critical routes or high-risk administrative words (e.g., `admin`, `api`, `app`, `www`, `billing`, `support`).
- **Automatic SSL/TLS:** Every dynamically resolved subdomain must be fully secured over HTTPS via automated Wildcard SSL/TLS certificate handshakes at the reverse proxy layer.
- **Session Isolation:** Authentication and session cookies must be scoped correctly to ensure a logged-in session on one tenant's subdomain does not cause security or data bleeding onto another tenant's subdomain.

**Sources and references**

- **Industry Reference:** Shopify's `myshopify.com` multi-tenant architecture and Slack's workspace subdomain models.
- **Security Standard:** OWASP Multi-Tenancy Cheat Sheet regarding host header validation and cookie isolation across sister subdomains.

----------------------

## Context

Custom domains are the premium offering. Subdomains a second tier offering. Shops under subdomains are the low cost alternative — good enough for most sellers and a stepping stone toward the custom domain upgrade. This is trying to prettify and allow for custom slugs, which is the full free option. Sellers may already have a generated slug from shop creation; this task is about letting them choose and customize it.

## 👤 User Story

**As a** seller who hasn't set up a custom domain,

**I want** a clean, branded URL for my shop

**So that** I can share a professional link on social media and business cards without exposing ugly IDs.

---

---

## ✅ Acceptance Criteria

### Slug setup

- [ ]  During shop creation , seller can set a custom slug
- [ ]  Slug is auto-suggested from the shop name (e.g. "Mi Tienda Bonita" → `mi-tienda-bonita`)
- [ ]  Validation rules:
    - 3–40 characters
    - Lowercase alphanumeric + hyphens only
    - No leading/trailing hyphens
    - Cannot be a reserved word (list: `admin`, `api`, `sell`, `search`, `orders`, `inbox`, `profile`, `perfil`, `ayuda`, `help`, `s`, `shop`, etc.)
- [ ]  Real-time availability check (debounced, 300ms) with a ✓ / ✗ indicator

### Routing

- [ ]  `miyagisanchez.com/s/[slug]` resolves to that seller's storefront
- [ ]  If a seller changes their slug, the old slug redirects (301) to the new one for 90 days
- [ ]  Slugs are stored in Medusa vendor/shop metadata (not Supabase — this is commerce data)

### UI discovery

- [ ]  The shop URL is prominently displayed in `/shop/manage/settings` with a copy-to-clipboard button
- [ ]  A subtle "Upgrade to custom domain →" upsell link appears next to the slug field

---

## 📎 References

- Medusa vendor metadata: `@medusajs/marketplace` plugin in `apps/backend`
- Etsy example: `etsy.com/shop/[shopName]` — same pattern


-------------------
This is a platform wide feature.

**User Story: Playful Shortened Links (`mschz.org/shopname`)**

**Context**

Sellers frequently promote their storefronts across mobile-first channels with strict character constraints or highly visual layouts (e.g., Instagram/TikTok bios, WhatsApp blasts, SMS marketing). Long URLs look cluttered and unprofessional. Providing an automated, ultra-short, on-brand link (`mschz.org/shop-name`) increases click-through rates and gives sellers a punchy call-to-action to share verbally or in writing.

**User story**

As a marketplace seller,

I want the platform to automatically provide an ultra-shortened link (`mschz.org/shopname`) for my store,

So that I can easily share it on social media and messaging channels without wasting character space or cluttering my bios.

**Acceptance criteria**

- **Automated Generation:** The system must automatically map a short URL whenever a new shop is created or whenever a seller changes their primary shop slug.
- **Dashboard Visibility:** The shortened link must be prominently displayed in the seller’s management dashboard with a one-click "Copy to Clipboard" action.
- **Seamless Redirection:** Visiting `mschz.org/shopname` must trigger an immediate HTTP 301 (Permanent Redirect) to the definitive storefront URL.
- **Input Sanitization:** URL routing must be case-insensitive (e.g., `mschz.org/MyShop` and `mschz.org/myshop` must resolve identically).
- **Error Handling:** If a user visits a short link with a non-existent or deactivated shop slug, the system must gracefully redirect them to a standard, branded 404 page on the primary domain (`miyagisanchez.com/404`).

**Sources and references**

- **Industry Reference:** Twitter's `t.co`, Bitly enterprise custom domains, and Linktree's micro-link parsing models.
- **Technical Pattern:** Standard HTTP 301 redirects are preferred over 302 redirects to ensure any SEO link equity passed through the short domain flows directly back to the primary marketplace domain.