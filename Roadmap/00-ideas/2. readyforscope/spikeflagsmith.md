# Spike — Flagsmith as the platform toggle / kill-switch layer

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing).
> **Status:** Investigated 2026-06-06 — **decision written (sections 1–6 below), awaiting Daniel's
> go/no-go sign-off.** Recommendation: **GO** (thin fail-open kill-switch layer on Flagsmith SaaS).
> **Stage-2.5 bucket:** Genuinely new (greenfield integration). Confirmed **zero Flagsmith
> footprint** in either app — no dependency, SDK, env var, or flag gating. The live instance
> Daniel referenced runs **outside this monorepo** and is **unconnected** to the apps.

## Why / the ask
**As** the platform admin / product-owner, **I want** a clear read on where Flagsmith actually
stands and a decision on how to use it as the feature-toggle / kill-switch layer, **so that** I can
turn features on/off from a dashboard without a deploy and gate every new epic behind a flag to
shrink blast radius (the `LEARNINGS.md` "gate new behaviour on a flag" rule, today done ad-hoc).

Primary job (Daniel, 2026-06-06): **operational toggles / kill-switches.** A/B experimentation is
secondary. Audience: **platform admin only** (no per-shop seller flags in v1). Hosting: **spike
recommends** (SaaS vs self-host on GCP).

## Current state (audit findings so far)
- **No integration anywhere.** `grep` across `apps/` + `infra/` finds no `flagsmith` dependency,
  import, env var, or config. Neither the Next app (`apps/miyagisanchez`) nor the Medusa backend
  (`apps/backend`) evaluates a flag.
- **What stands in for flags today:** ad-hoc *presence checks* (e.g. the personalized buy box only
  mounts when a listing has `custom_fields`) and the homegrown **seasonal-theme toggle**. A real flag
  layer would standardize these — it does not need to migrate the theme toggle in v1.
- **Daniel reports a live Flagsmith instance exists** but it leaves no trace in git → it's a SaaS
  account or a separately-deployed instance whose keys live only in deployed env (Vercel / Cloud Run),
  never wired back into the codebase. **Locating it is the spike's first job.**

## Acceptance — the decision doc must answer
1. **Where the live instance is** — SaaS vs self-hosted; project / environment structure; who can log in.
2. **The integration gap** — confirm neither app imports the SDK; the minimal server + client wiring
   to connect them (server-side eval in Medusa/Next server; a client flag where needed).
3. **Toggle taxonomy** — the concrete list of current features worth a flag, **kill-switches first**,
   each keyed to a real code seam.
4. **Hosting recommendation** — SaaS (free 50K req/mo → $40/mo Start-Up) vs self-host OSS on GCP,
   with a cost / ops / latency call (flag eval sits on every request).
5. **A/B reality check** — Flagsmith buckets traffic (multivariate) but does **not** do statistical
   results analysis; "non-tech A/B *with results* from one dashboard" is therefore a *Flagsmith-splits
   + Amplitude/Microsoft-Clarity-reads* seam (both already connected), not Flagsmith alone. Recommend
   the lightest path; this is secondary to toggles.
6. **Go/no-go + a thin first integration slice** to recommend (NOT built in this spike).

---

# DECISION (filled 2026-06-06 — Claude investigation session)

> **TL;DR:** **GO**, as a deliberately thin, **fail-open, admin-only, server-evaluated
> kill-switch layer on Flagsmith SaaS (free tier)**. Confirmed **zero Flagsmith wiring** in either
> production app and **no trace in GCP** — the "live instance" Daniel referenced is unconnected (SaaS
> account or a self-host on a GCP project this session can't reach; **its location/login is the one
> open item, owed to Daniel**). Two premise corrections: (a) the `flagsmith-nodejs` SDK does **local
> in-process evaluation**, so flag checks add ~0 ms per request and don't burn per-request API quota —
> the "eval on every request" latency/quota worry is largely moot; (b) **Amplitude and Microsoft
> Clarity are NOT actually connected** in the codebase (only Sentry is), so the "A/B with results from
> one dashboard" premise can't stand on existing tooling — A/B stays deferred. The future build touches
> `middleware.ts` / `layout.tsx` / checkout rails → **high-risk, Daniel merges, must fail-open.**

