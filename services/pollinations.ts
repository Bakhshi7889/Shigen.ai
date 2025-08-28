
// This service exclusively uses the Pollinations.AI API for all operations.
// It does not connect to or use any Google APIs like Gemini or Imagen.
import type { Message, ModelStatus, ModelStatusMap, GeneratedTheme, StoryBeat, StoryContinuation } from '../types';

const API_BASE_TEXT = 'https://text.pollinations.ai';
const API_BASE_IMAGE = 'https://image.pollinations.ai';

// For direct use in <img> src attributes.
const API_BASE_IMAGE_DIRECT = 'https://image.pollinations.ai';

const chatModelKeywords = ['gpt', 'openai', 'grok', 'llama', 'mistral', 'mixtral', 'instruct', 'hermes', 'zephyr', 'deepseek', 'bidara'];
export const isChatModel = (model: string): boolean => chatModelKeywords.some(k => model.toLowerCase().includes(k));

const imageGenKeywords = [
    'generate', 'draw', 'create', 'make', 'sketch', 'paint', 'render', 'illustrate',
    'an image of', 'a picture of', 'a photo of', 'a drawing of',
    'midjourney', 'dall-e-3', 'dalle-3', 'playground', 'ideogram', 'flux'
];

export const isImageGenRequest = (prompt: string): boolean => {
    const lowerPrompt = prompt.toLowerCase().trim();
    // Check for explicit commands first
    if (lowerPrompt.startsWith('/') && imageGenKeywords.some(k => lowerPrompt.includes(`/${k}`))) {
        return true;
    }
    // Check for natural language triggers at the beginning of the prompt
    return imageGenKeywords.some(keyword => lowerPrompt.startsWith(keyword + ' '));
};


export interface FetchedTextModels {
    models: string[];
    statuses: ModelStatusMap;
}

const parseAndFilterModels = (rawData: any): { models: string[], statuses: ModelStatusMap } => {
    let models: string[] = [];
    const statuses: ModelStatusMap = {};

    // OpenAI compatible format: { data: [{ id: 'model-name', ... }, ...] }
    if (rawData.data && Array.isArray(rawData.data)) {
        rawData.data.forEach((item: any) => {
            if (item.id && typeof item.id === 'string') {
                const modelName = item.id;
                models.push(modelName);
                // Assume online if listed; OpenAI format doesn't provide this directly in the list.
                statuses[modelName] = 'available';
            }
        });
    }
    // Pollinations format (object with keys)
    else if (typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
        for (const modelName in rawData) {
            models.push(modelName);
            const modelData = rawData[modelName];
            if (typeof modelData === 'object' && modelData !== null && typeof modelData.is_online === 'boolean') {
                statuses[modelName] = modelData.is_online ? 'available' : 'unavailable';
            } else {
                statuses[modelName] = 'unchecked';
            }
        }
    } 
    // Pollinations format (array of strings)
    else if (Array.isArray(rawData) && rawData.every(item => typeof item === 'string')) {
        models = rawData as string[];
        models.forEach(m => statuses[m] = 'unchecked');
    }
    // Pollinations format (array of objects with id/name)
    else if (Array.isArray(rawData) && rawData.every(item => typeof item === 'object' && item !== null && (item.id || item.name))) {
        rawData.forEach(item => {
            const modelName = item.id || item.name;
            models.push(modelName);
            if (typeof item.is_online === 'boolean') {
                 statuses[modelName] = item.is_online ? 'available' : 'unavailable';
            } else {
                statuses[modelName] = 'unchecked';
            }
        });
    } else {
        throw new Error('Unexpected format for text models. Could not parse response.');
    }

    // Filter out models that are not suitable for chat/generation in this app
    const excludedKeywords = ['whisper', 'kontext', 'mistral-7b-instruct-v0.2', 'embedding', 'audio', 'music'];
    const filteredModels = models.filter(modelName => {
        const lowerM = modelName.toLowerCase();
        if (excludedKeywords.some(keyword => lowerM.includes(keyword))) {
            return false;
        }
        if (lowerM.includes('mistral') && (lowerM.includes('2.0') || lowerM.includes('2.o'))) {
            return false;
        }
        return true;
    });
    
    const finalStatuses: ModelStatusMap = {};
    filteredModels.forEach(modelName => {
        finalStatuses[modelName] = statuses[modelName] || 'unchecked';
    });
    
    if (filteredModels.length === 0) {
        throw new Error('Parsed text models list is empty after filtering.');
    }
    
    return { models: filteredModels.sort(), statuses: finalStatuses };
};


