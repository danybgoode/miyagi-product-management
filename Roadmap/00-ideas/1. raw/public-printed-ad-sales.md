# Public standalone printed-ad sales — "Anúnciate en la revista" funnel

*Seeded 2026-07-03 while grooming `custom-print-products` (Daniel: hide placements from the
storefront now, evaluate a public funnel later).*

**Raw ask:** today only merchants buy printed-magazine ad placements, through the backoffice
ad-builder. Evaluate making placements buyable by the general public from public pages — a
standalone "put your ad in the magazine" funnel.

**Known constraints (from the 2026-07-03 audit):** placements are real Medusa products under the
miyagiprints seller (`metadata.is_print_placement: true`), so checkout is feasible; the coupling is
the **ad-builder + editorial workflow** (`print_ad_submissions`, editorial queue), which assumes an
authed merchant context. A public funnel needs: a landing (tier pricing + edition
calendar + coverage zones), guest ad-builder or post-purchase ingredient collection, and the
editorial queue accepting non-merchant submitters. Overlaps with the promoter close flow's ad-design
step — reuse it.
