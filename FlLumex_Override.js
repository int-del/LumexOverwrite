// FLLumex / Lumex Party 配置文件覆写脚本
// 引用链接: https://raw.githubusercontent.com/TamperAcc/Lumex/main/FlLumex_Override.js
// 加速链接: https://cdn.jsdelivr.net/gh/TamperAcc/Lumex@main/FlLumex_Override.js
// 版本: v1.25 (自动更新版) | 更新日期: 2026-03-08
// 移植自 LumexVerge.yaml "PC 端终极优化版"

function main(config) {
  // 打印日志方便调试 (在软件日志中可见)
  console.log("🔵 [Script] 正在应用 FlLumex 覆写脚本 v1.22...");



  // 1. 基础设置优化
  config["tcp-concurrent"] = false;
  config["unified-delay"] = true;
  config["global-ua"] = "chrome";
  config["keep-alive-interval"] = 30;
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["find-process-mode"] = "strict"; // 优化：Windows 下更精准的进程匹配
  config["profile"] = {
    "store-selected": true, // 优化：记住手动选择的节点
    "auto-update": true
  };
  
  // 修复本地回环问题
  config["skip-auth-prefixes"] = ["127.0.0.1/8", "::1/128"];
  
  // GeoData 优化
  config["geodata-loader"] = "memconservative";
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geodata-mode"] = true;
  config["geox-url"] = {
    "geoip": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.metadb",
    "geosite": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    "mmdb": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"
  };

  // 2. DNS 设置
  config["dns"] = {
    "enable": true,
    "ipv6": false,
    "cache-algorithm": "arc", // 🚀 极限优化：启用 ARC 缓存算法
    "listen": "0.0.0.0:1053",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "proxy-server-nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ],
    "fake-ip-filter": [
      "*.lan", "*.local", "+.msftconnecttest.com", "+.msftncsi.com",
      "+.ntp.org", "+.pool.ntp.org", "+.stun.protocol.org",
      "stun.*", "+.stun.*.*", "+.stun.*",
      "+.nintendo.net", "+.playstation.net", "+.xboxlive.com",
      "time.*.com", "time.*.gov", "time.*.edu.cn", "time.*.apple.com", "time1.cloud.tencent.com",
      "*.bambulab.com", "*.bambulab.cn"
    ],
    "nameserver": [
      "223.5.5.5",
      "119.29.29.29",
      "quic://dns.alidns.com:853" // DoQ
    ],
    "fallback": [
      "https://doh.pub/dns-query",
      "https://1.0.0.1/dns-query",
      "tcp://208.67.222.222:443",
      "tls://8.8.4.4:853"
    ],
    "fallback-filter": {
      "geoip": true,
      "geoip-code": "CN",

      "ipcidr": ["240.0.0.0/4"]
    },
    // DNS 分流策略
    "nameserver-policy": {
      "geosite:category-ads-all": "rcode://success", // 🚀 极限优化：DNS 级别直接屏蔽广告
      "geosite:geolocation-!cn": ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"], // 🚀 极限优化：海外域名直接走海外 DNS
      "+.apple.com": "system",
      "+.icloud.com": "system",
      "geosite:cn": "119.29.29.29",
      "+.qq.com": "119.29.29.29",
      "+.aliyun.com": "223.5.5.5",
      "+.taobao.com": "223.5.5.5",
      "+.baidu.com": "180.76.76.76",
      "+.jd.com": "119.29.29.29",
      "+.bilibili.com": "119.29.29.29",
      "+.163.com": "223.5.5.5",
      "+.netease.com": "223.5.5.5",
      "+.douyin.com": "180.76.76.76",
      "+.tiktok.com": "180.76.76.76",
      "+.bambulab.cn": "119.29.29.29",
      "+.bambulab.com": "119.29.29.29"
    }
  };

  // 3. Tun 模式
  config["tun"] = {
    "enable": true,
    "stack": "mixed",
    "mtu": 1500, // 🚀 极限优化：开启巨型帧
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": ["any:53"]
  };

  // 4. Sniffer 设置 (关闭 QUIC 嗅探)
  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": true,
    "override-destination": true,
    "sniff": {
      "HTTP": { "ports": [80, 8080, 8880], "override-destination": true },
      "TLS": { "ports": [443, 8443] }
    },
    "skip-domain": [
      "+.apple.com" // 优化：防止苹果推送服务断连
    ]
  };

  // 5. Rule Providers 定义
  const providers = {
    "reject": { "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt", "format": "text", "behavior": "domain" },
    "icloud": { "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt", "format": "text", "behavior": "domain" },
    "apple": { "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt", "format": "text", "behavior": "domain" },
    "microsoft": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/microsoft.yaml", "format": "yaml", "behavior": "domain" },
    "telegram": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/telegram.yaml", "format": "yaml", "behavior": "ipcidr" },
    "cn_domain": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/cn.yaml", "format": "yaml", "behavior": "domain" },
    "cn_ip": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geoip/cn.yaml", "format": "yaml", "behavior": "ipcidr" },
    "google_domain": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/google.yaml", "format": "yaml", "behavior": "domain" },
    "ai_services": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ai-chat-!cn.yaml", "format": "yaml", "behavior": "domain" },
    "huggingface": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/huggingface.yaml", "format": "yaml", "behavior": "domain" },
    "youtube_domain": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/youtube.yaml", "format": "yaml", "behavior": "domain" },
    "games": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-games.yaml", "format": "yaml", "behavior": "domain" },
    "social_media": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-communication.yaml", "format": "yaml", "behavior": "domain" },
    "telegram_domain": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/telegram.yaml", "format": "yaml", "behavior": "domain" },
    "geolocation_no_cn": { "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/geolocation-!cn.yaml", "format": "yaml", "behavior": "domain" }
  };

  config["rule-providers"] = {};
  for (const [key, val] of Object.entries(providers)) {
    config["rule-providers"][key] = {
      ...val,
      "path": `./ruleset/${key}.${val.format === 'text' ? 'list' : 'yaml'}`,
      "interval": 86400,
      "type": "http"
    };
  }

  // 6. Proxy Groups 定义
  // 注意：这里使用 overwrite 逻辑，会覆盖订阅自带策略组
  config["proxy-groups"] = [
    {
      "name": "自动选择",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Urltest.png",
      "include-all": true,
      "exclude-filter": "(?i)IEPL|立陶宛|Lithuania|LT|俄罗斯|Russia|RU|流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新",
      "url": "https://www.gstatic.com/generate_204",
      "interval": 150,
      "tolerance": 100,
      "unified-delay": true,
      "lazy": true
    },
    {
      "name": "AI自动优选",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png",
      "include-all": true,
      "exclude-filter": "(?i)立陶宛|Lithuania|LT|俄罗斯|Russia|RU|香港|hongkong|hk|HK|Hong|Kong|澳门|Macau|朝鲜|Korea|KP|古巴|Cuba|CU|圣何塞|流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新",
      "url": "https://www.youtube.com", // 检测送中/Captcha IP
      "interval": 300,
      "tolerance": 50,
      "expected-status": 200,
      "unified-delay": true
    },
    {
      "name": "Telegram",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png",
      "include-all": true,
      "exclude-filter": "(?i)俄罗斯|Russia|RU|立陶宛|Lithuania|LT|流量|到期|重置|官网|剩余|套餐|expire|traffic|reset|群组|频道|@|联系|网站|入群|关注|反馈|更新",
      "url": "https://api.telegram.org",
      "interval": 300,
      "tolerance": 100,
      "unified-delay": true
    },
    
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
      "proxies": ["AI自动优选", "自动选择"] 
    },
    {
      "name": "游戏服务",
      "type": "url-test",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/GAME.png",
      "include-all": true,
      "filter": "(?i)香港|台湾|新加坡|日本|韩国",
      "url": "https://www.gstatic.com/generate_204",
      "interval": 180,
      "tolerance": 100
    },
    {
      "name": "YouTube",
      "type": "select",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/YouTube.png",
      "proxies": ["AI自动优选", "自动选择"]
    },
    {
      "name": "国外通用",
      "type": "select",
      "icon": "https://cdn.jsdelivr.net/gh/Orz-3/mini@master/Color/Global.png",
      "proxies": ["AI自动优选", "自动选择"]
    }
  ];

  // 7. Rules 规则
  config["rules"] = [
    // 基础
    "GEOIP,PRIVATE,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,home.arpa,DIRECT",
    "DOMAIN,ipv6.msftconnecttest.com,REJECT",
    "DOMAIN,ipv6.msftncsi.com,REJECT",
    "DOMAIN-SUFFIX,yfjc.xyz,DIRECT",
    "DOMAIN-SUFFIX,xmsl.org,DIRECT",
    "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
    "DOMAIN-SUFFIX,msftncsi.com,DIRECT",
    "RULE-SET,reject,REJECT",
    
    // Brave (允许香港)
    "DOMAIN-SUFFIX,brave.com,自动选择",

    // AI 服务 - 核心域名防漏
    "DOMAIN-SUFFIX,openai.com,AI自动优选",
    "DOMAIN-SUFFIX,chatgpt.com,AI自动优选",
    "DOMAIN-SUFFIX,gemini.google.com,AI自动优选",
    "DOMAIN-SUFFIX,bard.google.com,AI自动优选",
    "DOMAIN,generativelanguage.googleapis.com,AI自动优选",
    "DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,AI自动优选",
    "DOMAIN-SUFFIX,opa-pa.googleapis.com,AI自动优选",
    
    // AI 服务 - 原有规则
    "DOMAIN,copilot-proxy.githubusercontent.com,AI自动优选",
    "DOMAIN,api.github.com,AI自动优选",
    "DOMAIN-SUFFIX,githubcopilot.com,AI自动优选",
    "DOMAIN-SUFFIX,github.com,AI自动优选",
    "DOMAIN-SUFFIX,githubusercontent.com,AI自动优选",
    "DOMAIN-SUFFIX,github.io,AI自动优选",
    "DOMAIN-SUFFIX,visualstudio.com,AI自动优选",
    "DOMAIN,sydney.bing.com,AI自动优选",
    "DOMAIN,edgeservices.bing.com,AI自动优选",
    "DOMAIN-SUFFIX,claude.ai,AI自动优选",
    "DOMAIN-SUFFIX,anthropic.com,AI自动优选",
    "RULE-SET,ai_services,AI自动优选",
    "RULE-SET,huggingface,AI自动优选",

    // 进程 (Windows)
    "PROCESS-NAME,WeChat.exe,DIRECT",
    "PROCESS-NAME,WeChatAppEx.exe,DIRECT",
    "PROCESS-NAME,QQ.exe,DIRECT",
    "PROCESS-NAME,Telegram.exe,Telegram",
    "PROCESS-NAME,Discord.exe,国外通用",
    "PROCESS-NAME,Slack.exe,国外通用",
    "PROCESS-NAME,Zoom.exe,国外通用",
    "PROCESS-NAME,BambuStudio.exe,国内",
    "PROCESS-NAME,bambu-studio.exe,国内",
    "PROCESS-NAME,Thunder.exe,DIRECT",
    "PROCESS-NAME,DownloadSdk.exe,DIRECT",
    "PROCESS-NAME,baidunetdisk.exe,DIRECT",
    "PROCESS-NAME,BitComet.exe,DIRECT",
    "PROCESS-NAME,uTorrent.exe,DIRECT",
    "PROCESS-NAME,IDMan.exe,DIRECT",
    "PROCESS-NAME,git.exe,国外通用",
    "PROCESS-NAME,Code.exe,自动选择",
    "PROCESS-NAME,cursor.exe,自动选择",
    "PROCESS-NAME,idea64.exe,自动选择",
    "PROCESS-NAME,pycharm64.exe,自动选择",
    "PROCESS-NAME,Steam.exe,游戏服务",
    "PROCESS-NAME,steamwebhelper.exe,游戏服务",
    "PROCESS-NAME,EpicGamesLauncher.exe,游戏服务",
    "PROCESS-NAME,Origin.exe,游戏服务",
    "PROCESS-NAME,Uplay.exe,游戏服务",
    "PROCESS-NAME,cloudmusic.exe,DIRECT",
    "PROCESS-NAME,QQMusic.exe,DIRECT",
    "PROCESS-NAME,DouYinLive.exe,DIRECT",

    // 国内直连优化
    "DOMAIN-SUFFIX,cdn.jsdelivr.net,DIRECT",
    "DOMAIN-SUFFIX,unpkg.com,DIRECT",
    "DOMAIN-SUFFIX,staticfile.org,DIRECT",
    "DOMAIN-SUFFIX,bootcdn.cn,DIRECT",
    "DOMAIN-SUFFIX,bilibili.com,DIRECT",
    "DOMAIN-SUFFIX,hdslb.com,DIRECT",
    "DOMAIN-SUFFIX,acgvideo.com,DIRECT",
    "DOMAIN-SUFFIX,iqiyi.com,DIRECT",
    "DOMAIN-SUFFIX,youku.com,DIRECT",
    "DOMAIN-SUFFIX,163.com,DIRECT",
    "DOMAIN-SUFFIX,music.163.com,DIRECT",
    "DOMAIN-SUFFIX,qqmusic.qq.com,DIRECT",
    "DOMAIN-SUFFIX,jd.com,DIRECT",
    "DOMAIN-SUFFIX,taobao.com,DIRECT",
    "DOMAIN-SUFFIX,tmall.com,DIRECT",

    // 开发者/微软
    "DOMAIN-SUFFIX,stackoverflow.com,国外通用",
    "DOMAIN-SUFFIX,stackexchange.com,国外通用",
    "DOMAIN-SUFFIX,npmjs.com,国外通用",
    "DOMAIN-SUFFIX,pypi.org,国外通用",
    "DOMAIN-SUFFIX,docker.com,国外通用",
    "DOMAIN-SUFFIX,docker.io,国外通用",
    "DOMAIN-SUFFIX,windowsupdate.com,DIRECT",
    "DOMAIN-SUFFIX,update.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,delivery.mp.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,dl.delivery.mp.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,tlu.dl.delivery.mp.microsoft.com,DIRECT",
    "RULE-SET,microsoft,自动选择",
    "RULE-SET,icloud,DIRECT",
    "RULE-SET,apple,DIRECT",

    // 游戏与 Bambu
    "DOMAIN-SUFFIX,steamserver.net,DIRECT",
    "DOMAIN-SUFFIX,steamcontent.com,DIRECT",
    "DOMAIN-SUFFIX,steamstatic.com,DIRECT",
    "DOMAIN-SUFFIX,epicgames.com,DIRECT",
    "RULE-SET,games,游戏服务",
    "DOMAIN-SUFFIX,bambulab.com,国内",
    "DOMAIN-SUFFIX,bambulab.cn,国内",
    "DOMAIN-SUFFIX,bambulab.co,国内",

    // 社交
    "RULE-SET,social_media,国外通用",
    "RULE-SET,telegram_domain,Telegram",
    "RULE-SET,telegram,Telegram",
    "RULE-SET,youtube_domain,YouTube",

    // 隐私与兜底
    "DOMAIN-SUFFIX,doubleclick.net,REJECT",
    "DOMAIN-SUFFIX,googleadservices.com,REJECT",
    "DOMAIN-SUFFIX,googlesyndication.com,REJECT",
    "DOMAIN-SUFFIX,google-analytics.com,REJECT",
    "DOMAIN-SUFFIX,googletagmanager.com,REJECT",
    "DOMAIN-SUFFIX,app-measurement.com,REJECT",
    "DOMAIN-SUFFIX,appsflyer.com,REJECT",
    "DOMAIN-SUFFIX,adjust.com,REJECT",
    "DOMAIN-SUFFIX,tracking.miui.com,REJECT",
    "DOMAIN-KEYWORD,adservice,REJECT",
    "DOMAIN-KEYWORD,analytics,REJECT",
    "DOMAIN-KEYWORD,omniture,REJECT",
    "DOMAIN-KEYWORD,adview,REJECT",
    "DOMAIN-SUFFIX,speedtest.net,DIRECT",
    "DOMAIN-SUFFIX,ookla.com,DIRECT",
    "DOMAIN-SUFFIX,fast.com,国外通用",
    "DST-PORT,123,DIRECT",
    "DST-PORT,3478,DIRECT",
    "DST-PORT,51413,DIRECT",
    
    // 最终匹配
    "RULE-SET,google_domain,Google",
    "RULE-SET,cn_domain,国内",
    "RULE-SET,cn_ip,国内",
    "RULE-SET,geolocation_no_cn,国外通用",
    "GEOIP,CN,国内",
    "MATCH,国外通用"
  ];

  // 遍历所有节点，为没有设置指纹的节点添加默认指纹 (Lumex 1.18+ 弃用了全局 client-fingerprint)
  // 同时强制开启 UDP，防止部分机场节点配置遗漏导致游戏/语音不通
  if (config.proxies && Array.isArray(config.proxies)) {
    config.proxies.forEach(function(proxy) {
      if (proxy.type !== 'direct' && proxy.type !== 'reject') {
        proxy["client-fingerprint"] = proxy["client-fingerprint"] || "edge";
        if (proxy["udp"] === undefined) {
          proxy["udp"] = true;
        }
      }
    });
  }

  return config;
}
