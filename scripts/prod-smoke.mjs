#!/usr/bin/env node
// prod-smoke.mjs — the daily production watchdog's checks, as a reviewable file.
//
// WHY THIS EXISTS AS A FILE. The "Miyagi prod smoke (daily)" routine predates the six committed
// routines in scripts/routines/ and carried its assertions ONLY in the cloud routine prompt in
// Daniel's account — no git source, so no epic could ever update it. That cost us twice:
//
//   1. market-architecture-foundation (shipped 2026-07-31) moved `/l` → `/mx/l` behind a one-hop
//      308. It updated lib/markets.ts in both repos with golden drift specs and updated the e2e
//      specs — and could not touch this smoke, which had no file to edit. The watchdog went red on
//      2026-08-05 against a route that had been correct for five days.
//   2. The same cutover turned `/` from the marketplace into the master-brand market SELECTOR.
//      The homepage check kept returning 200 and stayed green while silently testing a different
//      page, and the MX marketplace lost smoke coverage entirely with no signal at all.
//
// (2) is the reason the checks below assert IDENTITY, not just a status code. A 200 tells you
// something answered; it does not tell you the right thing answered. Every check that guards a
// rendered page therefore carries a structural body marker.
//
// This watchdog earns its keep — it is the layer that caught the empty-`shop.slug` defect that CI
// reported green on (see Roadmap/03-selling-and-shops/catalog-orphan-listing-sweep/README.md).
// That is exactly why its assertions belong under review rather than in a text box.
//
// THE RULE THAT CONSTRAINS EVERY EDIT HERE: never make a red smoke pass by weakening it
// (scripts/routines/smoke-triage.prompt.md). When a route moves, re-point the check at the new
// contract and, where the move itself is a contract worth keeping, assert the move too. Do not
// relax an assertion to silence a red run. catalog-orphan-listing-sweep Story 1.3 part 3 is the
// precedent: a strict smoke assertion was deliberately CONFIRMED rather than loosened.
//
//   node scripts/prod-smoke.mjs             # run every check, human-readable report
//   node scripts/prod-smoke.mjs --json      # same, machine-readable
//   node scripts/prod-smoke.mjs --base=...  # point at another origin (default prod)
//
// Exit codes are three-valued on purpose (AGENTS.md — "three states, never two"):
//   0  every check passed
//   1  at least one check FAILED (an assertion was observed false)
//   2  no failures, but at least one check was UNAVAILABLE (could not be observed at all)
// A run that could not check something must never exit 0. "I could not look" is not "it is fine".

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const DEFAULT_BASE = 'https://miyagisanchez.com';

// The JavaScript media types, as an explicit allow-list. Substring matching accepted
// `text/notjavascript`; this compares the parsed type, so only real ones pass.
export const JS_MEDIA_TYPES = [
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'text/ecmascript',
  'application/ecmascript',
];

