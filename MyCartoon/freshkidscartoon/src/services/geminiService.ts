
import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { Message, Script, AspectRatio, ImageSize } from "../types";
import { GET_SYSTEM_INSTRUCTION_BRAINSTORM, GET_SYSTEM_INSTRUCTION_SCRIPT } from "../constants";
import { pcmBase64ToWavBase64 } from "../audio";

// --- CONFIGURATION ---

const getEnv = (key: string): string => {
    try {
        // First try standard process.env (polyfilled by Vite or provided by platform)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key] as string;
        }
    } catch (e) {}
    
    try {
        // Then try window.process.env (common polyfill)
        if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
            return (window as any).process.env[key];
        }
    } catch (e) {}

    // Then try Vite's import.meta.env explicitly
    if (key === 'GEMINI_API_KEY' && import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
    if (key === 'API_KEY' && import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    if (key === 'SUPABASE_URL' && import.meta.env.VITE_SUPABASE_URL) return import.meta.env.VITE_SUPABASE_URL;
    if (key === 'SUPABASE_ANON_KEY' && import.meta.env.VITE_SUPABASE_ANON_KEY) return import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (key === 'HUGGINGFACE_API_KEY' && import.meta.env.VITE_HUGGINGFACE_API_KEY) return import.meta.env.VITE_HUGGINGFACE_API_KEY;
    
    return '';
};

export const TokenTracker = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    budgetCap: 150000, // Arbitrary cap for a single session to prevent runaway costs
    addUsage: (usageMetadata?: any) => {
        if (!usageMetadata) return;
        TokenTracker.inputTokens += usageMetadata.promptTokenCount || 0;
        TokenTracker.outputTokens += usageMetadata.candidatesTokenCount || 0;
        TokenTracker.totalTokens += usageMetadata.totalTokenCount || 0;
        console.log(`[TokenTracker] Input: ${TokenTracker.inputTokens}, Output: ${TokenTracker.outputTokens}, Total: ${TokenTracker.totalTokens}`);
        
        if (TokenTracker.totalTokens > TokenTracker.budgetCap) {
            console.warn(`[TokenTracker] BUDGET CAP EXCEEDED! (${TokenTracker.totalTokens} > ${TokenTracker.budgetCap})`);
            throw new Error("API Budget Cap Exceeded for this session.");
        }
    },
    reset: () => {
        TokenTracker.inputTokens = 0;
        TokenTracker.outputTokens = 0;
        TokenTracker.totalTokens = 0;
    }
};

export const AssetCache = new Map<string, any>();
export const clearAssetCache = () => AssetCache.clear();

const MODEL_CONFIG = {
    chat: {
        models: ['gemini-3.1-flash-lite-preview'],
    },
    script: {
        models: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'],
    },
    image: {
        gemini: ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'],
    },
    video: {
        veo: ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'],
        hf: ['hf:stabilityai/stable-video-diffusion-img2vid-xt', 'hf:stabilityai/stable-video-diffusion-img2vid']
    },
    tts: {
        models: ['gemini-2.5-flash-preview-tts'],
    },
    music: {
        models: ['lyria-3-clip-preview'],
    },
    stt: {
        model: 'openai/whisper-large-v3',
    }
};

// Clients
export const getAiClient = (options?: { skipProxy?: boolean }) => {
  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
  const supabaseUrl = getEnv('SUPABASE_URL');
                 
  if (supabaseUrl && !apiKey && !options?.skipProxy) {
      // Use the Edge Function proxy
      const proxyUrl = `${supabaseUrl}/functions/v1/generate`;
      const userId = localStorage.getItem('mycartoon_userId') || 'anonymous';
      console.log(`AI Service: Initializing with proxy: ${proxyUrl} for user: ${userId}`);
      
      return new GoogleGenAI({ 
          apiKey: 'proxy-key', // Dummy key to pass validation
          httpOptions: {
              baseUrl: proxyUrl,
              headers: {
                  'x-user-id': userId
              }
          }
      });
  }

  if (!apiKey) {
      if (import.meta.env.DEV) {
          console.warn("AI Service: Dev mode detected, using dummy API key.");
          return new GoogleGenAI({ apiKey: 'dev-dummy-key' });
      }
      console.error("AI Service Error: GEMINI_API_KEY is missing from environment.");
      return new GoogleGenAI({ apiKey: '' });
  }
  console.log("AI Service: Initializing with direct API key.");
  return new GoogleGenAI({ apiKey: apiKey });
};

