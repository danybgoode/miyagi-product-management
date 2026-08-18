---
title: "Tenant lifecycle — give /admin real control over shops"
slug: tenant-lifecycle-admin
status: shipped
area: "09"
type: feature
priority: null
risk: null
epic: "09-platform-infra/tenant-lifecycle-admin"
build_order: null
updated: 2026-08-18
---

# Tenant lifecycle — give /admin real control over shops

`/admin/tenants` is a strict read-model: it lists every shop with its claim state, custom domain,
entitlement and listing count, and offers no action at all. The `admin-consolidation` epic
deliberately deferred suspend, on the grounds that Medusa has no seller-status primitive and a
Supabase `metadata.suspended` flag honored by *some* consumers is worse than nothing.

That deferral is now the gap. The product owner needs to edit a shop, pause an account, remove one,
see the email a merchant actually registered with, and sort the directory by the platform's own
heuristics rather than alphabetically by name.

**The outcome:** a real `status` on the Medusa seller — the commerce primitive the whole platform
already resolves through — enforced at the catalog, the money path and the seller portal, and an
admin surface that can drive it.
