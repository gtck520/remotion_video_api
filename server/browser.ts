import { ensureBrowser } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

// Define the custom cache directory
export const CUSTOM_CACHE_DIR = path.resolve(".remotion_cache");

/**
 * Ensures a compatible browser is available in the custom cache directory.
 * If not, it downloads/installs it using Remotion's ensureBrowser and copies it.
 * Returns the path to the executable.
 */
export async function ensureLocalBrowser(): Promise<string> {
    console.log(`[Browser] Checking custom cache at: ${CUSTOM_CACHE_DIR}`);

    // Create cache dir if it doesn't exist
    if (!fs.existsSync(CUSTOM_CACHE_DIR)) {
        fs.mkdirSync(CUSTOM_CACHE_DIR, { recursive: true });
    }

    // Try to find existing executable in custom cache
    const existingExecutable = findBrowserInDir(CUSTOM_CACHE_DIR);
    if (existingExecutable) {
        console.log(`[Browser] Found cached browser at: ${existingExecutable}`);
        try {
            // Health check: Try to run it
            const version = execSync(`"${existingExecutable}" --version`).toString().trim();
            console.log(`[Browser] Health check passed: ${version}`);
            return existingExecutable;
        } catch (e: any) {
            console.error(`[Browser] Health check failed for cached browser: ${e.message}`);
            console.warn(`[Browser] The cached browser might be missing system dependencies (e.g. libnss3, libatk, etc.).`);
            // We return it anyway, but the warning is logged.
            return existingExecutable;
        }
    }

    console.log("[Browser] No cached browser found. Running ensureBrowser()...");
    
    // This will download to node_modules/.remotion (which is now a symlink to .remotion_cache)
    await ensureBrowser();

    // After download, it should be in CUSTOM_CACHE_DIR because of the symlink
    const finalExecutable = findBrowserInDir(CUSTOM_CACHE_DIR);
    if (!finalExecutable) {
        throw new Error("ensureBrowser() completed but failed to find executable in custom cache (symlink issue?).");
    }

    console.log(`[Browser] Browser cached successfully at: ${finalExecutable}`);
    return finalExecutable;
}

export const getChromiumOptions = (executablePath?: string) => {
    const finalExecutablePath = executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';
    console.log(`[Browser] getChromiumOptions resolved executablePath: ${finalExecutablePath}`);
    
    const args = [
        "--headless=new",
        "--enable-unsafe-swiftshader", 
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-xshm",
        "--disable-software-rasterizer",
        "--disable-gpu-compositing",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--mute-audio",
        "--use-gl=swiftshader",
        "--use-angle=swiftshader"
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
        headless: false, // Disable Remotion's headless logic to use our own args
        ignoreDefaultArgs: ["--headless"],
        executablePath: finalExecutablePath,
        args, 
    };
}

function findBrowserInDir(baseDir: string): string | null {
    if (!fs.existsSync(baseDir)) return null;
    
    // Common executable names for Linux/Unix
    // chrome-headless-shell is the new standard for Remotion
    const names = ["chrome-headless-shell", "chrome", "chromium", "google-chrome"];
    
    // Recursive search
    const queue = [baseDir];
    while (queue.length > 0) {
        const current = queue.shift()!;
        try {
            const entries = fs.readdirSync(current, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) {
                    queue.push(fullPath);
                } else if (entry.isFile()) {
                    if (names.includes(entry.name)) {
                        // Check if it's executable
                        try {
                            fs.accessSync(fullPath, fs.constants.X_OK);
                            return fullPath;
                        } catch (e) {
                            // Not executable, ignore
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }
    return null;
}

function copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        // If file exists, we can skip or overwrite. Overwrite is safer for consistency.
        fs.copyFileSync(src, dest);
        // Preserve permissions (important for executable)
        fs.chmodSync(dest, fs.statSync(src).mode);
    }
}
