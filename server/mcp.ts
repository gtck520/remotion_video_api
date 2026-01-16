import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { getCompositions } from "@remotion/renderer";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { mergeVideos } from "./merge";
import https from "node:https";
import querystring from "node:querystring";

const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
const VIP_API_HOST = process.env.VIP_API_HOST || '';
const VIP_API_PATH = process.env.VIP_API_PATH || '';

/** 
 * 验证用户 VIP 状态 
 * @param {string} token 用户提供的 Token 
 * @returns {Promise<boolean>} 是否为 VIP 
 */ 
function verifyUser(token: string): Promise<boolean> { 
    if (!AUTH_REQUIRED) return Promise.resolve(true); 
    if (!token) return Promise.resolve(false); 

    return new Promise((resolve) => { 
        const postData = querystring.stringify({ 
            'token': token 
        }); 

        const options = { 
            hostname: VIP_API_HOST, 
            port: 443, 
            path: VIP_API_PATH, 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded', 
                'Content-Length': postData.length 
            } 
        }; 

        const req = https.request(options, (res) => { 
            let data = ''; 
            res.on('data', (chunk) => data += chunk); 
            res.on('end', () => { 
                try { 
                    const json = JSON.parse(data); 
                    // 逻辑：code 为 1 且 data.is_vip 为 true 
                    if (json.code === 1 && json.data && json.data.is_vip === true) { 
                        console.log(`[AUTH] Token ${token.substring(0, 6)}... 验证成功 (VIP)`); 
                        resolve(true); 
                    } else { 
                        console.log(`[AUTH] Token ${token.substring(0, 6)}... 验证失败 (非VIP或无效)`); 
                        resolve(false); 
                    } 
                } catch (e: any) { 
                    console.error('[AUTH] API 响应解析失败:', e.message); 
                    resolve(false); 
                } 
            }); 
        }); 

        req.on('error', (e) => { 
            console.error('[AUTH] 请求验证接口失败:', e.message); 
            resolve(false); 
        }); 

        // 设置超时 
        req.setTimeout(5000, () => { 
            req.destroy(); 
            console.error('[AUTH] 验证请求超时'); 
            resolve(false); 
        }); 

        req.write(postData); 
        req.end(); 
    }); 
}