export const fetchTextModels = async (): Promise<FetchedTextModels> => {
    const endpoints = [
        `${API_BASE_TEXT}/openai/v1/models`, // Primary: OpenAI-compatible endpoint
        `${API_BASE_TEXT}/models`             // Fallback: Original endpoint
    ];

    for (const url of endpoints) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Endpoint ${url} not found (404), trying next.`);
                    continue; // Go to the next endpoint
                }
                throw new Error(`Request to ${url} failed with status: ${response.status}`);
            }
            const rawData = await response.json();
            console.log(`Successfully fetched models from ${url}`);
            return parseAndFilterModels(rawData);
        } catch (error) {
            const isLastAttempt = endpoints.indexOf(url) === endpoints.length - 1;
            if (isLastAttempt) {
                console.error('Error fetching text models from all endpoints:', error);
            } else {
                console.warn(`Failed to fetch from ${url}, trying next. Error:`, error);
            }
        }
    }

    // If all fetch attempts fail, fall back to default list
    console.warn('Falling back to default text models list due to API errors.');
    const fallbackModels = ["openai-fast", "zephyr-7b-beta", "openhermes-2.5-mistral-7b"].sort();
    const fallbackStatuses: ModelStatusMap = {};
    fallbackModels.forEach(m => fallbackStatuses[m] = 'unchecked');
    return { models: fallbackModels, statuses: fallbackStatuses };
};


export const fetchImageModels = async (): Promise<string[]> => {
    const targetUrl = `${API_BASE_IMAGE}/models`;
    const fallbackModels = ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo', 'sdxl', 'dall-e-3'];

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image models with status: ${response.status}`);
        }
        const rawData = await response.json();
        
        let models: string[] = [];

        if (typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
            models = Object.keys(rawData);
        } else if (Array.isArray(rawData) && rawData.every(item => typeof item === 'string')) {
            models = rawData;
        } else {
            throw new Error('Unexpected format for image models.');
        }

        if (models.length > 0) {
            // Merge fetched models with fallbacks, removing duplicates, and sort.
            const combinedModels = [...new Set([...models, ...fallbackModels])];
            return combinedModels.sort();
        }
        
        // If API returns empty list, still use fallback.
        throw new Error('Parsed image models list is empty.');

    } catch (error) {
        console.error('Error fetching image models:', error);
        console.warn('Falling back to default image models list due to error.');
        return fallbackModels.sort();
    }
};