// The checks, in the order the daily routine reports them. `expect` is declarative so the pure
// evaluator below can be unit-tested without a network: `status` is required; `location` asserts a
// redirect target; `bodyIncludes`/`bodyExcludes` assert page identity.
export const CHECKS = [
  {
    id: 'embed-js',
    name: 'embed.js',
    path: '/embed.js',
    // A 200 alone would pass an HTML error page served where a script belongs — the browser would
    // fail to parse it and every embedded shop would go dark while this check stayed green. Same
    // reasoning as the selector/marketplace markers below: a status proves something answered.
    // An ARRAY of acceptable substrings, because the JS media types are a set, not one string:
    // `text/ecmascript` and `application/ecmascript` are valid and functional, and demanding the
    // literal "javascript" would redden a working loader over a server-side MIME preference.
    //
    // The body markers are the loader's actual API SURFACE — the custom elements a seller's page
    // depends on. Without them a 200 with an empty or truncated body passed as healthy while
    // embedded shops received no usable loader. Custom-element names survive minification because
    // the DOM registers them by string, which is what makes them a durable marker rather than a
    // fragile one.
    expect: {
      status: 200,
      mediaTypeIn: JS_MEDIA_TYPES,
      bodyIncludes: ['customElements', 'miyagi-buy-button'],
    },
    why: 'The embed loader every seller-site iframe pulls. Dead loader = every embedded shop dark.',
  },
  {
    id: 'ucp-catalog',
    name: 'UCP catalog',
    path: '/api/ucp/catalog?limit=1',
    // `bodyIsJson` because a 200 that ANNOUNCES application/json and then serves something
    // unparseable is an observed broken response, and the catalog check is where that belongs. Left
    // to the dependent embed check it surfaced as "unavailable" — a broken catalog reported as an
    // inability to look at one.
    expect: { status: 200, headerIncludes: { 'content-type': 'json' }, bodyIsJson: true },
    why: 'The agent-readable catalog endpoint. Also the source of the embed check\'s shop slug.',
  },
  {
    id: 'ucp-manifest',
    name: 'UCP manifest',
    path: '/api/ucp/manifest',
    // STRUCTURAL, not substring: `{"error":"miyagisanchez-ucp unavailable"}` contains the
    // identifier while being the opposite of a healthy manifest. Assert the field's VALUE.
    expect: {
      status: 200,
      headerIncludes: { 'content-type': 'json' },
      bodyIsJson: true,
      bodyJsonMatches: { name: 'miyagisanchez-ucp' },
      // The name alone would pass a manifest stripped of everything an agent actually needs. These
      // ARE the discovery contract this check claims to protect: the capability an agent looks for
      // and the endpoint map it navigates by.
      bodyJsonIncludes: { capabilities: ['catalog_search'] },
      bodyJsonRequires: ['endpoints'],
    },
    why: 'The UCP discovery document — how an agent learns the catalog exists.',
  },
  {
    id: 'embed-iframe',
    name: 'embed iframe',
    // Derived, not hardcoded: the slug comes from the catalog's first item, so this check also
    // re-exercises the shop-attribution join. That derivation is load-bearing history — an empty
    // `shop.slug` made this resolve to `/embed/s/` and 308, which is how the orphan defect was
    // caught (catalog-orphan-listing-sweep). A hardcoded slug would not have caught it.
    dependsOn: 'ucp-catalog',
    pathFrom: (catalogBody) => {
      const items = parseCatalogItems(catalogBody);
      // Unparseable JSON can no longer reach here — the catalog check now fails on it, so this
      // branch means parseable JSON with no `items` array at all: an observed schema defect.
      if (items === null) return { failed: 'catalog response has no items array — schema defect' };
      if (items.length === 0) return { unavailable: 'catalog returned no items to embed' };

      const slug = firstShopSlug(catalogBody);
      // A blank slug is an OBSERVED DEFECT, not an inability to observe. We looked and saw the
      // catalog emitting shopless items — the exact orphan-attribution signature that made
      // `/embed/s/` + '' resolve to a slugless path and 308. Reporting it as "unavailable" would
      // be a detection REGRESSION against the watchdog this replaces, which went red on it.
      if (!slug) {
        return { failed: 'every catalog item has a blank shop.slug — the orphan-attribution defect signature' };
      }
      // The slug is also the page-identity marker: it proves THE REQUESTED shop rendered, not a
      // generic 200 page that happens to carry a permissive CSP.
      // `prod_` proves the embed actually RENDERED the shop's listings; the slug alone would pass
      // any generic page that merely echoed it back. The slug came from a catalog item belonging to
      // this shop, so the shop is known to have at least one product to render.
      return { path: `/embed/s/${slug}`, expect: { bodyIncludes: [slug, 'prod_'] } };
    },
    // Framing is the half of this check that makes the iframe actually embeddable — the orphan
    // sweep named its absence alongside the 308 as what a seller would experience.
    //
    // `framesFromAnywhere` parses the directive rather than substring-matching it, because
    // `frame-ancestors 'none'` and `frame-ancestors *.example.com` both CONTAIN the text
    // "frame-ancestors" (and the latter even contains "frame-ancestors *") while forbidding
    // exactly the third-party framing this check exists to prove. A check whose text and whose
    // effect name different things is decoration.
    expect: {
      status: 200,
      headerIncludes: { 'content-type': 'text/html' },
      framesFromAnywhere: true,
    },
    why: 'A seller embedding their storefront on their own site. 308 here = broken iframe.',
  },
  {
    id: 'market-selector',
    name: 'market selector (/)',
    path: '/',
    // `href="/us"` is the selector's identity: it is the only page that offers the US door. Chosen
    // over a <title> match because copy gets edited and a guard that reddens on a copy tweak trains
    // people to bypass it (AGENTS.md). This marker tracks the market registry instead.
    expect: { status: 200, bodyIncludes: ['href="/us"'] },
    why: 'Post-cutover `/` is the master-brand selector, NOT the marketplace. Status alone cannot tell them apart.',
  },
  {
    id: 'mx-marketplace',
    name: 'MX marketplace (/mx)',
    path: '/mx',
    // `home-hero` is PAGE-SPECIFIC; `href="/mx/l"` was not. Navigation appears on every page, so a
    // wrong-page error shell carrying only a nav bar passed this check — silently green-lighting
    // the exact regression class this watchdog exists to catch. The testid is structural, stable
    // (the Playwright specs depend on it) and independent of both the catalog and the flags.
    //
    // The negative marker still pins it apart from the selector. If a market switcher ever
    // legitimately lands on /mx, THAT is a deliberate review moment, not a silent green.
    expect: {
      status: 200,
      bodyIncludes: ['data-testid="home-hero"'],
      bodyExcludes: ['href="/us"'],
    },
    why: 'The live Mexico marketplace. Lost all smoke coverage at the 07-31 cutover — this restores it.',
  },
  {
    id: 'browse-redirect',
    name: 'browse redirect (/l → /mx/l)',
    path: '/l',
    // The redirect is itself a shipped live contract (market-architecture-foundation D8, the
    // highest-risk edit in that epic) and had no guard anywhere. Asserting it is strictly MORE
    // coverage than the old bare `/l` → 200 check, not less.
    expect: { status: 308, location: '/mx/l' },
    why: 'Old bookmarks, inbound links and the pre-cutover sitemap all still point at /l.',
  },
  {
    id: 'mx-browse',
    name: 'MX browse (/mx/l)',
    path: '/mx/l',
    // A PRODUCT link, not a nav link. `href="/mx/l` appears in the nav of every page, so the old
    // marker would have passed an error shell that merely carried navigation. A browse page whose
    // grid is empty is itself worth alerting on — that is the page's entire purpose.
    expect: { status: 200, bodyIncludes: ['href="/mx/l/prod_'] },
    why: 'The browse page itself — what /l used to serve, and what buyers actually land on.',
  },
];

