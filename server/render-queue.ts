import {
  makeCancelSignal,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

export interface JobData {
  compositionId: string;
  inputProps: Record<string, unknown>;
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

      const composition = await selectComposition({
        serveUrl,
        id: job.data.compositionId,
        inputProps: job.data.inputProps,
      });

      const outputLocation = path.join(rendersDir, `${jobId}.mp4`);

      console.log(`[${jobId}] Starting renderMedia...`);
      await renderMedia({
        cancelSignal,
        serveUrl,
        composition,
        inputProps: job.data.inputProps,
        codec: "h264",
        verbose: true, // Enable verbose logging
        onProgress: (progress) => {
          console.log(`[${jobId}] Progress: ${Math.round(progress.progress * 100)}%`);
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
        outputLocation,
      });
      console.log(`[${jobId}] renderMedia completed.`);

      jobs.set(jobId, {
        status: "completed",
        videoUrl: `http://localhost:${port}/renders/${jobId}.mp4`,
        outputLocation,
        data: job.data,
      });
    } catch (error) {
      console.error(error);
      jobs.set(jobId, {
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
        data: job.data,
      });
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