const prepareChatHistoryForApi = (messages: Omit<Message, 'id' | 'isFavorited'>[], systemInstruction?: string) => {
    // Create a new array containing only the messages that should be sent to the API.
    const safeMessages: Omit<Message, 'id' | 'isFavorited'>[] = [];
    for (let i = 0; i < messages.length; i++) {
        const currentMessage = messages[i];
        
        // Look ahead to the next message to see if it's a bot error.
        const nextMessage = (i + 1 < messages.length) ? messages[i+1] : null;

        // Condition to skip the current user message:
        // 1. It's a user message.
        // 2. It's immediately followed by a bot error message.
        const shouldSkipUserMessage = currentMessage.role === 'user' && nextMessage?.role === 'bot' && nextMessage?.type === 'error';

        // Also skip any message that is an error itself.
        if (currentMessage.type === 'error' || shouldSkipUserMessage) {
            continue;
        }

        safeMessages.push(currentMessage);
    }
    
    // 1. Filter for valid text messages from the *sanitized* list
    const textMessages = safeMessages
        .filter(m => m.type === 'text' && typeof m.content === 'string' && m.content.trim() !== '');

    if (textMessages.length === 0) {
        return [];
    }
    
    type ApiMessage = { role: 'user' | 'assistant' | 'system', content: string };
    const apiMessages: ApiMessage[] = [];

    if(systemInstruction) {
        apiMessages.push({ role: 'system', content: systemInstruction });
    }

    // 2. Merge consecutive messages from the same role to prevent API errors
    for (const msg of textMessages) {
        const role = msg.role === 'bot' ? 'assistant' : 'user';
        const content = msg.content as string;
        
        const lastApiMessage = apiMessages.length > 0 ? apiMessages[apiMessages.length - 1] : null;

        if (lastApiMessage && lastApiMessage.role === role) {
            lastApiMessage.content += `\n\n${content}`;
        } else {
            apiMessages.push({ role, content });
        }
    }
    return apiMessages;
}


export const generateText = async (messages: Omit<Message, 'id' | 'isFavorited'>[], model: string, systemInstruction?: string, signal?: AbortSignal): Promise<string> => {
    try {
        const modelIsChat = isChatModel(model);
        const url = modelIsChat ? `${API_BASE_TEXT}/openai` : `${API_BASE_TEXT}/`;

        let body;
        if (modelIsChat) {
            const chatHistory = prepareChatHistoryForApi(messages, systemInstruction);
            if (chatHistory.length === 0) {
                 throw new Error('Cannot generate text from empty prompt for chat model.');
            }
            body = { model, messages: chatHistory };
        } else {
            const lastMessage = messages.filter(m => m.type === 'text' && typeof m.content === 'string').pop();
            const prompt = lastMessage?.content;
            if (!prompt) throw new Error('Cannot generate text from empty prompt for non-chat model.');
            body = { prompt, model };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal 
        });

        const responseBody = await response.text();

        // If the request was not successful, analyze the error.
        if (!response.ok) {
            const lowerResponseBody = responseBody.toLowerCase();
            const premiumKeywords = ['premium', 'payment required', 'higher tier', 'subscription', 'upgrade', 'subscribe', 'paid plan', 'purchase', 'unlock', 'credits required', 'requires payment', 'grok', 'insufficient_quota', 'payment_required'];
            
            if (premiumKeywords.some(keyword => lowerResponseBody.includes(keyword))) {
                 // We've detected a payment-related issue. Throw a clear, user-friendly error.
                 throw new Error('This model requires a premium plan. Please select another model in the settings.');
            }

            // If it wasn't a premium error, construct a general error message.
            let errorMessage = `The model "${model}" failed with status ${response.status}.`;
            try {
                // Attempt to parse a more detailed error message from the JSON body.
                const errorJson = JSON.parse(responseBody);
                if (errorJson.error) {
                    const errorDetail = typeof errorJson.error === 'object' 
                        ? (errorJson.error.message || JSON.stringify(errorJson.error)) 
                        : errorJson.error.toString();
                    errorMessage = `Error from model "${model}": ${errorDetail}`;
                } else if (responseBody) {
                    errorMessage += ` Details: ${responseBody}`;
                }
            } catch (e) {
                // If parsing fails, just append the raw response body.
                if (responseBody) {
                    errorMessage += ` Details: ${responseBody}`;
                }
            }
            throw new Error(errorMessage);
        }
        
        // If we reach here, the response is OK. Proceed with parsing the successful response.
        try {
            const parsed = JSON.parse(responseBody);
            if (modelIsChat && parsed.choices && parsed.choices[0]?.message?.content) {
                return parsed.choices[0].message.content;
            }
            const textOutput = parsed.output || parsed.text || parsed.content || parsed.completion || parsed.response;
            if (textOutput && typeof textOutput === 'string') {
                return textOutput;
            }
        } catch(e) { /* Not JSON, fall through to return raw text */ }

        const trimmedResponse = responseBody.trim();
        if (!trimmedResponse || ['{}', '""', '[]', 'null'].includes(trimmedResponse)) {
            throw new Error('Model returned empty or invalid response.');
        }

        return trimmedResponse;

    } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('Text generation aborted.');
          throw error;
        }
        throw error;
    }
};

