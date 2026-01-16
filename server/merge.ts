import ffmpeg from "ffmpeg-static";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const mergeVideos = async (
  videoPaths: string[],
  outputDir: string,
  port: number
): Promise<{ url: string; path: string }> => {
  if (!ffmpeg) {
    throw new Error("ffmpeg binary not found");
  }

  const outputId = randomUUID();
  const outputPath = path.join(outputDir, `${outputId}.mp4`);
  
  // Create a temporary file list for ffmpeg
  const listPath = path.join(outputDir, `${outputId}.txt`);
  const fileContent = videoPaths
    .map((p) => `file '${p}'`)
    .join("\n");
    
  fs.writeFileSync(listPath, fileContent);

  return new Promise((resolve, reject) => {
    const args = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outputPath,
    ];

    const process = spawn(ffmpeg as string, args);

    process.on("close", (code: number) => {
      // Clean up list file
      if (fs.existsSync(listPath)) {
        fs.unlinkSync(listPath);
      }

      if (code === 0) {
        resolve({
          url: `http://localhost:${port}/renders/${outputId}.mp4`,
          path: outputPath,
        });
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    process.on("error", (err: Error) => {
      if (fs.existsSync(listPath)) {
        fs.unlinkSync(listPath);
      }
      reject(err);
    });
  });
};
