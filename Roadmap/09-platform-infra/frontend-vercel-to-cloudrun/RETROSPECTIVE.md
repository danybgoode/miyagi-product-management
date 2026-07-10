# Frontend off Vercel — Cloud Run behind a Cloudflare edge — Retrospective

_Closed: 2026-07-10_

## What shipped

**Sprint 1** — `apps/miyagisanchez` containerized (Next.js standalone + sharp), the two
`runtime='edge'` routes converted to Node, Cloud Build → Artifact Registry → Cloud Run `miyagi-web`
shadow-deployed dark alongside Vercel (secrets re-minted, never copied), shadow-soak proved the
rail before any traffic moved.

**Sprint 2** — Cloudflare zone staged from the real Vercel DNS export (Clerk + email records
preserved), NS flipped (traffic still on Vercel), external ALB + serverless NEG + Cloudflare Origin
CA cert + Cloud Armor (Cloudflare-IP allowlist) stood up, proved end-to-end on a staging hostname
(`gcp.miyagisanchez.com`), WAF/bot parity with Vercel's Bot Protection.

**Sprint 3** — canonical cutover: the 4 Vercel crons swapped to Cloud Scheduler (rehearsed,
exactly-once, `CRON_SECRET` shared-secret reused — no OIDC), a named UCP/MCP cutover checklist
proved the agent-facing surface survived, then `miyagisanchez.com` / `*.miyagisanchez.com` /
`mschz.org` DNS flipped from Vercel to the Cloudflare→ALB→Cloud Run path. Live tenant custom
domains deliberately stayed on Vercel through the soak.

**Sprint 4** — the paid custom-domain SKU's provider seam swapped: `lib/vercel-domains.ts` →
`lib/cloudflare-domains.ts` (Cloudflare for SaaS Custom Hostnames, same exported API,
`DomainConflictError` → 409 preserved), `CNAME_TARGET` retargeted, the one live tenant domain
(`panfleto.com.mx`) pre-provisioned as a Cloudflare custom hostname (pending the seller's own DNS
repoint), and finally Vercel prod deploys disabled (previews + CI kept). PRs: #206, #207.
Root-repo infra commits: `5cfc5ed`, `264d7c8`, `19fb675`.

**End state**: all canonical traffic + the one live tenant domain (mid-migration) serve from Cloud
Run behind Cloudflare. Vercel survives only as the per-PR preview + CI target, prod deploys off.

## What went well
- The **panel re-slice held up exactly as designed**: shadow-first (S1-S2), canonical-cutover-
  before-tenant-migration (S3 before S4), cron swap as its own rehearsed release decoupled from DNS
  cutover day. Zero user-facing incidents across 4 sprints of infra migration on a live marketplace.
- **Every dry-run-by-default script caught something before it became a live incident**: the
  cutover-flip script's dry-run caught a name-collision that would have overwritten CAA/TXT
  records; the same discipline (snapshot → patch → verify) let the S4.5 `www` fix get applied
  confidently once discovered, using the identical pattern already proven in S3.4.
- **Cross-agent review (Codex) caught real, non-cosmetic bugs on 3 of 4 frontend PRs this epic**
  (#203, #205 informational, #206's 3 fixes) — worth the per-PR cost every time.
- Reusing existing conventions (`vercel-prune-previews.mjs`'s dry-run/report shape,
  `provision-alb-frontend.sh`'s idempotent create-if-absent style, the `node:test` config-guard
  pattern) meant every new infra script needed zero new conventions invented from scratch.

## What we learned
<!-- Promoted to Roadmap/LEARNINGS.md — see that file for the durable, generalizable versions. -->
- A DNS-cutover script that matches records by exact name (apex, or the literal wildcard) can
  silently miss a **differently-named** record in the same "obviously covered" family — `www`
  wasn't apex and wasn't the wildcard's literal name, so S3.4's flip script never touched it, and
  it sat unmigrated for two full sprints before anyone thought to check it explicitly.
- A provider-swap's "is it live" check must not conflate the **new provider's own readiness
  signal** with **the actual live routing fact it used to imply under the old provider**. Vercel's
  `misconfigured: false` only ever became true once DNS genuinely pointed at Vercel; Cloudflare for
  SaaS's hostname `status: active` can be reached via TXT ownership validation *before* the
  seller's DNS ever changes — by design, since that's what makes pre-provisioning safe. Code
  ported from the old provider's seam (`checkDns()`) carried the old assumption forward as a latent
  bug until an independent review caught it.
- Vercel API tokens cannot have their scope narrowed after creation — only set at creation time.
  "De-scope this token" as a stated acceptance criterion is not automatable; it requires minting a
  new, narrower token and rotating whatever consumed the old one.
- A broad, standing authorization ("carry on, you're authorized") legitimately covers continuing an
  already-discussed plan, but does not automatically extend to a brand-new category of production
  mutation (a TLS cert reissue on shared infra; a DB write that would both fabricate a paid
  entitlement AND re-embed live payment credentials in a transcript) that wasn't specifically
  named — surfacing those narrowly, one at a time, got fast and clear direction both times it came
  up this epic.

## Gaps / follow-ups
- **`panfleto.com.mx`'s seller hasn't repointed their own DNS yet** — the Cloudflare custom
  hostname is pre-provisioned and `pending`; nothing more can be scripted from here. This is also
  the one live case that will prove apex CNAME-flattening + Cloudflare SSL issuance actually works
  end-to-end — genuinely unverified until they act. Worth reaching out with the new CNAME target.
- **No fresh-domain UI click-through was ever run** across the whole epic's Sprint 4 work — every
  available test shop either wasn't entitled or was a real seller's live shop, and mutating a real
  shop's paid entitlement wasn't authorized. If this gap matters, it needs a genuinely disposable
  entitled test shop set up in advance, not created ad hoc mid-session.
- **`VERCEL_API_TOKEN` is not de-scoped** — still the original, broadly-scoped token. Needs Daniel
  to mint a new project-scoped token via the Vercel dashboard and rotate the two GitHub Actions
  secrets (`ci.yml`, `notify-telegram.yml`) that consume it, then revoke the old one.
- **Next morning's cron exactly-once check** (Story 3.1, the day after the S3 swap) was never
  re-confirmed via logs in this session — Daniel confirmed the soak overall was fine and that this
  specific check could be manually triggered on demand if ever needed, so it was treated as
  low-priority and not separately re-verified.
