# Build-order recommendation — next 3 epics (2026-06-08)

> **Advisory, not canonical.** Planning only — no code, no canonical-doc edits. Drafted at Daniel's
> request to sequence three lined-up epics and confirm what's genuinely up next. Once Daniel approves,
> fold the relevant parts into the canonical `BUILD-ORDER.md` (which is stale — see §1).
> **Validation:** every status below was checked against the epic READMEs, sprint files, seed
> frontmatter, and `git log` on `main` — not taken from `BUILD-ORDER.md`.

The epics to sequence:

- `Roadmap/03-selling-and-shops/shop-settings-refactor/README.md`
- `Roadmap/07-agentic-and-federated-commerce/agent-readable-about-surface/README.md`
- `Roadmap/03-selling-and-shops/agent-native-setup/README.md`
- `Roadmap/01-discovery-and-shopping/neighborhood-pulse/README.md` *(added 2026-06-08)*

---

## 1. State check — what's actually shipped (and what `BUILD-ORDER.md` gets wrong)

`BUILD-ORDER.md` (last touched 2026-06-08) still lists **#7 S2→S3** and the full **#3c chain
(Spike 0 → A → C → D, with B)** as "next." Validated reality:

| Item | `BUILD-ORDER` implies | Actual (validated) |
|---|---|---|
| #7 Events S2 | next | ✅ merged + deployed (PR #49) |
| #7 Events S3 | next | 🚧 **built in draft — awaiting Daniel** merge for S3.1/S3.2 |
| #3c Epic A · discovery-polish | next | ✅ **COMPLETE** — 3 sprints to prod (PRs #50/#51/#53) |
| #3c Spike 0 · arranged-only | next | ❌ seed `status: ready` — **decision not made** |
| #3c Epic C · trust-messaging | next | ❌ 📋 PLANNED, not started |
| #3c Epic D · cross-channel | next | ❌ 📋 PLANNED, blocked-by Epic C (C.4) |
| #3c Epic B · delivery-money-polish | next | ❌ 📋 PLANNED, not started ← **the real next build** |

So Daniel's framing is right in spirit but only **partly** literally true: of the "next builds," only
**Epic A and #7 S1/S2** actually shipped. **Epics C, D and Spike 0 are still planned** — they are *not*
predecessors of Epic B, so they don't block it.

### Is `delivery-money-polish` a valid "up next"? — Confirmed, with one caveat
- It's groomed, signed off (Daniel, 2026-06-07), scaffolded, all sprints ⬜ not started.
- Per `BUILD-ORDER` the #3c order was "A → C → D, **with B**" — B is parallel to C/D, not downstream of
  them, so promoting it ahead of C/D is a clean reprioritization, not a dependency violation.
- **Caveat — slice B.5 (arranged-only):** Daniel reports Spike 0 was run and the decision made, but
  **it is not recorded anywhere in this repo** (validated 2026-06-08: seed `spike-arranged-only-delivery.md`
  still `status: ready`, Decision section "_pending_"; nothing uncommitted; no other branch / worktree /
  stash carries it). So **B.5 stays parked until the decision is written into the seed** — the rest of
  Epic B (S1 refund state, S2 pickup propose-and-confirm, S3 CP-first + quote recovery) is unblocked
  and can build now. ✅ Confirmed delivery-money-polish is a valid next build.
  **Owed:** paste the Spike 0 decision (Go / No-go / Go-with-constraints + per-listing-vs-per-shop model)
  so it can be recorded and B.5 deep-groomed.

---

## 2. Recommended build order — three independent tracks

**TL;DR:** only one hard dependency exists — `agent-readable-about-surface` → `agent-native-setup`.
Everything else is independent and parallelizable. Three tracks can run concurrently (parallel agents,
own branches):

- **Track 1 — GTM chain (sequential):** `agent-readable-about-surface` → `agent-native-setup`
- **Track 2 — settings chore (independent):** `shop-settings-refactor`
- **Track 3 — growth (independent):** `neighborhood-pulse`

| # | Epic | Track | Why here | Risk / Daniel-merge | Sprints |
|---|---|---|---|---|---|
| 1 | **agent-readable-about-surface** (07) | 1 | No deps. Cheap, all-LOW (reviewer auto-merge). **Enabler for #2** — ships the `lib/about-content.ts` source agent-native-setup reuses, and the `/acerca` "how to start" that links into its flow. Unlocks the "No nos creas, pregúntale a Claude" campaign. | LOW (auto-merge) | 2 |
| 2 | **agent-native-setup** (03) | 1 | Highest leverage, but **soft-depends on #1** (reuses its content source; `/acerca` links here, and #1's DoD says only link live steps). Deepest of the set. | **HIGH (S2 — Daniel merges)** — creates shops + bulk products | 3 |
| ∥ | **shop-settings-refactor** (03) | 2 | Functionally **independent**, behavior-preserving chore, frontend-only → ideal parallel track per the LEARNINGS parallel-agent guidance. If forced linear, place **last**. | LOW overall; **S3 HIGH (Daniel merges)** | 4 |
| ∥ | **neighborhood-pulse** (01) | 3 | Functionally **independent** — own surface (community/print pipeline + listing ranking + `/vecindario`), no overlap with the others. **Not frontend-only** (S1.1 = additive Supabase `web_visible` column → **backend-first**). Strategically a growth/engagement play, lower urgency than the GTM chain; cheap + isolated, so run whenever there's a free agent. If forced linear, place **after** the GTM chain. | LOW overall; **S1.1 MED migration** (per WAYS, a DB migration leans Daniel-merge — flag it) | 2 |

