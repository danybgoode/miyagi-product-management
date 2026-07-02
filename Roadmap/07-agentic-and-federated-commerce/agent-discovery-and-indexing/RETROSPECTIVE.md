# Retrospective · Agent discovery & indexing (07, spike + low)

**S0 spike run:** 2026-07-02, investigation only (no branch, no build). This file will grow at epic
close with Sprint 1/2 sections; for now it carries the S0 decision the epic README gates on.

## S0 — indexing spike findings

Audited live against `https://miyagisanchez.com` (prod): `robots.txt`, `sitemap.xml`, `llms.txt`,
`/api/ucp/manifest`, response headers/body to a spoofed Googlebot UA vs a default UA, and canonical/
`X-Robots-Tag`/noindex on `/`, `/vende`, `/l`, `/acerca`, `/agent`.

| Check | Result |
|---|---|
| `robots.txt` | `User-Agent: *` / `Allow: /`, points to `sitemap.xml` + comment pointers to `llms.txt` and the UCP manifest. No UA branching in the route handler (`app/robots.txt/route.ts`) — every crawler (Googlebot, GPTBot, Google-Extended, OAI-SearchBot, PerplexityBot) gets the same permissive rule. **No explicit AI-crawler lines needed — the wildcard already allows them.** ✅ |
| `sitemap.xml` | Reachable, valid XML, 9 URLs — `/`, `/l`, `/acerca`, `/vende` + 4 sub-pages, `/sell`. **By design** (`app/sitemap.ts` doc comment) it deliberately does *not* enumerate the full multi-seller catalog on the marketplace host, to avoid duplicate-content risk against tenant custom-domain sitemaps, which *do* enumerate that shop's listings. Not a bug. ✅ |
| `llms.txt` | Reachable, valid, bilingual, links `/acerca`, `/vende`, `/agent`, the manifest. ✅ |
| `/api/ucp/manifest` | Reachable, valid JSON, `access-control-allow-origin: *`. ✅ |
| `X-Robots-Tag` header | Absent on all 9 surfaces checked (both marketing pages and the machine-discovery files). ✅ |
| `<meta name="robots">` | `index, follow` on every page checked, identical for default UA and a spoofed Googlebot UA. No cloaking. ✅ |
| Canonical tags | Present + correct (self-referential, bare apex) on `/`, `/vende`, `/acerca`. **Missing** on `/l` and `/agent` — minor, not a blocker (each is a single canonical URL regardless), but worth adding for hygiene. 🟡 |
| Googlebot-UA vs default-UA body diff | Byte-for-byte identical once Sentry's per-request `sentry-trace`/`baggage` meta tags (random `sample_rand`) are stripped — confirmed by direct diff, not assumed. No hidden noindex/cloaking path. ✅ |
| `www.miyagisanchez.com` | Serves **200 with full duplicate content** instead of a 301/308 to the bare apex — no host-level canonicalization at the Vercel domain layer. The in-page `<link rel="canonical">` correctly points at the bare domain, which Google should respect, but relying on the tag alone instead of also redirecting the host is untidy and worth fixing. 🟡 |
| Domain age | `whois` creation date **2026-05-18** — the domain is ~6 weeks old as of this spike (2026-07-02). |
| `site:miyagisanchez.com` (live re-check via WebSearch, 2026-07-02) | Still **zero results** — confirms the epic's 2026-07-01 finding is current, not stale. |
| Past Vercel SSO/preview shadowing prod | Ruled out — prod paths return clean 200s with no auth challenge; Clerk's signed-out headers don't gate SSR. |

### What this audit can't see
A synthetic Googlebot **User-Agent** string from a residential/dev IP proves the app doesn't
*branch on UA* — it can't prove Vercel's Firewall/Bot Protection wouldn't challenge a **real**
Googlebot IP range differently (LEARNINGS already documents that managed Bot Protection applies to
prod but not previews, and shadows app-level handlers). That check needs the Vercel dashboard and/or
Search Console's own "Live Test", which sees exactly what the real crawler saw.

## Decision

