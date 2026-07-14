import { existsSync, readFileSync } from 'node:fs';
import { truncateForTelegram } from './telegram-format.mjs';

export const TELEGRAM_MAX_CHARS = 4096;

function fmt(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return `${value}${suffix}`;
}

function windowLabel(metrics) {
  return `${metrics.window.sinceISO.slice(0, 10)} a ${metrics.window.untilISO.slice(0, 10)}`;
}

function artifactLabel(name) {
  return {
    weekly: 'Story-deck',
    monthly: 'Packet mensual',
    sheet: 'Sheet de metricas',
  }[name] || name;
}

export function loadTelegramChatId({ configPath, env = process.env } = {}) {
  if (configPath && existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
      if (cfg.chat_id) return cfg.chat_id;
    } catch {
      /* fall through to the env var */
    }
  }
  return env.TELEGRAM_CHAT_ID || null;
}

export function buildTelegramDeliveryMessage({ metrics, artifacts, maxChars = TELEGRAM_MAX_CHARS }) {
  const retro = metrics.docOps.retroCoverage;
  const body = [
    `PMO semanal - ${windowLabel(metrics)}`,
    `Historias shipped: ${metrics.throughput.shippedStories} | Epics shipped: ${metrics.throughput.shippedEpics}`,
    `PR cycle mediano: ${fmt(metrics.prCycleTime.medianHours, 'h')} | p90: ${fmt(metrics.prCycleTime.p90Hours, 'h')}`,
    `Deploys: ${metrics.deployFrequency.total} merges to main | Reverts/hotfix: ${metrics.changeFailProxy.count}`,
    `Doc-ops: LEARNINGS ${metrics.docOps.learningsPromotions} | Retros ${retro.covered}/${retro.total}`,
  ].join('\n');

  const links = artifacts
    .filter((artifact) => artifact.url)
    .map((artifact) => `${artifactLabel(artifact.name)}: ${artifact.url}`);
  const footer = links.length ? `\n\n${links.join('\n')}` : '';
  if (!footer) return truncateForTelegram(body, maxChars);

  const bodyLimit = maxChars - footer.length;
  if (bodyLimit <= 20) return truncateForTelegram(`${body}${footer}`, maxChars);
  return `${truncateForTelegram(body, bodyLimit)}${footer}`;
}

export async function sendTelegramMessage({
  chatId,
  text,
  token = process.env.TELEGRAM_BOT_TOKEN,
  fetchImpl = fetch,
}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set — export it before running pmo-report.mjs.');
  if (!chatId) throw new Error('No Telegram chat id configured — set TELEGRAM_CHAT_ID or skills/pmo-report/config.json.');

  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10000),
  });

  let bodyText = '';
  try {
    bodyText = await res.text();
  } catch {
    /* response body unavailable */
  }
  if (!res.ok) {
    let detail = bodyText;
    try {
      detail = JSON.stringify(JSON.parse(bodyText));
    } catch {
      /* keep raw non-JSON body */
    }
    throw new Error(`Telegram sendMessage failed: ${res.status} ${detail.slice(0, 300)}`);
  }
}
