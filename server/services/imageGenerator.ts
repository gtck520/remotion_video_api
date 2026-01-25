import fetch from 'node-fetch';

interface ImageGenerationOptions {
    prompt: string;
    model?: string;
    size?: string;
}

interface GeneratedImage {
    url: string;
    provider: string;
}

export const generateAiImage = async (options: ImageGenerationOptions): Promise<GeneratedImage | null> => {
    const autoToken = process.env.AUTO_API_TOKEN || process.env.COZE_API_TOKEN;
    const cozeWorkflowId = process.env.COZE_WORKFLOW_ID;
    const zhipuApiKey = process.env.ZHIPU_API_KEY;
    
    const requestedModel = options.model;

    // 1. Explicit request for Zhipu
    if (requestedModel === 'glm-image' || requestedModel === 'zhipu') {
        if (zhipuApiKey) {
            return generateZhipuImage(zhipuApiKey, options);
        } else {
             console.warn("[ImageGenerator] Zhipu requested but ZHIPU_API_KEY is not set.");
             return null;
        }
    }

    // 2. Explicit request for Coze
    if (requestedModel === 'coze') {
        if (autoToken && cozeWorkflowId) {
            return generateCozeImage(options);
        } else {
            console.warn("[ImageGenerator] Coze requested but AUTO_API_TOKEN or COZE_WORKFLOW_ID is not set.");
            return null;
        }
    }

    // 3. Default: Try Coze first (User Preference)
    if (autoToken && cozeWorkflowId) {
        return generateCozeImage(options);
    }

    // 4. Fallback: Try Zhipu
    if (zhipuApiKey) {
        console.log("[ImageGenerator] Coze not configured, falling back to Zhipu for default generation.");
        return generateZhipuImage(zhipuApiKey, options);
    }

    console.warn("[ImageGenerator] No AI image provider configured (Coze or Zhipu).");
    return null;
};

async function generateCozeImage(options: ImageGenerationOptions): Promise<GeneratedImage | null> {
    const token = process.env.AUTO_API_TOKEN || process.env.COZE_API_TOKEN;
    const userToken = process.env.COZE_USER_TOKEN;
    const workflowId = process.env.COZE_WORKFLOW_ID;

    if (!token || !workflowId) {
        console.warn("[ImageGenerator] AUTO_API_TOKEN (or COZE_API_TOKEN) or COZE_WORKFLOW_ID is not set.");
        return null;
    }

    const url = "https://auto.kanglan.vip/cozeapi/coze/runWorkflow";

    try {
        console.log(`[ImageGenerator] Generating image with Coze Workflow. Prompt: "${options.prompt.substring(0, 50)}..."`);

        const body = {
            token: token,
            user_token: userToken, // Now using AUTO_API_TOKEN as gateway token, and COZE_USER_TOKEN as user context
            workflow_id: workflowId,
            parameters: {
                style: "横屏", // Default to landscape for video generation
                prompt: options.prompt
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Remotion-Server/1.0'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ImageGenerator] Coze API Error: ${response.status} ${response.statusText}`, errorText);
            return null;
        }

        const data = await response.json() as any;
        console.log("[ImageGenerator] Coze Response:", JSON.stringify(data).substring(0, 200));

        // Response structure:
        // { "code": 1, "data": { "data": { "image": " `https://...` " } } }
        let imageUrl: string | undefined;

        if (data && data.data && data.data.data && data.data.data.image) {
            let rawUrl = data.data.data.image;
            if (typeof rawUrl === 'string') {
                // Remove backticks and extra whitespace if present (as seen in user example)
                imageUrl = rawUrl.replace(/`/g, '').trim();
            }
        }

        if (imageUrl && imageUrl.startsWith('http')) {
            console.log(`[ImageGenerator] Successfully generated Coze image: ${imageUrl}`);
            return {
                url: imageUrl,
                provider: 'coze'
            };
        }

        console.warn("[ImageGenerator] Could not extract image URL from Coze response", data);
        return null;

    } catch (error) {
        console.error("[ImageGenerator] Coze Generation failed:", error);
        return null;
    }
}

async function generateZhipuImage(apiKey: string, options: ImageGenerationOptions): Promise<GeneratedImage | null> {
    const url = "https://open.bigmodel.cn/api/paas/v4/images/generations";
    
    // Zhipu supports specific sizes, we'll default to one of the recommended ones closest to standard 16:9 or 1:1
    // Recommended: 1280x1280, 1568x1056, 1056x1568, 1472x1088, 1088x1472, 1728x960, 960x1728
    // For video background (landscape), 1728x960 or 1472x1088 is good.
    // Default to 1728x960 (approx 16:9) if not specified
    const size = options.size || "1728x960"; 

    try {
        console.log(`[ImageGenerator] Generating image with Zhipu (GLM-Image). Prompt: "${options.prompt.substring(0, 50)}..."`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: options.model || "glm-image",
                prompt: options.prompt,
                size: size
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ImageGenerator] Zhipu API Error: ${response.status} ${response.statusText}`, errorText);
            return null;
        }

        const data = await response.json() as any;
        
        if (data.data && data.data.length > 0 && data.data[0].url) {
            console.log(`[ImageGenerator] Successfully generated image: ${data.data[0].url}`);
            return {
                url: data.data[0].url,
                provider: 'zhipu'
            };
        }
        
        console.warn("[ImageGenerator] No image URL in response", data);
        return null;

    } catch (error) {
        console.error("[ImageGenerator] Generation failed:", error);
        return null;
    }
}
