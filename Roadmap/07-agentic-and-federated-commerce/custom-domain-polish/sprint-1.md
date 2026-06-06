# Sprint 1 — Own-channel flow polish

Goal: every seller (apex domain or subdomain, any registrar) gets an unambiguous, well-labeled status with
actionable fixes, sees the SSL appear, can change domains without losing the current one, and has it all
work on a phone.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **✅ SPRINT COMPLETE — all 7 stories SHIPPED to prod
2026-06-04. PR #8 merged to `main` (merge `07ddb9a`, feature `1db76f7`); deterministic gate GREEN
(tsc + build + 29 Playwright vs preview); Daniel's browser smoke OK. HIGH risk, merged by Daniel.**

Main files:
- `app/shop/manage/settings/ShopSettings.tsx` — "Own channel" section (state ~824–944; UI ~3345–3764) + `REGISTRAR_GUIDES`.
- `app/api/sell/shop/domain/route.ts` — conflict mapping (US-4), apex verification via A record (US-5).
- `lib/vercel-domains.ts` — expose Vercel's conflict error code (US-4).
- `app/api/sell/shop/domain/cloudflare/route.ts` — record name = real host, not a fixed `@` (US-5).
- `e2e/custom-domain-detect.spec.ts` — **new** Playwright spec.

---

## US-1 — Four explicit states with a fix suggestion ✅ SHIPPED · Risk: LOW
**As** a seller setting up my domain, **I want** to clearly see what state it's in and what to do if
something fails, **so that** I don't need tech support.
- [x] Derive a single state (`active` / `error` / `unverified` / `pending_dns`) from the existing GET
      response (`dns_ok`, `cname_current`, `verified`), instead of the single boolean `domainDnsOk`.
- [x] `error`: there's a CNAME but it points elsewhere → *"Your CNAME points to `<x>`. Change it to
      `cname.vercel-dns.com`."* (or the save error).
- [x] `unverified`: already checked but no record → *"Your domain doesn't point to us yet."*
- [x] `pending_dns`: just saved → *"Configuring DNS, can take up to 48 hours."*
- [x] Reflect the state in the header pill **and** in the step-2 status row.

**Acceptance:** with a wrong CNAME I see the problem and the correct value; with no record I see
"doesn't point to us yet"; just saved I see "up to 48 hours"; already active I see "🟢 Domain active".

---

## US-2 — Show the SSL certificate status ✅ SHIPPED · Risk: LOW
**As** a seller, **I want** to know when the SSL certificate is being issued, **so that** I don't think
something failed while Vercel issues it.
- [x] Use the already-available distinction: `dns_ok && !verified` → *"DNS correct ✓ — issuing SSL
      certificate (a minute or two)…"*; `dns_ok && verified` → fully active.
- [x] Replace the static "SSL active" text with the real status (new `domainSslReady` state fed from
      `checkDomainDns()`).

**Acceptance:** right after DNS propagates I see "issuing SSL", and it switches to active when the
certificate is ready.

---

## US-3 — Change domain without deleting it ✅ SHIPPED · Risk: LOW
**As** a seller, **I want** to change my domain without losing the current one at once, **so that** I'm not
left without a shop during the change.
- [x] "Change" opens an edit mode with the domain pre-loaded (no longer deletes and clears).
- [x] On submitting a different, valid domain: `DELETE` the old one + `POST` the new one in a single
      handler (`handleDomainReplace`), reusing the existing route.
- [x] "Delete" remains a separate destructive action with its own confirmation.

**Acceptance:** I can enter a new domain and replace the old one in one step; "Delete" is still available
separately.

---

