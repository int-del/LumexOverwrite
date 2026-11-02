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
  // 公开仓库只放占位符
  const subscription = lines.slice(lines.indexOf('proxy-providers:')).find((line) => /^ {4}url:/.test(line))
  assert(subscription?.includes('https://example.invalid/'), `${relative}: subscription url must stay a placeholder`)
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

// 两份手机配置共用的节点边界。组为空时 Stash 会静默走 DIRECT，filter 写错还可能放进不该走的节点，所以用代表性节点名核对。
const IOS_NODES = {
  hk: '悦·🇭🇰香港家宽2💎 · A',
  hkFast: '微斯·🇭🇰HK-01 · 备用入口',
  jp: '悦·🇯🇵日本1 · B',
  jpAi: '悦·🇯🇵日本AI解锁1💎 · A',
  sgAi: '悦·🇸🇬新加坡AI解锁1💎 · A',
  tw: '悦·🇹🇼台湾2 · A',
  twFast: '微斯·🇨🇳TW-01 · 备用入口',
  kr: '悦·🇰🇷韩国1 · B',
  us: '悦·🇺🇸美国1 · A',
  usFast: '微斯·🇺🇸US-01 · 备用入口',
  oneHk: '一分·🇭🇰香港HKBN',
  oneJp: '一分·🇯🇵日本专线-0.1倍率',
  claude: '自建·台北2·Reality'
}
// 这些节点绝不能进代理集:裸 SS 会让 SS2022 从手机直接过墙，其余是公告或用不了的节点
const IOS_PROVIDER_EXCLUDED = ['自建·台北1·SS', '自建·台北2·SS', '悦·剩余流量：无限', '悦·套餐到期：长期有效', '一分·剩余流量：737.62 GB', '微斯·距离下次重置剩余：6 天', '三毛·流量已耗尽！', '星链·ipv6-高速-德州', '微斯·🇭🇰HK-06[Max]×3', '微斯·🇭🇰HK-01']
const IOS_EXPECTED_MEMBERS = {
  自动选择: { in: ['hk', 'hkFast', 'jp', 'tw', 'twFast', 'oneHk', 'oneJp'], out: ['us', 'usFast', 'claude'] },
  EMBY: { in: ['hk', 'tw', 'kr', 'oneHk'], out: ['hkFast', 'jp', 'jpAi', 'oneJp', 'claude'] },
  YouTube: { in: ['hk', 'tw', 'kr', 'oneHk'], out: ['hkFast', 'twFast', 'usFast', 'claude'] },
  Gemini: { in: ['jpAi', 'sgAi', 'us', 'usFast', 'twFast'], out: ['hk', 'hkFast', 'oneHk', 'oneJp', 'claude'] },
  ChatGPT: { in: ['jpAi', 'sgAi', 'us', 'usFast', 'twFast'], out: ['hk', 'hkFast', 'oneHk', 'oneJp', 'claude'] },
  Claude: { in: ['claude'], out: ['hk', 'tw', 'us', 'usFast'] },
  Muse: { in: ['us', 'usFast'], out: ['hk', 'jp', 'tw', 'twFast', 'claude'] }
}

