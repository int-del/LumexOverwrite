import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const root = path.resolve(import.meta.dirname, '..')
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/minimal-profile.json'), 'utf8'))
const scripts = ['FlLumex_Override.js', 'Lumex/Lumex.js', 'Stash_Override.js']

for (const relative of scripts) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const logs = []
  const context = vm.createContext({
    console: { log: (...args) => logs.push(args.join(' ')), info: () => {}, warn: () => {}, error: () => {} }
  })
  const output = vm.runInContext(`${source}\n;main(${JSON.stringify(fixture)})`, context, {
    timeout: 5000,
    filename: relative
  })
  assert(output && typeof output === 'object' && !Array.isArray(output), `${relative}: output must be an object`)
  assert(Array.isArray(output['proxy-groups']) && output['proxy-groups'].length > 0, `${relative}: proxy-groups required`)
  assert(Array.isArray(output.rules) && output.rules.length > 0, `${relative}: rules required`)
  const names = output['proxy-groups'].map((group) => group.name)
  assert.equal(new Set(names).size, names.length, `${relative}: duplicate proxy-group names`)
  assert(!output['proxy-groups'].some((group) => group.type === 'smart'), `${relative}: type smart is forbidden`)
  console.log(`[profile-test] ${relative}: OK (${output['proxy-groups'].length} groups)`)
}
