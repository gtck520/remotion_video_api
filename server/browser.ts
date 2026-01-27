import { ensureBrowser } from "@remotion/renderer";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Use a persistent cache directory outside node_modules
// This avoids re-downloading when node_modules is cleared or when switching environments
const CUSTOM_CACHE_DIR = path.resolve(".remotion_cache");

function findBrowserInDir(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            const found = findBrowserInDir(fullPath);
            if (found) return found;
        } else if (entry.isFile()) {
            // Check for exact binary name
            if (entry.name === "chrome-headless-shell" || entry.name === "chrome-headless-shell.exe") {
                return fullPath;
            }
        }
    }
    return null;
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

export function getChromiumOptions() {
    // Attempt to resolve the executable path dynamically to satisfy Remotion on Windows
    const executablePath = findBrowserInDir(CUSTOM_CACHE_DIR) || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    if (executablePath) {
        console.log(`[Browser] Using explicit executable path: ${executablePath}`);
    }

    const args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--enable-unsafe-swiftshader",
        "--disable-gpu",
        "--use-gl=swiftshader",
        "--use-angle=swiftshader",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--mute-audio",
    ];

    // Inject Proxy if available
    const proxyEnabled = process.env.PROXY_ENABLED !== 'false';
    let proxyServer = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
    
    if (proxyEnabled && proxyServer) {
        // Fix for running outside Docker (e.g. local dev or Trae environment)
        // where host.docker.internal is not available.
        if (proxyServer.includes('host.docker.internal') && !fs.existsSync('/.dockerenv')) {
            console.log(`[Browser] Replacing host.docker.internal with 127.0.0.1 in proxy config`);
            proxyServer = proxyServer.replace('host.docker.internal', '127.0.0.1');
        }

        console.log(`[Browser] Using proxy server: ${proxyServer}`);
        args.push(`--proxy-server=${proxyServer}`);
        
        const noProxy = process.env.NO_PROXY || process.env.no_proxy;
        let finalNoProxy = noProxy || '';
        
        // Critical: Always bypass Coze CDN and image domains as they are accessible in CN and proxy might fail
        // Also ensure localhost is bypassed to avoid routing local traffic through proxy
        const requiredBypass = [
            's.coze.cn', '.coze.cn', '.byteimg.com', 'p26-official-plugin-sign.byteimg.com',
            'localhost', '127.0.0.1', '::1'
        ];
        const currentBypassList = finalNoProxy.split(',').map(s => s.trim());
        
        for (const domain of requiredBypass) {
            if (!currentBypassList.includes(domain)) {
                finalNoProxy = finalNoProxy ? `${finalNoProxy},${domain}` : domain;
            }
        }

        if (finalNoProxy) {
            console.log(`[Browser] Using proxy bypass list: ${finalNoProxy}`);
            args.push(`--proxy-bypass-list=${finalNoProxy}`);
        }
    }

    return {
        enableMultiProcessOnLinux: true,
        headless: "new" as const,
        gl: "swiftshader" as const,
        executablePath, // Explicitly provide the path to avoid re-download
        ignoreDefaultArgs: ["--headless"], // Important: we set headless: "new" manually or let Remotion handle it, but sometimes we need to clear defaults
        args,
    };
}




