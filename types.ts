

export type MessageRole = 'user' | 'bot';
export type MessageType = 'text' | 'image' | 'loading' | 'error' | 'audio';

export interface ImageContent {
  urls: string[];
  config: ImageGenConfig;
}

export interface AudioContent {
  url: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string | ImageContent | AudioContent;
  isFavorited?: boolean;
  isGeneratingAudio?: boolean;
  audioUrl?: string;
}

export interface Persona {
  id: string;
  name: string;
  instruction: string;
  avatarUrl?: string;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: Message[];
  systemInstruction?: string;
  personaId?: string | null;
  timestamp: number;
}

export type RefineOption = 'shorter' | 'longer' | 'formal' | 'simple' | 'copy';

export type ModelStatus = 'unchecked' | 'checking' | 'available' | 'unavailable';
export type ModelStatusMap = Record<string, ModelStatus>;

export type Theme = 'light' | 'dark' | 'oceanic' | 'sunset' | 'monochrome';

export interface Settings {
  textModel: string;
  imageModel: string;
  theme: Theme;
  aiTheme: GeneratedTheme | null;
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
  timestamp: number;
}

export type NotificationType = 'success' | 'error' | 'info';
export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

export type PromptHelperStatus = 'idle' | 'enhancing' | 'gettingRandom' | 'refining';

export interface ThemeColors {
    '--color-background': string;
    '--color-surface': string;
    '--color-surface-variant': string;
    '--color-primary': string;
    '--color-primary-container': string;
    '--color-secondary': string;
    '--color-outline': string;
    '--color-on-background': string;
    '--color-on-surface': string;
    '--color-on-surface-variant': string;
    '--color-on-primary': string;
    '--color-on-primary-container': string;
    '--color-on-secondary': string;
    '--color-shadow': string;
}

export interface GeneratedTheme {
    name: string;
    colors: ThemeColors;
    userDpIdea: string;
    wallpaperIdea: string;
    userDpUrl?: string;
    wallpaperUrl?: string;
}

export interface StoryBeat {
  id: string;
  storyText: string;
  imageUrl: string;
  imagePrompt: string;
  userPrompt: string;
  isGenerating?: boolean;
  isFavorited?: boolean;
}

export interface StoryContinuation {
    storyText: string;
    imagePrompt: string;
}

export interface StorySession {
  id: string;
  title: string;
  premise: string;
  characterDescription: string;
  beats: StoryBeat[];
  timestamp: number;
}

export interface HistoryItem {
    id: string;
    title: string;
    type: ViewMode;
    timestamp: number;
}

// Unified Favorites (Inspiration Board)
export interface FavoriteImage {
    type: 'image';
    url: string;
    config: ImageGenConfig;
}

export interface FavoriteMessage {
    type: 'message';
    id: string;
    content: string;
    sessionId: string;
    sessionTitle: string;
    personaId?: string | null;
}

export interface FavoriteStoryBeat {
    type: 'story-beat';
    id: string;
    storyText: string;
    imageUrl: string;
    sessionId: string;
    sessionTitle: string;
}

export type FavoriteItem = FavoriteImage | FavoriteMessage | FavoriteStoryBeat;