export async function* generateTextStream(messages: Omit<Message, 'id' | 'isFavorited'>[], model: string, systemInstruction?: string, signal?: AbortSignal): AsyncGenerator<string> {
    const modelIsChat = isChatModel(model);
    const url = modelIsChat ? `${API_BASE_TEXT}/openai` : `${API_BASE_TEXT}/`;
    let response;

    let body;
    if (modelIsChat) {
        const chatHistory = prepareChatHistoryForApi(messages, systemInstruction);
        if (chatHistory.length === 0) {
            yield ""; 
            return;
        }
        body = { model, messages: chatHistory, stream: true };
    } else {
        const lastMessage = messages.filter(m => m.type === 'text' && typeof m.content === 'string').pop();
        const prompt = lastMessage?.content;
        if (!prompt) {
            yield ""; 
            return;
        }
        body = { prompt, model, stream: true };
    }

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal
        });
    } catch (e) {
        console.warn('Network error on stream attempt. Falling back to non-streaming.', e);
        yield await generateText(messages, model, systemInstruction, signal);
        return;
    }
    
    if (!response.ok) {
        // Fallback to non-streaming function which will handle the error (including premium check) correctly.
        console.warn(`Streaming request failed with status ${response.status}. Falling back to non-streaming for detailed error.`);
        yield await generateText(messages, model, systemInstruction, signal);
        return;
    }

    if (!response.body) {
        console.warn(`Streaming response had no body. Falling back to non-streaming.`);
        yield await generateText(messages, model, systemInstruction, signal);
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processLine = (line: string): string | null => {
        const dataLine = line.startsWith('data:') ? line.substring(5).trim() : line.trim();
        if (!dataLine || dataLine === '[DONE]') {
            return null;
        }

        try {
            const parsed = JSON.parse(dataLine);
            if (parsed.error) {
                const errorDetail = typeof parsed.error === 'object' ? (parsed.error.message || JSON.stringify(parsed.error)) : parsed.error;
                throw new Error(`Error from model during stream: ${errorDetail}`);
            }
            
            if (modelIsChat) {
                const content = parsed.choices?.[0]?.delta?.content;
                if (typeof content === 'string' && content.length > 0) {
                    return content;
                }
                return null;
            }

            const chunk = parsed.output || parsed.text || parsed.content || parsed.completion || parsed.response;
            if (typeof chunk === 'string') {
                return chunk;
            }
            
            return null;
        } catch (e) {
             if (e instanceof Error) {
                // re-throw errors from explicit error throwing
                throw e;
            }
            // If it's not a JSON line, it could be a raw text chunk from a non-streaming fallback
            return dataLine;
        }
    };

    while (true) {
        if (signal?.aborted) {
            reader.cancel();
            throw new Error('Text generation aborted.');
        }

        const { done, value } = await reader.read();
        if (value) {
            buffer += decoder.decode(value, { stream: true });
        }

        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
            const chunk = processLine(line);
            if (chunk) {
                yield chunk;
            }
        }
        
        if (done) {
            if (buffer) {
                const chunk = processLine(buffer);
                if (chunk) yield chunk;
            }
            break;
        }
    }
}

interface ImageUrlOptions {
    model: string;
    safe: boolean;
    sourceImageUrl?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    seed?: number;
}

