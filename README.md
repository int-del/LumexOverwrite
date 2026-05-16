# Lumex Configuration Repository

## 维护说明 (Maintenance)

**推送更新 (Push Updates)**:
由于本地文件存储在 `Lumex/` 子目录，但远程链接指向仓库根目录，必须使用 `git subtree` 命令推送：
```powershell
# 在 Git/ 根目录下执行:
git subtree push --prefix Lumex origin main
```

## 配置文件说明 (Configuration Profiles)

本仓库提供两种针对不同平台深度优化的配置文件。请根据您的客户端选择合适的链接。

### 1. [Lumex.yaml](https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Lumex.yaml)
> **适用平台**: Windows / Linux / macOS (Lumex Verge, Lumex, Lumex for Windows)

*   **平台适配**: 包含针对 Windows 进程名 (`.exe`) 的分流规则。
*   **性能优化**: 默认关闭 QUIC Sniffer 以降低 CPU 占用；开启 DoQ (DNS over QUIC) 极速解析。
*   **开发友好**: 修复 VS Code 本地回环 (`localhost`, `127.0.0.1`) 连接问题。

### 2. [Stash.yaml](https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Stash.yaml)
> **适用平台**: iOS / macOS (Stash)

*   **省电特化**:
    *   心跳检测间隔延长至 600s，大幅减少 iOS 后台唤醒频率。
    *   关闭 QUIC Sniffer，避免移动端 CPU 解密开销。
    *   全策略组开启 `lazy: true` 懒加载。
*   **iOS 特性**:
    *   **MitM & Rewrite**: 内置 Google CN 重定向修复（**注意**：首次使用需在 Stash "配置列表 -> 覆写/MitM" 中生成并信任 CA 证书）。
    *   **进程匹配**: 移除 `.exe` 后缀，适配 macOS 应用生态。
*   **DNS 增强**: 采用 DoQ 协议 (`quic://dns.alidns.com`)，在 4G/5G 切换时连接更稳定。

### 3. [Stash.stoverride](https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Stash.stoverride)
> **适用平台**: iOS (Stash) - 终极覆写版 (Ultimate Override)

*   **功能定位**: 基于标准版配置的增强型覆写文件，需在 Stash "配置列表 -> 覆写" 中加载。
*   **独家增强**:
    *   **Tile 可视化**: 首页集成 "网络信息"、"节点详情" 面板。
    *   **脚本控制**: 集成 QUIC 阻断脚本与 TCP 并发优化 (Hybla/BBR 思想)。
*   **策略同步**: 
    *   保持与标准版完全一致的 `国内` / `国外通用` 分组逻辑。
    *   Google 搜索策略精简为 `AI自动优选` -> `自动选择`，移除冗余跳转。

## 订阅链接 (Subscription Links)

直接将以下链接复制到客户端中“下载/导入配置”：

*   **桌面端 (Windows / Mac / Linux)**:
    ```url
    https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Lumex.yaml
    ```

*   **移动端 (iOS Stash)**:
    ```url
    https://raw.githubusercontent.com/int-del/LumexOverwrite/main/Stash.yaml
    ```

## 核心优化技术 (Key Technologies)

1.  **DNS over QUIC (DoQ)**
    *   使用 `quic://dns.alidns.com:853` 替代传统 UDP/DoH。
    *   优势：0-RTT 握手（秒开网页），基于 UDP 但加密，无视传统 DNS 污染与 TCP 阻断。

2.  **AI 智能分流 (AI Routing)**
    *   针对 OpenAI, Claude, Gemini, Copilot 建立独立策略组。
    *   自动剔除高风险节点（如香港、圣何塞等常被封锁的节点）。
    *   优先调度新加坡/美国原生节点。

3.  **抗污染 Fallback 机制**
    *   摒弃被严重干扰的 `1.1.1.1` / `8.8.8.8` UDP 端口。
    *   采用 `https://1.0.0.1` (CF 备用) + `tcp://208.67.222.222` (OpenDNS) + `tls://8.8.4.4`。
    *   确保分流判断的准确性，防止国内流量误走代理。

4.  **开发与硬件生态**
    *   **Bambu Lab (拓竹)**: 强制直连国内(阿里云)服务，加速切片传输与云端打印。
    *   **HuggingFace**: 模型下载自动优选。
    *   **GitHub**: 网页走代理，Raw 资源自动加速。

---
*Last Update: 2026-01-27*
