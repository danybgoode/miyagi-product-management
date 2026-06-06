# GCP Migration Plan

Area: Infra
Priority: P0 (gates checkout Session B)
Status: ✅ COMPLETE — prod on GCP Cloud Run; CI/CD auto-deploy validated (rev medusa-web-00004 deployed by trigger, healthy). Remaining = optional polish + decommission Render.

> **CUTOVER 2026-05-28:** Vercel prod `MEDUSA_STORE_URL` + `NEXT_PUBLIC_MEDUSA_STORE_URL` → `https://medusa-web-91083034475.us-east4.run.app`; frontend redeployed (`miyagisanchez-ixp3gqji9`); homepage renders catalog via GCP backend; CORS for miyagisanchez.com confirmed. Stripe **test** webhook `we_1TcDeUL2vn3I7zOLflXd9m38` → backend `/hooks/payment/pp_stripe-connect_stripe-connect`, secret in Secret Manager v2. **Backend is TEST mode** (sk_test/clerk pk_test) — going live w/ real keys is a separate task. **Render still running** (rollback). 
> **CI/CD LIVE 2026-05-28:** backend repo pushed (`a9d411f`); GitHub 2nd-gen connection `github` + repo linked; Cloud Build trigger **`backend-main-deploy`** (`^main$` → `cloudbuild.yaml` → deploy) runs as dedicated SA **`medusa-cicd`** (roles: run.admin, artifactregistry.writer, logging.logWriter, actAs medusa-run). Push to backend main now auto-builds+deploys. **`panuchas.com` removed** (was a test). Note: newer GCP projects need an explicit `--service-account` on triggers (legacy CB SA not auto-created) — that was the `INVALID_ARGUMENT`.
>
> **Open items:** (a) decommission Render + disable its old Stripe webhook when happy; (b) `api.miyagisanchez.com` vanity domain (needs Search Console verification + Cloudflare DNS, then map + reflip env/webhook); (c) optional: Neon Launch (kill autosuspend), pooled DATABASE_URL, move reconcile→Medusa job; (d) go-live with real Stripe/Clerk keys (currently test mode).
Owner: Daniel
Created: 2026-05-28

> **GCP target (resolved 2026-05-28):** project **`miyagisanchezback-497722`** (owner `leroytramafat@gmail.com`), OPEN billing **`01BCB8-AA3451-6EC373`** (MXN, linked). Region **us-east4**.
>
> **DEPLOYED 2026-05-28:** Cloud Run service **`medusa-web`** → `https://medusa-web-91083034475.us-east4.run.app` (`/health` 200, store API alive). Image `…/medusa/backend:20260528-171358`. Redis = Memorystore `10.24.218.107:6379` (real, confirmed in logs; `maxmemory-policy=noeviction`). DATABASE_URL = current **direct** Neon URL (pooled = later optimization). Runs in **parallel** with Render — nothing repointed yet. Build/deploy via `infra/gcp/deploy.sh` (SKIP_BUILD=1 IMAGE=… to redeploy without rebuild).
>
> **Before cutover:** (1) create Stripe webhook for the new URL + set real `STRIPE_WEBHOOK_SECRET` (currently placeholder); (2) map `api.miyagisanchez.com`; (3) repoint Vercel `MEDUSA_STORE_URL` + CORS + Stripe/MP webhooks; (4) move `reconcile-checkouts` → Medusa job; (5) verify; (6) decommission Render. CI/CD: `infra/gcp/cicd-setup.sh` (needs 1-time GitHub connection in console).

Move the **Medusa backend off Render free → GCP**, keeping the Next.js frontend on Vercel. North stars: strong foundation + peak performance, run lean. Derived from a full infra discovery on 2026-05-28. Must land **before checkout Session B** (MercadoPago OAuth) so payment callback/OAuth URLs are wired against the final public URL exactly once.

---

## Discovery summary — what runs today

| Layer | Today | Decision |
|---|---|---|
| Frontend | Next.js 16 on Vercel (`miyagisanchez.com`) | **stays** |
| Backend | Medusa v2.15.3 on **Render free** (`miyagi-medusa-api.onrender.com`, `srv-d8bh3b9kh4rs739fpe5g`) | → **Cloud Run** |
| Commerce DB | **Neon** Postgres, AWS **us-east-1**, *direct/unpooled* endpoint | **keep**, co-locate + pool |
| Non-commerce DB | **Supabase** (conversations, offers, favorites, supply, scrape, UCP) | **stays** |
| Redis (frontend) | **Upstash** REST — rate limiting only (`lib/ratelimit.ts`) | **stays** |
| Redis (backend) | **none** — Medusa runs in-memory event bus / workflow engine / cache | **add** |
| Storage | **R2** — two Cloudflare accounts (public images + private digital) | **stays** |
| Crons | **Vercel Cron** → Next.js routes | rehome commerce crons |
| Secrets | `.env` files; `medusa-config` falls back to `supersecret` | → Secret Manager + rotate |

### Key findings (ranked)

