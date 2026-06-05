# Hostc 隧道

通过 [hostc](https://github.com/nicepkg/hostc) 将本地 Songloft 服务暴露到公网，无需安装额外二进制文件。

## 功能

- 一键创建公网隧道，通过 hostc 服务器中转流量
- 纯 JS 实现，利用 WebSocket 多路复用协议，无需 cloudflared 等外部依赖
- 支持自定义隧道服务器地址和数据通道数
- 断线自动重连

## 开发

```bash
npm install
npm run dev         # watch + auto-upload to local Songloft
npm run build       # produce dist/hostc.jsplugin.zip
npm run validate    # verify plugin.json hashes
```

## 权限

| 权限 | 用途 |
|------|------|
| `storage` | 持久化隧道服务器地址等配置 |
| `websocket` | 与 hostc 服务器建立 WebSocket 数据通道 |

## 作者

Songloft Team

## 许可证

Apache-2.0 © 2026 Songloft Team
