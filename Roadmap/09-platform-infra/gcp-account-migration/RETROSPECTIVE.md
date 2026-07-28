# gcp-account-migration — Retrospective

_Closed: 2026-07-19_

S0–S3 executed and cut over in one session. S4 (decommission) is deliberately deferred ≥2 weeks —
this retro covers the executed migration; S4 gets a close-out note when it runs.

## What shipped

Production moved from `miyagisanchezback-497722` (leroytramafat) to **`miyagisanchez-prod`**
(lolis8755, billing `019B4F-8DBBBA-3EE80C`) with zero code changes and zero data loss, in a single
session, on the epic feature branch (S0 `44bdaba` · S1 `7861b69` · S2 `39a95f5`+`06af903`+`315a15f`
· S3 `8ce5c1a`):

- **S0** — twin project provisioned via the existing `provision*.sh` (two fresh-project script bugs
  found+fixed); inventory of the live old project corrected the epic README on every count
  (7 services not 2, 6 schedulers not 4, 60 secrets not ~40, plus 2 jobs/2 functions it missed).
- **S1** — 56 secrets copied by value-pipe with byte-length verification (zero rotation, zero
  values ever printed); Cloud SQL export→GCS→import rehearsed and **measured** (178s+19s ≈ 3.5 min);
  `medusa-web` booted against the imported copy and served real listings.
- **S2** — CI/CD triggers (created disabled), all 6 schedulers (created/verified paused),
  monitoring parity (6 policies + uptime + Telegram channel), backup pipelines, and the ALB with a
  fresh Origin CA cert + Cloud Armor Cloudflare-allowlist + the approved `api.` host rule —
  everything dark. The frontend CI pipeline itself was rehearsed manually (`cloudbuild.yaml`,
  `--substitutions=SHORT_SHA=…`) and produced the revision that later served the cutover.
- **S3** — final sync 3.7 min, dumps byte-identical (zero writes in window, proven not assumed);
  4-record DNS flip via the extended `cloudflare-cutover-flip.mjs` with auto-snapshot; webhooks
  needed zero repointing (verified domain-based via Stripe API); automation swapped atomically;
  46 doc/script references updated to the new project.

## What went well

- **The epic's own premise held: reuse beat rebuild.** Almost every step was an existing script
  with `PROJECT_ID` overridden. New code written: one ALB host-rule block, one flip-script
  selection widening, four bounded-wait/retry hardenings. Everything else was configuration.
- **Sprint 0.2's "verify inventory against reality" earned its keep fourfold** — it caught the
  undercounted secrets/schedulers/services, the deleted-uuid-secret landmine on the notifier
  functions, the global-name bucket claim, and cleared the egress-IP fear (no NAT exists).
- **Dark rehearsal converted the cutover from experiment to flip.** Every HIGH element (data path,
  CI pipeline, ALB+cert, DNS flip dry-run against the live zone) had already run for real before
  the window opened. The flip itself took under a minute.
- **The permission classifier worked as a second gate, not an obstacle** — it blocked exactly the
  three highest-consequence actions (bucket+IAM grant, rehearsal-DB delete, production DNS flip);
  each got a named, specific confirmation from Daniel per the LEARNINGS rule, at a cost of seconds.

## What we learned (promoted to Roadmap/LEARNINGS.md)

1. **A just-created service account is eventually consistent** — an immediate IAM grant 400s
   "does not exist". Hit 4× across 4 scripts in one epic; retry the failing consumer operation,
   not a `describe` call on the API that created the principal.
2. **A fresh-project rebuild surfaces every config that only ever accumulated live** — secret
   shells no provision script owned, and an empty shell whose `:latest` binding fail-closes any
   fresh revision (`SERPAPI_KEY`). Provision scripts are now create-if-absent for the full reused
   set; the dead secret was retired via the existing trio rule.
3. **A cutover tool whose target resolution defaults to the SOURCE environment no-ops silently.**
   All 7 `cloudflare-*.mjs` hardcoded the old project — the flip would have resolved the old ALB IP
   and "flipped" DNS to where it already pointed. Found only because the S3 prep re-derived every
   input against the target and dry-ran against the live zone.
