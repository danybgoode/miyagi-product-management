# Custom print products — Sprint 3: Artwork upload + the configurator buy box

**Status:** ✅ built (`feat/custom-print-products`, commits `4f6b859` + `bf769c3` + `8e348cc`) — draft PR opened, gate green, Daniel's real-file money-path smoke owed

## Stories

### Story 3.1 — New `file` CustomFieldType ✅ `4f6b859`
**As a** seller, **I want** an "Arte / archivo" custom field on a listing (required flag, format allowlist PNG/JPG/PDF/AI/SVG, max size), **so that** buyers must attach their artwork to order.
**Acceptance:** extends `lib/personalization.ts` (`CustomFieldDef`) — no new tables; config UI sits with the existing custom-fields editor; a listing with a required file field can't be added to cart without one.
**Risk:** LOW
**As built:** max size is a per-field seller setting clamped to a **4MB hard ceiling** (`MAX_ARTWORK_SIZE_MB`) — deliberately lower than the "up to 20MB" originally sketched at grooming: verified live that Vercel's Node.js Serverless Function request-body limit (~4.5MB) makes anything close to 20MB fail to even parse, so the ceiling had to leave real headroom, not just look generous on paper. Also fixed a real bug found in the same seam: `buildPersonalizationPayload` was character-clamping every non-select value to 80 chars, which would have silently truncated any uploaded artwork URL into a broken link.

### Story 3.2 — Buyer artwork upload, echoed end-to-end ✅ `bf769c3`
**As a** buyer (including guest), **I want** to upload my artwork in the buy box and see it at every step, **so that** I trust the shop prints what I sent (radical-transparency heuristic from the personalization epic).
**Acceptance:** upload lands in R2 via a rate-limited, validated route (size cap, format sniffing — mirror the `POST /api/supply/upload` no-Clerk precedent + `lib/ratelimit.ts`); a thumbnail echoes in cart → checkout → order confirmation → both emails; the seller downloads the **original** from the order screen; payload rides `line_item.metadata.personalization` like every other field.
**Risk:** HIGH (guest upload surface / shared R2 infra)
**As built:** `POST /api/artwork/upload` — genuinely public (no Clerk, no `withSupplyAdmin`), Node runtime. Real magic-byte format sniffing (`lib/file-sniff.ts`, hand-rolled — no existing route in this codebase did more than trust `Content-Type`): PNG/JPEG/PDF magic bytes + an SVG text-sniff (`<svg` tag, rejects `<script`/`on*=` in the sniffed prefix as cheap defense-in-depth). An `.ai` upload correctly sniffs as `pdf` (modern Illustrator files are PDF containers) and is accepted when the field allows either. Server re-resolves the real field's `allowed_formats`/`max_size_mb` from the listing (never trusts a client-supplied limit), falling back to the global 4MB/all-formats cap if the lookup fails. Rate-limited via a new `artwork_upload` key (20/10min/IP).

### Story 3.3 — Low-res preflight warning ✅ `4f6b859` (fn) / `8e348cc` (wired)
**As a** buyer, **I want** a warning when my image is too low-res for the chosen physical size, **so that** I'm not surprised by a blurry print.
**Acceptance:** pure `lib/` validator (pixels vs cm at ~300 PPI, driven by the selected size variant); warns, never blocks; es-MX copy; unit-tested.
**Risk:** LOW
**As built:** `checkArtworkResolution` + `parseSizeCm` in `lib/personalization.ts` (per this doc's own placement call). Only fires for raster uploads (PNG/JPG) where a physical cm size is parseable from the selected dimension — PDF/AI/SVG and an unparseable size silently skip the check.

### Story 3.4 — The configurator buy box ✅ `8e348cc`
**As a** buyer, **I want** one coherent flow — options → upload → live price grid → total, **so that** ordering feels StickerJunkie-grade on mobile.
**Acceptance:** renders only when the product has options/tiers/file field (single-variant listings keep today's PDP — graceful degrade); behind the `configurator.enabled` kill-switch (fail-safe: today's PDP); price grid highlights the active tier as quantity changes; es-MX; no overflow at 360/390/414px.
**Risk:** LOW
**As built:** also fixed a real pre-existing priority bug this story's own change would otherwise have tripped: `app/(shell)/l/[id]/page.tsx` checked `customFields.length > 0` (→ flat-price `PersonalizationBuyBox`) **before** `hasConfigurator` in both buy-box ternary chains, so a configurator (multi-variant/tiered) listing that also got a custom field — exactly what Story 3.1 makes common — would have silently lost its variant/tier pricing. Reordered so the configurator wins (now passed `customFields`), with plain personalization as the fallback for non-configurator products. `configurator.enabled` (fail-open, matches `pdp_redesign`'s polarity) is AND'd into `hasConfigurator` at its single computation site.

