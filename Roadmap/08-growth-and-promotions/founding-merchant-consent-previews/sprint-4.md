# Founding merchant consent-safe previews — Sprint 4: Merchant-verified approval (OTP)

**Status:** ✅ Shipped — FE #302 (`7b15d1b`); flag OFF, real-merchant code smoke owed to Daniel

> **Risk:** high — consent boundary + merchant-identity factor.

## Why this sprint exists

The epic's whole promise is **provable** merchant consent. As shipped, it isn't fully provable. The
merchant reviews and approves through an **opaque preview token that the promoter mints and holds**
(`resolvePreviewWithGrantByToken`), so in the consent record a promoter approving *on the merchant's
behalf* is **indistinguishable from the merchant approving themselves**. The S2 migration comment
already admits this ("NOT a legal signature"), and the post-merge review named it as an accepted
risk (2026-07-22, [[founding-merchant-batch-2026-07-21]]).

This sprint converts "possession of a link the promoter is holding" into "possession of the
**merchant's own inbox**" at the one moment it matters: approval. It does **not** change delivery,
review, request-changes, or activation — only the approval decision gains a second factor bound to
the merchant's contact.

Locked decision #3 ("consent is explicit") is what this operationalizes: today the system *records*
an explicit click; after this sprint it records an explicit click **plus proof the clicker holds the
merchant's contact**.

## What already exists (reuse, do NOT rebuild)

| Capability | Existing seam | Reuse |
|---|---|---|
| 6-char code + hashing + timing-safe compare | `lib/sweepstakes.ts` (`makeCode`, `hashVerificationCode`, `hashSweepstakesEmail`, `safeCompare`, `cleanEmail`) | The entire crypto layer — do not write new |
| OTP table shape (code_hash, attempts, expires_at, consumed_at) | `launchpad_campaign_verifications` / sweepstakes flows | Copy the shape, new scope table |
| Verify-with-5-attempt/15-min-TTL/consume-on-success | `verifyCampaignCode` in `lib/launchpad-campaigns.ts` | Same state machine |
| Email delivery of a code | `lib/email.ts` `sendLaunchpadCampaignVoteCode` (Resend) | Sibling sender, new template |
| Merchant email on file | `shop/setup` writes `metadata.merchant_email`; checklist already **requires** it | The data + the requirement already exist |
| Merchant decision route | `POST /api/preview/[token]/decision` | Extend, don't replace |
| es/en + WhatsApp fallback | `buildWhatsAppClaimLink` pattern in `lib/promoter-close.ts` | Deliver the code by WhatsApp when email is absent |

**The single most important reuse fact:** the readiness checklist (`lib/preview-checklist.ts`) already
makes `merchant_contact` a **required** activation gate. So the email this sprint sends a code to is
*already mandatory* before activation — this sprint adds no new data-capture burden, it just uses the
contact we already demand.

## Design decisions (resolve before building)

1. **Flag-gated, default OFF.** New flag `promoter.preview_verified_approval_enabled`
   (enablement polarity). OFF → approval behaves exactly as today (the epic must stay shippable and
   the flag flip must not depend on this). ON → approval requires a verified code. This is a
   *second* flag, independent of `promoter.private_preview_enabled` — verified approval is a
   tightening of an already-live feature, not a new dark surface.

2. **Email primary, WhatsApp fallback — never SMS.** The merchant may not have email at hand in a
   field close. When `merchant_email` is present, the code goes there. When absent, the promoter can
   trigger a **WhatsApp share** of the code (same `wa.me` pattern as the claim link) so the merchant
   receives it on their own phone. The distinction that matters for consent: the code must reach a
   channel the **merchant** controls, not the promoter — so the WhatsApp path sends to the merchant's
   number if captured, else it is refused (a promoter forwarding a code to themselves proves nothing,
   so that path must not exist).

3. **The verification binds to the approved SNAPSHOT HASH, not just the preview.** The code is issued
   for "approve THIS proposal" — `hashVerificationCode(previewId + snapshotHash, emailHash, code)`.
   So a code cannot be replayed to approve a *different* (edited) proposal than the one it was sent
   for. This composes with S2's existing `expectedHash` guard: the render hash, the code's bound
   hash, and the live hash must all agree.

4. **Consent record gains provenance, not a new table.** `merchant_preview_decisions` already has
   `actor_note` / `actor_ip_hash` / `grant_id`. Add `verified_via TEXT` (`'email'` | `'whatsapp'` |
   `NULL` for legacy/flag-off) + `verified_contact_hash TEXT` (the HMAC of the contact the code was
   sent to — provable linkage, never the raw contact). One additive migration, applied by hand via
   the CLI (`db query --linked --file`, then `migration repair`), verified end-to-end.

