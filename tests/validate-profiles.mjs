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

// 跳板组承载自建 SS2022:为空时必须 REJECT(回落直连会从家里直接过墙)。2026-11 悦通改名、三毛停用，
// 写死全名的两个跳板组被滤空、中转全断，所以这里用改名前后两种格式的节点名核对成员边界。
// mihomo 的 filter / exclude-filter 用 ` 分隔多条，任一条命中即算;引擎是 regexp2,这里的写法在 JS u 模式下语义一致。
const JUMP_REGIONS = ['台湾', '香港', '日本', '韩国', '新加坡', '美国']

function assertJumpGroups(groups) {
  const anyMatch = (patterns, node) => patterns.split('`').some((p) => new RegExp(p, 'u').test(node))
  const keeps = (group, node) =>
    (!group.filter || anyMatch(group.filter, node)) && !(group['exclude-filter'] && anyMatch(group['exclude-filter'], node))
  const jumps = groups.filter((group) => group.name.startsWith('跳板·'))
  assert.deepEqual(
    [...jumps].map((group) => group.name).sort(),
    ['跳板·台北2', ...JUMP_REGIONS.map((region) => `跳板·${region}`)].sort(),
    'Lumex_active.js: jump groups must be one per region plus 跳板·台北2'
  )
  for (const group of jumps) assert.equal(group['empty-fallback'], 'REJECT', `Lumex_active.js: ${group.name} must REJECT when empty`)
  const regional = jumps.filter((group) => group.name !== '跳板·台北2')
  // 每个样例只能进它自己的地区。样例取自真实节点名,含改名前后两种格式、旗子不对的(🇨🇳TW)和带「｜HK｜」线路标记的。
  const samples = {
    台湾: ['微斯·🇨🇳TW-01 · 备用入口', 'Sntp· 🇨🇳 TW02', 'Navenix· 🇹🇼台湾02｜HK｜三网优化', '悦·🇹🇼台湾2', '悦·🇹🇼台湾家宽2💎'],
    香港: [
      '悦·🇭🇰香港家宽2💎', '悦·🇭🇰香港2', '悦·🇭🇰香港2 · A', '悦·悦 · 🇭🇰 香港家宽2💎', '微斯·🇭🇰HK-01 · 备用入口',
      '微斯·🇭🇰HK-05[Residential] · 备用入口', '一分·🇭🇰香港HKBN', '🇭🇰 HK03', '星链·HK香港02', '星链·HK高速-香港03', 'Navenix· 🇭🇰香港02｜HK｜三网优化×0.5'
    ],
    日本: ['悦·🇯🇵日本AI解锁1💎', '微斯·🇯🇵JP-02 · 备用入口', 'Navenix· 🇯🇵日本01｜HK｜三网优化', '悦·保底 JP'],
    韩国: ['悦·🇰🇷韩国2', '微斯·🇰🇷KR-02 · 备用入口', 'Navenix· 🇰🇷韩国01｜HK｜三网优化'],
    新加坡: ['悦·🇸🇬新加坡1', '🇸🇬 SG02', '星链·sg新加坡02-中转', '微斯·🇸🇬SG-04[SG.GS] · 备用入口', '悦·保底 SG'],
    美国: ['星链·US拉斯维加斯01-IPLC', '星链·LAX-洛杉矶3', '星链·US专线-芝加哥-02', '微斯·🇺🇸US-02 · 备用入口', 'Navenix· 🇺🇸美国02｜HK｜三网优化', '悦·保底 US']
  }
  for (const [region, nodes] of Object.entries(samples)) {
    for (const node of nodes) {
      const hit = [...regional].filter((group) => keeps(group, node)).map((group) => group.name)
      assert.deepEqual(hit, [`跳板·${region}`], `Lumex_active.js: ${node} must only be in 跳板·${region}, got ${hit}`)
    }
  }
  // 远区、自建、勿跑大流量不当跳板;澳门带「｜HK｜」标记也不算香港。
  for (const node of [
    '自建·台北1·Reality', '自建·台北2·Reality', '自建·洛杉矶·Reality', '一分·日本勿跑大流量', '一分·香港勿跑大流量',
    '微斯·🇲🇴MO-01 · 备用入口', 'Navenix· 🇲🇴澳门01｜HK｜三网优化×0.5', 'Navenix· 🇬🇧英国01｜HK｜三网优化×0.5', '星链·SHKG-测试'
  ]) {
    const hit = [...regional].filter((group) => keeps(group, node)).map((group) => group.name)
    assert.deepEqual(hit, [], `Lumex_active.js: ${node} must not be a jump, got ${hit}`)
  }
  // 成员跨机场,gstatic 只测「家 → 跳板」,挑不出能跳到台北的;地区组必须测同一个到台北的地址。
  for (const group of regional) {
    assert(/^http:\/\/[^/]+:39078\/generate_204$/.test(group.url), `Lumex_active.js: ${group.name} must test the Taipei VPS (${group.url})`)
    assert.equal(group['score-based'], true, `Lumex_active.js: ${group.name} must pick by delay`)
    assert.equal(group.type, 'fallback', `Lumex_active.js: ${group.name} must be fallback`)
  }
  // 跳板组排在一起,台北2 在最后。
  const names = [...groups].map((group) => group.name)
  const first = names.indexOf(`跳板·${JUMP_REGIONS[0]}`)
  assert.deepEqual(names.slice(first, first + jumps.length), [...JUMP_REGIONS.map((region) => `跳板·${region}`), '跳板·台北2'], 'Lumex_active.js: jump groups must stay together')
}