export const getLiveClient = () => getAiClient({ skipProxy: true });

// Utility to pause execution, with AbortSignal support
const wait = (ms: number, signal?: AbortSignal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("Aborted"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
    });
});

// Helper to clean JSON string from Markdown
const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/, '').replace(/```$/, '');
  }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean.trim();
};

export const getMimeType = (base64: string): string => {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg';
};

/**
 * Builds a renderable data URL from raw base64 image bytes.
 * The provider that served the image decides the format (Gemini returns PNG,
 * Imagen JPEG, Pollinations JPEG), so we sniff instead of assuming.
 */
export const toImageDataUrl = (base64?: string): string =>
    base64 ? `data:${getMimeType(base64)};base64,${base64}` : '';

// --- CORE SERVICES ---

/**
 * Basic retry logic for a single operation.
 */
async function retry<T>(operation: () => Promise<T>, retries = 2, delay = 1000, signal?: AbortSignal): Promise<T> {
  try {
    if (signal?.aborted) throw new Error("Aborted");
    return await operation();
  } catch (error: any) {
    if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error; // Don't retry if aborted

    const errorMsg = error?.message || JSON.stringify(error);
    const status = error?.status || 0;
    
    const isRateLimit = errorMsg.includes('429') || status === 429 || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
    const isServerOverload = errorMsg.includes('503') || status === 503;
    const isInternalError = errorMsg.includes('500') || status === 500;
    
    // Retry on transient errors
    if (retries > 0 && (isRateLimit || isServerOverload || isInternalError)) {
      await wait(delay, signal); 
      return retry(operation, retries - 1, delay * 2, signal); 
    }
    throw error;
  }
}

/**
 * Executes an operation with a list of fallback models.
 * It iterates through `models`. If one fails, it tries the next.
 */
async function withModelFallbacks<T>(
    models: string[], 
    operation: (model: string) => Promise<T>, 
    category: string,
    signal?: AbortSignal
): Promise<T> {
    let lastError: any;
    
    for (const model of models) {
        if (signal?.aborted) throw new Error("Aborted");
        try {
            // We use a small internal retry (handled by `retry` wrapper inside operation or here)
            // for the specific model before giving up and switching.
            return await retry(() => operation(model), 1, 1000, signal);
        } catch (error: any) {
            if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error;

            console.warn(`⚠️ [${category}] Model '${model}' failed:`, error.message || error);
            lastError = error;
            // If it's a critical auth error or bad request (400), don't fallback, just fail.
            if (error.status === 400 || (error.message && error.message.includes('API key'))) {
                throw error;
            }
            // Otherwise (429, 500, safety), continue to next model
            continue;
        }
    }
    throw lastError || new Error(`${category} generation failed on all models.`);
}

/**
 * Generates narration audio (WAV base64).
 */
export const generateNarration = async (text: string, age: number, voiceId: string = 'Kore', signal?: AbortSignal): Promise<string> => {
    if (!text || String(text).trim() === '') {
        console.warn("generateNarration called with empty text, returning empty string.");
        return '';
    }
    
    const cacheKey = `narration_${text}_${age}_${voiceId}`;
    if (AssetCache.has(cacheKey)) {
        console.log(`[Cache Hit] Narration`);
        return AssetCache.get(cacheKey);
    }

    try {
        return await retry(async () => {
            const ai = getAiClient();
            const ttsText = age < 8 ? `Speak cheerfully: ${String(text)}` : String(text);
            const response = await ai.models.generateContent({
                model: MODEL_CONFIG.tts.models[0],
                contents: [{ parts: [{ text: ttsText }] }],
                config: {
                    responseModalities: [Modality.AUDIO], 
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } },
                    },
                },
            });
            
            TokenTracker.addUsage(response.usageMetadata);
            
            const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (rawPcm) {
                const wavBase64 = await pcmBase64ToWavBase64(rawPcm);
                AssetCache.set(cacheKey, wavBase64);
                return wavBase64;
            }
            throw new Error("No audio returned");
        }, 2, 2000, signal);
    } catch (error: any) {
        if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error;
        console.warn("Narration generation failed:", error?.message || error);
        return "";
    }
};

/**
 * Generates structured script using Gemini with Fallbacks.
 */
export const generateScript = async (storyContext: string, age: number, isMovieMode: boolean, sceneCount: number, signal?: AbortSignal): Promise<Script> => {
    const cacheKey = `script_${storyContext}_${age}_${isMovieMode}_${sceneCount}`;
    if (AssetCache.has(cacheKey)) {
        console.log(`[Cache Hit] Script`);
        return AssetCache.get(cacheKey);
    }

    return withModelFallbacks(MODEL_CONFIG.script.models, async (model) => {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model,
            contents: `Context: ${storyContext}`,
            config: {
                systemInstruction: GET_SYSTEM_INSTRUCTION_SCRIPT(age, isMovieMode, sceneCount) + 
                "\nCRITICAL: Output valid JSON only. No markdown formatting. The root object must contain a 'scenes' array." +
                "\nCRITICAL: Maintain visual continuity across scenes. Ensure character actions and environment details are consistent throughout the script." +
                "\nCRITICAL: Specify camera angles (e.g., 'Wide shot', 'Full body shot') in the `visualDescription` for every scene. Do NOT generate extreme close-ups or cropped faces.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A short, fun title for the cartoon" },
                        characters: {
                            type: Type.ARRAY,
                            description: "Every character, each as one line of fixed physical detail (e.g. 'Pip: a small round blue robot with big yellow eyes and a red scarf')",
                            items: { type: Type.STRING }
                        },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    visualDescription: { type: Type.STRING },
                                    narrative: { type: Type.STRING },
                                    musicMood: { type: Type.STRING, description: "Mood for the background music (e.g., happy bouncy cartoon music)" }
                                },
                                required: ["id", "visualDescription", "narrative"]
                            }
                        }
                    },
                    required: ["scenes"]
                }
            }
        });

        TokenTracker.addUsage(response.usageMetadata);

        if (!response.text) throw new Error("Empty response");

        let jsonStr = cleanJson(response.text);
        const parsed = JSON.parse(jsonStr);
        let finalScript = parsed;
        
        if (!finalScript.scenes && finalScript.script && Array.isArray(finalScript.script.scenes)) {
            finalScript = finalScript.script;
        } else if (!finalScript.scenes && finalScript.story && Array.isArray(finalScript.story.scenes)) {
                finalScript = { ...finalScript, scenes: finalScript.story.scenes };
        }

        if (!Array.isArray(finalScript.scenes) || finalScript.scenes.length === 0) {
            throw new Error("Missing scenes");
        }
        
        AssetCache.set(cacheKey, finalScript);
        return finalScript as Script;
    }, "Script", signal);
};

// --- IMAGE GENERATION ---

export interface SceneImageOptions {
    /** Stable seed for the whole movie so the free provider keeps one look across scenes. */
    seed?: number;
    /** Character descriptions repeated into every prompt, for continuity. */
    characterBible?: string;
}

/**
 * Image mode runs on a free, keyless provider (Pollinations.ai) by default, so a
 * cartoon can always be made without an API key or Gemini quota. Set
 * VITE_IMAGE_PROVIDER=gemini to prefer the paid models instead — they give
 * stronger character consistency because they accept the previous frame as a
 * reference image. Either way the other providers remain as fallbacks.
 */
const IMAGE_PROVIDER = (import.meta.env.VITE_IMAGE_PROVIDER || 'free').toLowerCase();

const FREE_IMAGE_TIMEOUT_MS = 90000;

/** Deterministic 32-bit hash, used to derive one stable image seed per story. */
export const hashToSeed = (input: string): number => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % 1000000;
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
        } else {
            reject(new Error("Invalid data URL"));
        }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(blob);
});

/**
 * Fetch that gives up after `ms`. A timeout surfaces as a normal Error so callers
 * can fall back, while a caller-triggered abort still surfaces as an AbortError.
 */
const fetchWithTimeout = async (url: string, ms: number, signal?: AbortSignal): Promise<Response> => {
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ms);
    signal?.addEventListener('abort', onAbort);
    try {
        return await fetch(url, { signal: controller.signal });
    } catch (error: any) {
        if (timedOut) throw new Error(`Request timed out after ${Math.round(ms / 1000)}s`);
        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
};

/**
 * Free, keyless image generation. No account, no quota, no cost.
 * The seed is held constant across a movie so every scene shares one art style.
 */
const generateFreeImage = async (prompt: string, seed: number, signal?: AbortSignal): Promise<string> => {
    // The prompt travels in the URL path, so keep it clear of length limits.
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 1200));
    let lastError: any;

    for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) throw new Error("Aborted");

        const params = new URLSearchParams({
            width: '1280',
            height: '720',
            seed: String(seed + attempt),
            nologo: 'true',
            safe: 'true',
        });
        // Second attempt drops the model pin in case that model is unavailable.
        if (attempt === 0) params.set('model', 'flux');

        try {
            const response = await fetchWithTimeout(
                `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`,
                FREE_IMAGE_TIMEOUT_MS,
                signal
            );
            if (!response.ok) throw new Error(`Free image provider returned ${response.status}`);

            const blob = await response.blob();
            if (blob.size === 0) throw new Error("Free image provider returned an empty image");

            return await blobToBase64(blob);
        } catch (error: any) {
            if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error;
            console.warn(`⚠️ [Free Image] attempt ${attempt + 1} failed:`, error?.message || error);
            lastError = error;
        }
    }

    throw lastError || new Error("Free image generation failed");
};

/** Gemini image models — the only providers that can take a reference frame. */
const generateGeminiImage = async (prompt: string, referenceImageBase64?: string, signal?: AbortSignal): Promise<string> => {
    return withModelFallbacks(MODEL_CONFIG.image.gemini, async (model) => {
        const ai = getAiClient();
        const parts: any[] = [];

        if (referenceImageBase64) {
            parts.push({ inlineData: { data: referenceImageBase64, mimeType: getMimeType(referenceImageBase64) } });
            parts.push({ text: "Use this previous scene as a stylistic and character reference. Maintain character design, but change the action and background as described in the new prompt. CRITICAL: Do not zoom in. Maintain the same wide camera angle and distance as the reference image." });
        }
        parts.push({ text: prompt });

        // Handle specific config for Pro model vs Flash
        const config: any = {
            imageConfig: { aspectRatio: '16:9' }
        };
        if (model.includes('pro') || model.includes('3.1')) {
            config.imageConfig.imageSize = '2K';
        }

        const response = await ai.models.generateContent({ model, contents: { parts }, config });

        TokenTracker.addUsage(response.usageMetadata);

        const candidate = response.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') throw new Error("Safety block");

        for (const part of candidate?.content?.parts || []) {
            if (part.inlineData?.data) return part.inlineData.data;
        }
        throw new Error("No image data in response");
    }, "Gemini Image", signal);
};

const generateImagenImage = async (prompt: string, _signal?: AbortSignal): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });
    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Image) throw new Error("No image data in Imagen response");
    return base64Image;
};

const isSafetyError = (error: any): boolean =>
    error?.message === "Safety block" ||
    error?.status === 400 ||
    !!error?.message?.toLowerCase().includes('safety');

/**
 * Generates a consistent scene image, trying each provider in turn.
 * Free-first by default (see IMAGE_PROVIDER); never throws for a recoverable
 * reason without having tried every provider.
 */
export const generateSceneImage = async (
    prompt: string,
    age: number,
    previousImageBase64?: string,
    isRetry = false,
    signal?: AbortSignal,
    options: SceneImageOptions = {}
): Promise<string> => {
    if (signal?.aborted) throw new Error("Aborted");

    const seed = options.seed ?? hashToSeed(prompt);
    const cacheKey = `image_${prompt}_${age}_${seed}_${options.characterBible || ''}_${previousImageBase64 ? 'with_ref' : 'no_ref'}`;
    if (!isRetry && AssetCache.has(cacheKey)) {
        console.log(`[Cache Hit] Scene Image`);
        return AssetCache.get(cacheKey);
    }

    const styleSuffix = age < 8
        ? "cartoon style, 3d render, cute, bright colors, chunky shapes, kid friendly, G-rated, wide shot, full scene composition"
        : "cartoon style, cinematic, detailed textures, vibrant, dynamic composition, G-rated, wide shot, full scene composition";

    // The free provider can't see the previous frame, so the character sheet is
    // what keeps the cast recognisable from scene to scene.
    const characterLine = options.characterBible
        ? `Characters, drawn identically in every scene: ${options.characterBible}. `
        : '';

    const finalPrompt = isRetry
        ? `A cute safe cartoon scene: ${prompt}. Style: ${styleSuffix}`
        : `${characterLine}Create a scene: ${prompt}. Style: ${styleSuffix}. CRITICAL: Ensure the characters are fully visible in their environment. ALWAYS use a wide shot or medium shot. DO NOT generate extreme close-ups or cropped faces. Maintain consistent character distance.`;

    const providers: Array<[string, () => Promise<string>]> = [
        ['Free Image', () => generateFreeImage(finalPrompt, seed, signal)],
        ['Gemini Image', () => generateGeminiImage(finalPrompt, isRetry ? undefined : previousImageBase64, signal)],
        ['Imagen', () => generateImagenImage(finalPrompt, signal)],
    ];
    if (IMAGE_PROVIDER === 'gemini') providers.push(providers.shift()!);

    let lastError: any;
    let sawSafetyBlock = false;

    for (const [label, run] of providers) {
        if (signal?.aborted) throw new Error("Aborted");
        try {
            const image = await run();
            if (!isRetry) AssetCache.set(cacheKey, image);
            return image;
        } catch (error: any) {
            if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error;
            if (isSafetyError(error)) sawSafetyBlock = true;
            console.warn(`⚠️ [${label}] failed:`, error?.message || error);
            lastError = error;
        }
    }

    // If the prompt itself was the problem, one sanitized pass is worth the wait.
    if (!isRetry && sawSafetyBlock) {
        console.warn("Safety fallback triggered.");
        return generateSceneImage("A magical happy place", age, undefined, true, signal, options);
    }

    throw new Error(`All image generation methods failed. Last error: ${lastError?.message || lastError}`);
};

/**
 * Calls Hugging Face Inference API for video generation.
 * Handles the "Model Loading" (503) state by polling.
 */
const generateHuggingFaceVideo = async (modelId: string, imageBase64: string, prompt: string, signal?: AbortSignal): Promise<string> => {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const hfToken = getEnv('HUGGINGFACE_API_KEY');
    
    let url = `https://api-inference.huggingface.co/models/${modelId}`;
    let headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (supabaseUrl) {
        url = `${supabaseUrl}/functions/v1/generate/huggingface/models/${modelId}`;
        const userId = localStorage.getItem('mycartoon_userId') || 'anonymous';
        headers['x-user-id'] = userId;
    } else {
        if (!hfToken || hfToken === "YOUR_HUGGINGFACE_API_KEY") {
            throw new Error("VITE_HUGGINGFACE_API_KEY not configured in .env file.");
        }
        headers['Authorization'] = `Bearer ${hfToken}`;
    }
    
    // Construct payload based on model type
    // SVD typically expects 'inputs' as image, while LTX/Wan might be text-to-video or expect explicit 'image' param
    let payload: any = { inputs: imageBase64 };

    // Models that are strictly Image-to-Video often just take the image string as "inputs"
    // Models that are Text-to-Video or Hybrid (Wan, LTX) often take a JSON object with prompt and image
    if (modelId.includes('LTX') || modelId.includes('Wan')) {
        payload = {
            inputs: prompt,
            parameters: {
                image: imageBase64,
                num_inference_steps: 25
            }
        };
    }

    // Recursive polling function
    const fetchWithRetry = async (attempt = 1): Promise<Blob> => {
        if (signal?.aborted) throw new Error("Aborted");

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal
        });

        if (response.status === 503) {
            const data = await response.json();
            const waitTime = data.estimated_time || 20;
            console.log(`HF Model loading... Waiting ${waitTime}s (Attempt ${attempt})`);
            await wait(waitTime * 1000, signal);
            return fetchWithRetry(attempt + 1);
        }

        if (!response.ok) {
            const errText = await response.text();
            
            // If strict payload failed, try fallback payload (image only)
            if (attempt === 1 && (modelId.includes('LTX') || modelId.includes('Wan'))) {
                 console.warn("Complex payload failed, retrying with simple image payload...");
                 payload = { inputs: imageBase64 };
                 return fetchWithRetry(attempt + 1);
            }
            
            throw new Error(`HF API Error ${response.status}: ${errText}`);
        }

        return response.blob();
    };

    return blobToBase64(await fetchWithRetry());
};

