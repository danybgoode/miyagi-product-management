# Sprint 2 — "Conecta tu agente" seller helper

Goal: close the Sprint-4 loop — a seller can connect their own AI agent to read and adjust their shop in
one copy-paste, without reading API docs.

Status: ✅ shipped · 🚧 in progress · 📋 planned. **Shipped + live-QA'd 2026-06-03.**

---

## US-1 — Connection helper in the Agentes settings section ✅
**As a** seller, **I want** a ready MCP config, **so that** I can connect my own agent without reading API
docs.
- [x] A "Conecta tu agente" panel below the agent-token UI (in `ShopSettings.tsx`, agentes section): a
      copyable `claude_desktop_config.json`-style snippet with the MCP URL (`/api/ucp/mcp`) and the
      `Authorization: Bearer` header — prefilled with the just-generated token when present, otherwise a
      `PEGA_TU_TOKEN_AQUÍ` placeholder.
- [x] Three setup steps (generar token → pegar config → tu agente usa get/patch_store_configuration) and a
      plain-language note: the agent can adjust perfil/envíos/negociación/notificaciones/pedidos/devoluciones;
      pagos, dominio y Cal.com stay manual.
- [x] Reuses the existing copy-button pattern + the S4 token state.

### QA — live (commit 3517b31)
Claude-in-Chrome on `/shop/manage/settings/agentes`: the panel renders with the correct MCP URL and header,
the placeholder, the steps, the copy button, and the manual-caveat note.
