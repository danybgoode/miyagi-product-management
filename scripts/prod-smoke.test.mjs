// prod-smoke.test.mjs — unit coverage for the daily production watchdog's pure half.
//
// Everything here runs offline: `evaluateCheck`, `resolvePath`, `summarize`, `formatReport` and
// `firstShopSlug` take plain data, so the whole file runs in milliseconds with no network and no
// live production dependency. That seam is the point — the decisions are testable, the fetch is not.
//
// Per AGENTS.md ("a guard that rejects correct output is worse than one that misses a rare fault —
// always allow the negation of what you ban"), every assertion below is covered in BOTH directions:
// the violating case is flagged AND the correct case is left alone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKS,
  DEFAULT_BASE,
  evaluateCheck,
  firstShopSlug,
  formatReport,
  normalizeLocation,
  resolvePath,
  summarize,
} from './prod-smoke.mjs';

const check = (id) => CHECKS.find((c) => c.id === id);

// ---- evaluateCheck: status ----

test('evaluateCheck: a matching status passes', () => {
  const r = evaluateCheck(check('embed-js'), {
    status: 200,
    body: '/*! loader */',
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
  });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: a mismatched status fails and names both sides', () => {
  const r = evaluateCheck(check('embed-js'), { status: 503, body: '' });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /expected HTTP 200, got 503/);
});

// ---- evaluateCheck: the redirect contract (the 2026-08-05 regression) ----

test('evaluateCheck: /l → 308 to /mx/l passes — the shipped contract', () => {
  const r = evaluateCheck(check('browse-redirect'), { status: 308, location: '/mx/l', body: '' });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: a 308 to the WRONG target fails even though the status matches', () => {
  const r = evaluateCheck(check('browse-redirect'), { status: 308, location: '/us/l', body: '' });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /expected redirect to "\/mx\/l", got "\/us\/l"/);
});

test('evaluateCheck: a 308 with no Location header fails, and says so specifically', () => {
  const r = evaluateCheck(check('browse-redirect'), { status: 308, location: null, body: '' });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /no Location header/);
});

test('evaluateCheck: /l serving 200 directly fails — the redirect is the contract', () => {
  // The negation of the bug: if someone "fixed" the smoke by making /l serve the page again, that
  // is a different architecture than the one that shipped, and it should be loud.
  const r = evaluateCheck(check('browse-redirect'), { status: 200, location: null, body: '' });
  assert.equal(r.status, 'fail');
});

// ---- evaluateCheck: absolute vs relative redirect targets (codex review, PR #118) ----

test('normalizeLocation: a same-origin absolute target reduces to its path', () => {
  assert.equal(normalizeLocation('https://miyagisanchez.com/mx/l'), '/mx/l');
});

test('normalizeLocation: a relative target is already normal, and passes through untouched', () => {
  assert.equal(normalizeLocation('/mx/l'), '/mx/l');
});

test('normalizeLocation: a CROSS-origin target is NOT normalized — that is a real difference', () => {
  // Sending buyers to another origin must never compare equal to a local path.
  assert.equal(normalizeLocation('https://evil.example/mx/l'), 'https://evil.example/mx/l');
});

test('normalizeLocation: a malformed Location is returned as-is rather than throwing', () => {
  assert.equal(normalizeLocation('http://[not a url'), 'http://[not a url');
});

test('evaluateCheck: /l redirecting to the ABSOLUTE same-origin target still passes', () => {
  // HTTP permits either form and a CDN can switch between them without any behaviour change.
  // Reddening here would reject correct output — the guard failure AGENTS.md calls the worse one.
  const r = evaluateCheck(check('browse-redirect'), {
    status: 308,
    location: 'https://miyagisanchez.com/mx/l',
    body: '',
    headers: {},
  });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: a cross-origin redirect fails even though the path matches', () => {
  const r = evaluateCheck(check('browse-redirect'), {
    status: 308,
    location: 'https://evil.example/mx/l',
    body: '',
    headers: {},
  });
  assert.equal(r.status, 'fail');
});

