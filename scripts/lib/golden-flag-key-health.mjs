// golden-flag-key-health.mjs — is production's Golden flag read key about to die?
//
// Why this exists (flag-provider-mandate, 2026-09-22): Golden mints every flag credential with a
// FIXED 30-day expiry (`FLAG_KEY_EXPIRY_DAYS` — deliberately not a parameter). Production's read key
// expired around 2026-08-27 and nothing noticed for ~4 weeks: the SDK got 401s, both services quietly
// served the durable mirror, and Golden's console kept looking healthy. A change made in the console
// in that window would never have reached production. The expiry is a date we KNOW in advance, so the
// cheapest guard is to say it out loud at every session start.
//
// Three states, never two: `unavailable` (gf not signed in / not installed — a GAP, not "fine"),
// an anomaly (expired, expiring within WARN_DAYS, or no production read key at all), or healthy.
// Note `gf keys ls` shows an expired key as "active" — it only reports revocation — so the expiry is
// compared here, never read from the STATE column.
import { spawnSync } from 'node:child_process'

export const WARN_DAYS = 7
export const GOLDEN_FLAG_PROJECT = 'miyagisanchez'

/** Pure: the anomaly (or null) for a `gf keys ls --json` body, as of `nowISO`. */
export function decideFlagReadKeyAnomaly(body, { nowISO, environment = 'production', warnDays = WARN_DAYS } = {}) {
  const now = Date.parse(nowISO)
  const keys = Array.isArray(body?.keys) ? body.keys : []
  const live = keys.filter(
    (key) => key && key.type === 'flag_read' && key.scope === environment && !key.revokedAt,
  )
  const notExpired = live.filter((key) => key.expiresAt == null || Date.parse(key.expiresAt) > now)
  if (notExpired.length === 0) {
    const lastExpiry = live
      .map((key) => key.expiresAt)
      .filter(Boolean)
      .sort()
      .pop()
    return {
      type: 'golden-flag-key',
      detail:
        `Golden project ${GOLDEN_FLAG_PROJECT} has NO unexpired ${environment} flag_read key` +
        (lastExpiry ? ` (the newest expired ${lastExpiry.slice(0, 10)})` : '') +
        ' — production is serving the durable mirror, not Golden. Mint one (`gf keys create --type flag_read ' +
        `--env ${environment}\`), store it as GOLDEN_BEANS_FLAG_READ_KEY, roll miyagi-web + medusa-web.`,
    }
  }
  // The key production uses is the newest one; judge by the LATEST expiry among the usable keys.
  const expiries = notExpired.map((key) => (key.expiresAt == null ? Infinity : Date.parse(key.expiresAt)))
  const latest = Math.max(...expiries)
  if (latest === Infinity) return null
  const daysLeft = Math.floor((latest - now) / 86_400_000)
  if (daysLeft >= warnDays) return null
  return {
    type: 'golden-flag-key',
    detail:
      `Golden ${environment} flag_read key for ${GOLDEN_FLAG_PROJECT} expires ${new Date(latest).toISOString().slice(0, 10)} ` +
      `(${daysLeft} day(s)) — rotate before then or production silently falls back to the durable mirror. ` +
      '`gf keys create --type flag_read --env production`, new GOLDEN_BEANS_FLAG_READ_KEY version, roll both services.',
  }
}

/** Thin I/O: `{ available, body }` or `{ available: false, reason }`. Never throws. */
export function gatherFlagKeyHealth(deps = {}) {
  const env = deps.env ?? process.env
  const configured = (env.GF_BIN || '').trim()
  const [bin, ...prefix] = configured ? configured.split(/\s+/) : ['npx', '--yes', '@golden-frijoles/cli']
  const run = deps.run ?? ((command, args) => spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 }))
  try {
    const result = run(bin, [...prefix, '--project', GOLDEN_FLAG_PROJECT, '--json', 'keys', 'ls'])
    if (!result || result.error || result.status !== 0) {
      const why = result?.error?.message || (result?.stderr || '').trim().split('\n')[0] || `exit ${result?.status}`
      return { available: false, reason: `gf unavailable — ${why}` }
    }
    const body = JSON.parse(result.stdout)
    if (!Array.isArray(body?.keys)) return { available: false, reason: 'gf keys ls returned no keys array' }
    return { available: true, body }
  } catch (error) {
    return { available: false, reason: `gf keys ls failed — ${error.message}` }
  }
}