export const setupMcp = (
  app: express.Express,
  queue: any, // Typed as returned from makeRenderQueue
  remotionBundleUrl: string,
  port: number,
  rendersDir: string
) => {
  const server = new Server(
    {
      name: "remotion-render-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_templates",
          description: "List available video templates and their parameter schemas",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "render_video",
          description: "Render a video using a specific template and parameters",
          inputSchema: {
            type: "object",
            properties: {
              templateId: {
                type: "string",
                description: "The ID of the template (composition) to render",
              },
              inputProps: {
                type: "object",
                description: "Parameters for the template",
              },
            },
            required: ["templateId", "inputProps"],
          },
        },
        {
          name: "get_render_status",
          description: "Get the status of a render job",
          inputSchema: {
            type: "object",
            properties: {
              jobId: {
                type: "string",
                description: "The ID of the render job",
              },
            },
            required: ["jobId"],
          },
        },
        {
          name: "merge_videos",
          description: "Merge multiple video URLs or paths into a single video",
          inputSchema: {
            type: "object",
            properties: {
              videoUrls: {
                type: "array",
                items: { type: "string" },
                description: "List of video URLs or local paths to merge",
              },
            },
            required: ["videoUrls"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (request.params.name === "list_templates") {
        const compositions = await getCompositions(remotionBundleUrl);
        // We can't easily serialize Zod schemas to JSON schema here without the original Zod object
        // But selectComposition returns the composition with defaultProps.
        // For now, we'll return the list and default props as a hint.
        // Ideally, we would have access to the Zod schemas directly.
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                compositions.map((c) => ({
                  id: c.id,
                  width: c.width,
                  height: c.height,
                  fps: c.fps,
                  durationInFrames: c.durationInFrames,
                  defaultProps: c.defaultProps,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (request.params.name === "render_video") {
        const { templateId, inputProps } = request.params.arguments as any;
        const jobId = queue.createJob({
          compositionId: templateId,
          inputProps: inputProps || {},
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ jobId, statusUrl: `http://localhost:${port}/renders/${jobId}` }),
            },
          ],
        };
      }

      if (request.params.name === "get_render_status") {
        const { jobId } = request.params.arguments as any;
        const job = queue.jobs.get(jobId);
        
        if (!job) {
          throw new Error("Job not found");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(job),
            },
          ],
        };
      }
      
      if (request.params.name === "merge_videos") {
        const { videoUrls } = request.params.arguments as any;
        // Convert URLs to local paths if possible, or support URLs (ffmpeg supports URLs)
        // For security/simplicity, if they are local URLs (localhost:${port}/renders/...), map to local path
        
        const paths = (videoUrls as string[]).map(url => {
          if (url.includes(`localhost:${port}/renders/`)) {
             const filename = url.split('/').pop();
             if (filename) return `${rendersDir}/${filename}`;
          }
          return url;
        });

        const result = await mergeVideos(paths, rendersDir, port);
        
        return {
          content: [
             {
               type: "text",
               text: JSON.stringify(result),
             }
          ]
        };
      }

      throw new Error("Tool not found");
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  // SSE Endpoint
  // 使用简单的单例模式存储 transport
  // 警告：这意味着服务器同时只能服务一个客户端连接
  let transport: SSEServerTransport | undefined;

  app.post("/mcp/messages", async (req, res) => {
    // 这里的 req.query.sessionId 是 MCP SDK 客户端通常会带上的参数
    // 但如果客户端没带，我们需要一种机制来关联。
    // 简单起见，我们暂时只支持单实例（这在多用户并发时会有问题，但对于个人 Agent 使用足够）
    // 或者尝试从 URL query 中获取 sessionId
    
    // 更好的做法是：transport.handlePostMessage 内部处理了逻辑，我们只需要确保 transport 实例存在。
    // 由于 SSEServerTransport 设计上是针对单个连接的，我们需要为每个连接创建一个实例。
    // 但 SSE 协议中，POST 请求是独立的 HTTP 请求，如何关联到之前的 SSE 连接？
    // ModelContextProtocol SDK 的 SSEServerTransport 实现中，handlePostMessage 会解析消息。
    
    // 修正逻辑：
    // 我们目前是一个全局 transport 变量（这在多并发下是不对的，之前的代码就是这样）。
    // 正确的做法是：每次 SSE 连接创建一个 transport，并且把它存储起来（比如用 sessionID）。
    // 客户端发 POST 消息时，必须带上 sessionID，或者我们只有一个全局 transport（不支持并发）。
    
    // 鉴于目前代码结构，我们先回退到支持单连接的模式，但要修复 transport 未初始化的问题。
    // 之前的报错 "stream is not readable" 可能是因为 transport 已经被之前的连接关闭了或者状态不对。
    
    // 另外，MCP 规范中，客户端连接 SSE 后，会收到一个 endpoint URL用于发 POST 消息。
    // SDK 内部会自动处理这个 URL。
    
    if (!transport) {
      console.error("Transport not initialized");
      res.status(400).send("Transport not initialized");
      return;
    }
    
    try {
        await transport.handlePostMessage(req, res);
    } catch (err) {
        console.error("Error handling POST message:", err);
        // 不要在已经发送响应后再次发送
        if (!res.headersSent) {
             res.status(500).send(String(err));
        }
    }
  });

  // 拦截 SSE 连接进行鉴权
  app.get("/mcp/sse", async (req, res) => {
    if (AUTH_REQUIRED) {
        const token = req.query.token as string || req.headers['x-mcp-token'] as string || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!token) {
            console.log('[AUTH] 拒绝连接：缺少 Token');
            res.status(401).send("Unauthorized: Missing Token");
            return;
        }

        const isVip = await verifyUser(token);
        if (!isVip) {
             console.log('[AUTH] 拒绝连接：无效 Token 或非 VIP');
             res.status(403).send("Forbidden: Invalid Token or not VIP");
             return;
        }
    }

    console.log("New SSE connection established");
    transport = new SSEServerTransport("/mcp/messages", res);
    await server.connect(transport);
    
    // 监听连接关闭
    req.on('close', () => {
        console.log("SSE connection closed");
        // 这里不要置空 transport，因为 POST 请求可能还在路上，或者客户端重连逻辑
        // 但对于单例模式，关闭后确实应该清理
        // transport = undefined; 
    });
  });
};

