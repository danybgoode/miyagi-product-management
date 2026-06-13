---
title: "Kill-switch flag decided at grooming, not at epic close"
slug: kill-switch-at-grooming
status: ready
area: "09"
type: chore
priority: null
risk: low
epic: null
build_order: null
updated: 2026-06-13
---

# ADR — A kill-switch is a *planned, sliced* unit of work, not a close-time checkbox

> **Status: awaiting Daniel's ratification in-session.** Docs-only. This note + the `groom`
> SKILL.md / template edits below are committed; the **WAYS-OF-WORKING wording (Part 6) is NOT
> merged** until Daniel approves the final shape. Low-risk tier (docs).

## Context
A doc-drift session proposed a new WAYS-OF-WORKING **Definition-of-Done (epic)** line —
*"high-risk epics ship behind a kill-switch flag."* It was deliberately **not** added. A DoD
checkbox is discovered at *epic close*: by then the seam is built, and "now wrap it in a flag"
is rework, not design. Risk and feature-type are already classified at **grooming** (the seed
frontmatter carries `risk: low|high`). That is where a kill-switch should be **decided,
expressed as a story, and sized** — so it ships as planned work, and the DoD only **verifies**
the planned slice landed.

The real flag layer already exists (LEARNINGS, Flagsmith epic): `lib/flags.ts` in both apps,
`flagsmith-nodejs`, fail-open `DEFAULT_FLAGS`, `isEnabled()` never throws. Adding a kill-switch
is *already* cheap — one flag + one `isEnabled()` check at the seam. So this is a **planning-time
prompt**, not new machinery.

## Decision (the shape)
At grooming, when an epic is classified `risk: high`, `groom` **evaluates whether a runtime
kill-switch applies** and, if it does, **emits it as an explicit sprint story** with the correct
fail-open polarity. The epic Definition of Done then only **verifies** that planned slice shipped
+ the flag exists — it introduces **no new build-time gate**.

Per Daniel's lead and his "evaluate always" preference, this is **recommendation, not
automation**: `groom` proposes the flag story (named flag, polarity, seam, mechanism) in the
scope seed; Daniel evaluates it at the existing scope-doc sign-off gate before scaffolding. No
auto-injection.

---

### 1. Mandatory for all `risk: high`, or judgment-with-default?
**Judgment-with-default, but the *decision* is always recorded.** For every `risk: high` epic,
`groom` asks one question: *is there a runtime seam a kill-switch can gate?*

- **Yes** → recommend the kill-switch as a story (default behaviour). Daniel ratifies it.
- **No** → write the **carve-out reason in one line** in the scope seed, so the absence is
  deliberate, not forgotten.

What is always mandatory is the **one-line answer in the scope doc** — not the flag itself.
Carve-outs (high-risk but a runtime flag can't/shouldn't gate it):

- **DB migrations / schema changes.** The migration runs regardless of any flag — you can't put
  a column behind `isEnabled()`. Mitigation is **expand/contract + reversibility** (and the
  app code that *reads* the new shape can still be flagged), not a kill-switch on the migration.
- **Edge / `middleware.ts`-gated seams.** The Flagsmith SDK is **not Edge-compatible** (LEARNINGS)
  — see Decision 3; the mechanism changes, not the principle.
- **Auth-provider / infra changes** where the gate *is* the provider/config (Clerk, env, deploy).
- **No new runtime seam** (e.g. a high-risk-for-other-reasons copy/config change with nothing to
  toggle). Record "no gateable seam" and move on.

### 2. Flag naming + where the taxonomy lives
**Extend the existing `lib/flags.ts` `DEFAULT_FLAGS` pattern — do not start a parallel doc taxonomy
that will drift.** Convention (matches shipped flags `checkout.stripe_enabled`,
`domain.paywall_enabled`):

```
<domain>.<feature>_enabled        // e.g. checkout.compra_protegida_enabled
```

- The **taxonomy home is the code** (`DEFAULT_FLAGS` in both apps), not `Roadmap/`. `groom` only
  *names* the flag in the scope/sprint doc; Claude Code adds it to `DEFAULT_FLAGS` at build time.
- **Comment the polarity inline** in `DEFAULT_FLAGS`, because the name alone doesn't carry it.