// ---- evaluateCheck: headers (codex review, PR #118) ----

test('evaluateCheck: embed.js served as HTML fails despite a 200', () => {
  // An HTML error page where a script belongs parses to nothing and takes every embedded shop dark.
  const r = evaluateCheck(check('embed-js'), {
    status: 200,
    body: '<!doctype html><title>500</title>',
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /content-type is "text\/html; charset=utf-8", expected it to contain "javascript"/);
});

test('evaluateCheck: embed.js served as javascript passes, and the match is case-insensitive', () => {
  const r = evaluateCheck(check('embed-js'), {
    status: 200,
    body: '/*! loader */',
    headers: { 'content-type': 'TEXT/JavaScript; charset=utf-8' },
  });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: a missing required header fails and names the header', () => {
  const r = evaluateCheck(check('embed-js'), { status: 200, body: '', headers: {} });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /missing the content-type header/);
});

test('evaluateCheck: the embed iframe needs frame-ancestors, not merely a 200', () => {
  // A page that renders for us and refuses to frame for the seller is not a working embed.
  const r = evaluateCheck(check('embed-iframe'), {
    status: 200,
    body: '<html></html>',
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /content-security-policy/);
});

test('evaluateCheck: the embed iframe with frame-ancestors passes', () => {
  const r = evaluateCheck(check('embed-iframe'), {
    status: 200,
    body: '<html></html>',
    headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': 'frame-ancestors *' },
  });
  assert.equal(r.status, 'pass');
});

// ---- evaluateCheck: page identity (the silent-erosion class) ----

test('evaluateCheck: the selector needs its US door, not merely a 200', () => {
  const marketplaceHtml = '<a href="/mx/l">Ver todo</a>';
  const r = evaluateCheck(check('market-selector'), { status: 200, body: marketplaceHtml });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /missing the marker "href=\\"\/us\\""/);
});

test('evaluateCheck: the real selector body passes', () => {
  const selectorHtml = '<a href="/mx">MX</a><a href="/us">US</a><a href="/mx/l">Ver</a>';
  const r = evaluateCheck(check('market-selector'), { status: 200, body: selectorHtml });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: /mx serving the selector fails on the excluded marker', () => {
  // This is the exact erosion that went unnoticed for five days: both pages answer 200, so only an
  // identity marker can tell them apart.
  const selectorHtml = '<a href="/mx">MX</a><a href="/us">US</a><a href="/mx/l">Ver</a>';
  const r = evaluateCheck(check('mx-marketplace'), { status: 200, body: selectorHtml });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /unexpectedly contains "href=\\"\/us\\""/);
});

test('evaluateCheck: the real marketplace body passes', () => {
  const marketplaceHtml = '<a href="/mx/l">Ver todo</a><a href="/mx/l?sort=reciente">Nuevo</a>';
  const r = evaluateCheck(check('mx-marketplace'), { status: 200, body: marketplaceHtml });
  assert.equal(r.status, 'pass');
});

test('evaluateCheck: several broken expectations are reported together, not just the first', () => {
  const r = evaluateCheck(check('mx-marketplace'), { status: 500, body: '<a href="/us">US</a>' });
  assert.equal(r.status, 'fail');
  assert.match(r.detail, /expected HTTP 200/);
  assert.match(r.detail, /missing the marker/);
  assert.match(r.detail, /unexpectedly contains/);
});

// ---- evaluateCheck: unavailable is its own state ----

test('evaluateCheck: a transport error is UNAVAILABLE, never a failure', () => {
  const r = evaluateCheck(check('embed-js'), { error: 'getaddrinfo ENOTFOUND' });
  assert.equal(r.status, 'unavailable');
  assert.match(r.detail, /could not reach it/);
});

// ---- firstShopSlug ----

