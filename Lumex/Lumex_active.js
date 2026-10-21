// Lumex Party 专用配置文件覆写脚本
// 引用链接: https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Lumex_active.js
// 加速链接: https://cdn.jsdelivr.net/gh/int-del/LumexOverwrite@main/Lumex_active.js
// 版本: V4.21-AntiCN  | 更新日期: 2026-10-22
// V4.21: 中转节点名的跳板与落地之间改用「-」(用户要求):中转·香港-自建·台北1·SS,原来全是「·」分不清哪段是跳板。
//      按前缀认节点的 5 条正则(Claude 白名单、Claude / Gemini / ChatGPT / Cursor 兜底排除)同步改成「中转·<跳板>-」。
// V4.20: 全部中转同步给除 EMBY 外的业务组(用户要求):各组 use = 组合机场 + 中转代理集表全部(RELAY_USE);
//      Gemini / ChatGPT / Cursor 的兜底排除改成只查落地部分，不误杀「中转·香港·…」。
// V4.19: 中转统一命名「中转·<跳板>·<落地>」(用户要求):跳板·自建 改名 跳板·综合 并去掉香港家宽(归跳板·香港，两组不重叠);
//      中转代理集改成一张表(代理集名「<落地>经<跳板>」、按机器拆行，用户要求代理集名写明机器):台湾家宽中转→台湾家宽经香港、
//      自建经港→自建台北1SS经综合 / 自建台北2SS经综合、新增自建台北1SS经香港 / 自建台北2SS经香港、自建经台北2→自建台北1SS经台北2。
//      台北2 也开 SS(31625)当落地，于是有 中转·香港 / 中转·综合 → 台北2。
//      跳板·香港 加 empty-fallback: REJECT(现在也承载 SS2022);Claude 组 exclude-filter 只查落地部分，不误杀「中转·香港·」。
// V4.18: 旧机节点改名「自建·台北·…」→「自建·台北1·…」(用户要求，与台北2 对称)。按名字认裸 SS 的三处(组合机场排除、
//      自建经港、自建经台北2)改成「自建·<机器>·SS」通配，Claude 组 filter 改成「自建·台北\d*·」,新旧名字都认——
//      先推本版、本机与工作电脑都点覆写更新后，Sub-Store 才改名，避免改名后裸 SS 漏进自动选择从家里直接过墙。
// V4.17: 新增自建台北2(ByteVirt TW VPS,地址只写在本机 Sub-Store;与旧机同机房、共用密钥;家里到它 68ms,旧机直连 247ms)。
//      它既直接当出口(Sub-Store「自建·台北2·Reality / HY2」,经组合机场进白名单含「台北」的组),也当新跳板组「跳板·台北2」:
//      新代理集「自建经台北2」(旧机 SS 经它,前缀「经台北2·」)、「台湾家宽经台北2」(台湾家宽2 经它)。
//      Claude 组加入台北2 直连、两个经台北2 的中转，并加回经港的「台湾家宽中转」作第二条路;按用户要求只增不删，原有成员都保留。
// V4.16: Claude 组只留自建台北 3 条(经港 SS / Reality / HY2),去掉「台湾家宽中转」(用户 10-20 要求)。
//      「台湾家宽中转」代理集与「跳板·香港」组暂时保留(已无组引用)，要恢复时在 Claude 组 use 与 filter 加回即可。
// V4.15: 「跳板·香港」(台湾家宽中转的跳板)改为按延迟挑选(score-based),香港家宽2A 排第一。依据 10-18 12:20~23:30
//      长测(每路约 3346 次新建连接):经香港家宽2A 与经香港2A 成功率相同(93.3% / 93.8%),但建连中位 306ms 对 1984ms、
//      心跳往返 74ms 对 252ms、卡顿 5.9% 对 29.5%;此前按凌晨三轮把香港2A 排第一，等于默认用慢的那个。
// V4.14: 自建经港改成与台湾家宽同法——Sub-Store 里只放裸 SS2022 节点「自建·台北·SS」(不带 dialer-proxy),
//      由新代理集「自建经港」加 override.dialer-proxy: 跳板·自建 + 前缀「中转·」;组合机场排除这个裸 SS 节点
//      (SS2022 不能从家里直连过墙);除 EMBY 外的业务组 use 加「自建经港」。订阅只描述服务器，选路策略留在覆写。
// V4.13: 自建台湾的经港跳板改为多成员组「跳板·自建」(fallback,score-based,测速打台北 VPS 自己的 /generate_204,
//      测的正是「跳板 → 台北」这一段),删掉单成员的「跳板·香港2 A」「跳板·香港家宽2 A」;两个经港节点在 Sub-Store
//      里合并为一个「自建·台北·经港」。成员是晚高峰从 197 个亚洲候选实测筛出的 9 个(见该组注释)。
// V4.12: DNS 防泄漏(RFC-031,2026-10-18 实测三处泄漏后重排为「国内域名国内解析，其余全部经代理解析」)——
//      ① 默认上游改为 1.1.1.1 / 8.8.8.8 DoH(respect-rules 下走代理);国内 DoH 只管 geosite:cn、厂商条目和直连出站
//        (direct-nameserver),删掉 fallback / fallback-filter。原先默认上游是国内 DoH,没归类的域名先被腾讯/阿里看到;
//        geolocation-!cn 那条里的国内 DoH 也不是「后备」:同一列表里的上游是并发查询(LumexCore dns/util.go batchExchange)。
//      ② GEOIP,telegram 补 no-resolve:它是唯一不带 no-resolve 的 IP 规则，落到它的域名都要先在本地解析一次。
//      ③ 节点域名解析从明文 UDP 改为 IP 直连 DoH,运营商不再看到机场域名。
//      ④ 局域网名(geosite:private,含 .lan / home.arpa / 路由器管理域名)交给网卡 DNS(system,即路由器)。
//      ⚠️ 系统 DNS 明文泄漏只能靠「严格路由」堵，本脚本的 strict-route 会被 Lumex GUI 的 TUN 设置盖掉，见下方 tun 段。
// Add: 自建台湾(wap.ac TW VPS,出口固定 85.237.206.158)—— 经港走 SS2022 经「跳板·自建」,
//      Reality(TCP 443)/ HY2(UDP 8443)直连;各条同一出口 IP,内核在它们之间切换不改变
//      对端看到的地址。节点密钥只在本机 Sub-Store 的本地订阅「自建：台湾」里(并入组合机场合集),本仓库公开,不写密钥。
//      按用户决定放给除 EMBY 外的所有组试效果(Gemini / ChatGPT / Cursor 白名单加「台北」);Claude 组从组合机场只挑「自建·台北·」。
//      ⚠️ VPS 每月 1TB、超出整机限速 2Mbps——自动选择(含 YouTube)走多了会连带 Claude,用量看 Sub-Store 的流量条。
// V4.11: EMBY 组排除自建台湾(按站点哈希分配出口，分到自建的站点会长期走 VPS)。
//      「Claude中转」改名「跳板·香港」(台湾家宽继续用它);自建的跳板组为空时 REJECT,防止 SS2022 从家里直接过墙。
//      2026-10-18 19:50 实测(每路 20 次全新连接):经港家宽2A 0.17s、HY2 0.26s、Reality 1.06s、经港2A 1.96s,全部 20/20。
// Add: BoundaryAI 内网直连 —— hosts 把 pola.boundaryai.com / skillhub.boundaryai.cn 解析到局域网地址，
//      规则最前面加 boundaryai.com / boundaryai.cn 走 DIRECT；DNS 显式 use-hosts: true。
// Fix: Claude 组的台湾家宽改经香港中转 —— 天威直连台湾家宽新建连接成功率只有 45~66%,
//      经香港中转后 93~100%(2026-10-18 凌晨三轮实测,每条约 100 次全新 HTTPS 请求)。
//      瓶颈在家到台湾这一段(天威的普通国际线路),香港 / 日本到台湾几乎不丢;多加一跳日本只会更慢。
//      出口仍是台湾家宽自己的 IP,Claude 看到的地址不变。见下方「台湾家宽中转」代理集与「跳板·香港」组(原名 Claude中转)。
// Fix: Autodesk Fusion 360 的"服务器验证警告"弹窗 —— autodesk.com/autodesk.io 改走 DIRECT。
//      根因不是证书:Fusion 把一切 TLS 层失败都渲染成"无法验证安全证书",而它每分钟几十次
//      云端心跳全落在 GEOSITE,geolocation-!cn → 自动选择(164 节点)上。实测 8s 门限各 20 次,
//      api.aps.usa.autodesk.com 走代理 16/20 通过、直连 19/20 通过,失败率差 4 倍。
//      www.autodesk.com 直连反而慢(~950ms 且超时),单独前置一条留在代理侧。
// Fix: 四个 AI 组加 empty-fallback: REJECT —— 组内节点被 filter 滤空时，内核旧行为是
//      硬编码回落 COMPATIBLE，而 COMPATIBLE 的实现是 outbound.NewCompatible() 返回的
//      *Direct，即**静默直连**：机场一次大改名就能让白名单匹配为 0，Claude/Gemini 的
//      流量带着真实 IP 直连出去且无任何告警。改为 REJECT 后是显式失败，立刻可见。
//      ⚠️ 依赖 LumexCore 570d019b+（移植自上游 1e62d55）。老内核会静默忽略该字段并
//      维持旧行为，故先推不会导致配置加载失败。
// ⚠️  改版本号时必须同步下面 main() 里的 console.log —— 那行是确认客户端有没有拉到
//     新版的唯一手段，V4.3 那次只改了本行、漏了它，导致 2026-08-03~08-12 控制台一直显示 V4.2。
//     update_ver.js 不覆盖本文件（清单里没有，且匹小写 v、日期硬编码），别指望它。
// Fix: 四个 AI 组的地区白名单同样改用 (?<![A-Za-z])XX(?![A-Za-z]) —— \bUS\b 在 regexp2 下
//      匹不上"星链·US专线-原生IP-圣何塞1"（US 紧邻中文"专"，中文算 word 字符故无词边界），
//      21 个美国节点一直被四组静默排除。实测四组各 +21、0 移出。
//      US 一条另去掉后置守卫（写作 (?<![A-Za-z])US），因星链把 US 与线路标识连写成
//      "星链·USVS1倍-IPLC"，带后置守卫会漏掉 4 个；前置守卫仍挡住 AUS/Australia。
//      ⚠️ 这条放宽只对 US 成立：TW/JP/KR/SG/UK/GB/CA/AU 必须保留后置守卫，否则
//      Cambodia 会被 CA 当成加拿大、Australia 会被 AU 命中等。
// Fix: 自动选择/EMBY/Copilot/GitHub Copilot 的封锁地区黑名单改用 (?<![A-Za-z])XX(?![A-Za-z])
//      收紧 —— 原来是裸子串：'Korea' 会连南韩一起挡，'CN' 会挡掉 CN2 GIA 线路名，
//      'RU'/'CU'/'SY' 会命中任意含该子串的名字。内核用 regexp2（非 Go RE2，见
//      groupbase.go 的 regexp2.MustCompile），其 \b 为 Unicode 语义、中文算 word 字符，
//      故不能用 \bXX\b —— 码位紧邻中文时 \b 不成立。实测 290 节点池行为零变化。
//      ⚠️ 黑名单不可加 🇨🇳：微斯用 🇨🇳 给台湾节点打旗（微斯·🇨🇳TW-01），加了会误伤 8 个台湾节点。
// Fix: Gemini/Claude/Cursor/ChatGPT 四个白名单组补 (🇭🇰|香港|🇲🇾|马来) 兜底排除 —— 白名单里的
//      \bSG\b 会匹到节点名末尾的中转标识（"微斯·🇭🇰HK-01 · AWS-SG" 的 AWS-SG），
//      6 个香港 + 2 个马来落地节点因此混进 AI 组；Anthropic/Gemini 对港落地不可用。
//      按落地段的旗帜/中文地区名排除，实测覆盖全部 40 个港马节点、零误伤（中转段无港马标识）。
// Temp: 强制所有 VS Code (Code.exe/Code - Insiders.exe) 相关流量走 Gemini 组
// Sec: 移除硬编码 secret，改为注释说明（防止密码通过公开 CDN 泄露）
// Fix: 修正 skip-auth-prefixes 为 127.0.0.1/32（原 /8 过宽，存在局域网绕过风险）
// Fix: 新增 Statsig 域名分流至 Claude 组（Anthropic A/B 测试与功能开关服务）
// Fix: 新增 Intercom 域名分流至 Claude 组（nexus-websocket-a.intercom.io 等推送通道）
// Fix: 新增 PROCESS-NAME,claude.exe,Claude 进程规则，防止 Claude 桌面端走自动选择
// Fix: 新增 Claude 官方域名分流，强制走 Gemini 组以避开香港/日韩节点封锁
// Fix: 强制 Vertex AI / Gemini API 走 Gemini 分组，防止 SSL 被拦截
// Fix: Telegram 规则顺序、googleapis.cn 策略纠正、TUN LAN 排除
// Opt: Gemini 组排除名称含一分、三毛的节点
// Opt: AI 组 adaptive-cooldown-sec 独立缩短至 60s，加快坏节点恢复
// Opt: ChatGPT/Cursor/Gemini/Claude 组改为白名单过滤，锁定低延迟节点
// Fix: 补全 Copilot/GitHub Copilot 官方封锁地区列表
// Fix: Gemini 组双重排雷 — ipinfo.io IP 归属检测 + Gemini 响应体直接验证（V4.2）
//      V4.1 改用 ipinfo.io 替代 Cloudflare trace，解决 CDN PoP 位置误判问题
//      V4.2 新增 gemini.google.com/app 响应体检测（负向前瞻排除封锁提示），
//      覆盖 ipinfo.io 显示 TW 但 Gemini 仍拦截（数据中心 IP 黑名单）的边缘场景
// Chore: 补充 LumexCore 内核依赖声明及 secret 安全警告
// Compat: 为所有 url-test 组补充标准 url 字段，兼容非 LumexCore 内核（urls 数组为 LumexCore 专属扩展）
// Fix: GEOSITE,github 指回 GitHub Copilot 组（2026-08-09 撤销此前的拆分）— 拆分理由已不成立：两组同为 286 成员、封锁地区 filter 一个节点都没滤掉，而自动选择测 gstatic 对 GitHub 连通性无判别力；且本组健康检查已改测 copilot.github.com（有专属 DOMAIN-SUFFIX 规则、排在 GEOSITE 之前），指回去不会让下面那个循环 bug 复发
// Fix: GitHub Copilot 组健康检查改测 copilot.github.com — 原 api.github.com 命中 GEOSITE,github
//      被路由到自动选择组，从不经过本组，252 个成员的存活与延迟一直测错了目的地
//
// ⚠️  内核依赖声明：本脚本中 adaptive-heavy / adaptive-mode / switch-cost-* /
//     hierarchical-* / bandit-mode 等参数为 LumexCore 定制内核专属扩展，
//     在标准 Lumex 内核下会被静默忽略，需配合 LumexCore 使用才能发挥完整效果。
//
// ⚠️  安全警告：config["secret"] 字段为示例占位值，请在本地替换为强密码，
//     切勿将真实密码提交到公开仓库，否则任何人均可访问你的代理控制 API。

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
  function main(config) {
  // 打印版本号，用于确认是否下载到了最新版
  // eslint-disable-next-line no-console
  console.log("✅ 加载脚本 V4.21-AntiCN (中转名 跳板-落地)...");

  // 关键修复：如果 config 为空，必须返回空对象 {} 而不是 null

  if (!config) {
    return {}; 
  }

  // 1. 基础设置优化
  config["log-level"] = "info"; // 恢复默认 info 日志
  config["tcp-concurrent"] = true;
  config["unified-delay"] = true; // 开启统一延迟，更准确
  config["global-ua"] = "chrome"; // 优化：全局伪装 UA，防止订阅或规则下载被墙/被拦截
  config["keep-alive-idle"] = 15; // 优化：空闲连接保持时间
  config["keep-alive-interval"] = 15; // 优化：空闲连接探测间隔
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  // 开启本地控制面 API，供脚本压测与运行时观测使用
  config["external-controller"] = "127.0.0.1:9090";
  // ⚠️ 请在本地 Lumex.yaml 中手动设置 secret，此处不写入默认值以避免密码泄露至公开仓库。
  // config["secret"] = "YOUR_STRONG_PASSWORD_HERE";
  config["find-process-mode"] = "strict";
  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true // 优化：持久化 Fake-IP 缓存，重启后秒连
  };
  
  // 修复本地回环和 Google 连接问题
  config["skip-auth-prefixes"] = ["127.0.0.1/32", "::1/128"];
  
  // GeoData 优化
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    "geoip": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    "geosite": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    "mmdb": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.metadb"
  };

  // 2. DNS 设置(V4.12 防泄漏：国内域名国内解析，其余全部经代理解析)
  config["dns"] = {
    "enable": true,
    "ipv6": false,
    "cache-algorithm": "arc", // 🚀 极限优化：启用 ARC 缓存算法，大幅提升 DNS 命中率和解析速度
    "cache-max-size": 16384, // 🚀 P1 优化：扩大缓存到 16384 条，大规模节点场景下提升命中率（默认 4096）
    "listen": "0.0.0.0:1053",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "use-hosts": true, // 下方 hosts 靠它生效(mihomo 默认也是 true，显式写出)；GUI 接管 DNS 时其模板为 false，会盖掉本项
    "default-nameserver": ["223.5.5.5", "119.29.29.29"], // 只用来解析 doh.pub / dns.alidns.com 这两个 DoH 主机名
    // 节点域名解析：代理还没连上，只能直连国内。用 IP 直连的 DoH——原先是明文 UDP,运营商能看到每个机场域名。
    // 原 proxy-server-nameserver-policy(cloudflare/tencent/aliyun 后缀各指定 DNS)已删:960 个节点 0 个命中这些后缀，
    // 且 1.1.1.1 的 DoH 从家宽直连超时(2026-10-18 实测),改成加密反而会让命中的节点解析失败。
    "proxy-server-nameserver": ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
    "fake-ip-filter": [
      "*.lan", "*.local", // 优化：防止局域网域名被 Fake-IP 劫持，保障本地设备发现
      "+.msftconnecttest.com", "+.msftncsi.com",
      "+.ntp.org", "+.pool.ntp.org", "+.stun.protocol.org",
      "stun.*", "+.stun.*.*", "+.stun.*",
      "+.nintendo.net", "+.playstation.net", "+.xboxlive.com",
      "time.*.com", "time.*.gov", "time.*.edu.cn", "time.*.apple.com", "time1.cloud.tencent.com",
      "*.bambulab.com", "*.bambulab.cn"
    ],
    // 默认上游：国外 DoH,respect-rules 下按规则走代理。没被下方 policy 认领的域名只有它们看得到。
    // fake-ip 下内核很少需要自己解析：只有直连出站(走 direct-nameserver)、fake-ip-filter 里的域名、
    // 以及不带 no-resolve 的 IP 规则(已全部补上，测试里有校验)才会触发。
    "nameserver": [
      "https://1.1.1.1/dns-query", // Cloudflare DoH
      "https://8.8.8.8/dns-query"  // Google DoH
    ],
    // 直连出站的解析走国内，保证国内 CDN 就近;follow-policy 让直连域名先按下方 policy(如 B 站走腾讯)。
    "direct-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "direct-nameserver-follow-policy": true,
    // ⚠️ 同一条里列多个上游是并发查询、取最先返回的(LumexCore dns/util.go batchExchange),不是主备:
    // 国外域名的条目里混进国内 DoH,每次都会被国内看到(V4.11 及以前的 geolocation-!cn 就是这样)。
    "nameserver-policy": {
      "geosite:category-ads-all": "rcode://success", // 🚀 极限优化：DNS 级别直接屏蔽广告，节省 CPU 和内存
      // 局域网名(.lan / home.arpa / 局域网反向解析 / 路由器管理域名)交给网卡 DNS,即路由器。内核会排除 TUN 自己的 DNS 地址。
      "geosite:private": "system",
      "geosite:cn": "https://dns.alidns.com/dns-query",
      // fake-ip-filter 里走直连的域名按直连口径国内解析：联网检测(规则 DOMAIN-SUFFIX → DIRECT)与 NTP 校时(DST-PORT,123 → DIRECT)。
      "+.msftconnecttest.com,+.msftncsi.com": "https://dns.alidns.com/dns-query",
      "+.ntp.org,time.*.com,time.*.gov,time.*.edu.cn,time1.cloud.tencent.com": "https://dns.alidns.com/dns-query",
      "geosite:apple": "https://dns.alidns.com/dns-query",
      "+.icloud.com": "https://dns.alidns.com/dns-query",
      "+.icloud-content.com": "https://dns.alidns.com/dns-query",
      "+.mzstatic.com": "https://dns.alidns.com/dns-query",
      "+.apple.com": "https://dns.alidns.com/dns-query",
      "+.bambulab.cn": "https://doh.pub/dns-query",
      "+.bambulab.com": "https://doh.pub/dns-query",
      "+.bilibili.com": "https://doh.pub/dns-query", // 优化：B站走腾讯 DNS 解析更准
      "+.qq.com": "https://doh.pub/dns-query", // 优化：腾讯系走腾讯 DNS
      "+.taobao.com": "https://dns.alidns.com/dns-query", // 优化：阿里系走阿里 DNS
      "+.aliyun.com": "https://dns.alidns.com/dns-query"
    }
  };

  // 2.1 hosts 直连解析：BoundaryAI 内网服务固定解析到局域网地址(并入已有 hosts，不覆盖)
  if (!config["hosts"] || typeof config["hosts"] !== "object") {
    config["hosts"] = {};
  }
  config["hosts"]["pola.boundaryai.com"] = "192.168.1.200";
  config["hosts"]["skillhub.boundaryai.cn"] = "192.168.1.67";

  // 3. Tun 模式
  config["tun"] = {
    "enable": true,
    "stack": "system", // 🔴 P0 修复：改为 system 栈，Windows 下性能最佳且兼容性更好
    "mtu": 1500, // 🔴 P0 修复：改为标准 MTU，避免公网环境巨型帧分片导致性能下降
    "auto-route": true,
    "auto-detect-interface": true,
    // 严格路由(Windows):拦截 TUN 以外的 53 端口——系统多网卡并发查询，会把明文 DNS 直接发给路由器 / 运营商;
    // TUN 没有 IPv6 地址时还拦掉内核以外的全部 IPv6。⚠️ Lumex GUI 的 TUN 设置会盖掉本段同名键，本项只对不接管 TUN
    // 的客户端生效;Lumex 里要在「TUN」页打开(GUI 2026-10-18 起 Windows 新装默认开，被盖掉时日志会报)。
    "strict-route": true,
    "endpoint-independent-nat": true,
    "dns-hijack": ["any:53"],
    // 🔴 P0 修复：strict-route+system 栈下排除 LAN 段，防止局域网流量被 TUN 捕获导致 ERR_EMPTY_RESPONSE
    "inet4-route-exclude-address": [
      "192.168.0.0/16",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "169.254.0.0/16"
    ]
  };

  // 4. Sniffer 设置
  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": true,
    "override-destination": true,
    "sniff": {
      "HTTP": { "ports": [80, 8080, 8880], "override-destination": true },
      "TLS": { "ports": [443, 8443] },
      "QUIC": { "ports": [443, 8443] } // 优化：开启 QUIC 嗅探，配合规则中的 QUIC REJECT 效果更好
    },
    "skip-domain": [
      "+.apple.com", // 优化：防止苹果推送服务断连
      "Mijia Cloud", // 优化：防止米家设备掉线
      "+.qq.com", // 优化：防止腾讯系游戏/语音因严格校验断连
      "+.music.tc.qq.com", // 优化：防止 QQ 音乐无损音质播放失败
      "+.aliyuncs.com", // 优化：防止阿里云盘等服务报错
      "*.lan", "*.local" // 优化：防止局域网特殊协议被误伤
    ]
  };

  // 5. Rule Providers (已废弃 - 全面转向 Geosite)
  // ❌ 移除所有外部规则源，消除网络依赖，大幅提升启动速度
  config["rule-providers"] = {}; 

  // 6. Proxy Providers (代理集)
  // 动态引入外部订阅链接，自动解析 base64 节点信息
  config["proxy-providers"] = {
    "组合机场": {
      "type": "http",
      "adaptive-heavy": true,
      "url": "http://127.0.0.1:38324/download/collection/%E7%BB%84%E5%90%88%E6%9C%BA%E5%9C%BA",
      "path": "./proxy_providers/组合机场.yaml",
      "interval": 86400, // 优化：将自动刷新降低到24小时一次，防止反复清空历史测速记录导致待测速
      // 排除 IPv6 节点:本配置 ipv6 为 false(见上方),IPv6-only 服务器连不上;2026-10-16 实测 13 个此类节点 10 轮全败,
      // 却每轮被所有组测满(RFC-027 C2)。改回 ipv6: true 时一并删除 ipv6 这一项。
      "filter": "(?i)^(?!.*(流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新|ipv6)).*",
      // 合集里含自建台湾(Sub-Store 本地订阅「自建：台湾」并入本合集，随 Group.yaml 同步到 Gist;密钥只在本机 Sub-Store,
      //   本仓库公开不写):旧机 wap.ac 的「自建·台北1·Reality / HY2」和裸 SS2022「自建·台北1·SS」(10-21 前叫「自建·台北·…」),
      //   新机 ByteVirt 的「自建·台北2·Reality / HY2」和裸 SS2022「自建·台北2·SS」(10-22 起)。两台的 HY2 10-22 起注释掉。
      //   2026-10-18 起按用户决定放给除 EMBY 外的所有组试效果——Reality / HY2 经本代理集直接可见(Gemini / ChatGPT /
      //   Cursor 的地区白名单为此加了「台北」,EMBY 组用 exclude-filter 排除);SS 只经下方中转代理集带跳板提供。
      //   ⚠️ 裸 SS 节点必须在这里排除：它不带跳板，进了自动选择等组会让 SS2022 从家里直接过墙，全加密流量会被识别，
      //   台北 IP 可能被封。这里按「自建·<机器>·SS」通配，不写死机器名(V4.18):新加机器的裸 SS 一进 Sub-Store 就被排除，
      //   不必先改覆写(SS 节点名保持这个格式，中间段不能含「·」);要让它经跳板可用，再在下方中转代理集表里加行。
      //   ⚠️ 旧机每月 1TB、超出整机限速 2Mbps(Claude 一起变慢到重置日);用量看 Sub-Store 订阅「自建：台湾」的流量条。
      //   节点名必须保持「自建·台北N·…」(Sub-Store 订阅里不要加改名操作),Claude 组 filter 按这个前缀认。
      "exclude-filter": "^自建·[^·]+·SS$",
      "health-check": {
        "enable": true,
        "hierarchical": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 240, // 🎯 平衡点：240s 保持高频但避免过度采样，网络稳定时间充足
        "expected-status": "204" // 🚀 依赖 Lumex 1.18+ 内核功能：预期的 HTTP 状态码，防流量耗尽/被墙等假连通情况 (自动踢出跳转节点的防挂神器)
      }
    }
  };

  // ── 中转代理集 = 跳板 × 落地(V4.19 起按用户要求统一命名)──
  //   节点名「中转·<跳板>-<落地节点名>」(V4.21 起跳板与落地之间用「-」,一眼分开两段),代理集名「<落地>经<跳板>」,一眼看出走哪个跳板、在哪出口。
  //   跳板组:跳板·香港(香港家宽2A / 香港2A)、跳板·综合(新加坡 / 日本 / 三毛专线，不含香港家宽)、跳板·台北2(新台北机 Reality)。
  //   三个跳板组都必须 empty-fallback: REJECT——组为空时回落直连，会让 SS2022 从家里直接过墙。改跳板组名时同步下表。
  //   落地：自建裸 SS2022「自建·<机器>·SS」(Sub-Store 里只描述服务器，走哪个跳板是本机的选路策略，写在这里;
  //   组合机场按通配把所有裸 SS 排除了，它们只从下表的代理集出现)、台湾家宽2(VLESS)。
  //   加落地机器或跳板就在表里加行(V4.18 的通配写法会让一个代理集装多台机器，名字只能写跳板;用户要代理集名写明机器，故按机器拆行)。
  // 每行：[代理集名, 落地节点 filter, 跳板组(dialer-proxy), 节点名前缀]
  //   除 EMBY 外的业务组和 Claude 组都用表里全部代理集(V4.20,用户要求，见下方 RELAY_USE)。
  const RELAY_SOURCE = "http://127.0.0.1:38324/download/collection/%E7%BB%84%E5%90%88%E6%9C%BA%E5%9C%BA"; // 与「组合机场」相同
  const RELAYS = [
    // 台湾家宽2：只收 VLESS,「台湾家宽1」是 Hysteria2(UDP)，叠不到 VLESS 中转后面，实测全部失败。
    //   V4.19 前叫「台湾家宽中转」(前缀「中转·」)与「台湾家宽经台北2」(前缀「经台北2·」)。
    //   经台北2：新机到台湾家宽2 A 入口 39ms、0 丢包;B 入口从新机不通(从家里也长期不通)，测速失败不会被选上。
    ["台湾家宽经香港", "^悦·.*台湾家宽2", "跳板·香港", "中转·香港-"],
    ["台湾家宽经台北2", "^悦·.*台湾家宽2", "跳板·台北2", "中转·台北2-"],
    // 自建 SS(V4.19 前是「自建经港」,跳板叫「跳板·自建」;V4.19 时业务组只用经综合的两个，V4.20 起全部)。
    //   台北1 经香港家宽(10-21 测速 244ms,各成员里最快)在跳板·综合去掉香港家宽后靠「自建台北1SS经香港」保留。
    //   台北2 不经台北2 自己转;台北1 经台北2:新机到旧机 0.6ms,出口仍是旧机。
    ["自建台北1SS经香港", "^自建·台北1·SS$", "跳板·香港", "中转·香港-"],
    ["自建台北2SS经香港", "^自建·台北2·SS$", "跳板·香港", "中转·香港-"],
    ["自建台北1SS经综合", "^自建·台北1·SS$", "跳板·综合", "中转·综合-"],
    ["自建台北2SS经综合", "^自建·台北2·SS$", "跳板·综合", "中转·综合-"],
    ["自建台北1SS经台北2", "^自建·台北1·SS$", "跳板·台北2", "中转·台北2-"]
  ];
  // 业务组和 Claude 组的 use:组合机场 + 上表全部中转代理集。各组用 .slice() 拿一份拷贝——共用同一个数组，
  //   导出 YAML 时可能变成锚点 / 别名(&ref / *ref)。
  const RELAY_USE = ["组合机场"].concat(RELAYS.map(function(r) { return r[0]; }));
  RELAYS.forEach(function(r) {
    config["proxy-providers"][r[0]] = {
      "type": "http",
      "url": RELAY_SOURCE,
      "path": "./proxy_providers/" + r[0] + ".yaml",
      "interval": 86400,
      "filter": r[1],
      "override": {
        "dialer-proxy": r[2], // 必须与下方跳板组的 name 逐字一致
        "additional-prefix": r[3]
      },
      "health-check": {
        "enable": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 240,
        "expected-status": "204"
      }
    };
  });

  // 全适应 active 全量接管：统一为所有 provider 注入可用重型参数
  if (config["proxy-providers"] && typeof config["proxy-providers"] === "object") {
    Object.keys(config["proxy-providers"]).forEach(function(name) {
      const provider = config["proxy-providers"][name];
      if (!provider || typeof provider !== "object") {
        return;
      }

      provider["adaptive-heavy"] = true;

      if (!provider["health-check"] || typeof provider["health-check"] !== "object") {
        provider["health-check"] = { "enable": true };
      }

      provider["health-check"]["enable"] = true;
      provider["health-check"]["hierarchical"] = true;

      // 保守默认值：只在未显式配置时补齐
      if (provider["health-check"]["hierarchical-timeout"] === undefined) {
        provider["health-check"]["hierarchical-timeout"] = 3000;
      }
      if (provider["health-check"]["hierarchical-jitter"] === undefined) {
        provider["health-check"]["hierarchical-jitter"] = 80;
      }
      if (provider["health-check"]["hierarchical-fail-streak"] === undefined) {
        provider["health-check"]["hierarchical-fail-streak"] = 2;
      }
    });
  }

  // ============================================================
  // proxy-groups 扁平化重构区
  // ============================================================

  // 跳板组图标：Material Design Icons「transit-connection-variant」(Apache-2.0)——起点经中间一站到终点。
  //   内联 SVG,GUI 原生支持(以 <svg 开头的 icon 直接渲染)，不依赖外部图床。颜色写 rgb() 而不是 #hex:
  //   GUI 把它拼成 data:image/svg+xml;utf8,… 的 URI,# 会被当成 URI 片段把后半截丢掉。
  const RELAY_ICON = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='rgb(30,136,229)' d='M18 11h-3.18C14.4 9.84 13.3 9 12 9s-2.4.84-2.82 2H6c-.33 0-2-.1-2-2V8c0-1.83 1.54-2 2-2h10.18C16.6 7.16 17.7 8 19 8a3 3 0 0 0 3-3a3 3 0 0 0-3-3c-1.3 0-2.4.84-2.82 2H6C4.39 4 2 5.06 2 8v1c0 2.94 2.39 4 4 4h3.18c.42 1.16 1.52 2 2.82 2s2.4-.84 2.82-2H18c.33 0 2 .1 2 2v1c0 1.83-1.54 2-2 2H7.82C7.4 16.84 6.3 16 5 16a3 3 0 0 0-3 3a3 3 0 0 0 3 3c1.3 0 2.4-.84 2.82-2H18c1.61 0 4-1.07 4-4v-1c0-2.93-2.39-4-4-4m1-7a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1M5 20a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1a1 1 0 0 1-1 1'/></svg>";

  // 1. 定义扁平化的 Proxy Groups
  config["proxy-groups"] = [
    {
      "name": "自动选择",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Urltest.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "^(?!.*(俄罗斯|Russia|🇷🇺|(?<![A-Za-z])RU(?![A-Za-z])|朝鲜|北韩|North ?Korea|🇰🇵|(?<![A-Za-z])KP(?![A-Za-z])|古巴|Cuba|🇨🇺|(?<![A-Za-z])CU(?![A-Za-z]))).*", // 排除 RU/KP/CU；码位两侧禁字母，见文件头 Fix
      "url": "https://www.gstatic.com/generate_204", // 标准 Lumex 兼容字段（非 LumexCore 内核使用此值）
      "urls": [
        {
          "url": "https://www.gstatic.com/generate_204",
          "weight": 0.6,
          "expected-status": "204"
        },
        {
          "url": "https://cdn.jsdelivr.net/",
          "weight": 0.4,
          // 2026-10-16 内核 delay API 实测(HEAD):根路径返回 301,原清单 200 让正常节点全判失败(RFC-027 C1)
          "expected-status": "200/301/302"
        }
      ],
      "interval": 240, // 🎯 关键组基准周期
      "tolerance": 80, // 🎯 平衡容差：80ms 足以应对临界切换需求，但不易被抖动触发
      "lazy": true // 🎯 平衡模式：只在使用时测速，节省资源同时保证响应
    },
    {
      "name": "EMBY",
      // 🎬 SAGE-Media active（RFC-011）：QoE 门禁 + rendezvous 择优接管选路,
      //   会话粘滞保留(单会话单 IP,公益源风控友好),拨号失败秒切 standby。
      //   shadow 验证结论(2026-07-12):103/103 决策与哈希基线分歧,基线把主力服
      //   钉在越南1(首帧 26s/卡顿 154s 实测),遂授权接管。回滚 = 改回 "shadow"。
      // 🔀 type 写 url-test + lumex-type: media-balance,让本文件同时可给标准 mihomo(Mihomo Party)用:
      //   标准内核不认识 lumex-type、按 url-test 运行;LumexCore 按 media-balance 构造,media-* 照常生效。
      //   ⚠️ 依赖 LumexCore 支持 lumex-type 的版本;旧内核会静默退化成 url-test。回滚 = type 改回 "media-balance"。
      "type": "url-test",
      "lumex-type": "media-balance",
      "tolerance": 100, // 仅标准 mihomo 走 url-test 时生效;media-balance 不读该字段
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Emby.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|🇷🇺|(?<![A-Za-z])RU(?![A-Za-z])|朝鲜|北韩|North ?Korea|🇰🇵|(?<![A-Za-z])KP(?![A-Za-z])|古巴|Cuba|🇨🇺|(?<![A-Za-z])CU(?![A-Za-z])|日本|Japan|🇯🇵|(?<![A-Za-z])JP(?![A-Za-z]))).*", // 额外排除日本节点
      // 不用自建台湾(VPS 每月 1TB):本组按站点哈希分配出口，分到自建的站点会长期走 VPS,视频几天就能吃光流量。
      "exclude-filter": "^自建·",
      "url": "https://www.gstatic.com/generate_204", // 组内节点存活检查（media-balance 不支持多 URL 加权）
      "interval": 600, // 🎯 非关键业务：降低检测频率，减少不必要的连接
      "lazy": true, // 🎯 非关键业务：延迟测速，进一步节省开销
      "media-mode": "active", // off / shadow / canary / active；2026-07-12 起 active 接管
      "media-session-ttl-sec": 1800, // 空闲超时；播放活动自动续期，长片不会中途换出口
      "media-max-retrans-sample-rate": 0.05, // 门禁：重传采样率上限
      "media-load-bias": 1.0, // 活跃流降权指数（0-4，越大越均衡）
      "media-active-stream-min-age-sec": 10, // 连接存活≥10s 才计为活跃媒体流
      "media-racing-ms": 250, // 主节点 250ms 未建连时竞速 standby；0 禁用
      "media-qoe-future-primary": true // 缓存告急时把该会话"下一条"媒体连接预热到 standby；绝不关闭当前连接
    },
    {
      "name": "Gemini",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Google.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      // 🚀 白名单锁定亚洲低延迟 + 美国兜底，JP/KR 已确认 Gemini 可用
      "filter": "(?i)(台湾|台北|Taiwan|(?<![A-Za-z])TW(?![A-Za-z])|日本|Japan|(?<![A-Za-z])JP(?![A-Za-z])|韩国|Korea|(?<![A-Za-z])KR(?![A-Za-z])|新加坡|Singapore|(?<![A-Za-z])SG(?![A-Za-z])|美国|(?<![A-Za-z])US)",
      // 剔除“一分”“三毛”，并兜底排除港/马来落地（见文件头 Fix 说明）。只查落地部分：中转节点跳过「中转·<跳板>-」再查，
      //   否则「中转·香港·…」会因跳板名被误杀(与 Claude 组同一写法，V4.20)
      "exclude-filter": "^(?:中转·[^·-]+-|(?!中转·))(?=.*(一分|一毛|三毛|🇭🇰|香港|🇲🇾|马来))",
      "empty-fallback": "REJECT", // 白名单滤空时显式失败，不回落直连（见文件头 Fix 说明）
      "url": "https://gemini.google.com", // 标准 Lumex 兼容字段
      // 🚀 多 URL 健康检查配置(RFC-027 C1,2026-10-16 改)
      //   1. gemini.google.com(主判据,HEAD)— 每轮健康检查都测,只看可达。与 url 保持一致。
      //   2. Cloudflare trace 国别(解锁判据,带 expected-body)— 只在换节点前与在位者复查时测,排除 IP 归属 CN/HK 的出口。
      //      trace 的 loc 是 Cloudflare 按访问者 IP 判定的国家(数据中心位置是 colo 字段),内核 Gemini 探针用的也是它。
      //      不再用 ipinfo.io:机场出口 IP 多人共享,实测返回 429 限频,会把正常节点判成「不符」。
      //   3. gemini.google.com/app(只保留地址,url-test 回退模式加权用)— 原负向前瞻在只读前缀时恒「通过」,
      //      内核 Gemini 探针所认的可用性标记在新版页面里也已找不到,不再作为判据。
      "urls": [
        {
          "url": "https://gemini.google.com",
          "weight": 0.5,
          "expected-status": "200/301/302"
        },
        {
          "url": "https://www.cloudflare.com/cdn-cgi/trace",
          "weight": 0.2,
          "expected-status": "200",
          "expected-body": "(?m)^loc=(?!CN|HK)[A-Z]{2}$" // IP 归属 CN/HK → 不符
        },
        {
          "url": "https://gemini.google.com/app",
          "weight": 0.3,
          "expected-status": "200/301/302"
        }
      ],
      "interval": 300, // 🎯 AI 核心业务：5 分钟周期保证即时性
      "tolerance": 60, // 🎯 敏感但稳定：60ms 应对实际网络条件
      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组：加快坏节点恢复，loop 默认 180s 过长
      "adaptive-stage-cooldown-sec": 300, // 🔥 缩短阶段冷却至 5 分钟
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Claude",
      "type": "url-test",
      "icon": "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
      // 自建直连 Reality 在组合机场;中转「中转·<跳板>-<落地>」各在自己的代理集(见 proxy-providers 的中转代理集说明)
      "use": RELAY_USE.slice(),
      // 🚀 2026-10-21 起(用户选「几种出口都放、自动选」):出口有三个 IP,全部在台湾——台北2(直连、经香港、经综合)、
      //   旧机 85.237.206.158(直连、经香港、经综合、经台北2)、台湾家宽2 的 HiNet 家宽 IP(经香港、经台北2)。
      //   按测速自动选;切换时 Claude 看到的 IP 会变。自建 HY2 10-22 起在 Sub-Store 注释掉(晚高峰 QUIC 被切)。
      // 2026-10-20 ~ 10-21 只留自建台湾 3 条(经港 SS / Reality / HY2),出口固定 85.237.206.158,3 条之间切换不改变出口 IP。
      //   之前(10-18 晚起)还有中转·悦·台湾家宽2 A/B(HiNet 家宽 IP),用户 10-20 要求去掉。
      //   3 条都挂时 Claude 连接会失败(组里没有别的节点)，不会落到其他地区;订阅改名把 3 条都滤掉时按 empty-fallback 拒绝。
      // 以下为此前只用台湾家宽中转(2 个)时的记录：
      //   2026-10-14：原白名单横跨台/日/韩/新/美五地 170 个成员，只能手动锁定防跨国跳 IP，
      //   锁定的台湾家宽2 A 建连超时时救援被 manual-pin 挡住，claude.exe 连续断流；
      //   收窄到同一地区后可解除锁定，坏了在台湾家宽之间自动换。
      //   2026-10-18：直连台湾家宽新建连接只有 45~66% 成功，改用「台湾家宽中转」代理集(经香港中转，93~100%)；
      //   Hysteria2 的「台湾家宽1」叠不上中转，不再收。
      // 直连：自建·台北N·(组合机场已排除裸 SS,这里只会进 Reality);中转：中转·<任一跳板>·<自建台北N 或 悦·台湾家宽2>
      "filter": "^(自建·台北\\d*·|中转·[^·-]+-(自建·台北\\d*·|悦·.*台湾家宽2))",
      // 兜底排除港/马来等落地，只看落地部分：中转节点跳过「中转·<跳板>-」再查(否则「中转·香港·…」会因跳板名被误杀)，
      //   其他节点查全名。自建节点名里不能出现「香港」/🇭🇰。
      "exclude-filter": "^(?:中转·[^·-]+-|(?!中转·))(?=.*(三毛|一毛|一分|🇭🇰|香港|🇲🇾|马来|星链))", // 见文件头 Fix 说明
      "empty-fallback": "REJECT", // 白名单滤空时显式失败，不回落直连（见文件头 Fix 说明）
      "url": "https://api.anthropic.com", // 标准 Lumex 兼容字段
      // 第 1 条是主判据(每轮健康检查都测，只看可达)；第 3 条带 expected-body，是解锁判据(RFC-027 R1)，
      //   只在换节点前与在位者复查时测。GUI「解锁判据生效」关闭时只记账，打开后不符的节点不会被换上、在位者明显不符时救援。
      "urls": [
        {
          "url": "https://api.anthropic.com",
          "weight": 0.6,
          // 2026-10-15 实测:根路径恒返回 404(API 只在 /v1/* 下),原清单让正常节点全判失败
          "expected-status": "200/301/302/307/308/404"
        },
        {
          "url": "https://claude.ai",
          "weight": 0.2,
          // 2026-10-15 实测:非浏览器请求被 Cloudflare 挑战页拦为 403,原清单让正常节点全判失败
          "expected-status": "200/301/302/307/308/403"
        },
        {
          // 出口地区必须与节点名一致(本组只收台湾家宽)。claude.ai 就在 Cloudflare 后面，trace 的 loc 是 Cloudflare
          //   按访问者 IP 判定的国家——也就是 Claude 那一侧看到的地区(数据中心位置是 colo 字段，不看)。
          //   防订阅换了后端、名字仍叫台湾、出口却落到香港等 Anthropic 不支持的地区。改本组地区时同步改这里。
          "url": "https://claude.ai/cdn-cgi/trace",
          "weight": 0.2,
          "expected-status": "200",
          "expected-body": "(?m)^loc=TW$", // 出口不在台湾 → 不符
          // RFC-028 严格判据:不符的节点不得承载流量,换到已证明符合的节点,没有就拒绝连接(手动固定的节点放行)。
          //   GUI「解锁判据生效」关闭时只记账。需要支持 on-mismatch 的 LumexCore;老内核与标准 mihomo 忽略本字段。
          "on-mismatch": "reject"
        }
      ],
      "interval": 300,
      "tolerance": 60,
      "adaptive-cooldown-sec": 60,
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false
      // 🔬 RFC-022 canary 已回退（2026-08-09）：开启周期 scoped 健康检查后本组合格候选
      //   从 25 掉到 2/94，实际可用性有风险。not-fresh 确实降为 0（调度器工作正常），
      //   但暴露出更底层的问题：同一节点在三个 scoped 层级
      //   （plain / #scope=group / #scope=group&provider）上的 alive 互相矛盾，
      //   而 candidateProbeState 按时间取最新，判定随刷新顺序漂移；周期化只是加剧了漂移。
      //   查清该问题前不要重开 "scoped-health-check": true。
    },
    // —— 跳板组：只当前置跳板，不承载业务流量(规则不指向它们)，图标统一 RELAY_ICON ——
    {
      // 「台湾家宽经香港」「自建台北1SS经香港」「自建台北2SS经香港」的跳板(2026-10-18 晚由「Claude中转」改名)。中转只换「家 → 台湾」这一段路，
      //   来回切换也不改变 Claude 看到的出口 IP。V4.19 起也给自建 SS 当跳板，所以加了 empty-fallback: REJECT。
      // 2026-10-19 起按延迟挑选(score-based):每次新建连接在存活成员里选最近一次健康检查延迟最低的(每 120 秒测一次，
      //   无容差)。依据 10-18 12:20~23:30 长测(每路约 3346 次新建连接):
      //   - 经 悦·🇭🇰香港家宽2💎 · A:成功 93.3%,建连中位 306ms / P90 946ms,心跳往返 74ms,卡顿 5.9%
      //   - 经 悦·🇭🇰香港2 · A:成功 93.8%,建连中位 1984ms / P90 4008ms,往返 252ms,卡顿 29.5%(入口其实在日本 So-net,绕一圈)
      //   两条失败几乎独立(同轮同时失败 0.5%);晚高峰 19、21 点两条都降到 81~84%。凌晨三轮曾显示香港2A 更稳，长测不成立。
      //   测速打 gstatic,测的是「家 → 香港节点」(两条的差距就在这一段),测不到「香港 → 台湾家宽」——机场节点没法放测速地址。
      //   香港家宽2A 排第一：没有成员测出延迟时(刚启动 / 都不存活)score-based 退回列表第一个。
      //   两个都被订阅改名滤掉时组为空，必须 REJECT(V4.19 前是回落直连，那时只承载台湾家宽 VLESS;现在也承载自建 SS2022,
      //   回落直连会让它从家里直接过墙)。
      "name": "跳板·香港", // 改名时同步上方中转代理集表里的跳板组
      "type": "fallback",
      "icon": RELAY_ICON,
      "use": ["组合机场"],
      "filter": "^悦·🇭🇰香港家宽2💎 · A$`^悦·🇭🇰香港2 · A$",
      "score-based": true,
      "url": "https://www.gstatic.com/generate_204",
      "expected-status": "204",
      "interval": 120,
      "lazy": false,
      "empty-fallback": "REJECT"
    },
    {
      // 自建 SS2022 节点的综合跳板：上方「自建台北1SS经综合」「自建台北2SS经综合」的 dialer-proxy 指向本组(改名时同步中转代理集表)。
      //   V4.19 起由「跳板·自建」改名，并按用户要求去掉悦·香港家宽2 A(香港家宽归「跳板·香港」,两组成员不重叠，坏也不一起坏)。
      //   三毛 2x 专线-香港仍在本组(专线不是家宽)。
      //   测速地址是台北 VPS 自己的 /generate_204(VPS 上 traffic-info 服务提供，公开、只回 204),测的正是
      //   「家 → 跳板 → 台北」这一段;score-based 在存活成员里挑这段延迟最低的。不测 gstatic:到 gstatic 快≠到台北快。
      //   成员来自 2026-10-18 晚高峰实测(家→跳板→台北 SS2022→api.anthropic.com 全新连接各 40 次全成功，
      //   跳板→台北 UDP 丢包 1.4~2.4%;197 个亚洲候选筛出)。按用户决定不管倍率;名字带「勿跑大流量」的不收。
      //   悦·香港2 A(入口在日本 So-net,中位 2.44s、入口丢包 23%)是候选里最差的，不收。
      //   三毛 2x 专线 23:07 复测时整体不通(与跳板自身建会话失败),测速会自动跳过，恢复后再被选上。
      //   为空(订阅改名把成员全滤掉)时必须 REJECT:回落直连会让 SS2022 从家里直接过墙，全加密流量会被识别，
      //   台北 IP 可能被封。成员全挂时 score-based 仍拨第一个成员(失败),不会直连。
      //   三毛节点名里的 | 是字面字符，filter 里必须写成 \\|,否则变成「或」会多匹配一串节点。
      "name": "跳板·综合",
      "type": "fallback",
      "icon": RELAY_ICON,
      "use": ["组合机场"],
      "filter": "^悦·🇸🇬新加坡AI解锁2💎 · [AB]$`^悦·🇯🇵日本AI解锁2💎 · [AB]$`^三毛·新加坡1\\|高速下载\\|移动优化$`^三毛·2x专线-(日本-1|香港-[12])$",
      "score-based": true,
      "url": "http://85.237.206.158:39078/generate_204",
      "expected-status": "204",
      "interval": 120,
      "lazy": false,
      "empty-fallback": "REJECT"
    },
    {
      // 新台北机(ByteVirt,2026-10-21)当跳板：上方「自建台北1SS经台北2」「台湾家宽经台北2」两个代理集的
      //   override.dialer-proxy 指向本组(改名时同步)。家里到它 68ms,它到旧机 0.6ms、到台湾家宽2 A 入口 39ms。
      //   成员是它自己的 Reality / HY2(Sub-Store「自建：台湾」),score-based 挑延迟低的;晚高峰家里到台湾的 UDP 常整段不通
      //   (10-21 23:00 两台的 HY2 和机场台湾家宽1 同时全失败)，这时 HY2 测不通，自动用 Reality。
      //   测速打 gstatic:新机就在台北，到 gstatic 通基本等于它本身可用;不打旧机的 /generate_204,免得旧机挂了连带台湾家宽也不能用。
      //   为空(订阅改名把成员全滤掉)时必须 REJECT:回落直连会让旧机的 SS2022 从家里直接过墙，全加密流量会被识别。
      "name": "跳板·台北2",
      "type": "fallback",
      "icon": RELAY_ICON,
      "use": ["组合机场"],
      "filter": "^自建·台北2·(Reality|HY2)$",
      "score-based": true,
      "url": "https://www.gstatic.com/generate_204",
      "expected-status": "204",
      "interval": 120,
      "lazy": false,
      "empty-fallback": "REJECT"
    },
    {
      "name": "Copilot",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Microsoft.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "^(?!.*(俄罗斯|Russia|🇷🇺|(?<![A-Za-z])RU(?![A-Za-z])|朝鲜|北韩|North ?Korea|🇰🇵|(?<![A-Za-z])KP(?![A-Za-z])|古巴|Cuba|🇨🇺|(?<![A-Za-z])CU(?![A-Za-z])|中国|China|(?<![A-Za-z])CN(?![A-Za-z0-9]))).*", // 补全：排除 RU/KP/CU/CN
      "url": "https://www.bing.com", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://www.bing.com",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://copilot.microsoft.com",
          "weight": 0.3,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 300, // 🎯 核心业务 Copilot
      "tolerance": 60,

      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "GitHub Copilot",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/github.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "^(?!.*(俄罗斯|Russia|🇷🇺|(?<![A-Za-z])RU(?![A-Za-z])|朝鲜|北韩|North ?Korea|🇰🇵|(?<![A-Za-z])KP(?![A-Za-z])|古巴|Cuba|🇨🇺|(?<![A-Za-z])CU(?![A-Za-z])|伊朗|Iran|🇮🇷|(?<![A-Za-z])IR(?![A-Za-z])|叙利亚|Syria|🇸🇾|(?<![A-Za-z])SY(?![A-Za-z])|白俄罗斯|Belarus|🇧🇾|(?<![A-Za-z])BY(?![A-Za-z])|中国|China|(?<![A-Za-z])CN(?![A-Za-z0-9]))).*", // 补全：官方封锁全列表
      "url": "https://copilot.github.com", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://copilot.github.com",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://api.githubcopilot.com",
          "weight": 0.3,
          // 实测 404:该端点无鉴权时必然 404,但 404 证明 TLS+HTTP 已抵达真实服务器,
          // 正是健康检查要测的东西。不列入则这条检查恒失败(原 copilot-proxy 即如此)。
          "expected-status": "200/301/302/307/308/404"
        }
      ],
      "interval": 360, // 🎯 开发工具业务：6 分钟周期
      "tolerance": 60,

      "lazy": true // 🎯 非实时性业务：延迟测速
    },
    {
      "name": "Cursor",
      "type": "url-test",
      "icon": "https://www.google.com/s2/favicons?domain=cursor.com&sz=128",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "(?i)(美国|(?<![A-Za-z])US|日本|Japan|(?<![A-Za-z])JP(?![A-Za-z])|新加坡|Singapore|(?<![A-Za-z])SG(?![A-Za-z])|台湾|台北|Taiwan|(?<![A-Za-z])TW(?![A-Za-z])|英国|(?<![A-Za-z])UK(?![A-Za-z])|(?<![A-Za-z])GB(?![A-Za-z])|加拿大|(?<![A-Za-z])CA(?![A-Za-z])|澳大利亚|Australia|(?<![A-Za-z])AU(?![A-Za-z]))",
      // 兜底排除港/马来落地（见文件头 Fix 说明）;只查落地部分，不误杀「中转·香港·…」(与 Claude 组同一写法，V4.20)
      "exclude-filter": "^(?:中转·[^·-]+-|(?!中转·))(?=.*(三毛|一毛|一分|🇭🇰|香港|🇲🇾|马来))",
      "empty-fallback": "REJECT", // 白名单滤空时显式失败，不回落直连（见文件头 Fix 说明）
      "url": "https://api2.cursor.sh", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://api2.cursor.sh",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://www.cursor.com",
          "weight": 0.3,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 300, // 🎯 开发工具核心业务：5 分钟周期
      "tolerance": 60,
      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "ChatGPT",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "(?i)(美国|(?<![A-Za-z])US|日本|Japan|(?<![A-Za-z])JP(?![A-Za-z])|新加坡|Singapore|(?<![A-Za-z])SG(?![A-Za-z])|台湾|台北|Taiwan|(?<![A-Za-z])TW(?![A-Za-z])|英国|(?<![A-Za-z])UK(?![A-Za-z])|(?<![A-Za-z])GB(?![A-Za-z])|加拿大|(?<![A-Za-z])CA(?![A-Za-z])|澳大利亚|Australia|(?<![A-Za-z])AU(?![A-Za-z]))",
      // 兜底排除港/马来落地（见文件头 Fix 说明）;只查落地部分，不误杀「中转·香港·…」(与 Claude 组同一写法，V4.20)
      "exclude-filter": "^(?:中转·[^·-]+-|(?!中转·))(?=.*(三毛|一毛|一分|🇭🇰|香港|🇲🇾|马来))",
      "empty-fallback": "REJECT", // 白名单滤空时显式失败，不回落直连（见文件头 Fix 说明）
      "url": "https://chatgpt.com", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://chatgpt.com",
          "weight": 0.7,
          // 2026-10-16 实测:健康检查发 HEAD,Cloudflare 对 HEAD 一律回 403(浏览器 GET 才是 200),原清单让正常节点
          // 全判失败。加 403 后该判据只表示「可达」,地区判据目前没有可靠的 HEAD 信号(RFC-027 C1)
          "expected-status": "200/301/302/307/308/403"
        },
        {
          "url": "https://api.openai.com",
          "weight": 0.3,
          // 2026-10-16 实测:根路径 HEAD 返回 421,无鉴权的 API 路径返回 401(RFC-027 C1)
          "expected-status": "200/301/302/307/308/401/421"
        }
      ],
      "interval": 300, // 🎯 AI 核心业务
      "tolerance": 60,
      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Telegram",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png",
      "use": RELAY_USE.slice(), // 引入代理集：组合机场 + 全部中转(见上方中转代理集表)
      "filter": "^(?!.*(俄罗斯|Russia|RU)).*",
      // 排除立陶宛防止假延迟？扁平化测速会自动剔除假延迟节点，故不再强制正则排除，靠测速说话
      "url": "https://api.telegram.org", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://api.telegram.org",
          "weight": 0.6,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://web.telegram.org",
          "weight": 0.4,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 600, // 🎯 通讯工具：降低频率
      "tolerance": 80,
      "lazy": true // 🎯 非实时性业务：延迟测速
    },

    // 手动选择区
    {
      "name": "国内",
      "type": "select",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/CN.png",
      "proxies": ["DIRECT", "自动选择"]
    },
    {
      "name": "Google",
      "type": "select",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Google.png",
      "proxies": ["Gemini", "自动选择"] 
    },
    {
      "name": "YouTube",
      "type": "select",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/YouTube.png",
      "proxies": ["自动选择", "Gemini"]
    }
  ];

  config["rules"] = [
    // 🔴 层级 0：BoundaryAI 内网域名直连(放在最前，优先于一切规则；hosts 见上方 2.1)
    "DOMAIN-SUFFIX,boundaryai.com,DIRECT",
    "DOMAIN-SUFFIX,boundaryai.cn,DIRECT",

    // ==========================================
    // 🔴 层级 1：最高优先级 - 本地与局域网 IP 直连
    // 作用: 防止局域网设备(NAS/打印机)和网关流量被代理劫持，避免内网死循环
    // ==========================================
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve", // 优化：组播地址直连
    "IP-CIDR,255.255.255.255/32,DIRECT,no-resolve", // 优化：广播地址直连
    "GEOIP,PRIVATE,DIRECT,no-resolve",

    // ==========================================
    // 🟠 层级 2：绝对特权区 - 专有业务与内网域名强制分流
    // 作用: 抢在接下来的所有泛规则和重定向之前，让 Emby 此类特定需求分配好去向
    // ==========================================
    // 🎬 Emby 影音服务器分流 (要求剔除日本节点，故分走专有 EMBY 组)
    "DOMAIN,tv.ash.yt,EMBY", // AshEmby
    "DOMAIN,ask.ash.yt,EMBY", // Ask AshS
    "DOMAIN,emby.bangumi.ca,EMBY", // Nyamedia:公益
    "DOMAIN,1.eoos.lol,EMBY", // eoos
    "DOMAIN,v1.uhdnow.com,EMBY", // UHD
    "DOMAIN,emby-cm.hohai.eu.org,EMBY", // honhai:公费
    "DOMAIN,emby-npo.hohai.eu.org,EMBY", // hohai:公益
    "DOMAIN,us01.doudou.pet,EMBY", // Ryan:公益
    "DOMAIN-SUFFIX,startspoint.com,EMBY", // 起点公费A
    "DOMAIN-SUFFIX,mobaiemby.site,EMBY", // 墨云阁:公益30天保号
    "DOMAIN-SUFFIX,yue.to,EMBY", // 悦:stream.yue.to
    "DOMAIN-SUFFIX,28.al,EMBY", // 起点:公益2-30天保号 

    // 🏠 内网域名直连兜底保障
    "DOMAIN-SUFFIX,lan,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,home.arpa,DIRECT",
    "DOMAIN-SUFFIX,yfjc.xyz,DIRECT",

    // EMBY 直连服 (专门摘出，不走上面代理的)
    "DOMAIN-SUFFIX,xmsl.org,DIRECT", // 1111:公费
    "DOMAIN-SUFFIX,1huanlesap02.top,DIRECT", // 起点:Pro

    // 🛠️ Autodesk Fusion 360 云端心跳直连
    // Fusion 是云原生软件,许可核销/云文档同步/实时推送每分钟几十次 HTTPS 心跳,
    // 而它把所有 TLS 层失败(握手无响应、超时、连接中断)统一渲染成"服务器验证警告:
    // 无法验证安全证书",且"仍然信任"不落盘 —— 失败一次弹一次,所以体感极其频繁。
    // 2026-08-22 实测 api.aps.usa.autodesk.com,8s 门限各 20 次:
    //   自动选择(悦·🇭🇰香港2) 16/20 通过 avg 242ms;DIRECT 19/20 通过 avg 336ms
    // 代理路径慢的少但失败率高 4 倍。api.aps / accounts / *.prd.fusionapi / ase 直连均 200-420ms 稳定。
    // 例外:www.autodesk.com(纯官网)直连 ~950ms 且会超时,单独留在代理侧。
    "DOMAIN,www.autodesk.com,自动选择",
    "DOMAIN-SUFFIX,autodesk.com,DIRECT",
    "DOMAIN-SUFFIX,autodesk.io,DIRECT",
    "DOMAIN-SUFFIX,autodesk360.com,DIRECT",

    // 🎬 LumexEmby 播放器进程兜底:公益源常把播放 302 到未知媒体 CDN 域(如 media.asubaka.de),
    // 逐域维护规则跟不上;按进程把播放器的其余流量(拉流/图片/字幕)全部收进 EMBY 组,
    // media-balance 才能看到真实视频吞吐。直连服域名规则在上方,优先级不受影响。
    "PROCESS-NAME,LumexEmby.exe,EMBY",

    // ==========================================
    // 🟡 层级 3：系统底层修正与协议拦截
    // 作用: 修复 Windows 系统连通性状态，并强制拦截 UDP(QUIC) 以挽救测速和流媒体稳定性
    // ==========================================
    "DOMAIN,ipv6.msftconnecttest.com,REJECT",
    "DOMAIN,ipv6.msftncsi.com,REJECT",
    "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
    "DOMAIN-SUFFIX,msftncsi.com,DIRECT",

    // 🛡️ 强制阻断 QUIC (UDP 443) 以解决 Google/YouTube 流畅度问题和 1060 错误
    // 强制回退到 TCP，提高代理稳定性
    "AND,((NETWORK,UDP),(DST-PORT,443)),REJECT",

    // ==========================================
    // 🟢 层级 4：非刚需请求拦截 (去广告)
    // 作用: 大面积泛规则匹配之前，先打掉广告追踪平台的域名，节省带宽和算力
    // ==========================================
    // 广告与隐私拦截 (Geosite 替代 Rule-Set)
    "GEOSITE,category-ads-all,REJECT",
    "DOMAIN-SUFFIX,tracking.miui.com,REJECT",
    
    // ==========================================
    // 🔵 层级 5：核心 AI 服务精确保护
    // 作用: 防止被 `GEOSITE,google` 这类大包大揽的后缀接管，造成 AI 无法进入你指定的测速组
    // ==========================================
    // Google AI / Gemini (关键: opa-pa/proactivebackend)
    "DOMAIN-SUFFIX,gemini.google.com,Gemini",
    "DOMAIN-SUFFIX,bard.google.com,Gemini",
    "DOMAIN,gemini.google.com,Gemini", // 加强匹配
    "DOMAIN,bard.google.com,Gemini",   // 加强匹配
    "DOMAIN,generativelanguage.googleapis.com,Gemini",
    "DOMAIN-SUFFIX,aiplatform.googleapis.com,Gemini", // 新增: Vertex AI 核心 API
    "DOMAIN,oauth2.googleapis.com,Gemini",           // 修复: 认证服务器走常规高可用节点，防止 Gemini 节点抖动导致授权失败
    "DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,Gemini",
    "DOMAIN-SUFFIX,opa-pa.googleapis.com,Gemini",
    "DOMAIN-SUFFIX,waa-pa.googleapis.com,Gemini", // 新增: Web & App Activity
    "DOMAIN-SUFFIX,cloudcode-pa.googleapis.com,Gemini", // Antigravity AI
    "DOMAIN-SUFFIX,daily-cloudcode-pa.googleapis.com,Gemini", // Antigravity AI
    "DOMAIN-SUFFIX,antigravity-unleash.goog,Gemini", // Antigravity AI
    "DOMAIN-KEYWORD,antigravity-auto-updater,Gemini", // Antigravity Updater
    "DOMAIN-SUFFIX,client-channel.google.com,Gemini",
    "DOMAIN-SUFFIX,assistant.google.com,Gemini",
    "DOMAIN-SUFFIX,ai.google.com,Gemini",
    "DOMAIN-SUFFIX,aistudio.google.com,Gemini",
    "DOMAIN-SUFFIX,makersuite.google.com,Gemini",
    "DOMAIN,ohttp-relay-safebrowsing-chrome.google.fastly-edge.com,Gemini", // 新增: Chrome 安全浏览中继也分流至 Gemini
    "DOMAIN-SUFFIX,googleapis.cn,Google", // 🔴 Fix: Google 中国 CDN，涵盖全部 Google 服务，应走可手动切换的 Google 组而非锁死 Gemini
    "DOMAIN-SUFFIX,deepmind.com,Gemini", // DeepMind 相关
    "DOMAIN-SUFFIX,deepmind.google,Gemini", // DeepMind 相关
    
    // OpenAI / ChatGPT
    "DOMAIN-SUFFIX,openai.com,ChatGPT",
    "DOMAIN-SUFFIX,chatgpt.com,ChatGPT",
    "DOMAIN-SUFFIX,oaistatic.com,ChatGPT",
    "DOMAIN-SUFFIX,oaiusercontent.com,ChatGPT",
    "DOMAIN-SUFFIX,sora.com,ChatGPT", // Sora 视频生成，独立域名补充

    // Anthropic / Claude
    "DOMAIN-SUFFIX,anthropic.com,Claude",
    "DOMAIN-SUFFIX,claude.ai,Claude",
    "DOMAIN-SUFFIX,platform.claude.com,Claude", // 可能的未来域名，提前布局
    "DOMAIN-SUFFIX,claudeapi.com,Claude", // 可能的未来域名，提前布局
    "DOMAIN-SUFFIX,claudeapp.com,Claude", // 可能的未来域名，提前布局
    "DOMAIN-SUFFIX,claudepro.com,Claude", // 可能的未来域名，提前布局
    "DOMAIN-SUFFIX,claude.com,Claude", // 可能的未来域名，提前布局
    "DOMAIN-SUFFIX,mcp.exa.ai,Claude", // 可能的未来域名，提前布局
    // Fix: Claude 客户端实时推送/通知通道（Intercom），nexus-websocket-a.intercom.io 等
    "DOMAIN-SUFFIX,intercom.io,Claude",
    "DOMAIN-SUFFIX,intercomassets.com,Claude",
    "DOMAIN-SUFFIX,intercomcdn.com,Claude",
    // Fix: Anthropic 使用 Statsig 做 A/B 测试和功能开关，Claude 客户端频繁请求
    "DOMAIN-SUFFIX,statsig.com,Claude",
    "DOMAIN-SUFFIX,statsigapi.net,Claude",
    // VS Code 扩展市场里 Anthropic 发布者的元数据与 .vsix 下载（Claude Code 扩展更新），
    // 必须排在 PROCESS-NAME,Code.exe,Gemini 之前，否则被 Code.exe 进程规则截走
    "DOMAIN,anthropic.gallery.vsassets.io,Claude",
    "DOMAIN,anthropic.gallerycdn.vsassets.io,Claude",

    // AI 服务 - Rule Sets (已废弃，清理残留)
    "GEOSITE,openai,ChatGPT",

    // 修复 Bing 重定向循环：国内版 Bing 强制直连，国际版 Copilot 走代理
    "DOMAIN,cn.bing.com,DIRECT",
    // Copilot 依赖 Bing/Microsoft，手动保底
    "DOMAIN-SUFFIX,bing.com,Copilot", 
    "DOMAIN-SUFFIX,copilot.microsoft.com,Copilot",

    // Cursor 核心链路前置，避免被泛规则抢占
    "DOMAIN-SUFFIX,cursor.com,Cursor",
    "DOMAIN-SUFFIX,withcursor.com,Cursor", // 历史品牌域名，防止重定向链路误分流
    "DOMAIN-SUFFIX,cursor.sh,Cursor",
    "DOMAIN,api.cursor.sh,Cursor",
    "DOMAIN,api2.cursor.sh,Cursor",
    "DOMAIN,www.cursor.com,Cursor", // 显式命中主页域名，便于日志排查
    
    // GitHub Copilot 专属 API（必须在 GEOSITE,github 之前，避免被宽泛规则抢占）
    "DOMAIN-SUFFIX,copilot.github.com,GitHub Copilot",
    "DOMAIN-SUFFIX,copilot-proxy.githubusercontent.com,GitHub Copilot",
    "DOMAIN-SUFFIX,githubcopilot.com,GitHub Copilot",
    "DOMAIN,api.githubcopilot.com,GitHub Copilot",
    // GitHub 通用（clone/pull/push 与 Copilot 共用本组：本组测 copilot.github.com，比自动选择的 gstatic 更贴近 github.com）
    "GEOSITE,github,GitHub Copilot",
    
    // AI 服务 - 兜底 (Gemini 通常包含在 Google Geosite 中，防止误伤优先放前面)
    "GEOSITE,google,Google",
    
    // 强制 gemini.google.com 走 Gemini 策略组 (防止被 GEOSITE,google 抢占)
    // 虽然上面有了 DOMAIN-SUFFIX，但为了保险起见，显式声明 GEOSITE 规则顺序
    // 注意: 在 Lumex/Lumex 中，前面的规则优先级更高。
    // 我们已经在前面放置了 DOMAIN-SUFFIX 规则，理论上已经生效。
    // 问题可能出在 Gemini 策略组选到了香港/澳门节点。
    
    // 📚 学术网站 (国外) - 新增
    "GEOSITE,category-scholar-!cn,自动选择",

    // ==========================================
    // 🔵 层级 5：应用层进程精准分流 (仅适用于 Tun 模式或 PC 客户端)
    // 作用: 将软件本体请求固定死向某地，阻止一些软件自己各种探测导致分流混乱
    // ==========================================
    "DOMAIN-SUFFIX,1145145.com,DIRECT",
    // 进程 (Windows)
    "PROCESS-NAME,WeChat.exe,DIRECT",
    "PROCESS-NAME,WeChatAppEx.exe,DIRECT",
    "PROCESS-NAME,QQ.exe,DIRECT",
    "PROCESS-NAME,Telegram.exe,Telegram",
    "PROCESS-NAME,Discord.exe,自动选择",
    "PROCESS-NAME,Slack.exe,自动选择",
    "PROCESS-NAME,Zoom.exe,自动选择",
    // 强制 DIRECT 以保证 Bambu 局域网发现 (广播/组播) 正常工作，避免被误分流到代理
    "PROCESS-NAME,BambuStudio.exe,DIRECT",
    "PROCESS-NAME,bambu-studio.exe,DIRECT",
    "PROCESS-NAME,Thunder.exe,DIRECT",
    "PROCESS-NAME,DownloadSdk.exe,DIRECT",
    "PROCESS-NAME,baidunetdisk.exe,DIRECT",
    "PROCESS-NAME,BitComet.exe,DIRECT",
    "PROCESS-NAME,uTorrent.exe,DIRECT",
    "PROCESS-NAME,IDMan.exe,DIRECT",
    "PROCESS-NAME,git.exe,自动选择",
    "PROCESS-NAME,Code.exe,Gemini", // Temp: VS Code 流量全部引流至 Gemini
    "PROCESS-NAME,Code - Insiders.exe,Gemini", // Temp: VS Code Insiders 流量全部引流至 Gemini
    "PROCESS-NAME,Antigravity.exe,Gemini",
    "PROCESS-NAME,cursor.exe,Cursor",
    "PROCESS-NAME,Cursor.exe,Cursor",
    "PROCESS-NAME,claude.exe,Claude", // Fix: Claude 桌面端进程强制走 Claude 组
    "PROCESS-NAME,ChatGPT.exe,ChatGPT",
    "PROCESS-NAME,codex.exe,ChatGPT",
    "PROCESS-NAME,idea64.exe,自动选择",
    "PROCESS-NAME,pycharm64.exe,自动选择",
    "PROCESS-NAME,Steam.exe,自动选择",
    "PROCESS-NAME,steamwebhelper.exe,自动选择",
    "PROCESS-NAME,EpicGamesLauncher.exe,自动选择",
    "PROCESS-NAME,Origin.exe,自动选择",
    "PROCESS-NAME,Uplay.exe,自动选择",
    "PROCESS-NAME,cloudmusic.exe,DIRECT",
    "PROCESS-NAME,QQMusic.exe,DIRECT", // 优化：增加 QQ 音乐直连

    // ==========================================
    // 🟣 层级 6：开发者生产力与应用大类 (泛匹配兜底)
    // 作用: 匹配 GitHub、各种应用市场以及没在上方命中的大型流媒体分类
    // ==========================================
    // 开发者/微软
    "DOMAIN-SUFFIX,stackoverflow.com,自动选择",
    "DOMAIN-SUFFIX,stackexchange.com,自动选择",
    "DOMAIN-SUFFIX,npmjs.com,自动选择",
    "DOMAIN-SUFFIX,pypi.org,自动选择",
    "DOMAIN-SUFFIX,docker.io,自动选择",
    "DOMAIN-SUFFIX,docker.com,自动选择", // 优化：增加 docker.com
    "DOMAIN-SUFFIX,windowsupdate.com,DIRECT",
    "DOMAIN-SUFFIX,update.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,delivery.mp.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,dl.delivery.mp.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,tlu.dl.delivery.mp.microsoft.com,DIRECT",
    "GEOSITE,microsoft,自动选择",
    "GEOSITE,apple,DIRECT",

    // 游戏与 Bambu
    "DOMAIN-SUFFIX,steamserver.net,DIRECT",
    "DOMAIN-SUFFIX,steamcontent.com,DIRECT",
    "DOMAIN-SUFFIX,steamstatic.com,DIRECT",
    "DOMAIN-SUFFIX,epicgames.com,DIRECT",
    // Bambu 云服务 & 打印机通信
    "DOMAIN-SUFFIX,bambulab.com,DIRECT",
    "DOMAIN-SUFFIX,bambulab.cn,DIRECT",
    "DOMAIN-SUFFIX,bambulab.co,DIRECT",
    // 社交
    "GEOSITE,tiktok,Gemini",
    // 🔴 Fix: Telegram 必须在 category-communication 之前，否则 GEOSITE,category-communication 包含 telegram 导致先命中自动选择
    "GEOSITE,telegram,Telegram",
    "GEOIP,telegram,Telegram,no-resolve", // 域名侧已由上面 PROCESS-NAME / GEOSITE,telegram 认领;这里只接 IP 直连的 MTProto
    "GEOSITE,category-communication,自动选择",
    "GEOSITE,youtube,YouTube",

    // 测速与其他兜底
    "DOMAIN-SUFFIX,speedtest.net,DIRECT",
    "DOMAIN-SUFFIX,ookla.com,DIRECT",
    "DOMAIN-SUFFIX,fast.com,自动选择",
    "DST-PORT,123,DIRECT", // NTP
    "DST-PORT,137,DIRECT", // NetBIOS
    "DST-PORT,138,DIRECT", // NetBIOS
    "DST-PORT,139,DIRECT", // NetBIOS
    "DST-PORT,5353,DIRECT", // mDNS
    
    // ==========================================
    // ⚫ 层级 7：国家大洲归属判定及最终全球兜底 (终审法院)
    // 作用: 处理所有在上面六层里成了漏网之鱼的流量，如果是国内 IP/域名就直连，不然就代理
    // ==========================================
    // 最终匹配
    // Google Rule (blackmatrix7) 优先于 google_domain
    "GEOSITE,cn,国内",
    "GEOIP,cn,国内,no-resolve", // 🚀 极限优化：GEOIP 匹配时禁止解析域名，防止 DNS 泄漏和延迟
    "GEOSITE,geolocation-!cn,自动选择",
    "MATCH,自动选择"
  ];

  // 全适应 active 全量接管：统一为 url-test / load-balance 注入重型参数
  if (config["proxy-groups"] && Array.isArray(config["proxy-groups"])) {
    config["proxy-groups"].forEach(function(group) {
      if (!group || !group.type) {
        return;
      }

      // 尽量全量启用：凡是支持 adaptive-heavy 的组都加上
      group["adaptive-heavy"] = true;

      if (group.type === "url-test") {
        group["adaptive-mode"] = "active";
        group["adaptive-auto"] = true;
        group["switch-cost-enabled"] = true;
        group["hierarchical-health-check"] = true;

        if (group["adaptive-observe-rounds"] === undefined) {
          group["adaptive-observe-rounds"] = 3;
        }
        if (group["adaptive-success-threshold"] === undefined) {
          group["adaptive-success-threshold"] = 55;
        }
        if (group["adaptive-failure-threshold"] === undefined) {
          group["adaptive-failure-threshold"] = 35;
        }
        if (group["adaptive-cooldown-sec"] === undefined) {
          group["adaptive-cooldown-sec"] = 180;
        }
        if (group["adaptive-stage-cooldown-sec"] === undefined) {
          group["adaptive-stage-cooldown-sec"] = 900;
        }

        if (group["switch-cost-base"] === undefined) {
          group["switch-cost-base"] = 3.0;
        }
        if (group["switch-cost-delay-factor"] === undefined) {
          group["switch-cost-delay-factor"] = 0.003;
        }

        if (group["hierarchical-timeout"] === undefined) {
          group["hierarchical-timeout"] = 3000;
        }
        if (group["hierarchical-jitter"] === undefined) {
          group["hierarchical-jitter"] = 80;
        }
        if (group["hierarchical-fail-streak"] === undefined) {
          group["hierarchical-fail-streak"] = 2;
        }
      }

      if (group.type === "load-balance") {
        group["bandit-mode"] = "active";
        group["bandit-auto"] = true;

        if (group["bandit-observe-rounds"] === undefined) {
          group["bandit-observe-rounds"] = 3;
        }
        if (group["bandit-success-threshold"] === undefined) {
          group["bandit-success-threshold"] = 55;
        }
        if (group["bandit-failure-threshold"] === undefined) {
          group["bandit-failure-threshold"] = 35;
        }
        if (group["bandit-cooldown-sec"] === undefined) {
          group["bandit-cooldown-sec"] = 180;
        }
        if (group["bandit-stage-cooldown-sec"] === undefined) {
          group["bandit-stage-cooldown-sec"] = 900;
        }
      }

      if (group.type === "fallback" && group["score-based"] === undefined) {
        group["score-based"] = true;
      }
    });
  }

  // 遍历所有节点，为没有设置指纹的节点添加默认指纹 (Lumex 1.18+ 弃用了全局 client-fingerprint)
  // 同时强制开启 UDP，防止部分机场节点配置遗漏导致游戏/语音不通
  if (config.proxies && Array.isArray(config.proxies)) {
    config.proxies.forEach(function(proxy) {
      if (proxy.type !== 'direct' && proxy.type !== 'reject') {
        proxy["client-fingerprint"] = proxy["client-fingerprint"] || "chrome";
        if (proxy["udp"] === undefined) {
          proxy["udp"] = true;
        }
      }
    });
  }

  return config;
}
