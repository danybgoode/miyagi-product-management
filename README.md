# Miyagi Sánchez — `miyagi-product-management`

**Mission:** make the best of modern e-commerce — trust, fair payments, negotiation, AI-native
shopping — free and high-quality for everyone in Mexico. Miyagi Sánchez is a multi-seller
marketplace where anyone can open a shop, list anything (products, services, rentals, digital
goods), and sell with no commission — across the marketplace, their own domain, an embeddable
widget, or to AI shopping agents.

*(Mission statement from [`Roadmap/README.md`](Roadmap/README.md), the product poster — the
source of truth for what's live.)*

This repo — `miyagi-product-management` — is the **product and orchestration docs repo**: the
roadmap, the working practice, and the engineering-delivery log for the whole platform. It does
not build or deploy anything itself.

## The four repos

| Repo | Owns | Deploys |
|---|---|---|
| **`miyagi-product-management`** (this repo) | Product roadmap (`Roadmap/`), engineering delivery log (`tasks/`), vendored Stripe skills + planning/ops skills consumed from the `ways-of-work` plugin (`skills/`), infra scripts (`infra/`) | No deploy — docs display on GitHub on merge |
| [`medusa-bonsai-backend`](https://github.com/danybgoode/medusa-bonsai-backend) (`apps/backend`) | Medusa v2 — the commerce engine: products, orders, payments, fulfillment, sellers, subscriptions | Cloud Build (us-east4) → Cloud Run `medusa-web` on merge to `main`, ~12 min, no per-branch preview |
| [`miyagisanchezcommerce`](https://github.com/danybgoode/miyagisanchezcommerce) (`apps/miyagisanchez`) | Next.js 16 — the UI layer, UCP/MCP agent-commerce endpoints, non-commerce APIs | Cloud Build (us-east4) → Cloud Run `miyagi-web` behind Cloudflare on merge to `main`; each PR still gets a Vercel preview for review |
| `miyagi-trifold-studio` (`apps/zine`) | The print/zine design studio for the ad-funded local magazine | **Local-only** — no remote, no CI, no deploy |

The three `apps/*` directories are each their own independent git repository (git-ignored from
this one — see `.gitignore`); this repo versions only the product/orchestration docs above it.

## Engineering practice

- **Plan → build → ship, one user story at a time**, with a deterministic gate before every merge
  and a named smoke-test stage on every plan — see
  [`Roadmap/WAYS-OF-WORKING.md`](Roadmap/WAYS-OF-WORKING.md).
- **Risk-tiered merges.** Low-risk PRs (docs, non-commerce UI, tests) can be reviewer-merged on
  green CI; anything touching payments, checkout, fulfillment, auth, DB migrations, or shared
  infra is always a human merge — see *Review & merge* in
  [`WAYS-OF-WORKING.md`](Roadmap/WAYS-OF-WORKING.md#review--merge--cross-agent).
  Sunny CI plus a single-pass fresh-agent review are the deterministic gate.
- **The `groom` skill** (`ways-of-work` plugin, [`dobby-foundation`](https://github.com/danybgoode/dobby-foundation) marketplace) is the front door for any new idea — it turns a raw
  ask into sliced, Definition-of-Ready user stories before a line of code is written, reframing
  toward existing Medusa/platform primitives before inventing new ones.
- **Cross-agent review on every PR.** [`scripts/cross-review.mjs`](scripts/cross-review.mjs) pipes
  the diff into a different model family (Codex or Antigravity) for an independent advisory pass;
  [`scripts/cross-panel.mjs`](scripts/cross-panel.mjs) does the same for a plan before code is
  written. Advisory only — CI and the fresh-agent review remain the actual gate.
- **Model split: Opus plans, Sonnet builds.** Grooming, spikes, plan mode, and review run on the
  stronger model with full deep-thinking; once a plan and its slices are approved, per-story
  execution is mechanical and runs on the faster model — see *Model tiers* in
  [`WAYS-OF-WORKING.md`](Roadmap/WAYS-OF-WORKING.md#conventions).
- **Retros feed forward.** Every epic closes with a retrospective, and durable, generalizable
  learnings get promoted into [`Roadmap/LEARNINGS.md`](Roadmap/LEARNINGS.md) — the distilled,
  cross-cutting digest every agent reads at session start, so a past retro reaches the next
  session instead of dying in its own folder.

## Quickstart

This repo has no dev server of its own — it's docs plus tooling scripts. To run an app, go into
its own repo and follow its README:

```bash
# Backend (Medusa v2) — apps/backend, own repo
cd apps/backend
npm install
npx medusa develop          # :9000

# Frontend (Next.js 16) — apps/miyagisanchez, own repo
cd apps/miyagisanchez
npm install
npm run dev                 # :3001, Turbopack
```

This repo's own tooling (`scripts/*.mjs` — doc hygiene, cross-review, roadmap sync) uses
`npm@11` / Node ≥20 / [Turborepo](https://turbo.build):

```bash
npm install
```

## Where things live

- [`Roadmap/README.md`](Roadmap/README.md) — the product poster: every feature by domain, current
  status.
- [`Roadmap/WAYS-OF-WORKING.md`](Roadmap/WAYS-OF-WORKING.md) — how planning, building, and shipping
  actually work here.
- [`Roadmap/LEARNINGS.md`](Roadmap/LEARNINGS.md) — the cross-cutting retro digest.
- [`tasks/`](tasks/) — the engineering delivery log: what was built, decisions, commit hashes,
  runbooks.
- [`skills/`](skills/) — vendored Stripe skills that stay repo-local; the planning/ops skills
  (`groom`, doc hygiene, and others) are consumed from the `ways-of-work` plugin via
  `.claude/settings.json`.

## License

[MIT](LICENSE)
