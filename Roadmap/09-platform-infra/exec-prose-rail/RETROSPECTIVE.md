# Retrospective — Executive prose rail

_Closed: 2026-07-26_

## What shipped

**Sprint 1 — the shared rail** (`a5c72b4`, `4495533`, `b25c433`, `a571d7c`).
`scripts/lib/prose-guard.mjs` (pure, every rule a measured failure) and `prose-writer.mjs`
(devin → agy, guard-and-retry) ported onto our existing `cross-agent-cli` primitives. The CPO persona,
three per-surface task files, and `prose-lessons.md` — all plain files, shared by both backends.
`prose-draft.mjs` rewired to ride the rail.

**Sprint 2 — the daily standup** (`c0e3d29`). `--brief` emits a deterministic evidence pack;
`--post --prose-file` runs the same pure guard and exits non-zero with a numbered revision note.
`ops-nightly.prompt.md` teaches the write → guard → revise loop.

**Sprint 3 — the weekly recap** (`7ba440e`). The same contract at exec altitude, with shipped epics
and their retro digests leading the pack. `WAYS-OF-WORKING.md` gained a "prose rail" section.

## What went well

**The two-backend split was the right call, and it was Daniel's.** The original plan routed everything
Claude-native. Daniel corrected it: routines write the two scheduled reports, devin/agy handle
everything local. That is strictly better — it keeps paid-for quota in use and routine capacity free —
and the investigation it forced surfaced the load-bearing constraint: **devin and agy have no headless
auth**, so a straight golden-beans port would have produced *zero prose* on exactly the two surfaces
the epic exists for, silently.

**The input advantage is real and visible.** A weekly brief over 2026-07-20..26 produces ten shipped
epics with their retrospective excerpts — product language, written before the code — before a single
commit subject is consulted. That is what makes product-altitude prose possible rather than aspirational.

**We imported a fix before it bit us.** `prose-draft.mjs` defaulted to `gemini-3.5-flash-high`, the
exact constant golden-beans identified as having silently destroyed the register of every report it
wrote. Observed live during close-out: an unmodified run fell back from Gemini to GPT-OSS mid-draft.

## What we learned

**A guard that rejects correct output is worse than one that misses a rare fault**, and we shipped that
mistake twice before catching it — both times by running the rail, not reviewing it.

First: every `--kind poster` draft ends with the house table row, which has no sentence-final
punctuation, so the `unfinished` rule flagged it on both writers through all four attempts. Second, and
worse: the beneficiary rule fired on a draft that *complied* with our own lessons file. `prose-lessons.md`
ends with "Say 'no user-visible effect' when that is the truth"; the persona asks for exactly that on
internal work; then the guard rejected the sentence that did it. **A guard contradicting its own brief
teaches the writer to avoid the honest phrasing** — the precise failure it existed to prevent.

**"Unknown" and "none" are different facts.** The evidence pack originally reported an unreadable flag
state as an empty flag list, which would have told the writer nothing was live when the truth was
unknown — a confident falsehood produced by the module built to prevent them.

**Assumed field names fail quietly.** The weekly pack read `e.digest`; the real field is `retroDigest`.
No error, just a thinner report with every retrospective excerpt silently dropped.

## Gaps / follow-ups

- **Neither scheduled surface has run live yet.** Both routine prompts are updated, but the first real
  fire of each is owed. The guard and both phases are proven locally; the routine's own write step is not.
- **Cross-agent review and a fresh `pr-reviewer` are owed** — the orchestrator built S1.2–S3 itself
  after the builder died to a session cap.
- **`flag-state-claim` has no live-flag input in a routine sandbox.** `gatherLiveFlags` reads the
  linked Supabase project, which an unattended routine cannot reach; it correctly degrades to UNKNOWN,
  but the rule is therefore advisory-only there until a credentialed read exists.
