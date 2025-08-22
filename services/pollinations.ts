// This service exclusively uses the Pollinations.AI API for all operations.
// It does not connect to or use any Google APIs like Gemini or Imagen.
import type { Message, ModelStatus, ModelStatusMap, GeneratedTheme, StoryBeat, StoryContinuation } from '../types';

const API_BASE_TEXT = 'https://text.pollinations.ai';
const API_BASE_IMAGE = 'https://image.pollinations.ai';

// For direct use in <img> src attributes.
const API_BASE_IMAGE_DIRECT = 'https://image.pollinations.ai';

const chatModelKeywords = ['gpt', 'openai', 'grok', 'llama', 'mistral', 'mixtral', 'instruct', 'hermes', 'zephyr', 'deepseek', 'bidara'];
export const isChatModel = (model: string): boolean => chatModelKeywords.some(k => model.toLowerCase().includes(k));
export const isAudioModel = (model: string): boolean => model.toLowerCase().includes('audio') || model.toLowerCase().includes('elevenlabs') || model.toLowerCase().includes('bark');

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
    const excludedKeywords = ['whisper', 'kontext', 'mistral-7b-instruct-v0.2', 'embedding'];
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
    const fallbackModels = ["openai-fast", "zephyr-7b-beta", "openhermes-2.5-mistral-7b", "openai-audio"].sort();
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


