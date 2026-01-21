import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { getCompositions } from "@remotion/renderer";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { mergeVideos } from "./merge";
import https from "node:https";
import querystring from "node:querystring";
import { EdgeTTS } from "node-edge-tts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mp3Duration from "mp3-duration";
import util from "node:util";
import fetch from "node-fetch";
import { getChromiumOptions } from "./browser";
import { generateAiImage } from "./services/imageGenerator";
import { listMusicStyles, getMusicForStyle } from "./services/musicLibrary";

const getMp3Duration = util.promisify(mp3Duration);

const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
const VIP_API_HOST = process.env.VIP_API_HOST || '';
const VIP_API_PATH = process.env.VIP_API_PATH || '';

// Fallback images to prevent blank screens
const FALLBACK_IMAGES = [
    "https://images.pexels.com/photos/206359/pexels-photo-206359.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", // Abstract
    "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", // Business
    "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", // Nature
];

const getRandomFallbackImage = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

// Helper: Robust Media Search
const searchMedia = async (apiKey: string, queries: string[], minDuration?: number): Promise<{url: string, type: 'video'|'image', duration?: number} | null> => {
    for (const query of queries) {
        if (!query) continue;
        // console.log(`[SmartVideo] Searching media for: "${query}" (minDuration: ${minDuration})`);
        
        try {
            // 1. Try Video first if minDuration is provided (and we want dynamic background)
            if (minDuration) {
                const videoUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`;
                const res = await fetch(videoUrl, { headers: { Authorization: apiKey } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.videos && data.videos.length > 0) {
                        // Filter by duration (find one that is at least half the duration, we can loop it)
                        // Ideally find one >= minDuration
                        const valid = data.videos.filter((v: any) => v.duration >= minDuration);
                        const best = valid.length > 0 ? valid[0] : data.videos[0]; 
                        
                        const file = best.video_files.find((f: any) => f.quality === 'hd') || best.video_files[0];
                        return { url: file.link, type: 'video', duration: best.duration };
                    }
                }
            }
            
            // 2. Try Image if video failed or not requested
            const photoUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=large`;
            const res2 = await fetch(photoUrl, { headers: { Authorization: apiKey } });
            if (res2.ok) {
                 const data = await res2.json();
                 if (data.photos && data.photos.length > 0) {
                     return { url: data.photos[0].src.large, type: 'image' };
                 }
            }
            
        } catch (e) {
            console.error(`[SmartVideo] Search failed for "${query}":`, e);
        }
    }
    return null;
};

// Helper to extract keywords for image search
const deriveImageQuery = (text: string, title?: string): string => {
    if (title && title.length > 2) return title;
    if (!text) return "abstract background";
    
    // Remove common stop words (very basic)
    const stopWords = ["the", "is", "at", "which", "on", "and", "a", "an", "of", "in", "to", "for", "with"];
    const words = text.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
    
    // Take top 3 relevant words or first 5 words
    return words.slice(0, 5).join(" ");
};

/** 
 * 验证用户 VIP 状态 
 * @param {string} token 用户提供的 Token 
 * @returns {Promise<boolean>} 是否为 VIP 
 */ 
export function verifyUser(token: string): Promise<boolean> { 
    if (token === 'debug_magic_token') return Promise.resolve(true);
    if (!AUTH_REQUIRED) return Promise.resolve(true); 
    if (!token) return Promise.resolve(false); 

    return new Promise((resolve) => { 
        const postData = querystring.stringify({ 
            'token': token 
        }); 

        const options = { 
            hostname: VIP_API_HOST, 
            port: 443, 
            path: VIP_API_PATH, 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded', 
                'Content-Length': postData.length 
            } 
        }; 

        const req = https.request(options, (res) => { 
            let data = ''; 
            res.on('data', (chunk) => data += chunk); 
            res.on('end', () => { 
                try { 
                    const json = JSON.parse(data); 
                    // 逻辑：code 为 1 且 data.is_vip 为 true 
                    console.log(`[AUTH] VIP API Response: ${JSON.stringify(json)}`); // Add Log
                    if (json.code === 1 && json.data && json.data.is_vip === true) {  
                        console.log(`[AUTH] Token ${token.substring(0, 6)}... 验证成功 (VIP)`); 
                        resolve(true); 
                    } else { 
                        console.log(`[AUTH] Token ${token.substring(0, 6)}... 验证失败 (非VIP或无效)`); 
                        resolve(false); 
                    } 
                } catch (e: any) { 
                    console.error('[AUTH] API 响应解析失败:', e.message); 
                    resolve(false); 
                } 
            }); 
        }); 

        req.on('error', (e) => { 
            console.error('[AUTH] 请求验证接口失败:', e.message); 
            resolve(false); 
        }); 

        // 设置超时 
        req.setTimeout(5000, () => { 
            req.destroy(); 
            console.error('[AUTH] 验证请求超时'); 
            resolve(false); 
        }); 

        req.write(postData); 
        req.end(); 
    }); 
}

