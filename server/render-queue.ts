import {
  makeCancelSignal,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { getChromiumOptions } from "./browser";

export interface JobData {
  compositionId: string;
  inputProps: Record<string, unknown>;
  webhookUrl?: string;
  width?: number;
  height?: number;
}

export type JobState =
  | {
      status: "queued";
      data: JobData;
      cancel: () => void;
    }
  | {
      status: "in-progress";
      progress: number;
      data: JobData;
      cancel: () => void;
    }
  | {
      status: "completed";
      videoUrl: string;
      outputLocation: string;
      data: JobData;
    }
  | {
      status: "failed";
      error: Error;
      data: JobData;
    };

export const makeRenderQueue = ({
  port,
  serveUrl,
  rendersDir,
  concurrency = 1,
}: {
  port: number;
  serveUrl: string;
  rendersDir: string;
  concurrency?: number;
}) => {
  const jobs = new Map<string, JobState>();
  // Simple queue implementation
  const queue: string[] = [];
  let activeJobs = 0;

  const processQueue = async () => {
    if (activeJobs >= concurrency || queue.length === 0) {
      return;
    }

    const jobId = queue.shift();
    if (!jobId) return;

    activeJobs++;
    await processRender(jobId);
    activeJobs--;
    processQueue();
  };

  const processRender = async (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) {
      console.error(`Render job ${jobId} not found`);
      return;
    }

    const { cancel, cancelSignal } = makeCancelSignal();

    jobs.set(jobId, {
      progress: 0,
      status: "in-progress",
      cancel: cancel,
      data: job.data,
    });

    try {
      if (!fs.existsSync(rendersDir)) {
        fs.mkdirSync(rendersDir, { recursive: true });
      }

      const chromiumOptions = getChromiumOptions();
      console.log(`[RenderQueue] Processing render with chromiumOptions:`, JSON.stringify(chromiumOptions, null, 2));

      const composition = await selectComposition({
        serveUrl,
        id: job.data.compositionId,
        inputProps: job.data.inputProps,
        chromiumOptions,
        onBrowserDownload: (download) => {
            const percent = Math.round((download.downloadedBytes / download.totalBytes) * 100);
            console.log(`[RenderQueue] Downloading browser: ${percent}% (${download.downloadedBytes}/${download.totalBytes})`);
        },
      });

      // Override composition dimensions if provided
      if (job.data.width && job.data.height) {
          console.log(`[RenderQueue] Overriding dimensions to ${job.data.width}x${job.data.height}`);
          composition.width = job.data.width;
          composition.height = job.data.height;
      }

      const outputLocation = path.join(rendersDir, `${jobId}.mp4`);

      console.log(`[${jobId}] Starting renderMedia...`);
      const startTime = Date.now();
      
      await renderMedia({
        cancelSignal,
        serveUrl,
        composition,
        inputProps: job.data.inputProps,
        codec: "h264",
        verbose: true, // Enable verbose logging for debugging
        disallowParallelEncoding: true, // Reduce memory usage and potential deadlocks
        timeoutInMilliseconds: 300000, // 5 minutes timeout
        chromiumOptions,
        dumpBrowserLogs: true, // Show browser logs
        onProgress: (progress) => {
          const elapsed = (Date.now() - startTime) / 1000;
          // Always log every 5% progress or if more than 5 seconds passed since last log
          if (Math.round(progress.progress * 100) % 5 === 0) {
              console.log(`[${jobId}] Progress: ${Math.round(progress.progress * 100)}% (Elapsed: ${elapsed.toFixed(1)}s)`);
          }
          
          // Only update if job is still in progress (might be cancelled)
          const currentJob = jobs.get(jobId);
          if (currentJob && currentJob.status === "in-progress") {
             jobs.set(jobId, {
              progress: progress.progress,
              status: "in-progress",
              cancel: cancel,
              data: job.data,
            });
          }
        },
        // Capture browser logs if possible (although verbose: true handles this mostly)
        // dumpBrowserLogs: true, // Already set above
        outputLocation,
      });
      console.log(`[${jobId}] renderMedia completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);

      const host = process.env.PUBLIC_HOST || `localhost:${port}`;
      const protocol = process.env.PUBLIC_PROTOCOL || 'http';
      const videoUrl = `${protocol}://${host}/renders/${jobId}.mp4`;
      
      jobs.set(jobId, {
        status: "completed",
        videoUrl,
        outputLocation,
        data: job.data,
      });

      // Trigger Webhook if present
      if (job.data.webhookUrl) {
        console.log(`[${jobId}] Triggering webhook: ${job.data.webhookUrl} (Method: POST)`);
        fetch(job.data.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId,
                status: 'completed',
                videoUrl,
                inputProps: job.data.inputProps
            })
        })
        .then(async (res) => {
            console.log(`[${jobId}] Webhook response: ${res.status} ${res.statusText}`);
            if (!res.ok) {
                const text = await res.text();
                console.error(`[${jobId}] Webhook error body: ${text.slice(0, 500)}`);
            }
        })
        .catch(err => console.error(`[${jobId}] Webhook failed:`, err));
      }

    } catch (error) {
      console.error(error);
      jobs.set(jobId, {
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
        data: job.data,
      });
      
      // Trigger Webhook on failure too
      if (job.data.webhookUrl) {
        console.log(`[${jobId}] Triggering failure webhook: ${job.data.webhookUrl}`);
        fetch(job.data.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                inputProps: job.data.inputProps
            })
        })
        .then(async (res) => {
             console.log(`[${jobId}] Failure webhook response: ${res.status} ${res.statusText}`);
             if (!res.ok) {
                 const text = await res.text();
                 console.error(`[${jobId}] Failure webhook error body: ${text.slice(0, 500)}`);
             }
        })
        .catch(err => console.error(`[${jobId}] Webhook failed:`, err));
      }
    }
  };

  return {
    jobs,
    createJob: (data: JobData) => {
      const jobId = randomUUID();
      jobs.set(jobId, {
        status: "queued",
        data,
        cancel: () => {
          // If queued, remove from queue
          const index = queue.indexOf(jobId);
          if (index > -1) {
            queue.splice(index, 1);
            jobs.delete(jobId);
          }
        },
      });
      queue.push(jobId);
      processQueue();
      return jobId;
    },
  };
};
