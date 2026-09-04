// compile.js — the Lexon compiler as a plain function. Finds the binary
// (LEXON_BIN, then ~/Code/lexon/bin/lexon, then `lexon` on PATH), writes the
// source to a temp file (lexon reads files), runs the JavaScript target and
// returns the class source or the compiler's own error line. No wiki here.
import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'

const ERROR_LINE = /^Lexon: .*$/m

let found = null
export async function lexonBin() {
  if (found) return found
  const candidates = [process.env.LEXON_BIN, join(homedir(), 'Code/lexon/bin/lexon'), '/usr/local/bin/lexon', '/opt/homebrew/bin/lexon'].filter(Boolean)
  for (const c of candidates) {
    try { await access(c); found = c; return c } catch {}
  }
  found = 'lexon'
  return found
}

const run = (bin, args, cwd) => new Promise((resolve) => {
  execFile(bin, args, { cwd, timeout: 20000, maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
    resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '', spawnError: err && err.code === 'ENOENT' ? err.message : null })
  })
})

export async function compileSource(source, { flags = ['-2'] } = {}) {
  const bin = await lexonBin()
  const dir = await mkdtemp(join(tmpdir(), 'lexon-'))
  const file = join(dir, 'contract.lex')
  try {
    await writeFile(file, source.endsWith('\n') ? source : source + '\n')
    const r = await run(bin, [...flags, 'contract.lex'], dir)
    if (r.spawnError) return { ok: false, error: `no Lexon compiler: ${r.spawnError}`, compiler: bin }
    const version = (await run(bin, ['--version'], dir)).stdout.trim().replace(/\s+/g, ' ')
    const err = (r.stdout + '\n' + r.stderr).match(ERROR_LINE)
    if (r.code !== 0 || err) return { ok: false, error: err ? err[0] : `exit ${r.code}`, compiler: version, javascript: '' }
    return { ok: true, javascript: r.stdout, compiler: version, ...describe(r.stdout) }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

// What the generated class offers: its name, constructor parameters, and every
// clause method (on the class or on a covenant class nested in its constructor).
export function describe(js) {
  const cls = js.match(/module\.exports = class (\w+)/)
  const ctor = js.match(/constructor\(([^)]*)\)/)
  // a method line: `    name(caller, …)  {` — never a statement such as `if(caller != …) return`
  const clauses = [...new Set([...js.matchAll(/^\s+([a-z_][a-z0-9_]*)\([^)]*\)\s*\{\s*$/gm)].map(m => m[1]))].filter(n => !['transfer', 'notify', 'constructor'].includes(n))
  return { class: cls ? cls[1] : null, constructor: ctor ? ctor[1].split(',').map(s => s.trim()).filter(Boolean) : [], clauses }
}