/**
 * Pure: does this Content-Security-Policy permit an arbitrary third-party site to frame the page?
 *
 * Parsed, not substring-matched, and the distinction is the whole point: `frame-ancestors 'none'`
 * contains the text "frame-ancestors", and `frame-ancestors *.miyagi.example` even contains
 * "frame-ancestors *", yet both forbid the third-party framing a seller's embed depends on. Only a
 * bare `*` in the source list actually permits it.
 */
export function framesAllowedFromAnywhere(csp) {
  if (!csp) return false;

  // A header can carry MULTIPLE comma-separated policies (that is how several CSP headers arrive
  // merged), and a browser enforces every one of them — framing is permitted only if they ALL
  // permit it. Reading just the first directive accepted
  // `frame-ancestors *; default-src 'self', frame-ancestors 'none'`, which no browser will frame.
  const directives = String(csp)
    .split(',')
    .map((policy) =>
      policy
        .split(';')
        .map((d) => d.trim())
        .find((d) => /^frame-ancestors\b/i.test(d)),
    )
    .filter(Boolean);

  // No directive anywhere = framing is not PROVEN. This check exists to prove it, not to assume it.
  if (directives.length === 0) return false;
  return directives.every((d) => d.split(/\s+/).slice(1).includes('*'));
}

/**
 * Pure: the `items` array from a UCP catalog body, or null when the body is not parseable as one.
 * Separate from firstShopSlug so callers can tell "no items at all" (we cannot pick a shop to
 * check) apart from "items exist but none has a shop" (we observed the defect).
 */
