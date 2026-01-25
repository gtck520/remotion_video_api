
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Helper to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PORT = 3006;
const BASE_URL = `http://localhost:${PORT}`;

// The script to generate
const script = [
    {
        type: "IntroTitle",
        title: "人为什么要多读书？",
        subtitle: "深度解析阅读的力量",
        text: "你是否想过，我们为什么要读书？",
        voice: "zh-CN-XiaoxiaoNeural",
        imageQuery: "library books mysterious", // Add background search query
        durationInFrames: 150
    },
    {
        type: "SmartExplainer",
        title: "打破认知局限",
        text: "读书能让我们打破时空的限制，与古今中外的智者对话。它不仅是知识的获取，更是思维的拓展。",
        layout: "Quote",
        imageQuery: "library books wisdom",
        durationInFrames: 180
    },
    {
        type: "CaptionedVideo",
        text: "每一本书都是一扇窗，带你看到未曾见过的风景，体验未曾经历的人生。",
        imageQuery: "reading window landscape",
        imageAnimation: "zoom-in",
        textAnimation: "fade-in",
        durationInFrames: 180
    },
    {
        type: "SmartExplainer",
        title: "塑造更好的自己",
        text: "阅读潜移默化地改变着我们的气质和谈吐。腹有诗书气自华，读书是最低门槛的高贵。",
        layout: "BulletList",
        points: ["提升思维深度", "丰富情感体验", "增强逻辑能力"],
        imageQuery: "person reading growth",
        durationInFrames: 210
    },
    {
        type: "IntroTitle",
        title: "开始阅读吧",
        subtitle: "哪怕每天十分钟",
        text: "从今天开始，拿起一本书，遇见更好的自己。",
        imageQuery: "morning reading sun book", // Optimize background
        durationInFrames: 150
    }
];

async function generateVideo() {
    console.log(`[Script] Connecting to server at ${BASE_URL}...`);

    try {
        // 1. Submit Render Job directly to server
        // The server handles enrichment (TTS, Image Search) automatically for MasterSequence
        console.log("[Script] Submitting render job to /renders...");
        
        const response = await axios.post(`${BASE_URL}/renders`, {
            templateId: "MasterSequence",
            compositionId: "MasterSequence", // Server expects compositionId
            token: "debug_magic_token", // Bypass auth
            inputProps: { 
                scenes: script,
                voice: "zh-CN-XiaoxiaoNeural",
                bgMusic: { style: "Cinematic", volume: 0.2, loop: true }
            }
        });
        
        const jobId = response.data.jobId;
        console.log(`[Script] Job ID: ${jobId}`);
        
        // 2. Poll for status
        let status = "queued";
        while (status !== "done" && status !== "error") {
            await sleep(2000);
            const statusRes = await axios.get(`${BASE_URL}/renders/${jobId}`);
            status = statusRes.data.status;
            const progress = statusRes.data.progress || 0;
            console.log(`[Script] Status: ${status} (${(progress * 100).toFixed(1)}%)`);
            
            if (status === "error") {
                console.error("[Script] Render failed:", statusRes.data.error);
                process.exit(1);
            }
        }
        
        const resultUrl = `${BASE_URL}/renders/${jobId}/out.mp4`;
        console.log(`[Script] Video generated successfully!`);
        console.log(`[Script] URL: ${resultUrl}`);
        
        // Check if file exists locally (since we are on the server filesystem)
        const localPath = path.resolve("renders", jobId, "out.mp4");
        if (fs.existsSync(localPath)) {
             console.log(`[Script] Local file path: ${localPath}`);
        }

    } catch (e: any) {
        console.error("[Script] Error:", e.message);
        if (e.response) {
            console.error("[Script] Response data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

generateVideo();
