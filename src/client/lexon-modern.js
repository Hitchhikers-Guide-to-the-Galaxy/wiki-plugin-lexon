// The modern face (Lexon Plank Plan, Phase 3): the same highlighted source as
// the classic item, plus tabs that ask the site's Lexon door — Compile (the
// JavaScript class), Scenarios (the page's behaviour table, each row a live
// run) and Permissions (who may do what, projected from the text). A plain
// ES module: emit(el, item, context) / bind(el, item, context), no globals.
import { render } from './render.js'
import { LENSES, lensChips } from './lenses.js'
import { permissionRows } from './permissions.js'
import theme from './theme.css'

const FACE_CSS = `
.lexon-wrap .lx-tabs { display:flex; gap:.4em; margin:.4em 0; font-size:.85em }
.lexon-wrap .lx-tabs button { border:1px solid rgba(128,128,128,.5); background:transparent; color:inherit; border-radius:1em; padding:.1em .8em; cursor:pointer }
.lexon-wrap .lx-tabs button[aria-selected=true] { background:rgba(120,120,220,.25); border-color:#99c }
.lexon-wrap .lx-pane { display:none } .lexon-wrap .lx-pane[data-open] { display:block }
.lexon-wrap pre.lx-js { background:#f6f8fa; color:#222; border:1px solid #e5e5e0; padding:.6em; font-size:.8em; overflow:auto; max-height:28em }
.lexon-wrap table.lx-table { border-collapse:collapse; font-size:.85em; width:100% }
.lexon-wrap table.lx-table th, .lexon-wrap table.lx-table td { border-bottom:1px solid rgba(128,128,128,.3); padding:.25em .4em; text-align:left; vertical-align:top }
.lexon-wrap .lx-ok { color:#2f855a } .lexon-wrap .lx-bad { color:#c53030 }
.lexon-wrap .lx-note { color:inherit; opacity:.75; font-size:.8em; margin:.3em 0 }
.lexon-wrap .lx-run { font-size:.75em; padding:0 .5em; cursor:pointer }
`
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const schemeFor = (h) => (/^(localhost|127\.0\.0\.1)(:|$)/.test(h) || /\.(localhost|local)(:|$)/.test(h) || /:\d+$/.test(h)) ? 'http' : 'https'
const column = (el) => el.closest('.miller-col') || el.closest('[data-site]')
const siteOf = (el) => column(el)?.dataset.site || location.host
const slugOf = (el) => column(el)?.dataset.slug || location.pathname.replace(/^\/(?:view\/)?/, '').replace(/\.html$/, '').split('/')[0]
const door = (el, op, params) => {
  const site = siteOf(el)
  const q = new URLSearchParams({ slug: slugOf(el), ...params })
  return fetch(`${schemeFor(site)}://${site}/system/api/lexon/${op}.json?${q}`, { credentials: 'include' })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `${r.status}`); return j })
}

let styled = false
function ensureStyle() {
  if (styled || typeof document === 'undefined') return
  styled = true
  const style = document.createElement('style')
  style.id = 'lexon-style-modern'
  style.textContent = theme + FACE_CSS
  document.head.appendChild(style)
}

export function emit(el, item, context) {
  ensureStyle()
  const { lens, html, analysis } = render(item.text || '')
  const id = item.id || 'x'
  el.innerHTML = `<div class="lexon-wrap" data-lens="${LENSES.includes(lens) ? lens : 'all'}">
    <div class="lx-tabs" role=tablist>
      <button role=tab data-pane=source aria-selected=true>Source</button>
      <button role=tab data-pane=compile>Compile</button>
      <button role=tab data-pane=scenarios>Scenarios</button>
      <button role=tab data-pane=permissions>Permissions</button>
    </div>
    <div class="lx-pane" data-pane=source data-open><pre class="lx-source"><code>${html}</code></pre>${lensChips(lens)}</div>
    <div class="lx-pane" data-pane=compile><div class=lx-note>asking the door…</div></div>
    <div class="lx-pane" data-pane=scenarios><div class=lx-note>asking the door…</div></div>
    <div class="lx-pane" data-pane=permissions>${permissionsHTML(permissionRows(item.text || ''), analysis)}</div>
  </div>`
  const wrap = el.firstElementChild
  const loaded = {}
  wrap.querySelector('.lx-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pane]'); if (!b) return
    e.stopPropagation()
    for (const t of wrap.querySelectorAll('.lx-tabs button')) t.setAttribute('aria-selected', t === b)
    for (const p of wrap.querySelectorAll('.lx-pane')) { if (p.dataset.pane === b.dataset.pane) p.setAttribute('data-open', '') ; else p.removeAttribute('data-open') }
    if (b.dataset.pane === 'compile' && !loaded.compile) { loaded.compile = true; showCompile(el, wrap.querySelector('.lx-pane[data-pane=compile]'), id) }
    if (b.dataset.pane === 'scenarios' && !loaded.scenarios) { loaded.scenarios = true; showScenarios(el, wrap.querySelector('.lx-pane[data-pane=scenarios]'), id) }
  })
  wrap.querySelector('.lx-lenses')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-lens-choice]'); if (!chip) return
    e.stopPropagation(); wrap.dataset.lens = chip.dataset.lensChoice
    for (const c of wrap.querySelectorAll('.lx-lenses [data-lens-choice]')) c.classList.toggle('lx-active', c === chip)
  })
}

