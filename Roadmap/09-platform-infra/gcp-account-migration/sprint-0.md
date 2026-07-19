# GCP account migration — Sprint 0: stand up the empty twin

**Status:** ⬜ not started

> **Zero production exposure.** Nothing in this sprint points at, reads from, or changes the live
> stack. At the end you have a live, empty twin project and a verified inventory. This is the sprint
> that de-risks all the others — do not skip its verification half to get to the fun part.

> ✅ **Billing is not a blocker** — Daniel confirmed 2026-07-19 that the `lolis8755` account is fully
> paid and unlocked. Cloud SQL, Memorystore, and the VPC connector can provision immediately.

## Before you start — Daniel's auth step

```bash
# Add the new identity as a SEPARATE configuration. Do NOT overwrite bonsai-profile —
# keeping both is what makes running against old and new in one session (and rollback) trivial.
gcloud config configurations create lolis-profile
gcloud auth login                      # browser → sign in as lolis8755@gmail.com
gcloud auth application-default login  # same account — the Node/.mjs scripts need this

gcloud config configurations list      # expect bonsai-profile AND lolis-profile
gcloud billing accounts list           # capture the BILLING_ACCOUNT id for provision.sh
```

**Open question for Daniel:** keep a name like the old project, or take a fresh id? Project ids are
**globally unique and permanently immutable**, so `miyagisanchezback-497722` cannot be reused while
the old project exists. Expect a new id — nothing depends on it except our own script defaults.

## Stories

### Story 0.1 — Provision the empty twin
**As** Daniel, **I want** a fully provisioned, empty project under the new account, **so that** the
risky sprints have somewhere validated to land.
**Acceptance:** new project created + billing linked + APIs enabled;
`PROJECT_ID=<new> BILLING_ACCOUNT=<new> bash infra/gcp/provision.sh` and
`bash infra/gcp/provision-frontend.sh` both run **green**; Artifact Registry (`medusa`, `frontend`),
Memorystore (`medusa-redis`), and the VPC connector (`medusa-conn`) exist in `us-east4`.
**Nothing points at it.** Prod is untouched and unaware.
**Risk:** LOW — no production surface.

### Story 0.2 — Verify the inventory against reality
**As a** builder about to migrate money data, **I want** the script defaults confirmed against the
**live** old project, **so that** nothing gets silently left behind.
**Acceptance:** a written diff, committed to this sprint doc, between what `infra/gcp/`'s defaults
claim and what actually exists in `miyagisanchezback-497722`:
- `gcloud run services list` · `gcloud sql instances list` · `gcloud redis instances list`
- `gcloud secrets list` — **the real count**, vs the ~17 backend + ~25 frontend the deploy scripts
  reference. Any secret in the project that no script mentions is exactly the kind of thing that
  breaks a cutover at 2am.
- `gcloud scheduler jobs list` · `gcloud builds triggers list` · monitoring policies
- **Enumerate the secrets that are account-scoped, not value-scoped** — service-account keys and the
  Cloud Build↔GitHub connection must be **re-created, not copied**. Getting this list wrong is the
  most likely way Sprint 2 stalls.
- **Check for static-egress-IP allow-listing** at Stripe, Mercado Pago, Envía, or Mercado Libre. The
  new project's NAT IP will differ. Better to find this now than during the cutover.
- Assert the VPC connector range `10.8.0.0/28` doesn't overlap anything in the new project's network
  (trivially true in a fresh project — assert it anyway, don't assume).
**Risk:** LOW — read-only against prod.

## Sprint QA
- **Deterministic:** `infra/gcp/test/*` invariant tests run against the **new** project id.
- **No app deploy in this sprint** — nothing to smoke in the product sense.
- **Owed to Daniel:** the `gcloud auth` step above, the billing account id, and the project-id
  decision. An agent cannot do these.

## Sprint 0 — Smoke walkthrough (do these in order)
Env: the **new** project only · production is untouched throughout

1. Run `gcloud config configurations activate lolis-profile && gcloud projects list`.
   → The new project appears, owned by `lolis8755@gmail.com`.
2. Run `gcloud billing projects describe <new-project-id>`.
   → `billingEnabled: true`.
3. Run `gcloud artifacts repositories list --location=us-east4`.
   → Both `medusa` and `frontend` are listed.
4. Run `gcloud redis instances list --region=us-east4` and
   `gcloud compute networks vpc-access connectors list --region=us-east4`.
   → `medusa-redis` and `medusa-conn` both exist and are `READY`.
5. Open `https://miyagisanchez.com` in a browser.
   → **Still served by the OLD project, completely unaffected.** This is the step that confirms
   Sprint 0 was genuinely zero-exposure.
6. Read the Story 0.2 diff committed into this doc.
   → Every resource in the old project is either accounted for in the migration plan or explicitly
   marked "not migrating, because …". **No unexplained rows.**

If any step fails, note the step number + what you saw — that's the bug report.
