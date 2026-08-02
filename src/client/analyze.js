// The analysis interface: analyze(source) -> {contract, clauses, terms, parties}.
// v0.1 backs it with a line-oriented scanner mirroring the compiler's own
// clause segmentation (the lexcoms map keys off CLAUSE:/TERMS PER headings).
// v0.2 swaps in an Ohm-based parser (lexon-ohm) behind this same signature.

export const analyze = source => {
  const clauses = []
  const terms = []
  const parties = []

  const lex = source.match(/^[ \t]*LEX(?!ON)\b[ \t:]*([^.\n]+?)[ \t]*\.[ \t]*$/m)
  const contract = lex ? lex[1].trim() : null

  for (const m of source.matchAll(/^[ \t]*CLAUSE[ \t]*:[ \t]*([^.\n]+?)[ \t]*\.?[ \t]*$/gm)) {
    clauses.push(m[1].trim())
  }

  // Definitions: "Name" is a person. / "Fee" is an amount. — person => party
  for (const m of source.matchAll(/^[ \t]*"([^"\n]+)"[ \t]+is[ \t]+(?:an?[ \t]+)?([a-z][a-z ]*?)[ \t]*[.,][ \t]*$/gim)) {
    ;(m[2].trim().toLowerCase() === 'person' ? parties : terms).push(m[1].trim())
  }

  return { contract, clauses, terms, parties }
}

// Flatten an analysis into the ordered name list linkify consumes:
// longest first so multiword names win over their own substrings.
export const collectNames = a => {
  const seen = new Set()
  const names = []
  const add = (name, kind) => {
    if (!name || seen.has(name)) return
    seen.add(name)
    names.push({ name, kind })
  }
  a.clauses.forEach(n => add(n, 'clause'))
  a.parties.forEach(n => add(n, 'party'))
  a.terms.forEach(n => add(n, 'term'))
  if (a.contract) add(a.contract, 'contract')
  return names.sort((x, y) => y.name.length - x.name.length)
}