export function parseCatalogItems(body) {
  let parsed;
  try {
    parsed = typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return null;
  }
  return Array.isArray(parsed?.items) ? parsed.items : null;
}

/**
 * Pure: pull the first non-empty `shop.slug` out of a UCP catalog response body.
 * Returns null for anything unparseable or empty — the caller decides whether that is a failure
 * or an unavailability, because those are different facts.
 */
export function firstShopSlug(body) {
  let parsed;
  try {
    parsed = typeof body === 'string' ? JSON.parse(body) : body;
  } catch {
    return null;
  }
  const items = parsed?.items;
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const slug = item?.shop?.slug;
    if (typeof slug === 'string' && slug.length > 0) return slug;
  }
  return null;
}

/**
 * Pure: work out the path a check should hit, given the results of the checks before it.
 *
 * Returns one of three shapes, and which one matters:
 *   `{ path, expect? }`      — go and look; `expect` merges over the check's static expectations
 *   `{ unavailable: reason }` — we could not determine what to look at
 *   `{ failed: reason }`      — we determined it, and what we saw is already wrong
 *
 * A dependent check whose DEPENDENCY did not pass is unavailable, never failed: reporting "the
 * iframe is broken" when we never learned which iframe to look at would be a confident falsehood.
 * But a dependency that passed while emitting something invalid is a real, observed failure — see
 * the blank-slug branch in the embed check above.
 */
export function resolvePath(check, priorResults) {
  if (!check.dependsOn) return { path: check.path };

  const dep = priorResults.find((r) => r.id === check.dependsOn);
  if (!dep) return { unavailable: `dependency "${check.dependsOn}" did not run` };
  if (dep.status !== 'pass') {
    return { unavailable: `dependency "${check.dependsOn}" was ${dep.status}` };
  }
  return check.pathFrom(dep.body);
}

/**
 * Pure: reduce a Location header to the path+query the check asserts against.
 *
 * HTTP permits either form, and a framework or CDN can switch between them without changing
 * behaviour at all — `Location: https://miyagisanchez.com/mx/l` is the same one-hop redirect as
 * `Location: /mx/l`. Comparing the raw string would redden on correct output, which is the guard
 * failure mode AGENTS.md singles out as worse than missing a fault. A CROSS-ORIGIN absolute target
 * is deliberately left un-normalized: sending buyers to another origin is a real difference, and it
 * must not quietly compare equal to a local path.
 *
 * "Same origin" means same origin as the BASE BEING CHECKED, not as production. Hardcoding
 * DEFAULT_BASE here made `--base=https://staging.miyagisanchez.com` report every absolute redirect
 * as cross-origin and fail a correct run — a false red on the one flag that exists to point this
 * script somewhere other than prod.
 */
export function normalizeLocation(location, base = DEFAULT_BASE) {
  // The empty guard IS load-bearing: `new URL(null, base)` resolves happily to a "/null" path, so
  // without it a MISSING Location header would silently become a plausible-looking one.
  if (!location) return location;
  try {
    // Resolved as a URI REFERENCE against the checked URL, which handles all three legal forms
    // uniformly: absolute, root-relative, and protocol-relative (`//host/path` — legal, resolved by
    // every browser to the same target, and previously compared as a literal string and failed).
    const url = new URL(location, base);
    if (url.origin !== new URL(base).origin) return location;
    return `${url.pathname}${url.search}`;
  } catch {
    return location;
  }
}