## 1. Where the live instance is

**Not in this monorepo's production footprint — audited and clean.** What I checked, all under account
`leroytramafat@gmail.com` / GCP project `miyagisanchezback-497722` / Vercel team `danybgoodes-projects`:

| Surface | Checked | Flagsmith found? |
|---|---|---|
| Vercel frontend `miyagisanchez` env (74 vars, prod+preview+dev) | `vercel env ls` | **No** — no `FLAGSMITH_*`, no `flag*` |
| Cloud Run `medusa-web` runtime env (21 vars) | `gcloud run services describe` | **No** |
| Cloud Run `print-pdf` | listed | n/a (PDF service) |
| GCP Secret Manager (13 secrets) | `gcloud secrets list` | **No** |
| GCP projects visible to this account | `gcloud projects list` | only `miyagisanchezback-497722` + a Gemini default — **no Flagsmith/despachobonsai project reachable** |
| Codebase (`apps/`, `infra/`, `Roadmap/`, `tasks/`) | `grep -ri flagsmith` | **No** dependency, import, env, or flag eval |

Sibling Vercel projects exist (`despachobonsai-vercel`, `bonsaios-mcp`, `miyagistudio`,
`bonsaileadseek`, `miyagisanchez-scraper`) but none is a Miyagi app, and the Vercel CLI only introspects
the *linked* project's env, so I could not enumerate theirs from here (not blocking — none is the app).

**Conclusion:** the instance Daniel referenced is **completely decoupled** from both apps. It is almost
certainly either (a) a **Flagsmith SaaS** org at `app.flagsmith.com`, or (b) a **self-host on the
separate `despachobonsai` GCP project**, which this session has no access to. **OPEN — owed to Daniel
(only unclosable-from-CLI item):** confirm the **dashboard URL** (SaaS vs self-host), the
**organisation / project name**, the **environments** (e.g. `production` / `development`), and **who
holds seats**. Everything else in this doc is closed from the audit.

## 2. The integration gap + minimal wiring

**Gap confirmed:** neither app imports a Flagsmith SDK; nothing evaluates a flag. Today's stand-ins are
ad-hoc *presence checks* (personalized buy box mounts only when a listing has `custom_fields`) and the
homegrown **platform-theme toggle** (`lib/platform-theme.ts`, `core | designer-n` with `active/sunset`
+ `startsAt/endsAt`) — a hand-rolled scheduled flag. A real layer standardizes these (don't migrate the
theme toggle in v1 — out of scope).

**Minimal wiring to connect (the pattern, not the build):**
- **Next server (`apps/miyagisanchez`):** add `flagsmith-nodejs`; a `lib/flags.ts` helper (mirrors
  `lib/channel.ts`) inits **once** with a **server-side environment key** and **local evaluation**
  (SDK polls the environment document on an interval and evaluates in-process). Call it from
  `middleware.ts`, server components, and route handlers. **Must ship with a hardcoded `DEFAULT_FLAGS`
  fail-open map** (SDK `defaultFlagHandler`) so Flagsmith being unreachable never blocks a request.
- **Medusa backend (`apps/backend`):** same `flagsmith-nodejs` in a loader/module; evaluate in backend
  routes (e.g. the checkout-rail selection in `start-checkout`). Same fail-open default.
- **Client:** prefer **server-evaluate + pass down** (no client round-trip, no flash). For admin-only
  v1 almost everything is server-evaluated; a client SDK is **not needed**.
- **Identity:** admin-only kill-switches are **environment-level** flags — no per-identity traits, no
  per-shop segments in v1. Keep state global + cached.

## 3. Toggle taxonomy — kill-switches first (each keyed to a real seam)

**Kill-switches (instant off — protect live money/infra; highest value because a backend deploy is
~12 min):**

