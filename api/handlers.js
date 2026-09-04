/**
 * lexon — the handlers named by the api declaration in package.json (the
 * Sweet door of the Lexon Plank Plan, Phase 3).
 *
 * Plain functions taking and returning plain values, called by the farm —
 * the node Farm Plugin or the Sweet Server's embedded sidecar alike. Where
 * a contract lives is context: `status` is the site's status directory,
 * declared in the specification and supplied by the farm, so the page
 * directory is its sibling. Nothing here sees a request.
 *
 *   compile  the lexon item of a page → the JavaScript class
 *   run      that class through the page's behaviour table (a code item
 *            holding JSON with "scenarios"), or a table on another page
 *   names    the contract's parties, terms, clauses and permission rows
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { compileSource } from '../src/server/compile.js'
import { runTable } from '../src/server/scenarios.js'
import { analyze } from '../src/client/analyze.js'
import { parseHeader } from '../src/client/render.js'
import { permissionRows } from '../src/client/permissions.js'

function fail(status, message) { const e = new Error(message); e.status = status; throw e }

async function page(status, slug) {
  if (!status) fail(500, 'lexon needs the site it is asked at — status is declared context')
  if (!/^[a-z0-9-]+$/.test(slug || '')) fail(400, 'slug must be a page slug (lowercase letters, digits, dashes)')
  try { return JSON.parse(await readFile(join(dirname(status), 'pages', slug), 'utf8')) } catch { fail(404, `no page ${slug} on this site`) }
}

function lexonItem(p, id) {
  const items = (p.story || []).filter(i => i && i.type === 'lexon')
  const it = id ? items.find(i => i.id === id) : items[0]
  if (!it) fail(404, id ? `no lexon item ${id} on ${p.title}` : `no lexon item on ${p.title}`)
  return it
}

function tableOf(p) {
  for (const i of p.story || []) {
    if (!i || !['code', 'json', 'markdown', 'paragraph'].includes(i.type)) continue
    try { const t = JSON.parse(i.text); if (t && Array.isArray(t.scenarios)) return t } catch {}
  }
  return null
}

export async function compile({ slug, id, status } = {}) {
  const p = await page(status, slug)
  const { source } = parseHeader(lexonItem(p, id).text || '')
  const r = await compileSource(source)
  return { page: p.title, slug, ...r }
}

export async function run({ slug, id, table, only, status } = {}) {
  const p = await page(status, slug)
  const { source } = parseHeader(lexonItem(p, id).text || '')
  const t = tableOf(table ? await page(status, table) : p)
  if (!t) fail(404, `no behaviour table (a code item holding JSON with "scenarios") on ${table || slug}`)
  const c = await compileSource(source)
  if (!c.ok) return { page: p.title, slug, ok: false, error: c.error, compiler: c.compiler, results: [] }
  const r = await runTable(c.javascript, t, only || null)
  return { page: p.title, slug, compiler: c.compiler, class: c.class, ...r }
}

export async function names({ slug, id, status } = {}) {
  const p = await page(status, slug)
  const { source } = parseHeader(lexonItem(p, id).text || '')
  const a = analyze(source)
  return { page: p.title, slug, contract: a.contract, parties: a.parties, terms: a.terms, clauses: a.clauses, permissions: permissionRows(source) }
}
