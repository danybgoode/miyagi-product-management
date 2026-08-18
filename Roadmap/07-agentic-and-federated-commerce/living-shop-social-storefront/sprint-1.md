# Living Shop — Sprint 1: Wall foundation

**Status:** ✅ shipped — `44233c2 + 0212519` (PR #391)

**Risk:** MED — additive shared-live Supabase migration + seller-authenticated writes. No commerce/money mutation.

## Stories

### Story 1.1 — Shop-scoped Wall persistence
**As a** seller, **I want** my shop to have a durable Wall publication model, **so that** posts and referenced commerce objects have one safe source of truth.

**Acceptance:** add `shop_wall_entries` (or an equivalently named dedicated non-commerce table) with shop ownership, kind (`post|product|collection|event`), publication state (`draft|published|scheduled`), optional body/media, typed reference, pin state and timezone-safe timestamps; database/service constraints reject invalid kind/reference combinations; one pinned visible entry per shop; delete cascades with shop; indexes support public reverse-chronological reads; cross-shop writes are impossible through the seller API.

**Implementation constraint:** do not store product price, inventory, collection membership or event fields in the Wall row.

### Story 1.2 — Seller Wall CRUD API + pure validation seam
**As a** seller, **I want** to create, edit, publish, unpublish, schedule and delete my own Wall entries, **so that** I control what visitors see.

**Acceptance:** authenticated seller routes support list/create/update/delete for only the caller's shop; body/media/reference limits are explicit; `scheduled_for` accepts an offset-aware timestamp and is persisted as `timestamptz`; transitions are deterministic; invalid/foreign references are rejected or refused with a clear reason; deleting/unpublishing an entry removes it from public reads immediately after cache invalidation.

### Story 1.3 — Canonical object resolver
**As a** buyer, **I want** a Wall commerce/event card to reflect the current canonical object, **so that** I never see stale price, availability or event information copied into a post.

**Acceptance:** one server-only resolver takes a Wall reference and returns a public-safe Product, Collection or Event view only when it belongs to that shop and is currently public; missing/unpublished/foreign references resolve to unavailable and public Wall reads omit them; specs cover each kind plus cross-shop refusal.

### Story 1.4 — Wall composer shell + contextual object picker
**As a** seller, **I want** to start a Wall entry from one composer and attach one supported object, **so that** publishing commerce content feels like posting rather than configuring a CMS.

**Acceptance:** seller surface supports Post/Product/Collection/Event; Product/Collection/Event use searchable/selectable objects from that seller only; Post supports bounded text + R2 media upload with required alt text for meaningful images; save draft / publish now / schedule are explicit actions; empty/invalid entries cannot publish.

## QA

- migration/schema specs for constraints + partial unique pin index;
- pure validation transition specs, including timezone offset preservation;
- authenticated API specs for same-shop success and foreign-shop refusal;
- deliberate red mutation for every new spec family;
- deterministic gate: type-check + build + Playwright api;
- browser smoke: composer renders all four kinds, draft/publish/schedule controls and media alt input.

## Smoke walkthrough

Production URLs. Steps marked **OWED (Daniel)** need a real seller session — this
machine's Clerk key is `pk_test_` and production is `pk_live_`.

1. Open `https://miyagisanchez.com/shop/manage/tienda` signed in as a seller. **OWED (Daniel)**
   → The studio opens on **Muro**, with five tabs and a "Ver mi tienda" link out.
2. On an empty Wall, read the empty state.
   → It names all four kinds — nota, producto, colección, evento — and offers "Crear publicación".
3. Create a text **Nota** and press "Guardar borrador". **OWED (Daniel)**
   → It appears in the list as **Borrador**, and `https://miyagisanchez.com/mx/s/<tu-slug>` still shows no Wall.
4. Press "Publicar ahora" on that draft. **OWED (Daniel)**
   → Status becomes **Publicada**, and the shop homepage now shows it under **Novedades**.
5. Create a **Producto** entry and pick one of your own products. **OWED (Daniel)**
   → The card shows the product's CURRENT title and price, read live from the catalog — nothing was copied.
6. Set a schedule with the date picker and press "Programar". **OWED (Daniel)**
   → The list shows the instant in your own timezone with the zone named; the entry is absent from the public shop until that instant passes.
7. Anonymous check, runs anywhere:
   `curl -s -o /dev/null -w '%{http_code}\n' https://miyagisanchez.com/api/sell/wall`
   → **401**. Same for POST, PATCH and DELETE — covered automatically by `e2e/wall-api-auth.spec.ts`.
8. Foreign-reference refusal: as seller A, POST `/api/sell/wall` with a `reference_id` belonging to seller B. **OWED (Daniel)**
   → **403** with "no es de tu tienda", and no row is created.