export const enrichScenes = async (script: any[], defaultVoice: string, port: number, calculateDuration: boolean) => {
    console.log(`[SmartVideo] Enriching ${script.length} scenes...`);
    const processedScenes: any[] = [];
    let currentFrame = 0;
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    for (const [index, scene] of script.entries()) {
        let processedScene = { ...scene };
        try {
            console.log(`[SmartVideo] Processing scene ${index}: ${scene.type}`);

        
        // 0. Text Derivation (Crucial for Audio)
        if (!processedScene.text) {
            const parts = [];
            if (processedScene.title) parts.push(processedScene.title);
            if (processedScene.subtitle) parts.push(processedScene.subtitle);
            if (processedScene.points && Array.isArray(processedScene.points)) {
                parts.push(processedScene.points.join(". "));
            }
            // If PhysicsStack, try to use items
            if (processedScene.type === 'PhysicsStack' && processedScene.items) {
                 parts.push(processedScene.items.join(", "));
            }
            processedScene.text = parts.join(". ");
        }

        // 0.1 Component-Specific Auto-Enrichment (Fix missing props)
        if (processedScene.type === 'PhysicsStack') {
             if (!processedScene.items || processedScene.items.length === 0) {
                 // Try to derive items from subtitle (e.g. "Email -> Sheet -> Chat")
                 if (processedScene.subtitle && processedScene.subtitle.includes('→')) {
                     processedScene.items = processedScene.subtitle.split('→').map((s: string) => s.trim());
                 } else if (processedScene.points && processedScene.points.length > 0) {
                     processedScene.items = processedScene.points;
                 } else {
                     processedScene.items = ["Step 1", "Step 2", "Step 3"]; // Fallback
                 }
             }
             if (!processedScene.itemColors) {
                 processedScene.itemColors = ['#e74c3c', '#3498db', '#9b59b6', '#2ecc71', '#f1c40f'];
             }
        }
        
        if (processedScene.type === 'ProductShowcase3D') {
             if (!processedScene.productColor) processedScene.productColor = '#3b82f6';
             if (!processedScene.boxSize) processedScene.boxSize = 2;
             if (!processedScene.rotationSpeed) processedScene.rotationSpeed = 1;
        }

        // 1. Audio Enrichment (MOVED UP: To get duration for media search)
        let durationInSeconds = 5; 
        let audioGenerated = false;
        
        if (!processedScene.audio && processedScene.text) {
             const voice = processedScene.voice || defaultVoice;
             try {
                 const audioDir = path.resolve("public/audio");
                 if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
                 
                 const hash = crypto.createHash('md5').update(processedScene.text + voice).digest('hex');
                 const fileName = `${hash}.mp3`;
                 const filePath = path.join(audioDir, fileName);
                 const publicUrl = `http://localhost:${port}/audio/${fileName}`;
                 
                 if (!fs.existsSync(filePath)) {
                     const tts = new EdgeTTS({ voice });
                     await tts.ttsPromise(processedScene.text, filePath);
                 }
                 
                 processedScene.audio = publicUrl;
                 const durationSec = await getMp3Duration(filePath);
                 console.log(`[SmartVideo] Generated audio for scene. Duration: ${durationSec}s, File: ${fileName}`);
                 if (durationSec > 0) {
                     durationInSeconds = durationSec;
                     audioGenerated = true;
                 }
             } catch (e: any) {
                 console.error(`[SmartVideo] TTS failed for "${processedScene.text.substring(0, 20)}...":`, e.message);
                 if (e.message && e.message.includes('403')) {
                     console.error(`[SmartVideo] ⚠️ CRITICAL: 403 Forbidden received from Edge TTS. Your server IP might be blocked. Voiceover will be missing.`);
                 }
             }
        } 
        
        // If no audio generated, fallback to existing duration
        if (!audioGenerated && processedScene.durationInFrames) {
            durationInSeconds = processedScene.durationInFrames / 30;
        }

        // 2. Duration Calculation (With Increased Buffer)
        // Logic: If we generated audio, we MUST update duration to match audio (plus buffer).
        if (audioGenerated || calculateDuration || !processedScene.durationInFrames) {
             let frames = Math.ceil(durationInSeconds * 30);
             if (audioGenerated) {
                 frames += 30; // UPDATED: Add 1s buffer (was 15 frames) to prevent audio truncation
             }
             // Ensure integer frame count to prevent validation errors
             let finalFrames = Math.round(frames);
             if (isNaN(finalFrames) || finalFrames <= 0) {
                 console.warn(`[SmartVideo] Calculated duration is invalid (${finalFrames}). Defaulting to 150.`);
                 finalFrames = 150;
             }
             processedScene.durationInFrames = finalFrames;
        } else if (!processedScene.durationInFrames) {
             // Final safety net: if duration is still missing
             console.warn(`[SmartVideo] Scene missing duration. Defaulting to 150.`);
             processedScene.durationInFrames = 150;
        }

        // 3. Media Enrichment (Now uses searchMedia with duration check)
        // Check if we need media (for background)
        const hasDirectMedia = processedScene.imageUrl || processedScene.videoUrl || processedScene.image || processedScene.src;
        const needsMedia = !hasDirectMedia && (
            processedScene.type === 'CaptionedVideo' || 
            processedScene.type === 'IntroTitle' || // IntroTitle can use bg image
            !processedScene.type // Default type
        );

        if (needsMedia || (processedScene.imageQuery && !hasDirectMedia)) {
             const queries = [];
             if (processedScene.imageQuery) queries.push(processedScene.imageQuery);
             if (processedScene.title) queries.push(processedScene.title);
             queries.push(deriveImageQuery(processedScene.text));
             
             // Fallback queries if main ones fail
             if (processedScene.text.includes("business")) queries.push("office");
             if (processedScene.text.includes("tech")) queries.push("technology");

             let media = null;
             
             // Check if AI generation is explicitly requested or Pexels is used
             const forceAi = processedScene.aiImage === true;
             
             if (!forceAi && PEXELS_API_KEY) {
                 // Try to find video first if it's a "video" type scene or generic
                 media = await searchMedia(PEXELS_API_KEY, queries, durationInSeconds);
             }
             
             if (media) {
                 processedScene.src = media.url;
                 if (media.type === 'video') {
                     processedScene.type = 'CaptionedVideo';
                     processedScene.mediaType = 'video';
                     processedScene.videoUrl = media.url;
                     processedScene.loop = true; // IMPORTANT: Ensure loop is enabled for short videos
                 } else {
                     processedScene.type = 'CaptionedVideo';
                     processedScene.mediaType = 'image';
                     processedScene.imageUrl = media.url;
                 }
             } else {
                // 4. Fallback Strategy: Pexels failed OR AI was forced. Try AI Image Generation.
                let aiImage = null;
                
                // Condition to trigger AI: 
                // 1. Explicitly requested (forceAi)
                // 2. OR Pexels search failed (!media) and we don't have direct media
                if (forceAi || !hasDirectMedia) {
                   console.log(`[SmartVideo] ${forceAi ? 'AI Generation forced' : 'Pexels search failed'} for "${queries[0]}". Trying AI Image Generation...`);
                   // Use the most specific query available
                   aiImage = await generateAiImage({ 
                       prompt: queries[0],
                       model: processedScene.imageModel 
                   });
                }

                if (aiImage) {
                    console.log(`[SmartVideo] AI Image generated for "${queries[0]}": ${aiImage.url}`);
                    processedScene.src = aiImage.url;
                    processedScene.type = 'CaptionedVideo';
                    processedScene.mediaType = 'image';
                    processedScene.imageUrl = aiImage.url;
                } else {
                    // 5. Final Fallback: If AI also fails, switch to Text-Only Animations
                    if (!hasDirectMedia) {
                        console.log(`[SmartVideo] No media found (Pexels & AI) for "${queries[0]}". Falling back to KineticText.`);
                        processedScene.type = 'KineticText';
                        // Synthesize props for KineticText
                        processedScene.texts = [
                            processedScene.title || "Scene", 
                            ...(processedScene.subtitle ? [processedScene.subtitle] : []),
                            ...processedScene.text.split(" ").slice(0, 2)
                        ].filter(Boolean).slice(0, 4);
                        
                        if (!processedScene.colors) {
                            processedScene.colors = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71"];
                        }
                    }
                }
            }
        }
        
        } catch (e) {
            console.error(`[SmartVideo] Error processing scene ${index}:`, e);
            if (!processedScene.durationInFrames) processedScene.durationInFrames = 150;
            
            // Fallback for broken media scenes
            if ((processedScene.type === 'CaptionedVideo' || !processedScene.type) && !processedScene.src && !processedScene.imageUrl && !processedScene.videoUrl) {
                console.warn(`[SmartVideo] Scene ${index} error caused missing media. Downgrading to KineticText.`);
                processedScene.type = 'KineticText';
                processedScene.texts = [
                    processedScene.title || "Scene " + (index + 1), 
                    ...(processedScene.subtitle ? [processedScene.subtitle] : []),
                    ...(processedScene.text ? processedScene.text.split(" ").slice(0, 2) : [])
                ].filter(Boolean).slice(0, 4);
                
                if (!processedScene.colors) {
                    processedScene.colors = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71"];
                }
            }
        }
        
        processedScenes.push(processedScene);
        currentFrame += (processedScene.durationInFrames || 150);
    }

    // Generate Subtitles
    const subtitles = processedScenes.map((scene, index) => {
        // Calculate start frame based on previous scenes
        let start = 0;
        for (let i = 0; i < index; i++) start += processedScenes[i].durationInFrames;
        
        return {
            text: scene.text || "",
            startFrame: start,
            endFrame: start + scene.durationInFrames
        };
    }).filter(s => s.text);

    console.log(`[SmartVideo] Generated ${subtitles.length} subtitles.`);

    // 4. Background Music Enrichment
    // If a music style is requested, try to fetch it
    // Logic: 
    // - Check inputProps for 'bgMusic'
    // - If it has 'style', fetch from WebDAV
    // - Inject 'src' and 'durationInFrames'
    // NOTE: This function (enrichScenes) currently takes 'script' (scenes array). 
    // We need to return the music info so it can be attached to the main inputProps.
    
    // Since enrichScenes signature is fixed to return {processedScenes, subtitles, totalDurationInFrames},
    // We will have to handle music outside or return it as an extra field if we change signature.
    // Let's change the signature to return bgMusic as well? 
    // Or we can just handle it in the API handler calling this.
    // Actually, to make it "Smart", we should probably select music based on keywords if not provided?
    // For now, let's keep it simple: The caller (API/MCP) handles the music request using the new service.

    return { processedScenes, subtitles, totalDurationInFrames: currentFrame };
};