test('firstShopSlug: returns the first non-empty slug', () => {
  const body = JSON.stringify({ items: [{ shop: { slug: 'andrea-shops' } }] });
  assert.equal(firstShopSlug(body), 'andrea-shops');
});

test('firstShopSlug: skips the empty-slug fallback rather than embedding a slugless path', () => {
  // `lib/ucp/schema.ts` deliberately emits '' when it cannot resolve a shop. Concatenating that
  // into `/embed/s/` is what produced the 308 the orphan sweep chased.
  const body = JSON.stringify({ items: [{ shop: { slug: '' } }, { shop: { slug: 'real-shop' } }] });
  assert.equal(firstShopSlug(body), 'real-shop');
});

test('firstShopSlug: returns null for an empty catalog, malformed JSON, or a missing items array', () => {
  assert.equal(firstShopSlug(JSON.stringify({ items: [] })), null);
  assert.equal(firstShopSlug('not json at all'), null);
  assert.equal(firstShopSlug(JSON.stringify({ total: 0 })), null);
});

// ---- resolvePath: dependency handling ----

test('resolvePath: an independent check just uses its own path', () => {
  assert.deepEqual(resolvePath(check('embed-js'), []), { path: '/embed.js' });
});

test('resolvePath: the embed check derives its path from the catalog body', () => {
  const prior = [{ id: 'ucp-catalog', status: 'pass', body: JSON.stringify({ items: [{ shop: { slug: 'prueba' } }] }) }];
  assert.deepEqual(resolvePath(check('embed-iframe'), prior), { path: '/embed/s/prueba' });
});

test('resolvePath: a dependent check is UNAVAILABLE when its dependency did not pass', () => {
  // Three states, never two: we did not learn that the iframe is broken, we never learned which
  // iframe to look at. Reporting a failure here would be a confident falsehood.
  const prior = [{ id: 'ucp-catalog', status: 'fail', detail: 'expected HTTP 200, got 500' }];
  const r = resolvePath(check('embed-iframe'), prior);
  assert.match(r.unavailable, /dependency "ucp-catalog" was fail/);
});

test('resolvePath: a passing catalog with no usable slug is UNAVAILABLE, not a pass', () => {
  const prior = [{ id: 'ucp-catalog', status: 'pass', body: JSON.stringify({ items: [] }) }];
  const r = resolvePath(check('embed-iframe'), prior);
  assert.match(r.unavailable, /no item with a shop slug/);
});

// ---- summarize: the three-valued exit code ----

test('summarize: all passing is the only green', () => {
  const s = summarize([{ status: 'pass' }, { status: 'pass' }]);
  assert.deepEqual([s.passed, s.failed, s.unavailable, s.exitCode], [2, 0, 0, 0]);
});

test('summarize: any failure exits 1', () => {
  const s = summarize([{ status: 'pass' }, { status: 'fail' }]);
  assert.equal(s.exitCode, 1);
});

test('summarize: unavailable-only exits 2 — a run that could not look is NOT green', () => {
  // AGENTS.md rule 5: a script that exits green having run nothing reads as a passing gate.
  const s = summarize([{ status: 'pass' }, { status: 'unavailable' }]);
  assert.equal(s.exitCode, 2);
});

test('summarize: a failure outranks an unavailability', () => {
  const s = summarize([{ status: 'fail' }, { status: 'unavailable' }]);
  assert.equal(s.exitCode, 1);
});

// ---- formatReport ----

test('formatReport: names every failing check in the output', () => {
  const results = [
    { id: 'a', name: 'embed.js', status: 'pass', detail: 'HTTP 200' },
    { id: 'b', name: 'browse redirect (/l → /mx/l)', status: 'fail', detail: 'expected HTTP 308, got 200' },
  ];
  const out = formatReport(results, summarize(results), DEFAULT_BASE);
  assert.match(out, /browse redirect/);
  assert.match(out, /expected HTTP 308, got 200/);
  assert.match(out, /FAILED/);
});

