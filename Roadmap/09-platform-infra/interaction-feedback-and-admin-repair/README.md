---
status: in-progress
slug: interaction-feedback-and-admin-repair
---

# Epic: Interaction feedback + the admin surfaces that were lying

> **Area:** 09 · Platform & Infra · **Risk:** Medium · **Class:** Bug

An assorted run raised by Daniel on 2026-08-15, built epic-mode. Six PRs across the storefront repo.
Not one of these was found by a test; all six were found by a person using the product.

## Why

Two threads run through the whole list.

**The product did not acknowledge input.** `.btn` had a press state. Nothing else did — not the
product tiles on every catalog page, not the chips, not the seller-portal nav. On a phone, where
hover does not exist at all, a tap produced *no feedback whatsoever* between the tap and the next
page painting. Daniel's words: "the site is not slow, but we must ensure our users receive feedback
on every interaction."

**The admin surfaces made confident claims that were false.** `/admin/contenido` rendered ~2600 nav
entries, almost all captioned "sección no reconocida — revisar lib/copy-overrides-routes.ts" — an
editor accusing itself, several thousand times, while its own header comment claimed full coverage.
The emoji guard listed the right files and could not see the emoji inside them. The onboarding
checklist rendered five steps of which four were inert text.

## Context

| | |
|---|---|
| **Role** | Buyer (feedback, contact), Merchant (nav, checklist), Daniel (admin surfaces) |
| **Risk** | MEDIUM — `globals.css`, the shell `<body>` and the seller nav are shared surface |
| **Flag** | none — per the 2026-08-10 posture, a new capability ships enabled |
| **Data** | none. No migration, no money path, no auth boundary touched |

## Decisions locked before any builder started

**D1 — Press and pending are two signals, and they do not merge.** PRESS is pure CSS `:active`,
zero JS, instant: "your input registered." PENDING is `data-pending`, driven by Next 16's
`useLinkStatus()`: "…and the result is still coming." A single combined signal cannot say the second
thing without JS, and cannot say the first thing fast enough with it.

**D2 — The press layer goes in `globals.css`, not into components.** One rule set covers all 18
existing `.card-tile` call sites without touching one of them. A per-component press prop would have
been 18 edits that then drift.

**D3 — `useLinkStatus` for the local mark, a document-level listener for the global bar.** The hook
reports the status of ONE `<Link>` to its descendants. That scope is the entire value — it is the
only signal that can distinguish the clicked item from its fifteen siblings — and it structurally
cannot drive a single global bar, because there is no "any link is pending" subscription. The two
coexist by design.

**D4 — The progress bar mounts at `MarketDocument`'s `<body>`, not in `PlatformShell`.** The seller
portal renders a bare `<main>` branch and the white-label channel renders `ChannelLayout`; a
shell-level mount would silently have skipped both — including `/shop/manage/*`, the surface the
complaint was about. It also has to outlive the navigation it reports on.

**D5 — The bar never reaches 100% on its own.** It does not know how long a navigation will take,
and a bar that completes before the page does is a lie people learn to distrust. It creeps to 90%;
the pathname changing is what completes it. It also waits 140ms before painting at all, so a
prefetched route never flashes it.

**D6 — `sellerCopy`'s "section" is the page the string renders on, derived, never tabled.** Its 1809
keys are content hashes with no dots, so the universal `key.split('.')[0]` rule made every key its
own section. `locales/seller-population.json` already maps every key to its source file; collapsing
those 105 files to route directories gives 34 real pages. Route labels are derived from the path — a
34-entry table would go stale the first time a page is added, and staleness is the entire bug.

**D7 — The contact address is a FACT, not copy.** It lives in `lib/contact.ts`, dependency-free so
both server and client can import it, and `lib/email.ts` takes its `REPLY_TO` from there rather than
keeping a second literal. Two copies of a support address eventually become two addresses, and the
wrong half is a channel nobody reads.

**D8 — The white-label footer deliberately does NOT carry the platform address.** A buyer on a
merchant's own domain has a question for *that merchant*. The omission is asserted by spec so it
reads as a decision rather than as a surface someone forgot.

**D9 — Browser-smoke fixtures are DISCOVERED, not pinned to secrets.** An id in an Actions secret is
a claim about production data that nobody re-checks, made somewhere invisible from the codebase. It
rots silently and then presents as a product regression.

## Sprints

| # | Sprint | PR | Status |
|---|---|---|---|
| 1 | [Press + pending foundation](sprint-1.md) | [#374](https://github.com/danybgoode/miyagisanchezcommerce/pull/374) | 🟦 In review |
| 2 | [Async button loading](sprint-1.md#s2) | [#375](https://github.com/danybgoode/miyagisanchezcommerce/pull/375) | 🟦 In review |
| 3 | [/admin/contenido nav repair](sprint-2.md) | [#376](https://github.com/danybgoode/miyagisanchezcommerce/pull/376) | 🟦 In review |
| 4 | [Contact, emoji round 2, checklist](sprint-3.md) | [#377](https://github.com/danybgoode/miyagisanchezcommerce/pull/377) | 🟦 In review |
| 5 | [Admin list pagination](sprint-2.md#s5) | [#378](https://github.com/danybgoode/miyagisanchezcommerce/pull/378) | 🟦 In review |
| 6 | [Browser-smoke fixture discovery](sprint-4.md) | [#370](https://github.com/danybgoode/miyagisanchezcommerce/pull/370) | 🟦 In review |

## Acceptance — what Daniel can check

- On a phone, tapping a product tile visibly dims it, and it *stays* dimmed while the PDP loads.
- Clicking any `/shop/manage` nav item marks that item and shows a thin bar at the top of the screen.
- `/admin/contenido`'s left nav is ~110 readable page names, none of them saying "no reconocida".
- `/admin/tenants` and `/admin/comunicaciones` page at 25 rows.
- The root market selector shows `MX` / `US` chips, no flag emoji.
- The dashboard checklist: every unfinished step has something to click, including "Comparte tu tienda".
- "Activa cómo cobrar" lands on the payments *section*, not the wizard.
- `hola@miyagisanchez.com` is reachable from the footer, the 404 page, /acerca and /terminos.

## Definition of Done (epic)

- [ ] All six PRs merged and the Cloud Build for each confirmed SUCCESS (`gcloud builds list --region=us-east4`).
- [ ] Daniel walks the acceptance list above — **on a phone as well as a desktop**, since the press
      layer is the half that only matters where hover does not exist.
- [ ] `Roadmap/README.md` poster updated.
- [ ] `RETROSPECTIVE.md` written and its durable learnings promoted to `Roadmap/LEARNINGS.md`.
- [ ] The zero-photo browser-smoke fixture decided (create a no-photo listing, or retire the spec) —
      it currently reports FIXTURE UNAVAILABLE and skips, deliberately loudly.
- [ ] Clerk's own sign-up email templates carry `hola@miyagisanchez.com` — those live in the Clerk
      dashboard, not in this repo, so only Daniel can do it.
