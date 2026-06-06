# Go-Live Runbook (test → production)

Area: Infra / Launch
Status: ✅ COMPLETE + production reset done. Stripe/Clerk live, api domain live, fake data wiped.

**PRODUCTION RESET 2026-05-28:** Neon backup branch `prewipe-backup-*` created first. Medusa wiped (products/variants/sellers/customers/orders/inventory + variant prices) — config kept (regions, 16 sales channels, api keys, payment providers, shipping, 3 admin users); store API now returns empty catalog. Supabase (SHARED project — see [[shared-infra-supabase-stripe]]) cleared miyagisanchez test tables: conversations, conversation_events, offers, favorites, claims, subscriptions, supply_batches/items, scrape_runs/run_items. Stripe webhooks tidied: deleted superseded TEST webhooks (run.app, frontend), kept Render TEST (staging); consolidated frontend LIVE webhook `we_1TcFdk` to full handler events + deleted stale dup `we_1TZMSr`.
**HELD pending Daniel:** Supabase `marketplace_listings` (242) + `marketplace_shops` (159) + `marketplace_subscription_content` (1) — likely scraper supply pool, NOT auto-deleted. **sk_live rotation** still pending (roll in dashboard → paste → Claude propagates).

**Final state 2026-05-28:** `api.miyagisanchez.com` (CNAME→ghs.googlehosted.com, cert ACTIVE) → Cloud Run medusa-web; backend `MEDUSA_BACKEND_URL` + Stripe backend webhook `we_1TcFci…` + Vercel `MEDUSA_STORE_URL`/`NEXT_PUBLIC_MEDUSA_STORE_URL` all on the api domain. Clerk prod instance `clerk.miyagisanchez.com` (app `app_3ENWPoM…`); pk_live/sk_live on Vercel + backend (SM CLERK_SECRET_KEY v2); site HTML shows clerk.miyagisanchez.com + pk_live. Stripe live on backend+frontend. Backend rev medusa-web-00006+; frontend redeployed.
**STILL OPEN (Daniel):** (1) sellers onboard Stripe **Connect LIVE** (test connected accts don't exist live → live transfers fail until re-onboard); (2) **rotate sk_live** (transited chat); (3) decommission Render when ready; (4) optionally disable old TEST/Render Stripe webhooks; (5) MercadoPago still TEST → live needs Session B.

**Done 2026-05-28:** Stripe live — backend SM `STRIPE_SECRET_KEY`=sk_live + `STRIPE_WEBHOOK_SECRET`=whsec_live (webhook `we_1TcFci…` → run.app hooks); Vercel `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`STRIPE_WEBHOOK_SECRET` (frontend webhook `we_1TcFdk…` → miyagisanchez.com/api/webhooks/stripe). Both redeployed; miyagisanchez.com 200. Domain mapping `api.miyagisanchez.com`→medusa-web created (needs GoDaddy `api CNAME → ghs.googlehosted.com.`). Clerk app **"Miyagi Sanchez"** `app_3ENWPoM6537Odae9ed5RqHRXrXo` scaffolded (dev instance only).
**⚠️ Caveats:** (1) sellers must onboard Stripe **Connect in LIVE mode** — test connected accounts don't exist live, so live checkouts transferring to a seller fail until that seller re-onboards; (2) **rotate the sk_live** (it transited chat); (3) old TEST webhooks left enabled (harmless); (4) CLI restricted `rk_live` can't write webhooks — used full sk_live via `--api-key`.
Created: 2026-05-28

Decisions: **Stripe live** (MercadoPago stays TEST until checkout Session B — live MP would trap funds in the platform account); **new Clerk production instance for miyagisanchez.com**; **api.miyagisanchez.com** vanity domain; stay on **Neon Free**.

DNS is on **GoDaddy** (only R2 is Cloudflare). Each track is gated on an input only Daniel can produce; Claude executes the rest.

---

## Track A — api.miyagisanchez.com

1. **You:** Search Console signed in as **leroytramafat@gmail.com** → add **miyagisanchez.com** as a **Domain** property → add the TXT it gives you in **GoDaddy** → Verify. (Current block: `gcloud domains list-user-verified` is empty for this account — verification was under a different account/property type.)
2. **Claude:** `gcloud beta run domain-mappings create --service=medusa-web --domain=api.miyagisanchez.com --region=us-east4` → returns CNAME/A records.
3. **You:** add those records in GoDaddy.
4. **Claude:** once cert is ACTIVE → reflip `MEDUSA_BACKEND_URL` (backend), Stripe webhook URL, and Vercel `MEDUSA_STORE_URL`/`NEXT_PUBLIC_MEDUSA_STORE_URL` from the run.app URL → `https://api.miyagisanchez.com`.

## Track B — Stripe live

- CLI has `rk_live` (restricted, CLI-only) + `pk_live` — enough to create live webhooks, NOT enough for the backend secret.
1. **You:** Stripe Dashboard (LIVE) → Developers → API keys → copy the **`sk_live_…`** secret key → paste to Claude (piped to Secret Manager, never echoed).
2. **Claude:**
   - `STRIPE_SECRET_KEY` = sk_live → Secret Manager (backend) **and** Vercel (frontend).
   - Create LIVE webhooks via CLI: backend `…/hooks/payment/pp_stripe-connect_stripe-connect` + frontend `https://miyagisanchez.com/api/webhooks/stripe` (events: payment_intent.succeeded, charge.refunded, checkout.session.completed; plus invoice.*/customer.subscription.* for the frontend subs webhook).
   - Store each `whsec_live`: backend → Secret Manager `STRIPE_WEBHOOK_SECRET`; frontend → Vercel `STRIPE_WEBHOOK_SECRET`.
   - `pk_live` (CLI has it) → Vercel `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if present.
   - Redeploy backend (Cloud Run) + frontend (Vercel). Disable the old TEST webhooks (`we_1TcDeU…` run.app, `we_1Tbk93…` Render, `we_1Tbk7j…` frontend) once live ones verified.
- ⚠️ Keep `MP_ACCESS_TOKEN` on TEST — live MercadoPago has no seller payout until Session B.

## Track C — Clerk production for miyagisanchez.com

- Existing only prod instance is bound to **clerk.despachobonsai.com** (app "Despacho Bonsai") — can't reuse for miyagisanchez.com. Site currently runs Clerk **dev** keys (pk_test).
1. **You (or Claude scaffolds the app):** Clerk Dashboard → app for miyagisanchez.com → **Deploy to production** → domain `miyagisanchez.com` → Clerk shows CNAMEs (`clerk`, `accounts`, `clkmail`, `clk._domainkey*`) → add in **GoDaddy** → Clerk verifies. (Claude can `clerk apps create "Miyagi Sanchez"` to scaffold; the production-domain deploy itself is a dashboard step.)
2. **Claude:** once prod instance verified → `clerk env pull --instance prod` → set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live) + `CLERK_SECRET_KEY` (sk_live) on Vercel **and** backend (auth-clerk module) → redeploy both.
- Note: Clerk production starts with a fresh user base (dev users don't migrate — standard Clerk).

---

## What Claude needs from you (summary)
1. **Re-verify miyagisanchez.com in Search Console as leroytramafat@gmail.com** (+ GoDaddy TXT) → unblocks Track A.
2. **Your Stripe `sk_live` secret key** → unblocks Track B.
3. **Clerk "Deploy to production" for miyagisanchez.com** + the GoDaddy CNAMEs → unblocks Track C. (Say the word and Claude scaffolds the app first.)
