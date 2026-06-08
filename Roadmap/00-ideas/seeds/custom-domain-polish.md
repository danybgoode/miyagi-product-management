---
title: "Custom-domain polish"
slug: custom-domain-polish
status: shipped
area: "07"
type: feature
priority: null
risk: low
epic: "07-agentic-and-federated-commerce/custom-domain-polish"
build_order: null
updated: 2026-06-08
---

## Context

The plumbing for custom domains already exists, the domain API route, middleware rewriting). This task is about polishing the **seller-facing setup experience** — making it clear, fast, and error-proof. And the infrastructure rock solid and following best practices. The actual storefront UX once the domain is live should covered in its own separate **Own shop experience** task.

---

## 👤 User Story

**As a** seller who wants to use my own domain (e.g. `mitienda.mx`),

**I want** a guided, clearly explained setup flow with real-time DNS status feedback,

**So that** I can get my shop live on my domain without needing technical support.

---

## ✅ Acceptance Criteria

### Setup flow (`/shop/manage/settings` → Domain tab)

- [ ]  Step 1: Enter domain → validate format (no protocol, no path) + check it's not already claimed by another shop
- [ ]  Step 2: Show exact DNS records to add — displayed in a copyable table (Type / Name / Value), with platform-specific guides for GoDaddy, Namecheap, Cloudflare, and a generic option
- [ ]  Step 3: "Verificar / Check DNS" button triggers a live DNS lookup and shows status per record
- [ ]  Step 4: Once verified, domain is provisioned via and the seller sees a "🟢 Dominio activo / Domain active" confirmation

### Status states (clearly labeled in UI)

- [ ]  `pending_dns` — "Configurando DNS, puede tomar hasta 48 horas / Setting up DNS, may take up to 48 hours"
- [ ]  `active` — "🟢 Dominio activo"
- [ ]  `error` — specific error message (wrong record, domain taken, SSL pending) with a fix suggestion
- [ ]  `unverified` — "Tu dominio aún no apunta a nosotros / Your domain isn't pointing to us yet"

### Domain management

- [ ]  Seller can remove a domain (with confirmation modal: warns the shop will fall back to `/s/[slug]`)
- [ ]  Seller can replace a domain (remove + add new flow)
- [ ]  On removal, `removeDomainFromProject` is called and the seller is notified via in-app notification

### Edge cases

- [ ]  Domain already used by another shop → "Este dominio ya está en uso / Domain already in use" error
- [ ]  Subdomain support: `shop.midominio.com` works (CNAME record), not just apex domains
- [ ]  SSL certificate provisioning status shown (Vercel handles this, but surface it to the user)
- [ ]  Mobile-friendly: all steps work on a phone screen

---

- Review vercel as it currently has a stale one named panuchas.com that shpuld be removed.