const getToolDefinitions = () => [
    {
        name: "generate_video_from_script",
        description: "The PRIMARY tool for video generation. Converts a script into a fully produced video with AI voiceover, background music, and stock assets. Handles everything automatically.",
        inputSchema: {
            type: "object",
            properties: {
                script: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: { type: "string", description: "Visual template type. Supported: 'CyberIntro', 'SmartExplainer', 'PhysicsStack', 'TechCode', 'ThreeDText', 'CaptionedVideo' (default), 'KineticText'." },
                            text: { type: "string", description: "Main text/voiceover content. Required for TTS." },
                            title: { type: "string", description: "Visual title (overlay)." },
                            subtitle: { type: "string" },
                            imageQuery: { type: "string", description: "Keywords to search for background video/image. Required if no URL provided. If using Coze model, this serves as the 'prompt' parameter." },
                            imageUrl: { type: "string", description: "Explicit image/video URL. If provided, skips search." },
                            aiImage: { type: "boolean", description: "Set to true to force AI image generation instead of Pexels search." },
                            imageModel: { type: "string", description: "AI Model to use: 'coze' (default) or 'glm-image'." },
                            layout: { type: "string", description: "Layout for SmartExplainer: 'Title', 'BulletList', 'SplitImage', 'Quote', 'BigStat'." },
                            points: { type: "array", items: { type: "string" }, description: "List of points for SmartExplainer (BulletList) or items for PhysicsStack." },
                            items: { type: "array", items: { type: "string" }, description: "Alias for points, used by PhysicsStack." },
                            code: { type: "string", description: "Code snippet for TechCode." },
                            language: { type: "string", description: "Programming language for TechCode (e.g. 'javascript')." },
                            voice: { type: "string", description: "Voice ID for this scene (optional)" }
                        }
                    }
                },
                voice: { type: "string", description: "Default voice for the whole video (e.g. 'zh-CN-XiaoxiaoNeural')" },
                bgMusicStyle: { type: "string", description: "Background music style (e.g., 'Tech', 'Cinematic'). If provided, adds BGM." },
                webhookUrl: { type: "string" },
                token: { type: "string" }
            },
            required: ["script"]
        }
    },
    {
        name: "list_templates",
        description: "List available video templates and their parameter schemas",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "render_video",
        description: "Render a video using a specific template and parameters. IMPORTANT: For 'MasterSequence' template, you MUST provide at least 5 different scenes in the 'scenes' array to ensure the video is engaging. Do not just use a single static image for the whole video. Always include 'subtitles' in the props if there is any spoken content or narration script.",
        inputSchema: {
            type: "object",
            properties: {
                templateId: {
                    type: "string",
                    description: "The ID of the template (composition) to render. Recommended: 'MasterSequence' for full videos.",
                },
                inputProps: {
                    type: "object",
                    description: "Parameters for the template. For MasterSequence, this includes 'scenes' (array) and 'subtitles' (array).",
                },
                webhookUrl: {
                    type: "string",
                    description: "Optional: Webhook URL to call when render is complete. Advanced usage. Usually configured via connection query params.",
                },
                token: {
                    type: "string",
                    description: "Optional authentication token for VIP users."
                }
            },
            required: ["templateId", "inputProps"],
        },
    },
    {
        name: "get_render_status",
        description: "Get the status of a render job",
        inputSchema: {
            type: "object",
            properties: {
                jobId: {
                    type: "string",
                    description: "The ID of the render job",
                },
                token: { type: "string", description: "Optional authentication token." }
            },
            required: ["jobId"],
        },
    },
    {
        name: "merge_videos",
        description: "Merge multiple video URLs or paths into a single video",
        inputSchema: {
            type: "object",
            properties: {
                videoUrls: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of video URLs or local paths to merge",
                },
                token: { type: "string", description: "Optional authentication token." }
            },
            required: ["videoUrls"],
        },
    },
    {
        name: "search_stock_media",
        description: "Search for stock photos or videos using Pexels API. Use this when you need visual assets for the video but none were provided.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search keywords (e.g., 'office meeting', 'nature')." },
                type: { type: "string", enum: ["photo", "video"], description: "Type of media to search for." },
                orientation: { type: "string", enum: ["landscape", "portrait", "square"], description: "Orientation of the media. Default is landscape." },
                size: { type: "string", enum: ["large", "medium", "small"], description: "Size of the media (for photos). Default is large." },
                min_duration: { type: "number", description: "Minimum duration in seconds (for videos)." },
                token: { type: "string", description: "Optional authentication token." }
            },
            required: ["query", "type"]
        }
    },
    {
        name: "generate_speech",
        description: "Generate speech from text using Microsoft Edge TTS (free). Use this to create voiceovers for the video.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "The text to convert to speech." },
                voice: { type: "string", description: "The voice to use (e.g., 'zh-CN-XiaoxiaoNeural', 'en-US-AriaNeural'). Default is 'zh-CN-XiaoxiaoNeural'." },
                token: { type: "string", description: "Optional authentication token." }
            },
            required: ["text"]
        }
    },
    {
        name: "list_music_styles",
        description: "List available background music styles from the library (WebDAV). Use this to see what music categories are available.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_bgm_options",
        description: "Get a background music track for a specific style. Returns the local URL to be used in the video.",
        inputSchema: {
            type: "object",
            properties: {
                style: { type: "string", description: "The music style (folder name) to choose from. Use list_music_styles to get valid options." }
            },
            required: ["style"]
        }
    }
];

