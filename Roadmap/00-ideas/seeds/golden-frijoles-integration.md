---
status: scaffolded
slug: golden-frijoles-integration
area: 09-platform-infra
---

# Golden Frijoles integration — finish the rebrand, and turn the platform all the way on

Golden Beans was renamed **Golden Frijoles** and grew four capabilities Miyagi does not consume:
a visual rule builder (per-flag targeting), scenarios, journey projections and experiment
governance. Miyagi still pins `@golden-beans/sdk` 0.3.0 from a GitHub release tarball, while the
engine's own package is `@golden-frijoles/sdk` 0.4.0 — unreleased, so there is nothing to upgrade
to until we cut it.

Separately, the platform is carrying 41 feature flags that exist only because an older process
flagged everything. The product owner wants every guarded capability live for 100% of tenants,
with exactly one exception: the Envía.com shipping integration, whose account is unfunded.

**The outcome:** one SDK, one brand, one credential path, and a production flag state that is
provably "everything on except Envía" — where "provably" means asserted against Golden's live
snapshot, not against a catalog file that merely intends it.
