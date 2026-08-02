import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, collectNames } from '../src/client/analyze.js'
import { protect, release, asSlug } from '../src/client/linkify.js'
import { parseHeader, render } from '../src/client/render.js'

const ESCROW = `LEX Escrow.

"Payer" is a person.
"Payee" is a person.
"Arbiter" is a person.
"Fee" is an amount.

The Payer pays an amount into escrow, appoints the Payee, appoints the Arbiter, and fixes the Fee.

CLAUSE: Pay Out.
The Arbiter may pay from escrow the Fee to themselves, and afterwards pay the remainder of the escrow to the Payee.

CLAUSE: Pay Back.
The Arbiter may pay from escrow the Fee to themselves, and afterwards return the remainder of the escrow to the Payer.
`

test('analyze finds contract, clauses, parties, terms', () => {
  const a = analyze(ESCROW)
  assert.equal(a.contract, 'Escrow')
  assert.deepEqual(a.clauses, ['Pay Out', 'Pay Back'])
  assert.deepEqual(a.parties, ['Payer', 'Payee', 'Arbiter'])
  assert.deepEqual(a.terms, ['Fee'])
})

test('collectNames sorts longest-first and dedupes', () => {
  const names = collectNames({
    contract: 'Escrow',
    clauses: ['Pay Out'],
    parties: ['Proposed New Secretary', 'Secretary'],
    terms: ['Fee'],
  })
  assert.equal(names[0].name, 'Proposed New Secretary')
  assert.ok(names.findIndex(n => n.name === 'Secretary') > 0)
})

test('protect/release survive highlighting and keep numbers intact', () => {
  const names = collectNames(analyze(ESCROW))
  const linked = release(protect(ESCROW, names), names)
  assert.match(linked, /<a class="internal lx-name lx-clause" href="\/pay-out\.html" data-page-name="pay-out">Pay Out<\/a>/)
  assert.match(linked, /lx-party" href="\/payer\.html"/)
  assert.ok(!/[\ue100-\ue7ff]/.test(linked), 'no sentinels left behind')
})

test('lowercase homographs do not link', () => {
  const names = collectNames(analyze(ESCROW))
  const linked = release(protect('pay from escrow the Fee', names), names)
  assert.ok(!linked.includes('href="/escrow.html"'), 'lowercase escrow stays plain')
  assert.match(linked, /href="\/fee\.html"/)
})

test('parseHeader strips plugin commands but not Lexon headings', () => {
  const { header, source } = parseHeader('MODE play\nEMPHASIS clauses\n\nLEX Escrow.')
  assert.equal(header.mode, 'play')
  assert.equal(header.emphasis, 'clauses')
  assert.equal(source, 'LEX Escrow.')
  const bare = parseHeader(ESCROW)
  assert.deepEqual(bare.header, {})
  assert.equal(bare.source, ESCROW)
})

test('render produces highlighted, linked html with a lens', () => {
  const { lens, html } = render('EMPHASIS clauses\n\n' + ESCROW)
  assert.equal(lens, 'clauses')
  assert.match(html, /class="lx-title"/)
  assert.match(html, /data-page-name="pay-back"/)
  assert.match(html, /lx-keyword/)
})

test('asSlug matches wiki asSlug behaviour', () => {
  assert.equal(asSlug('Pay Out'), 'pay-out')
  assert.equal(asSlug("Payee's Fee"), 'payees-fee')
})
