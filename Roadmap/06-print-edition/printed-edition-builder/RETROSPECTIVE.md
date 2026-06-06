# Retrospective — Printed-Edition Builder

**Date:** 2026-06-03 · **Scope:** the full epic (Sprints 1 & 2, 7 user stories) plus the GCP deploy of the PDF service.

## Outcome
Shipped the whole "Maqueta" builder end to end and deployed it. Daniel laid out and exported the first real issue the same day — **a clean, press-ready PDF on the first try.** The manual design bottleneck between selling ads and printing is gone.

**Delivered:** 7 user stories · ~9 commits to `main` · every story type-check + lint + build clean · 1 new isolated Cloud Run service deployed and verified in production.

---

## What went well
- **Ship-per-story cadence kept momentum and quality.** Each slice was independently testable, shipped immediately, and Daniel could try it on the live deploy as we went.
- **Plan-first paid off.** Agreeing the 7 stories up front (and the two consequential forks) meant no rework or surprise scope.
- **Reuse over rebuild.** One shared ad-tile component renders identically on screen and in print, so "what you see is what prints" — and there was no second implementation to keep in sync.
- **Surfacing the big decisions worked.** The two genuinely consequential calls — how to make the PDF, and *where* the renderer lives — were put to Daniel with clear trade-offs. Choosing an **isolated service** meant the heavy print engine can never endanger live commerce.
- **Verify-before-trust caught a real bug.** Rendering an actual issue locally before relying on it exposed a blank-pages problem (left over even from the earlier browser-print view); fixed before it mattered.
- **End-to-end ownership.** Code → verify → ship → deploy (GCP + Vercel) → live test, all in-session, with green lights on the money/infra steps.

## What could be better
- **Earlier real-data testing.** The blank-page issue existed in the browser print view too; rendering a real multi-page issue sooner would have caught it during that earlier story.
- **A local gotcha cost a beat.** The app's custom-domain routing intercepts unknown hostnames, which briefly muddied a local render test — worth remembering for any future local PDF testing (test against the deployed URL).
- **One throwaway commit.** An empty "redeploy" commit was needed to pick up new environment variables; fine, but a deliberate redeploy command would've been tidier.

## Review — quality & follow-ups
The shipped work is solid and live. Known, accepted trade-offs and optional follow-ups (none blocking):
- 📌 **PDF service cold start.** It scales to zero, so the first PDF after idle waits a few seconds for the renderer to wake. Acceptable for occasional editor use; pin one warm instance if it ever feels slow.
- 📌 **PDF service auth.** Gated by a shared secret over HTTPS. Fine; could be tightened to identity-based access later.
- 📌 **Last-slot capacity race** on ad placements (pre-existing) and **in-memory export** of large issues — both fine at current scale; revisit if editions grow large.
- 📌 **Backlog still open:** print subscriptions ("cada edición"), self-serve print providers, and a QR-scan analytics dashboard to show how print drives marketplace traffic.

## Action items
- [ ] (Optional) Pin a warm PDF instance if first-render latency bothers the editor.
- [ ] (Optional) Move the PDF service to identity-based auth.
- [ ] Consider the QR-scan analytics dashboard next — it closes the print → marketplace loop with real numbers.
