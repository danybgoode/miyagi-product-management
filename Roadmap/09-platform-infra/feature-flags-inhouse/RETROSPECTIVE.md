# Retrospective — In-house feature flags (replace Flagsmith)

**Macro-section:** 09 · Platform & Infra · **Class:** chore / infra migration · **Closed:** 2026-07-01 · **3 sprints.**

## What shipped
Replaced the **Flagsmith SaaS** flag backend with an **owned Supabase store** behind the *unchanged*
`isEnabled()` seam, added an admin control surface, then fully decommissioned Flagsmith.

- **S1** — `platform_flags` Supabase table (RLS on, service-role read only), seeded behavior-preserving
  (11 rows = current `DEFAULT_FLAGS`). FE `lib/flags.ts` + BE `src/lib/flags.ts` internals swapped to a
  60 s in-process-cached, ≤2 s-bounded, **fail-open** read of that table (FE #150 `b0582b0` · BE #50 `5179718`).
- **S2** — `/admin/flags` page in `AdminShell` (`requireAdmin`) + audited `POST /api/admin/flags`
  (`withAdmin` → `admin_audit_log`), over a pure `lib/flags-admin.ts` validator seam (#151 `03f5770`).
- **S3** — removed the `flagsmith-nodejs` dependency from both apps, scrubbed every Flagsmith reference
  under `apps/`, dropped the `FLAGSMITH_ENVIRONMENT_KEY` Cloud Run binding + drift-guard assertion, and
  deleted the live secrets (FE #152 `d9eddd1` · BE #51 `1b44587` · infra `c853827`).

Net: one flip in `/admin/flags` now governs both apps within 60 s, on owned infra, with no third-party
quota to expire — which is exactly why this epic existed (Flagsmith's free tier lapsed and disabled the
instance, leaving no runtime switch).

## What went well
- **The seam held.** Because S1 kept `isEnabled` + `DEFAULT_FLAGS` + `FlagKey` byte-identical, every
  downstream consumer (checkout kill-switch, envia, paywall gates, PDP redesign) and its specs were an
  untouched regression net — S3 was purely subtractive with zero behavior change.
- **Fail-open + seed = zero-risk cutover.** The seed matched `DEFAULT_FLAGS`, so both readers were safe
  no-ops from merge until a deliberate flip; no coordinated big-bang.
- **Cross-agent review + CI carried the merge.** Codex second-opinion clean on both PRs; FE
  tsc+build+Playwright-vs-preview and BE type-check+build+unit all green pre-merge.

## What we learned (promoted to LEARNINGS.md)
1. **When verifying "is the prior sprint serving?", reason off `origin/main`, never the working tree.**
   Both local app checkouts were parked on *other* epics' branches, so on-disk `flags.ts` still imported
   `flagsmith-nodejs` and the admin page looked "missing" — a pure checkout artifact. A sub-agent that
   trusted a stale local `origin/main` also **misread a squash-merge as "unmerged"** (S2's individual
   commits aren't on main — only the squash commit is). Confirm with `gh pr view --json state,mergeCommit`
   and `gh api .../contents/<path>?ref=main` / `git grep <x> origin/main`, not `ls`/working-tree reads.
2. **Decommissioning a dependency is bigger than the `package.json` line.** The acceptance grep
   (`grep -ri flagsmith apps/`) forced scrubbing ~30 comment/spec/script/migration mentions, and several
   were *factually stale* post-S1 (they claimed a helper avoids pulling in `flagsmith-nodejs` when the
   reader now imports Supabase). Rewrite comments for the **new** reality; don't blind find-replace.
3. **Removing a Cloud Run secret is a same-change trio:** drop it from `deploy.sh` `--set-secrets` **and**
   the drift-guard `node:test`'s expected set (else the guard reds), and only then delete the Secret
   Manager secret — because `--set-secrets` **replaces**, a stale binding makes a future full deploy error
   "secret not found."
4. **Live secret-deletion order: unbind, then delete.** `gcloud run services update --remove-secrets`
   first (the new revision must boot *without* the secret — which proves it's unneeded), then
   `gcloud secrets delete`. Deleting the secret first would fail-close any new revision (`:latest` unresolvable).

## Gaps / owed
- **Live `/admin/flags` flip smoke owed to Daniel** — browser/admin-session-gated; the money-path
  `checkout.stripe_enabled` flip especially (an automated smoke can't cover a real checkout).
- The S1 "make the table unreadable → both fail open" chaos check was reasoned + unit-covered, not
  exercised against live prod.

## Follow-ups
- None required. `feature-flags-killswitches` (the prior epic) is superseded — its backend is now the
  in-house store; poster annotated accordingly.
