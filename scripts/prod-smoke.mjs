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

export const DEFAULT_BASE = 'https://miyagisanchez.com';

// The checks, in the order the daily routine reports them. `expect` is declarative so the pure
// evaluator below can be unit-tested without a network: `status` is required; `location` asserts a
// redirect target; `bodyIncludes`/`bodyExcludes` assert page identity.
export const CHECKS = [
  {
    id: 'embed-js',
    name: 'embed.js',
    path: '/embed.js',
    expect: { status: 200 },
    why: 'The embed loader every seller-site iframe pulls. Dead loader = every embedded shop dark.',
  },
  {
    id: 'ucp-catalog',
    name: 'UCP catalog',
    path: '/api/ucp/catalog?limit=1',
    expect: { status: 200 },
    why: 'The agent-readable catalog endpoint. Also the source of the embed check\'s shop slug.',
  },
  {
    id: 'ucp-manifest',
    name: 'UCP manifest',
    path: '/api/ucp/manifest',
    expect: { status: 200 },
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
      const slug = firstShopSlug(catalogBody);
      if (!slug) return { unavailable: 'catalog returned no item with a shop slug to embed' };
      return { path: `/embed/s/${slug}` };
    },
    expect: { status: 200 },
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
    // The negative marker is what pins this apart from the selector, since both pages link to
    // /mx/l. If a market switcher ever legitimately lands on /mx, THIS is the line to change — and
    // that should be a deliberate review moment, not a silent green.
    expect: { status: 200, bodyIncludes: ['href="/mx/l"'], bodyExcludes: ['href="/us"'] },
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
    expect: { status: 200, bodyIncludes: ['href="/mx/l'] },
    why: 'The browse page itself — what /l used to serve, and what buyers actually land on.',
  },
];

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
 * Returns `{ path }` or `{ unavailable: reason }`. A dependent check whose dependency did not pass
 * is UNAVAILABLE, never failed — reporting "the iframe is broken" when we never learned which
 * iframe to look at would be a confident falsehood.
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
 * Pure: compare one observation against one check's expectations.
 *
 * `observation` is either `{ status, location, body }` or `{ error }` — a transport-level error
 * (DNS, TLS, timeout, connection refused) is UNAVAILABLE, not a failure. We did not observe the
 * assertion to be false; we failed to observe it at all. Collapsing the two would report an
 * outage in our own sandbox as an outage in production.
 */
export function evaluateCheck(check, observation) {
  const base = { id: check.id, name: check.name };

  if (observation?.error) {
    return { ...base, status: 'unavailable', detail: `could not reach it: ${observation.error}` };
  }

  const { status, location, body } = observation;
  const want = check.expect;
  const problems = [];

  if (status !== want.status) {
    problems.push(`expected HTTP ${want.status}, got ${status}`);
  }
  if (want.location !== undefined && location !== want.location) {
    problems.push(`expected redirect to "${want.location}", got ${location ? `"${location}"` : 'no Location header'}`);
  }
  for (const needle of want.bodyIncludes ?? []) {
    if (!(body ?? '').includes(needle)) {
      problems.push(`body is missing the marker ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of want.bodyExcludes ?? []) {
    if ((body ?? '').includes(needle)) {
      problems.push(`body unexpectedly contains ${JSON.stringify(needle)}`);
    }
  }

  if (problems.length > 0) {
    return { ...base, status: 'fail', detail: problems.join('; ') };
  }
  return { ...base, status: 'pass', detail: `HTTP ${status}`, body };
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
  if (summary.exitCode === 0) verdict = `PASSED ${summary.passed}/${summary.total} checks`;
  else if (summary.failed > 0) verdict = `FAILED — ${tally}`;
  else verdict = `UNAVAILABLE — ${tally}. Nothing was observed broken; nothing was observed working either.`;
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
    return {
      status: res.status,
      location: res.headers.get('location'),
      body: await res.text(),
    };
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
  const results = [];
  for (const check of CHECKS) {
    const resolved = resolvePath(check, results);
    if (resolved.unavailable) {
      results.push({ id: check.id, name: check.name, status: 'unavailable', detail: resolved.unavailable });
      continue;
    }
    const observation = await observe(`${base}${resolved.path}`, deps);
    results.push(evaluateCheck(check, observation));
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
  process.exit(summary.exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
