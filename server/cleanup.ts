import cron from "node-cron";
import fs from "node:fs";
import path from "node:path";

// Default to 1 hour if not set
const getRetentionMs = () => {
  const minutes = process.env.MEDIA_RETENTION_MINUTES ? parseInt(process.env.MEDIA_RETENTION_MINUTES) : 60;
  return minutes * 60 * 1000;
};

export const startCleanupJob = (directories: string[]) => {
  // Run every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    const RETENTION_MS = getRetentionMs();
    console.log(`[Cleanup] Running cleanup job. Retention: ${RETENTION_MS / 60000} mins.`);
    
    directories.forEach(dir => {
        try {
            if (!fs.existsSync(dir)) return;
      
            const files = fs.readdirSync(dir);
            const now = Date.now();
            let deletedCount = 0;
      
            for (const file of files) {
              const filePath = path.join(dir, file);
              
              // Skip if it's a directory (unless we want to recursively delete, but let's be safe)
              // or skip specific files like .gitkeep
              if (file.startsWith('.')) continue;

              try {
                  const stats = fs.statSync(filePath);
                  if (stats.isFile() && (now - stats.mtimeMs > RETENTION_MS)) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                  }
              } catch (e) {
                  // Ignore error for individual file (e.g. race condition)
              }
            }
            
            if (deletedCount > 0) {
              console.log(`[Cleanup] Cleaned ${dir}: Deleted ${deletedCount} expired files.`);
            }
          } catch (error) {
            console.error(`[Cleanup] Failed to clean ${dir}:`, error);
          }
    });
  });
};