function permissionsHTML(rows, a) {
  if (!rows.length) return `<div class=lx-note>No permission sentences (The X may …) in this text.</div>`
  return `<div class=lx-note>${esc(a.contract || 'contract')}: who may do what, projected from the text — not executed.</div>
  <table class=lx-table><tr><th>Party</th><th>Modal</th><th>Action</th><th>When</th><th>Clause</th></tr>
  ${rows.map(r => `<tr><td>${esc(r.party)}</td><td>${esc(r.modal)}</td><td>${esc(r.action)}</td><td>${esc(r.when || '—')}</td><td>${esc(r.clause)}</td></tr>`).join('')}</table>`
}

async function showCompile(el, pane, id) {
  try {
    const j = await door(el, 'compile', { id })
    if (!j.ok) { pane.innerHTML = `<div class="lx-note lx-bad">${esc(j.error)}</div><div class=lx-note>${esc(j.compiler || '')}</div>`; return }
    pane.innerHTML = `<div class=lx-note>class <b>${esc(j.class)}</b>(${j.constructor.map(esc).join(', ')}) · clauses ${j.clauses.map(esc).join(', ')} · ${esc(j.compiler)}</div><pre class=lx-js><code>${esc(j.javascript.replace(/^\/\*\*[\s\S]*?\*\/\n*/, ''))}</code></pre>`
  } catch (e) { pane.innerHTML = `<div class="lx-note lx-bad">door: ${esc(e.message)}</div>` }
}

async function showScenarios(el, pane, id) {
  const draw = async (only) => {
    pane.innerHTML = `<div class=lx-note>running…</div>`
    try {
      const j = await door(el, 'run', only ? { id, only } : { id })
      if (j.error && !j.results?.length) { pane.innerHTML = `<div class="lx-note lx-bad">${esc(j.error)}</div>`; return }
      pane.innerHTML = `<div class=lx-note>${j.passed} of ${j.total} scenarios hold · ${esc(j.class || '')} · ${esc(j.compiler || '')} <button class=lx-run data-all>run all</button></div>
      <table class=lx-table><tr><th></th><th>Scenario</th><th>Spec</th><th>Result</th><th></th></tr>
      ${j.results.map(r => `<tr><td class="${r.ok ? 'lx-ok' : 'lx-bad'}">${r.ok ? '√' : '#'}</td><td>${esc(r.name)}</td><td>${esc(r.spec_ref || '')}</td><td>${r.ok ? `escrow ${esc(r.state?._escrow ?? '')}` : esc(r.failures.join('; '))}</td><td><button class=lx-run data-only="${esc(r.name)}">run</button></td></tr>`).join('')}</table>`
      pane.onclick = (e) => { const b = e.target.closest('button.lx-run'); if (!b) return; e.stopPropagation(); draw(b.dataset.only || null) }
    } catch (e) { pane.innerHTML = `<div class="lx-note lx-bad">door: ${esc(e.message)} — is there a behaviour table on this page?</div>` }
  }
  draw(null)
}

export function bind(el, item, context) {
  el.addEventListener('dblclick', (e) => {
    if (e.target.closest('a.internal, button, .lx-tabs')) return
    e.stopPropagation(); context?.textEditor?.(item)
  })
}
