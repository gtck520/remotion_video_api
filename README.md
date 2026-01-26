# Remotion Video Generation Server

基于 Remotion 的视频生成服务端，支持通过 API 或 MCP 协议生成带有特效、字幕、AI 语音的短视频。

## 🚀 快速开始

### 1. 环境准备

- Node.js & Bun Runtime
- Chrome (用于 Headless 渲染)
- Docker (可选，用于生产环境部署)

### 2. 安装依赖

您可以选择使用 `bun` (推荐) 或 `npm` 进行安装。

**使用 Bun (推荐):**
```bash
bun install
```

**使用 NPM:**
```bash
npm install
```

### 3. 配置文件

项目使用 `.env.dev` (开发/测试) 和 `.env.prod` (生产) 来区分环境配置。

1. 复制示例配置：
   ```bash
   cp .env.example .env.dev
   ```
2. 编辑 `.env.dev` 填入必要的 API Key (OpenAI, Pexels, Aliyun OSS 等)。

**注意**：
- **开发/测试环境**：建议使用 `.env.dev`。
- **生产环境 (Docker)**：默认加载 `.env.prod`。

### 4. 启动服务

**本地开发/测试 (建议端口 3006)**：

使用 Bun:
```bash
# 启动服务 (默认读取 .env 文件，请确保正确配置或软链接)
PORT=3006 bun run server
```

使用 NPM:
```bash
PORT=3006 npm run server
```

**生产环境部署 (默认端口 3005)**：

通常使用 Docker 运行，容器映射到宿主机 3005 端口。

```bash
docker-compose up -d
```

## 🛠️ 功能特性

- **MCP Server 支持**：可以直接作为 MCP Server 接入 Claude/Cursor 等 AI 助手。
- **智能视频生成**：
  - 支持 `CyberIntro`, `SmartExplainer` 等多种模板。
  - 自动根据脚本匹配素材 (Pexels) 或生成 AI 图片。
  - 集成 EdgeTTS 语音合成。
  - 自动生成字幕和特效。
- **n8n 集成**：提供 API 接口供 n8n 工作流调用，实现自动化视频生产。

## 📖 文档指南

- [n8n 工作流集成指南](./n8n-workflow-guide.md)

## ❓ 常见问题

- **构建卡死/超时**：请检查 Docker 镜像源配置，或确认内存资源是否充足（建议 > 4GB）。
- **MCP 连接失败**：请检查服务端日志 (`logs/app.log`)，确认服务是否正常启动且端口开放。

---

## 👥 AI+自动化交流群

专注于 **AI + n8n + Coze + RPA** 等工具的自动化实战，致力于利用技术为工作提效。

欢迎扫码加入交流或关注公众号获取最新教程：

| 扫码加好友 (备注: AI自动化) | 关注公众号 (陈程序员大康) |
| :---: | :---: |
| <img src="asset/image/微信图片_2025-08-07_091400_557.jpg" width="200" /> | <img src="asset/image/微信图片_20260126105845_127_405.jpg" width="200" /> |
| **微信号: kan28256** | **获取最新自动化教程** |