- **P0 — Region split kills performance.** Neon is AWS **us-east-1**; the only GCP box (`bonsaibrains-pro`) is **us-central1**. Medusa/MikroORM issues many serial queries per request; cross-cloud/cross-region adds ~25–40ms × N per request. Render→GCP alone does not fix this — **DB locality is the real lever.** → Co-locate backend in **us-east4** next to Neon; use Neon's **pooled** endpoint; disable Neon autosuspend.
- **P0 — The existing VM is the Chatwoot host, not a Medusa box.** `bonsaibrains-pro` (e2-standard-2, 2vCPU/8GB, us-central1-f, IP 34.170.51.112, project `gen-lang-client-0305197114`) runs Chatwoot via Docker Compose (`rails`/`sidekiq`/`redis:7`/`postgres-pgvector-pg16`/`backup`) + a **cloudflared** tunnel + GCP Ops Agent. Putting a payments backend here = wrong region + CPU contention + shared blast radius. → **Cloud Run, isolated. Leave the VM to Chatwoot.**
- **P1 — Backend has no durable Redis.** In-memory event bus + workflow engine is unfit for a payments backend (no durable/retryable workflows, can't scale past 1 instance). → Add Redis-backed Medusa modules on **Memorystore us-east4** (or Upstash TCP as low-ops fallback).
- **P1 — Cron drift.** `vercel.json` schedules only `order-autoconfirm` (daily 9am) + `reconcile-checkouts` (*/15, needs Vercel Pro). Route handlers `listing-cleanup` + `offer-reminders` exist but are **not scheduled anywhere**. → Move `reconcile-checkouts` into a Medusa native job (fixes */15 reliability, drops the Pro dependency); keep `order-autoconfirm` on Vercel until checkout Session D; wire-or-delete the two orphans.
- **P2 — Secrets.** `medusa-config.ts` falls back to `jwtSecret`/`cookieSecret` = `supersecret`. Confirm prod isn't running defaults; rotate on the move.
- **P2 — Project hygiene.** `gen-lang-client-0305197114` is an auto-generated AI-Studio project. Use a dedicated GCP project for the marketplace (clean IAM/billing, separate from Chatwoot + Gemini).

### Storage cost fear — assessed, mostly unfounded

R2 charges **$0.015/GB-mo storage and $0 egress** (egress is the cost that normally kills media-heavy apps). 1TB of listing photos ≈ $15/mo. **Per-tenant R2 *accounts* rejected** — large ops overhead (many billing relationships, token rotation), no real need (platform owns the data; sellers get no credentials). Keep the current model: per-seller **key prefixes** (`listing-images/{userId}/…`). Escalate to per-seller **buckets** only if chargeback/compliance ever demands it. Real scaling lever is image transforms (already webp), not isolation.

---

## Target architecture

| Concern | Target |
|---|---|
| Backend compute | **Cloud Run** (`min-instances=1`), **us-east4**, + a small **worker** service |
| Container | Single image, two entrypoints (`web` / `worker`), pushed to Artifact Registry |
| Commerce DB | Neon us-east-1, **pooled** `DATABASE_URL`, autosuspend off |
| Backend Redis | **Memorystore (us-east4)** via Serverless VPC Access connector (fallback: Upstash TCP) |
| Ingress | `api.miyagisanchez.com` via Cloudflare (cloudflared pattern already in use) or Cloud Run domain mapping |
| Secrets | **Secret Manager**; JWT/COOKIE rotated |
| Frontend | Vercel (unchanged); Upstash rate limiting (unchanged) |
| Storage | R2 (unchanged), per-seller key prefixes |

---

## Execution sequence

1. **Task doc** (this file). ✅
2. **Containerize Medusa** — `apps/backend/Dockerfile` (server + worker entrypoints), `.dockerignore`. Add Redis-backed modules to `medusa-config.ts` (`event-bus-redis`, `workflow-engine-redis`, `cache-redis`, locking), all gated on `REDIS_URL` so local dev without Redis still works. ✅ Local build verified (`medusa build` green).
3. **Dedicated GCP project** + enable APIs (Cloud Run, Artifact Registry, Secret Manager, Memorystore/`redis`, `vpcaccess`). Provision: Artifact Registry repo, Memorystore (us-east4), Serverless VPC connector, Secret Manager entries.
4. **Secrets** → Secret Manager; rotate `JWT_SECRET`/`COOKIE_SECRET`; switch `DATABASE_URL` to Neon **pooled**; set Neon autosuspend off.
5. **Build + push image**; **deploy** Cloud Run `web` (`min-instances=1`) + `worker` in us-east4, env from Secret Manager, Redis via VPC connector.
6. **`api.miyagisanchez.com`** → Cloudflare/Cloud Run; **re-enable Medusa admin** (`admin.disable` no longer needed — RAM unconstrained).
7. **Repoint frontend**: Vercel `MEDUSA_STORE_URL`, `STORE/ADMIN/AUTH_CORS`, Stripe `/hooks/payment/...`, MP webhook URL.
8. **Crons**: move `reconcile-checkouts` → Medusa native scheduled job; decide `listing-cleanup` + `offer-reminders` (wire or delete); leave `order-autoconfirm` on Vercel until Session D.
9. **Verify** Session A reconciliation end-to-end on stable infra (paid-but-abandoned cart → order within 15 min); smoke-test checkout + admin.
10. **Decommission Render** (delete service, drop env). Then proceed to checkout **Session B**.

---

## Re-verify against new infra (from Session A)

- `MEDUSA_STORE_URL` + webhook/OAuth URLs point at `api.miyagisanchez.com`.
- `MEDUSA_INTERNAL_SECRET` + `CRON_SECRET` carried into Secret Manager.
- Whether `reconcile-checkouts` + `order-autoconfirm` stay on Vercel Cron or move (see step 8).
- The `*/15` reconcile cron should become reliable once the backend is always-on.