// Muse 只对美国开放:filter 只能看落地。按全名看的话,「中转·美国-自建·台北1·SS」会因跳板名进组,出口却在台湾。
function assertMuseLandingOnly(groups) {
  const muse = groups.find((group) => group.name === 'Muse')
  assert(muse, 'Lumex_active.js: Muse group required')
  const keeps = (node) => new RegExp(muse.filter, 'u').test(node) && !new RegExp(muse['exclude-filter'], 'u').test(node)
  for (const node of ['中转·美国-自建·洛杉矶·SS', '中转·香港-自建·洛杉矶·SS', '中转·日本-自建·洛杉矶·SS', '微斯·🇺🇸US-01 · 备用入口', '星链·LAX-洛杉矶3', '自建·洛杉矶·Reality']) {
    assert(keeps(node), `Lumex_active.js: Muse must keep ${node}`)
  }
  for (const node of ['中转·美国-自建·台北1·SS', '中转·美国-自建·台北2·SS', '中转·美国-悦·🇹🇼台湾家宽2💎', '中转·日本-自建·台北2·SS', '自建·台北1·Reality', '悦·🇯🇵日本专属2💎']) {
    assert(!keeps(node), `Lumex_active.js: Muse must exclude ${node}`)
  }
}

// 中转 = 每个地区 × 每个落地,加经台北2 的两条。前缀和前置跳板必须对应,否则中转走错跳板或进错组。
function assertRelayMatrix(providers) {
  const expected = new Map([
    ['台湾家宽经台北2', '台北2'],
    ['自建台北1SS经台北2', '台北2']
  ])
  for (const region of JUMP_REGIONS) {
    for (const landing of ['台湾家宽', '自建台北1SS', '自建台北2SS', '自建洛杉矶SS']) expected.set(`${landing}经${region}`, region)
  }
  const relays = Object.entries(providers).filter(([, provider]) => provider.override?.['dialer-proxy'])
  assert.deepEqual(relays.map(([name]) => name).sort(), [...expected.keys()].sort(), 'Lumex_active.js: relay providers must be region x landing')
  for (const [name, provider] of relays) {
    const region = expected.get(name)
    assert.equal(provider.override['dialer-proxy'], `跳板·${region}`, `Lumex_active.js: relay ${name} jump`)
    assert.equal(provider.override['additional-prefix'], `中转·${region}-`, `Lumex_active.js: relay ${name} prefix`)
  }
}