**Confirmed causes, ranked by likelihood:**
1. **New-domain / no-backlink crawl starvation (primary).** A 6-week-old domain with no external
   backlink profile commonly waits weeks before Google prioritizes crawl budget for it, independent
   of any code issue — everything Google-facing (robots, sitemap, headers, canonical, no noindex) is
   clean, so there is no code-side reason for zero coverage.
2. **Search Console likely never verified/submitted (needs Daniel to confirm).** A clean site with
   zero coverage and no manual-action signal usually means it was simply never given to Google
   directly — submission is what shortens the wait, not a prerequisite for eventual organic crawl.
3. **Ruled out:** noindex/`X-Robots-Tag` (absent everywhere), canonical/host-consolidation blocking
   Google (canonical tag is correct even though the `www` host itself isn't redirected), cloaking to
   Googlebot (bodies identical), missing AI-crawler robots lines (wildcard already covers them),
   unreachable machine-discovery files (all 200 and valid).
4. **Can't rule out from outside Search Console:** a manual action, or Vercel Bot/Firewall protection
   silently challenging genuine Googlebot IPs. Low probability given the account's own history (Bot
   Protection was seen active on *prod only* in the `vercel-function-cost-reduction` epic) but it must
   be checked directly, not inferred.

## What to check in Search Console (owed to Daniel — I hold no access)
1. **Verification status.** Search Console → Settings → confirm `miyagisanchez.com` is verified as a
   **domain property** (not just a URL-prefix property) — a domain property auto-covers `www` +
   `http`/`https`, which matters given the `www` duplicate found above. If unverified, verify via DNS
   TXT (fastest, no code change) and submit `https://miyagisanchez.com/sitemap.xml` under Sitemaps.
2. **Sitemaps report.** Was `sitemap.xml` ever submitted? If it shows "Couldn't fetch" or nothing at
   all, that alone explains zero coverage — submit it now.
3. **Coverage / Pages report.** Look at the exclusion reasons bucket-by-bucket: if it's empty (nothing
   discovered at all) that supports crawl-starvation; if pages show up as **"Discovered – currently not
   indexed"** or **"Crawled – currently not indexed"**, that's normal new-domain throttling, not a bug —
   wait it out. If instead you see **"Blocked by robots.txt"**, **"Excluded by 'noindex' tag"**, or
   **"Blocked due to access forbidden (403)"** for any URL, that contradicts this audit's live checks and
   means Search Console is seeing something different than we just fetched — flag it back immediately,
   don't just wait.
4. **URL Inspection → Live Test** on `/` and `/vende`. This is the one check nothing above can
   substitute for: it shows exactly what *real* Googlebot saw on its last (or right-now) fetch,
   including any Vercel Firewall/Bot-Protection challenge a spoofed-UA curl from a non-Google IP would
   never trigger. If the rendered HTML/headers here differ from what this audit found, that's the smoking
   gun.
5. **Security & Manual Actions report.** Confirm no manual action is on file (would be unusual for a
   brand-new clean domain, but cheap to rule out).
6. **After submitting:** use "Request Indexing" on `/` and `/vende` from URL Inspection to nudge the
   first crawl rather than waiting on discovery alone.

## Prioritized action list

**Ops (Daniel, do first — no code involved):**
- [ ] Confirm/complete Search Console **domain-property** verification (DNS TXT).
- [ ] Submit `sitemap.xml` if not already submitted.
- [ ] Read the Coverage/Pages exclusion reasons and the Manual Actions report (steps 1–3, 5 above).
- [ ] Run URL Inspection **Live Test** on `/` and `/vende` (step 4) — the one check this spike
      structurally cannot do from outside Search Console.
- [ ] `Request Indexing` on `/` and `/vende` once submitted.

**Code/config (small, Sprint-2-sized, only if the Search Console read surfaces something to fix):**
- [ ] Redirect `www.miyagisanchez.com` → bare apex at the Vercel domain layer (301/308), instead of
      relying solely on the in-page canonical tag, to remove the duplicate-host signal at the source.
