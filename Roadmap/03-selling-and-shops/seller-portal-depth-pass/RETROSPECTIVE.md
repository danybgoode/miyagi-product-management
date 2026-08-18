# Seller-portal depth pass — Retrospective

_Closed: 2026-08-17_ · Backend PR #161 merged before frontend PR #388; both deterministic gates passed.

## What shipped
Loading boundaries and 44px mobile action surfaces shipped in frontend `3504ae3` (Sprint 1). Listing
delete now waits 10 seconds behind one seller-shell undo owner and seller guidance is factual in
`03edbcb` (Sprint 2). The backend `d7b142b`/PR #161 adds one pure order transition planner plus a
read-only, ownership-first preview and stale-state apply re-check; frontend `5b11a60`/PR #388 makes
that preview the only OrdersInbox bulk-status path and reports partial success (Sprint 3). No table,
migration, feature flag, or new commerce model was introduced.

## What went well

- The locked planner/ownership contract kept preview and apply on the same Medusa rules, while the
  frontend stayed backward-compatible with the existing PATCH during backend-first deployment.
- The mutation proof was useful: loading, target size, undo timing, copy, stale planning, and request
  parsing all went red under deliberate breaks before restoration.
- Generated icon and seller-locale populations caught new UI strings before merge; the cross-family pass
  found and removed four English backend errors before the fixed tip shipped.

## What we learned

The durable rule is now in `Roadmap/LEARNINGS.md`: a preview must be per-object ownership-first and
read-only, and apply must carry the reviewed baseline into a live planner re-check. Generated locale
and icon artifacts are part of the source population and must be regenerated whenever UI copy or icon
usage changes.

## Gaps / follow-ups

- The anonymous local live smoke rendered `/shop/manage/orders` as a clean 200 sign-in surface with no
  console errors. The authenticated mixed-order browser smoke is committed but skipped here because
  `MS_TEST_SELLER_EMAIL` is not provisioned in this checkout; Daniel still owns that disposable native /
  ML / manual-payment walkthrough after deploy.
- The generated build-order board must be refreshed from this README's shipped frontmatter.
