import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const root = path.resolve(import.meta.dirname, '..')
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/minimal-profile.json'), 'utf8'))
const scripts = ['FlLumex_Override.js', 'Lumex/Lumex.js', 'Lumex/Lumex_active.js', 'Stash_Override.js']
// Lumex_active.js 也给标准 mihomo(Mihomo Party)用:标准内核遇到不认识的组类型会让整份配置加载失败,
// LumexCore 专属类型只能经 lumex-type 声明(见 LumexCore adapter/outboundgroup/parser.go)。
const STANDARD_GROUP_TYPES = new Set(['select', 'url-test', 'fallback', 'load-balance'])

// RFC-031(2026-10-18 DNS 泄漏复盘)守住的不变量，只查仍在维护的 Lumex 两份脚本与 Lumex.yaml:
// 1. 按 IP 匹配的规则必须带 no-resolve——否则落到它的域名都要先在本地解析，国外域名因此被国内 DoH 看到;
// 2. 同一 DNS 条目里的多个上游是并发查询(不是主备),国内外 DoH 不能混在一条;默认上游不能是国内 DoH;fallback 不再用;
// 3. 节点域名解析(proxy-server-nameserver)不能走明文 DNS,否则运营商能看到机场域名。
const LEAK_GUARDED = new Set(['Lumex/Lumex.js', 'Lumex/Lumex_active.js'])
const IP_RULE = /^(GEOIP|IP-CIDR6?|IP-SUFFIX|IP-ASN),/i
const IP_SUBRULE = /\((GEOIP|IP-CIDR6?|IP-SUFFIX|IP-ASN),/i
const DOMESTIC_DNS = /alidns|doh\.pub|dnspod|223\.[56]\.[56]\.[56]|119\.29\.29\.29|1\.12\.12\.12|120\.53\.53\.53|114\.114\.11[45]\.11[45]/i
const FOREIGN_DNS = /\b1\.[01]\.[01]\.1\b|8\.8\.[48]\.[48]|cloudflare-dns|dns\.google|quad9|9\.9\.9\.9/i

function ipRulesWithoutNoResolve(rules) {
  // Array.from:output 来自 vm 沙箱，沙箱里的数组原型不同，deepEqual 会把两个空数组判成不等
  return Array.from(rules, String).filter((rule) => {
    if (IP_RULE.test(rule)) return !rule.split(',').map((part) => part.trim()).includes('no-resolve')
    if (/^(AND|OR|NOT),/i.test(rule) && IP_SUBRULE.test(rule)) return !/no-resolve/i.test(rule)
    return false
  })
}

function assertDnsLeakGuards(label, dns) {
  const list = (value) => (Array.isArray(value) ? value : [value]).map(String)
  assert(dns && typeof dns === 'object', `${label}: dns required`)
  assert(!dns.fallback?.length, `${label}: dns.fallback must stay removed (main nameserver is queried first)`)
  assert(!dns['fallback-filter'], `${label}: dns.fallback-filter must stay removed`)
  const main = list(dns.nameserver ?? [])
  assert(main.length > 0 && !main.some((s) => DOMESTIC_DNS.test(s)), `${label}: default nameserver must not be domestic`)
  for (const [key, value] of Object.entries(dns['nameserver-policy'] ?? {})) {
    const servers = list(value)
    assert(
      !(servers.some((s) => FOREIGN_DNS.test(s)) && servers.some((s) => DOMESTIC_DNS.test(s))),
      `${label}: nameserver-policy ${key} mixes foreign and domestic DoH (queried concurrently)`
    )
  }
  for (const server of list(dns['proxy-server-nameserver'] ?? [])) {
    assert(/^(https|tls|quic):\/\//.test(server), `${label}: proxy-server-nameserver must be encrypted: ${server}`)
  }
}

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
    assert.equal(emby.type, 'url-test', 'Lumex_active.js: EMBY must stay url-test for stock mihomo')
    assert.equal(emby['lumex-type'], 'media-balance', 'Lumex_active.js: EMBY must request media-balance via lumex-type')
    for (const group of output['proxy-groups']) {
      assert(
        STANDARD_GROUP_TYPES.has(group.type),
        `Lumex_active.js: group ${group.name} uses non-mihomo type ${group.type}; declare it via lumex-type`
      )
    }
    assert.equal(emby['media-mode'], 'active', 'Lumex_active.js: EMBY must explicitly select active mode')
    assert.equal(emby['media-racing-ms'], 250, 'Lumex_active.js: EMBY racing delay must be 250ms')
  }
  if (LEAK_GUARDED.has(relative)) {
    assert.deepEqual(ipRulesWithoutNoResolve(output.rules), [], `${relative}: IP rules must carry no-resolve`)
    assertDnsLeakGuards(relative, output.dns)
  }
  console.log(`[profile-test] ${relative}: OK (${output['proxy-groups'].length} groups)`)
}

// Lumex.yaml 是同一套配置的 YAML 版。仓库不装 YAML 解析库，按行检查规则与 DNS 的关键字段。
{
  const relative = 'Lumex/Lumex.yaml'
  const text = fs.readFileSync(path.join(root, relative), 'utf8')
  const lines = text.split(/\r?\n/)
  const rules = lines
    .map((line) => line.match(/^\s*-\s*((?:GEOIP|IP-CIDR6?|IP-SUFFIX|IP-ASN),.*)$/i)?.[1])
    .filter(Boolean)
    .map((rule) => rule.replace(/\s+#.*$/, ''))
  assert.deepEqual(ipRulesWithoutNoResolve(rules), [], `${relative}: IP rules must carry no-resolve`)
  assert(!/^ {2}fallback(-filter)?:/m.test(text), `${relative}: dns.fallback must stay removed`)
  const block = (key) => {
    const start = lines.findIndex((line) => line === `  ${key}:`)
    if (start < 0) return []
    const items = []
    for (const line of lines.slice(start + 1)) {
      const m = line.match(/^ {4}- (.+)$/)
      if (!m) break
      items.push(m[1].trim())
    }
    return items
  }
  assertDnsLeakGuards(relative, {
    nameserver: block('nameserver'),
    'proxy-server-nameserver': block('proxy-server-nameserver')
  })
  console.log(`[profile-test] ${relative}: OK (dns + ${rules.length} IP rules)`)
}
