# Messaging Platform — Realtime + Web Push (infra hardening)

Area: Infra / Messaging
Priority: P1
Status: ✅ MERGED TO MAIN (2026-05-30, commit 64f2102). All phases shipped. Pending: 2 Daniel dashboard toggles to activate realtime.

> **Built 2026-05-29:** Phase 0 (RLS + policies + realtime publication + `push_subscriptions` applied via `supabase db query --linked`; anon key + VAPID keys in Vercel/.env.local). Phase 1 (browser client, `useConversationStream` seam, ConversationClient on realtime + backfill, unread poll 20→60s). Phase 2 (`notify()` VAPID seam, `public/sw.js`, `lib/push-client.ts`, `/api/push/subscribe`, stamp route → push recipient). Phase 3 (rate-limit + zod on stamp/offer routes, mark-read decoupled from GET, observability). tsc clean.
> **PENDING (Daniel, 2 dashboard clicks — realtime auth won't work until done):** (1) Clerk → "Connect with Supabase" (adds `role:authenticated` claim); (2) Supabase → Auth → Third-Party Auth → Add Clerk (issuer `https://clerk.miyagisanchez.com`).
> **Until those toggles are done:** app falls back to 30s poll automatically — not broken, just not instant.
> **Verify after toggles:** open any `/messages/<id>` on prod, DevTools Console → look for `[realtime] connected <id>`.
Owner: Daniel
Created: 2026-05-29
Branch: `feat/messaging-realtime` (in `apps/miyagisanchez` — cut at implementation start; keep `main` clean for the Session-B chat)

North star: Vinted/WhatsApp-grade buyer–seller messaging — instant delivery, out-of-app notifications, hardened, cheap to run, and **not locked to any vendor**. Derived from the 2026-05-29 research + dependency/lock-in evaluation.

---

## Current architecture (confirmed)

- **Store:** Supabase Postgres — `marketplace_conversations`, `marketplace_conversation_events`, `marketplace_offers` (+ listing/shop joins). Correct per AGENTS rule #2 (Medusa has no chat concept). This is the only hard-to-move asset; it's plain Postgres → portable.
- **Access:** 100% server-side via the **service-role** client (`lib/supabase.ts`). Browser never touches Supabase. No anon key in use anywhere.
- **Auth:** Clerk `currentUser()` in every route; participant checks present (`isBuyer`/`isSeller` → 403). Authz is solid.
- **Messages:** **stamp-based** (`BUYER_STAMPS`/`SELLER_STAMPS`) + offer negotiation. Structured, not free text. (Keeping it that way — free text is out of scope.)
- **Delivery = polling:** open chat re-fetches the *entire* thread via `GET /api/conversations/[id]` **every 5 s** (and writes `unread=0` as a side effect each time); unread badge (`MobileTabBar` + `DesktopUnreadBadge`) polls `/api/conversations/unread` **every 20 s**. No realtime, no push, no service worker.

### Problems
1. Cost/load scale with open-tabs×time, not activity (every poll = a Vercel invocation + ≥3 Supabase queries + a write, even when nothing changed).
2. ~5 s delivery latency.
3. Full-payload every cycle (no delta).
4. No out-of-app delivery (nothing when the tab is closed) — the biggest gap.
5. "Mark read" is coupled to the poll.

---

## Locked decisions (from the dependency/cost-of-opportunity eval)

- **Live transport → Supabase Realtime** now (managed, already provisioned), **behind a `useConversationStream()` seam** so it's swappable. Free tier = 200 concurrent connections / 2M msgs/mo; Pro ($25) = 500. supabase-js uses **one WS per browser** (multiplexed), so connections ≈ concurrent active clients.
- **Conservation lever:** realtime connection **only while a conversation is open**; keep the global unread badge on a **low-frequency poll** (or fold into the socket when present). Keeps concurrent connections ≈ "people actively chatting," a small fraction of online users → free tier lasts well past launch.
- **Web push → VAPID direct** (W3C Web Push, `web-push` npm) — no Firebase/FCM needed for web. **Behind a `notify(userId, event)` seam.** **Novu deferred** (add later behind `notify()` when multi-channel/inbox is wanted — the expensive part, the service-worker/subscription plumbing, is identical either way so there's ~zero retrofit penalty).
- **Auth bridge → Clerk native third-party auth** for Supabase (GA Apr 2025; old JWT-template method deprecated). RLS keys off `auth.jwt()->>'sub'` (= Clerk `user_xxx`, matches `*_clerk_user_id` columns).
- **Writes stay server-side** (service-role, validated, authz'd). Browser gets **read-only** realtime via anon key + RLS. Best of both: secure writes, real-time reads, fan-out cost on Supabase not Vercel.
- **No GCP realtime now.** Documented escape hatch only: Centrifugo/Soketi on Cloud Run + Memorystore (~$40–60/mo flat, no connection ceiling) — economical only past ~500 concurrent. Deferring costs one module swap (data doesn't move).

### Validation already done (2026-05-29)
JWKS anchor `clerk.miyagisanchez.com/.well-known/jwks.json` live (200); `sub` matches the `*_clerk_user_id` columns; native integration is GA. **Greenfield:** no anon key, Clerk session token has no `role` claim, RLS/publication not set. The one thing to confirm post-setup: a `postgres_changes` subscription delivering under RLS with the Clerk JWT (documented happy path).

---

## The two seams (the whole point — keep vendors swappable)

```ts
// lib/messaging/stream.ts — transport seam (Supabase Realtime today)
export function useConversationStream(conversationId: string, opts: {
  onEvent: (e: ConvEvent) => void          // new conversation_events row
  onConversation: (c: Conversation) => void // unread/status changes
}): { connected: boolean }

// lib/notify.ts — notification seam (VAPID today; Novu later, no caller changes)
export async function notify(userId: string, event: {
  kind: 'new_message' | 'offer' | ...,
  title: string, body: string, url: string
}): Promise<void>
```
Swapping Supabase Realtime → Centrifugo, or VAPID → Novu, touches only these files.

---

## Phases

### Phase 0 — Foundation / setup
| # | Task | Who |
|---|---|---|
| 0.1 | Fetch anon key → set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel + .env.local) | **[CLI — Claude]** `supabase projects api-keys --project-ref xljxqymsuyhlnorfrnno` |
| 0.2 | Clerk: enable **Connect with Supabase** (adds `role: authenticated` to session token) | **[Dashboard — Daniel]** (Claude attempts `clerk config patch` first) |
| 0.3 | Supabase: **Authentication → Third-Party Auth → Add Clerk** (issuer `https://clerk.miyagisanchez.com`) | **[Dashboard — Daniel]** (Claude attempts via Management API/CLI first) |
| 0.4 | Enable RLS + read-only participant policies on the two tables | **[CLI — Claude]** `supabase db query` (SQL below) |
| 0.5 | Add tables to `supabase_realtime` publication + `replica identity full` on conversations | **[CLI — Claude]** `supabase db query` |
| 0.6 | **Spike check:** subscribe with a Clerk JWT, confirm RLS-filtered `postgres_changes` delivery | **[Claude]** in the branch |

**RLS SQL (0.4):**
```sql
alter table marketplace_conversations enable row level security;
alter table marketplace_conversation_events enable row level security;

create policy "participant reads conversation"
  on marketplace_conversations for select to authenticated
  using ( auth.jwt()->>'sub' in (buyer_clerk_user_id, seller_clerk_user_id) );

create policy "participant reads events"
  on marketplace_conversation_events for select to authenticated
  using ( exists (
    select 1 from marketplace_conversations c
    where c.id = conversation_id
      and auth.jwt()->>'sub' in (c.buyer_clerk_user_id, c.seller_clerk_user_id)
  ) );
-- NO insert/update/delete policies for `authenticated` → all writes stay server-side (service-role bypasses RLS).
```
**Realtime publication SQL (0.5):**
```sql
alter publication supabase_realtime add table marketplace_conversation_events;
alter publication supabase_realtime add table marketplace_conversations;
alter table marketplace_conversations replica identity full; -- so unread UPDATEs carry needed cols
```

### Phase 1 — Realtime read path (kill the polls)
1. `lib/supabase-browser.ts` — anon browser client created with `accessToken: () => clerkSessionToken` so Realtime uses the user's JWT for RLS.
2. `lib/messaging/stream.ts` — `useConversationStream()` subscribing to `conversation_events` (filter `conversation_id=eq.X`) → `onEvent`, and `marketplace_conversations` (the user's rows) → `onConversation`.
3. `ConversationClient.tsx` — replace the 5 s `setInterval` with the stream; **keep a one-shot `?since=` delta fetch for backfill on connect/reconnect** (no steady-state polling).
4. Unread badge — subscribe via the same socket when mounted; otherwise fall back to a **60 s** poll (down from 20 s). Net: realtime connections only for active chatters.
5. Remove the unread-reset side effect from `GET /api/conversations/[id]`; make "mark read" an explicit `POST .../read`.

### Phase 2 — Web push (the out-of-app gap)
1. Generate VAPID keypair; `VAPID_PUBLIC_KEY` (`NEXT_PUBLIC_`), `VAPID_PRIVATE_KEY` (server secret), `VAPID_SUBJECT` (mailto).
2. `public/sw.js` — service worker: `push` → `showNotification`; `notificationclick` → focus/open the conversation URL.
3. Client: register SW; request Notification permission at a **good UX moment** (e.g., after the user sends their first stamp, not on load); `PushManager.subscribe` with the VAPID key; POST subscription to server.
4. New Supabase table `push_subscriptions` (clerk_user_id, endpoint, p256dh, auth, ua, created_at; RLS server-only).
5. `lib/notify.ts` — `notify()` loads the recipient's subscriptions, sends via `web-push`, prunes dead ones (404/410).
6. Wire `notify(recipientUserId, …)` into the **server message/offer write path** (after the event row is written). v1: always push; later add "skip if recipient actively viewing."

### Phase 3 — Hardening
- Rate-limit the stamp/offer write routes (reuse `lib/ratelimit.ts` Upstash) + **zod** validation + idempotency key on sends.
- Message/event size cap + a content-moderation hook stub (trust).
- Observability: log realtime connect/disconnect + delivery latency; push success/prune metrics.
- Confirm Supabase Realtime connection headroom vs the 200 ceiling (alert at ~70%).

---

## CLI automation map
- `supabase projects api-keys --project-ref xljxqymsuyhlnorfrnno` → anon key (0.1)
- `supabase db query "<sql>"` → RLS, policies, publication, `push_subscriptions` table (0.4, 0.5, 2.4)
- `vercel env add` → NEXT_PUBLIC_SUPABASE_* + VAPID_* (Claude)
- Clerk `clerk config patch` → attempt the `role` claim (0.2); else Daniel clicks "Connect with Supabase"
- Supabase third-party auth registration (0.3) → likely Daniel dashboard; Claude attempts Management API first

## Verification
- 0.6 spike: Clerk JWT → `postgres_changes` delivers only the user's rows (RLS).
- E2E: two browsers (buyer/seller), send a stamp → appears <1 s with **no polling network traffic**; close one tab → web push arrives; unread badge updates via socket.
- Load sanity: confirm 1 WS/連 browser, connections drop to ~0 when no chats open.

## Rollout
- All work on `feat/messaging-realtime`. Keep the poll path behind a `MESSAGING_REALTIME` flag during rollout; flip on after the spike + E2E pass; delete poll code once stable. Merge to `main` (auto-deploys Vercel).

## Open questions / risks
- Supabase Realtime Authorization specifics for `postgres_changes` under third-party JWT — validate in 0.6 (low risk, documented).
- Permission-prompt UX timing (avoid prompt-on-load → low grant rates).
- iOS Safari web push requires the PWA be **installed to home screen** (16.4+) — note in UX; desktop/Android fine.
