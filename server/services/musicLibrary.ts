import { createClient, WebDAVClient, FileStat } from "webdav";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mp3Duration from "mp3-duration";
import util from "util";
import fetch from "node-fetch";

const getMp3Duration = util.promisify(mp3Duration);

// Configuration - Evaluated lazily to ensure environment variables are loaded
const getWebDavConfig = () => ({
    url: process.env.WEBDAV_URL || "",
    username: process.env.WEBDAV_USERNAME || "",
    password: process.env.WEBDAV_PASSWORD || "",
    root: process.env.WEBDAV_ROOT_PATH || "/"
});

// Cache Directory
const CACHE_DIR = path.resolve("public/audio/cache");
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let client: WebDAVClient | null = null;

const getClient = () => {
    const config = getWebDavConfig();
    if (!client && config.url) {
        client = createClient(config.url, {
            username: config.username,
            password: config.password
        });
    }
    return client;
};

export interface MusicTrack {
    name: string;
    style: string;
    localUrl?: string; // URL for Remotion to use (http://localhost:port/audio/cache/...)
    durationInFrames?: number;
}

/**
 * List available music styles (folders in WebDAV root)
 */
export const listMusicStyles = async (): Promise<string[]> => {
    const webdav = getClient();
    const config = getWebDavConfig();
    if (!webdav) {
        console.warn("[MusicLibrary] WebDAV not configured.");
        return [];
    }

    try {
        const items = await webdav.getDirectoryContents(config.root) as FileStat[];
        console.log(`[MusicLibrary] Found ${items.length} items in ${config.root}`);
        const styles = items
            .filter(item => item.type === "directory")
            .map(item => item.basename);
        console.log(`[MusicLibrary] Filtered styles: ${styles.join(", ")}`);
        return styles;
    } catch (e) {
        console.error("[MusicLibrary] Failed to list styles:", e);
        return [];
    }
};

/**
 * Get a random track from a specific style
 * Downloads and caches the file if necessary
 */
export const getMusicForStyle = async (style: string, port: number): Promise<MusicTrack | null> => {
    const webdav = getClient();
    const config = getWebDavConfig();
    if (!webdav) {
        console.warn("[MusicLibrary] WebDAV not configured.");
        return null;
    }

    try {
        // Ensure consistent path separator handling
        const root = config.root.endsWith('/') ? config.root.slice(0, -1) : config.root;
        const stylePath = `${root}/${style}`;
        const items = await webdav.getDirectoryContents(stylePath) as FileStat[];
        
        // Filter mp3 files
        const tracks = items.filter(item => item.type === "file" && item.basename.toLowerCase().endsWith(".mp3"));
        
        if (tracks.length === 0) {
            console.warn(`[MusicLibrary] No tracks found for style: ${style}`);
            return null;
        }

        // Pick random track
        const track = tracks[Math.floor(Math.random() * tracks.length)];
        console.log(`[MusicLibrary] Selected track: ${track.basename} (${style})`);

        // Check Cache
        // Use hash of full path to ensure uniqueness
        const hash = crypto.createHash('md5').update(track.filename).digest('hex');
        const fileName = `${hash}.mp3`;
        const localPath = path.join(CACHE_DIR, fileName);
        const publicUrl = `http://localhost:${port}/audio/cache/${fileName}`;

        if (!fs.existsSync(localPath)) {
            console.log(`[MusicLibrary] Downloading ${track.basename} to cache...`);
            const buffer = await webdav.getFileContents(track.filename) as Buffer;
            fs.writeFileSync(localPath, buffer);
        } else {
            console.log(`[MusicLibrary] Cache hit for ${track.basename}`);
        }

        // Calculate Duration
        let durationInSeconds = 0;
        try {
            durationInSeconds = await getMp3Duration(localPath);
        } catch (e) {
            console.error(`[MusicLibrary] Failed to get duration for ${fileName}:`, e);
            // Fallback duration if calculation fails (e.g. 3 mins)
            durationInSeconds = 180;
        }

        return {
            name: track.basename,
            style: style,
            localUrl: publicUrl,
            durationInFrames: Math.ceil(durationInSeconds * 30)
        };

    } catch (e) {
        console.error(`[MusicLibrary] Failed to get music for style ${style}:`, e);
        return null;
    }
};

/**
 * Cleanup old cache files (Optional: Implement if cache grows too large)
 */
export const cleanMusicCache = async () => {
    // TODO: Implement LRU or time-based cleanup
};
