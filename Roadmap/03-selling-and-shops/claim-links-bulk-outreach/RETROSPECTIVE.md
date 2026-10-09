# Bulk claim links and outreach CSV — Retrospective

_Closed: 2026-10-08._
_Intent: unconfirmed until the product-owner export smoke._

## What shipped

Frontend [PR #430](https://github.com/danybgoode/miyagisanchezcommerce/pull/430) shipped cross-page ready-shop selection, bounded bulk link preparation, ten researched public business contacts, and the four-column CSV. The preview CI suite and production Cloud Build succeeded. No invitation is sent automatically.

## What went well

The existing admin guard, claim signing, seller-status checks, and directory supported the bulk workflow without a new data store or sending rail.

## What we learned

A researched contact list must be keyed by canonical seller identity. Similar names and retired previews make name-based matching unsafe. A blank CSV cell is more truthful than an uncertain email or a hidden public URL.

## Gaps / follow-ups

Daniel owns the signed-in production export smoke and recipient checks. The public email map covers only addresses backed by a clear business match; research can continue without blocking the bulk capability.
