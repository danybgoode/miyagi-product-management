---
title: "Tiendas Fundadoras acquisition surface"
slug: tiendas-fundadoras-acquisition
status: raw
area: "08"
type: feature
priority: "#3-fm"
risk: low
epic: null
build_order: "#3-fm"
updated: 2026-07-20
---

# Seed — Tiendas Fundadoras acquisition surface

Add `/vende/fundadoras` as a thin campaign route over the shipped `/vende` renderer and runtime CMS. Lead with
the 25-shop CDMX founding cohort and white-glove outcome, not generic platform breadth. The CTA creates/enriches
a merchant prospect with promoter/UTM attribution instead of dropping everyone into generic `/sell`; metadata,
OpenGraph and agent-readable copy match the runtime campaign. Launch only after consent-safe previews and the
activation intake exist. Instrument eligibility, application, permission and activation events for Golden Beans;
the first A/B test comes later through `experiment-governance-v2`, not inside the launch slice.
