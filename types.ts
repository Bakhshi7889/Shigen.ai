
export type MessageRole = 'user' | 'bot';
export type MessageType = 'text' | 'image' | 'loading' | 'error' | 'audio';

export interface ImageContent {
  urls: string[];
  config: ImageGenConfig;
}

export interface AudioContent {
  url: string;
  prompt: string;
  model: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string | ImageContent | AudioContent;
  isFavorited?: boolean;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: Message[];
  systemInstruction?: string;
}

export type RefineOption = 'shorter' | 'longer' | 'formal' | 'simple';

export type ModelStatus = 'unchecked' | 'checking' | 'available' | 'unavailable';
export type ModelStatusMap = Record<string, ModelStatus>;

export type Theme = 'shigen' | 'light' | 'rose-gold' | 'ocean-deep';

export interface Settings {
  textModel: string;
  imageModel: string;
  audioModel: string;
  audioVoice: string;
  theme: Theme;
}

export type ViewMode = 'chat' | 'image-generator' | 'story';

export interface ImageGenConfig {
    prompt: string;
    model: string;
    aspectRatio: string;
    negativePrompt: string;
    numImages: number;
    seed?: number;
    sourceImageUrl?: string;
}

export interface ViewerImage {
    url: string;
    config: ImageGenConfig;
}

export interface ImageGeneration {
    id: string;
    config: ImageGenConfig;
    imageContent: ImageContent;
    timestamp: number;
}

export interface ImageSession {
  id: string;
  title: string;
  generations: ImageGeneration[];
}

export interface FavoriteImage {
    url: string;
    config: ImageGenConfig;
}

export type NotificationType = 'success' | 'error' | 'info';
export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

export type PromptHelperStatus = 'idle' | 'enhancing' | 'gettingRandom' | 'refining';

export interface ThemeColors {
    '--bg-color-900': string;
    '--bg-color-800': string;
    '--bg-color-700': string;
    '--bg-color-600': string;
    '--text-color-primary': string;
    '--text-color-secondary': string;
    '--accent-color': string;
}

export interface GeneratedTheme {
    name: string;
    colors: ThemeColors;
    userDpIdea: string;
    wallpaperIdea: string;
    userDpUrl?: string;
    wallpaperUrl?: string;
}

// A single illustrated moment in the story.
export interface StoryBeat {
  id: string;
  storyText: string;
  imageUrl: string;
  imagePrompt: string;
  userPrompt: string; // The user's input that led to this beat
  isGenerating?: boolean; // A single flag for simplicity
}

// The data structure for a single piece of a streamed story continuation.
export interface StoryContinuation {
    storyText: string;
    imagePrompt: string;
}

// A full story session.
export interface StorySession {
  id: string;
  title: string;
  premise: string; // The initial idea for the story
  beats: StoryBeat[];
}