- [ ] Add a self-referential `<link rel="canonical">` to `/l` and `/agent` (currently missing; low
      risk, matches the pattern already used on `/`, `/vende`, `/acerca`).
- [ ] Only if Live Test (step 4) shows a Vercel Bot-Protection challenge for Googlebot: adjust the
      Firewall/Bot-Protection rule to allow-list verified search/AI crawlers.

**Submit-and-wait (no action, just time):**
- [ ] If Coverage shows "Discovered/Crawled – currently not indexed" and nothing else is wrong, this
      is normal new-domain throttling — re-check `site:miyagisanchez.com` and Coverage in ~2–3 weeks
      rather than treating it as a bug to keep fixing.

**Gate:** Sprint 2 (any code/config fix) does not start until Daniel has read Search Console and this
list's "code/config" items are confirmed as actually needed — most of what a code fix could address
here already checks out clean. Sprint 1 (the `/agent` es-MX translation + `/vende` prompt-targeting
copy work) is independent of this decision and can proceed regardless.

---

## Sprint 1 — what shipped (2026-07-02, frontend PR #156 `c922e38`)

All three copy/config stories landed in one low-risk PR; deterministic gate (`tsc` + `build` + Playwright
`api`) green before merge.

- **1.1 — `/agent` → es-MX.** The rendered headings/prose/labels now pull the `.es` about sections + es-MX
  use-case copy; the machine-readable JSON-LD/schema **keys stayed English** (API contract) and the
  relay-language directive is intact, so agents still answer in the user's language. `/agent` was **not**
  added to the bilingual allow-list — it's es-MX only now (rule #5: removed a stray English surface).
- **1.2 — promoted prompt targets `/vende`.** The "ask your agent" prompt strings across surfaces resolve to
  `…/vende` (and `/vende/promotor` for the promoter context, coordinated with the promoter-funnel `{url}`
  fix). `/agent` remains the machine briefing but is no longer the promoted *evaluation* target.
- **1.3 — `/vende` OG unfurl re-verified.** OG image route renders and OG/Twitter tags are correct (route-level
  assert). The real link-preview unfurl check is owed to Daniel.

## What went well
- **The reframe held:** treating "agents can't find us" as an *indexing* problem, not a code bug, kept Sprint
  1 to a tight copy/config PR and pushed the real fix (Search Console ops) to where it belongs.
- **S0 ruled things out with live evidence, not inference** — byte-diff of Googlebot-UA vs default-UA bodies,
  live `robots`/`sitemap`/`llms`/manifest fetches, `whois` domain age — so the "new-domain crawl starvation"
  conclusion rests on data, and the residual unknowns (real-Googlebot-IP behind Vercel Bot Protection) are
  named honestly as needing Search Console's Live Test.

## What we learned (promoted to LEARNINGS.md, deduped)
- **Zero search coverage on a clean, correctly-configured site is usually crawl-starvation on a young domain
  — not a code bug.** Rule out cloaking/noindex/robots with a live Googlebot-UA-vs-default body diff first;
  if the config is clean, the fix is Search Console verification + submission + time, not more code.
- **A spoofed Googlebot User-Agent from a dev IP proves the app doesn't branch on UA — it cannot prove Vercel
  Bot/Firewall Protection wouldn't challenge a real Googlebot IP.** That gap only closes with Search Console's
  URL-Inspection Live Test; don't claim "crawlers see clean HTML" from a curl alone.

## Gaps / owed to Daniel (async, non-gating)
- The Search Console ops from the S0 action list (verify domain property, submit sitemap, read Coverage +
  Manual Actions, run Live Test on `/` + `/vende`, Request Indexing).
- The async "did it get indexed" re-check of `site:miyagisanchez.com` / Coverage in ~2–3 weeks.
- Optional code hygiene **only if** the SC read surfaces a need: `www`→apex 301/308 at the Vercel domain
  layer, and a self-referential canonical on `/l` + `/agent` (both currently missing — low risk).
- The real link-preview unfurl smoke for `/vende` (1.3).