## Sprint QA
- **api specs:** `e2e/personalization.spec.ts` (file-type sanitize/validate/build, incl. the truncation regression), `e2e/artwork-preflight.spec.ts` (`checkArtworkResolution`/`parseSizeCm`), `e2e/artwork-upload.spec.ts` (upload-route contract — rejects missing input, oversize, and a format-sniff mismatch; deliberately does NOT assert a successful upload, which would write a real object to shared Supabase/R2 storage on every CI run — same restraint `e2e/supply-gem-import.spec.ts` already takes for its own upload route), `e2e/flags-admin.spec.ts` (bumped to 16 known flags).
- **deterministic gate:** `tsc --noEmit` clean, `npm run build` clean, `npm run test:e2e` (`api` project) green — verified against a real running dev server (see gotcha below), not just in theory.
- **browser smoke owed:** yes, to Daniel — **money path with a real file**: guest upload → configure → pay test card → artwork visible on order + in both emails; seller downloads the original.

### Build gotcha worth recording
Running `preview_start`/the harness's dev-server tool against this worktree serves the **wrong checkout** — `.claude/launch.json`'s `npm run dev` resolves relative to the monorepo root, whose own `npm run dev` (`npm -r dev`) fans out across every `apps/**` workspace, and a sibling worktree sharing the `miyagisanchez` package name collides with the main checkout (same shape as the existing `dev-tooling-reliability` Learnings entry, now confirmed for **serving**, not just `tsc`/`playwright`). The route file was correct the whole time — `curl`ing the "wrong" port 3001 always hit the ORIGINAL `apps/miyagisanchez` checkout (on a different branch), never the worktree, producing a confusing generic Next.js error. Fix: run `node_modules/.bin/next dev --turbopack --port <free-port>` directly from inside the worktree and point Playwright's `PLAYWRIGHT_BASE_URL` at that port.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production · https://miyagisanchez.com   (or the preview URL while testing pre-merge)

1. As miyagiprints, edit the die-cut sticker listing → custom fields → add "Arte" (tipo archivo, requerido) → check the format allowlist (PNG/JPG/PDF/AI/SVG) and set a max size (≤ 4MB).
   → Field saves and shows the allowlist + size cap.
2. Open the listing in a private window (guest). Try to add to cart without a file.
   → Blocked with a clear es-MX nudge on the file field.
3. Upload a small 400×400px PNG with size 10cm selected.
   → Preflight warning appears (low-res for 10cm) but doesn't block; thumbnail renders in the buy box.
4. (money path) Proceed to checkout → thumbnail + chosen options echo in the checkout review → pay with Stripe test card 4242…
   → Confirmation page + buyer email show the thumbnail; the order in `/shop/manage/orders` shows it with a "Descargar original" link that downloads the exact uploaded file.
5. Kill-switch drill: flip `configurator.enabled` off in `/admin/flags` (or confirm polarity on preview).
   → The listing falls back to today's PDP; no dead buy box.

If any step fails, note the step number + what you saw — that's the bug report.