export const getImageUrl = (prompt: string, options: ImageUrlOptions): string => {
  const { model, safe, sourceImageUrl, aspectRatio, negativePrompt, seed } = options;
  const safeParam = safe ? '' : '&safe=false';
  let width = 512;
  let height = 512;
  
  if (aspectRatio) {
      const parts = aspectRatio.split(':');
      if (parts.length === 2) {
          const w = parseInt(parts[0], 10);
          const h = parseInt(parts[1], 10);
          if (!isNaN(w) && !isNaN(h)) {
              // Normalize to a base size, e.g., 1024 on the longest side
              const baseSize = 1024;
              if (w > h) {
                  width = baseSize;
                  height = Math.round((baseSize * h) / w);
              } else {
                  height = baseSize;
                  width = Math.round((baseSize * w) / h);
              }
              // Ensure dimensions are multiples of 8 for stability
              width = Math.round(width / 8) * 8;
              height = Math.round(height / 8) * 8;
          }
      }
  }

  const seedParam = seed ?? Math.floor(Math.random() * 1000000);
  let url = `${API_BASE_IMAGE_DIRECT}/prompt/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=${width}&height=${height}${safeParam}&seed=${seedParam}&nologo=true`;
  
  if (sourceImageUrl) {
     url += `&image=${encodeURIComponent(sourceImageUrl)}`;
  }

  if (negativePrompt) {
      url += `&negative_prompt=${encodeURIComponent(negativePrompt)}`;
  }

  return url;
};

export const refineImagePrompt = async (originalPrompt: string, modificationRequest: string, signal?: AbortSignal): Promise<string> => {
    const systemInstruction = `You are a creative image prompt assistant. The user created an image with an original prompt and now has a modification request. Combine the original prompt and the modification request into a single, new, cohesive, and descriptive prompt for an image generation AI. The new prompt must be a complete idea that stands on its own. Only output the final prompt itself, with no extra conversational text, labels, or quotation marks.`;
    
    const userContent = `The user had an image created with this prompt:\n"${originalPrompt}"\n\nNow, the user wants to change it with this request:\n"${modificationRequest}"\n\nCreate a new, single, complete image prompt that merges the original idea with the modification. Do not ask questions. Only output the new prompt.`;

    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: userContent }
    ];

    try {
        // Use a fast and capable model for this task.
        const response = await generateText(messages, 'openai-fast', systemInstruction, signal);
        // Clean up the response, removing potential quotes or markdown.
        return cleanPrompt(response);
    } catch (error) {
        // Re-throw abort so the caller knows it was cancelled.
        if ((error as Error).name === 'AbortError') {
            throw error;
        }
        
        console.error('Failed to refine image prompt:', error);
        // Fallback: just append the modification if AI fails. This prevents the user from seeing an error.
        return `${originalPrompt}, ${modificationRequest}`;
    }
};

const cleanPrompt = (text: string) => {
    // This regex now cleans the prompt of any leading commands and any --argument style flags.
    return text.trim()
        .replace(/^"|"$/g, '')
        .replace(/^(prompt:|new prompt:|enhanced prompt:|generate:|draw:|create:)/i, '')
        .replace(/\s--\w+\s+("([^"]*)"|'([^']*)'|(\S+))/g, '')
        .trim();
}

export const enhanceImagePrompt = async (prompt: string, signal?: AbortSignal): Promise<string> => {
    if (!prompt || !prompt.trim()) {
        throw new Error("Prompt cannot be empty.");
    }
    const systemInstruction = `You are an expert prompt engineer for a generative AI. Your task is to take a user's prompt and enhance it into a masterpiece. Make it more vivid, detailed, and imaginative. Add descriptive adjectives, specify the art style (e.g., photorealistic, oil painting, vector art), lighting (e.g., cinematic lighting, composition (e.g., rule of thirds, dynamic angle), and camera details (e.g., lens type, aperture). Do not just add keywords; weave them into a coherent, descriptive paragraph. Only output the final enhanced prompt, with no extra conversational text, labels, or quotation marks.`;
    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: prompt }
    ];

    try {
        const response = await generateText(messages, 'openai-fast', systemInstruction, signal);
        return cleanPrompt(response);
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Failed to enhance image prompt:', error);
            return prompt; // Fallback to original prompt on error
        }
        throw error;
    }
};

