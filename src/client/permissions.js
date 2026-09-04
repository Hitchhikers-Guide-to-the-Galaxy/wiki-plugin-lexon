// The permission table: a static projection of the deontic sentences of a
// Lexon text — who may do what, and when. Pure text, no DOM, shared by the
// names handler and the modern face. One row per "The X may[, if …,] …"
// sentence; the clause it sits under is its heading.
const CLAUSE = /^CLAUSE:\s*(.+?)\.?\s*$/i
const MAY = /^(?:The|A|An)\s+(.+?)\s+(may|must)\b\s*,?\s*(?:(?:if|given that|provided)\s+(.+?),\s*)?(.+?)\.?\s*$/i

export function permissionRows(source) {
  const rows = []
  let clause = ''
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    const c = line.match(CLAUSE)
    if (c) { clause = c[1]; continue }
    const m = line.match(MAY)
    if (!m) continue
    rows.push({ clause, party: m[1], modal: m[2].toLowerCase(), when: m[3] ? m[3].trim() : '', action: m[4].trim() })
  }
  return rows
}