// IosStash/Stash.stoverride 是手机在用的覆写。v2.12 曾带着指向不存在的组的规则放了 8 个月,这里按行守住:
{
  const relative = 'IosStash/Stash.stoverride'
  const raw = fs.readFileSync(path.join(root, relative), 'utf8')
  assert(!raw.startsWith('\uFEFF'), `${relative}: must not have BOM`)
  assert(!raw.includes('\uFFFD'), `${relative}: contains U+FFFD`)
  const lines = raw.split(/\r?\n/)
  const sectionStart = (key) => lines.findIndex((line) => line.startsWith(`${key}:`))
  const section = (key) => {
    const start = sectionStart(key)
    assert(start >= 0, `${relative}: ${key} required`)
    const end = lines.findIndex((line, i) => i > start && /^\S/.test(line) && !line.startsWith('#'))
    return lines.slice(start + 1, end < 0 ? lines.length : end)
  }
  for (const key of ['dns', 'proxy-groups', 'rules']) {
    assert(lines[sectionStart(key)].includes('#!replace'), `${relative}: ${key} must be #!replace`)
  }

  // 只查配置项，不查注释:注释里需要解释为什么不用它们
  const body = lines.filter((line) => !/^\s*#/.test(line)).join('\n')
  // 文档没有这些字段(多是从 mihomo 抄来的);PROCESS-* 在 iOS 上被忽略;pre-matching / arguments 还只在 3.7 Beta
  const forbidden = /^\s*(sniffer|tcp-concurrent|prefer-ipv6|bind-address|allow-lan|respect-rules|enhanced-mode|health-check|exclude-filter|empty-fallback|include-all|arguments|arguments-version|fallback|fallback-filter):|PROCESS-NAME|PROCESS-PATH|pre-matching/m
  assert(!forbidden.test(body), `${relative}: unsupported field: ${body.match(forbidden)?.[0]}`)

  // 规则目标必须是已定义的组
  const groupLines = section('proxy-groups')
  const groups = []
  for (const line of groupLines) {
    const name = line.match(/^ {2}- name:\s*(.+?)\s*$/)?.[1]
    if (name) groups.push({ name, fields: [] })
    else if (groups.length && line.trim() && !line.trim().startsWith('#')) groups.at(-1).fields.push(line.trim())
  }
  const groupNames = new Set(groups.map((group) => group.name))
  assert.equal(groupNames.size, groups.length, `${relative}: duplicate proxy-group names`)
  const rules = section('rules')
    .map((line) => line.match(/^\s*-\s*(.+?)(?:\s+#.*)?$/)?.[1])
    .filter(Boolean)
  const OPTIONS = new Set(['no-resolve', 'no-track'])
  const BUILTIN = new Set(['DIRECT', 'REJECT', 'REJECT-DROP'])
  const targetOf = (rule) => rule.split(',').map((part) => part.trim()).filter((part) => !OPTIONS.has(part)).at(-1)
  for (const rule of rules) {
    const target = targetOf(rule)
    assert(BUILTIN.has(target) || groupNames.has(target), `${relative}: rule target not defined: ${rule}`)
  }
  assert.deepEqual(ipRulesWithoutNoResolve(rules), [], `${relative}: IP rules must carry no-resolve`)
  assert(rules.at(-1).startsWith('MATCH,'), `${relative}: last rule must be MATCH`)
  const firstGeosite = rules.findIndex((rule) => rule.includes('GEOSITE,'))
  assert(
    rules.findIndex((rule) => rule === 'DOMAIN-SUFFIX,github.com,自动选择') < firstGeosite,
    `${relative}: github.com must come before GEOSITE rules (GEOSITE data is first fetched from it)`
  )

  // 公开仓库不写订阅地址
  const provider = section('proxy-providers')
  assert(!provider.some((line) => /^\s*url:/.test(line)), `${relative}: subscription url must stay out of this public repo`)
  assert(provider.some((line) => /^\s*benchmark-url:\s*http:\/\//.test(line)), `${relative}: benchmark-url must be plain HTTP`)

  // 组为空时 Stash 会静默走 DIRECT，所以 filter 只用正向白名单，并用代表性节点名核对边界。
  const filterOf = (lines_) => {
    const value = lines_.map((line) => line.match(/^\s*filter:\s*"(.+)"\s*$/)?.[1]).find(Boolean)
    assert(value, `${relative}: filter required`)
    assert(!value.includes('(?'), `${relative}: filter must not use lookaround: ${value}`)
    return new RegExp(value, 'u')
  }
  const providerFilter = filterOf(provider)
  for (const node of IOS_PROVIDER_EXCLUDED) {
    assert(!providerFilter.test(node), `${relative}: provider filter must exclude ${node}`)
  }
  for (const node of Object.values(IOS_NODES)) assert(providerFilter.test(node), `${relative}: provider filter must keep ${node}`)
  for (const group of groups) {
    const field = (key) => group.fields.find((line) => line.startsWith(`${key}:`))?.split('#')[0].slice(key.length + 1).trim()
    assert(!group.fields.some((line) => /^url:/.test(line)), `${relative}: ${group.name} must not set url (benchmark is per proxy)`)
    if (field('type') === 'select') {
      assert.equal(field('interval'), '-1', `${relative}: select group ${group.name} must not test recursively`)
      continue
    }
    assert.equal(field('type'), 'url-test', `${relative}: ${group.name} unexpected type`)
    assert.equal(field('lazy'), 'true', `${relative}: ${group.name} must be lazy`)
    assert.equal(field('interval'), '600', `${relative}: ${group.name} must share one interval so tests run together`)
    const filter = filterOf(group.fields)
    const expected = IOS_EXPECTED_MEMBERS[group.name]
    assert(expected, `${relative}: add ${group.name} to IOS_EXPECTED_MEMBERS`)
    for (const key of expected.in) assert(filter.test(IOS_NODES[key]), `${relative}: ${group.name} must keep ${IOS_NODES[key]}`)
    for (const key of expected.out) assert(!filter.test(IOS_NODES[key]), `${relative}: ${group.name} must exclude ${IOS_NODES[key]}`)
  }
  console.log(`[profile-test] ${relative}: OK (${groups.length} groups, ${rules.length} rules)`)
}

// IosClash/Clash.yaml 是同一套分流的 mihomo 版。mihomo 按代理集测速，且规则语法与 Stash 不同，单独核对。
{
  const relative = 'IosClash/Clash.yaml'
  const raw = fs.readFileSync(path.join(root, relative), 'utf8')
  assert(!raw.startsWith('\uFEFF'), `${relative}: must not have BOM`)
  assert(!raw.includes('\uFFFD'), `${relative}: contains U+FFFD`)
  const lines = raw.split(/\r?\n/)
  const section = (key) => {
    const start = lines.findIndex((line) => line.startsWith(`${key}:`))
    assert(start >= 0, `${relative}: ${key} required`)
    const end = lines.findIndex((line, i) => i > start && /^\S/.test(line) && !line.startsWith('#'))
    return lines.slice(start + 1, end < 0 ? lines.length : end)
  }

  const body = lines.filter((line) => !/^\s*#/.test(line)).join('\n')
  // PROTOCOL / no-track 是 Stash 语法，mihomo 不认识的规则类型会让整份配置加载失败;GEOSITE / GEOIP 改用 MRS 规则集;iOS 没有进程规则
  const forbidden = /^\s*-\s*(PROTOCOL|GEOSITE|GEOIP|PROCESS-NAME|PROCESS-PATH),|no-track|\(PROTOCOL,|\(GEOSITE,|\(GEOIP,|#!replace|^\s*(fallback|fallback-filter|benchmark-url|benchmark-timeout):/m
  assert(!forbidden.test(body), `${relative}: unsupported field: ${body.match(forbidden)?.[0]}`)
  assert(/^disable-keep-alive: true/m.test(body), `${relative}: keep-alive must stay off on mobile`)
  // QUIC 自带 10 秒心跳，不受 disable-keep-alive 控制
  assert(/^ {4}exclude-type: hysteria2/m.test(body), `${relative}: hysteria2 must stay out of the phone pool`)
  // 嗅探只给纯 IP 连接用：force-dns-mapping 或 force-domain 会让 fake-ip 连接也等首包，改目标会改变实际连接
  assert(/^ {2}parse-pure-ip: true/m.test(body) && /^ {2}override-destination: false/m.test(body), `${relative}: sniffer must only classify pure-IP connections`)
  assert(!/^ {2}(force-dns-mapping: true|force-domain:)/m.test(body), `${relative}: sniffer must not touch fake-ip connections`)

  // 公开仓库只放占位符
  const provider = section('proxy-providers')
  const urls = provider.map((line) => line.match(/^\s*url:\s*"?([^"\s]+)/)?.[1]).filter(Boolean)
  assert.deepEqual(urls, ['https://example.invalid/replace-with-group-yaml-url', 'http://www.gstatic.com/generate_204'], `${relative}: subscription url must stay a placeholder`)
  assert(provider.some((line) => /^\s*lazy: true/.test(line)), `${relative}: health-check must be lazy`)

  const groups = []
  for (const line of section('proxy-groups')) {
    const name = line.match(/^ {2}- name:\s*(.+?)\s*$/)?.[1]
    if (name) groups.push({ name, fields: [] })
    else if (groups.length && line.trim() && !line.trim().startsWith('#')) groups.at(-1).fields.push(line.trim())
  }
  const groupNames = new Set(groups.map((group) => group.name))
  assert.equal(groupNames.size, groups.length, `${relative}: duplicate proxy-group names`)
  const ruleSets = new Set(section('rule-providers').map((line) => line.match(/^ {2}([\w-]+):\s*$/)?.[1]).filter(Boolean))
  const rules = section('rules')
    .map((line) => line.match(/^\s*-\s*(.+?)(?:\s+#.*)?$/)?.[1])
    .filter(Boolean)
  for (const rule of rules) {
    const target = rule.split(',').map((part) => part.trim()).filter((part) => part !== 'no-resolve').at(-1)
    assert(['DIRECT', 'REJECT'].includes(target) || groupNames.has(target), `${relative}: rule target not defined: ${rule}`)
    for (const [, name] of rule.matchAll(/RULE-SET,([\w-]+)/g)) {
      assert(ruleSets.has(name), `${relative}: rule-set not defined: ${rule}`)
    }
    if (/^IP-CIDR|RULE-SET,cn-ip/.test(rule)) assert(rule.includes('no-resolve'), `${relative}: IP rule must carry no-resolve: ${rule}`)
  }
  for (const name of ruleSets) {
    assert(rules.some((rule) => rule.includes(`RULE-SET,${name}`)), `${relative}: rule-set never used: ${name}`)
  }
  assert(rules.at(-1).startsWith('MATCH,'), `${relative}: last rule must be MATCH`)
  const youtube = rules.findIndex((rule) => rule.startsWith('RULE-SET,youtube,'))
  assert(youtube >= 0 && youtube < rules.findIndex((rule) => rule.startsWith('RULE-SET,google,')), `${relative}: youtube must come before google`)

  const filterOf = (fields) => {
    const value = fields.map((line) => line.match(/^\s*filter:\s*"(.+)"\s*$/)?.[1]).find(Boolean)
    assert(value, `${relative}: filter required`)
    return new RegExp(value, 'u')
  }
  const providerFilter = filterOf(provider)
  for (const node of IOS_PROVIDER_EXCLUDED) assert(!providerFilter.test(node), `${relative}: provider filter must exclude ${node}`)
  for (const node of Object.values(IOS_NODES)) assert(providerFilter.test(node), `${relative}: provider filter must keep ${node}`)
  for (const group of groups) {
    const field = (key) => group.fields.find((line) => line.startsWith(`${key}:`))?.split('#')[0].slice(key.length + 1).trim()
    if (field('type') === 'select') continue
    assert.equal(field('type'), 'url-test', `${relative}: ${group.name} unexpected type`)
    // 组上写 url 会给代理集多注册一个测速任务，整个代理集多测一轮
    assert(!group.fields.some((line) => /^(url|interval|lazy):/.test(line)), `${relative}: ${group.name} must leave testing to the provider`)
    const filter = filterOf(group.fields)
    const expected = IOS_EXPECTED_MEMBERS[group.name]
    assert(expected, `${relative}: add ${group.name} to IOS_EXPECTED_MEMBERS`)
    for (const key of expected.in) assert(filter.test(IOS_NODES[key]), `${relative}: ${group.name} must keep ${IOS_NODES[key]}`)
    for (const key of expected.out) assert(!filter.test(IOS_NODES[key]), `${relative}: ${group.name} must exclude ${IOS_NODES[key]}`)
    if (['Gemini', 'ChatGPT', 'Claude', 'Muse'].includes(group.name)) {
      assert.equal(field('empty-fallback'), 'REJECT', `${relative}: ${group.name} must not fall back to direct when empty`)
    }
  }
  console.log(`[profile-test] ${relative}: OK (${groups.length} groups, ${rules.length} rules, ${ruleSets.size} rule-sets)`)
}
