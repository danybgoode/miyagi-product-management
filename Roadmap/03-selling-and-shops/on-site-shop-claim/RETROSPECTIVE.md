# On-site shop claim · retrospective · 2026-10-07

_Closed: 2026-10-07_

## What happened

The reported claim email pointed at `/onboarding/claim` on miyagisanchez.com,
but the storefront had no route there. The deployed `DESPACHOBONSAI_URL`
constructed that URL. The production log and signed token identified Dharana
Movement as the shop in the email; the reported Terrumaco visit was a different
shop request, so the two events could not be treated as one request.

## What shipped

We shipped one on-site `/claim` journey for public email requests, manually
prepared campaign invitations, promoter WhatsApp handoffs, and merchant close
receipts. The page names the shop and links to its preview before account
creation. Medusa serializes ownership transfer and refuses a second claimant;
the account email does not need to match the outreach address. Old unexpired
`/onboarding/claim` links redirect to the new page. The deploy script and live
Cloud Run service no longer carry `DESPACHOBONSAI_URL`.

## What the verification found

The first independent review found two promoter senders still using the old
variable, a seller-ID fallback that bypassed paused-shop visibility, and a
CodeQL finding in email validation. Fixing only the public email sender would
have broken promoter claims when the env var was removed. The preview CI then
caught a generated flag-inventory line number moved by one import. Each was
fixed before merge. The backend status spec was observed red under a deliberate
guard removal and green again after restoration.

## What went well

Backend and storefront production builds succeeded. Headless production smoke
confirmed the new recovery page, old-route redirect and public shop preview;
the live API refused a forged shop ID.

## Gaps / follow-ups

A live authenticated claim remains owed to Daniel because the production Clerk
flow cannot use the test harness, and the reported 24-hour token expired during
the rollout.

## Durable learning

Inventory every issuer before retiring a link destination or its env var. A
search for `DESPACHOBONSAI_URL` found three live senders, not one; the old URL
was an integration contract across public email and promoter flows. Keep the
destination in one helper, and verify both the deployed revision and the live
service environment after a config change.
