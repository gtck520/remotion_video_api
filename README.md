# Remotion Video Generation Service

A high-performance video generation API built with **Remotion**, **Express**, and **Bun**. Designed for seamless integration with automation tools like **n8n** and AI Agents via **MCP** (Model Context Protocol).

## 🚀 Features

- **Asynchronous Rendering**: Non-blocking job queue with concurrency control.
- **Parametrized Templates**: Dynamic video generation via JSON payloads.
- **Video Merging**: Built-in endpoint to stitch multiple video clips.
- **MCP Support**: Native integration for AI Agents (Cursor, Windsurf, Claude Desktop).
- **Auto-Cleanup**: Automatic garbage collection for expired render files.
- **Docker-Ready**: Runs on Bun for maximum performance.

## 🛠️ Installation & Setup

### Prerequisites
- [Bun](https://bun.sh/) v1.0+ (Recommended) or Node.js v18+
- Linux/macOS environment (FFmpeg static binary included)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

2. **Start the Service**
   The service runs on port **3005** by default.
   ```bash
   npm run dev
   ```

3. **Verify Installation**
   Visit `http://localhost:3005` or check the health via:
   ```bash
   curl http://localhost:3005/renders
   ```

## 🔌 API Documentation

Detailed API usage, endpoints, and examples are available in [API.md](./API.md).

### Core Endpoints
- `POST /renders` - Submit a rendering job.
- `GET /renders/:jobId` - Check job status and get video URL.
- `POST /merge` - Merge multiple videos into one.

## 🤖 MCP Integration (For AI Agents)

This service exposes an MCP (Model Context Protocol) interface, allowing AI assistants to directly discover templates and generate videos.

### Configuration (for Claude Desktop / Cursor)
Add the following to your MCP settings file:

```json
{
  "mcpServers": {
    "remotion-video": {
      "command": "node",
      "args": ["path/to/server/index.ts"], 
      "url": "http://localhost:3005/mcp/sse" 
    }
  }
}
```
*Note: Since this runs as an HTTP SSE server, point your MCP client to the SSE endpoint.*

## 🎬 Available Templates

See [API.md](./API.md#available-templates) for full parameter schemas.

| Template ID | Description | Key Parameters |
|:---|:---|:---|
| **IntroTitle** | Animated title screen | `title`, `subtitle`, `logoUrl` |
| **KnowledgeCard** | Bullet points with optional image | `title`, `points`, `imageUrl` |
| **Comparison** | Split-screen comparison | `leftTitle`, `rightTitle`, `leftPoints` |
| **DataChart** | Animated bar chart | `title`, `data` (label/value) |
| **Gallery** | Grid image showcase | `title`, `images` |

## 🧹 Maintenance

- **Auto-Cleanup**: Rendered files are automatically deleted after 1 hour to save disk space.
- **Logs**: Check console output for job status and errors.

## 📄 License

Private Project.