/**
 * Pure: the media type from a Content-Type header — lowercased, parameters stripped.
 * `text/javascript; charset=utf-8` -> `text/javascript`.
 */
export function parseMediaType(contentType) {
  if (!contentType) return null;
  return String(contentType).split(';')[0].trim().toLowerCase();
}

/** Pure: does this expectation need the response body at all? */
export function wantsBody(want) {
  return Boolean(
    want.bodyIsJson ||
      want.bodyIncludes?.length ||
      want.bodyExcludes?.length ||
      want.bodyJsonMatches ||
      want.bodyJsonIncludes ||
      want.bodyJsonRequires?.length,
  );
}

/**
 * Pure: compare one observation against one check's expectations.
 *
 * `observation` is either `{ status, location, body }` or `{ error }` — a transport-level error
 * (DNS, TLS, timeout, connection refused) is UNAVAILABLE, not a failure. We did not observe the
 * assertion to be false; we failed to observe it at all. Collapsing the two would report an
 * outage in our own sandbox as an outage in production.
 */
export function evaluateCheck(check, observation, base = DEFAULT_BASE) {
  const result = { id: check.id, name: check.name };

  if (observation?.error) {
    return { ...result, status: 'unavailable', detail: `could not reach it: ${observation.error}` };
  }

  const { status, location, body, headers } = observation;
  const want = check.expect;
  const problems = [];

  if (status !== want.status) {
    problems.push(`expected HTTP ${want.status}, got ${status}`);
  }
  if (want.location !== undefined) {
    const got = normalizeLocation(location, base);
    if (got !== want.location) {
      problems.push(`expected redirect to "${want.location}", got ${location ? `"${location}"` : 'no Location header'}`);
    }
  }
  // Body-dependent assertions are evaluated ONLY when the body was actually read. An unread body
  // is not a wrong body: judging `null` as "not parseable JSON" would convert a stalled read into a
  // confident claim about content nobody saw. The bodyError branch at the end reports it honestly.
  const bodyWasRead = !observation.bodyError;
  if (want.bodyIsJson && bodyWasRead) {
    try {
      JSON.parse(body ?? '');
    } catch {
      problems.push('body is not parseable JSON, despite the response announcing JSON');
    }
  }
  // Structural field assertions on a JSON document. A substring match cannot tell the manifest from
  // an error object that merely quotes the manifest's name.
  if ((want.bodyJsonMatches || want.bodyJsonIncludes || want.bodyJsonRequires) && bodyWasRead) {
    let doc;
    try {
      doc = JSON.parse(body ?? '');
    } catch {
      doc = undefined; // bodyIsJson already reported the parse failure; don't say it twice.
    }
    if (doc !== undefined) {
      for (const [field, expected] of Object.entries(want.bodyJsonMatches ?? {})) {
        if (doc?.[field] !== expected) {
          problems.push(
            `JSON field "${field}" is ${JSON.stringify(doc?.[field])}, expected ${JSON.stringify(expected)}`,
          );
        }
      }
      for (const field of want.bodyJsonRequires ?? []) {
        const value = doc?.[field];
        const empty =
          value === undefined ||
          value === null ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && Object.keys(value).length === 0);
        if (empty) problems.push(`JSON field "${field}" is missing or empty`);
      }
      for (const [field, required] of Object.entries(want.bodyJsonIncludes ?? {})) {
        const value = doc?.[field];
        if (!Array.isArray(value)) {
          problems.push(`JSON field "${field}" is not an array`);
          continue;
        }
        for (const entry of required) {
          if (!value.includes(entry)) {
            problems.push(`JSON field "${field}" does not include ${JSON.stringify(entry)}`);
          }
        }
      }
    }
  }
  if (want.mediaTypeIn) {
    const actual = parseMediaType(headers?.['content-type']);
    if (!actual) {
      problems.push('no content-type header, so the media type could not be checked');
    } else if (!want.mediaTypeIn.includes(actual)) {
      problems.push(`media type is ${JSON.stringify(actual)}, expected one of ${JSON.stringify(want.mediaTypeIn)}`);
    }
  }
  if (want.framesFromAnywhere && !framesAllowedFromAnywhere(headers?.['content-security-policy'])) {
    const csp = headers?.['content-security-policy'];
    problems.push(
      csp
        ? `content-security-policy is ${JSON.stringify(csp)}, which does not permit third-party framing`
        : 'no content-security-policy header, so third-party framing is not proven',
    );
  }
  for (const [name, needle] of Object.entries(want.headerIncludes ?? {})) {
    // Lowercased on BOTH sides: `observe` stores header names lowercased, so a check spelling one
    // `Content-Type` would look up a key that is never there and report a missing header on a
    // response that carried it.
    const value = headers?.[name.toLowerCase()];
    // A needle may be a single substring or a SET of acceptable ones (the JavaScript media types
    // are a set) — any one matching satisfies the expectation.
    const accepted = Array.isArray(needle) ? needle : [needle];
    if (value === undefined || value === null) {
      problems.push(`missing the ${name} header (expected it to contain ${JSON.stringify(needle)})`);
    } else if (!accepted.some((n) => String(value).toLowerCase().includes(String(n).toLowerCase()))) {
      problems.push(`${name} is ${JSON.stringify(String(value))}, expected it to contain ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of bodyWasRead ? want.bodyIncludes ?? [] : []) {
    if (!(body ?? '').includes(needle)) {
      problems.push(`body is missing the marker ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of bodyWasRead ? want.bodyExcludes ?? [] : []) {
    if ((body ?? '').includes(needle)) {
      problems.push(`body unexpectedly contains ${JSON.stringify(needle)}`);
    }
  }

  // A concrete observed failure OUTRANKS an incomplete read: if the status or headers already prove
  // the check false, say so, even though the body never arrived.
  if (problems.length > 0) {
    return { ...result, status: 'fail', detail: problems.join('; ') };
  }

  // Nothing was observed false, but a body-dependent expectation could not be evaluated at all —
  // that is the third state, not a pass. Claiming pass here would be the "I could not check, so it
  // must be fine" collapse this whole script exists to prevent.
  if (observation.bodyError && wantsBody(want)) {
    return {
      ...result,
      status: 'unavailable',
      detail: `HTTP ${status}, but the body could not be read (${observation.bodyError}) — its identity assertions were not evaluated`,
    };
  }

  return { ...result, status: 'pass', detail: `HTTP ${status}`, body };
}

/** Pure: roll per-check results into the run verdict + exit code. */
export function summarize(results) {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const unavailable = results.filter((r) => r.status === 'unavailable').length;

  // Order matters: a failure outranks an unavailability, and neither is ever green.
  let exitCode = 0;
  if (failed > 0) exitCode = 1;
  else if (unavailable > 0) exitCode = 2;

  return { total: results.length, passed, failed, unavailable, exitCode };
}

/** Pure: render the report a human (or the routine) reads. */
export function formatReport(results, summary, base) {
  const icon = { pass: '✅', fail: '❌', unavailable: '⚠️ ' };
  const lines = [`Miyagi prod smoke — ${base}`, ''];

  for (const r of results) {
    lines.push(`${icon[r.status]} ${r.name} — ${r.detail}`);
  }

  lines.push('');
  // The verdict word carries the same three states the exit code does. Calling an all-unavailable
  // run "FAILED" would report production as broken when the truth is that we could not look at it —
  // the exact collapse this script exists to avoid.
  const tally = `${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.unavailable} unavailable`;
  let verdict;
  if (summary.exitCode === 0) {
    verdict = `PASSED ${summary.passed}/${summary.total} checks`;
  } else if (summary.failed > 0) {
    verdict = `FAILED — ${tally}`;
  } else if (summary.passed === 0) {
    verdict = `UNAVAILABLE — ${tally}. Nothing was observed broken; nothing was observed working either.`;
  } else {
    // The mixed case needs its own sentence. Saying "nothing was observed working" after reporting
    // seven passes is simply false, and the routine copies this line into Daniel's alert — so the
    // wrong words here become the wrong words on his phone at 4am.
    verdict = `UNAVAILABLE — ${tally}. What was checked looked healthy; ${summary.unavailable} check(s) could not be observed at all.`;
  }
  lines.push(verdict);

  if (summary.unavailable > 0) {
    lines.push('');
    lines.push('An UNAVAILABLE check was not observed at all — it is not evidence that the thing is healthy.');
  }
  return lines.join('\n');
}

// ---- I/O shell ----

/** Fetch one URL without following redirects, so a 308 stays observable as a 308. */
async function observe(url, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { redirect: 'manual', signal: controller.signal });
    // Header names are case-insensitive on the wire; lowercase them once here so the check table
    // can spell them one way and the pure evaluator never has to care.
    const headers = {};
    for (const [name, value] of res.headers) headers[name.toLowerCase()] = value;
    const observed = { status: res.status, location: res.headers.get('location'), headers };

    // The body is read SEPARATELY so a stalled body cannot discard a status we already have. A 500
    // whose body then times out is an observed failure — reporting it as "could not reach it" would
    // route a concrete production fault down the unavailability path and lose the 500 entirely.
    try {
      return { ...observed, body: await res.text() };
    } catch (bodyErr) {
      return { ...observed, body: null, bodyError: String(bodyErr?.message ?? bodyErr) };
    }
  } catch (err) {
    return { error: err?.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run every check against `base`. Degrades per check: one unreachable URL marks itself unavailable
 * and the run carries on, so a single dead endpoint never hides the state of the other seven.
 */
export async function runChecks(base, deps = {}) {
  // Normalized here too, not only in main(): a programmatic caller passing a trailing slash would
  // otherwise build `https://host//embed.js`, and a doubled path segment is its own bug hunt.
  const origin = String(base).replace(/\/$/, '');
  const results = [];
  for (const check of CHECKS) {
    const resolved = resolvePath(check, results);
    if (resolved.unavailable) {
      results.push({ id: check.id, name: check.name, status: 'unavailable', detail: resolved.unavailable });
      continue;
    }
    if (resolved.failed) {
      results.push({ id: check.id, name: check.name, status: 'fail', detail: resolved.failed });
      continue;
    }
    const observation = await observe(`${origin}${resolved.path}`, deps);
    // Derived expectations (the embed check's per-shop identity marker) merge over the static ones.
    const effective = resolved.expect
      ? { ...check, expect: { ...check.expect, ...resolved.expect } }
      : check;
    results.push(evaluateCheck(effective, observation, origin));
  }
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: { json: { type: 'boolean' }, base: { type: 'string' } },
    allowPositionals: false,
  });
  const base = (values.base ?? DEFAULT_BASE).replace(/\/$/, '');

  const results = await runChecks(base);
  const summary = summarize(results);

  if (values.json) {
    // Drop the retained bodies — they exist only to feed dependent checks, and a full page of HTML
    // in the report would bury the result it is supposed to communicate.
    const slim = results.map(({ body, ...rest }) => rest);
    console.log(JSON.stringify({ base, summary, results: slim }, null, 2));
  } else {
    console.log(formatReport(results, summary, base));
  }
  // `process.exitCode` rather than `process.exit()`: the latter tears the process down immediately
  // and can TRUNCATE stdout when it is a pipe rather than a TTY. The report is the routine's whole
  // diagnostic input — a half-written one would have it triaging a failure it cannot fully read.
  process.exitCode = summary.exitCode;
}

// Same main-detection shape as session-note.mjs / owed-ledger.mjs — string-comparing a `file://`
// URL against argv[1] assumes they are spelled identically, which is not guaranteed.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
