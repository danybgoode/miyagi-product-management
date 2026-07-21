# dobby-foundation — portable ways-of-work (plugin marketplace + project template) — Retrospective

_Closed: 2026-07-20_

## What shipped

- **Sprint 1:** `danybgoode/dobby-foundation` became the portable plugin marketplace and project template;
  medusa-bonsai switched to the distributed `ways-of-work` skills; Golden Beans was spawned from the template
  with its own Roadmap, guards and CI. Root PR #89 plus foundation `87e892e` and Golden Beans `5de16f1` carry
  the delivery record.
- **Sprint 2:** `prose-draft` and its doctor/test rail were distributed to Golden Beans, and wakeup-resilient
  orchestration was codified in the template/grooming docs. PRs: medusa-bonsai #106, dobby-foundation #5/#6,
  Golden Beans #10; the sprint doc records the exact squash refs and review evidence.

## What went well

- Dogfooding found missing transitive scripts that a file-copy checklist would have missed; running the generated
  project guards proved the template rather than merely inspecting it.
- The plugin wrapper + per-project script-copy boundary settled cleanly: reusable instructions update centrally,
  while each repository keeps executable scripts appropriate to its own rails.
- This 2026-07-20 Codex session loaded and followed `groom` directly from the installed dobby-foundation plugin,
  additional live proof that the distributed work surface is usable outside the original Claude Code session.

## What we learned

- A template is only real when a spawned repository runs its own guards and CI; copying the expected filenames is
  not acceptance because scripts often have non-obvious transitive dependencies.
- Worker death/re-entry must be designed into the operating system: isolated worktrees, salvage the existing tree,
  resume from the same transcript, and verify by re-derivation rather than trusting a worker report.
- Distribution should centralize policy and templates without pretending all runtime scripts are location-free;
  explicit wrapper/distribution notes are safer than deleting a working consumer copy.

## Gaps / follow-ups

- The original interactive Claude `/plugin` slash-command smoke remains useful but non-blocking; non-interactive
  installation, cache resolution, Golden Beans spawn/CI and a real Codex plugin-triggered groom are all proven.
- `live-smoke` still documents Miyagi-specific paths/auth assumptions. Generalizing that wording belongs to a
  future template-shape improvement, not this closed extraction epic.
