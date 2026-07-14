import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildTelegramDeliveryMessage,
  loadTelegramChatId,
  sendTelegramMessage,
} from './pmo-delivery.mjs';

const METRICS = {
  window: { sinceISO: '2026-07-01T00:00:00Z', untilISO: '2026-07-08T00:00:00Z' },
  throughput: { shippedStories: 8, shippedEpics: 2 },
  prCycleTime: { medianHours: 9.5, p90Hours: 24 },
  deployFrequency: { total: 6 },
  changeFailProxy: { count: 1 },
  docOps: {
    learningsPromotions: 3,
    retroCoverage: { covered: 2, total: 2 },
  },
};

test('buildTelegramDeliveryMessage includes headline metrics and preserves the deck link', () => {
  const message = buildTelegramDeliveryMessage({
    metrics: METRICS,
    artifacts: [{ name: 'weekly', url: 'https://pmo-smalldocs.example/#md=abc&present=0' }],
  });
  assert.match(message, /PMO semanal - 2026-07-01 a 2026-07-08/);
  assert.match(message, /Historias shipped: 8 \| Epics shipped: 2/);
  assert.match(message, /Story-deck: https:\/\/pmo-smalldocs\.example\/#md=abc&present=0/);
  assert.ok(message.length <= 4096);
});

test('buildTelegramDeliveryMessage truncates headline text before chopping artifact links', () => {
  const message = buildTelegramDeliveryMessage({
    metrics: {
      ...METRICS,
      prCycleTime: { medianHours: 'x'.repeat(160), p90Hours: 24 },
    },
    artifacts: [{ name: 'weekly', url: 'https://pmo-smalldocs.example/#md=abc' }],
    maxChars: 230,
  });
  assert.ok(message.length <= 230);
  assert.match(message, /Story-deck: https:\/\/pmo-smalldocs\.example\/#md=abc$/);
  assert.match(message, /…/);
});

test('loadTelegramChatId prefers config json and falls back to env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pmo-delivery-'));
  const configPath = join(dir, 'config.json');
  writeFileSync(configPath, JSON.stringify({ chat_id: 'from-config' }));
  assert.equal(loadTelegramChatId({ configPath, env: { TELEGRAM_CHAT_ID: 'from-env' } }), 'from-config');
  assert.equal(loadTelegramChatId({ configPath: join(dir, 'missing.json'), env: { TELEGRAM_CHAT_ID: 'from-env' } }), 'from-env');
});

test('sendTelegramMessage posts the same sendMessage shape used by routines', async () => {
  const calls = [];
  await sendTelegramMessage({
    chatId: '123',
    token: 'token',
    text: 'hello',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });
  assert.equal(calls[0].url, 'https://api.telegram.org/bottoken/sendMessage');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    chat_id: '123',
    text: 'hello',
    disable_web_page_preview: true,
  });
});