**Polarity — pick the fail-open default to match intent (this refines the original proposal).**
The brief said *"create flag X in Flagsmith (disabled in every env)"* **and** *"kill-switch ⇒
default true."* Those two are in tension, and the distinction matters:

- **Kill-switch** (ship live, instantly killable): code default **`true`**; **create it ENABLED in
  every env** so the switch is *armed* and the new feature is on. The deliberate act is to
  **disable** (kill). Creating it *disabled* would ship the feature **off** — that's the
  enablement pattern, not a kill-switch.
- **Enablement / dark-launch** (merge dark, activate deliberately — e.g. money infra that must be
  **seeded first**, per the run-order learning): code default **`false`** ⇒ ungated-by-default
  can't trap users; **create it DISABLED in every env**, flip on when ready.

So the grooming output states **which polarity** and therefore **how it's created in Flagsmith**.
And remember: **a flag is invisible until created in Flagsmith** — the story must include
"create it in every env," or there's nothing to toggle.

### 3. The Edge / middleware caveat
The Flagsmith SDK isn't Edge-compatible, so a seam living in `middleware.ts` / the Edge runtime
**cannot** call `isEnabled()` — it needs **Edge Config**, a different mechanism. This **does not
change the rule** (we still plan a kill-switch); it changes a **parameter of the story**: `groom`
must name **where the seam lives** and therefore the mechanism — **Flagsmith** for node/server
seams, **Edge Config** for Edge seams. Edge Config is the heavier lift, so naming it up front lets
Daniel weigh it when he evaluates the recommendation (it may tip a borderline seam to "server-side
gate" or "carve-out").

### 4. Composition with the existing risk-tier merge rule
Unchanged and complementary — **no new merge gate.** `HIGH ⇒ Daniel merges` still holds; the
kill-switch story is itself a story inside a high-risk epic, so it rides the same Daniel-merge
rule. The two reinforce each other: a high-risk epic is **planned behind a kill-switch** (grooming)
**and merged by Daniel** (the existing human green-light). The flag is also what makes the safe
money-path **run-order** possible (merge dark → deploy → seed → flip), so it strengthens the
guardrail rather than adding a parallel one.

---

## Part 5 — How it lands in `groom` (the cheap change)
1. **Stage 6 (Risk-tier)** gains one evaluative sub-step: for a `risk: high` epic, decide
   kill-switch *yes (recommend a story) / no (one-line carve-out)*, with named flag + polarity +
   seam + mechanism.
2. **Scope-seed template** gains a short "Kill-switch / runtime gate" block so the decision is
   captured at the sign-off gate.
3. **Epic-README DoD** gains a **verify-only** line (the planned slice shipped + the flag exists
   with the stated polarity) — explicitly *not* a new gate.

That's the whole footprint: one sub-step, one optional generated story, one verify line. No new
taxonomy doc, no scaffolder rewrite, no new CI/merge gate.

## Part 6 — Proposed WAYS-OF-WORKING wording (⛔ NOT merged — awaiting ratification)
To be added under **Definition of Done (an epic)** *only after Daniel ratifies*, phrased as
**verify-only**, with the decision pointer to grooming:

> - [ ] **Kill-switch (if one was planned at grooming):** the flag slice shipped and the flag
>   exists in Flagsmith (or Edge Config, for Edge seams) with the polarity the scope doc stated
>   (kill-switch ⇒ default `true`, created **enabled**; enablement ⇒ default `false`, created
>   **disabled**). This **verifies** planned work — it is **not** a new build-time gate. Whether a
>   high-risk epic needs a kill-switch is decided at **grooming** (see `skills/groom` Stage 6), not
>   discovered here.

Optionally, one line under the **risk-tier rule** cross-referencing that high-risk epics are
*planned* behind a kill-switch at grooming — kept as a pointer, not a duplicated policy.

## Consequences
- Kill-switches become **planned, sized, reviewed** work, decided when we already know the risk —
  not surprise rework at close.
- Every high-risk epic carries a **one-line, explicit** kill-switch decision (flag *or* carve-out
  reason) in its scope doc.
- DoD stays a **verifier**, not a policy source — no drift between "the rule" and "the gate."
- Net new machinery: **none**. We reuse `DEFAULT_FLAGS` + `isEnabled()` and the existing
  Daniel-merge rule.