4. **Global-name resources are account-scoped claims, not values** — bucket names, project ids,
   and Cloud Run domain mappings cannot coexist in two projects. `api.`'s domain mapping became an
   ALB host rule (better architecture anyway); the PMO bucket deferred to S4's delete-then-recreate.
5. **`"$VAR…"` with a trailing UTF-8 ellipsis breaks under a C-locale shell** — bash swallows the
   multibyte char into the identifier ("unbound variable"). Brace variables adjacent to non-ASCII.
6. **Prove zero-loss with an identical-dump diff instead of engineering a write-quiet window** —
   rehearsal dump vs final dump row-count diff == empty is direct evidence no write was missed.

## Gaps / follow-ups

- **Owed to Daniel (walkthrough steps that cannot be automated):** real-money checkout; Stripe+MP
  dashboard webhook-delivery 200s; signed-in session check; next-morning single-fire cron check.
- **S4 (deferred ≥2 weeks, gate: Daniel's explicit go):** final export to durable storage →
  reference grep → stop old services/pause old SQL → delete project. Added at S3 close: delete old
  `miyagi-pmo-reports` bucket then recreate+restore in new project (global name); redeploy
  `pmo-smalldocs`/`print-pdf`/staging surface; new `pmo-report-writer` SA key into the claude.ai
  routine env; delete the old `api.` domain mapping. **Correction during soak:** the two Telegram
  build-notifier functions moved immediately rather than waiting for S4, because observability is
  a soak precondition, not teardown work.
- The old project's monitoring still watches the shared domain (now serving the new project) —
  harmless double-cover until S4 tears it down.

## Post-cutover validation correction (2026-07-19)

The four expected GitHub `📦` merge alerts arrived, but no Cloud Build `🚀` terminal alerts did.
The builds themselves were healthy: backend `f813206` and frontend `ca702d3`, `b1a8311`, and
`50a93dc` all reached `SUCCESS`, and Cloud Run served the newest revisions. The missing alerts
exposed two independent migration gaps:

- the `cloud-builds` Pub/Sub topic and the two Gen2 notifier functions still existed only in the
  rollback project; secrets and build triggers alone do not recreate event-driven consumers;
- the frontend GitHub workflow still polled a Vercel production deployment that no longer exists,
  spending about 15 hosted minutes per merge before timing out green.

The repair moved both functions to `miyagisanchez-prod`, removed the obsolete Vercel poller, and
made the notifier deploy script project-explicit (no global `gcloud config set`). A second live
finding was also fixed: the frontend Docker builder received `NEXT_PUBLIC_MEDUSA_STORE_URL` but not
the server-side `MEDUSA_STORE_URL`, so the initial homepage prerender could freeze an empty catalog
until ISR repaired it. The builder now exports the server alias and a deterministic guard locks the
relationship.

The repair's own production build logs then exposed a shared runtime-floor drift: current Supabase
packages require Node 22, while both application images still built on Node 20. Frontend PR
[#289](https://github.com/danybgoode/miyagisanchezcommerce/pull/289) and backend PR
[#107](https://github.com/danybgoode/medusa-bonsai-backend/pull/107) moved Docker build/runtime
stages, package engines/types, and hosted CI together, with deterministic guards so those four
surfaces cannot silently diverge again.

### Repair execution evidence (2026-07-19 local / 2026-07-20 UTC)

- The original alert-less builds were all `SUCCESS`: backend `f813206`; frontend `ca702d3`,
  `b1a8311`, and `50a93dc`. GitHub Actions quota was not their blocker: all three repos are public,
  so their hosted checks are unmetered despite the account's exhausted private-repo allowance.
- Backend repair builds `c1032c8a…` (`a3e453e`, notifier hardening) and `00a66cf0…` (`7fd2a44`,
  Node 22) both reached `SUCCESS`; final revision `medusa-web-00006-zm8` owns 100% traffic and both
  the direct Cloud Run `/health` and `https://api.miyagisanchez.com/health` returned 200.
- Frontend repair builds `d8e2d931…` (`e684432`, server-side Medusa URL + retired poller) and
  `8e43394e…` (`b4f45ee`, Node 22) both reached `SUCCESS`; final revision
  `miyagi-web-00007-7xj` owns 100% traffic. A real production Chromium smoke returned 200 and
  rendered a populated catalog on first load.
- `cicd-telegram-build-notifier` and `-frontend` are ACTIVE Gen2/Node 22 functions in
  `miyagisanchez-prod`. Natural terminal events from both final builds invoked both functions with
  HTTP 200 and no Telegram-send warning; this verifies the replacement rail without a synthetic
  alert.
- One unrelated browser-console 400 remains: a listing image from `teatrounam.com.mx` is outside
  the image-proxy allowlist. It does not affect catalog data or deploy health and belongs to the
  asset-host hygiene follow-up, not this migration repair.

---

## Sprint 4 close-out (2026-07-28) — what a 9-day soak actually caught

The soak was scheduled as a *waiting* period. It behaved as a *detection* period, and the two things
it caught were both **the close-out record of Sprint 3 being wrong** — not new breakage.

**S3 ticked "old triggers disabled" and "zero webhook repoints." Both had drifted, and the docs
could not have told us.** The old project's deploy rail was live again (a stale trigger export
replayed on 2026-07-28T02:34Z, silently re-enabling it because the JSON body simply omitted
`disabled`), and three DNS records had never been flipped at all — including `mschz.org`, an
entirely separate Cloudflare zone carrying the printed-QR short links at 666 requests/7d.

The uncomfortable part: **the epic's own Definition of Done was already ticked green for all of
this.** S3's DoD line reads "webhooks verified domain-based (zero repoints); enable new triggers,
disable old" — accurate the day it was written, false nine days later, and nothing in the process
re-checked it. A tick is a claim about a moment, and a teardown is the one operation that cannot
afford a stale claim.

**What actually found them, in both cases, was re-deriving live state rather than reading the
record:**

- the trigger regression fell out of Cloud Audit Logs (`CloudBuild.UpdateBuildTrigger` — principal,
  timestamp, and user-agent, all exact) after Daniel noticed *duplicated Telegram notifications*.
  The user-visible symptom was a **duplicate side effect**, not an error. Nothing was red anywhere.
- `mschz.org` fell out of one query against the old origin's Cloud Run access logs: group by `Host`
  header, ask who is still knocking. The cutover checklist could never have found it, because a
  checklist enumerates what its author already knew about.

**The tooling was never the gap.** `cloudflare-cutover-flip.mjs` already documented
`--domain mschz.org` in its own usage header and already supported `--extra-hosts`. S3 simply did
not run it for those names. This is the third time this epic family has shipped the same bug shape
(`www` in the Vercel→Cloud Run cutover, now `cname`/`gcp`/`mschz.org`), which is why the LEARNINGS
entry was rewritten to demand a sweep across **every zone in the account** rather than a smarter
record selector.

**One thing that went genuinely well:** ordering the mschz.org move cert-first. The Cloudflare Origin
CA cert and key from the 2026-07-10 issuance were still on disk and proved byte-identical (SHA-256
fingerprint) to the one live on the old ALB, so it was lifted verbatim rather than reissued. SNI
selection was verified at the new ALB *while DNS still pointed at the old one* — which is the only
ordering where a missing cert is discovered by us and not by a user getting a 525. It needed
re-checking twice: cert-plane propagation is minutes, and the first check was a false negative.

**And one that was quietly lucky:** the staging stack had 10 `*_STAGING` secrets copied into the new
project at S1 with **no IAM bindings** — values without access. Nothing consumed them for nine days,
so the first deploy failed on all ten at once. Had staging been load-bearing, that would have been a
production-shaped outage discovered at the worst moment. A `secrets list` diff showed parity that
did not exist.

**Left deliberately undone:** the project deletion itself. Everything else in this sprint is
reversible in seconds — services are `ingress=internal`, Cloud SQL is `STOPPED`, triggers are
disabled — which is exactly the state that makes the last step safe to hand to a human. The sprint's
own QA said an agent should not delete a production project, and nothing found during execution
argued for overriding that.
