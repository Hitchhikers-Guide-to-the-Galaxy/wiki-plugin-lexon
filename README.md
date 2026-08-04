# wiki-plugin-lexon

A [Federated Wiki](http://fed.wiki.org) item that renders
[Lexon](https://lexon.tech) contract source — interactive syntax highlighting
with clickable clause and term links, and switchable emphasis lenses. No
server component, no network calls; everything happens in the client bundle.

## Item syntax

Paste Lexon source straight into the item. Recognised names become
`[[wiki links]]` to clause and term pages. The directives `CONTRACT`,
`SOURCE`, `ROLE` and `MODE` are reserved for coming phases and documented as
unimplemented.

## Install

```bash
npm install wiki-plugin-lexon
```

Restart the wiki server so the factory and the bundled about page register.

## Develop

```bash
npm install
npm run build   # esbuild bundle into client/ (also run on publish)
npm test
```

`tools/gen-keywords.mjs` regenerates the keyword table from a local Lexon
compiler checkout (`LEXON_BIN` / `LEXON_GRAMMAR` override the default paths).

## Third-party licences

The client bundle includes [highlight.js](https://highlightjs.org/)
(© 2006 Ivan Sagalaev and contributors, BSD-3-Clause). Its copyright notice
is retained here as required:

> Redistribution and use in source and binary forms, with or without
> modification, are permitted provided that the conditions of the
> BSD-3-Clause licence are met. See
> https://github.com/highlightjs/highlight.js/blob/main/LICENSE

## License

MIT © David Bovill (plugin code); highlight.js remains BSD-3-Clause.
