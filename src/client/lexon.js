// wiki-plugin-lexon — Lexon contract source with interactive highlighting.
// Link clicks are handled entirely by wiki-client's delegated .internal
// handler (lineup truncate, shift-click append, red-link ghost creation);
// this plugin binds no link handlers at all.
import { render } from './render.js'
import { LENSES, lensChips, bindLenses } from './lenses.js'
import theme from './theme.css'

const ensureStyle = () => {
  if (typeof document === 'undefined' || document.getElementById('lexon-style')) return
  const style = document.createElement('style')
  style.id = 'lexon-style'
  style.textContent = theme
  document.head.appendChild(style)
}

export const emit = (div, item) => {
  ensureStyle()
  const { lens, html } = render(item.text || '')
  div.html(
    `<div class="lexon-wrap" data-lens="${LENSES.includes(lens) ? lens : 'all'}">` +
      `<pre class="lx-source"><code>${html}</code></pre>` +
      lensChips(lens) +
      `</div>`,
  )
}

export const bind = (div, item) => {
  div.on('dblclick', e => {
    if (e.target.closest && e.target.closest('a.internal')) return
    wiki.textEditor(div, item)
  })
  bindLenses(div)
}

if (typeof window !== 'undefined') {
  window.plugins = window.plugins || {}
  window.plugins['lexon'] = { emit, bind }
}