// 中转代理集只读组合机场下载好的文件，不能各自下载:每多一个 HTTP 代理集，Sub-Store 缓存过期时就把所有机场多请求一遍
// (2026-11-08 一轮 10 次下载里微斯 5 次回 304)。
function assertRelayProviders(providers, groups) {
  const combined = providers['组合机场']
  assert(combined, 'Lumex_active.js: 组合机场 provider required')
  assert.equal(combined.type, 'http', 'Lumex_active.js: 组合机场 must be the only provider that downloads')
  const relays = Object.entries(providers).filter(([, provider]) => provider.override?.['dialer-proxy'])
  assert(relays.length > 0, 'Lumex_active.js: relay providers missing')
  const groupNames = new Set(groups.map((group) => group.name))
  for (const [name, provider] of relays) {
    assert.equal(provider.type, 'file', `Lumex_active.js: relay ${name} must read a local file`)
    assert.equal(provider.path, combined.path, `Lumex_active.js: relay ${name} must read 组合机场's file`)
    assert.equal(provider.url, undefined, `Lumex_active.js: relay ${name} must not download`)
    assert(provider.filter, `Lumex_active.js: relay ${name} needs a filter`)
    assert(groupNames.has(provider.override['dialer-proxy']), `Lumex_active.js: relay ${name} jump group not found`)
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
    assertJumpGroups(output['proxy-groups'])
    assertRelayProviders(output['proxy-providers'], output['proxy-groups'])
    assertRelayMatrix(output['proxy-providers'])
    assertMuseLandingOnly(output['proxy-groups'])
    // main() 里那行日志是确认客户端有没有拉到新版的手段,V4.28~V4.31 都漏改过,一直显示 V4.27。
    const headerVersion = /版本: (V[\d.]+)/.exec(source)?.[1]
    const loggedVersion = /加载脚本 (V[\d.]+)/.exec(logs.join('\n'))?.[1]
    assert(headerVersion, 'Lumex_active.js: header version missing')
    assert.equal(loggedVersion, headerVersion, 'Lumex_active.js: console.log version must match the header')
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
// 悦的名字 2026-11 起没有「 · A/B」后缀(Sub-Store 规范成「悦·🇯🇵日本1」);withLegacy 再按旧后缀各核对一遍。
const IOS_NODES = {
  hk: '悦·🇭🇰香港家宽2💎',
  hkFast: '微斯·🇭🇰HK-01 · 备用入口',
  jp: '悦·🇯🇵日本1',
  jpAi: '悦·🇯🇵日本AI解锁1💎',
  sgAi: '悦·🇸🇬新加坡AI解锁1💎',
  tw: '悦·🇹🇼台湾2',
  twFast: '微斯·🇨🇳TW-01 · 备用入口',
  kr: '悦·🇰🇷韩国1',
  us: '悦·🇺🇸美国1',
  usFast: '微斯·🇺🇸US-01 · 备用入口',
  oneHk: '一分·🇭🇰香港HKBN',
  oneJp: '一分·🇯🇵日本专线-0.1倍率',
  claude: '自建·台北2·Reality'
}
const withLegacy = (node) => (node.startsWith('悦·') ? [node, `${node} · A`, `${node} · B`] : [node])
const testAll = (re, node) => withLegacy(node).every((n) => re.test(n))
const testNone = (re, node) => withLegacy(node).every((n) => !re.test(n))
// 这些节点绝不能进代理集:裸 SS 会让 SS2022 从手机直接过墙，其余是公告或用不了的节点
const IOS_PROVIDER_EXCLUDED = ['自建·台北1·SS', '自建·台北2·SS', '自建·洛杉矶·SS', '悦·剩余流量：无限', '悦·套餐到期：长期有效', '一分·剩余流量：737.62 GB', '微斯·距离下次重置剩余：6 天', '三毛·流量已耗尽！', '星链·ipv6-高速-德州', '微斯·🇭🇰HK-06[Max]×3', '微斯·🇭🇰HK-01']
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
    assert(testNone(providerFilter, node),`${relative}: provider filter must exclude ${node}`)
  }
  for (const node of Object.values(IOS_NODES)) assert(testAll(providerFilter, node),`${relative}: provider filter must keep ${node}`)
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
    for (const key of expected.in) assert(testAll(filter, IOS_NODES[key]),`${relative}: ${group.name} must keep ${IOS_NODES[key]}`)
    for (const key of expected.out) assert(testNone(filter, IOS_NODES[key]),`${relative}: ${group.name} must exclude ${IOS_NODES[key]}`)
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
  // 网页不需要权限就能让 WebRTC 打 STUN：这些端口不能直连，国内 STUN 也一样，所以要排在国内规则前面;节点不支持 UDP 时内核跳过代理规则，靠下一条拒绝
  const stunPorts = 'DST-PORT,123/3478-3497/19302-19309'
  const stun = rules.indexOf(`AND,((NETWORK,UDP),(${stunPorts})),自动选择`)
  assert(stun >= 0, `${relative}: STUN ports must go through a proxy`)
  assert.equal(rules[stun + 1], `AND,((NETWORK,UDP),(${stunPorts})),REJECT`, `${relative}: STUN must be rejected when the proxy has no UDP`)
  assert(stun < rules.findIndex((rule) => rule.startsWith('RULE-SET,cn-site,')), `${relative}: STUN rule must come before the domestic rules`)
  assert(!rules.some((rule) => /DST-PORT,[^)]*\b(123|3478|19302)\b/.test(rule) && rule.endsWith(',DIRECT')), `${relative}: STUN ports must not go direct`)
  // ipv6: false 时内核清掉隧道的 IPv6 地址，隧道不接管 IPv6;App 只拿 IPv4 解析结果靠 dns.ipv6
  assert(/^ipv6: true/m.test(body), `${relative}: the tunnel must take over IPv6`)
  assert(/^dns:\n(?: .*\n)*? {2}ipv6: false/m.test(body), `${relative}: dns.ipv6 must stay off`)
  const youtube = rules.findIndex((rule) => rule.startsWith('RULE-SET,youtube,'))
  assert(youtube >= 0 && youtube < rules.findIndex((rule) => rule.startsWith('RULE-SET,google,')), `${relative}: youtube must come before google`)

  const filterOf = (fields) => {
    const value = fields.map((line) => line.match(/^\s*filter:\s*"(.+)"\s*$/)?.[1]).find(Boolean)
    assert(value, `${relative}: filter required`)
    return new RegExp(value, 'u')
  }
  const providerFilter = filterOf(provider)
  for (const node of IOS_PROVIDER_EXCLUDED) assert(testNone(providerFilter, node),`${relative}: provider filter must exclude ${node}`)
  // Clash 版不收新加坡，Stash 版不变
  for (const node of [IOS_NODES.sgAi, '微斯·🇸🇬SG-01 · 备用入口', '悦·🇸🇬新加坡2','一分·🇸🇬新加坡专线']) {
    assert(testNone(providerFilter, node),`${relative}: provider filter must exclude ${node}`)
  }
  for (const [key, node] of Object.entries(IOS_NODES)) {
    if (key !== 'sgAi') assert(testAll(providerFilter, node),`${relative}: provider filter must keep ${node}`)
  }
  for (const group of groups) {
    const field = (key) => group.fields.find((line) => line.startsWith(`${key}:`))?.split('#')[0].slice(key.length + 1).trim()
    if (field('type') === 'select') continue
    assert.equal(field('type'), 'url-test', `${relative}: ${group.name} unexpected type`)
    // 组上写 url 会给代理集多注册一个测速任务，整个代理集多测一轮
    assert(!group.fields.some((line) => /^(url|interval|lazy):/.test(line)), `${relative}: ${group.name} must leave testing to the provider`)
    const filter = filterOf(group.fields)
    const expected = IOS_EXPECTED_MEMBERS[group.name]
    assert(expected, `${relative}: add ${group.name} to IOS_EXPECTED_MEMBERS`)
    for (const key of expected.in.filter((key) => key !== 'sgAi')) assert(testAll(filter, IOS_NODES[key]),`${relative}: ${group.name} must keep ${IOS_NODES[key]}`)
    // 自建的边界与 Stash 版不同：除 EMBY、Muse 外都收台北两台
    for (const key of expected.out.filter((key) => key !== 'claude')) assert(testNone(filter, IOS_NODES[key]),`${relative}: ${group.name} must exclude ${IOS_NODES[key]}`)
    const keepsSelfHosted = !['EMBY', 'Muse'].includes(group.name)
    for (const node of ['自建·台北1·Reality', '自建·台北2·Reality']) {
      assert.equal(filter.test(node), keepsSelfHosted, `${relative}: ${group.name} ${keepsSelfHosted ? 'must keep' : 'must exclude'} ${node}`)
    }
    // 洛杉矶不是台湾出口，只有 Claude 不收(与 PC V4.27 一致，PC 的 Claude 也只收台湾)
    const keepsLosAngeles = group.name !== 'Claude'
    assert(providerFilter.test('自建·洛杉矶·Reality'), `${relative}: provider filter must keep 自建·洛杉矶·Reality`)
    assert.equal(filter.test('自建·洛杉矶·Reality'), keepsLosAngeles, `${relative}: ${group.name} ${keepsLosAngeles ? 'must keep' : 'must exclude'} 自建·洛杉矶·Reality`)
    assert(!filter.test('自建·洛杉矶·SS'), `${relative}: ${group.name} must exclude 自建·洛杉矶·SS`)
    // 台湾家宽的名字不带「台湾[12]」，普通台湾节点的写法匹配不到它，曾因此不属于任何组
    const keepsTaiwanHome = group.name !== 'Muse'
    for (const node of ['悦·🇹🇼台湾家宽1💎 · A', '悦·🇹🇼台湾家宽2💎 · B']) {
      assert(testAll(providerFilter, node),`${relative}: provider filter must keep ${node}`)
      assert.equal(filter.test(node), keepsTaiwanHome, `${relative}: ${group.name} ${keepsTaiwanHome ? 'must keep' : 'must exclude'} ${node}`)
    }
    if (['Gemini', 'ChatGPT', 'Claude', 'Muse'].includes(group.name)) {
      assert.equal(field('empty-fallback'), 'REJECT', `${relative}: ${group.name} must not fall back to direct when empty`)
    }
  }
  console.log(`[profile-test] ${relative}: OK (${groups.length} groups, ${rules.length} rules, ${ruleSets.size} rule-sets)`)
}
