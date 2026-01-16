import cron from "node-cron";
import fs from "node:fs";
import path from "node:path";

const RETENTION_MS = 60 * 60 * 1000; // 1 hour

export const startCleanupJob = (rendersDir: string) => {
  // Run every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    console.log("Running cleanup job...");
    try {
      if (!fs.existsSync(rendersDir)) return;

      const files = fs.readdirSync(rendersDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(rendersDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > RETENTION_MS) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Cleanup job: Deleted ${deletedCount} expired files.`);
      }
    } catch (error) {
      console.error("Cleanup job failed:", error);
    }
  });
};
