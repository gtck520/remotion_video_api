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
  let transport: SSEServerTransport;

  app.post("/mcp/messages", async (req, res) => {
    if (AUTH_REQUIRED) {
        // 从 Query 或 Header 中获取 Token (MCP 协议通常不支持直接传 Header，这里假设通过 env 配置后，MCP 客户端连接时会带上)
        // 注意：SSE 连接通常是 GET /mcp/sse，而 POST /mcp/messages 是后续通信。
        // 对于 MCP，最简单的鉴权可能是在 SSE 连接时进行。
        // 但这里我们简单点，先不拦截 POST，而是在 SSE 连接时拦截。
    }

    if (!transport) {
      res.sendStatus(400);
      return;
    }
    await transport.handlePostMessage(req, res);
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

    transport = new SSEServerTransport("/mcp/messages", res);
    await server.connect(transport);
  });
};