### Rationale
- **The chain is real.** `agent-native-setup`'s "What already exists" explicitly names
  *"Sibling content source: `agent-readable-about-surface`'s `lib/about-content.ts`"*, and its DoD
  requires coordinating so `/acerca`'s "how to start" only links steps that are live. Build the
  about-surface first so the setup epic reuses a real source instead of stubbing it.
- **Front-load the cheap, low-risk win.** about-surface is all-LOW (reviewer can auto-merge on green
  CI), so it lands while Daniel's merge attention is on the HIGH `delivery-money-polish` sprints — no
  contention for his review time.
- **shop-settings-refactor parallelizes cleanly.** It's "no user-facing change," frontend-only, behind
  the existing route + save seam — exactly the isolated, low-conflict profile the LEARNINGS say to run
  on a parallel branch. No reason to gate the agent-native chain behind it.
- **neighborhood-pulse is its own world.** Reads existing catalog/order signals + the community/print
  submissions table to render a `/vecindario` feed — none of the other epics touch that surface. The
  only shared seam is the **additive** UCP/MCP catalog read (S2.3 pulse view), which also coexists with
  about-surface S2 + agent-native-setup's manifest changes (all additive). Its `web_visible` migration
  is internal to the epic — no cross-epic backend dependency — but it does mean this track has a real
  backend deploy (the other three are frontend-only), so apply the backend-first rule **within** it.

---

## 3. Coordination notes (the only places these collide)

1. **Agent-config seam — shop-settings-refactor S3 vs agent-native-setup.** Both touch the
   agent/MCP config area: shop-settings-refactor **S3** extracts the "Agentes/webhook" settings section
   and must *"verify the MCP/agent config path still writes the same tree through the same seam"*;
   agent-native-setup extends the manifest/MCP surfaces. → **Run shop-settings-refactor S3 *after*
   agent-native-setup's manifest/MCP changes land** (or have the two agents coordinate on that seam).
   Low collision risk otherwise — agent-native-setup reuses `SettingsImportClient.tsx` + the import
   routes, *not* the 4,218-line `ShopSettings.tsx` monolith being refactored.
2. **Shared-routing announce.** shop-settings-refactor **S4** decommissions the monolith and touches
   shared routing + deletes a large file → **announce + merge latest `main` first** (LEARNINGS
   shared-surface rule). Same for any about-surface story that touches `robots.ts`/layout.
3. **Backend-first applies to two epics, not the GTM/settings ones.** about-surface, agent-native-setup
   ("no backend repo change expected"), and shop-settings-refactor are frontend-only. **neighborhood-pulse
   S1.1 and delivery-money-polish S1/S2 do span backend** → merge backend-first there and degrade the
   frontend gracefully across the ~12-min Cloud Run window (`web_visible ?? false`, `refund_state ?? 'none'`).

---

## 4. How this sits next to `delivery-money-polish`

`delivery-money-polish` is the confirmed immediate next build (HIGH — Daniel merges S1/S2). The three
epics here follow it. To spread Daniel's HIGH-merge load:

- Run **about-surface (LOW, auto-merge)** alongside delivery-money-polish — no Daniel-merge contention.
- Bring **agent-native-setup's HIGH S2** *after* delivery-money-polish's HIGH sprints clear.
- Slot **shop-settings-refactor's single HIGH S3** into a gap between the above.

**Daniel-merge (HIGH/MED) load, in suggested order:** delivery-money-polish S1+S2 → agent-native-setup
S2 → shop-settings-refactor S3 → neighborhood-pulse S1.1 (MED migration). Everything else is LOW
(reviewer auto-merge on green CI).

---

## 5. Suggested sequence (one line)

> **delivery-money-polish** (next; B.5 parked until the Spike 0 decision is recorded), then the three
> independent tracks in parallel: **Track 1** `agent-readable-about-surface` → `agent-native-setup`;
> **Track 2** `shop-settings-refactor` (S3 after agent-native-setup's MCP changes; S4 announced);
> **Track 3** `neighborhood-pulse` (backend-first; lower urgency — run on free capacity). If forced
> into a single line: delivery-money-polish → about-surface → agent-native-setup → shop-settings-refactor
> → neighborhood-pulse.
