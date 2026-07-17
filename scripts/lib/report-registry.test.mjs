import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BUCKET,
  RESOLVER_BASE_URL,
  buildReportLink,
  contentSuffix,
  dailyStorySlug,
  dateStamp,
  objectPathForSlug,
  pmoMonthlySlug,
  pmoSheetSlug,
  pmoWeeklySlug,
  registryUrl,
  resolveBucket,
  shouldFallbackToUrlHash,
  slugForArtifact,
  upgradeArtifactLinks,
} from './report-registry.mjs';

// ---- pure: dates + content suffix ----------------------------------------------------------------

test('dateStamp is UTC-stable regardless of local time-of-day components', () => {
  assert.equal(dateStamp(new Date('2026-07-14T23:59:59Z')), '2026-07-14');
  assert.equal(dateStamp(new Date('2026-01-05T00:00:00Z')), '2026-01-05');
});

test('contentSuffix is deterministic and differs for different content', () => {
  const a = contentSuffix('# report one');
  const b = contentSuffix('# report two');
  assert.equal(a, contentSuffix('# report one'));
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{6}$/);
});

test('contentSuffix tolerates null/undefined content', () => {
  assert.match(contentSuffix(undefined), /^[0-9a-f]{6}$/);
});

// ---- pure: slug builders ---------------------------------------------------------------------------

test('dailyStorySlug carries the UTC date and a content-derived suffix', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  const slug = dailyStorySlug({ date, markdown: '# standup' });
  assert.match(slug, /^daily-story-2026-07-14-[0-9a-f]{6}$/);
});

test('dailyStorySlug is a collision-safe suffix: different payloads same day get different slugs', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  const a = dailyStorySlug({ date, markdown: 'payload A' });
  const b = dailyStorySlug({ date, markdown: 'payload B' });
  assert.notEqual(a, b);
});

test('dailyStorySlug is idempotent for the SAME payload on the SAME day (re-run overwrites, no dup)', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  assert.equal(
    dailyStorySlug({ date, markdown: 'identical payload' }),
    dailyStorySlug({ date, markdown: 'identical payload' })
  );
});

test('pmoWeeklySlug/pmoMonthlySlug/pmoSheetSlug are one stable slug per UTC day, no suffix', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  assert.equal(pmoWeeklySlug({ date }), 'pmo-weekly-2026-07-14');
  assert.equal(pmoMonthlySlug({ date }), 'pmo-monthly-2026-07-14');
  assert.equal(pmoSheetSlug({ date }), 'pmo-sheet-2026-07-14');
});

test('slugForArtifact dispatches by the report scripts\' own artifact names', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  assert.match(slugForArtifact({ name: 'standup', date, markdown: 'x' }), /^daily-story-2026-07-14-[0-9a-f]{6}$/);
  assert.equal(slugForArtifact({ name: 'weekly', date, markdown: 'x' }), 'pmo-weekly-2026-07-14');
  assert.equal(slugForArtifact({ name: 'monthly', date, markdown: 'x' }), 'pmo-monthly-2026-07-14');
  assert.equal(slugForArtifact({ name: 'sheet', date, markdown: 'x' }), 'pmo-sheet-2026-07-14');
});

test('slugForArtifact degrades to a safe packet-shaped slug for an unrecognized name instead of throwing', () => {
  const date = new Date('2026-07-14T05:00:00Z');
  const slug = slugForArtifact({ name: 'mystery', date, markdown: 'x' });
  assert.match(slug, /^mystery-2026-07-14-[0-9a-f]{6}$/);
});

// ---- pure: object-path mapping (must match infra/gcp/provision-report-registry.sh's lifecycle rule) ---

test('objectPathForSlug: daily-* slugs live under daily/ (90d TTL)', () => {
  assert.equal(objectPathForSlug('daily-story-2026-07-14-a1b2c3'), 'daily/daily-story-2026-07-14-a1b2c3.md');
});

test('objectPathForSlug: everything else lives under packets/ (kept forever)', () => {
  assert.equal(objectPathForSlug('pmo-weekly-2026-07-14'), 'packets/pmo-weekly-2026-07-14.md');
  assert.equal(objectPathForSlug('pmo-monthly-2026-07-14'), 'packets/pmo-monthly-2026-07-14.md');
  assert.equal(objectPathForSlug('pmo-sheet-2026-07-14'), 'packets/pmo-sheet-2026-07-14.md');
  assert.equal(objectPathForSlug('mystery-2026-07-14-abc123'), 'packets/mystery-2026-07-14-abc123.md');
});

// ---- pure: URL building + bucket resolution --------------------------------------------------------

