# Remotion 视频生成服务

基于 **Remotion**、**Express** 和 **Bun** 构建的高性能视频生成 API。专为与 **n8n** 等自动化工具以及通过 **MCP** (Model Context Protocol) 与 AI Agent 无缝集成而设计。

## 🚀 功能特性

- **异步渲染**：带有并发控制的非阻塞任务队列。
- **参数化模板**：通过 JSON 负载动态生成视频。
- **视频合并**：内置端点，支持将多个视频片段拼接为一个。
- **MCP 支持**：为 AI Agent (如 Cursor, Windsurf, Claude Desktop) 提供原生集成支持。
- **自动清理**：自动垃圾回收过期的渲染文件。
- **Docker 就绪**：基于 Bun 运行，性能最大化。

## 🛠️ 安装与设置

### 前置要求
- [Bun](https://bun.sh/) v1.0+ (推荐) 或 Node.js v18+
- Linux/macOS 环境 (已包含 FFmpeg 静态二进制文件)

### 快速开始

1.  **安装依赖**
    ```bash
    npm install
    # 或者
    bun install
    ```

2.  **配置环境变量**
    复制 `.env.example` 到 `.env` 并配置相关参数：
    ```bash
    cp .env.example .env
    ```

3.  **启动服务**
    服务默认运行在 **3005** 端口。
    ```bash
    npm run dev
    ```

4.  **验证安装**
    访问 `http://localhost:3005` 或检查健康状态：
    ```bash
    curl http://localhost:3005/renders
    ```

## 🔌 API 文档

详细的 API 用法、端点和示例请参阅 [API.md](./API.md)。

### 核心端点
- `POST /renders` - 提交渲染任务。
- `GET /renders/:jobId` - 检查任务状态并获取视频 URL。
- `POST /merge` - 将多个视频合并为一个。

## 🤖 MCP 集成 (AI Agent 专用)

本服务暴露了一个 MCP (Model Context Protocol) 接口，允许 AI 助手直接发现模板并生成视频。

### 鉴权配置
如果在 `.env` 中开启了鉴权 (`AUTH_REQUIRED=true`)，则 MCP 客户端在连接时需要提供有效的 Token。

### 客户端配置 (Claude Desktop / Cursor)
在您的 MCP 设置文件中添加以下内容：

```json
{
  "mcpServers": {
    "remotion-video": {
      "command": "node",
      "args": ["path/to/server/index.ts"], 
      "url": "http://localhost:3005/mcp/sse",
      "env": {
        "MCP_AUTH_TOKEN": "您的VIP令牌"
      }
    }
  }
}
```
*注意：由于这是一个 HTTP SSE 服务，请将您的 MCP 客户端指向 SSE 端点。*

## 🎬 可用模板

查看 [API.md](./API.md#available-templates) 获取完整的参数 Schema。

| 模板 ID | 描述 | 关键参数 |
|:---|:---|:---|
| **IntroTitle** | 动画标题页 | `title`, `subtitle`, `logoUrl` |
| **KnowledgeCard** | 带可选图片的知识卡片 | `title`, `points`, `imageUrl` |
| **Comparison** | 分屏对比 | `leftTitle`, `rightTitle`, `leftPoints` |
| **DataChart** | 动画柱状图 | `title`, `data` (label/value) |
| **Gallery** | 网格图片展示 | `title`, `images` |

## 🧹 维护

- **自动清理**：渲染文件会在 1 小时后自动删除以节省磁盘空间。
- **日志**：查看控制台输出以获取任务状态和错误信息。

## 📄 许可证
私有项目。