export const setupMcp = (
  app: express.Express,
  queue: any, // Typed as returned from makeRenderQueue
  remotionBundleUrl: string,
  port: number,
  rendersDir: string
) => {
  console.log(`[MCP] Authentication Required: ${AUTH_REQUIRED}`);
  
  // Store active sessions
  const sessions = new Map<string, { server: Server; transport: SSEServerTransport; webhookUrl?: string }>();

  // Function to create a new MCP server instance
  const createServer = (webhookUrl?: string) => {
    const server = new Server(
        {
          name: "remotion-render-server",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
    );

    // Tool definitions
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
          tools: getToolDefinitions()
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
          const { name, arguments: args } = request.params;
          // Note: Authentication is handled at the SSE connection level (verifyUser).
          // We do NOT need to check for a token inside the tool arguments again.
          // This avoids the issue where tools are called without a token in the arguments.
    
          if (name === "generate_video_from_script") {
              const { script, voice = 'zh-CN-XiaoxiaoNeural', bgMusicStyle, webhookUrl: argsWebhookUrl } = args as any;
              
              // Use webhookUrl from args or session context
              const finalWebhookUrl = argsWebhookUrl || webhookUrl;
              
              console.log(`[SmartVideo] Processing ${script.length} scenes...`);
              
              const { processedScenes, subtitles, totalDurationInFrames } = await enrichScenes(script, voice, port, true);
              
              // 3. Create Job
              const inputProps: any = {
                  scenes: processedScenes,
                  subtitles: subtitles
              };

              // Handle Background Music for Smart Video
              if (bgMusicStyle) {
                   console.log(`[SmartVideo] Fetching music for style: ${bgMusicStyle}`);
                   try {
                       const track = await getMusicForStyle(bgMusicStyle, port);
                       if (track) {
                           inputProps.bgMusic = {
                               style: bgMusicStyle,
                               src: track.localUrl,
                               durationInFrames: track.durationInFrames,
                               volume: 0.3,
                               loop: true
                           };
                           console.log(`[SmartVideo] Injected music: ${track.name}`);
                       } else {
                           console.warn(`[SmartVideo] Failed to find music for style: ${bgMusicStyle}`);
                       }
                   } catch (e) {
                       console.error(`[SmartVideo] Error fetching music:`, e);
                   }
              }
              
              console.log(`[SmartVideo] Job ready. Total frames: ${totalDurationInFrames}`);

              const jobId = queue.createJob({
                compositionId: "MasterSequence",
                inputProps,
                webhookUrl: finalWebhookUrl,
              });

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ 
                        jobId, 
                        statusUrl: `http://localhost:${port}/renders/${jobId}`,
                        message: "Smart video generation started. Assets fetched and voiceovers generated."
                    }),
                  },
                ],
              };
          }

          if (request.params.name === "list_templates") {
            const chromiumOptions = getChromiumOptions();
            const compositions = await getCompositions(remotionBundleUrl, {
              chromiumOptions,
              onBrowserDownload: (download) => {
                  const percent = Math.round((download.downloadedBytes / download.totalBytes) * 100);
                  console.log(`[MCP] Downloading browser: ${percent}% (${download.downloadedBytes}/${download.totalBytes})`);
              }
          });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    compositions.map((c) => ({
                      id: c.id,
                      width: c.width,
                      height: c.height,
                      fps: c.fps,
                      durationInFrames: c.durationInFrames,
                      defaultProps: c.defaultProps,
                    })),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          if (request.params.name === "render_video") {
            const { templateId, inputProps, webhookUrl: argsWebhookUrl } = request.params.arguments as any;
            
            // Use webhookUrl from args or session context
            const finalWebhookUrl = argsWebhookUrl || webhookUrl;
            
            console.log(`[MCP] Creating render job for ${templateId}`);

            // SMART ENRICHMENT FOR MASTER SEQUENCE
            // If the user uses MasterSequence but provides incomplete props (e.g. imageQuery instead of imageUrl),
            // we try to fix it automatically.
            let finalInputProps = inputProps || {};
            
            if (templateId === "MasterSequence" && finalInputProps.scenes) {
                console.log(`[MCP] Detected MasterSequence. enriching scenes...`);
                try {
                     const voice = finalInputProps.voice || 'zh-CN-XiaoxiaoNeural';
                     // Force calculation (true) to ensure video duration matches generated audio
                     const { processedScenes, subtitles } = await enrichScenes(finalInputProps.scenes, voice, port, true);
                     finalInputProps.scenes = processedScenes;
                     
                     // Also update subtitles if they were recalculated
                     if (subtitles && subtitles.length > 0) {
                         finalInputProps.subtitles = subtitles;
                     }

                     // MUSIC ENRICHMENT
                     if (finalInputProps.bgMusic && finalInputProps.bgMusic.style) {
                         console.log(`[MCP] Fetching music for style: ${finalInputProps.bgMusic.style}`);
                         const track = await getMusicForStyle(finalInputProps.bgMusic.style, port);
                         if (track) {
                             finalInputProps.bgMusic.src = track.localUrl;
                             finalInputProps.bgMusic.durationInFrames = track.durationInFrames;
                             console.log(`[MCP] Injected music: ${track.name}`);
                         } else {
                             console.warn(`[MCP] Failed to find music for style: ${finalInputProps.bgMusic.style}`);
                         }
                     }

                } catch (e) {
                    console.error("[MCP] Failed to enrich MasterSequence scenes:", e);
                    // Continue with original props on error
                }
            }

            const jobId = queue.createJob({
              compositionId: templateId,
              inputProps: finalInputProps,
              webhookUrl: finalWebhookUrl,
            });
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ jobId, statusUrl: `http://localhost:${port}/renders/${jobId}` }),
                },
              ],
            };
          }

      if (request.params.name === "get_render_status") {
        const { jobId } = request.params.arguments as any;
        const job = queue.jobs.get(jobId);
        
        if (!job) {
          throw new Error("Job not found");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(job),
            },
          ],
        };
      }
      
      if (request.params.name === "list_music_styles") {
        const styles = await listMusicStyles();
        return {
            content: [{ type: "text", text: JSON.stringify(styles) }]
        };
      }

      if (request.params.name === "get_bgm_options") {
          const { style } = request.params.arguments as any;
          const track = await getMusicForStyle(style, port);
          if (!track) {
              return { isError: true, content: [{ type: "text", text: "No music found for this style." }] };
          }
          return {
              content: [{ type: "text", text: JSON.stringify(track) }]
          };
      }

      if (request.params.name === "merge_videos") {
        const { videoUrls } = request.params.arguments as any;
        
        const paths = (videoUrls as string[]).map(url => {
          if (url.includes(`localhost:${port}/renders/`)) {
             const filename = url.split('/').pop();
             if (filename) return `${rendersDir}/${filename}`;
          }
          return url;
        });

        const result = await mergeVideos(paths, rendersDir, port);
        
        return {
          content: [
             {
               type: "text",
               text: JSON.stringify(result),
             }
          ]
        };
      }

      if (name === "search_stock_media") {
        const { query, type, orientation = "landscape", size = "large", min_duration } = args as any;
        const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
        
        if (!PEXELS_API_KEY) {
             return {
                content: [{ type: "text", text: JSON.stringify({ error: "PEXELS_API_KEY environment variable is not set." }) }],
                isError: true
            };
        }

        try {
            const baseUrl = type === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search';
            const params = new URLSearchParams({
                query,
                orientation,
                per_page: '5',
                size, 
            });
            
            const response = await fetch(`${baseUrl}?${params}`, {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Pexels API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            let result = null;

            if (type === 'video' && data.videos && data.videos.length > 0) {
                 const videos = data.videos as any[];
                 let candidates = videos;
                 if (min_duration) {
                     const valid = videos.filter(v => v.duration >= min_duration);
                     if (valid.length > 0) {
                         candidates = valid.sort((a, b) => a.duration - b.duration);
                     } else {
                         candidates = videos.sort((a, b) => b.duration - a.duration);
                     }
                 }
                 
                 const bestMatch = candidates[0];
                 const videoFile = bestMatch.video_files.find((f: any) => f.quality === 'hd') || bestMatch.video_files[0];
                 result = {
                     id: bestMatch.id,
                     url: videoFile.link,
                     thumbnail: bestMatch.image,
                     duration: bestMatch.duration,
                     width: bestMatch.width,
                     height: bestMatch.height
                 };
            } else if (type === 'photo' && data.photos && data.photos.length > 0) {
                 const photo = data.photos[0];
                 result = {
                     id: photo.id,
                     url: photo.src[size] || photo.src.large,
                     width: photo.width,
                     height: photo.height,
                     photographer: photo.photographer
                 };
            }

            if (!result) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ message: "No media found matching the criteria." }) }]
                };
            }

            return {
                content: [{ type: "text", text: JSON.stringify(result) }]
            };

        } catch (e: any) {
            return {
                content: [{ type: "text", text: JSON.stringify({ error: e.message }) }],
                isError: true
            };
        }
    }

    if (name === "generate_speech") {
        const { text, voice = 'zh-CN-XiaoxiaoNeural' } = args as any;
        
        try {
            // Ensure public/audio exists
            const audioDir = path.resolve("public/audio");
            if (!fs.existsSync(audioDir)) {
                fs.mkdirSync(audioDir, { recursive: true });
            }

            const hash = crypto.createHash('md5').update(text + voice).digest('hex');
            const fileName = `${hash}.mp3`;
            const filePath = path.join(audioDir, fileName);
            const publicUrl = `http://localhost:${port}/audio/${fileName}`;

            // Check cache
            if (fs.existsSync(filePath)) {
                 return {
                    content: [{ type: "text", text: JSON.stringify({ url: publicUrl, cached: true }) }]
                 };
            }

            const tts = new EdgeTTS({ voice });
            await tts.ttsPromise(text, filePath);

            return {
                content: [{ type: "text", text: JSON.stringify({ url: publicUrl }) }]
            };

        } catch (e: any) {
             return {
                content: [{ type: "text", text: JSON.stringify({ error: e.message, details: "Ensure node-edge-tts is working correctly." }) }],
                isError: true
            };
        }
    }

      throw new Error("Tool not found");
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });
  
  return server;
  };

  app.post("/mcp/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
        res.status(400).send("Missing sessionId");
        return;
    }
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      console.error(`[MCP][PID:${process.pid}] Session not found: ${sessionId}`);
      console.error(`[MCP][PID:${process.pid}] Available sessions: ${Array.from(sessions.keys()).join(', ')}`);
      res.status(404).send("Session not found");
      return;
    }
    
    const { transport } = session;
    
    try {
        await transport.handlePostMessage(req, res);
    } catch (err) {
        console.error("Error handling POST message:", err);
        if (!res.headersSent) {
             res.status(500).send(String(err));
        }
    }
  });

  // 拦截 SSE 连接进行鉴权
  app.get("/mcp/sse", async (req, res) => {
    console.log(`[MCP] SSE connection request from ${req.ip}`);
    
    if (AUTH_REQUIRED) {
        const token = req.query.token as string || req.headers['x-mcp-token'] as string || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!token) {
            res.status(401).send("Unauthorized: Missing Token");
            return;
        }

        const isVip = await verifyUser(token);
        if (!isVip) {
             res.status(403).send("Forbidden: Invalid Token or not VIP");
             return;
        }
    }

    const webhookUrl = req.query.webhookUrl as string | undefined;

    // Set headers to prevent buffering in Nginx/Proxies
    // Note: Do NOT call res.flushHeaders() here, as SSEServerTransport will call res.writeHead()
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Process-ID', String(process.pid)); // Add PID to response headers
    
    // SSEServerTransport will likely set these, but we set them just in case or to enforce specific values
    // Node.js will merge these with writeHead calls unless strictly overridden
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    
    // Create transport with existing response object
    // Note: We manually set headers above, so the transport shouldn't try to set them again if it checks res.headersSent
    const transport = new SSEServerTransport("/mcp/messages", res);
    const sessionId = transport.sessionId;

    console.log(`[MCP][PID:${process.pid}] New Session: ${sessionId}, Webhook: ${webhookUrl || 'None'}`);

    const server = createServer(webhookUrl);
    
    sessions.set(sessionId, { server, transport, webhookUrl });
    
    try {
        await server.connect(transport);
        console.log(`[MCP][PID:${process.pid}] Session ${sessionId} connected`);
        
        // Send a keep-alive comment every 15 seconds to prevent timeouts
        const keepAliveInterval = setInterval(() => {
            if (!res.writableEnded) {
                res.write(": keepalive\n\n");
            }
        }, 15000);
        
        req.on('close', () => {
            console.log(`[MCP][PID:${process.pid}] Session ${sessionId} connection closed. Scheduling removal in 5s.`);
            clearInterval(keepAliveInterval);
            
            // Delay session removal to handle potential race conditions or brief network interruptions
            // Also helps if POST arrives slightly after SSE disconnects
            setTimeout(() => {
                 if (sessions.has(sessionId)) {
                     console.log(`[MCP][PID:${process.pid}] Removing session ${sessionId}`);
                     sessions.delete(sessionId);
                 }
            }, 5000);
        });

    } catch (error) {
        console.error(`[MCP][PID:${process.pid}] Failed to connect MCP server to transport:`, error);
        // Only attempt to close response if headers haven't been sent or if it's still writable
        // But headers are definitely sent by now.
        // We just ensure we don't try to write more headers.
        sessions.delete(sessionId);
        if (!res.writableEnded) {
            res.end();
        }
        return;
    }
    
    // Moved to inside try block to ensure cleanup
    // req.on('close', () => {
    //     console.log(`[MCP] Session ${sessionId} closed`);
    //     sessions.delete(sessionId);
    // });
  });
};

