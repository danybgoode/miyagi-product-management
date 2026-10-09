---
status: shipped
phase: Shipped
slug: claim-links-bulk-outreach
title: "Bulk claim links and outreach CSV"
area: 03-selling-and-shops
risk: low
type: feature
sprints_total: 1
stories_total: 1
---

# Bulk claim links and outreach CSV

> **Area:** 03-selling-and-shops · **Risk:** low · **Class:** Feature

The platform admin needs one export for personally written invitations to active, unclaimed shops. The export contains exactly Name, Email, Link1 (public shop page), and Link2 (shop claim page).

## Decisions

- **D1 · Entire ready directory:** Select all uses every ready shop in the directory, across pagination and filters. The admin may also choose individual ready shops.
- **D2 · Fresh authority:** Before signing, reread the canonical Medusa seller and check that it is active, unclaimed, and in the selected market. A failed shop is reported separately; no partial CSV is offered.
- **D3 · Contact provenance:** Prefer the seller's captured merchant email. Otherwise use a publicly listed business address keyed to the canonical seller ID, never a name match. Leave Email blank when no reliable address is found.
- **D4 · Bearer links:** The claim URL is a bearer capability. Generate it only for a signed-in platform admin, put it in the requested local CSV, and warn that the file must be handled carefully. This workflow sends no message.
- **D5 · Public Link1:** Include a direct public shop URL only when the preview is confirmed visible. An unknown or private preview leaves Link1 blank.

## Scope

See [Sprint 1](sprint-1.md) for the acceptance and smoke walkthrough. The existing single-shop claim-link path, admin guard, and signing rail are reused. No new flag, migration, or external dependency is needed.

## Definition of Done (epic)

- [x] Frontend PR merged and its production Cloud Build succeeded.
- [x] Focused CSV and bulk partial-failure specs observed red under deliberate breaks and green after restoration; full API suite and deterministic CI green.
- [ ] Owner-session production admin smoke: select all ready shops, generate, export, verify four columns and a known row.
- [x] Poster and sprint updated, retrospective written, team memory reviewed, branch deleted.

## Evidence and limits

Frontend [PR #430](https://github.com/danybgoode/miyagisanchezcommerce/pull/430) merged as `72eb7f5` on 2026-10-08 with typecheck, lint, CodeQL, four preview API shards, and browser smoke passing. Production Cloud Build `53a262cb-56f9-431b-afa1-789094d6e901` succeeded; Cloud Run revision `miyagi-web-00152-2f7` serves its image on 100% of traffic. `references/leads-gems.xlsx` has lead names but no email column. Public research identified ten business addresses with a clear seller match. The live mirror listed 42 unclaimed imported rows, including retired previews and a test row; it is not the ready-shop count. Email remains blank wherever a reliable public match or captured email is unavailable. The admin-only export smoke remains owed to Daniel.