| Flag | Seam (real code) | What killing it does |
|---|---|---|
| `checkout.global_pause` | backend `start-checkout` | Master halt of all paid checkout (incident) |
| `checkout.{stripe,mercadopago,spei,dimo,cash}_enabled` | rail selection in `start-checkout` + `GET /store/sellers/:slug/checkout-options` | Hide a broken/compromised rail without a deploy |
| `agent.mcp_write_enabled` | seller agent write tools (create/update listing, offer respond) | Stop agent writes without revoking per-shop tokens |
| `shipping.envia_enabled` | `lib/envia.ts` quote/label | Drop to arranged-delivery if Envía is down |
| `messaging.realtime_enabled` | Supabase Realtime + 30s poll fallback | Force poll fallback if Realtime misbehaves |
| `ai_assistant_enabled` | AI shopping assistant entry (Gemini) | Kill on cost/abuse spike |
| `embed_widget_enabled` / `support_widget_enabled` | `/embed/s/[slug]`, `<miyagi-support-widget>` | Kill an external embed surface |
| `routing.{short_links,subdomains,custom_domain}_enabled` | `middleware.ts` host routing | Disable an addressing tier if it misroutes *(touches middleware → high-risk)* |
| `print_pdf_enabled` | `print-pdf` Cloud Run + builder export | Kill PDF export if the service errors |

**Gradual-rollout / gated-launch (makes the `LEARNINGS.md` "gate new behaviour on a flag" rule
first-class instead of ad-hoc):**
- `buyer_protection_escrow` — the 📋 planned *Compra Protegida*; ship default-off behind a flag.
- `personalized_products` — today a presence-check; standardize as a flag.
- **Every new high-risk epic** → a default-off flag at its riskiest seam, removed once stable.

## 4. Hosting recommendation — **SaaS free tier**, not self-host (v1)

- **Latency/quota worry is largely moot:** `flagsmith-nodijs` evaluates **locally in-process**; only a
  periodic environment-document refresh hits the API. Flag checks add **~0 ms** to the request path and
  request volume **≠** flag-eval volume, so the **50K req/mo free tier is ample** even at marketplace
  traffic.
