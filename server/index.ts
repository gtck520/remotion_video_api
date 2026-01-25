import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import util from "node:util";

// Load environment variables
// Priority: .env.prod > .env > .env.dev (for local development)
if (fs.existsSync(path.resolve(".env.prod"))) {
    console.log("[Setup] Loading environment from .env.prod");
    dotenv.config({ path: path.resolve(".env.prod") });
} else if (fs.existsSync(path.resolve(".env"))) {
    dotenv.config({ path: path.resolve(".env") });
} else if (fs.existsSync(path.resolve(".env.dev"))) {
    console.log("[Setup] Loading environment from .env.dev");
    dotenv.config({ path: path.resolve(".env.dev") });
} else {
    dotenv.config(); // Fallback to default behavior
}

import { listMusicStyles, getMusicForStyle } from "./services/musicLibrary";

// --- PRE-FLIGHT CHECK: Ensure Browser Cache Symlink ---
// This ensures that Remotion's download logic (which looks in node_modules/.remotion)
// is redirected to our persistent cache volume (.remotion_cache).
// This is critical for Jenkins/Docker environments to avoid repeated downloads.
(() => {
    try {
        const cacheDir = path.resolve(".remotion_cache");
        const targetLink = path.resolve("node_modules/.remotion");

        // 1. Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
            console.log(`[Setup] Creating cache directory: ${cacheDir}`);
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // 2. Check existing link/folder
        if (fs.existsSync(targetLink)) {
            const stats = fs.lstatSync(targetLink);
            if (stats.isSymbolicLink()) {
                const realPath = fs.realpathSync(targetLink);
                if (realPath === cacheDir) {
                    console.log(`[Setup] Symlink verified: node_modules/.remotion -> ${cacheDir}`);
                    return; // All good
                }
                console.log(`[Setup] Updating symlink: was pointing to ${realPath}`);
                fs.unlinkSync(targetLink);
            } else if (stats.isDirectory()) {
                console.log(`[Setup] Removing existing directory at node_modules/.remotion to replace with symlink...`);
                fs.rmSync(targetLink, { recursive: true, force: true });
            } else {
                fs.unlinkSync(targetLink);
            }
        }

        // 3. Create Symlink
        console.log(`[Setup] Creating symlink: node_modules/.remotion -> ${cacheDir}`);
        fs.symlinkSync(cacheDir, targetLink, 'dir'); // 'dir' is for Windows compatibility, ignored on Linux but good practice
        console.log(`[Setup] Symlink created successfully.`);

    } catch (e) {
        console.error(`[Setup] Failed to setup browser cache symlink:`, e);
        // We don't exit process here, hoping it might still work or the error is non-fatal
    }
})();
// ------------------------------------------------------

import express from "express";
import { makeRenderQueue } from "./render-queue";
import { bundle } from "@remotion/bundler";
import { getCompositions } from "@remotion/renderer";
import path from "node:path";
import cors from "cors";
import { mergeVideos } from "./merge";
import { setupMcp, verifyUser, enrichScenes } from "./mcp";
import { listMusicStyles } from "./services/musicLibrary";
import { ensureLocalBrowser } from "./browser";
import fs from "node:fs";
import util from "node:util";
import { startCleanupJob } from "./cleanup";
import { getProxyAgent } from "./proxy";
import fetch from "node-fetch";

const { PORT = 3005, REMOTION_SERVE_URL, AUTH_REQUIRED = "false" } = process.env;