test('formatReport: an unavailable run says explicitly that it is not evidence of health', () => {
  const results = [{ id: 'a', name: 'embed.js', status: 'unavailable', detail: 'could not reach it: timeout' }];
  const out = formatReport(results, summarize(results), DEFAULT_BASE);
  assert.match(out, /not evidence that the thing is healthy/);
});

test('formatReport: an all-unavailable run reads UNAVAILABLE, never FAILED', () => {
  // Reporting "FAILED" when nothing was observed false would announce a production outage on the
  // strength of our own sandbox losing the network.
  const results = [{ id: 'a', name: 'embed.js', status: 'unavailable', detail: 'could not reach it: timeout' }];
  const out = formatReport(results, summarize(results), DEFAULT_BASE);
  assert.match(out, /UNAVAILABLE —/);
  assert.doesNotMatch(out, /FAILED/);
});

test('formatReport: a MIXED pass/unavailable run never claims nothing was observed working', () => {
  // codex review, PR #118: with 7 passes and 1 unavailable the report said "Nothing was observed
  // working either" directly beneath "7/8 passed" — a literal falsehood, and the routine copies
  // this line into the alert. The report must match what actually happened.
  const results = [
    ...Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `check ${i}`, status: 'pass', detail: 'HTTP 200' })),
    { id: 'u', name: 'UCP catalog', status: 'unavailable', detail: 'could not reach it: timeout' },
  ];
  const out = formatReport(results, summarize(results), DEFAULT_BASE);
  assert.match(out, /UNAVAILABLE —/);
  assert.doesNotMatch(out, /nothing was observed working either/i);
  assert.match(out, /What was checked looked healthy/);
  assert.match(out, /1 check\(s\) could not be observed at all/);
});

test('formatReport: a run with real failures still reads FAILED even alongside unavailables', () => {
  const results = [
    { id: 'a', name: 'embed.js', status: 'fail', detail: 'expected HTTP 200, got 503' },
    { id: 'b', name: 'UCP catalog', status: 'unavailable', detail: 'could not reach it: timeout' },
  ];
  const out = formatReport(results, summarize(results), DEFAULT_BASE);
  assert.match(out, /FAILED —/);
});

// ---- the table itself ----

test('CHECKS: every check declares an expected status and a why', () => {
  for (const c of CHECKS) {
    assert.ok(c.id, 'check needs an id');
    assert.ok(c.name, `${c.id} needs a name`);
    assert.ok(c.why, `${c.id} needs a why — the reason a check exists is what stops it being deleted as noise`);
    assert.equal(typeof c.expect?.status, 'number', `${c.id} needs an expected status`);
    assert.ok(c.path || c.pathFrom, `${c.id} needs either a path or a pathFrom`);
  }
});

test('CHECKS: ids are unique, so resolvePath can never match the wrong dependency', () => {
  const ids = CHECKS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('CHECKS: every dependsOn names a check declared EARLIER in the table', () => {
  // The runner walks the table in order, so a forward reference would silently resolve to
  // "dependency did not run" and degrade a real check into a permanent unavailable.
  const seen = new Set();
  for (const c of CHECKS) {
    if (c.dependsOn) {
      assert.ok(seen.has(c.dependsOn), `${c.id} depends on "${c.dependsOn}", which is not declared before it`);
    }
    seen.add(c.id);
  }
});

test('CHECKS: the marketplace and selector checks cannot both be satisfied by one page', () => {
  // The guard against re-eroding: if a future edit ever makes these two checks pass on identical
  // HTML, they have stopped distinguishing the pages and the 07-31 blind spot is back.
  const selector = check('market-selector');
  const marketplace = check('mx-marketplace');
  const overlap = (selector.expect.bodyIncludes ?? []).filter((m) =>
    (marketplace.expect.bodyExcludes ?? []).includes(m),
  );
  assert.ok(overlap.length > 0, 'the selector must require a marker the marketplace forbids');
});
