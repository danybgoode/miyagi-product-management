# Retrospective — prose rail: a third writer, and the worktree bug

_Closed: 2026-07-28_

PRs [#111](https://github.com/danybgoode/miyagi-product-management/pull/111) (root), [#323](https://github.com/danybgoode/miyagisanchezcommerce/pull/323) (storefront), [#122](https://github.com/danybgoode/medusa-bonsai-backend/pull/122) (backend)

## What shipped

`devin → agy → codex`, and a hook that actually runs in a worktree — in all three repos.

## What we learned

### What we got wrong, and it is the main lesson

**The stated problem was not the real problem, and the first fix solved neither.**

The brief was "the prose hook is flaky, GitHub Actions quota is refilled, move it there." Three
things in that sentence turned out to be false or beside the point:

1. **Actions quota was never the blocker.** The repos went public on 2026-07-18, and public repos do
   not meter standard-runner minutes. The `out of hosted-minutes quota` comment in the hook had been
   stale for ten days.
2. **The real blocker was headless auth**, which no amount of quota fixes. devin, agy and codex are
   all interactive CLIs. The first implementation "solved" this by adding a hosted Anthropic API
   backend — which worked, and was wrong: **the entire point of the rail is to use the cheap/free
   model CLIs.** Both the backend and the workflow were removed a day later.
3. **The flakiness was mostly not the writers at all.** It was a git hook that had been silently
   dead in every linked worktree.

**The lesson:** when a brief names a cause, verify the cause before building the fix. The evidence
was one `cat` away — `.git/merge-report.log` named devin's refusals *and* showed the fallback
working, and a single `ls` showed `.git` was a file. Both were checked only after the wrong thing
had been built.

### The bug worth remembering

The hook was dead in a worktree for **two independent reasons**, and neither could report itself
because the hook is backgrounded and `|| true`-ed:

1. `.git` is a **file** in a linked worktree, so `"$root/.git/merge-report.log"` failed with
   `Not a directory` — before the script ran.
2. The app repos borrow the root's `scripts/` via `$root/../../scripts`, which is correct from
   `apps/<name>` but resolves to `apps/<name>/scripts` from `apps/<name>/.worktrees/<wt>`. The hook
   hit its own `[ -f ] || exit 0` guard and vanished.

The second was found only while propagating the fix for the first — a reminder that fixing one
instance of "resolved off the wrong root" is not the same as auditing for the pattern.
See [[guard-the-population-not-the-door-you-found]] in team memory; this is the same shape.

## What went well

- **The existing fallback was already right.** devin → agy worked and had a live receipt in the log.
  Resisting the urge to "fix" a working mechanism saved a pointless change.
- **The seam held.** Adding and then replacing a whole writer backend touched `planWriters`,
  `writeProse` and nothing else. The guard, persona and lessons never moved.
- **Mutation testing paid twice.** Eleven mutations across the two implementations each turned
  exactly one spec red. More usefully, a spec caught a real bug review missed: the empty-output check
  did not trim, and `'   '` is truthy, so codex returning whitespace would have handed the guard an
  empty draft to approve.

### What to do differently

- **Verify a premise before building on it** — especially a premise about *why* something is broken.
- **A "cheap fix" claim needs the file open.** `guards.yml` was proposed as a one-line push trigger;
  it is PR-shaped in four places and would have put an auto-push-to-`main` path one bug away from
  existing. It was dropped after reading it, not before proposing it.
- **When you add a writer, stub it everywhere `has: () => true` appears.** Adding codex broke two
  specs that stubbed only devin/agy — they invoked the real CLI (7s and 14s). The file already
  recorded this trap for agy. A third writer proved it recurs, so the warning now sits at the top of
  the file.

## Gaps / follow-ups

- A merge observed reporting from a worktree checkout, where it previously died silently.
- The pull-dependency gap stays open by design: a hook only fires on the machine that pulls, so a
  squash-merge nobody pulled is still never reported. Re-open only if a free headless writer appears.
