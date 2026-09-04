import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compileSource, describe } from '../src/server/compile.js'
import { runTable } from '../src/server/scenarios.js'
import { permissionRows } from '../src/client/permissions.js'
import { compile, run, names } from '../api/handlers.js'

const H = '/Users/david/Code/conformance/targets/lexon'
const ESCROW = readFileSync(`${H}/fixtures/contracts/escrow.lex`, 'utf8')
const TABLE = JSON.parse(readFileSync(`${H}/fixtures/behaviour/escrow.json`, 'utf8'))

test('compileSource: the escrow text becomes class Escrow with two clauses', async () => {
  const r = await compileSource(ESCROW)
  assert.equal(r.ok, true, r.error)
  assert.equal(r.class, 'Escrow')
  assert.deepEqual(r.constructor, ['payer', 'amount', 'payee', 'arbiter', 'fee'])
  assert.deepEqual(r.clauses, ['pay_out', 'pay_back'])
})

test('compileSource: a broken text answers with the compiler error line', async () => {
  const r = await compileSource('LEX Broken.\n\n"Payer" is a person.\n\nThe Payer flibbles the moon.\n')
  assert.equal(r.ok, false)
  assert.match(r.error, /^Lexon: syntax error/)
})

test('describe finds covenant clause methods', () => {
  const d = describe('module.exports = class C {\n    constructor(a, b) {\n        class Funder {\n            fund(caller, pledge)  {\n            }\n        }\n    }\n    add_funder(caller, funder) {\n    }\n    collect(caller)  {\n    }\n    transfer(from, to, amount) {\n    }\n}\n')
  assert.deepEqual(d, { class: 'C', constructor: ['a', 'b'], clauses: ['fund', 'add_funder', 'collect'] })
})

test('runTable: every escrow scenario holds under the reference compiler', async () => {
  const c = await compileSource(ESCROW)
  const r = await runTable(c.javascript, TABLE)
  assert.equal(r.ok, true, JSON.stringify(r.results.filter(x => !x.ok)))
  assert.equal(r.total, TABLE.scenarios.length)
})

test('permissionRows projects who may do what', () => {
  const rows = permissionRows(ESCROW)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].party, 'Arbiter')
  assert.equal(rows[0].modal, 'may')
  assert.equal(rows[0].clause, 'Pay Out')
  assert.match(rows[0].action, /^pay from escrow the Fee/)
})

test('handlers: compile, run and names read the page beside the status dir', async () => {
  const site = mkdtempSync(join(tmpdir(), 'lexon-site-'))
  mkdirSync(join(site, 'pages')); mkdirSync(join(site, 'status'))
  writeFileSync(join(site, 'pages', 'escrow'), JSON.stringify({ title: 'Escrow', story: [
    { type: 'lexon', id: 'a1', text: 'EMPHASIS clauses\n\n' + ESCROW },
    { type: 'code', id: 'a2', text: JSON.stringify(TABLE) }] }))
  const status = join(site, 'status')
  const c = await compile({ slug: 'escrow', status })
  assert.equal(c.class, 'Escrow')
  const r = await run({ slug: 'escrow', status })
  assert.equal(r.ok, true)
  assert.equal(r.passed, TABLE.scenarios.length)
  const one = await run({ slug: 'escrow', status, only: TABLE.scenarios[3].name })
  assert.equal(one.total, 1)
  const n = await names({ slug: 'escrow', status })
  assert.deepEqual(n.clauses, ['Pay Out', 'Pay Back'])
  assert.equal(n.permissions.length, 2)
  await assert.rejects(() => compile({ slug: 'nope', status }), /no page nope/)
  await assert.rejects(() => compile({ slug: 'escrow' }), /status is declared context/)
})
