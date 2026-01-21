# n8n 视频生成工作流配置指南 (Video Generation Workflow Guide)

本文档旨在帮助您在 n8n 中构建完整的视频生成流水线，特别是如何处理 **异步渲染结果获取** 的问题。

## ⚠️ 核心问题：异步渲染
视频渲染是一个耗时过程（通常需要几十秒到几分钟）。
- 当您调用 `exec_tool (render_video)` 时，服务器会 **立即返回** 一个 `jobId`，而不是最终视频。
- **n8n 默认不会等待渲染完成**，所以您需要构建一个 **"轮询 (Polling)"** 或 **"Webhook 回调"** 机制来获取最终结果。

---

## 🏗️ 方案一：Webhook 回调 (推荐，更省资源)

这是最高效的方法。n8n 不用空转等待，而是等视频做好了，服务器主动通知 n8n。

### 1. n8n 配置 (接收端)
1.  **Webhook Node**: 创建一个新的工作流（或在现有工作流中添加 Webhook 触发器）。
    *   **Method**: `POST`
    *   **Path**: `/webhook/video-completed` (例如)
    *   **Authentication**: None (或者根据需要配置 Header Auth)
    *   **复制 Test/Production URL**: 例如 `http://n8n.your-domain.com/webhook/video-completed`

### 2. n8n 配置 (发送端)
在您的主工作流中，调用渲染接口时，多传一个 `webhookUrl` 参数。

**HTTP Request (Submit Render)**:
*   **Body**:
    ```json
    {
      "compositionId": "MasterSequence",
      "inputProps": {{ $json.inputProps }},
      "webhookUrl": "http://n8n.your-domain.com/webhook/video-completed"
    }
    ```

### 3. 处理回调
当视频渲染完成后，您的 Webhook Node 会收到如下 JSON：
```json
{
  "jobId": "...",
  "status": "completed",
  "videoUrl": "http://localhost:3005/renders/....mp4",
  "inputProps": { ... }
}
```
您可以在这个新的工作流里继续后续操作（发邮件、上传 S3 等）。

---

## 🏗️ 方案二：轮询等待 (Polling) - 适用于无法使用 Webhook 的内网环境

如果您的 n8n 和 Remotion 服务都在内网，且 Remotion 无法访问 n8n 的 Webhook 地址，可以使用此方法。

### 1. 提交渲染任务 (Submit Render)
*   **Trigger**: Webhook / Chat Input
*   **LLM (Scriptwriter)**: 生成分镜脚本 JSON。

### 2. 提交渲染任务 (Submit Render)
*   **LLM (Director)**: 生成 `inputProps`。
*   **HTTP Request (Submit)**:
    *   **Method**: `POST`
    *   **URL**: `http://localhost:3005/renders`
    *   **Body**: `{"compositionId": "MasterSequence", "inputProps": ...}`
    *   **Output**: 获取 `jobId` (例如: `1358c765-9cca...`)

### 3. 🔄 轮询等待结果 (Wait & Poll) - **关键步骤**
在获取 `jobId` 后，您需要添加一个循环结构来检查状态。

#### 节点设计 (Loop Strategy):

1.  **Wait Node (等待)**:
    *   **Time**: 5 ~ 10 秒 (给服务器一点时间)
2.  **HTTP Request (Check Status)**:
    *   **Method**: `GET`
    *   **URL**: `http://localhost:3005/renders/{{ $json.jobId }}`
    *   **Response**: 会返回包含 `status` 字段的 JSON。
        *   `status`: "queued" | "in-progress" | "completed" | "failed"
3.  **If / Switch Node (判断状态)**:
    *   **Condition**: `{{ $json.status }}`
    *   **Case "completed"**: -> ✅ **结束循环，输出视频 URL**。
    *   **Case "failed"**: -> ❌ **报错并停止**。
    *   **Case "in-progress" / "queued"**: -> 🔄 **返回到 "Wait Node" 继续等待**。

---

## 💡 n8n 具体节点配置 (Check Status)

在 n8n 的 Loop 结构中，配置如下：

**HTTP Request (Check Status)**
- **URL**: `http://localhost:3005/renders/{{ $node["Submit Render"].json.jobId }}` (注意引用之前节点的 jobId)
- **Method**: `GET`

**Switch (Is Completed?)**
- **String**: `{{ $json.status }}`
- **Route 1 (Done)**: value = `completed`
- **Route 2 (Error)**: value = `failed`
- **Route 3 (Waiting)**: default / fallback (连接回 Wait 节点)

---

## 🚀 最终输出 (Final Output)
当状态变为 `completed` 时，您将获得如下 JSON：
```json
{
  "status": "completed",
  "videoUrl": "http://localhost:3005/renders/1358c765-9cca-4956-9420-c8acf591ab81.mp4",
  "outputLocation": "/www/remotion/renders/..."
}
```
此时，您可以使用 **HTTP Request (Download)** 节点下载视频，或者直接将 `videoUrl` 发送给用户/上传到其他平台。
