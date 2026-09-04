// scenarios.js — drive a Lexon-compiled JavaScript class through a behaviour
// table. The same protocol as the conformance harness's run-scenarios.js
// (targets/lexon/scripts): scenarios construct the contract from `new`, run
// steps (call/caller/args, "as" keeps a returned covenant record under a
// name, "on" calls on it, {"set": {...}} moves state such as the clock), and
// state what must be true — returns, transfers, state fields, objects.
import { createRequire } from 'node:module'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TRANSFER = /transfer (\S+) from (\S+) to (\S+)\./
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function capture(fn) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try { return [fn(), lines] } finally { console.log = orig }
}
const transfersOf = (lines) => lines.map(l => l.match(TRANSFER)).filter(Boolean)
  .map(m => [m[2], m[3], Number.isNaN(Number(m[1])) ? m[1] : Number(m[1])])

export function runScenario(Contract, table, sc) {
  const failures = []
  const ctor = { ...(table.new || {}), ...(sc.new || {}) }
  const order = (table.interface && table.interface.constructor) || Object.keys(ctor)
  let instance, lines
  try { ;[instance, lines] = capture(() => new Contract(...order.map(k => ctor[k]))) } catch (e) {
    return { name: sc.name, spec_ref: sc.spec_ref || null, ok: false, failures: [`constructor threw: ${e.message}`] }
  }
  const returns = [], named = {}
  let transfers = transfersOf(lines)
  for (const step of sc.steps || []) {
    if (step.set) {
      const obj = step.on ? named[step.on] : instance
      if (!obj) { failures.push(`no object named '${step.on}' to set on`); break }
      Object.assign(obj, step.set); continue
    }
    const target = step.on ? named[step.on] : instance
    if (!target || typeof target !== 'object') { failures.push(`no object named '${step.on}' to call ${step.call} on`); break }
    const fn = target[step.call]
    if (typeof fn !== 'function') {
      failures.push(`no clause '${step.call}' on ${step.on || 'the contract'} (has: ${Object.getOwnPropertyNames(Object.getPrototypeOf(target)).filter(n => n !== 'constructor').join(', ')})`)
      break
    }
    const args = step.caller === undefined || step.caller === null ? [] : [step.caller]
    args.push(...(step.args || []))
    let r, l
    try { ;[r, l] = capture(() => fn.apply(target, args)) } catch (e) { failures.push(`${step.call} threw: ${e.message}`); break }
    if (step.as) named[step.as] = r
    returns.push(r === undefined ? null : (r !== null && typeof r === 'object') ? `<${step.as || r.constructor.name}>` : r)
    transfers = transfers.concat(transfersOf(l))
  }
  const ex = sc.expect || {}
  if (ex.returns !== undefined && !same(returns, ex.returns)) failures.push(`returns ${JSON.stringify(returns)} ≠ expected ${JSON.stringify(ex.returns)}`)
  if (ex.transfers !== undefined && !same(transfers, ex.transfers)) failures.push(`transfers ${JSON.stringify(transfers)} ≠ expected ${JSON.stringify(ex.transfers)}`)
  if (ex.state) for (const [k, v] of Object.entries(ex.state)) if (!same(instance[k], v)) failures.push(`state.${k} = ${JSON.stringify(instance[k])} ≠ expected ${JSON.stringify(v)}`)
  if (ex.objects) for (const [name, fields] of Object.entries(ex.objects)) {
    const o = named[name]
    if (!o || typeof o !== 'object') { failures.push(`no object named '${name}' was kept`); continue }
    for (const [k, v] of Object.entries(fields)) if (!same(o[k], v)) failures.push(`${name}.${k} = ${JSON.stringify(o[k])} ≠ expected ${JSON.stringify(v)}`)
  }
  const state = {}
  for (const k of Object.keys(instance)) if (typeof instance[k] !== 'function' && typeof instance[k] !== 'object') state[k] = instance[k]
  return { name: sc.name, spec_ref: sc.spec_ref || null, ok: failures.length === 0, returns, transfers, state, failures }
}

// Load generated JavaScript (CommonJS: `module.exports = class …`) from a
// fresh temp file so no stale module cache survives an edit, and run the table.
export async function runTable(javascript, table, only = null) {
  const dir = await mkdtemp(join(tmpdir(), 'lexon-run-'))
  const file = join(dir, 'contract.js')
  try {
    await writeFile(file, javascript)
    const require = createRequire(import.meta.url)
    delete require.cache[file]
    const Contract = require(file)
    const selected = (table.scenarios || []).filter(s => !only || s.name === only)
    const results = selected.map(sc => runScenario(Contract, table, sc))
    return { contract: table.contract || null, ok: results.every(r => r.ok), passed: results.filter(r => r.ok).length, total: results.length, results }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
