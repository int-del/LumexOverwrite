// Lumex Party 专用配置文件覆写脚本
// 引用链接: https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Lumex_active.js
// 加速链接: https://cdn.jsdelivr.net/gh/int-del/LumexOverwrite@main/Lumex_active.js
// 版本: V3.9-temp1  | 更新日期: 2026-05-17
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
// Chore: 补充 LumexCore 内核依赖声明及 secret 安全警告
// Compat: 为所有 url-test 组补充标准 url 字段，兼容非 LumexCore 内核（urls 数组为 LumexCore 专属扩展）
// Fix: 拆分 GEOSITE,github 规则 — 仅 Copilot 专属 API 走 GitHub Copilot 组，其余 GitHub 流量走自动选择
//
// ⚠️  内核依赖声明：本脚本中 adaptive-heavy / adaptive-mode / switch-cost-* /
//     hierarchical-* / bandit-mode 等参数为 LumexCore 定制内核专属扩展，
//     在标准 Lumex 内核下会被静默忽略，需配合 LumexCore 使用才能发挥完整效果。
//
// ⚠️  安全警告：config["secret"] 字段为示例占位值，请在本地替换为强密码，
//     切勿将真实密码提交到公开仓库，否则任何人均可访问你的代理控制 API。

  function main(config) {
  // 打印版本号，用于确认是否下载到了最新版
  console.log("✅ 加载脚本 V3.9-temp1 (临时修改: VS Code 全部流量强制走 Gemini 组)...");

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
      "filter": "(?i)^(?!.*(流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新)).*",
      "health-check": {
        "enable": true,
        "hierarchical": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 240, // 🎯 平衡点：240s 保持高频但避免过度采样，网络稳定时间充足
        "expected-status": "204" // 🚀 依赖 Lumex 1.18+ 内核功能：预期的 HTTP 状态码，防流量耗尽/被墙等假连通情况 (自动踢出跳转节点的防挂神器)
      }
    }
  };

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

  // 1. 定义扁平化的 Proxy Groups
  config["proxy-groups"] = [
    {
      "name": "自动选择",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Urltest.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU)).*", // 排除过期/流量/IEPL/RU/KP/CU
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
      "url": "https://www.gstatic.com/generate_204", // 标准 Lumex 兼容字段
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
      // 🚀 白名单锁定美国节点，防止 URL-Test 测速波动导致 IP 跨国跳跃触发 Gemini 风控
      "filter": "(?i)(美国|\\bUS\\b)",
      "exclude-filter": "^(一分|三毛)", // 剔除前缀为“一分”、“三毛”的节点
      "url": "https://gemini.google.com", // 标准 Lumex 兼容字段
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
      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组：加快坏节点恢复，loop 默认 180s 过长
      "adaptive-stage-cooldown-sec": 300, // 🔥 缩短阶段冷却至 5 分钟
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Claude",
      "type": "url-test",
      "icon": "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
      "use": ["组合机场"],
      // 🚀 白名单锁定亚洲低延迟 + 美国兜底，JP/KR/TW 均对 Anthropic 可用
      "filter": "(?i)(台湾|\\bTW\\b|Taiwan|日本|\\bJP\\b|Japan|韩国|\\bKR\\b|Korea|新加坡|\\bSG\\b|Singapore|美国|\\bUS\\b)",
      "url": "https://api.anthropic.com", // 标准 Lumex 兼容字段
      "urls": [
        {
          "url": "https://api.anthropic.com",
          "weight": 0.7,
          "expected-status": "200/301/302/307/308"
        },
        {
          "url": "https://claude.ai",
          "weight": 0.3,
          "expected-status": "200/301/302/307/308"
        }
      ],
      "interval": 300,
      "tolerance": 60,
      "adaptive-cooldown-sec": 60,
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false
    },
    {
      "name": "Copilot",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Microsoft.png",
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU|CN|China|中国)).*", // 补全：排除 RU/KP/CU/CN
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
      "use": ["组合机场"], // 引入代理集
      "filter": "^(?!.*(俄罗斯|Russia|RU|朝鲜|Korea|KP|古巴|Cuba|CU|伊朗|Iran|IR|叙利亚|Syria|SY|白俄罗斯|Belarus|BY|CN|China|中国)).*", // 补全：官方封锁全列表
      "url": "https://api.github.com", // 标准 Lumex 兼容字段
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
      "name": "Cursor",
      "type": "url-test",
      "icon": "https://www.google.com/s2/favicons?domain=cursor.com&sz=128",
      "use": ["组合机场"], // 引入代理集
      "filter": "(?i)(美国|\\bUS\\b|日本|\\bJP\\b|Japan|新加坡|\\bSG\\b|Singapore|台湾|\\bTW\\b|Taiwan|英国|\\bUK\\b|\\bGB\\b|加拿大|\\bCA\\b|澳大利亚|\\bAU\\b|Australia)",
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
      "use": ["组合机场"], // 引入代理集
      "filter": "(?i)(美国|\\bUS\\b|日本|\\bJP\\b|Japan|新加坡|\\bSG\\b|Singapore|台湾|\\bTW\\b|Taiwan|英国|\\bUK\\b|\\bGB\\b|加拿大|\\bCA\\b|澳大利亚|\\bAU\\b|Australia)",
      "url": "https://chatgpt.com", // 标准 Lumex 兼容字段
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
      "adaptive-cooldown-sec": 60, // 🔥 AI 关键组
      "adaptive-stage-cooldown-sec": 300,
      "lazy": false // 🎯 关键业务：保持即时检测
    },
    {
      "name": "Telegram",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png",
      "use": ["组合机场"], // 引入代理集
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
    // GitHub 通用（浏览/clone/Actions 等不需要走严格封锁过滤的 Copilot 组）
    "GEOSITE,github,自动选择",
    
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
    "GEOIP,telegram,Telegram",
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

      if (group.type === "fallback") {
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
