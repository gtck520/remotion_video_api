import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "node:fs";

/**
 * Helper to get Proxy Agent if configured
 * Handles HTTP_PROXY, HTTPS_PROXY and NO_PROXY
 */
export const getProxyAgent = (urlStr: string) => {
    // Check for explicit disable switch
    if (process.env.PROXY_ENABLED === 'false') return undefined;

    let proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (!proxy) return undefined;

    // Fix for running outside Docker (e.g. local dev or Trae environment)
    // where host.docker.internal is not available.
    if (proxy.includes('host.docker.internal') && !fs.existsSync('/.dockerenv')) {
        console.log(`[Proxy] Replacing host.docker.internal with 127.0.0.1 in proxy config`);
        proxy = proxy.replace('host.docker.internal', '127.0.0.1');
    }

    const noProxy = process.env.NO_PROXY || process.env.no_proxy;
    if (noProxy) {
        // Basic NO_PROXY check (comma separated, supports * wildcard)
        try {
            const url = new URL(urlStr);
            const hostname = url.hostname;
            const noProxyList = noProxy.split(',').map(s => s.trim());
            
            for (const pattern of noProxyList) {
                if (pattern === '*' || pattern === hostname) return undefined;
                if (pattern.startsWith('.') && hostname.endsWith(pattern)) return undefined;
                // Handle IP/Subnet if needed, but for now simple hostname match
            }
        } catch (e) {
            // Invalid URL, ignore
        }
    }

    // console.log(`[Proxy] Using proxy ${proxy} for ${urlStr}`);
    return new HttpsProxyAgent(proxy);
};
