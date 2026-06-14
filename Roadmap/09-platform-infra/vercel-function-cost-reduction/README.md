---
status: shipped   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: vercel-function-cost-reduction
---

# Epic: Vercel function & Fluid-CPU cost reduction ✅ COMPLETE (2026-06-13)

> **Area:** 09-platform-infra · **Risk:** low · **Scope seed:** [`00-ideas/seeds/vercel-function-cost-reduction.md`](../../00-ideas/seeds/vercel-function-cost-reduction.md)

**All 3 sprints shipped.** S1 backend cron cadence ([PR #28](https://github.com/danybgoode/medusa-bonsai-backend/pull/28) `2fa1773`) ·
S2 `/_not-found` (2.1 Bot Protection **Active** + 2.2 cheap cached 404, [PR #92](https://github.com/danybgoode/miyagisanchezcommerce/pull/92) `db3c0a3`) ·
S3 visibility-gated unread poll ([PR #94](https://github.com/danybgoode/miyagisanchezcommerce/pull/94) `507ee9c`).
No product-behaviour change — pure cost tuning. See [`RETROSPECTIVE.md`](./RETROSPECTIVE.md).
Owed Daniel: S1 live draw smoke + S3 authed DevTools eyeball; one test follow-up (`not-found-shape.spec.ts` vs the firewall 403) spun off.

## Why
The Vercel free tier is **over on Fluid Active CPU (7h10m / 4h)** and at **822K / 1M Function Invocations**
for the May 14–Jun 13 period, triggering overage emails. The cost is almost entirely **self-inflicted waste**
on the `miyagisanchez` project (~98% of team invocations; the other 5 projects are negligible): a draw cron
firing every minute, an unguarded 404 path that pays a full data fetch before failing, and a client poll
that runs even in backgrounded tabs. This epic removes that waste so usage drops back under the free caps
with headroom — no product behaviour change, just stop paying for nothing.

## Medusa-first note
N/A — this is platform/infra cost tuning, not a commerce feature. No Medusa primitive involved; one slice
adjusts a Medusa **scheduled job's** cadence (`apps/backend/src/jobs/sweepstakes-draw.ts`), the rest are
Next.js/Vercel-side (a 404 path, a client poll, a Firewall toggle).

## What already exists (reuse, don't rebuild)
- `apps/backend/src/jobs/{sweepstakes-draw,reconcile-checkouts}.ts` — the scheduled jobs whose cadence is the S1 fix.
- `app/not-found.tsx` (already static), `app/l/[id]/page.tsx` + `app/s/[slug]/page.tsx` (`getListing`/`getShop` → `notFound()`), and the existing `s-maxage` cache-header idiom in `app/robots.txt/route.ts` + `app/llms.txt/route.ts` (S2).
- Vercel **Firewall → Bot Management** toggle (S2, dashboard — no code).
- `app/components/MobileTabBar.tsx` + `app/components/DesktopUnreadBadge.tsx` (the 60s polls); `app/g/[slug]/SweepstakesEntryClient.tsx` for a visibility-pattern reference (S3).

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | Backend cron cadence | low |
| 2 | /_not-found cost — Bot Protection + cheap 404 | low |
| 3 | conversations/unread poll | low |

## Deploy order
Independent slices, any order. **S1** is backend (Cloud Run, ~12 min, no preview) — already in flight as
[backend PR #28](https://github.com/danybgoode/medusa-bonsai-backend/pull/28). **S2/S3** are frontend
(Vercel preview per PR) plus, for S2, one **Firewall dashboard toggle** (no deploy). No cross-slice
dependency; no degrade-gracefully concern (nothing reads another slice's output).

## Definition of Done (epic)
- [x] All sprints merged to `main` + smoke-tested (gaps stated) — S1 #28, S2.2 #92, S3 #94; S2.1 firewall live. Owed Daniel: S1 draw + S3 eyeball.
- [x] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [x] This README marked ✅; every sprint status ticked with commit refs
- [x] `RETROSPECTIVE.md` written
- [x] Product poster (`Roadmap/README.md`) updated
- [x] Team memory + `MEMORY.md` index updated
- [x] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [x] **Kill-switch:** N/A — none planned at grooming (low-risk epic, no money/auth path).
- [x] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
