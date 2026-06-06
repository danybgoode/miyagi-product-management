# Spike — Flagsmith as the platform toggle / kill-switch layer

> **Class:** Spike (time-boxed investigation → a **written decision**, no code, no slicing).
> **Status:** Scoped + signed off 2026-06-06. Ready for a Claude Code investigation session.
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
