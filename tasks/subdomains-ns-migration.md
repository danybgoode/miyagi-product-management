# Subdomains go-live — Vercel nameserver migration (Option A)

**Status: ✅ DONE / LIVE 2026-06-06.** Apex moved to Vercel NS (`ns1/ns2.vercel-dns.com`); 12 records
(clerk/accounts/api/SES/Resend/DMARC/Google) staged in Vercel DNS via an account-scoped token + `teamId`;
`*.miyagisanchez.com` wildcard cert issued (had to remove+re-add the wildcard domain post-flip to unstick
issuance). Verified: `miyagiprints.miyagisanchez.com` → 200 white-label; auth + email DNS intact. Per-host
code removed (PR #28). **Daniel: revoke the temporary account-scoped Vercel token.** Kept below for history.

---

**(historical) Status: BLOCKED on a human-driven DNS migration.** The subdomains epic code is **merged to prod**
(PR #27, merge `b394ad3`) but **not live** yet. Per-host registration (Option B) was abandoned: the
Vercel project has a **50-domain cap** and there are **164 shops** (47 registered before the cap, 117
failed). The only scalable fix is a **true wildcard cert**, which requires **Vercel nameservers**.

This migration touches the **Clerk auth + email DNS** — if a record is missed, platform login and/or
auth emails break. So it must be done with the **complete GoDaddy zone export**, not reconstructed from
`dig`. Do it when you can verify login immediately after.

## Why it's a dashboard op (not API)
- The Vercel **API token is project-scoped**: it manages project *domains* (add/remove wildcard, subdomains)
  but **403s on account-level DNS records** — it can't create the Vercel DNS zone. Confirmed 2026-06-06.
- The domain is attached as an **external project domain**, not an account domain — so Vercel DNS must be
  enabled in the dashboard (which also offers to **import** the existing records).
- Auto-mode guardrail (correctly) blocks bulk-deleting the 47 throwaway subdomains without explicit OK.

## ✅ COMPLETE record set (from the GoDaddy zone export, references/miyagisanchez.com.txt)
Recreate ALL of these in Vercel DNS (the dashboard import should detect most — verify each):

| Host | Type | Value | Why |
|---|---|---|---|
| `@` | TXT | `google-site-verification=sE6VB7yWsi9iFzstS9q2eLq08to7M2qweJzG45AhLNI` | Google verify |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | DMARC |
| `send` | TXT | `v=spf1 include:dc-fd741b8612._spfm.send.miyagisanchez.com ~all` | SES SPF |
| `dc-fd741b8612._spfm.send` | TXT | `v=spf1 include:amazonses.com ~all` | SES SPF macro |
| `resend._domainkey` | TXT | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDS570BrQWVmrgTliJuxOT8CFJl+G8+JORsZjw0jvT3Q5nnFwggAxzZpWAAMLoqTaZvjvRIzdgV/UmBcm4kR5A4QDA65NM3njAzzKXgKrIG5Wvlo0Q/Znto/okip0WMhI71I8ezWf+U3MlZjziPEmLF+LBRNAdy9LJf0XwdNr0wtwIDAQAB` | Resend DKIM |
| `accounts` | CNAME | `accounts.clerk.services` | **Clerk auth** |
| `clerk` | CNAME | `frontend-api.clerk.services` | **Clerk auth** |
| `clk._domainkey` | CNAME | `dkim1.9s0tm9ehm5gw.clerk.services` | Clerk email DKIM |
| `clk2._domainkey` | CNAME | `dkim2.9s0tm9ehm5gw.clerk.services` | Clerk email DKIM |
| `clkmail` | CNAME | `mail.9s0tm9ehm5gw.clerk.services` | Clerk email |
| `api` | CNAME | `ghs.googlehosted.com` | Google-hosted api host |
| `send` | MX | `10 feedback-smtp.us-east-1.amazonses.com` | SES feedback |

**Vercel auto-manages (don't add):** `@` A + `www` (project apex/www on Vercel NS).
**Do NOT recreate:** `*` CNAME (the wildcard is handled by adding `*.miyagisanchez.com` as a PROJECT domain
→ Vercel DNS-01 wildcard cert) · `_domainconnect` (GoDaddy-only helper) · SOA/NS (Vercel-managed).
Three email systems must survive: **Clerk/SendGrid** (clk*), **Resend** (resend._domainkey), **AmazonSES** (send.*).

## Dashboard flow (Daniel) + my project-token + verify split
1. **Daniel — Vercel dashboard:** Domains → miyagisanchez.com → enable **Vercel DNS**; **import** detected
   records; cross-check against the table above and add any missing (esp. the 3 email sets). Do NOT add a
   `*` record.
2. **Cap room:** the 47 throwaway per-host subdomains fill the 50-cap. Either Daniel deletes them in the
   dashboard, or authorizes me to delete them via the project API (needed before adding the wildcard).
3. **Wildcard:** add `*.miyagisanchez.com` as a project domain (I can via API once there's cap room; cert
   issues after NS flip via DNS-01).
4. **Daniel — GoDaddy:** set nameservers to **`ns1.vercel-dns.com`** + **`ns2.vercel-dns.com`**.
5. **I verify:** `dig NS` = Vercel; login works (clerk/accounts); auth+app email; apex/www/api serve;
   wildcard cert issued; `curl https://<slug>.miyagisanchez.com/` → 200 white-label; retired slug → 301;
   reserved → 404.
6. **Cleanup PR (me):** remove `registerShopSubdomain` + calls + backfill script (wildcard replaces per-host).

## Records captured via DNS earlier (superseded by the export table above)
| Host | Type | Value |
|---|---|---|
| `@` | A | `216.198.79.1` (Vercel — auto-managed once on Vercel NS) |
| `www` | CNAME/ALIAS | → apex |
| `api` | CNAME | `ghs.googlehosted.com` (Google) |
| `clerk` | CNAME | `frontend-api.clerk.services` |
| `accounts` | CNAME | `accounts.clerk.services` |
| `clkmail` | CNAME | `mail.9s0tm9ehm5gw.clerk.services` |
| `clk._domainkey` | CNAME | `dkim1.9s0tm9ehm5gw.clerk.services` |
| `clk2._domainkey` | CNAME | `dkim2.9s0tm9ehm5gw.clerk.services` |
| `clk` | CNAME | `cname.vercel-dns.com` |
| `clkmail2` | CNAME | `cname.vercel-dns.com` |
| `em` | CNAME | `cname.vercel-dns.com` |
| `mail` | CNAME | `cname.vercel-dns.com` |
| `ftp` | CNAME | `cname.vercel-dns.com` |
| `@` | TXT | `google-site-verification=sE6VB7yWsi9iFzstS9q2eLq08to7M2qweJzG45AhLNI` |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |
| `_domainconnect` | CNAME | GoDaddy helper — can drop after migration |

⚠️ Likely MORE not shown by `dig` (apex SPF, other TXT/verification, MX if any). **Trust the GoDaddy
export, not this table.** No MX was seen (email is via Clerk/SendGrid CNAMEs, so apex email is low-risk).

## Runbook (zero-downtime if staged first)
1. **You:** GoDaddy → DNS → **Export zone file** (or screenshot all records). Send it to me.
2. **Stage in Vercel DNS first (no cutover yet):** recreate every record from the export under
   miyagisanchez.com in Vercel (I can do this via the Vercel API once I have the export, or you import in
   the dashboard). Apex + www to the project are auto on Vercel NS.
3. **Add the wildcard:** add `*.miyagisanchez.com` to the Vercel project (I removed the earlier inert one;
   on Vercel NS it will issue a real wildcard cert via DNS-01).
4. **You:** GoDaddy → set nameservers to Vercel's: **`ns1.vercel-dns.com`** + **`ns2.vercel-dns.com`**
   (confirm the exact pair in Vercel dashboard → the domain → Nameservers). Propagation ~mins–hours.
5. **Verify (I'll run):** `dig NS` shows Vercel; login works (clerk/accounts resolve); auth email arrives;
   apex + www + api serve; the wildcard cert is issued; `curl https://<slug>.miyagisanchez.com/` → 200
   white-label; a retired-slug subdomain → 301; a reserved label → 404.
6. **Cleanup (I'll do, PR):** remove the 47 per-host subdomains from the project (frees the cap) and
   remove `registerShopSubdomain` + its calls + the backfill script (the wildcard replaces per-host).
   The GoDaddy `*` CNAME you added becomes moot once Vercel NS is authoritative.

## Rollback
If anything breaks post-cutover, set the GoDaddy nameservers back to `ns31/ns32.domaincontrol.com`
(the originals) — DNS reverts within the TTL. Keep the GoDaddy zone intact until the migration is verified.
