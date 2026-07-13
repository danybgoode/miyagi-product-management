import { brotliCompressSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TEMPLATE_DIR = join(ROOT, 'scripts', 'pmo', 'templates');
export const DEFAULT_SMALLDOCS_URL = 'https://pmo-smalldocs-oehqqtyoia-uk.a.run.app';

const TEMPLATE_FILES = {
  weekly: 'weekly-story-deck.md',
  monthly: 'monthly-stakeholder-packet.md',
  sheet: 'metrics-sheet.md',
};

function getPath(obj, path) {
  return path.split('.').reduce((cur, part) => (cur == null ? undefined : cur[part]), obj);
}

function formatNumber(value, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return value;
}

export function buildTemplateData(metrics, { benchmarks = {}, generatedAt = new Date() } = {}) {
  const generatedDate = generatedAt.toISOString().slice(0, 10);
  return {
    window: {
      sinceISO: metrics.window.sinceISO,
      untilISO: metrics.window.untilISO,
      label: `${metrics.window.sinceISO.slice(0, 10)} a ${metrics.window.untilISO.slice(0, 10)}`,
      generatedDate,
    },
    throughput: {
      shippedStories: formatNumber(metrics.throughput.shippedStories),
      shippedEpics: formatNumber(metrics.throughput.shippedEpics),
      closedEpics: formatNumber(metrics.throughput.closedEpics),
    },
    cycle: {
      medianHours: formatNumber(metrics.prCycleTime.medianHours),
      averageHours: formatNumber(metrics.prCycleTime.averageHours),
      p90Hours: formatNumber(metrics.prCycleTime.p90Hours),
    },
    epics: {
      medianDays: formatNumber(metrics.epicLeadTime.medianDays),
      averageDays: formatNumber(metrics.epicLeadTime.averageDays),
    },
    deploys: {
      total: formatNumber(metrics.deployFrequency.total),
    },
    quality: {
      changeFailProxy: formatNumber(metrics.changeFailProxy.count),
    },
    docOps: {
      learningsPromotions: formatNumber(metrics.docOps.learningsPromotions),
      retroCovered: formatNumber(metrics.docOps.retroCoverage.covered),
      retroTotal: formatNumber(metrics.docOps.retroCoverage.total),
      retroPercent: formatNumber(metrics.docOps.retroCoverage.percent),
    },
    benchmarks: {
      storiesShipped: formatNumber(benchmarks.storiesShipped),
      epicsShipped: formatNumber(benchmarks.epicsShipped),
      deploys: formatNumber(benchmarks.deploys),
      prCycleMedianHours: formatNumber(benchmarks.prCycleMedianHours),
      epicLeadMedianDays: formatNumber(benchmarks.epicLeadMedianDays),
      changeFailProxy: formatNumber(benchmarks.changeFailProxy),
      learningsPromotions: formatNumber(benchmarks.learningsPromotions),
      retroCoveragePercent: formatNumber(benchmarks.retroCoveragePercent),
    },
  };
}

export function fillTemplate(template, metrics, options = {}) {
  const data = buildTemplateData(metrics, options);
  return template.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (match, key) => {
    const value = getPath(data, key);
    return value === undefined ? match : String(value);
  });
}

export function loadPmoTemplate(name) {
  const file = TEMPLATE_FILES[name];
  if (!file) throw new Error(`Unknown PMO template "${name}"`);
  return readFileSync(join(TEMPLATE_DIR, file), 'utf8');
}

export function fillPmoTemplate(name, metrics, options = {}) {
  return fillTemplate(loadPmoTemplate(name), metrics, options);
}

function toBase64Url(buffer) {
  return Buffer.from(buffer).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildSmallDocsUrl(markdown, { baseUrl = DEFAULT_SMALLDOCS_URL, present = false } = {}) {
  const compressed = brotliCompressSync(Buffer.from(markdown, 'utf8'), {
    params: { 1: 11 },
  });
  const params = new URLSearchParams({ md: toBase64Url(compressed) });
  if (present) params.set('present', '0');
  return `${baseUrl}/#${params.toString()}`;
}