- **Recommend:** start on **Flagsmith SaaS free**. If Daniel's existing instance is already SaaS, just
  use it. Move to **$40/mo Start-Up** only if/when A/B/MVT or scheduled flags are actually wanted
  (secondary). **Do not self-host on GCP for v1** — it adds a Cloud Run service + Postgres + patching/
  uptime burden (and a flag service that's down is an availability risk) for a **single-admin** use
  case. Self-host only earns its keep at Scale-Up needs ($250/mo SSO/RBAC/audit) or data-residency — not
  now. *(If Daniel's instance turns out to already be self-hosted on `despachobonsai`, reuse it as-is —
  same SDK wiring — rather than standing up a second one.)*
- **Non-negotiable ops rule (any host):** **fail-open to hardcoded defaults.** Flagsmith down must never
  take down checkout. This is the #1 integration requirement.

## 5. A/B reality check — **premise correction; defer A/B**

- **Correction:** **Amplitude and Microsoft Clarity are NOT wired into the codebase.** `grep` finds only
  false positives (a `print-qr.ts` comment "tracked in GA/Clarity"; a UI copy string). The only
  observability today is **Sentry** (errors) + **Telegram** (admin alerts); **no product-analytics tool
  is connected** (no `@vercel/analytics`, PostHog, GA, Amplitude, or Clarity).
- **So "non-tech A/B with results from one dashboard" is not achievable on existing tooling.** Flagsmith
  splits traffic (multivariate) but does **no** results analysis; with nothing measuring conversion,
  there are no results to read.
- **Recommendation (A/B is explicitly secondary — defer it):** when wanted, the lightest path is to
  first connect an analytics product and emit the flag **variant as an event property**, then read
  conversion-per-variant there. Two sensible options: **Vercel Web Analytics** (already on Vercel, near
  one-line) for basic funnels, or **PostHog** (flags + experiments + analysis in one — would actually
  *subsume* Flagsmith for experimentation, worth weighing before doubling up). **For v1: build no
  experimentation.** Flag the premise gap to Daniel.

## 6. Go / no-go + thin first slice (NOT built here)

**GO** — thin, fail-open, admin-only, server-evaluated, SaaS-hosted kill-switch layer. The value
(kill a rail/feature in seconds vs a ~12-min backend deploy) is real and makes the existing
"gate-on-a-flag" rule first-class.

**Thin first slice to recommend (one flag, one seam, proves the pattern — do NOT build in this spike):**
1. Add `flagsmith-nodejs` to **Next**; create `lib/flags.ts` with **fail-open `DEFAULT_FLAGS`** + cached
   local eval.
2. Wire **one** kill-switch — **`checkout.stripe_enabled`** — at the **checkout-options seam**
   (`GET /store/sellers/:slug/checkout-options`), so a broken Stripe rail can be hidden from the
   dashboard without a deploy.
3. Prove end-to-end: flip in the Flagsmith dashboard → the Stripe rail disappears from checkout with **no
   deploy** → flip back. Then expand the taxonomy in §3.
4. **Defer:** the client SDK, per-shop/seller flags, `middleware.ts`/`layout.tsx` routing flags, and all
   A/B.

**⚠️ HIGH-RISK when built (Daniel merges):** the full rollout touches **shared request surface**
(`middleware.ts`, `layout.tsx` — every request) and **checkout rail selection** (money). Per
`WAYS-OF-WORKING.md` + `LEARNINGS.md`, that's a **Daniel-merge, fail-open, presence-gated** build. The
first slice above is deliberately scoped to the **checkout-options seam** (not middleware) to keep the
proving slice low-blast-radius; the middleware/layout flags come in a later slice.

**One open item before/with the build — owed to Daniel:** confirm the Flagsmith dashboard location +
access (see §1). Everything else is decided.

---

## Investigation pointers (for the build session)
- **Find the instance:** inspect deployed **Vercel env vars** and **Cloud Run env vars** (not in repo),
  the **Flagsmith dashboard**, and the **GCP project**. Document project / environments / access.
- **Audit the integration surface:** confirm SDK absence; identify where a server-side evaluation and a
  client-side flag would mount; note the presence-check + theme-toggle patterns this layer standardizes.
- **Map flaggable features off the poster** (`Roadmap/README.md`), ranking each *kill-switch* vs
  *gradual rollout*: checkout rails (Stripe / MercadoPago / SPEI / DiMo / cash), buyer-protection /
  escrow rollout, subdomains / short-links / custom-domain, embeddable + support widgets, AI assistant,
  personalized products, print-edition surfaces.
- **Decide hosting** factoring edge latency + the existing GCP footprint.
- **A/B feasibility:** map the "results for a non-tech admin" need onto Amplitude / Clarity.

## In / out of scope (v1 decision)
**In:** instance audit · integration approach · hosting call · flaggable-feature taxonomy (admin-only)
· A/B feasibility note · go/no-go + recommended first slice.
**Out:** building the integration · per-shop / seller flags · a full experimentation platform ·
migrating the seasonal-theme toggle (note it, don't move it).

## Risk
The spike itself is **low-risk** (read / research / decide only). It must flag that the *future*
integration touches **shared request surface** (`middleware.ts` / `layout.tsx`) and so is **high-risk
when built** (Daniel merges).

## How it closes
No smoke walkthrough — a spike closes when the **written decision** lands in this file (sections 1–6
above filled in) and Daniel signs off the go/no-go + the recommended first slice.

## Research cited (2026-06-06)
Flagsmith is OSS feature-flags + remote config + targeting + multivariate/A-B + **kill-switches**, with
a dashboard UI. **Self-host** the OSS build free (seat/project based, no API-request cap); **SaaS** free
tier = 50K API req/mo / 1 seat, Start-Up $40/mo (1M req, A/B/MVT, scheduled flags), Scale-Up $250/mo
(SSO/RBAC/audit). It splits traffic but does not analyse experiment results — pair with an analytics tool.
- https://www.flagsmith.com/self-hosted
- https://www.flagsmith.com/blog/top-7-feature-flag-tools
- https://www.buildmvpfast.com/api-costs/feature-flags
