import esbuild from 'esbuild'
import { writeFileSync } from 'node:fs'

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