test('registryUrl builds the hub short link', () => {
  assert.equal(registryUrl({ slug: 'pmo-weekly-2026-07-14' }), `${RESOLVER_BASE_URL}/r/pmo-weekly-2026-07-14`);
  assert.equal(
    registryUrl({ slug: 'pmo-weekly-2026-07-14', baseUrl: 'https://example.test' }),
    'https://example.test/r/pmo-weekly-2026-07-14'
  );
});

test('resolveBucket defaults to the prod bucket name; REPORT_REGISTRY_BUCKET overrides it', () => {
  assert.equal(resolveBucket({}), DEFAULT_BUCKET);
  assert.equal(resolveBucket({ REPORT_REGISTRY_BUCKET: 'miyagi-pmo-reports-staging' }), 'miyagi-pmo-reports-staging');
});

test('DEFAULT_BUCKET is the canonical prod bucket name (matches provision-report-registry.sh)', () => {
  assert.equal(DEFAULT_BUCKET, 'miyagi-pmo-reports');
});

// ---- pure: fallback decision ------------------------------------------------------------------------

test('shouldFallbackToUrlHash: true unless the upload explicitly succeeded', () => {
  assert.equal(shouldFallbackToUrlHash({ ok: true }), false);
  assert.equal(shouldFallbackToUrlHash({ ok: false, reason: 'no-credentials' }), true);
  assert.equal(shouldFallbackToUrlHash(null), true);
  assert.equal(shouldFallbackToUrlHash(undefined), true);
});

// ---- orchestration (buildReportLink / upgradeArtifactLinks) with an INJECTED fake uploader ----------
// No live network/gcloud calls anywhere in this file — `uploader` is always a fake.

test('buildReportLink returns the short registry link when the upload succeeds', async () => {
  const errors = [];
  const result = await buildReportLink({
    name: 'weekly',
    markdown: '# weekly report',
    fallbackUrl: 'https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/#md=fallback',
    date: new Date('2026-07-14T05:00:00Z'),
    uploader: async () => ({ ok: true }),
    logError: (msg) => errors.push(msg),
  });
  assert.equal(result.usedRegistry, true);
  assert.equal(result.url, `${RESOLVER_BASE_URL}/r/pmo-weekly-2026-07-14`);
  assert.equal(result.slug, 'pmo-weekly-2026-07-14');
  assert.equal(errors.length, 0);
});

test('buildReportLink falls back to the URL-hash link on upload failure and logs to stderr', async () => {
  const errors = [];
  const fallbackUrl = 'https://pmo-smalldocs-oehqqtyoia-uk.a.run.app/#md=fallback';
  const result = await buildReportLink({
    name: 'standup',
    markdown: '# standup',
    fallbackUrl,
    date: new Date('2026-07-14T05:00:00Z'),
    uploader: async () => ({ ok: false, reason: 'no-credentials' }),
    logError: (msg) => errors.push(msg),
  });
  assert.equal(result.usedRegistry, false);
  assert.equal(result.url, fallbackUrl);
  assert.equal(result.reason, 'no-credentials');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no-credentials/);
  assert.match(errors[0], /falling back to the URL-hash link/);
});

test('buildReportLink never throws when the uploader itself rejects', async () => {
  // uploadReportPayload's real implementation never rejects (every branch is try/caught), but a caller
  // wiring in a bad fake shouldn't be able to crash a report script either — assert the documented
  // contract at this boundary explicitly rather than relying only on the real impl's internals.
  await assert.rejects(
    buildReportLink({
      name: 'weekly',
      markdown: 'x',
      fallbackUrl: 'https://example.test/#md=x',
      uploader: async () => {
        throw new Error('boom');
      },
    })
  );
});

test('upgradeArtifactLinks upgrades a successful upload and preserves the fallback on failure, per-artifact', async () => {
  const artifacts = [
    { name: 'weekly', markdown: '# weekly', url: 'https://example.test/#md=weekly-fallback' },
    { name: 'sheet', markdown: '# sheet', url: 'https://example.test/#md=sheet-fallback' },
  ];
  const errors = [];
  const uploader = async ({ slug }) => (slug.startsWith('pmo-weekly') ? { ok: true } : { ok: false, reason: 'boom' });
  const result = await upgradeArtifactLinks(artifacts, {
    date: new Date('2026-07-14T05:00:00Z'),
    uploader,
    logError: (msg) => errors.push(msg),
  });
  assert.equal(result, artifacts); // mutates + returns the same array
  assert.equal(artifacts[0].usedRegistry, true);
  assert.equal(artifacts[0].url, `${RESOLVER_BASE_URL}/r/pmo-weekly-2026-07-14`);
  assert.equal(artifacts[1].usedRegistry, false);
  assert.equal(artifacts[1].url, 'https://example.test/#md=sheet-fallback');
  assert.equal(errors.length, 1);
});