export const getRandomImagePrompt = async (signal?: AbortSignal): Promise<string> => {
    const systemInstruction = `You are a creative muse. Generate a single, highly detailed, and inspiring image generation prompt. The prompt should describe a unique concept, a fantastical scene, or a striking character. Think outside the box. Only output the prompt itself, with no extra conversational text, labels, or quotation marks.`;
    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: 'Give me a random, creative image prompt.' }
    ];

    try {
        const response = await generateText(messages, 'openai-fast', systemInstruction, signal);
        return cleanPrompt(response);
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Failed to get random prompt:', error);
        }
        // Fallback prompt
        return "An astronaut jellyfish floating through a nebula, cinematic lighting, detailed, 4k";
    }
};

export const extractPotentialImagePrompt = (text: string): string | null => {
    // Regex to find content within double quotes, single quotes, or double asterisks (bold).
    // It captures the content inside these delimiters.
    const patterns = [
      /"([^"]+)"/,       // Content inside double quotes
      /'([^']+)'/,       // Content inside single quotes
      /\*\*([^*]+)\*\*/, // Content inside double asterisks
    ];
  
    for (const pattern of patterns) {
      const match = text.match(pattern);
      // match[1] is the captured group
      if (match && match[1]) {
        const potentialPrompt = match[1].trim();
        // Basic validation to avoid matching empty strings or very short, non-descriptive text.
        if (potentialPrompt.length > 5 && potentialPrompt.split(' ').length > 2) {
          return potentialPrompt;
        }
      }
    }
  
    return null;
};


export const generateTheme = async (themeIdea: string, model: string, variationNumber: number, signal?: AbortSignal): Promise<GeneratedTheme> => {
    const systemInstruction = `You are an expert UI theme designer who responds only in JSON.
Based on the user's idea, generate a unique theme. This is one of several variations (e.g., variation ${variationNumber}/4), so make it visually distinct from other potential interpretations.

YOUR ENTIRE RESPONSE MUST BE A SINGLE, RAW, VALID JSON OBJECT.
Do not include markdown, comments, or any text outside the JSON structure.
The JSON object MUST have these exact top-level keys: "name", "colors", "userDpIdea", "wallpaperIdea".

The "colors" object MUST contain these exact 14 keys, with valid hex color codes as string values:
- "--color-background"
- "--color-surface"
- "--color-surface-variant"
- "--color-primary"
- "--color-primary-container"
- "--color-secondary"
- "--color-outline"
- "--color-on-background"
- "--color-on-surface"
- "--color-on-surface-variant"
- "--color-on-primary"
- "--color-on-primary-container"
- "--color-on-secondary"
- "--color-shadow"

DESIGN RULES:
- The color palette MUST be accessible and high-contrast.
- "userDpIdea" must be a creative, detailed prompt for a square profile picture.
- "wallpaperIdea" must be a creative, detailed prompt for a vertical (9:16) mobile wallpaper.`;
    
    const fullUserContent = `User's theme idea: "${themeIdea}"`;

    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: fullUserContent }
    ];

    try {
        const responseText = await generateText(messages, model, systemInstruction, signal);
        
        // Use a regex to find the JSON object, robust against leading/trailing text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch || !jsonMatch[0]) {
            throw new Error("AI response did not contain a valid JSON object.");
        }
        
        const jsonString = jsonMatch[0];
        return JSON.parse(jsonString);

    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Failed to generate or parse theme:', error);
            throw error;
        }
        throw error;
    }
};

