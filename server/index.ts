import express from "express";
import { makeRenderQueue } from "./render-queue";
import { bundle } from "@remotion/bundler";
import path from "node:path";
import cors from "cors";
import { mergeVideos } from "./merge";
import { setupMcp } from "./mcp";

const { PORT = 3005, REMOTION_SERVE_URL } = process.env;

function setupApp({ remotionBundleUrl }: { remotionBundleUrl: string }) {
  const app = express();
  app.use(cors());

  const rendersDir = path.resolve("renders");

  const queue = makeRenderQueue({
    port: Number(PORT),
    serveUrl: remotionBundleUrl,
    rendersDir,
    concurrency: 1,
  });

  // Setup MCP before express.json() to avoid body parsing conflicts with SSE transport
  setupMcp(app, queue, remotionBundleUrl, Number(PORT), rendersDir);

  app.use(express.json());

  // Start cleanup job

  // Host renders on /renders
  app.use("/renders", express.static(rendersDir));
  app.use(express.static(path.resolve("public"))); // Serve public files like audio

  // Endpoint to create a new job
  app.post("/renders", async (req, res) => {
    const { compositionId, inputProps } = req.body;

    if (!compositionId || typeof compositionId !== "string") {
      res.status(400).json({ message: "compositionId must be a string" });
      return;
    }

    const jobId = queue.createJob({
      compositionId,
      inputProps: inputProps || {},
    });

    res.json({ jobId });
  });

  // Endpoint to get a job status
  app.get("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;
    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    res.json(job);
  });

  // Endpoint to cancel a job
  app.delete("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;

    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (job.status !== "queued" && job.status !== "in-progress") {
      res.status(400).json({ message: "Job is not cancellable" });
      return;
    }

    job.cancel();

    res.json({ message: "Job cancelled" });
  });

  // Endpoint to merge videos
  app.post("/merge", async (req, res) => {
    const { videoUrls } = req.body;

    if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
      res.status(400).json({ message: "videoUrls must be a non-empty array of strings" });
      return;
    }

    try {
        // Map URLs to local paths if they are served by this server
        const paths = (videoUrls as string[]).map(url => {
          if (url.includes(`localhost:${PORT}/renders/`)) {
             const filename = url.split('/').pop();
             if (filename) return path.join(rendersDir, filename);
          }
          // Note: ffmpeg supports HTTP URLs, so we can pass external URLs too if ffmpeg is built with network support
          // ffmpeg-static usually supports this.
          return url;
        });

        const result = await mergeVideos(paths, rendersDir, Number(PORT));
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error instanceof Error ? error.message : String(error) });
    }
  });

  return app;
}

async function main() {
  // await ensureBrowser();

  const remotionBundleUrl = REMOTION_SERVE_URL
    ? REMOTION_SERVE_URL
    : await bundle({
        entryPoint: path.resolve("remotion/index.ts"),
        onProgress(progress) {
          console.info(`Bundling Remotion project: ${progress}%`);
        },
      });

  const app = setupApp({ remotionBundleUrl });

  app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
    console.info(`MCP SSE endpoint available at http://localhost:${PORT}/mcp/sse`);
  });
}

main();
