// Turn every occurrence of the contract's own names into canonical fedwiki
// internal links that survive highlight.js markup. Names are swapped for
// private-use sentinels BEFORE highlighting (so hljs can never split a
// multiword name like "Proposed New Secretary" across keyword spans), then
// swapped back as <a class="internal"> anchors afterwards. The declarative
// anchor shape matches wiki-client resolve.js, so lineup navigation,
// shift-click append and ghost-page creation all come from the wiki's own
// delegated click handler — this plugin binds no link handlers at all.

// One PUA char per name index — hljs can never split or wrap it.
const SENTINEL = i => String.fromCharCode(0xe100 + i)
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const escapeHtml = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const asSlug = name =>
  name
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toLowerCase()

// Case-sensitive: Lexon names are capitalized in prose; lowercase keyword
// homographs ("fee", "escrow") must not link.
export const protect = (source, names) => {
  let text = source
  names.forEach((n, i) => {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(n.name)}(?![A-Za-z0-9])`, 'g')
    text = text.replace(re, `$1${SENTINEL(i)}`)
  })
  return text
}

export const release = (html, names) =>
  html.replace(/[\ue100-\ue7ff]/g, m => {
    const n = names[m.charCodeAt(0) - 0xe100]
    if (!n) return m
    const slug = asSlug(n.name)
    const label = escapeHtml(n.name)
    return `<a class="internal lx-name lx-${n.kind}" href="/${slug}.html" data-page-name="${slug}">${label}</a>`
  })
