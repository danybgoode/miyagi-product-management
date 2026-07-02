# Seller agent connect — Sprint 1: a setup prompt that actually helps (skateboard, ships alone)

**Status:** ✅ shipped 2026-07-02 · [PR #158](https://github.com/danybgoode/miyagisanchezcommerce/pull/158)
merged `893d23b` (squash) · branch deleted
**Risk:** low (copy only) — reviewer-merged on green CI + clean fresh-reviewer pass + clean Codex
cross-review (advisory).

## Story 1.1 — Rewrite `buildSetupPrompt` to read context + interview ✅
**As a** prospective seller, **I want** the setup prompt to give my agent Miyagi context and interview me when
I share little, **so that** it produces a real shop instead of an empty `{"miyagi_setup_version":"1"}`.
**Root cause:** `buildSetupPrompt()` (`lib/setup-spec.ts`) instructs "from what the seller shares, generate ONE
JSON… return ONLY the JSON" — no instruction to read platform context or to interview, so empty input → bare
skeleton.
**Changes (prompt body only):**
- Add an **objective** line up top: help the seller open a complete Miyagi shop; the final deliverable is one
  valid setup JSON, but getting there may require conversation.
- **Context step:** instruct the agent to first read a Miyagi source to ground itself (e.g.
  `https://miyagisanchez.com/api/ucp/setup-spec` for the schema/spec, and `/vende` or `/acerca` for what the
  platform is) before asking or emitting.
- **Interview step:** if the seller hasn't provided catalog/config/profile, the agent should **ask** a short
  set of questions (what they sell, a few products + prices, shipping/pickup, payment methods, shop name/
  location) and only produce the file once it has enough — never emit an empty skeleton.
- **Preserve:** the exact final-output contract (one valid JSON object, no markdown/prose around it), the
  `SETUP_LANGUAGE_DIRECTIVE`, the schema/block/field lists, and the manual-steps note.
**Acceptance:** pasting the prompt into Claude/ChatGPT with **no** catalog makes the agent interview (and/or
read the linked context) and only then emit a valid file — it does **not** reply with a bare skeleton. With
real input, the emitted file still round-trips through `validateSetup` unchanged. The prompt renders identically
on `/sell/setup`, `/agent`, and `/api/ucp/setup-spec`.
**Risk:** low · **QA:** `api` spec asserting the prompt string contains the objective + context-read +
interview instructions **and** still the JSON-only final-output line + the language directive; a render check
that `/agent` + `/api/ucp/setup-spec` serve the same string. (Per LEARNINGS: assert only true placeholder
markers, not natural-language words like "TODO".)

## Sprint QA
- **api spec:** Story 1.1 (prompt-string contents + JSON-only contract intact).
- **Free coverage seam:** `buildSetupPrompt()` is pure → covered directly.
- **owed to Daniel:** judging the prompt's real behavior by pasting it into a live agent (an api spec can't
  evaluate whether the agent actually interviews well).
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the branch preview URL while testing pre-merge)

1. Open `https://miyagisanchez.com/sell/setup`, expand "Prompt para tu agente", **Copiar prompt**.
   → The copied prompt opens with an **OBJETIVO** line, then **PASO 1 — CONTEXTO** (read
   `/api/ucp/setup-spec`, `/vende`, `/acerca`), **PASO 2 — ENTREVISTA** (ask questions if you gave
   nothing), and **PASO 3 — EMITIR** (the JSON-only output — unchanged contract).
2. Paste it into Claude (or ChatGPT) and send **nothing else** (no catalog).
   → The agent **asks you questions** (what you sell, prices, delivery, payment, shop name/location)
   instead of returning `{"miyagi_setup_version":"1"}`. **[agent-quality — owed to Daniel]**
3. Answer with a couple of products; let it produce the file. Paste that file back into `/sell/setup` → **Revisar**.
   → It validates (products staged, no "archivo no válido") — proving the emitted shape still round-trips.
4. Open `https://miyagisanchez.com/agent` and find the "Prompt para copiar (es-MX)" block.
   → It matches the improved prompt (same source — `buildSetupPrompt()`).
5. `curl -s https://miyagisanchez.com/api/ucp/setup-spec | jq -r .prompt` (or open the URL directly).
   → The `prompt` field carries the same OBJETIVO/PASO 1/PASO 2/PASO 3 text as steps 1 and 4.

If any step fails, note the step number + what you saw — that's the bug report.

**Verified pre-merge (this session, local dev server):** steps 1, 4, and 5's rendered content confirmed
byte-consistent across `/sell/setup` (redirect-gated, anon 307 to sign-up — expected), `/agent`
(public, 200), and `/api/ucp/setup-spec` (public, 200) — all three call the one `buildSetupPrompt()`.
Step 2 (does the agent actually interview well) is **owed to Daniel** — pasting into a live agent is
outside what an `api` spec or a local render check can judge.