## US-4 — Clear message when the domain is already in use ✅ SHIPPED · Risk: HIGH (provisioning)
**As** a seller, **I want** a clear message if the domain is already taken, **so that** I know what to do
instead of seeing a generic error.
- [x] In `POST /api/sell/shop/domain`: if `addDomainToProject` throws a Vercel conflict
      (`domain_already_in_use` / `forbidden` / `domain_taken` on **another** account/project), respond
      `409` with *"This domain is already in use. If it's yours, contact us to release it."* (today it's `502`).
- [x] Expose that error code from `addDomainToProject` (`lib/vercel-domains.ts`) so the route can
      distinguish it. The DB-level guard against other shops (the current `409`) stays.

**Acceptance:** trying a domain already registered in another Vercel account shows the clear message, not a
generic error.

---

## US-5 — Proper subdomains + apex robustness ✅ SHIPPED · Risk: HIGH (provisioning/verification)
**As** a seller with a subdomain (`shop.mydomain.com`) or an apex on GoDaddy/Namecheap, **I want** correct
instructions, **so that** my shop actually goes live.
- [x] UI: compute the "Name/Host" from the domain's shape. Apex (2 labels, `myshop.mx`) → `@`; subdomain
      (`shop.mydomain.com`) → the label (`shop`). Feed the DNS card, the generic/per-registrar guides, and
      the Cloudflare automation from this (today hardcoded to `@`).
- [x] Verifier: for apex, also offer Vercel's A record (`76.76.21.21`) and make the `GET` check accept a
      matching A record for apex (`dns.resolve4`), because many registrars reject a CNAME at the apex.
      Subdomains stay on CNAME.

**Acceptance:** a subdomain shows the correct Name and goes live; an apex on a registrar that doesn't allow
a root CNAME can use the A record and is also marked active.

---

## US-6 — Mobile pass ✅ SHIPPED · Risk: LOW
**As** a seller on a phone, **I want** to complete the whole flow without friction, **so that** I don't need
a computer.
- [x] DNS-record card stacks on narrow screens (`grid-cols-1 sm:grid-cols-3`).
- [x] The step-1 input/button and the live status row fit without overflowing.
- [x] Review the Cloudflare accordion and the two-channel grid at phone width.

**Acceptance:** on a phone you can read the DNS record, copy it, check, and see the status without
overflows. (Visual confirmation: Daniel — see QA.)

---

## US-7 — Confirmation on delete ✅ SHIPPED · Risk: LOW
**As** a seller, **I want** a confirmation when I delete my domain, **so that** I know it was removed and my
shop is still available.
- [x] On a successful `DELETE`, show an inline message: *"Domain deleted. Your shop is still live at
      miyagisanchez.com/s/<slug>."* (no notification subsystem to reuse; don't build one).

**Acceptance:** on delete I see the confirmation with the link to the marketplace.

---

### QA (this sprint)
- **Deterministic gate (green before merge, against the preview with the `x-vercel-protection-bypass` token):**
  `tsc --noEmit` + `npm run build` + `npm run test:e2e`, including the **new**
  `e2e/custom-domain-detect.spec.ts`. The `/api/sell/shop/domain/detect` route is the only **public,
  unauthenticated** surface here (POST/GET/DELETE are behind Clerk), so the spec validates its contract
  deterministically (without depending on an external registrar not migrating):
  (a) no `domain` → `400`; (b) a resolvable domain returns a `registrar` from the valid enum;
  (c) a subdomain (`blog.example.com`) reduces to the apex for the NS lookup (`domain: "example.com"`);
  (d) a domain that doesn't resolve → `registrar: "unknown"` with `200`, without crashing. New coverage
  for the detection that feeds the guides (US-5).
- **Live confirmation (split):** the agent `curl`s `/detect` against the preview and re-runs the
  `panuchas.com` absence check. **Daniel (browser, with the real seller session):** walks a subdomain and
  an apex on **desktop and phone** — correct Name (`@` vs label), the four states + suggestions, the
  "issuing SSL" → active transition, the replace-without-clearing, and the delete confirmation. The
  status/UI and mobile stories are inherently browser-side and are declared as such in the PR.
