import keywords from './keywords.js'

// highlight.js grammar for Lexon. Structure is hand-written (five modes);
// the keyword set is generated from the compiler grammar (see tools/gen-keywords.mjs).
// Deliberately no capitalized-Name mode: a `contains` mode would outrank keyword
// matching and swallow keywords like "Pay" — defined names are handled by the
// linkify pass, which knows the contract's real name list.
export default () => ({
  name: 'lexon',
  case_insensitive: true,
  keywords: {
    $pattern: /[A-Za-z][A-Za-z']*/,
    keyword: keywords.map(k => k.toLowerCase()),
  },
  contains: [
    { scope: 'comment', begin: /^[ \t]*COMMENTS?[ \t]*:/, end: /\.[ \t]*$|$/ },
    { scope: 'title', begin: /^[ \t]*CLAUSE[ \t]*:[^\n]*/ },
    { scope: 'section', begin: /^[ \t]*(?:LEXON|LEX|AUTHORS?|PREAMBLE|TERMS)\b[^\n]*/ },
    { scope: 'string', begin: /"/, end: /"/ },
    { scope: 'symbol', begin: /«/, end: /»/ },
    { scope: 'number', begin: /\b\d+(?:\.\d+)?\b/ },
  ],
})
