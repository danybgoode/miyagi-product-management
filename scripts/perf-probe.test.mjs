import assert from 'node:assert/strict'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import { DEFAULT_IMAGE_URL, decodeBodyForInspection, extractClientScriptUrls, fixtureUrls, formatReport, measureFixture, parseArgs, probeExitCode, runProbe } from './perf-probe.mjs'

test('fixtureUrls locks the marketplace symptoms and an explicitly configurable real image fixture', () => {
  const fixtures = fixtureUrls({ baseUrl: 'https://preview.example', imageUrl: 'https://preview.example/api/img?url=x&w=640&q=75' })
  assert.deepEqual(fixtures.map((fixture) => fixture.id), ['home', 'pdp', 'shop', 'image'])
  assert.equal(fixtures[1].url, 'https://preview.example/mx/l/prod_01M0JCJC0FKNEFYK81HSVD72GW')
  assert.equal(fixtures[3].url, 'https://preview.example/api/img?url=x&w=640&q=75')
  assert.doesNotMatch(DEFAULT_IMAGE_URL, /[?&]f=/, 'the default must be safe to run against pre-deploy production')
})

test('parseArgs accepts a deployed revision and rejects incomplete flags', () => {
  assert.deepEqual(parseArgs(['--revision', 'abc123', '--json']).revision, 'abc123')
  assert.throws(() => parseArgs(['--image-url']), /requires a value/)
})

test('extractClientScriptUrls resolves and de-duplicates only Next client chunks', () => {
  const html = '<script src="/_next/static/a.js"></script><script src="/_next/static/a.js"></script><script src="/other.js"></script>'
  assert.deepEqual(extractClientScriptUrls(html, 'https://miyagisanchez.com/mx'), ['https://miyagisanchez.com/_next/static/a.js'])
})

test('decodeBodyForInspection parses compressed HTML without changing wire-byte measurement', () => {
  const html = '<script src="/_next/static/a.js"></script>'
  const compressed = gzipSync(Buffer.from(html))
  assert.ok(compressed.byteLength < Buffer.byteLength(html) + 30)
  assert.equal(decodeBodyForInspection(compressed, 'gzip'), html)
})

test('measureFixture reports raw transfer metrics and sums unique route client chunks', async () => {
  const requests = []
  const response = (url, bytes, body, headers = {}) => ({ url, statusCode: 200, bytes, body: Buffer.from(body), ttfbMs: 12.34, headers })
  const result = await measureFixture({ id: 'home', label: 'home', url: 'https://example.test/mx' }, {
    request: async (url) => {
      requests.push(url)
      if (url.endsWith('/mx')) return response(url, 100, '<script src="/_next/static/a.js"></script><script src="/_next/static/b.js"></script>', { 'cf-cache-status': 'HIT', 'content-type': 'text/html' })
      return response(url, url.endsWith('a.js') ? 10 : 20, '')
    },
  })
  assert.equal(result.ttfb_ms.value, 12.3)
  assert.equal(result.cf_cache_status.value, 'HIT')
  assert.equal(result.total_transfer_bytes.value, 100)
  assert.equal(result.client_js_transfer_bytes.value, 30)
  assert.equal(requests.length, 3)
})

test('measureFixture records an unreachable target as unavailable instead of a confident empty row', async () => {
  const result = await measureFixture({ id: 'shop', label: 'shop', url: 'https://example.test/mx/s/shop' }, { request: async () => { throw new Error('DNS lookup failed') } })
  assert.equal(result.status, 'unavailable')
  assert.equal(result.total_transfer_bytes.state, 'unavailable')
  assert.match(formatReport({ measured_at: '2026-08-22T00:00:00.000Z', deployed_revision: { state: 'present', value: 'abc' }, fixtures: [result], unavailable: 1 }), /not a green run/)
})

test('a reachable non-2xx locked fixture is absent and makes the baseline exit nonzero', async () => {
  const report = await runProbe({ baseUrl: 'https://example.test', imageUrl: 'https://example.test/api/img?url=x&w=160&q=75', revision: 'abc' }, {
    request: async (url) => ({ url, statusCode: 404, bytes: 0, body: Buffer.alloc(0), ttfbMs: 5, headers: {} }),
    now: () => new Date('2026-08-22T00:00:00.000Z'),
  })
  assert.equal(report.unavailable, 0)
  assert.equal(report.absent, 4)
  assert.equal(probeExitCode(report), 1)
  assert.match(formatReport(report), /non-2xx response/)
})

test('a 3xx first hop is absent, never a false low-byte successful fixture', async () => {
  const result = await measureFixture({ id: 'pdp', label: 'PDP', url: 'https://example.test/mx/l/id' }, {
    request: async (url) => ({ url, statusCode: 302, bytes: 12, body: Buffer.alloc(0), ttfbMs: 3, headers: { location: '/mx/l/id/' } }),
  })
  assert.equal(result.status, 'absent')
  assert.equal(result.total_transfer_bytes.value, 12)
  assert.equal(probeExitCode({ unavailable: 0, absent: 1 }), 1)
})

test('a missing client chunk is absent and cannot produce a green partial JS total', async () => {
  const response = (url, statusCode, bytes, body, headers = {}) => ({ url, statusCode, bytes, body: Buffer.from(body), ttfbMs: 2, headers })
  const result = await measureFixture({ id: 'home', label: 'home', url: 'https://example.test/mx' }, {
    request: async (url) => url.endsWith('/mx')
      ? response(url, 200, 100, '<script src="/_next/static/missing.js"></script>', { 'content-type': 'text/html' })
      : response(url, 404, 9, 'not found'),
  })
  assert.equal(result.status, 'absent')
  assert.equal(result.client_js_transfer_bytes.state, 'absent')
})

test('a fixed-format image returning the wrong type is absent', async () => {
  const result = await measureFixture({ id: 'image', label: 'image', url: 'https://example.test/api/img?url=x&w=640&q=75&f=webp&v=2', image: true }, {
    request: async (url) => ({ url, statusCode: 200, bytes: 10, body: Buffer.alloc(10), ttfbMs: 2, headers: { 'content-type': 'image/avif' } }),
  })
  assert.equal(result.status, 'absent')
  assert.equal(result.content_type.state, 'absent')
})

test('a probe without an identified deployed revision exits nonzero', () => {
  assert.equal(probeExitCode({ unavailable: 0, absent: 0, deployed_revision: { state: 'unavailable' } }), 1)
})

test('--dry-run is fully read-only: it returns fixtures without invoking the injected network reader', async () => {
  let calls = 0
  const report = await runProbe({ dryRun: true }, { request: async () => { calls += 1 }, now: () => new Date('2026-08-22T00:00:00.000Z') })
  assert.equal(report.dry_run, true)
  assert.equal(calls, 0)
})