export const checkModelStatus = async (model: string, signal: AbortSignal): Promise<'available' | 'unavailable'> => {
  try {
      // Use a very simple, non-controversial prompt
      const messages = [{ role: 'user' as const, type: 'text' as const, content: 'hi' }];
      await generateText(messages, model, undefined, signal);
      // If the above line doesn't throw, the model is available.
      return 'available';
  } catch (error) {
      // Any error (timeout, network, API error) means it's unavailable for our purposes.
      return 'unavailable';
  }
};

export const checkImageModelStatus = async (model: string, signal: AbortSignal): Promise<'available' | 'unavailable'> => {
  // Known reliable and fast models that sometimes fail HEAD checks. By whitelisting them,
  // we ensure a better user experience for the most popular models.
  const whitelistedModels = ['turbo', 'flux', 'flux-realism', 'flux-anime', 'flux-3d', 'sdxl', 'dall-e-3'];
  if (whitelistedModels.includes(model)) {
    return 'available';
  }

  try {
    const testUrl = getImageUrl('test', { model, safe: true });
    // Use a HEAD request for efficiency as we only need to check if the resource exists and is an image.
    const response = await fetch(testUrl, { signal, method: 'HEAD' });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        return 'available';
      }
    }
    return 'unavailable';
  } catch (error) {
    // Network errors, timeouts, etc., all mean the model is not usable.
    return 'unavailable';
  }
};

export const generateCharacterDescription = async (premise: string, model: string, signal?: AbortSignal): Promise<string> => {
    const systemInstruction = `You are a master character designer. Based on the user's story premise, create a single, compelling main character.
Provide a detailed yet concise physical description (e.g., appearance, clothing, unique features) that can be used to generate consistent images of them.
Focus only on the visual description. Do not describe their personality or background.
Your output MUST be only the character description string, with no extra conversational text, labels, or quotation marks.`;
    
    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: `Story Premise: "${premise}"` }
    ];

    try {
        const response = await generateText(messages, model, systemInstruction, signal);
        return response.trim();
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Failed to generate character description:', error);
        }
        // Fallback description
        return "A mysterious figure in a long coat, face hidden in shadows.";
    }
}


