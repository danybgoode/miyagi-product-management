import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { objects } from './copy.mjs'

const ROOT = '/home/claude/campaign'
const FONTS = `${ROOT}/node_modules/@fontsource`
const OUT = `${ROOT}/out`
const TMP = `${ROOT}/tmp`
// headless_shell, not chrome: full chrome subtracts ~87px of browser UI from the viewport,
// which silently leaves the bottom of a 1350px canvas unpainted.
const CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'

for (const d of [OUT, TMP]) { if (!existsSync(d)) mkdirSync(d, { recursive: true }) }

const THEMES = {
  paper: { bg: '#f9f9f7', fg: '#1a1a18', accent: '#1d6f42', muted: '#6b6b67', rule: '#e2e2de', mono: 'dark' },
  ink:   { bg: '#1a1a18', fg: '#f9f9f7', accent: '#7eb094', muted: '#a4a49d', rule: '#44443f', mono: 'light' },
  selva: { bg: '#1d6f42', fg: '#f9f9f7', accent: '#afceba', muted: '#d6e6dc', rule: '#185a36', mono: 'light' },
  sand:  { bg: '#f3ede1', fg: '#1a1a18', accent: '#95590c', muted: '#4a4a44', rule: '#ddd2bb', mono: 'dark' },
}

const LEAD = { xl: 100, lg: 82, md: 66 }

// MS monogram, recoloured per theme so it never sits on a clashing ground.
const monogram = (t) => {
  const ring = t.mono === 'light' ? 'rgba(249,249,247,0.85)' : 'rgba(26,26,24,0.14)'
  const fill = t.mono === 'light' ? 'none' : 'url(#g)'
  const ink = t.mono === 'light' ? '#f9f9f7' : '#f9f9f7'
  return `<svg width="72" height="72" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <defs><radialGradient id="g" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#2a8a55"/><stop offset="1" stop-color="#0f3c25"/>
    </radialGradient></defs>
    <circle cx="48" cy="48" r="46" fill="${fill}" stroke="${ring}" stroke-width="${t.mono === 'light' ? 2 : 1}"/>
    <text x="48" y="63" text-anchor="middle" font-family="SG" font-weight="700" font-size="40"
          letter-spacing="-2" fill="${t.mono === 'light' ? t.fg : ink}">MS</text>
  </svg>`
}

function html(card) {
  const t = THEMES[card.theme] || THEMES.paper
  const lead = LEAD[card.size] || LEAD.lg
  const f = (w) => `file://${FONTS}/space-grotesk/files/space-grotesk-latin-${w}-normal.woff2`
  const m = (w) => `file://${FONTS}/geist-mono/files/geist-mono-latin-${w}-normal.woff2`
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:SG;src:url('${f(300)}') format('woff2');font-weight:300}
@font-face{font-family:SG;src:url('${f(400)}') format('woff2');font-weight:400}
@font-face{font-family:SG;src:url('${f(500)}') format('woff2');font-weight:500}
@font-face{font-family:SG;src:url('${f(700)}') format('woff2');font-weight:700}
@font-face{font-family:GM;src:url('${m(400)}') format('woff2');font-weight:400}
@font-face{font-family:GM;src:url('${m(500)}') format('woff2');font-weight:500}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{background:${t.bg};color:${t.fg};font-family:SG,sans-serif;-webkit-font-smoothing:antialiased}
.frame{width:1080px;height:1350px;padding:88px;display:flex;flex-direction:column;position:relative}
/* hairline inset — the "paper edge" of the system, not a border box */
.frame::after{content:'';position:absolute;inset:40px;border:1px solid ${t.rule};pointer-events:none;border-radius:6px}
.eyebrow{font-family:GM;font-weight:500;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:${t.accent};position:relative;z-index:1}
.rule{height:1px;background:${t.rule};margin:28px 0 0;position:relative;z-index:1}
/* sits a touch above optical centre — reads as composed rather than vertically stranded */
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;gap:36px;position:relative;z-index:1;padding:12px 0 96px}
.lead{font-size:${lead}px;font-weight:400;line-height:1.08;letter-spacing:-0.035em;text-wrap:balance}
.body{font-size:36px;font-weight:300;line-height:1.42;letter-spacing:-0.01em;color:${t.muted};max-width:820px}
.foot{display:flex;align-items:center;justify-content:space-between;gap:24px;position:relative;z-index:1}
.mark{display:flex;align-items:center;gap:20px}
.wm{font-size:26px;font-weight:500;letter-spacing:-0.02em;display:flex;align-items:center;gap:9px}
.dot{width:8px;height:8px;border-radius:50%;background:${t.accent};display:inline-block}
.url{font-family:GM;font-weight:400;font-size:24px;letter-spacing:-0.01em;color:${t.accent};text-align:right}
</style></head><body><div class="frame">
  <div class="eyebrow">${esc(card.eyebrow)}</div>
  <div class="rule"></div>
  <div class="mid">
    <div class="lead" id="lead">${esc(card.lead)}</div>
    ${card.body ? `<div class="body">${esc(card.body)}</div>` : ''}
  </div>
  <div class="foot">
    <div class="mark">${monogram(t)}<div class="wm">Miyagi<span class="dot"></span>Sánchez</div></div>
    <div class="url">${esc(card.foot || '')}</div>
  </div>
</div>
<script>
// Shrink the lead until the middle block fits its track. Keeps every card on one page
// without hand-tuning 30 font sizes.
(function(){
  var mid=document.querySelector('.mid'), lead=document.getElementById('lead');
  var size=${lead};
  while(mid.scrollHeight>mid.clientHeight && size>34){ size-=2; lead.style.fontSize=size+'px'; }
})();
</script></body></html>`
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const manifest = []
for (const o of objects) {
  if (!o.ig) continue
  o.ig.cards.forEach((card, i) => {
    const n = o.ig.cards.length > 1 ? `-${String(i + 1).padStart(2, '0')}` : ''
    const name = `${o.id}${n}.png`
    const f = `${TMP}/${o.id}${n}.html`
    writeFileSync(f, html(card))
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=1080,1350',
      '--virtual-time-budget=4000',
      `--screenshot=${OUT}/${name}`, `file://${f}`,
    ], { stdio: 'pipe' })
    manifest.push({ object: o.id, file: name, slide: i + 1, of: o.ig.cards.length })
  })
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2))
rmSync(TMP, { recursive: true, force: true })
console.log(`rendered ${manifest.length} cards`)
