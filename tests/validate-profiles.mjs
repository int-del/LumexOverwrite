import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const root = path.resolve(import.meta.dirname, '..')
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/minimal-profile.json'), 'utf8'))
const scripts = [
  'FlLumex_Override.js',
  'Lumex/Lumex.js',
  'Lumex/Lumex_active.js',
  'MihomoParty_Override.js',
  'Stash_Override.js'
]
// 标准 mihomo 不认识的组类型会让整份配置加载失败;专属字段虽被忽略,也不该残留在兼容版里。
const STANDARD_GROUP_TYPES = new Set(['select', 'url-test', 'fallback', 'load-balance'])
const LUMEX_ONLY_KEY = /^(urls|adaptive-|switch-cost-|hierarchical|media-|bandit-|scoped-health-check$)/

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
  if (relative === 'Lumex/Lumex_active.js') {
    const emby = output['proxy-groups'].find((group) => group.name === 'EMBY')
    assert(emby, 'Lumex_active.js: EMBY group required')
    assert.equal(emby.type, 'media-balance', 'Lumex_active.js: EMBY must use media-balance')
    assert.equal(emby['media-mode'], 'active', 'Lumex_active.js: EMBY must explicitly select active mode')
    assert.equal(emby['media-racing-ms'], 250, 'Lumex_active.js: EMBY racing delay must be 250ms')
  }
  if (relative === 'MihomoParty_Override.js') {
    for (const group of output['proxy-groups']) {
      assert(STANDARD_GROUP_TYPES.has(group.type), `${relative}: group ${group.name} uses non-mihomo type ${group.type}`)
      const leftover = Object.keys(group).filter((key) => LUMEX_ONLY_KEY.test(key))
      assert.equal(leftover.length, 0, `${relative}: group ${group.name} keeps LumexCore-only keys ${leftover}`)
    }
    for (const [name, provider] of Object.entries(output['proxy-providers'] ?? {})) {
      const leftover = [...Object.keys(provider), ...Object.keys(provider['health-check'] ?? {})].filter((key) =>
        LUMEX_ONLY_KEY.test(key)
      )
      assert.equal(leftover.length, 0, `${relative}: provider ${name} keeps LumexCore-only keys ${leftover}`)
    }
  }
  console.log(`[profile-test] ${relative}: OK (${output['proxy-groups'].length} groups)`)
}
