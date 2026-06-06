# Sprint 3 — Tienda como código (declarative settings)

Goal: a migrating seller dresses and configures their **entire shop** from a single declarative file,
instead of clicking through ten-plus settings tabs. "Storefront as Code" — the same engine philosophy
as the catalog importer (declarative schema → validate → atomic apply → async assets), applied to shop
configuration.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **All stories ✅ shipped 2026-06-03 — sprint complete.**

> **Reality guardrail:** some settings can't be granted by a file. `pagos` (Stripe/MP OAuth), `canal`
> (domain/Cloudflare), and `citas` (Cal.com link) require live handshakes. This sprint covers the
> **declarative subset** — perfil, envíos, negociación, notificaciones, diseño, pedidos, devoluciones —
> and explicitly flags the OAuth-bound sections as "aún requiere un paso manual."

---

## US-1 — Canonical config schema + copyable prompt ✅
**As a** migrating seller, **I want** a documented config schema and a prompt for my agent, **so that**
my agent can scrape my old store's settings and generate a complete manifest.
- [x] A canonical UCP-compatible JSON schema mapping cleanly to each declarative settings block
      (`lib/settings-import.ts` · `StoreConfigManifest`, `CONFIG_BLOCKS`).
- [x] A copyable "Copilot de configuración" prompt (mirrors the catalog Copilot) that injects the
      schema (`buildSettingsCopilotPrompt`, surfaced at `/shop/manage/settings/import`).
- [x] Clearly marks which blocks are file-settable vs. which need a manual step (`MANUAL_SECTIONS`).
*(Shipped 2026-06-03, commit 0cf9ae9.)*

## US-2 — Upload & atomic block apply ✅
**As a** seller, **I want** to upload one config file and have my shop dressed instantly, **so that**
migration is one step, not a wizard.
- [x] Accepts a single JSON manifest covering the declarative blocks (`POST /api/sell/settings-import`).
- [x] **Idempotent, block-by-block** apply: an invalid block (e.g. malformed color) is dropped while
      valid blocks still persist; server re-validates with `validateConfig`.
- [x] Returns a **discrete delta report**: applied / skipped / errored per block, in plain language.
*(Shipped 2026-06-03, commit 8ded1a5.)*

## US-3 — Async asset ingestion (logo, banner) ✅
**As a** seller, **I want** my logo and banner to come across automatically, **so that** my brand is
in place without re-uploading.
- [x] Binary fields accept **absolute source URLs**.
- [x] System fetches, optimizes, and stores them on our infra (reuses Sprint-1 `ingestImageUrls`
      → R2; SSRF-guarded, size/timeout bounded). *Inline during apply, not a separate job — bounded
      to 2 assets so it can't time out the request.*
- [x] A bad asset URL fails just that asset gracefully (keeps the original URL), not the whole apply.

## US-4 — Settings checkmarks reflect the import ✅
**As a** seller, **I want** the settings menu to show what's now configured, **so that** I can see at a
glance what's done and what still needs me.
- [x] Completion checks extended to the importer-populated sections that never lit up before
      (envíos, negociación, notificaciones, diseño) + agentes. **Value-based** checks, since the native
      editor persists the whole settings tree on every save — a section lights up only when it holds
      real data (hand-typed or imported). Import flow calls `router.refresh()` so ✓ updates on return.
- [x] OAuth/manual sections (pagos, citas, canal, agentes) show a "Pendiente — termínalo aquí" hint
      when unconfigured, mirroring `MANUAL_SECTIONS`.

---

### Definition of done (sprint)
A seller uploads one config file and sees their profile, shipping rules, negotiation settings,
notifications, branding (logo/banner), order and return policies populated — checkmarks updated, a
clear delta report, and an honest list of the few sections that still need a manual handshake.

### Out of scope (this sprint)
Setting payment/domain/booking via file (OAuth-bound) · live agent-driven config (S4) · exporting our
config back out.
