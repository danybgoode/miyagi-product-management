# Vercel function & Fluid-CPU cost reduction — Sprint 3: conversations/unread poll

**Status:** ✅ built — Story 3.1 done (frontend `26c50d3`, branch `feat/vercel-cost-s3`, PR pending). Owed Daniel: authed DevTools eyeball (walkthrough below).

## Stories
<!-- `/api/conversations/unread` = 698/12h, polled every 60s from MobileTabBar + DesktopUnreadBadge,
     even in backgrounded tabs. In-conversation delivery is already realtime; this is only the global badge. -->

### Story 3.1 — Visibility-gate + lengthen the unread-badge poll ✅
**As** a signed-in user, **I want** the unread-count poll to pause when the tab is hidden and run less
often when visible, **so that** an idle/backgrounded tab stops generating a function invocation every
minute.
**Acceptance:**
- In `app/components/MobileTabBar.tsx` and `app/components/DesktopUnreadBadge.tsx`, the `setInterval`
  poll only fires when `document.visibilityState === 'visible'` (pauses on hidden/backgrounded tabs;
  resumes + refetches on `visibilitychange` → visible).
- Interval lengthened from 60s to 120–180s.
- With the tab backgrounded, **no** `/api/conversations/unread` requests fire (verify in DevTools network / Observability).
- The unread badge still updates correctly on return to the tab and within the interval while visible.
**Risk:** low (client-only; no server/auth/money change).

## Sprint QA
- **api spec(s):** none new (the endpoint is unchanged; this is client polling behaviour). Optionally a `*.browser.spec.ts` asserting no poll fires while `document.hidden` is simulated.
- **browser smoke owed:** light — confirm (DevTools network) that backgrounding the tab stops the requests; works anonymously-ish but needs a signed-in session for the badge, so a Daniel/authed eyeball.
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com (preview URL while testing pre-merge)

1. Sign in; open the app with DevTools → Network filtered to `unread`.
   → a request roughly every 2–3 min while the tab is focused.
2. Switch to another tab/window for a few minutes, then come back.
   → **no** `unread` requests while hidden; one fires on return and the badge is current.
3. Receive/clear a message; wait one interval.
   → badge count updates.

If any step fails, note the step number + what you saw — that's the bug report.