export async function generateStoryContinuation(
    premise: string, 
    history: StoryBeat[], 
    continuationPrompt: string, 
    model: string, 
    characterDescription: string,
    signal?: AbortSignal
): Promise<StoryContinuation[]> {
    let systemInstruction = `You are an elite storyteller and a master visual artist. Your task is to continue a story, generating a storyboard of multiple scenes.

**CRITICAL: YOUR OUTPUT MUST BE A SINGLE, RAW, VALID JSON ARRAY AND NOTHING ELSE.**
- The entire response MUST start with \`[\` and end with \`]\`.
- Do not use markdown, comments, or any text outside the JSON structure.
- Each object in the array represents one scene.
- **NO TRAILING COMMAS:** The VERY LAST object must NOT have a comma after its closing brace \`}\`.
- All strings must be in double quotes. Escape any double quotes within strings (e.g., "a robot in a \\"bubble\\"").
- If for any reason you cannot generate scenes, your entire response must be an empty array: \`[]\`. Do not explain why.

Each JSON object MUST have these two keys:
1. "storyText": A concise, cinematic paragraph (2-4 sentences, max 50 words) advancing the plot.
2. "imagePrompt": A hyper-detailed and vivid image generation prompt. This is critical. Describe character appearance, actions, environment, lighting (e.g., "cinematic lighting"), camera angle (e.g., "low-angle shot"), and art style (e.g., "photorealistic, 8k").

**JSON FORMAT EXAMPLE TO FOLLOW EXACTLY:**
\`\`\`json
[
  {
    "storyText": "The detective stared at the rain-streaked window, neon signs reflecting in his tired eyes. Another case, another dead end.",
    "imagePrompt": "Photorealistic, close-up shot of a weary detective looking through a rain-streaked window at night. His face is illuminated by the shifting colors of neon signs from a futuristic city. Cinematic lighting, rule of thirds, 8k, hyperdetailed."
  },
  {
    "storyText": "Suddenly, a faint shimmer in a puddle below caught his attention. It wasn't a reflection. It was a clue.",
    "imagePrompt": "Low-angle shot of a mysterious, shimmering object glowing at the bottom of a puddle on a dark, wet asphalt street. The reflection of neon signs is distorted by ripples. Moody, noir atmosphere, detailed, 4k."
  }
]
\`\`\`

**STORY CONTEXT:**
- Maintain character descriptions, plot points, and tone from the STORY HISTORY.
- **Generate between 5 and 10 new scenes** to create a substantial continuation of the story based on the user's direction.`;

    if (characterDescription) {
        systemInstruction += `\n\n**CHARACTER CONTINUITY (ABSOLUTE REQUIREMENT):** The main character has a specific look. You MUST incorporate the following details into every single "imagePrompt" you generate to maintain visual consistency: "${characterDescription}"`;
    }

    systemInstruction += "\n\nNow, follow the user's direction and generate the JSON array.";

    let fullUserContent = ``;
    // Filter out temporary loading beats from history before sending to AI
    const filteredHistory = history.filter(beat => !beat.id.startsWith('temp-'));

    if (filteredHistory.length > 0) {
        fullUserContent += "STORY HISTORY SO FAR (use this for context and to maintain consistency):\n";
        const recentHistory = filteredHistory.slice(-5); // Use last 5 beats for context
        recentHistory.forEach((beat, i) => {
            const sceneNumber = filteredHistory.length - recentHistory.length + i + 1;
            fullUserContent += `Scene ${sceneNumber}: ${beat.storyText}\n`;
        });
        fullUserContent += "\n";
    } else {
        fullUserContent += `STORY PREMISE: "${premise}"\n\n`;
    }
    
    fullUserContent += `USER'S DIRECTION FOR WHAT HAPPENS NEXT: "${continuationPrompt}"\n\nGenerate the next scenes as a single JSON array.`;

    const messages: Omit<Message, 'id' | 'isFavorited'>[] = [
        { role: 'user', type: 'text', content: fullUserContent }
    ];

    try {
        const responseText = await generateText(messages, model, systemInstruction, signal);

        // Use a regex to find the JSON array, robust against leading/trailing text and markdown
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch || !jsonMatch[0]) {
            console.error("Story continuation response did not contain a JSON array. Response:", responseText);
            throw new Error("AI response did not contain a valid JSON array.");
        }
        
        const jsonString = jsonMatch[0];
        const parsedJson = JSON.parse(jsonString);

        if (!Array.isArray(parsedJson)) {
            throw new Error("Parsed response is not an array.");
        }
        
        // Gracefully handle if the model returns an empty array as instructed on failure
        if (parsedJson.length === 0) {
            return [];
        }

        const isValid = parsedJson.every(item => 
            typeof item === 'object' && item !== null && 'storyText' in item && 'imagePrompt' in item
        );

        if (!isValid) {
            throw new Error("Parsed array contains invalid objects for story continuation.");
        }

        return parsedJson as StoryContinuation[];
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Failed to generate or parse story continuation:', error);
             if (error instanceof SyntaxError) {
                 throw new Error(`Story generation failed: The AI returned a malformed response.`);
            }
            throw new Error(`Story generation failed: ${(error as Error).message}`);
        }
        throw error;
    }
}

const API_BASE_AUDIO = 'https://audio.pollinations.ai';

export const generateAudio = async (text: string, signal?: AbortSignal): Promise<string> => {
    const url = `${API_BASE_AUDIO}/speech?text=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
            throw new Error(`Audio generation failed with status: ${response.status}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            console.log('Audio generation aborted.');
        }
        throw error;
    }
};