/**
 * Generates a cinematic video using Veo 3 with Fallbacks.
 */
export const generateVeoVideo = async (prompt: string, imageBase64: string, signal?: AbortSignal): Promise<string> => {
    // Combine Veo and HF models for fallback
    const allVideoModels = [...MODEL_CONFIG.video.veo, ...MODEL_CONFIG.video.hf];
    
    return withModelFallbacks(allVideoModels, async (model) => {
        
        // 1. Check for Hugging Face Fallback prefix
        if (model.startsWith('hf:')) {
            const modelId = model.replace('hf:', '');
            return generateHuggingFaceVideo(modelId, imageBase64, prompt, signal);
        }

        // 2. Standard Gemini Veo Generation
        const ai = getAiClient();
        const mimeType = getMimeType(imageBase64);

        const op = await ai.models.generateVideos({
            model: model,
            prompt: prompt,
            image: {
                imageBytes: imageBase64,
                mimeType: mimeType, 
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    
        let operation = op;
        // Poll for completion
        while (!operation.done) {
            if (signal?.aborted) throw new Error("Aborted");
            await wait(10000, signal);
            // Retry getVideosOperation to handle transient network issues during polling
            operation = await retry(() => ai.operations.getVideosOperation({ operation: operation }), 3, 2000, signal);
        }
    
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No video URI returned");
    
        const url = new URL(downloadLink);
        
        const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
        const supabaseUrl = getEnv('SUPABASE_URL');
                       
        let fetchUrl = url.toString();
        let headers: Record<string, string> = {};

        if (supabaseUrl && !apiKey) {
            const proxyUrl = `${supabaseUrl}/functions/v1/generate`;
            const userId = localStorage.getItem('mycartoon_userId') || 'anonymous';
            fetchUrl = fetchUrl.replace('https://generativelanguage.googleapis.com', proxyUrl);
            headers['x-user-id'] = userId;
        } else {
            if (!url.searchParams.has('key')) url.searchParams.set('key', apiKey);
            fetchUrl = url.toString();
        }
        
        const fetchResponse = await fetch(fetchUrl, { signal, headers });
        if (!fetchResponse.ok) throw new Error(`Download failed: ${fetchResponse.status}`);
        
        const blob = await fetchResponse.blob();
        if (blob.size === 0) throw new Error("Empty video blob");

        return blobToBase64(blob);
    }, "Veo Video", signal);
};

/**
 * Fallback Speech-to-Text using OpenAI Whisper via HF.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const hfToken = getEnv('HUGGINGFACE_API_KEY');
    const model = MODEL_CONFIG.stt.model;
    
    let url = `https://api-inference.huggingface.co/models/${model}`;
    let headers: Record<string, string> = {
        'Content-Type': 'audio/wav'
    };

    if (supabaseUrl) {
        url = `${supabaseUrl}/functions/v1/generate/huggingface/models/${model}`;
        const userId = localStorage.getItem('mycartoon_userId') || 'anonymous';
        headers['x-user-id'] = userId;
    } else {
        if (!hfToken || hfToken === "YOUR_HUGGINGFACE_API_KEY") {
            console.warn("VITE_HUGGINGFACE_API_KEY not configured.");
        } else {
            headers['Authorization'] = `Bearer ${hfToken}`;
        }
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: audioBlob
        });
        
        if (!response.ok) throw new Error("STT Failed");
        
        const result = await response.json();
        return result.text || "";
    } catch (e) {
        console.error("Whisper Fallback Failed:", e);
        return "";
    }
};

/**
 * Text-based Chat with Director (Fallback Mode).
 * Used when Live API is unavailable.
 */
export const chatWithDirector = async (history: Message[], userInput: string, age: number): Promise<string> => {
    return withModelFallbacks(MODEL_CONFIG.chat.models, async (model) => {
        const ai = getAiClient();
        
        // Construct a simple chat history string
        const contextHistory = history.map(m => `${m.role === 'user' ? 'Kid' : 'Director'}: ${m.text}`).join('\n');
        
        const systemPrompt = GET_SYSTEM_INSTRUCTION_BRAINSTORM(age);
        const prompt = `${systemPrompt}\n\nExisting Conversation:\n${contextHistory}\n\nKid says: "${userInput}"\n\nDirector response:`;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
        });
        
        TokenTracker.addUsage(response.usageMetadata);
        
        return response.text || "I didn't catch that, can you say it again?";
    }, "Director Chat");
};

/**
 * Generates background music using Lyria.
 */
export const generateBackgroundMusic = async (mood: string, signal?: AbortSignal): Promise<string> => {
    const cacheKey = `music_${mood}`;
    if (AssetCache.has(cacheKey)) {
        console.log(`[Cache Hit] Background Music`);
        return AssetCache.get(cacheKey);
    }

    try {
        return await withModelFallbacks(MODEL_CONFIG.music.models, async (model) => {
            const ai = getAiClient();
            const response = await ai.models.generateContentStream({
                model: model,
                contents: `Generate a 30-second background music track for a kids cartoon. Mood: ${mood}`,
                config: {
                    responseModalities: [Modality.AUDIO]
                }
            });

            let audioBase64 = "";
            let mimeType = "audio/wav";
            for await (const chunk of response) {
                if (signal?.aborted) throw new Error("Aborted");
                
                // Note: usageMetadata might be on the final chunk
                if (chunk.usageMetadata) {
                    TokenTracker.addUsage(chunk.usageMetadata);
                }

                const parts = chunk.candidates?.[0]?.content?.parts;
                if (!parts) continue;
                for (const part of parts) {
                    if (part.inlineData?.data) {
                        if (!audioBase64 && part.inlineData.mimeType) {
                            mimeType = part.inlineData.mimeType;
                        }
                        audioBase64 += part.inlineData.data;
                    }
                }
            }
            
            if (!audioBase64) throw new Error("No audio returned");
            const finalAudio = `data:${mimeType};base64,${audioBase64}`;
            AssetCache.set(cacheKey, finalAudio);
            return finalAudio;
        }, "Background Music", signal);
    } catch (error: any) {
        if (signal?.aborted || error.message === "Aborted" || error.name === "AbortError") throw error;
        console.warn("Background music generation failed:", error?.message || error);
        return "";
    }
};
