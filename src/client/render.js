// The pure render pipeline (no DOM, no CSS import — testable under node:test):
// parse optional DSL header -> analyze names -> protect with sentinels ->
// highlight.js -> release names as a.internal links.
import hljs from 'highlight.js/lib/core'
import lexonLanguage from './language.js'
import { analyze, collectNames } from './analyze.js'
import { protect, release } from './linkify.js'
import { normalizeLens } from './lenses.js'

hljs.registerLanguage('lexon', lexonLanguage)
hljs.configure({ classPrefix: 'lx-' })

const HEADER = /^(CONTRACT|SOURCE|ROLE|MODE|EMPHASIS)\b[ \t]*(.*)$/

// House DSL header: leading UPPERCASE-command lines are parsed off; the rest
// of the item text is raw Lexon source. Lexon's own headings (LEX, CLAUSE:)
// are not plugin commands, so a bare pasted .lex file passes straight through.
export const parseHeader = raw => {
  const lines = raw.split('\n')
  const header = {}
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(HEADER)
    if (m) {
      header[m[1].toLowerCase()] = m[2].replace(/:$/, '').trim()
      i++
    } else if (lines[i].trim() === '' && Object.keys(header).length && i < 6) {
      i++
      break
    } else {
      break
    }
  }
  return { header, source: lines.slice(i).join('\n') }
}

export const render = raw => {
  const { header, source } = parseHeader(raw)
  const a = analyze(source)
  const names = collectNames(a)
  let html
  try {
    html = hljs.highlight(protect(source, names), { language: 'lexon' }).value
  } catch (err) {
    console.log('lexon highlight failed', err)
    html = protect(source, names)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
  const lens = normalizeLens(header.emphasis)
  return { header, lens, html: release(html, names), analysis: a }
}