// Setup persistent logging
let logFile: fs.WriteStream | undefined;
try {
    const logDir = path.resolve("logs");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Try to append to app.log, fallback to unique file if permission denied
    const logPath = path.join(logDir, "app.log");
    
    const openLogStream = (p: string) => {
        const stream = fs.createWriteStream(p, { flags: 'a' });
        stream.on('error', (err) => {
             console.warn(`[Server] Log stream error for ${p}:`, err.message);
             // If main log fails, try fallback if not already fallback
             if (p === logPath) {
                 const fallbackPath = path.join(logDir, `app-${Date.now()}.log`);
                 console.warn(`[Server] Switching to fallback log: ${fallbackPath}`);
                 logFile = openLogStream(fallbackPath);
             }
        });
        return stream;
    };

    try {
        // Check write permission if file exists
        if (fs.existsSync(logPath)) {
            fs.accessSync(logPath, fs.constants.W_OK);
        }
        logFile = openLogStream(logPath);
    } catch (e) {
        console.warn(`[Server] Cannot write to ${logPath}, trying fallback...`);
        const fallbackPath = path.join(logDir, `app-${Date.now()}.log`);
        logFile = openLogStream(fallbackPath);
    }
} catch (e) {
    console.warn("[Server] Failed to setup file logging:", e);
}

const logStdout = process.stdout;
const logStderr = process.stderr;

console.log = function(...args) {
    const timestamp = new Date().toISOString();
    const msg = util.format(...args);
    if (logFile) logFile.write(`[${timestamp}] [INFO] ${msg}\n`);
    logStdout.write(`[${timestamp}] [INFO] ${msg}\n`);
};

console.error = function(...args) {
    const timestamp = new Date().toISOString();
    const msg = util.format(...args);
    if (logFile) logFile.write(`[${timestamp}] [ERROR] ${msg}\n`);
    logStderr.write(`[${timestamp}] [ERROR] ${msg}\n`);
};

console.warn = function(...args) {
    const timestamp = new Date().toISOString();
    const msg = util.format(...args);
    if (logFile) logFile.write(`[${timestamp}] [WARN] ${msg}\n`);
    logStdout.write(`[${timestamp}] [WARN] ${msg}\n`);
};

console.info = function(...args) {
    const timestamp = new Date().toISOString();
    const msg = util.format(...args);
    if (logFile) logFile.write(`[${timestamp}] [INFO] ${msg}\n`);
    logStdout.write(`[${timestamp}] [INFO] ${msg}\n`);
};

