import esbuild from 'esbuild'
import { writeFileSync } from 'node:fs'

// The modern face (Dual Publish, as wiki-plugin-date): a plain ES module.
esbuild.build({
  entryPoints: ['src/client/lexon-modern.js'],
  bundle: true,
  format: 'esm',
  outfile: 'client/lexon.mjs',
  sourcemap: true,
  minify: true,
  loader: { '.css': 'text' },
}).then(() => console.log('built client/lexon.mjs (modern)'))

esbuild
  .build({
    entryPoints: ['src/client/lexon.js'],
    bundle: true,
    format: 'iife',
    outfile: 'client/lexon.js',
    sourcemap: true,
    minify: true,
    metafile: true,
    loader: { '.css': 'text' },
  })
  .then(result => {
    writeFileSync('meta-client.json', JSON.stringify(result.metafile))
    console.log('built client/lexon.js')
  })
