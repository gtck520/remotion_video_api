import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { getCompositions } from "@remotion/renderer";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { mergeVideos } from "./merge";

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

  app.get("/mcp/sse", async (req, res) => {
    transport = new SSEServerTransport("/mcp/messages", res);
    await server.connect(transport);
  });

  app.post("/mcp/messages", async (req, res) => {
    if (!transport) {
      res.sendStatus(400);
      return;
    }
    await transport.handlePostMessage(req, res);
  });
};