function setupApp({ remotionBundleUrl }: { remotionBundleUrl: string }) {
  const app = express();
  app.use(cors());

  // DEBUG: Log all incoming requests to debug connection issues
  app.use((req, res, next) => {
    console.log(`[Server] Request: ${req.method} ${req.url} from ${req.ip}`);
    next();
  });

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

  // Host renders on /renders
  app.use("/renders", express.static(rendersDir));
  app.use(express.static(path.resolve("public"))); // Serve public files like audio

  // Proxy endpoint for Remotion offthread video or general media
  app.get("/proxy", async (req, res) => {
    const { src } = req.query;
    if (!src || typeof src !== 'string') {
        res.status(400).send("Missing src query parameter");
        return;
    }
    
    try {
        const agent = getProxyAgent(src);
        console.log(`[Proxy] Proxying request to: ${src}`);
        
        const response = await fetch(src, { 
            agent,
            headers: {
                'User-Agent': 'Remotion-Proxy/1.0'
            }
        });

        if (!response.ok) {
            console.error(`[Proxy] Upstream error: ${response.status} ${response.statusText}`);
            res.status(response.status).send(response.statusText);
            return;
        }

        // Forward headers
        res.status(response.status);
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        response.body.pipe(res);
    } catch (e) {
        console.error(`[Proxy] Failed to proxy ${src}:`, e);
        res.status(500).send(String(e));
    }
  });

  // Start cleanup job
  startCleanupJob([rendersDir, path.resolve("public/audio")]);

  // Endpoint to create a new job
  app.post("/renders", async (req, res) => {
    console.log(`[API] POST /renders received body keys: ${Object.keys(req.body).join(',')}`);
    let { compositionId, inputProps, webhookUrl, token, width, height } = req.body;
    
    if (compositionId === 'MasterSequence') {
        console.log(`[API] Composition is MasterSequence. inputProps keys: ${inputProps ? Object.keys(inputProps).join(',') : 'undefined'}`);
        if (inputProps && inputProps.scenes) {
            console.log(`[API] Scenes found: ${Array.isArray(inputProps.scenes) ? inputProps.scenes.length : 'not array'}`);
        }
    }

    if (AUTH_REQUIRED === 'true') {
        const isVip = await verifyUser(token);
        if (!isVip) {
            console.warn(`[API] Authentication failed for /renders. Token: ${token}`);
            res.status(401).json({ message: "Authentication failed. Invalid or missing VIP token." });
            return;
        }
    }

    if (!compositionId || typeof compositionId !== "string") {
      res.status(400).json({ message: "compositionId must be a string" });
      return;
    }

    // SMART ENRICHMENT (Mirroring MCP logic)
    if (compositionId === "MasterSequence" && inputProps && inputProps.scenes) {
        console.log(`[API] Detected MasterSequence. enriching scenes...`);
        try {
             const voice = inputProps.voice || 'zh-CN-XiaoxiaoNeural';
             // Force calculation (true) to ensure video duration matches generated audio
             const { processedScenes, subtitles } = await enrichScenes(inputProps.scenes, voice, Number(PORT), true);
             if (processedScenes && processedScenes.length > 0) {
                 console.log(`[API] Scene 0 audio after enrichment: ${processedScenes[0].audio}`);
             }
             inputProps.scenes = processedScenes;
             
             // Also update subtitles if they were recalculated
             if (subtitles && subtitles.length > 0) {
                 inputProps.subtitles = subtitles;
             }

             // --- BACKGROUND MUSIC ENRICHMENT ---
             if (inputProps.bgMusic && inputProps.bgMusic.style) {
                 console.log(`[API] Processing bgMusic request for style: ${inputProps.bgMusic.style}`);
                 try {
                     const musicTrack = await getMusicForStyle(inputProps.bgMusic.style, Number(PORT));
                     if (musicTrack) {
                         console.log(`[API] Music track found: ${musicTrack.name} (${musicTrack.localUrl})`);
                         inputProps.bgMusic.src = musicTrack.localUrl;
                         // If loop is not specified, default to true for background music
                         if (inputProps.bgMusic.loop === undefined) inputProps.bgMusic.loop = true;
                     } else {
                         console.warn(`[API] No music found for style: ${inputProps.bgMusic.style}. Skipping bgMusic.`);
                         // Optional: Remove bgMusic prop to avoid rendering errors if component expects valid src
                         // delete inputProps.bgMusic; 
                         // Better: Keep it but component should handle missing src safely.
                     }
                 } catch (musicErr) {
                     console.error(`[API] Failed to fetch background music:`, musicErr);
                 }
             }
        } catch (e) {
            console.error("[API] Failed to enrich MasterSequence scenes:", e);
            // Continue with original props on error
        }
    }

    const jobId = queue.createJob({
      compositionId,
      inputProps: inputProps || {},
      webhookUrl,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
    });
    
    console.log(`[API] Job created: ${jobId}`);
    res.json({ jobId });
  });

  // Endpoint to get a job status
  app.get("/renders/:jobId", async (req, res) => {
    // Note: Status checks usually don't strictly require auth if the JobID is secret enough (UUID),
    // but we can add it if needed. For now, we leave it open for easier polling or add optional check.
    const jobId = req.params.jobId;
    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    res.json(job);
  });

  // Endpoint to cancel a job
  app.delete("/renders/:jobId", async (req, res) => {
     // Cancellation should probably be protected
     if (AUTH_REQUIRED === 'true') {
        const token = req.query.token as string || req.body.token;
        const isVip = await verifyUser(token);
        if (!isVip) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
     }
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

  // Endpoint to list music styles
  app.get("/api/music/styles", async (req, res) => {
    try {
      const styles = await listMusicStyles();
      res.json({ styles });
    } catch (err) {
      console.error("Failed to list music styles:", err);
      res.status(500).json({ error: "Failed to list music styles" });
    }
  });

  // Endpoint to merge videos
  app.post("/merge", async (req, res) => {
    const { videoUrls, token } = req.body;

    if (AUTH_REQUIRED === 'true') {
        const isVip = await verifyUser(token);
        if (!isVip) {
             res.status(401).json({ message: "Authentication failed. Invalid or missing VIP token." });
             return;
        }
    }

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
  // Ensure we have a cached browser to avoid repeated downloads
  try {
      const cachedBrowser = await ensureLocalBrowser();
      process.env.PUPPETEER_EXECUTABLE_PATH = cachedBrowser;
      console.log(`[Server] Set PUPPETEER_EXECUTABLE_PATH to cached browser: ${cachedBrowser}`);
  } catch (e) {
      console.error("[Server] Failed to ensure local browser:", e);
  }
  
  // 检查 Chrome 是否可用
  if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.warn("WARNING: PUPPETEER_EXECUTABLE_PATH is not set. Remotion might try to download Chrome.");
  } else {
      console.log(`[Server] Using system Chrome at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  }

  console.log("[Server] Starting bundling process...");
  const bundleStart = Date.now();
  const remotionBundleUrl = REMOTION_SERVE_URL
    ? REMOTION_SERVE_URL
    : await bundle({
        entryPoint: path.resolve("remotion/index.ts"),
        onProgress(progress) {
          // Log only significant progress to avoid spam
          if (progress % 10 === 0) {
            console.info(`[Bundler] Progress: ${progress}%`);
          }
        },
      });
  console.log(`[Server] Bundling completed in ${((Date.now() - bundleStart) / 1000).toFixed(1)}s`);
  console.log(`[Server] Bundle URL: ${remotionBundleUrl}`);

  const app = setupApp({ remotionBundleUrl });

  // Use system installed Chromium or Google Chrome
    let browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!browserExecutable) {
      if (fs.existsSync('/usr/bin/chromium')) {
        browserExecutable = '/usr/bin/chromium';
      } else if (fs.existsSync('/usr/bin/google-chrome')) {
        browserExecutable = '/usr/bin/google-chrome';
      } else {
        browserExecutable = '/usr/bin/chromium'; // Fallback
      }
    }
    
    console.log(`[Server] Using browser executable: ${browserExecutable}`);

    // 预加载：获取一次模板列表，触发 Remotion 内部缓存和初始化
    // 这将确保浏览器下载在服务器启动时完成，而不是在第一个请求时
    console.log("[Server] Pre-warming Remotion templates (checking browser)...");
    
    // Explicitly ensure browser is present before pre-warming
    // Note: getCompositions will trigger download if onBrowserDownload is provided,
    // but we want to make sure the download process is visible and blocking during startup.
    
    // await getCompositions(remotionBundleUrl, {
    //   browserExecutable,
    //   chromiumOptions: {
    //     executablePath: browserExecutable,
    //     headless: false,
    //     ignoreDefaultArgs: ["--headless"],
    //     args: [
    //       "--headless=new",
    //       "--no-sandbox",
    //       "--disable-setuid-sandbox",
    //       "--disable-dev-shm-usage",
    //       "--disable-gpu",
    //       "--no-xshm",
    //       "--disable-software-rasterizer",
    //       "--disable-gpu-compositing",
    //       "--no-zygote",
    //       "--disable-extensions",
    //       "--disable-background-networking",
    //       "--disable-default-apps",
    //       "--disable-sync",
    //       "--mute-audio",
    //       "--use-gl=swiftshader",
    //       "--use-angle=swiftshader"
    //     ],
    //   },
    //   onBrowserDownload: (download) => {
    //      console.log(`[Server] Downloading browser: ${download.percent}% - ${download.downloadedBytes}/${download.totalBytes} bytes`);
    //      return {
    //        onProgress: (p) => {
    //          const progress = Math.round((p.downloadedBytes / p.totalBytes) * 100);
    //          console.log(`[Server] Browser download progress: ${progress}%`);
    //        },
    //      };
    //   }
    // });
    console.log("[Server] Pre-warm skipped (Letting requests handle it).");

  app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
    console.info(`MCP SSE endpoint available at http://localhost:${PORT}/mcp/sse`);
  });
}

main();
