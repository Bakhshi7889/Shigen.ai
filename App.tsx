

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MenuSheet from './components/Sidebar'; 
import ChatView from './components/ChatView';
import ImageGeneratorView from './components/ImageGeneratorView';
import StoryView from './components/StoryView';
import SettingsModal from './components/SettingsModal';
import ChatSettingsModal from './components/ChatSettingsModal';
import PersonaManagerModal from './components/PersonaManagerModal';
import ImageFeed from './components/ImageFeed';
import TextFeed from './components/TextFeed';
import ImageViewerModal from './components/ImageViewerModal';
import FavoritesViewModal from './components/FavoritesViewModal';
import NotificationManager from './components/NotificationManager';
import ThemeGeneratorModal from './components/ThemeGeneratorModal';
import IosInstallBanner from './components/IosInstallBanner';
import useLocalStorage from './hooks/useLocalStorage';
import useOnlineStatus from './hooks/useOnlineStatus';
import { 
    fetchTextModels, fetchImageModels, generateTextStream, getImageUrl, 
    refineImagePrompt, isImageGenRequest, generateText,
    checkModelStatus, checkImageModelStatus, generateStoryContinuation, generateCharacterDescription, generateAudio
} from './services/pollinations';
import type { 
    ChatSession, Settings, Message, ModelStatusMap, ImageContent, Persona,
    ViewMode, ImageGenConfig, ImageGeneration, FavoriteImage, Notification, 
    ViewerImage, ImageSession, RefineOption, GeneratedTheme, StorySession, StoryBeat, 
    HistoryItem, Theme, FavoriteItem, FavoriteMessage, FavoriteStoryBeat
} from './types';
import { triggerHapticFeedback } from './lib/haptics';
import ChatBubbleIcon from './components/icons/ChatBubbleIcon';
import ImageIcon from './components/icons/ImageIcon';
import BookOpenIcon from './components/icons/BookOpenIcon';
import MenuIcon from './components/icons/MenuIcon';

type InstallStatus = 'unsupported' | 'available' | 'installed' | 'ios';

const BottomNavBar: React.FC<{
    activeView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    onMenuClick: () => void;
}> = ({ activeView, onViewChange, onMenuClick }) => {
    const navItems = [
        { view: 'chat' as ViewMode, icon: <ChatBubbleIcon className="w-6 h-6"/>, label: "Chat" },
        { view: 'image-generator' as ViewMode, icon: <ImageIcon className="w-6 h-6"/>, label: "Images" },
        { view: 'story' as ViewMode, icon: <BookOpenIcon className="w-6 h-6"/>, label: "Story" },
    ];
    return (
        <nav className="flex-shrink-0 w-full bg-surface/80 backdrop-blur-md border-t border-outline shadow-strong z-20">
            <div className="flex justify-around items-center h-20 max-w-md mx-auto">
                {navItems.map(item => {
                    const isActive = activeView === item.view;
                    return (
                        <button key={item.view} onClick={() => onViewChange(item.view)} className="flex flex-col items-center justify-center w-20 h-full text-on-surface-variant transition-colors duration-200">
                           <div className={`flex items-center justify-center p-3 rounded-full transition-all duration-300 ${isActive ? 'bg-primary-container text-on-primary-container scale-110' : ''}`}>
                                {item.icon}
                           </div>
                           <span className={`text-xs font-semibold mt-1 transition-colors ${isActive ? 'text-on-surface' : ''}`}>{item.label}</span>
                        </button>
                    )
                })}
                 <button onClick={onMenuClick} className="flex flex-col items-center justify-center w-20 h-full text-on-surface-variant transition-colors duration-200">
                   <div className="flex items-center justify-center p-3 rounded-full">
                        <MenuIcon className="w-6 h-6"/>
                   </div>
                   <span className="text-xs font-semibold mt-1">Menu</span>
                </button>
            </div>
        </nav>
    )
}

