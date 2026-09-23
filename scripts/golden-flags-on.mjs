#!/usr/bin/env node
// golden-flags-on.mjs — print the flags Golden Frijoles is SERVING true in production, one key per line.
//
// Why: the standup's `flag-state-claim` guard needs "which flags are live" (reporting.config.json →
// liveFlags). It used to read `platform_flags`, which flag-provider-mandate parked: that table decides
// nothing any more, so reading it would hand the writer a confident answer from a store that is not
// the authority — the exact "two windows" confusion that epic existed to end.
//
// Source: `gf flags ls --json` for project `miyagisanchez`. Uses `serving` (what a context with no
// attributes actually GETS), never `state` — Golden's own CLI warns that "activated" and "serves true"
// are different facts, and conflating them once labelled 34 of 42 flags the wrong way round.
//
// Rule 5: if gf is not signed in, not installed, or the answer is malformed, this EXITS NON-ZERO with a
// reason on stderr, so `gatherLiveFlags` reports "unavailable" — never an empty "nothing is on".
//
// Usage: node scripts/golden-flags-on.mjs [--env production] [--project miyagisanchez]
// Env:   GF_BIN — the gf command (default: `npx --yes @golden-frijoles/cli`).
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const DEFAULT_PROJECT = 'miyagisanchez'

/**
 * Pure: the keys whose `environment` cell serves boolean `true`. Throws on a body that is not the
 * `gf flags ls` shape — a malformed answer must fail loudly, not read as "nothing is on".
 */
export function flagsServingTrue(body, environment = 'production') {
  if (!body || typeof body !== 'object' || !Array.isArray(body.flags)) {
    throw new Error('gf flags ls returned no flags array')
  }
  const on = []
  for (const flag of body.flags) {
    if (!flag || typeof flag.key !== 'string' || !Array.isArray(flag.environments)) {
      throw new Error('gf flags ls returned a malformed flag entry')
    }
    const cell = flag.environments.find((row) => row && row.environment === environment)
    if (cell && cell.serving === true) on.push(flag.key)
  }
  // An environment no flag reports (a typo'd --env, or a shape change) is UNKNOWN, not "nothing on".
  const known = body.flags.some((flag) => flag.environments.some((row) => row && row.environment === environment))
  if (body.flags.length > 0 && !known) throw new Error(`no flag reports environment "${environment}"`)
  return on.sort()
}

export function parseArgs(argv) {
  const out = { environment: 'production', project: DEFAULT_PROJECT }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag !== '--env' && flag !== '--project') throw new Error(`unknown argument: ${flag}`)
    const value = argv[++i]
    if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value`)
    if (flag === '--env') out.environment = value
    else out.project = value
  }
  return out
}

export function gfCommand(env = process.env) {
  const configured = (env.GF_BIN || '').trim()
  return configured ? configured.split(/\s+/) : ['npx', '--yes', '@golden-frijoles/cli']
}

/** Thin I/O shell. Returns { code, stdout, stderr } so the whole run is testable with a fake `run`. */
export function main(argv = process.argv.slice(2), deps = {}) {
  let parsed
  try {
    parsed = parseArgs(argv)
  } catch (error) {
    return { code: 1, stdout: '', stderr: `golden-flags-on: ${error.message}\n` }
  }
  const { environment, project } = parsed
  const [bin, ...prefix] = gfCommand(deps.env)
  const run = deps.run ?? ((command, args) => spawnSync(command, args, { encoding: 'utf8', timeout: 60_000 }))
  const result = run(bin, [...prefix, '--project', project, '--json', 'flags', 'ls'])
  if (!result || result.error || result.status !== 0) {
    const why = result?.error?.message || (result?.stderr || '').trim() || `exit ${result?.status}`
    return { code: 1, stdout: '', stderr: `golden-flags-on: gf unavailable — ${why}\n` }
  }
  try {
    const keys = flagsServingTrue(JSON.parse(result.stdout), environment)
    return { code: 0, stdout: keys.map((key) => `${key}\n`).join(''), stderr: '' }
  } catch (error) {
    return { code: 1, stdout: '', stderr: `golden-flags-on: ${error.message}\n` }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { code, stdout, stderr } = main()
  process.stdout.write(stdout)
  process.stderr.write(stderr)
  process.exit(code)
}
