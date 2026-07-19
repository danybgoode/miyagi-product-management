#!/usr/bin/env node
// cloudflare-origin-cert.mjs — Story 2.2 (09-platform-infra frontend-vercel-to-cloudrun, Sprint 2).
//
// Issues a Cloudflare Origin CA certificate for the ALB (Story 2.2 needs it to terminate TLS on
// the GCP external ALB, since the origin needs a cert Cloudflare trusts — a self-managed cert, NOT
// Google-managed). Generates a private key + CSR locally via openssl (the key never leaves this
// machine — only the CSR, a public artifact, is sent to Cloudflare), then calls Cloudflare's
// Origin CA API (confirmed live: the same CLOUDFLARE_API_TOKEN Bearer auth used elsewhere works
// here too — no separate legacy "Origin CA Key" needed with a modern scoped token).
//
// Scope for Sprint 2: apex + wildcard only (covers gcp.miyagisanchez.com and the full cutover).
// The SSL-for-SaaS fallback-origin hostname is NOT included — that hostname doesn't exist until
// Cloudflare for SaaS is enabled on the zone (Sprint 4, tenant-domain migration); re-issue/extend
// then.
//
// Sprint 3 Story 3.4 extends this to a SEPARATE domain — mschz.org (the short-link redirector) —
// which is its own zone, uncovered by the miyagisanchez.com cert above. GCP target-https-proxies
// accept a comma-separated --ssl-certificates list (SNI-selected), so this is a SECOND cert
// attached alongside the existing one, not a replacement. Request it with:
//   node infra/gcp/cloudflare-origin-cert.mjs --domain mschz.org --hostnames mschz.org,www.mschz.org --out-dir .cf-origin-cert-mschz
// (mschz.org is a redirector, not a wildcard subdomain space, so hostnames are apex+www, not a
// wildcard — pass --hostnames explicitly rather than relying on the default [domain, *.domain].)
//
// Usage:
//   node infra/gcp/cloudflare-origin-cert.mjs
//   node infra/gcp/cloudflare-origin-cert.mjs --out-dir /path/to/scratch  # default: ./.cf-origin-cert (gitignored)
//   node infra/gcp/cloudflare-origin-cert.mjs --domain <domain> [--hostnames h1,h2,...] --out-dir <dir>
//
// Outputs (gitignored — NEVER commit): <out-dir>/origin.key (private key), <out-dir>/origin.pem
// (Cloudflare-signed cert). Feed straight into provision-alb-frontend.sh:
//   CF_ORIGIN_CERT_FILE=<out-dir>/origin.pem CF_ORIGIN_KEY_FILE=<out-dir>/origin.key \
//     bash infra/gcp/provision-alb-frontend.sh
//
// Credentials: same resolution as cloudflare-zone-stage.mjs (env var, else Secret Manager).
// Zero npm deps — Node 18+ (global fetch) + the system `openssl` binary.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const GCP_PROJECT = process.env.PROJECT_ID || 'miyagisanchezback-497722' // env-overridable since gcp-account-migration S2 — the .sh family always was
const CF_API = 'https://api.cloudflare.com/client/v4'
const VALIDITY_DAYS = 5475 // 15 years — Cloudflare's max, avoids near-term rotation

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return def
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}
const DOMAIN = String(arg('domain', 'miyagisanchez.com'))
const HOSTNAMES = String(arg('hostnames', `${DOMAIN},*.${DOMAIN}`)).split(',').map((h) => h.trim()).filter(Boolean)
const OUT_DIR = String(arg('out-dir', join(process.cwd(), '.cf-origin-cert')))

function resolveSecret(envName, secretName) {
  if (process.env[envName]) return process.env[envName]
  try {
    return execFileSync('gcloud', [
      'secrets', 'versions', 'access', 'latest',
      `--secret=${secretName}`, `--project=${GCP_PROJECT}`,
    ], { encoding: 'utf8' }).trim()
  } catch {
    console.error(`✗ Could not resolve ${envName}: set the env var, or populate Secret Manager secret ${secretName} in ${GCP_PROJECT}.`)
    process.exit(1)
  }
}
const CF_TOKEN = resolveSecret('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN')

async function cfApi(path, opts = {}) {
  const r = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  // Read as text first — an outage/edge error (502/504) returns an HTML page, not JSON, and
  // parsing that directly throws a SyntaxError that masks the real HTTP status (cross-review nit).
  const body = await r.text()
  let j
  try { j = JSON.parse(body) } catch {
    throw new Error(`Cloudflare ${path} → ${r.status} (non-JSON response): ${body.slice(0, 300)}`)
  }
  if (!r.ok || j.success === false) {
    throw new Error(`Cloudflare ${path} → ${r.status} ${JSON.stringify(j.errors || j).slice(0, 400)}`)
  }
  return j
}

;(async () => {
  mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 })
  const keyPath = join(OUT_DIR, 'origin.key')
  const csrPath = join(OUT_DIR, 'origin.csr')
  const pemPath = join(OUT_DIR, 'origin.pem')

  if (existsSync(pemPath)) {
    console.log(`▶ ${pemPath} already exists — refusing to overwrite. Delete it first to reissue.`)
    console.log(`  CF_ORIGIN_CERT_FILE=${pemPath} CF_ORIGIN_KEY_FILE=${keyPath}`)
    return
  }

  console.log(`▶ Generating a 2048-bit RSA key + CSR for ${HOSTNAMES.join(', ')}`)
  const san = HOSTNAMES.map((h) => `DNS:${h}`).join(',')
  execFileSync('openssl', [
    'req', '-new', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath, '-out', csrPath,
    '-subj', `/CN=${DOMAIN}`,
    '-addext', `subjectAltName=${san}`,
  ], { stdio: 'inherit' })
  const csr = execFileSync('cat', [csrPath], { encoding: 'utf8' })

  console.log('▶ Requesting the Origin CA certificate from Cloudflare')
  const res = await cfApi('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      hostnames: HOSTNAMES,
      requested_validity: VALIDITY_DAYS,
      request_type: 'origin-rsa',
      csr,
    }),
  })

  writeFileSync(pemPath, res.result.certificate, { mode: 0o600 })
  console.log(`✓ Issued — expires ${res.result.expires_on}`)
  console.log(`  cert: ${pemPath}`)
  console.log(`  key:  ${keyPath}`)
  console.log('')
  console.log('Feed into the ALB provisioning script:')
  console.log(`  CF_ORIGIN_CERT_FILE=${pemPath} CF_ORIGIN_KEY_FILE=${keyPath} bash infra/gcp/provision-alb-frontend.sh`)
})().catch((e) => { console.error(e.message || e); process.exit(1) })