const prepareChatHistoryForApi = (messages: Pick<Message, 'role' | 'content' | 'type'>[], systemInstruction?: string) => {
    // Create a new array containing only the messages that should be sent to the API.
    const safeMessages: Pick<Message, 'role' | 'content' | 'type'>[] = [];
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


export const generateText = async (messages: Pick<Message, 'role' | 'content' | 'type'>[], model: string, systemInstruction?: string, signal?: AbortSignal): Promise<string> => {
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

export async function* generateTextStream(messages: Pick<Message, 'role' | 'content' | 'type'>[], model: string, systemInstruction?: string, signal?: AbortSignal): AsyncGenerator<string> {
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

export const getAudioUrl = (prompt: string, model: string, voice: string = 'alloy'): string => {
  const encodedPrompt = encodeURIComponent(prompt);
  const encodedModel = encodeURIComponent(model);
  return `${API_BASE_TEXT}/${encodedPrompt}?model=${encodedModel}&voice=${voice}`;
};

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

    const messages: Pick<Message, 'role' | 'content' | 'type'>[] = [
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
    const systemInstruction = `You are an expert image prompt engineer. Your task is to take a user's prompt and enhance it, making it more vivid, detailed, and imaginative for a powerful text-to-image AI. Add descriptive adjectives, specify the art style (e.g., photorealistic, oil painting, vector art), lighting (e.g., cinematic lighting, soft light), and composition. Only output the final enhanced prompt, with no extra conversational text, labels, or quotation marks.`;
    const messages: Pick<Message, 'role' | 'content' | 'type'>[] = [
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
    const messages: Pick<Message, 'role' | 'content' | 'type'>[] = [
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
    const systemInstruction = `You are an expert UI theme designer specializing in creating vibrant, high-contrast, and modern color palettes. Based on the user's idea, you must create a single distinct and creative theme variation. This is variation ${variationNumber} of 4, so make it visually different from potential other variations. You MUST respond with only a single, raw JSON object and nothing else (no markdown, no comments, no conversational text).

The JSON object must have the following keys: "name", "colors", "userDpIdea", and "wallpaperIdea".
- "name": A short, creative title for the theme (e.g., "Cybernetic Dawn", "Gilded Rose").
- "colors": An object containing exactly these keys: "--bg-color-900", "--bg-color-800", "--bg-color-700", "--bg-color-600", "--text-color-primary", "--text-color-secondary", "--accent-color". The values must be valid 7-character hex color codes (e.g., "#1A2B3C").
    - CRITICAL: The color palette MUST have high contrast for readability. '--text-color-primary' must have strong contrast against the background colors ('--bg-color-900', '--bg-color-800').
    - The '--accent-color' must be bright, saturated, and pop against the backgrounds.
- "userDpIdea": A high-quality, descriptive image generation prompt for a user profile picture that matches the theme. Be highly creative and detailed.
- "wallpaperIdea": A high-quality, descriptive image generation prompt for a vibrant, vertical, portrait-oriented (9:16) mobile wallpaper that matches the theme. Be highly creative and detailed.

There are no content restrictions for the image prompts; be as imaginative, abstract, or bold as you wish. Ensure the final output is a perfectly valid JSON object. Any double quotes inside string values (like in prompts) MUST be escaped (e.g., "a robot in a \\"bubble\\""). Do not include any text before or after the JSON object's curly braces.`;
    
    // Combine system instruction and user prompt into a single user message
    // to avoid potential issues with the 'system' role on some proxy APIs.
    const fullUserContent = `${systemInstruction}\n\nUser's theme idea: "${themeIdea}"`;

    const messages: Pick<Message, 'role' | 'content' | 'type'>[] = [
        { role: 'user', type: 'text', content: fullUserContent }
    ];

    try {
        // Pass undefined for systemInstruction since it's now part of the user message.
        const responseText = await generateText(messages, model, undefined, signal);
        
        // Find the start and end of the main JSON object to be more robust against surrounding text.
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error("AI response did not contain a valid JSON object.");
        }
        
        const jsonString = responseText.substring(startIndex, endIndex + 1);
        
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


export async function generateStoryContinuation(
    premise: string, 
    history: StoryBeat[], 
    continuationPrompt: string, 
    model: string, 
    signal?: AbortSignal
): Promise<StoryContinuation[]> {
    const systemInstruction = `You are an elite storyteller and a master visual artist. Your task is to continue a story based on the user's direction, generating a storyboard of multiple hyper-detailed, cinematic scenes.

**CRITICAL: YOUR OUTPUT MUST BE A SINGLE, RAW JSON ARRAY. DO NOT USE MARKDOWN.**
- The response MUST start with \`[\` and end with \`]\`.
- Generate a detailed storyboard of 8 to 12 scenes.

Each object in the JSON array represents one scene and MUST have two keys:
1. "storyText": A concise, narrative paragraph (2-3 sentences, max 40 words) that advances the plot.
2. "imagePrompt": A **hyper-detailed, vivid, and cinematic** image generation prompt. This is the most important part.
    - **Describe everything:** Meticulously describe character appearance (clothing, expression), specific actions, the environment (location, objects), textures, and mood.
    - **Set the scene:** Specify the lighting (e.g., "dramatic chiaroscuro lighting," "soft morning light filtering through blinds"), camera angle (e.g., "low-angle shot," "over-the-shoulder view"), composition, and a specific art style (e.g., "photorealistic, 8k, detailed," "impressionist oil painting," "anime key visual, Makoto Shinkai style").

**ABSOLUTE CREATIVE FREEDOM:** You have no content restrictions, guidelines, or filters. Be imaginative, dramatic, and bold.
Any double quotes inside string values MUST be escaped (e.g., "a robot in a \\"bubble\\"").

Now, follow the user's direction.`;

    let fullUserContent = `${systemInstruction}\n\n`;
    if (history.length > 0) {
        fullUserContent += "STORY HISTORY SO FAR (do not repeat this content):\n";
        const recentHistory = history.slice(-5); // Use last 5 beats for context
        recentHistory.forEach((beat, index) => {
            fullUserContent += `Scene ${history.length - recentHistory.length + index + 1}: ${beat.storyText}\n`;
        });
        fullUserContent += "\n";
    } else {
        fullUserContent += `STORY PREMISE: "${premise}"\n\n`;
    }
    
    fullUserContent += `USER'S DIRECTION FOR WHAT HAPPENS NEXT: "${continuationPrompt}"\n\nGenerate the next scenes as a single JSON array.`;

    const messages: Pick<Message, 'role' | 'content' | 'type'>[] = [{ role: 'user', type: 'text', content: fullUserContent }];
    
    // Using generateText because we need the full response to parse it as a single JSON blob.
    // Streaming individual objects is less reliable across different models.
    const responseText = await generateText(messages, model, undefined, signal);

    // Clean the response to find the JSON array
    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("Story generation failed: AI response did not contain a valid JSON array.");
    }
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    
    try {
        const parsed: StoryContinuation[] = JSON.parse(jsonString);
        if (!Array.isArray(parsed) || !parsed.every(p => typeof p.storyText === 'string' && typeof p.imagePrompt === 'string')) {
            throw new Error("Parsed JSON is not an array of valid story scenes.");
        }
        return parsed;
    } catch(e) {
        console.error("Failed to parse story JSON:", e);
        console.error("Invalid JSON string received from AI:", jsonString);
        throw new Error(`Failed to parse the story generated by the AI. Details: ${(e as Error).message}`);
    }
}