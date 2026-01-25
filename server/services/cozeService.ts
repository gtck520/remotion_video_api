import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const COZE_API_BASE = 'https://api.coze.cn/v1';

export interface CozeVoice {
    voice_id: string;
    name: string;
    language_code: string;
    preview_audio?: string;
    preview_text?: string;
}

export const listCozeVoices = async (token: string, pageNum: number = 1, pageSize: number = 100): Promise<CozeVoice[]> => {
    try {
        const url = `${COZE_API_BASE}/audio/voices?filter_system_voice=false&model_type=big&voice_state=&page_num=${pageNum}&page_size=${pageSize}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
             const errText = await response.text();
             console.error(`[CozeService] Error details: ${errText}`);
             throw new Error(`Coze API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.code !== 0) {
            throw new Error(`Coze API returned error code ${data.code}: ${data.msg}`);
        }

        return data.data.voice_list.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            language_code: v.language_code,
            preview_audio: v.preview_audio,
            preview_text: v.preview_text
        }));
    } catch (error) {
        console.error('[CozeService] Failed to list voices:', error);
        return [];
    }
};

export const generateCozeSpeech = async (
    text: string, 
    voiceId: string, 
    token: string, 
    outputPath: string
): Promise<boolean> => {
    try {
        const url = `${COZE_API_BASE}/audio/speech`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                voice_id: voiceId,
                response_format: 'mp3' // Changed to mp3 for better compatibility
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Coze TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const buffer = await response.buffer();
        fs.writeFileSync(outputPath, buffer);
        return true;
    } catch (error) {
        console.error('[CozeService] TTS generation failed:', error);
        return false;
    }
};
