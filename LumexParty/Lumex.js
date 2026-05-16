// Lumex Party 专用配置文件覆写脚本
// 引用链接: https://raw.githubusercontent.com/int-del/LumexOverwrite/main/LumexParty/Lumex.js
// 加速链接: https://cdn.jsdelivr.net/gh/int-del/LumexOverwrite@main/LumexParty/Lumex.js
// 版本: v2.27  | 更新日期: 2026-03-10
// Phase 1.1: 加权评分 + 自适应容差版 (Gemini/Copilot/GitHub Copilot 多 URL 健康检查)
// BugFix: 全组启用多 URL 模式，并修复 ChatGPT 健康检查循环问题

function main(config) {
  // 打印版本号，用于确认是否下载到了最新版
  console.log("✅ 加载脚本 v2.27 (Phase 1.1: 加权评分 + 自适应容差 - 业务探测对齐 + DNS优先级修复)...");

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
  config["find-process-mode"] = "strict";
  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true // 优化：持久化 Fake-IP 缓存，重启后秒连
  };
  
  // 修复本地回环和 Google 连接问题
  config["skip-auth-prefixes"] = ["127.0.0.1/8", "::1/128"];
  
  // GeoData 优化
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    "geoip": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    "geosite": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    "mmdb": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.metadb"
  };

  // 2. DNS 设置 (保持不变_optimized)
  config["dns"] = {
    "enable": true,
    "ipv6": false,
    "cache-algorithm": "arc", // 🚀 极限优化：启用 ARC 缓存算法，大幅提升 DNS 命中率和解析速度
    "cache-max-size": 16384, // 🚀 P1 优化：扩大缓存到 16384 条，大规模节点场景下提升命中率（默认 4096）
    "listen": "0.0.0.0:1053",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"], // 优化：仅支持纯 IP，用于解析 DoH/DoT 域名
    "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"], // 优化：节点域名解析专用 DNS，使用高可用 IP
    "proxy-server-nameserver-policy": { // 🚀 P2 优化：为不同 CDN 机场指定专用 DNS，优化节点解析路由
      "+.cloudflare.com": "1.1.1.1",
      "+.cfcdn.net": "1.1.1.1",
      "+.tencent.com": "119.29.29.29",
      "+.myqcloud.com": "119.29.29.29",
      "+.aliyun.com": "223.5.5.5",
      "+.alicdn.com": "223.5.5.5"
    },
    "fake-ip-filter": [
      "*.lan", "*.local", // 优化：防止局域网域名被 Fake-IP 劫持，保障本地设备发现
      "+.msftconnecttest.com", "+.msftncsi.com",
      "+.ntp.org", "+.pool.ntp.org", "+.stun.protocol.org",
      "stun.*", "+.stun.*.*", "+.stun.*",
      "+.nintendo.net", "+.playstation.net", "+.xboxlive.com",
      "time.*.com", "time.*.gov", "time.*.edu.cn", "time.*.apple.com", "time1.cloud.tencent.com",
      "*.bambulab.com", "*.bambulab.cn"
    ],
    "nameserver": [
      "https://doh.pub/dns-query", // 腾讯 DoH
      "https://dns.alidns.com/dns-query" // 阿里 DoH
    ],
    // 🚀 极限优化 Fallback: 必须使用海外 DNS 解析海外域名，配合 respect-rules 走代理防污染
    "fallback": [
      "https://1.1.1.1/dns-query", // Cloudflare DoH
      "https://8.8.8.8/dns-query"  // Google DoH
    ],
    "fallback-filter": { 
      "geoip": true, 
      "geoip-code": "CN", 
      "ipcidr": ["240.0.0.0/4"] 
    },
    "nameserver-policy": {
      "geosite:category-ads-all": "rcode://success", // 🚀 极限优化：DNS 级别直接屏蔽广告，节省 CPU 和内存
      "geosite:geolocation-!cn": ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"], // 修复：海外域名优先海外 DoH，国内 DoH 作为后备，兼顾纯净度与可达性
      "geosite:cn": "https://dns.alidns.com/dns-query",
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

  // 3. Tun 模式
  config["tun"] = {
    "enable": true,
    "stack": "system", // 🔴 P0 修复：改为 system 栈，Windows 下性能最佳且兼容性更好
    "mtu": 1500, // 🔴 P0 修复：改为标准 MTU，避免公网环境巨型帧分片导致性能下降
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "endpoint-independent-nat": true,
    "dns-hijack": ["any:53"]
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
      "url": "https://sub.tymin.cn:8443/xiejian2026/download/collection/%E7%BB%84%E5%90%88%E6%9C%BA%E5%9C%BA",
      "path": "./proxy_providers/组合机场.yaml",
      "interval": 86400, // 优化：将自动刷新降低到24小时一次，防止反复清空历史测速记录导致待测速
      "filter": "(?i)^(?!.*(流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新)).*",
      "health-check": {
        "enable": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 240, // 🎯 平衡点：240s 保持高频但避免过度采样，网络稳定时间充足
        "expected-status": "204" // 🚀 依赖 Lumex 1.18+ 内核功能：预期的 HTTP 状态码，防流量耗尽/被墙等假连通情况 (自动踢出跳转节点的防挂神器)
      }
    }
  };

  // ============================================================
  // proxy-groups 扁平化重构区
  // ============================================================

  // 1. 定义扁平化的 Proxy Groups
  config["proxy-groups"] = [
    {
      "name": "自动选择",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Urltest.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU)).*", // 排除过期/流量/IEPL/RU/KP/CU
      "urls": [
        {
          "url": "https://www.gstatic.com/generate_204",
          "weight": 0.6,
          "expected-status": "204"
        },
        {
          "url": "https://cdn.jsdelivr.net/",
          "weight": 0.4,
          "expected-status": "200"
        }
      ],
      "interval": 240, // 🎯 关键组基准周期
      "tolerance": 80, // 🎯 平衡容差：80ms 足以应对临界切换需求，但不易被抖动触发
      "lazy": true // 🎯 平衡模式：只在使用时测速，节省资源同时保证响应
    },
    {
      "name": "EMBY",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Emby.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU|日本|Japan|JP)).*", // 额外排除日本节点
      "urls": [
        {
          "url": "https://www.gstatic.com/generate_204",
          "weight": 0.7,
          "expected-status": "204"
        },
        {
          "url": "https://cdn.jsdelivr.net/",
          "weight": 0.3,
          "expected-status": "200"
        }
      ],
      "interval": 600, // 🎯 非关键业务：降低检测频率，减少不必要的连接
      "tolerance": 80,
      "lazy": true // 🎯 非关键业务：延迟测速，进一步节省开销
    },
    {
      "name": "Gemini",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Google.png",
      "use": ["组合机场"], // 引入代理集
      // 🚫 严格排除: 香港/HK, 澳门/Macau/MO, 俄罗斯/RU, 立陶宛/Lithuania/LT, 日本/Japan/JP, 韩国/KR, 中国/CN/China
      "filter": "^(?!.*(俄罗斯|香港|HongKong|HK|Russia|RU|澳门|Macau|MO|立陶宛|Lithuania|LT|朝鲜|Korea|KP|KR|韩国|古巴|Cuba|CU|CN|China|中国|日本|Japan|JP)).*",
      // 🚀 多 URL 健康检查配置 (启用加权评分 + 自适应容差)
      "urls": [
        {
          "url": "https://gemini.google.com",
          "weight": 0.7, // 主 URL 权重 70%
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://www.google.com",
          "weight": 0.3, // 次 URL 权重 30%
          "expected-status": "200"
        }
      ],
      "interval": 300, // 🎯 AI 核心业务：5 分钟周期保证即时性
      "tolerance": 60, // 🎯 敏感但稳定：60ms 应对实际网络条件
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Copilot",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Microsoft.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU)).*", // 排除 RU/KP/CU
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

      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "GitHub Copilot",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/github.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU)).*",
      "urls": [
        {
          "url": "https://api.github.com",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://copilot-proxy.githubusercontent.com",
          "weight": 0.3,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 360, // 🎯 开发工具业务：6 分钟周期
      "tolerance": 60,

      "lazy": true // 🎯 非实时性业务：延迟测速
    },
    {
      "name": "ChatGPT",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(香港|HongKong|HK|俄罗斯|Russia|RU|澳门|Macau|朝鲜|Korea|KP|古巴|Cuba|CU)).*",
      "urls": [
        {
          "url": "https://chatgpt.com",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://api.openai.com",
          "weight": 0.3,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 300, // 🎯 AI 核心业务
      "tolerance": 60,
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Telegram",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU)).*",
      // 排除立陶宛防止假延迟？扁平化测速会自动剔除假延迟节点，故不再强制正则排除，靠测速说话
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
    "DOMAIN,ask.ash.yt,EMBY", // Ask Ash
    "DOMAIN,emby.bangumi.ca,EMBY", // Nyamedia:公益
    "DOMAIN,1.eoos.lol,EMBY", // eoos
    "DOMAIN,v1.uhdnow.com,EMBY", // UHD
    "DOMAIN,emby-cm.hohai.eu.org,EMBY", // honhai:公费
    "DOMAIN,emby-npo.hohai.eu.org,EMBY", // hohai:公益
    "DOMAIN,us01.doudou.pet,EMBY", // Ryan:公益
    "DOMAIN-SUFFIX,startspoint.com,EMBY", // 起点公费A
    "DOMAIN-SUFFIX,mobaiemby.site,EMBY", // 墨云阁:公益30天保号
    "DOMAIN-SUFFIX,28.al,EMBY", // 起点:公益2-30天保号 
    "DOMAIN-SUFFIX,startspoint.com,EMBY", //起点:公益

    // 🏠 内网域名直连兜底保障
    "DOMAIN-SUFFIX,lan,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,home.arpa,DIRECT",
    "DOMAIN-SUFFIX,yfjc.xyz,DIRECT",

    // EMBY 直连服 (专门摘出，不走上面代理的)
    "DOMAIN-SUFFIX,xmsl.org,DIRECT", // 1111:公费
    "DOMAIN-SUFFIX,1huanlesap02.top,DIRECT", // 起点:Pro

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
    "DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,Gemini",
    "DOMAIN-SUFFIX,opa-pa.googleapis.com,Gemini",
    "DOMAIN-SUFFIX,waa-pa.googleapis.com,Gemini", // 新增: Web & App Activity
    "DOMAIN-SUFFIX,client-channel.google.com,Gemini",
    "DOMAIN-SUFFIX,assistant.google.com,Gemini",
    "DOMAIN-SUFFIX,ai.google.com,Gemini",
    "DOMAIN-SUFFIX,aistudio.google.com,Gemini",
    "DOMAIN-SUFFIX,makersuite.google.com,Gemini",
    "DOMAIN-SUFFIX,googleapis.cn,Gemini",
    "DOMAIN-SUFFIX,deepmind.com,Gemini", // DeepMind 相关
    "DOMAIN-SUFFIX,deepmind.google,Gemini", // DeepMind 相关
    
    // OpenAI / ChatGPT
    "DOMAIN-SUFFIX,openai.com,ChatGPT",
    "DOMAIN-SUFFIX,chatgpt.com,ChatGPT",
    "DOMAIN-SUFFIX,oaistatic.com,ChatGPT",
    "DOMAIN-SUFFIX,oaiusercontent.com,ChatGPT",

    // AI 服务 - Rule Sets (已废弃，清理残留)
    "GEOSITE,openai,ChatGPT",

    // 修复 Bing 重定向循环：国内版 Bing 强制直连，国际版 Copilot 走代理
    "DOMAIN,cn.bing.com,DIRECT",
    // Copilot 依赖 Bing/Microsoft，手动保底
    "DOMAIN-SUFFIX,bing.com,Copilot", 
    "DOMAIN-SUFFIX,copilot.microsoft.com,Copilot",
    
    // GitHub Copilot & GitHub
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
    "PROCESS-NAME,Code.exe,自动选择",
    "PROCESS-NAME,cursor.exe,自动选择",
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
    "GEOSITE,category-communication,自动选择",
    "GEOSITE,telegram,Telegram",
    "GEOIP,telegram,Telegram",
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
