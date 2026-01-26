import { ensureBrowser } from "@remotion/renderer";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Use a persistent cache directory outside node_modules
// This avoids re-downloading when node_modules is cleared or when switching environments
const CUSTOM_CACHE_DIR = path.resolve(".remotion_cache");

function findBrowserInDir(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir, { recursive: true });
    // Look for chrome-headless-shell (Linux/Mac) or chrome-headless-shell.exe (Windows)
    const executable = files.find(f => {
        const name = path.basename(f as string);
        return name === "chrome-headless-shell" || name === "chrome-headless-shell.exe";
    });
    
    return executable ? path.join(dir, executable as string) : null;
}

export async function ensureLocalBrowser(): Promise<string> {
    console.log(`[Browser] Checking custom cache at: ${CUSTOM_CACHE_DIR}`);
    
    // Ensure cache dir exists
    if (!fs.existsSync(CUSTOM_CACHE_DIR)) {
        fs.mkdirSync(CUSTOM_CACHE_DIR, { recursive: true });
    }

    // 1. Check if browser already exists in our custom cache
    const existingExecutable = findBrowserInDir(CUSTOM_CACHE_DIR);
    if (existingExecutable) {
        console.log(`[Browser] Found existing browser at: ${existingExecutable}`);
        return existingExecutable;
    }

    console.log("[Browser] No cached browser found. Running ensureBrowser()...");
    console.log("[Browser] NOTE: If download fails, you can manually download chrome-headless-shell and unzip it into .remotion_cache folder.");
    
    // This will download to node_modules/.remotion (which is now a symlink to .remotion_cache)
    console.log("[Browser] Starting browser download...");
    try {
        await ensureBrowser({
            onBrowserDownload: (info) => {
                const sizeMB = (info.totalBytes / 1024 / 1024).toFixed(2);
                console.log(`[Browser] Download started. Size: ${sizeMB}MB`);
                console.log(`[Browser] URL: ${info.url}`); // Print URL for user reference
                return {
                    onProgress: (stats) => {
                        const percent = Math.round((stats.downloadedBytes / stats.totalBytes) * 100);
                        const downloadedMB = (stats.downloadedBytes / 1024 / 1024).toFixed(2);
                        const totalMB = (stats.totalBytes / 1024 / 1024).toFixed(2);
                        
                        if (percent % 10 === 0 || percent === 100) {
                            console.log(`[Browser] Downloading Chrome: ${percent}% (${downloadedMB}MB / ${totalMB}MB)`);
                        }
                    }
                };
            }
        });
    } catch (error) {
        console.error("[Browser] Download failed:", error);
        console.log("[Browser] Suggestion: If download is slow or failing, try setting a proxy:");
        console.log("    Windows PowerShell: $env:HTTPS_PROXY='http://127.0.0.1:7890'");
        console.log("    Linux/Mac: export HTTPS_PROXY=http://127.0.0.1:7890");
        throw error;
    }

    // After download, it should be in CUSTOM_CACHE_DIR because of the symlink
    // But we need to find the exact path again
    const finalExecutable = findBrowserInDir(CUSTOM_CACHE_DIR);
    if (!finalExecutable) {
        throw new Error("Symlink issue: Browser downloaded but executable not found in custom cache.");
    }
    
    console.log(`[Browser] Browser ready at: ${finalExecutable}`);
    return finalExecutable;
}