5. **Fail closed.** With the flag ON, an approval with no valid consumed code is **refused**, not
   downgraded to unverified. A flag flip is not consent (locked decision #3); neither is a broken
   email pipeline. If the code can't be delivered, the merchant can't approve — which is correct: no
   proof, no publication.

6. **What this sprint does NOT do:** it does not verify the merchant's *legal identity*, does not add
   e-signature, and does not gate request-changes or delivery. It proves the approver holds the
   merchant's contact. That is the honest ceiling of a lightweight flow, and the copy must say so.

## Stories

### Story 4.1 — Issue a merchant-bound approval code

**As** the system, **I want** to send a one-time code to the merchant's own contact when they begin
to approve, **so that** approval can be tied to someone holding that contact.

**Acceptance:** a `POST /api/preview/[token]/verify/start` issues a 6-char code, hashed with the
preview id + current snapshot hash + merchant email hash, persisted with a 15-min TTL before any
send; delivered by email when `merchant_email` exists, else by a merchant-WhatsApp share; the code is
never returned in the response or logged; rate-limited per token; issuing a new code invalidates the
prior unconsumed one for that preview. Flag OFF → the endpoint 404s and approval is unaffected.

**Risk:** high — new merchant-facing auth artifact; Daniel merges.

### Story 4.2 — Approval requires a verified code

**As** a merchant, **I want** my approval to only count once I've entered the code sent to me, **so
that** no one can approve as me.

**Acceptance:** with the flag ON, `POST /api/preview/[token]/decision` with `decision:'approved'`
requires a valid, unconsumed, unexpired code bound to the *current* snapshot hash (5-attempt limit,
consume-on-success, timing-safe compare); a wrong/expired/replayed code is refused with a clear
es-MX next action and records **no** approval; `changes_requested` needs no code; the recorded
decision carries `verified_via` + `verified_contact_hash`; activation's existing `checkActivation`
gate additionally treats a flag-ON approval with no verified provenance as **not a current
approval**. Flag OFF → unchanged from today.

**Risk:** high — consent-state enforcement + activation gate; Daniel merges.

### Story 4.3 — Merchant review UI: request → enter code → approve

**As** a merchant on the private preview, **I want** a clear two-step approve (get code → enter code)
**so that** the extra factor is obvious, not friction I fail silently.

**Acceptance:** the `/preview/[token]` approve control (`PreviewDecision.tsx`) becomes: "Aprobar" →
"Te enviamos un código a tu correo/WhatsApp" → code entry → confirm; a resend with a cooldown; a
plain-language line stating what the code proves and does not prove; es/en; request-changes stays a
single click; the promoter workspace shows verification status (sent / verified / not yet) without
ever exposing the code.

**Risk:** medium — client flow only, server enforces; Daniel merges.

## Sprint QA

- **pure spec:** the code binding (`previewId + snapshotHash + emailHash`) — a code issued for one
  snapshot must not verify against another; observed red by mutation. The verify state machine
  (attempts, TTL, consume) reused from the launchpad tests as the reference shape.
- **api specs:** `verify/start` never leaks the code and 404s when the flag is OFF; `decision`
  refuses an approval with no/blocked/expired/replayed code under flag-ON, and is unchanged under
  flag-OFF; the WhatsApp path refuses when no merchant number is on file (a promoter can't self-send).
- **structural spec:** extend the existing "every consent write is guarded" family — an approval
  path that reaches `recordDecision` with `decision:'approved'` under flag-ON must pass through code
  verification (guard the population, not the one route — [[guard-the-population-not-the-door-you-found]]).
- **deterministic gate:** frontend gate green; S4 migration existence + `verified_via` column
  verified live before any flag flip.
- **browser smoke owed to Daniel:** the real merchant receiving a real code on their own email/phone
  and approving — this is the one thing that proves the whole point, and it is not agent-verifiable.

## Deploy order

Additive migration first (hand-applied, verified). Land routes + UI **flag OFF**. Because the flag is
independent of `promoter.private_preview_enabled`, the epic's own activation can proceed without this;
verified approval turns on later, deliberately, after a real merchant round-trip smoke. Golden Beans
lifecycle events (if live) gain a `verified` tag on `preview_approved` — degrade safely if absent.

## Effort

**~1 small sprint (3 stories).** The crypto, the OTP table shape, the verify state machine, the email
sender, and the required merchant email all already exist — this is composition + one additive
migration + a two-step UI, not new infrastructure. The genuinely new surface area is small: one
issue endpoint, a guard added to the existing decision route, two consent-record columns, and the
review-page flow.

## Explicitly out of scope (name them so they aren't assumed)

- Legal identity verification / e-signature.
- Gating delivery, review, or request-changes on a code.
- SMS (cost + deliverability + it's not clearly the merchant's own channel).
- Retrofitting verified provenance onto approvals recorded before this ships (they stay
  `verified_via: NULL`, honestly labeled legacy).
