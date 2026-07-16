# Retrospective — Feature flags & kill-switches (Flagsmith)

_Closed: 2026-06-06_

**Shipped:** 2026-06-06 (one session). **Sprints:** S1 frontend (PR #34), S2 backend (PR #9), both merged.
**Outcome:** Flagsmith stood up as the platform's **fail-open, admin-only, server-evaluated kill-switch
layer**. `checkout.stripe_enabled` is a real kill across the human UI, agents/UCP, and direct checkout.

## What shipped
- **Spike → decision** (`spike-flagsmith.md` §1–6): located the live instance (Flagsmith **SaaS**, project
  `miyagisanchezmarketplace`), corrected two premises (SDK evaluates **locally** ~0 ms; Amplitude/Clarity
  are **not** wired → A/B deferred), recommended SaaS + a thin first slice. GO signed off.
- **S1 (frontend):** `lib/flags.ts` (`flagsmith-nodejs`, local eval, fail-open `DEFAULT_FLAGS`,
  `requestTimeoutSeconds:2 / retries:0`), pure `lib/checkout-killswitch.ts`, gated the checkout-options
  proxy. Live-smoked green by Daniel.
- **S2 (backend):** `src/lib/flags.ts` twin; gated the shared `resolveSellerPaymentMethods` (one catalog
  source → checkout-options for proxy + agents/UCP) and added a `start-checkout` **422
  `PAYMENT_METHOD_DISABLED`** guard. Closes review finding #1 (S1 only hid Stripe in the UI).

## What went well
- **One shared seam beat N call-site patches.** Gating `resolveSellerPaymentMethods` covered the proxy,
  agents, and UCP at once; only `start-checkout` needed a second, explicit guard (it validates the
  provider directly). Reading the backend first re-scoped the work smaller.
- **Fail-open, designed in from line one.** Both helpers never throw; absent key / unreachable Flagsmith
  → feature stays ON. The merges were safe no-ops in prod until the secret + a deliberate toggle.
- **Extract-the-seam testing.** The pure transforms (`checkout-killswitch.ts` front, the
  `resolveSellerPaymentMethods` opts back) gave real coverage with zero network/DB — 4 Playwright api
  specs + 4 backend unit specs.
- **The local max-effort review earned its keep:** found the SDK's ~33 s default block (3 retries × 10 s)
  and a client init race — both fixed before merge.

## What we learned (promoted to LEARNINGS.md)
- The `vercel env add` **CLI plugin silently stores EMPTY values** — set env vars via the REST API and
  verify (`?decrypt=true`, or value length).
- Backend Cloud Run deploy is **image-only** (`cloudbuild.yaml`) → env/secrets set out-of-band **persist**
  across deploys, so a secret can be provisioned *before* the merge that needs it.
- `flagsmith-nodejs` defaults to **3 retries × 10 s** timeout → set `requestTimeoutSeconds:2, retries:0`
  on any hot path; build the client at **module load** to avoid a check-then-set race + leaked poll timer.
- The Node SDK is **not Edge-compatible** → `middleware.ts` flags (`routing.*`) need a different
  mechanism; deferred deliberately.

## Gaps / follow-ups
- **S2 post-deploy toggle smoke owed to Daniel** (the toggle disables Stripe in live prod, so it's his to
  run when convenient). Cloud Build `c3e54c3d` deploying at close.
- **Residual edge (accepted):** toggling OFF doesn't cancel an already-created Stripe session mid-flow —
  inherent to any kill-switch; tiny window; already-paid webhooks still process correctly.

## Deferred by decision (eval agreed with Daniel)
Foundation is proven and **cheap to extend on demand** — remaining flags are "more of the same pattern,"
not unfinished work: other rail kills, `checkout.global_pause` (optional fast-follow), incident switches
(`shipping.envia_enabled`, `ai_assistant_enabled`, `agent.mcp_write_enabled`, widgets), the `routing.*`
Edge switches (need an Edge mechanism), A/B (needs analytics wired first), and per-shop flags. Gating new
epics behind a default-off flag is now an available **practice**, not a build.