const App: React.FC = () => {
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('shigen-view-mode-v4', 'chat');
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isChatSettingsOpen, setChatSettingsOpen] = useState(false);
    const [isPersonaManagerOpen, setPersonaManagerOpen] = useState(false);
    const [isImageFeedOpen, setImageFeedOpen] = useState(false);
    const [isTextFeedOpen, setTextFeedOpen] = useState(false);
    const [isFavoritesOpen, setFavoritesOpen] = useState(false);
    const [isThemeGeneratorOpen, setThemeGeneratorOpen] = useState(false);
    
    const isOnline = useOnlineStatus();

    const [settings, setSettings] = useLocalStorage<Settings>('shigen-settings-v6', {
        textModel: 'openai-fast',
        imageModel: 'flux',
        theme: 'dark',
        aiTheme: null,
    });

    const [textModels, setTextModels] = useState<string[]>([]);
    const [imageModels, setImageModels] = useState<string[]>([]);
    const [modelStatus, setModelStatus] = useLocalStorage<ModelStatusMap>('shigen-model-status-v2', {});
    const [isCheckingModels, setIsCheckingModels] = useState(false);
    
    const [personas, setPersonas] = useLocalStorage<Persona[]>('shigen-personas-v1', []);
    const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>('shigen-chat-sessions-v3', []);
    const [activeChatId, setActiveChatId] = useLocalStorage<string | null>('shigen-active-chat-id-v3', null);
    
    const [imageSessions, setImageSessions] = useLocalStorage<ImageSession[]>('shigen-image-sessions-v3', []);
    const [activeImageSessionId, setActiveImageSessionId] = useLocalStorage<string | null>('shigen-active-image-session-id-v3', null);

    const [storySessions, setStorySessions] = useLocalStorage<StorySession[]>('shigen-story-sessions-v3', []);
    const [activeStorySessionId, setActiveStorySessionId] = useLocalStorage<string | null>('shigen-active-story-session-id-v3', null);
    
    const [isChatGenerating, setIsChatGenerating] = useState(false);
    const [isImageGenerating, setIsImageGenerating] = useState(false);
    const [isStoryGenerating, setIsStoryGenerating] = useState(false);
    
    const [pendingGeneration, setPendingGeneration] = useState<ImageGenConfig | null>(null);
    const [imageToModify, setImageToModify] = useState<ImageContent | null>(null);

    const [promptFromFeed, setPromptFromFeed] = useState<{ prompt: string, timestamp: number }>({ prompt: '', timestamp: 0 });
    
    const [favoritedImages, setFavoritedImages] = useLocalStorage<FavoriteImage[]>('shigen-favorited-images-v2', []);
    const [viewingImages, setViewingImages] = useState<{ images: ViewerImage[], startIndex: number } | null>(null);
    const [reEditRequest, setReEditRequest] = useState<ImageGenConfig | null>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showIosBanner, setShowIosBanner] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const [customUserDp, setCustomUserDp] = useLocalStorage<string | null>('shigen-custom-user-dp-v2', null);

    const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const activeChat = useMemo(() => chatSessions.find(session => session.id === activeChatId), [chatSessions, activeChatId]);
    const activeImageSession = useMemo(() => imageSessions.find(session => session.id === activeImageSessionId), [imageSessions, activeImageSessionId]);
    const activeStorySession = useMemo(() => storySessions.find(session => session.id === activeStorySessionId), [storySessions, activeStorySessionId]);
    const activePersona = useMemo(() => personas.find(p => p.id === activeChat?.personaId), [personas, activeChat]);
    
    const favoritedImageUrls = useMemo(() => new Set(favoritedImages.map(fav => fav.url)), [favoritedImages]);
    
    const favorites = useMemo((): FavoriteItem[] => {
        const favImages: FavoriteItem[] = favoritedImages;
        
        const favMessages: FavoriteItem[] = chatSessions.flatMap(session => 
            session.messages
                .filter(m => m.isFavorited && m.type === 'text')
                .map((m): FavoriteMessage => ({
                    type: 'message',
                    id: m.id,
                    content: m.content as string,
                    sessionId: session.id,
                    sessionTitle: session.title,
                    personaId: session.personaId,
                }))
        );

        const favStoryBeats: FavoriteItem[] = storySessions.flatMap(session =>
            session.beats
                .filter(b => b.isFavorited)
                .map((b): FavoriteStoryBeat => ({
                    type: 'story-beat',
                    id: b.id,
                    storyText: b.storyText,
                    imageUrl: b.imageUrl,
                    sessionId: session.id,
                    sessionTitle: session.title,
                }))
        );
        return [...favImages, ...favMessages, ...favStoryBeats];
    }, [favoritedImages, chatSessions, storySessions]);
    
    const unifiedHistory = useMemo((): HistoryItem[] => {
        const chats: HistoryItem[] = chatSessions.map(s => ({ id: s.id, title: s.title, type: 'chat', timestamp: s.timestamp }));
        const images: HistoryItem[] = imageSessions.map(s => ({ id: s.id, title: s.title, type: 'image-generator', timestamp: s.timestamp }));
        const stories: HistoryItem[] = storySessions.map(s => ({ id: s.id, title: s.title, type: 'story', timestamp: s.timestamp }));
        return [...chats, ...images, ...stories].sort((a, b) => b.timestamp - a.timestamp);
    }, [chatSessions, imageSessions, storySessions]);

    const addToast = useCallback((message: string, type: Notification['type'] = 'info') => {
        const id = `toast-${Date.now()}`;
        setNotifications(n => [...n, { id, message, type }]);
    }, []);

    const isIos = useCallback(() => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()), []);
    const isInStandaloneMode = useCallback(() => ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches, []);

    const installStatus: InstallStatus = useMemo(() => {
        if (isInStandaloneMode()) return 'installed';
        if (installPrompt) return 'available';
        if (isIos()) return 'ios';
        return 'unsupported';
    }, [installPrompt, isInStandaloneMode, isIos]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js');
            });
        }
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            if (!sessionStorage.getItem('installPromptShown')) {
              addToast("This web app can be installed! Find the 'Install App' button in the sidebar.", "info");
              sessionStorage.setItem('installPromptShown', 'true');
            }
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, [addToast]);
    
    const handleInstallPwa = () => {
        if (installStatus === 'ios') { setShowIosBanner(true); return; }
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') { addToast('App installed successfully!', 'success'); }
            setInstallPrompt(null);
        });
    };

    const updateChat = useCallback((id: string, updateFn: (chat: ChatSession) => ChatSession) => {
        setChatSessions(prev => prev.map(s => s.id === id ? updateFn(s) : s));
    }, [setChatSessions]);
    
    const updateImageSession = useCallback((id: string, updateFn: (session: ImageSession) => ImageSession) => {
        setImageSessions(prev => prev.map(s => s.id === id ? updateFn(s) : s));
    }, [setImageSessions]);
    
    const updateStorySession = useCallback((id: string, updateFn: (session: StorySession) => StorySession) => {
        setStorySessions(prev => prev.map(s => s.id === id ? updateFn(s) : s));
    }, [setStorySessions]);
    
    const handleNewSession = useCallback((type: ViewMode) => {
        const timestamp = Date.now();
        if (type === 'chat') {
            const newChat: ChatSession = { id: `chat-${timestamp}`, title: 'New Chat', messages: [], timestamp, personaId: null };
            setChatSessions(prev => [newChat, ...prev]);
            setActiveChatId(newChat.id);
        } else if (type === 'image-generator') {
            const newSession: ImageSession = { id: `img-session-${timestamp}`, title: 'New Image Session', generations: [], timestamp };
            setImageSessions(prev => [newSession, ...prev]);
            setActiveImageSessionId(newSession.id);
        } else if (type === 'story') {
            const newSession: StorySession = { id: `story-${timestamp}`, title: 'New Story', premise: '', characterDescription: '', beats: [], timestamp };
            setStorySessions(prev => [newSession, ...prev]);
            setActiveStorySessionId(newSession.id);
        }
        setMenuOpen(false);
        setImageToModify(null);
        setViewMode(type);
    }, [setChatSessions, setActiveChatId, setImageSessions, setActiveImageSessionId, setStorySessions, setActiveStorySessionId, setViewMode]);
    
    const handleSelectHistoryItem = (id: string, type: ViewMode) => {
        if (type === 'chat') setActiveChatId(id);
        else if (type === 'image-generator') setActiveImageSessionId(id);
        else if (type === 'story') setActiveStorySessionId(id);
        setViewMode(type);
        setMenuOpen(false);
    }
    
    useEffect(() => {
        if (viewMode === 'chat' && chatSessions.length > 0 && !activeChatId) setActiveChatId(chatSessions[0].id);
        else if (viewMode === 'chat' && chatSessions.length === 0) handleNewSession('chat');
    }, [viewMode, activeChatId, chatSessions, setActiveChatId, handleNewSession]);
    
    useEffect(() => {
        if (viewMode === 'image-generator' && imageSessions.length > 0 && !activeImageSessionId) setActiveImageSessionId(imageSessions[0].id);
        else if (viewMode === 'image-generator' && imageSessions.length === 0) handleNewSession('image-generator');
    }, [viewMode, activeImageSessionId, imageSessions, setActiveImageSessionId, handleNewSession]);

    useEffect(() => {
        if (viewMode === 'story' && storySessions.length > 0 && !activeStorySessionId) setActiveStorySessionId(storySessions[0].id);
        else if (viewMode === 'story' && storySessions.length === 0) handleNewSession('story');
    }, [viewMode, activeStorySessionId, storySessions, setActiveStorySessionId, handleNewSession]);
    
    useEffect(() => {
        Promise.all([fetchTextModels(), fetchImageModels()]).then(([{models: fetchedTextModels, statuses}, fetchedImageModels]) => {
            setTextModels(fetchedTextModels);
            setImageModels(fetchedImageModels);
            setModelStatus(prev => ({ ...prev, ...statuses }));
            if (!settings.textModel || !fetchedTextModels.includes(settings.textModel)) {
                setSettings(s => ({ ...s, textModel: fetchedTextModels[0] || '' }));
            }
            if (!settings.imageModel || !fetchedImageModels.includes(settings.imageModel)) {
                setSettings(s => ({ ...s, imageModel: fetchedImageModels.find(m => m.includes('flux')) || fetchedImageModels[0] || '' }));
            }
        });
    }, [setSettings, setModelStatus]);

    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsChatGenerating(false);
            setIsImageGenerating(false);
            setIsStoryGenerating(false);
            setPendingGeneration(null);
        }
    };

    const handleFriendlyError = (error: unknown, modelInUse: string): string => {
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
            return 'Generation cancelled.';
        }
        let errorMessage = `An unknown error occurred with model: ${modelInUse}.`;
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return errorMessage;
    };
    
    const handleTextGeneration = useCallback(async (history: Message[], systemInstruction?: string, messageToReplaceId?: string) => {
        if (!activeChatId) return;
        setIsChatGenerating(true);
        abortControllerRef.current = new AbortController();

        const loadingMessageId = messageToReplaceId || `bot-loading-${Date.now()}`;

        if (!messageToReplaceId) {
            const loadingMessage: Message = { id: loadingMessageId, role: 'bot', type: 'loading', content: 'Thinking...' };
            updateChat(activeChatId, chat => ({ ...chat, messages: [...chat.messages, loadingMessage] }));
        }

        try {
            const stream = generateTextStream(history, settings.textModel, systemInstruction, abortControllerRef.current.signal);

            let fullResponse = "";
            for await (const chunk of stream) {
                fullResponse += chunk;
                updateChat(activeChatId, chat => ({
                    ...chat,
                    messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, type: 'text', content: fullResponse } : m)
                }));
            }
            // Final update to ensure state is clean
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-${Date.now()}`, type: 'text', content: fullResponse } : m)
            }));
            
        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-error-${Date.now()}`, type: 'error', content: friendlyError } : m)
            }));
        } finally {
            setIsChatGenerating(false);
            abortControllerRef.current = null;
        }
    }, [activeChatId, settings.textModel, updateChat]);

    const handleImageGeneration = useCallback(async (config: ImageGenConfig, messageToReplaceId?: string) => {
        if (viewMode === 'chat' && !activeChatId) return;
        if (viewMode === 'image-generator' && !activeImageSessionId) {
            addToast("Cannot generate: No active image session found.", "error");
            return;
        }

        const generationInChat = viewMode === 'chat' && activeChatId;
        const generationInImage = viewMode === 'image-generator' && activeImageSessionId;

        if (generationInChat) setIsChatGenerating(true);
        if (generationInImage) setIsImageGenerating(true);

        if (generationInImage) setPendingGeneration(config);
        
        abortControllerRef.current = new AbortController();

        const loadingMessageId = messageToReplaceId || `bot-loading-${Date.now()}`;

        if (generationInChat) {
            const loadingMessage: Message = { id: loadingMessageId, role: 'bot', type: 'loading', content: `IMAGE_GENERATION_LOADING::${config.numImages}` };
            if (messageToReplaceId) {
                updateChat(activeChatId, chat => ({ ...chat, messages: chat.messages.map(m => m.id === loadingMessageId ? loadingMessage : m) }));
            } else {
                updateChat(activeChatId, chat => ({ ...chat, messages: [...chat.messages, loadingMessage] }));
            }
        }

        try {
            const urls = Array.from({ length: config.numImages }, (_, i) =>
                getImageUrl(config.prompt, {
                    model: config.model,
                    sourceImageUrl: config.sourceImageUrl,
                    negativePrompt: config.negativePrompt,
                    aspectRatio: config.aspectRatio,
                    seed: typeof config.seed === 'number' ? config.seed + i : undefined,
                    safe: true,
                })
            );

            const imageContent: ImageContent = { urls, config };
            
            if (generationInChat) {
                 updateChat(activeChatId, chat => ({
                    ...chat,
                    messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-img-${Date.now()}`, type: 'image', content: imageContent } : m)
                }));
            } else if (generationInImage) {
                const newGeneration: ImageGeneration = { id: `gen-${Date.now()}`, config, imageContent, timestamp: Date.now() };
                updateImageSession(activeImageSessionId, session => ({...session, generations: [newGeneration, ...session.generations]}));
            }

        } catch (error) {
            const friendlyError = handleFriendlyError(error, config.model);
            if (generationInChat) {
                updateChat(activeChatId, chat => ({
                    ...chat,
                    messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-error-${Date.now()}`, type: 'error', content: friendlyError } : m)
                }));
            } else {
                addToast(friendlyError, 'error');
            }
        } finally {
            if (generationInChat) setIsChatGenerating(false);
            if (generationInImage) {
                setIsImageGenerating(false);
                setPendingGeneration(null);
            }
            abortControllerRef.current = null;
        }
    }, [activeChatId, activeImageSessionId, viewMode, updateChat, updateImageSession, addToast]);
    
    const handleChatImageGeneration = useCallback(async (modificationRequest: string, imageToEdit: ImageContent) => {
        if (!activeChatId) return;
        setIsChatGenerating(true);
        abortControllerRef.current = new AbortController();

        const loadingMessage: Message = { id: `bot-loading-${Date.now()}`, role: 'bot', type: 'loading', content: `IMAGE_GENERATION_LOADING::${imageToEdit.config.numImages}` };
        updateChat(activeChatId, chat => ({ ...chat, messages: [...chat.messages, loadingMessage] }));
        
        try {
            const originalPrompt = (imageToEdit.config.prompt || '').replace(/^\/(generate|draw|create|render|imagine)\s*/i, '').trim();
            const refinedPrompt = await refineImagePrompt(originalPrompt, modificationRequest, abortControllerRef.current.signal);
            
            if (abortControllerRef.current.signal.aborted) throw new Error("Cancelled");
            
            const newConfig: ImageGenConfig = {
                ...imageToEdit.config,
                prompt: refinedPrompt,
                seed: typeof imageToEdit.config.seed === 'number' ? imageToEdit.config.seed : Math.floor(Math.random() * 100000),
                sourceImageUrl: imageToEdit.urls[0] 
            };
            
            const urls = Array.from({ length: newConfig.numImages }, (_, i) => getImageUrl(newConfig.prompt, { ...newConfig, seed: typeof newConfig.seed === 'number' ? newConfig.seed + i : undefined, safe: true }));
            const imageContent: ImageContent = { urls, config: newConfig };
            
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === loadingMessage.id ? { ...m, id: `bot-img-${Date.now()}`, type: 'image', content: imageContent } : m)
            }));
        } catch (error) {
            const friendlyError = handleFriendlyError(error, imageToEdit.config.model);
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === loadingMessage.id ? { ...m, id: `bot-error-${Date.now()}`, type: 'error', content: friendlyError } : m)
            }));
        } finally {
            setIsChatGenerating(false);
            abortControllerRef.current = null;
            setImageToModify(null);
        }
    }, [activeChatId, updateChat]);

    const handleGenerateImageFromPrompt = useCallback((prompt: string, numImages: number) => {
        if (!activeChatId) return;

        handleImageGeneration({
            prompt,
            numImages,
            model: settings.imageModel,
            aspectRatio: '1:1',
            negativePrompt: '',
        });

    }, [activeChatId, settings.imageModel, handleImageGeneration]);
    
    const handleSendMessage = useCallback((prompt: string, options: { imageToEdit?: ImageContent }) => {
        if (!activeChatId || !activeChat) return;

        const { imageToEdit } = options;
        setImageToModify(null);

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', type: 'text', content: prompt };
        
        let systemInstruction = activeChat.systemInstruction;
        if (activeChat.personaId) {
            const persona = personas.find(p => p.id === activeChat.personaId);
            if (persona) systemInstruction = persona.instruction;
        }

        updateChat(activeChatId, chat => ({ ...chat, messages: [...chat.messages, userMessage] }));

        if (imageToEdit) {
            handleChatImageGeneration(prompt, imageToEdit);
            return;
        }

        if (isImageGenRequest(prompt)) {
            const cleanedPrompt = prompt.replace(/^\/(generate|draw|create|render|imagine|make|sketch|paint|illustrate)\s*/i, '').trim();
            handleGenerateImageFromPrompt(cleanedPrompt || prompt, 4);
        } else {
            handleTextGeneration([...activeChat.messages, userMessage], systemInstruction);
        }
    }, [activeChatId, activeChat, updateChat, handleChatImageGeneration, handleGenerateImageFromPrompt, handleTextGeneration, personas]);
    
    const handleContinueStory = useCallback(async (userPrompt: string) => {
        if (!activeStorySessionId || !activeStorySession) return;
        setIsStoryGenerating(true);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const textLoadingBeat: StoryBeat = {
            id: `temp-text-loading-${Date.now()}`,
            storyText: 'The AI is writing the next chapter...',
            imageUrl: '',
            imagePrompt: '',
            userPrompt: userPrompt,
            isGenerating: true,
        };
        
        updateStorySession(activeStorySessionId, session => ({ ...session, beats: [...session.beats, textLoadingBeat] }));

        try {
            const continuations = await generateStoryContinuation(
                activeStorySession.premise,
                activeStorySession.beats,
                userPrompt,
                settings.textModel,
                activeStorySession.characterDescription,
                signal
            );
            
            if (signal.aborted) throw new Error("Cancelled");
            
            // Replace loading beat with actual new beats
            const newBeats = continuations.map(c => ({
                id: `beat-${Date.now()}-${Math.random()}`,
                storyText: c.storyText,
                imagePrompt: c.imagePrompt,
                imageUrl: '',
                userPrompt: userPrompt,
                isGenerating: true,
            }));

            updateStorySession(activeStorySessionId, session => ({
                ...session,
                beats: [...session.beats.filter(b => !b.id.startsWith('temp-')), ...newBeats]
            }));

            // Generate images concurrently
            newBeats.forEach(beat => {
                if (signal.aborted) return;
                const imageUrl = getImageUrl(beat.imagePrompt, { model: settings.imageModel, aspectRatio: '3:4', safe: true });
                updateStorySession(activeStorySessionId, session => ({
                    ...session,
                    beats: session.beats.map(b => b.id === beat.id ? { ...b, imageUrl, isGenerating: false } : b)
                }));
            });

        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            addToast(friendlyError, 'error');
            updateStorySession(activeStorySessionId, session => ({
                ...session,
                beats: session.beats.filter(b => !b.id.startsWith('temp-text-loading-'))
            }));
        } finally {
            setIsStoryGenerating(false);
        }
    }, [activeStorySessionId, activeStorySession, settings.textModel, settings.imageModel, updateStorySession, addToast]);
    
     const handleStartStory = useCallback(async (premise: string) => {
        if (!activeStorySessionId) return;
        
        setIsStoryGenerating(true);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        updateStorySession(activeStorySessionId, session => ({...session, premise, beats: [] }));

        const textLoadingBeat: StoryBeat = {
            id: `temp-text-loading-${Date.now()}`,
            storyText: 'The AI is crafting the opening scenes...',
            imageUrl: '',
            imagePrompt: '',
            userPrompt: premise,
            isGenerating: true,
        };
        updateStorySession(activeStorySessionId, session => ({ ...session, beats: [textLoadingBeat] }));

        try {
            addToast("Generating character description...", "info");
            const characterDescription = await generateCharacterDescription(premise, settings.textModel, signal);
            if (signal.aborted) throw new Error("Cancelled");
            updateStorySession(activeStorySessionId, session => ({ ...session, characterDescription }));
            addToast("Character created! Generating opening scenes...", "success");

            const initialBeatsData = await generateStoryContinuation(
                premise, [], "Start the story.", settings.textModel, characterDescription, signal
            );

            if (signal.aborted) throw new Error("Cancelled");
            
            const newBeats = initialBeatsData.map(c => ({
                id: `beat-${Date.now()}-${Math.random()}`,
                storyText: c.storyText,
                imagePrompt: c.imagePrompt,
                imageUrl: '',
                userPrompt: premise,
                isGenerating: true,
            }));

            updateStorySession(activeStorySessionId, session => ({ ...session, beats: newBeats })); 

            // Generate images concurrently
            newBeats.forEach(beat => {
                if (signal.aborted) return;
                const imageUrl = getImageUrl(beat.imagePrompt, { model: settings.imageModel, aspectRatio: '3:4', safe: true });
                updateStorySession(activeStorySessionId, session => ({
                    ...session,
                    beats: session.beats.map(b => b.id === beat.id ? { ...b, imageUrl, isGenerating: false } : b)
                }));
            });

        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            addToast(friendlyError, 'error');
            updateStorySession(activeStorySessionId, session => ({ ...session, beats: [] })); // Clear text loading beat on error
        } finally {
            setIsStoryGenerating(false);
        }
    }, [activeStorySessionId, settings.textModel, settings.imageModel, addToast, updateStorySession]);

    const handleRefineMessage = useCallback(async (messageId: string, option: RefineOption) => {
        if (!activeChatId) return;
        const chat = chatSessions.find(s => s.id === activeChatId);
        if (!chat) return;

        const messageIndex = chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;
        const originalMessage = chat.messages[messageIndex];
        const historyUpToMessage = chat.messages.slice(0, messageIndex);

        if (originalMessage.type !== 'text' || typeof originalMessage.content !== 'string') return;
        
        if (option === 'copy') {
            if (typeof originalMessage.content === 'string') {
                try {
                    await navigator.clipboard.writeText(originalMessage.content);
                    addToast("Copied to clipboard!", "success");
                } catch (err) { addToast("Failed to copy.", "error"); }
            }
            return;
        }

        setIsChatGenerating(true);
        abortControllerRef.current = new AbortController();

        const tempLoadingId = `bot-loading-${Date.now()}`;
        const tempMessage: Message = { id: tempLoadingId, role: 'bot', type: 'loading', content: `Refining...` };
        
        updateChat(activeChatId, c => ({ ...c, messages: c.messages.map(m => m.id === messageId ? tempMessage : m) }));

        const refinementInstruction = `Refine the last response to be ${option}. Do not add any conversational filler, just output the refined text.`;
        const refinementMessage: Message = { id: 'refine-req', role: 'user', type: 'text', content: refinementInstruction };
        const historyForRefinement = [...historyUpToMessage, originalMessage, refinementMessage];
        
        try {
            const refinedContent = await generateText(historyForRefinement, settings.textModel, chat.systemInstruction, abortControllerRef.current.signal);
            updateChat(activeChatId, c => ({
                ...c,
                messages: c.messages.map(m => m.id === tempLoadingId ? { ...originalMessage, id: `bot-ref-${Date.now()}`, content: refinedContent } : m)
            }));
        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            updateChat(activeChatId, c => ({...c, messages: c.messages.map(m => m.id === tempLoadingId ? originalMessage : m) }));
            addToast(`Refinement failed: ${friendlyError}`, 'error');
        } finally {
            setIsChatGenerating(false);
        }
    }, [activeChatId, chatSessions, updateChat, addToast, settings.textModel]);

    const handleContinueGeneration = useCallback(async (messageId: string) => {
        if (!activeChatId || !activeChat) return;
        const messageIndex = activeChat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const history = activeChat.messages.slice(0, messageIndex + 1);
        
        let systemInstruction = activeChat.systemInstruction;
        if (activeChat.personaId) {
            const persona = personas.find(p => p.id === activeChat.personaId);
            if (persona) systemInstruction = persona.instruction;
        }
        
        handleTextGeneration(history, systemInstruction);
    }, [activeChatId, activeChat, personas, handleTextGeneration]);

    const handleToggleFavoriteMessage = (message: Message) => {
        if (!activeChatId) return;
        updateChat(activeChatId, chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === message.id ? { ...m, isFavorited: !m.isFavorited } : m)
        }));
    };

    const handleToggleFavoriteStoryBeat = (beatToToggle: StoryBeat) => {
        if (!activeStorySessionId) return;
        updateStorySession(activeStorySessionId, session => ({
            ...session,
            beats: session.beats.map(beat => 
                beat.id === beatToToggle.id ? { ...beat, isFavorited: !beat.isFavorited } : beat
            )
        }));
    };

    const handleShareMessage = async (messageId: string) => {
        const message = activeChat?.messages.find(m => m.id === messageId);
        if (!message || message.type !== 'text' || typeof message.content !== 'string') return;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'SHIGEN Chat', text: message.content });
            } catch (error) { console.error('Error sharing:', error); }
        } else { addToast('Sharing is not supported on this browser.', 'info'); }
    };
    
    const handleDeleteSession = (id: string, type: ViewMode) => {
        if (type === 'chat') {
            setChatSessions(prev => prev.filter(s => s.id !== id));
            if (activeChatId === id) setActiveChatId(chatSessions.length > 1 ? chatSessions.find(s => s.id !== id)!.id : null);
        } else if (type === 'image-generator') {
            setImageSessions(prev => prev.filter(s => s.id !== id));
            if (activeImageSessionId === id) setActiveImageSessionId(imageSessions.length > 1 ? imageSessions.find(s => s.id !== id)!.id : null);
        } else if (type === 'story') {
            setStorySessions(prev => prev.filter(s => s.id !== id));
            if (activeStorySessionId === id) setActiveStorySessionId(storySessions.length > 1 ? storySessions.find(s => s.id !== id)!.id : null);
        }
    };

    const handleToggleFavoriteImage = (image: FavoriteImage) => {
        setFavoritedImages(prev => {
            const isFav = prev.some(f => f.url === image.url);
            return isFav ? prev.filter(f => f.url !== image.url) : [image, ...prev];
        });
        triggerHapticFeedback('light');
    };

    const handleToggleFavorite = (item: FavoriteItem) => {
        if (item.type === 'image') {
            handleToggleFavoriteImage(item);
        } else if (item.type === 'message') {
            const session = chatSessions.find(s => s.id === item.sessionId);
            if (session) {
                const message = session.messages.find(m => m.id === item.id);
                if (message) handleToggleFavoriteMessage(message);
            }
        } else if (item.type === 'story-beat') {
            const session = storySessions.find(s => s.id === item.sessionId);
            if (session) {
                const beat = session.beats.find(b => b.id === item.id);
                if (beat) handleToggleFavoriteStoryBeat(beat);
            }
        }
    };
    
    const handleReEditImage = (config: ImageGenConfig) => {
        setReEditRequest(config);
        setViewMode('image-generator');
        setViewingImages(null);
        setFavoritesOpen(false);
    };
    
    const handleCheckModels = useCallback(async () => {
        setIsCheckingModels(true);
        const controller = new AbortController();
        const signal = controller.signal;
        
        const textModelsToCheck = textModels.filter(m => modelStatus[m] !== 'available');
        const imageModelsToCheck = imageModels.filter(m => modelStatus[m] !== 'available');

        const promises: Promise<void>[] = [];
        
        textModelsToCheck.forEach(model => {
            setModelStatus(prev => ({ ...prev, [model]: 'checking' }));
            promises.push(
                checkModelStatus(model, signal).then(status => {
                    if (!signal.aborted) setModelStatus(prev => ({...prev, [model]: status}));
                })
            );
        });
        
        imageModelsToCheck.forEach(model => {
            setModelStatus(prev => ({ ...prev, [model]: 'checking' }));
            promises.push(
                checkImageModelStatus(model, signal).then(status => {
                     if (!signal.aborted) setModelStatus(prev => ({...prev, [model]: status}));
                })
            );
        });

        await Promise.allSettled(promises);
        setIsCheckingModels(false);
    }, [textModels, imageModels, modelStatus, setModelStatus]);
    
    const handleApplyAiTheme = (theme: GeneratedTheme) => {
        setSettings(s => ({...s, theme: 'dark', aiTheme: theme }));
        
        if (theme.userDpUrl) setCustomUserDp(theme.userDpUrl);

        Object.entries(theme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
        if (theme.wallpaperUrl) {
            document.documentElement.style.setProperty('--color-wallpaper', `url(${theme.wallpaperUrl})`);
        } else {
             document.documentElement.style.removeProperty('--color-wallpaper');
        }
        setThemeGeneratorOpen(false);
        addToast(`Theme "${theme.name}" applied!`, 'success');
    }
    
    useEffect(() => {
        const themeToApply: Theme = settings.aiTheme ? 'dark' : settings.theme; // AI themes are based on dark
        document.body.className = `theme-${themeToApply}`;
        
        if (settings.aiTheme) {
            Object.entries(settings.aiTheme.colors).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
            if (settings.aiTheme.wallpaperUrl) {
                document.documentElement.style.setProperty('--color-wallpaper', `url(${settings.aiTheme.wallpaperUrl})`);
            }
        } else {
             // Clear AI theme styles if it's not active
            const themeColorKeys = ['--color-background', '--color-surface', '--color-surface-variant', '--color-primary', '--color-primary-container', '--color-secondary', '--color-outline', '--color-on-background', '--color-on-surface', '--color-on-surface-variant', '--color-on-primary', '--color-on-primary-container', '--color-on-secondary', '--color-shadow', '--color-wallpaper'];
            themeColorKeys.forEach(key => document.documentElement.style.removeProperty(key));
        }

    }, [settings.theme, settings.aiTheme]);
    
    const handleUpdateStorySession = (updates: Partial<StorySession>) => {
        if (activeStorySessionId) {
            updateStorySession(activeStorySessionId, session => ({ ...session, ...updates}));
        }
    }
    
    const handleSetPersonaForChat = (personaId: string | null) => {
        if (activeChatId) {
            updateChat(activeChatId, chat => ({ ...chat, personaId, systemInstruction: '' })); // Clear old instruction
        }
    };

    const handleGenerateAudioForMessage = useCallback(async (messageId: string) => {
        if (!activeChatId) return;
        const message = activeChat?.messages.find(m => m.id === messageId);
        if (!message || message.type !== 'text' || typeof message.content !== 'string') return;
        
        updateChat(activeChatId, chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: true } : m)
        }));

        try {
            const audioUrl = await generateAudio(message.content);
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: false, audioUrl } : m)
            }));
            handleToggleAudio(messageId, audioUrl);
        } catch (error) {
            addToast('Failed to generate audio.', 'error');
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: false } : m)
            }));
        }
    }, [activeChatId, activeChat, updateChat, addToast]);

    const handleToggleAudio = (messageId: string, audioUrl: string) => {
        if (currentlyPlayingMessageId === messageId && audioRef.current) {
            if (isAudioPlaying) {
                audioRef.current.pause();
                setIsAudioPlaying(false);
            } else {
                audioRef.current.play();
                setIsAudioPlaying(true);
            }
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const newAudio = new Audio(audioUrl);
            audioRef.current = newAudio;
            newAudio.play();
            setIsAudioPlaying(true);
            setCurrentlyPlayingMessageId(messageId);
            newAudio.onended = () => {
                setIsAudioPlaying(false);
                setCurrentlyPlayingMessageId(null);
            };
        }
    };
    
    const mainContent = useMemo(() => {
        switch (viewMode) {
            case 'chat':
                return <ChatView 
                            chatSession={activeChat} 
                            activePersona={activePersona}
                            onSendMessage={handleSendMessage} 
                            onOpenSidebar={() => {}} 
                            onOpenChatSettings={() => setChatSettingsOpen(true)}
                            isGenerating={isChatGenerating}
                            onCancel={handleCancelGeneration}
                            onImageSelect={setImageToModify}
                            selectedImage={imageToModify}
                            onToggleFavorite={handleToggleFavoriteMessage}
                            onContinue={handleContinueGeneration}
                            onRefine={handleRefineMessage}
                            onShare={handleShareMessage}
                            promptFromFeed={promptFromFeed}
                            isOnline={isOnline}
                            onOpenViewer={(images, startIndex) => setViewingImages({ images, startIndex })}
                            onGenerateImageFromPrompt={handleGenerateImageFromPrompt}
                            customUserDp={customUserDp}
                            onGenerateAudioForMessage={handleGenerateAudioForMessage}
                            onToggleAudio={handleToggleAudio}
                            currentlyPlayingMessageId={currentlyPlayingMessageId}
                            isAudioPlaying={isAudioPlaying}
                        />;
            case 'image-generator':
                return <ImageGeneratorView 
                            session={activeImageSession} 
                            defaultImageModel={settings.imageModel}
                            imageModels={imageModels}
                            isGenerating={isImageGenerating}
                            pendingGeneration={pendingGeneration}
                            onGenerate={(config) => activeImageSessionId && handleImageGeneration(config)}
                            onCancel={handleCancelGeneration}
                            onOpenSidebar={() => {}}
                            isOnline={isOnline}
                            onOpenViewer={(images, startIndex) => setViewingImages({ images, startIndex })}
                            favoritedImageUrls={favoritedImageUrls}
                            reEditRequest={reEditRequest}
                            onReEditRequestConsumed={() => setReEditRequest(null)}
                            addToast={addToast}
                            onReEdit={handleReEditImage}
                        />;
            case 'story':
                 return <StoryView 
                             session={activeStorySession}
                             onStartStory={handleStartStory}
                             onContinueStory={handleContinueStory}
                             onOpenSidebar={() => {}}
                             isGenerating={isStoryGenerating}
                             onCancel={handleCancelGeneration}
                             isOnline={isOnline}
                             onOpenViewer={(beatId) => {
                                const allBeats = activeStorySession?.beats.filter(b => b.imageUrl) || [];
                                const images = allBeats.map(b => ({ url: b.imageUrl, config: { prompt: b.imagePrompt, model: settings.imageModel, aspectRatio: '3:4', negativePrompt: '', numImages: 1 }}));
                                const startIndex = allBeats.findIndex(b => b.id === beatId);
                                if (startIndex !== -1) setViewingImages({ images, startIndex });
                             }}
                             onUpdateSession={handleUpdateStorySession}
                             onToggleFavorite={handleToggleFavoriteStoryBeat}
                         />;
            default:
                return null;
        }
    }, [
        viewMode, activeChat, handleSendMessage, isChatGenerating, imageToModify, promptFromFeed, isOnline, 
        activeImageSession, settings, imageModels, isImageGenerating, pendingGeneration, activeImageSessionId, handleImageGeneration,
        activeStorySession, isStoryGenerating, handleStartStory, handleContinueStory,
        textModels,
        favoritedImageUrls, reEditRequest, addToast, handleReEditImage, handleRefineMessage, handleShareMessage, 
        handleGenerateImageFromPrompt,
        customUserDp,
        activePersona, handleToggleFavoriteMessage, handleToggleFavoriteStoryBeat,
        handleContinueGeneration, handleGenerateAudioForMessage, handleToggleAudio, currentlyPlayingMessageId, isAudioPlaying
    ]);

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-on-background font-sans overflow-hidden">
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {mainContent}
            </div>
            <BottomNavBar activeView={viewMode} onViewChange={setViewMode} onMenuClick={() => setMenuOpen(true)}/>
            
            <MenuSheet
                isOpen={isMenuOpen} 
                onClose={() => setMenuOpen(false)}
                history={unifiedHistory}
                activeIds={{ chat: activeChatId, image: activeImageSessionId, story: activeStorySessionId }}
                onSelectHistoryItem={handleSelectHistoryItem}
                onNewSession={handleNewSession}
                onDeleteSession={handleDeleteSession}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenImageFeed={() => setImageFeedOpen(true)}
                onOpenTextFeed={() => setTextFeedOpen(true)}
                favorites={favorites}
                onOpenFavorites={() => setFavoritesOpen(true)}
                installStatus={installStatus}
                onInstallPwa={handleInstallPwa}
            />
             {isSettingsOpen && <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onSettingsChange={setSettings}
                textModels={textModels}
                imageModels={imageModels}
                modelStatus={modelStatus}
                onCheckModels={handleCheckModels}
                isCheckingModels={isCheckingModels}
                onOpenThemeGenerator={() => setThemeGeneratorOpen(true)}
                onOpenPersonaManager={() => { setSettingsOpen(false); setPersonaManagerOpen(true); }}
            />}
            {isChatSettingsOpen && activeChat && <ChatSettingsModal
                isOpen={isChatSettingsOpen}
                onClose={() => setChatSettingsOpen(false)}
                personas={personas}
                activePersonaId={activeChat.personaId}
                onSetPersona={handleSetPersonaForChat}
                onOpenPersonaManager={() => { setChatSettingsOpen(false); setPersonaManagerOpen(true); }}
            />}
             {isPersonaManagerOpen && <PersonaManagerModal
                isOpen={isPersonaManagerOpen}
                onClose={() => setPersonaManagerOpen(false)}
                personas={personas}
                onUpdatePersonas={setPersonas}
                addToast={addToast}
            />}
            {isImageFeedOpen && <ImageFeed 
                isOpen={isImageFeedOpen} 
                onClose={() => setImageFeedOpen(false)} 
                onPromptSelect={(prompt) => {
                    setPromptFromFeed({ prompt, timestamp: Date.now() });
                    setImageFeedOpen(false);
                    setViewMode('chat');
                }}
            />}
            {isTextFeedOpen && <TextFeed 
                isOpen={isTextFeedOpen}
                onClose={() => setTextFeedOpen(false)}
                onPromptSelect={(prompt) => {
                    setPromptFromFeed({ prompt, timestamp: Date.now() });
                    setTextFeedOpen(false);
                    setViewMode('chat');
                }}
            />}
            {viewingImages && <ImageViewerModal 
                isOpen={!!viewingImages}
                onClose={() => setViewingImages(null)}
                images={viewingImages.images}
                startIndex={viewingImages.startIndex}
                favoritedImageUrls={favoritedImageUrls}
                onToggleFavorite={handleToggleFavoriteImage}
                onReEdit={handleReEditImage}
            />}
            {isFavoritesOpen && <FavoritesViewModal 
                isOpen={isFavoritesOpen}
                onClose={() => setFavoritesOpen(false)}
                favorites={favorites}
                onOpenViewer={(startIndex) => {
                    const viewerImages = favorites
                        .filter((fav): fav is FavoriteImage => fav.type === 'image')
                        .map(fav => ({ url: fav.url, config: fav.config }));
                    setViewingImages({ images: viewerImages, startIndex });
                }}
                onToggleFavorite={handleToggleFavorite}
                onReEdit={handleReEditImage}
            />}
            {isThemeGeneratorOpen && <ThemeGeneratorModal
                 isOpen={isThemeGeneratorOpen}
                 onClose={() => setThemeGeneratorOpen(false)}
                 onApplyTheme={handleApplyAiTheme}
                 addToast={addToast}
                 textModel={settings.textModel}
            />}

            <NotificationManager 
                notifications={notifications} 
                onDismiss={(id) => setNotifications(n => n.filter(toast => toast.id !== id))}
            />
            
            {showIosBanner && <IosInstallBanner onClose={() => setShowIosBanner(false)} />}
        </div>
    );
};

export default App;