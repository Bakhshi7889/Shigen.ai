


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ImageGeneratorView from './components/ImageGeneratorView';
import StoryView from './components/StoryView';
import SettingsModal from './components/SettingsModal';
import SystemInstructionModal from './components/SystemInstructionModal';
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
    fetchTextModels, fetchImageModels, generateTextStream, generateText, getImageUrl, 
    isAudioModel, getAudioUrl, refineImagePrompt, isImageGenRequest,
    checkModelStatus, checkImageModelStatus, generateStoryContinuation
} from './services/pollinations';
import type { 
    ChatSession, Settings, Message, ModelStatusMap, ImageContent,
    ViewMode, ImageGenConfig, ImageGeneration, FavoriteImage, Notification, 
    ViewerImage, ImageSession, RefineOption, GeneratedTheme, StorySession, StoryBeat
} from './types';
import { triggerHapticFeedback } from './lib/haptics';

type InstallStatus = 'unsupported' | 'available' | 'installed' | 'ios';

const App: React.FC = () => {
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('view-mode-v1', 'chat');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isInstructionModalOpen, setInstructionModalOpen] = useState(false);
    const [isImageFeedOpen, setImageFeedOpen] = useState(false);
    const [isTextFeedOpen, setTextFeedOpen] = useState(false);
    const [isFavoritesOpen, setFavoritesOpen] = useState(false);
    const [isThemeGeneratorOpen, setThemeGeneratorOpen] = useState(false);
    
    const isOnline = useOnlineStatus();

    const [settings, setSettings] = useLocalStorage<Settings>('chat-settings-v2', {
        textModel: 'openai-fast',
        imageModel: 'turbo',
        audioModel: 'openai-audio',
        audioVoice: 'alloy',
        theme: 'shigen',
    });

    const [textModels, setTextModels] = useState<string[]>([]);
    const [imageModels, setImageModels] = useState<string[]>([]);
    const [modelStatus, setModelStatus] = useLocalStorage<ModelStatusMap>('text-model-status', {});
    const [isCheckingModels, setIsCheckingModels] = useState(false);
    
    const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>('chat-sessions-v1', []);
    const [activeChatId, setActiveChatId] = useLocalStorage<string | null>('active-chat-id-v1', null);
    
    const [imageSessions, setImageSessions] = useLocalStorage<ImageSession[]>('image-sessions-v1', []);
    const [activeImageSessionId, setActiveImageSessionId] = useLocalStorage<string | null>('active-image-session-id-v1', null);

    const [storySessions, setStorySessions] = useLocalStorage<StorySession[]>('story-sessions-v1', []);
    const [activeStorySessionId, setActiveStorySessionId] = useLocalStorage<string | null>('active-story-session-id-v1', null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [imageToModify, setImageToModify] = useState<ImageContent | null>(null);

    const [promptFromFeed, setPromptFromFeed] = useState<{ prompt: string, timestamp: number }>({ prompt: '', timestamp: 0 });
    
    const [favoritedImages, setFavoritedImages] = useLocalStorage<FavoriteImage[]>('favorited-images', []);
    const [viewingImages, setViewingImages] = useState<{ images: ViewerImage[], startIndex: number } | null>(null);
    const [reEditRequest, setReEditRequest] = useState<ImageGenConfig | null>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showIosBanner, setShowIosBanner] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null);
    const [customUserDp, setCustomUserDp] = useLocalStorage<string | null>('custom-user-dp-v1', null);

    const activeChat = useMemo(() => chatSessions.find(session => session.id === activeChatId), [chatSessions, activeChatId]);
    const activeImageSession = useMemo(() => imageSessions.find(session => session.id === activeImageSessionId), [imageSessions, activeImageSessionId]);
    const activeStorySession = useMemo(() => storySessions.find(session => session.id === activeStorySessionId), [storySessions, activeStorySessionId]);
    
    const favoritedImageUrls = useMemo(() => new Set(favoritedImages.map(fav => fav.url)), [favoritedImages]);

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
        audioPlayerRef.current = new Audio();
        const player = audioPlayerRef.current;
        const onEnded = () => setCurrentlyPlayingMessageId(null);
        player.addEventListener('ended', onEnded);
        player.addEventListener('error', onEnded);
        return () => {
            player.removeEventListener('ended', onEnded);
            player.removeEventListener('error', onEnded);
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

    const createNewChat = useCallback(() => {
        const newChat: ChatSession = { id: `chat-${Date.now()}`, title: 'New Chat', messages: [] };
        setChatSessions(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setSidebarOpen(false);
        setImageToModify(null);
        setViewMode('chat');
    }, [setChatSessions, setActiveChatId, setViewMode]);
    
    const createNewImageSession = useCallback(() => {
        const newSession: ImageSession = { id: `img-session-${Date.now()}`, title: 'New Image Session', generations: [] };
        setImageSessions(prev => [newSession, ...prev]);
        setActiveImageSessionId(newSession.id);
        setSidebarOpen(false);
        setViewMode('image-generator');
    }, [setImageSessions, setActiveImageSessionId, setViewMode]);

    const createNewStorySession = useCallback(() => {
        const newSession: StorySession = { id: `story-${Date.now()}`, title: 'New Story', premise: '', beats: [] };
        setStorySessions(prev => [newSession, ...prev]);
        setActiveStorySessionId(newSession.id);
        setSidebarOpen(false);
        setViewMode('story');
    }, [setStorySessions, setActiveStorySessionId, setViewMode]);
    
    useEffect(() => {
        if (viewMode === 'chat' && chatSessions.length > 0 && !activeChatId) setActiveChatId(chatSessions[0].id);
        else if (viewMode === 'chat' && chatSessions.length === 0) createNewChat();
    }, [viewMode, activeChatId, chatSessions, setActiveChatId, createNewChat]);
    
    useEffect(() => {
        if (viewMode === 'image-generator' && imageSessions.length > 0 && !activeImageSessionId) setActiveImageSessionId(imageSessions[0].id);
        else if (viewMode === 'image-generator' && imageSessions.length === 0) createNewImageSession();
    }, [viewMode, activeImageSessionId, imageSessions, setActiveImageSessionId, createNewImageSession]);

    useEffect(() => {
        if (viewMode === 'story' && storySessions.length > 0 && !activeStorySessionId) setActiveStorySessionId(storySessions[0].id);
        else if (viewMode === 'story' && storySessions.length === 0) createNewStorySession();
    }, [viewMode, activeStorySessionId, storySessions, setActiveStorySessionId, createNewStorySession]);
    
    useEffect(() => {
        Promise.all([fetchTextModels(), fetchImageModels()]).then(([{models: fetchedTextModels, statuses}, fetchedImageModels]) => {
            setTextModels(fetchedTextModels);
            setImageModels(fetchedImageModels);
            setModelStatus(prev => ({ ...prev, ...statuses }));
            if (!settings.textModel || !fetchedTextModels.includes(settings.textModel)) {
                setSettings(s => ({ ...s, textModel: fetchedTextModels[0] || '' }));
            }
            if (!settings.imageModel || !fetchedImageModels.includes(settings.imageModel)) {
                setSettings(s => ({ ...s, imageModel: fetchedImageModels[0] || '' }));
            }
        });
    }, [setSettings, setModelStatus]);

    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsGenerating(false);
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
        setIsGenerating(true);
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
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [activeChatId, settings.textModel, updateChat]);

    const handleImageGeneration = useCallback(async (config: ImageGenConfig, messageToReplaceId?: string) => {
        if (viewMode === 'chat' && !activeChatId) return;
        if (viewMode === 'image-generator' && !activeImageSessionId) {
            addToast("Cannot generate: No active image session found.", "error");
            return;
        }

        setIsGenerating(true);
        abortControllerRef.current = new AbortController();

        const loadingMessageId = messageToReplaceId || `bot-loading-${Date.now()}`;

        if (viewMode === 'chat' && activeChatId) {
            if (messageToReplaceId) {
                updateChat(activeChatId, chat => ({ ...chat, messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, content: 'Generating...' } : m) }));
            } else {
                const loadingMessage: Message = { id: loadingMessageId, role: 'bot', type: 'loading', content: 'Generating...' };
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
            
            if (viewMode === 'chat' && activeChatId) {
                 updateChat(activeChatId, chat => ({
                    ...chat,
                    messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-img-${Date.now()}`, type: 'image', content: imageContent } : m)
                }));
            } else if (viewMode === 'image-generator' && activeImageSessionId) {
                const newGeneration: ImageGeneration = { id: `gen-${Date.now()}`, config, imageContent, timestamp: Date.now() };
                updateImageSession(activeImageSessionId, session => ({...session, generations: [newGeneration, ...session.generations]}));
            }

        } catch (error) {
            const friendlyError = handleFriendlyError(error, config.model);
            if (viewMode === 'chat' && activeChatId) {
                updateChat(activeChatId, chat => ({
                    ...chat,
                    messages: chat.messages.map(m => m.id === loadingMessageId ? { ...m, id: `bot-error-${Date.now()}`, type: 'error', content: friendlyError } : m)
                }));
            } else {
                addToast(friendlyError, 'error');
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [activeChatId, activeImageSessionId, viewMode, updateChat, updateImageSession, addToast]);
    
    const handleChatImageGeneration = useCallback(async (modificationRequest: string, imageToEdit: ImageContent) => {
        if (!activeChatId) return;
        setIsGenerating(true);
        abortControllerRef.current = new AbortController();

        const loadingMessage: Message = { id: `bot-loading-${Date.now()}`, role: 'bot', type: 'loading', content: 'Updating image...' };
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
            setIsGenerating(false);
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
    
    const handleSendMessage = useCallback((prompt: string, options: { imageToEdit?: ImageContent, numImages?: number }) => {
        if (!activeChatId || !activeChat) return;

        const { imageToEdit, numImages = 1 } = options;
        setImageToModify(null);

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', type: 'text', content: prompt };
        updateChat(activeChatId, chat => ({ ...chat, messages: [...chat.messages, userMessage] }));

        if (imageToEdit) {
            handleChatImageGeneration(prompt, imageToEdit);
            return;
        }

        // Use efficient, local intent classification instead of a slow API call
        if (isImageGenRequest(prompt)) {
            const cleanedPrompt = prompt.replace(/^\/(generate|draw|create|render|imagine|make|sketch|paint|illustrate)\s*/i, '').trim();
            handleImageGeneration({
                prompt: cleanedPrompt || prompt, // Fallback to original if cleaning results in empty string
                model: settings.imageModel,
                aspectRatio: '1:1',
                numImages: numImages,
                negativePrompt: ''
            });
        } else {
            // It's a text request
            handleTextGeneration([...activeChat.messages, userMessage], activeChat.systemInstruction);
        }
    }, [activeChat, activeChatId, settings.imageModel, updateChat, handleImageGeneration, handleTextGeneration, handleChatImageGeneration]);
    
    const handleStoryGeneration = useCallback(async (userPrompt: string) => {
        if (!activeStorySessionId || !activeStorySession) return;

        setIsGenerating(true);
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const isNewStory = activeStorySession.beats.length === 0;

        if (isNewStory) {
            updateStorySession(activeStorySessionId, session => ({
                ...session,
                premise: userPrompt,
                title: userPrompt.substring(0, 40) || 'New Story',
                beats: [],
            }));
        }

        try {
            const history = activeStorySession.beats;
            const premise = activeStorySession.premise || userPrompt;
            
            const scenes = await generateStoryContinuation(premise, history, userPrompt, settings.textModel, signal);
            if (signal.aborted) throw new Error('Aborted');

            // Create all loading beats first
            const loadingBeats: StoryBeat[] = scenes.map(scene => ({
                id: `loading-${Date.now()}-${Math.random()}`,
                userPrompt: userPrompt,
                storyText: scene.storyText,
                imagePrompt: scene.imagePrompt,
                imageUrl: '',
                isGenerating: true,
            }));
            
            updateStorySession(activeStorySessionId, session => ({ ...session, beats: [...session.beats, ...loadingBeats] }));

            // Sequentially generate images to avoid overwhelming the API
            for (const beat of loadingBeats) {
                if (signal.aborted) break;
                try {
                    const imageUrl = getImageUrl(beat.imagePrompt, { model: 'turbo', safe: false, aspectRatio: '3:4' });
                    
                    // Preload image
                    const img = new Image();
                    img.src = imageUrl;
                    await img.decode();
                    if (signal.aborted) break;

                    updateStorySession(activeStorySessionId, session => ({
                        ...session,
                        beats: session.beats.map(b =>
                            b.id === beat.id
                                ? { ...b, imageUrl, isGenerating: false, id: `beat-${Date.now()}-${Math.random()}` }
                                : b
                        )
                    }));
                } catch (imgError) {
                    if (signal.aborted) break;
                    console.error(`Failed to generate image for beat '${beat.storyText}':`, imgError);
                    updateStorySession(activeStorySessionId, session => ({
                        ...session,
                        beats: session.beats.map(b =>
                            b.id === beat.id ? { ...b, isGenerating: false, storyText: `${b.storyText}\n\n(Image generation failed)` } : b
                        )
                    }));
                }
            }

        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            addToast(`Story generation failed: ${friendlyError}`, 'error');
        } finally {
            if (!signal.aborted) {
                setIsGenerating(false);
                abortControllerRef.current = null;
            }
        }
    }, [activeStorySessionId, activeStorySession, updateStorySession, settings.textModel, addToast]);
    
    const handleStartStory = (premise: string) => {
        handleStoryGeneration(premise);
    };

    const handleContinueStory = (prompt: string) => {
        handleStoryGeneration(prompt);
    };

    const handleOpenStoryImageViewer = useCallback((beatId: string) => {
        if (!activeStorySession) return;
        
        const allStoryImages: ViewerImage[] = activeStorySession.beats
            .filter(beat => beat.imageUrl)
            .map(beat => ({
                url: beat.imageUrl,
                config: {
                    prompt: beat.imagePrompt,
                    model: settings.imageModel, // Use default as a fallback
                    aspectRatio: '3:4',
                    negativePrompt: '',
                    numImages: 1,
                    seed: undefined
                }
            }));
        
        const currentBeat = activeStorySession.beats.find(b => b.id === beatId);
        if (!currentBeat) return;
        
        const startIndex = allStoryImages.findIndex(img => img.url === currentBeat.imageUrl);
        
        if (startIndex !== -1) {
            setViewingImages({ images: allStoryImages, startIndex });
        }
    }, [activeStorySession, settings.imageModel]);

    const handleCheckModels = useCallback(async () => {
        setIsCheckingModels(true);
        setModelStatus(prev => {
            const next = {...prev};
            textModels.forEach(m => next[m] = 'checking');
            imageModels.forEach(m => next[m] = 'checking');
            return next;
        });

        const controller = new AbortController();
        const textPromises = textModels.map(model => 
            checkModelStatus(model, controller.signal).then(status => ({ model, status }))
        );
        const imagePromises = imageModels.map(model =>
            checkImageModelStatus(model, controller.signal).then(status => ({ model, status }))
        );

        const results = await Promise.all([...textPromises, ...imagePromises]);

        setModelStatus(prev => {
            const next = {...prev};
            results.forEach(({model, status}) => {
                next[model] = status;
            });
            return next;
        });

        setIsCheckingModels(false);
    }, [textModels, imageModels, setModelStatus]);
    
    const handleToggleMessageFavorite = useCallback((messageId: string) => {
        if (!activeChatId) return;
        updateChat(activeChatId, chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === messageId ? {...m, isFavorited: !m.isFavorited} : m)
        }));
        triggerHapticFeedback('light');
    }, [activeChatId, updateChat]);

    const handleContinueGeneration = useCallback((messageId: string) => {
        if (!activeChatId || !activeChat) return;
        const message = activeChat.messages.find(m => m.id === messageId);
        if (!message || typeof message.content !== 'string') return;
        
        const history = activeChat.messages.slice(0, activeChat.messages.findIndex(m => m.id === messageId) + 1);
        const systemInstruction = `Continue generating from the last assistant message.`;
        handleTextGeneration(history, systemInstruction);

    }, [activeChat, activeChatId, handleTextGeneration]);

    const handleRefineMessage = useCallback(async (messageId: string, option: RefineOption) => {
        if (!activeChatId || !activeChat) return;
        const message = activeChat.messages.find(m => m.id === messageId);
        if (!message || typeof message.content !== 'string') return;

        const systemInstruction = `You are a text refiner. Your task is to rewrite the following text to be ${option}. Only output the refined text, without any conversational filler or labels.`;
        const history: Message[] = [{ role: 'user', type: 'text', id: 'refine-req', content: message.content as string }];
        
        // Temporarily update the message to show it's being worked on
        updateChat(activeChatId, chat => ({
            ...chat,
            messages: chat.messages.map(m => m.id === messageId ? { ...m, type: 'loading', content: `Refining to be ${option}...` } : m)
        }));

        try {
            const refinedText = await generateText(history, settings.textModel, systemInstruction);
            // Replace the original message with the refined content
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === messageId ? { ...m, type: 'text', content: refinedText } : m)
            }));
        } catch (error) {
            const friendlyError = handleFriendlyError(error, settings.textModel);
            addToast(`Could not refine text: ${friendlyError}`, 'error');
            // Revert on error
            updateChat(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.map(m => m.id === messageId ? message : m)
            }));
        }

    }, [activeChat, activeChatId, settings.textModel, updateChat, addToast]);

    const handleShareMessage = useCallback(async (messageId: string) => {
        if (!activeChat) return;
        const message = activeChat.messages.find(m => m.id === messageId);
        if (!message || typeof message.content !== 'string') return;

        const shareData = {
            title: 'SHIGEN Chat Message',
            text: message.content,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                addToast('Message shared!', 'success');
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(message.content);
                addToast('Message content copied to clipboard!', 'success');
            } catch (err) {
                addToast('Could not copy text to clipboard.', 'error');
            }
        }
    }, [activeChat, addToast]);

    const handleGenerateAudioForMessage = useCallback(async (messageId: string) => {
        if (!activeChat || !audioPlayerRef.current) return;
        const message = activeChat.messages.find(m => m.id === messageId);

        if (!message || typeof message.content !== 'string' || message.content.trim().length === 0) return;
        
        if (currentlyPlayingMessageId === messageId) {
            audioPlayerRef.current.pause();
            setCurrentlyPlayingMessageId(null);
            return;
        }
        
        // Stop any other audio that might be playing to prevent overlap
        audioPlayerRef.current.pause();

        setCurrentlyPlayingMessageId(messageId);
        updateChat(activeChatId!, chat => ({ ...chat, messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: true } : m)}));

        try {
            const audioUrl = getAudioUrl(message.content, settings.audioModel, settings.audioVoice);
            audioPlayerRef.current.src = audioUrl;
            await audioPlayerRef.current.play();
            updateChat(activeChatId!, chat => ({...chat, messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: false } : m)}));
        } catch (error) {
            addToast("Couldn't play audio.", 'error');
            updateChat(activeChatId!, chat => ({...chat, messages: chat.messages.map(m => m.id === messageId ? { ...m, isGeneratingAudio: false } : m)}));
            setCurrentlyPlayingMessageId(null);
        }

    }, [activeChat, activeChatId, currentlyPlayingMessageId, settings.audioModel, settings.audioVoice, addToast, updateChat]);

    const handleReEdit = (config: ImageGenConfig) => {
        setReEditRequest(config);
        setViewMode('image-generator');
        onCloseAllModals();
    };

    const handleToggleFavorite = (image: FavoriteImage) => {
        setFavoritedImages(prev => {
            if (prev.some(fav => fav.url === image.url)) {
                return prev.filter(fav => fav.url !== image.url);
            } else {
                return [...prev, image];
            }
        });
    };
    
    const onCloseAllModals = () => {
        setSettingsOpen(false);
        setInstructionModalOpen(false);
        setImageFeedOpen(false);
        setTextFeedOpen(false);
        setFavoritesOpen(false);
        setViewingImages(null);
        setThemeGeneratorOpen(false);
    };

    const handleSettingsChange = (newSettings: Settings) => {
      // If the theme is being changed to a standard one, clear any custom AI theme styles
      if (settings.theme !== newSettings.theme) {
          document.body.style.cssText = '';
          setCustomUserDp(null);
      }
      setSettings(newSettings);
    };

    const handleDeleteChat = (id: string) => {
        const remaining = chatSessions.filter(c => c.id !== id);
        setChatSessions(remaining);
        if (activeChatId === id) {
            setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
        }
    };
    
    const handleDeleteImageSession = (id: string) => {
        const remaining = imageSessions.filter(s => s.id !== id);
        setImageSessions(remaining);
        if (activeImageSessionId === id) {
            setActiveImageSessionId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    const handleDeleteStorySession = (id: string) => {
        const remaining = storySessions.filter(s => s.id !== id);
        setStorySessions(remaining);
        if (activeStorySessionId === id) {
            setActiveStorySessionId(remaining.length > 0 ? remaining[0].id : null);
        }
    };
    
    const handleSetSystemInstruction = (instruction: string) => {
        if (!activeChatId) return;
        updateChat(activeChatId, chat => ({ ...chat, systemInstruction: instruction }));
        setInstructionModalOpen(false);
        addToast('Persona updated for this chat!', 'success');
    };

    const handleApplyAiTheme = (theme: GeneratedTheme) => {
        const body = document.body;
        // Clear all previous inline styles and classes
        body.style.cssText = '';
        body.className = '';

        // Apply new theme colors
        Object.entries(theme.colors).forEach(([key, value]) => {
            body.style.setProperty(key, value);
        });

        // Apply new theme wallpaper
        if (theme.wallpaperUrl) {
            body.style.backgroundImage = `url('${theme.wallpaperUrl}')`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundAttachment = 'fixed';
        }
        
        setCustomUserDp(theme.userDpUrl ?? null);

        addToast('Custom theme applied!', 'success');
        onCloseAllModals();
    };

    useEffect(() => {
        // This effect only applies standard themes. AI themes are applied via inline styles.
        // It won't run if an AI theme is active because we clear the classname when applying it.
        if (document.body.style.length === 0) {
            document.body.className = `theme-${settings.theme}`;
        }
    }, [settings.theme]);

    const renderView = () => {
        switch (viewMode) {
            case 'chat':
                return <ChatView
                    chatSession={activeChat}
                    onSendMessage={handleSendMessage}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    onOpenInstructionEditor={() => setInstructionModalOpen(true)}
                    isGenerating={isGenerating}
                    onCancel={handleCancelGeneration}
                    onImageSelect={setImageToModify}
                    selectedImage={imageToModify}
                    onToggleFavorite={handleToggleMessageFavorite}
                    onContinue={handleContinueGeneration}
                    onRefine={handleRefineMessage}
                    onShare={handleShareMessage}
                    promptFromFeed={promptFromFeed}
                    isOnline={isOnline}
                    onOpenViewer={(images, startIndex) => setViewingImages({ images, startIndex })}
                    onGenerateAudioForMessage={handleGenerateAudioForMessage}
                    onGenerateImageFromPrompt={handleGenerateImageFromPrompt}
                    customUserDp={customUserDp}
                />;
            case 'image-generator':
                return <ImageGeneratorView
                    session={activeImageSession}
                    defaultImageModel={settings.imageModel}
                    imageModels={imageModels}
                    isGenerating={isGenerating}
                    onGenerate={handleImageGeneration}
                    onCancel={handleCancelGeneration}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    isOnline={isOnline}
                    onOpenViewer={(images, startIndex) => setViewingImages({ images, startIndex })}
                    favoritedImageUrls={favoritedImageUrls}
                    reEditRequest={reEditRequest}
                    onReEditRequestConsumed={() => setReEditRequest(null)}
                    addToast={addToast}
                    onReEdit={handleReEdit}
                />;
            case 'story':
                return <StoryView
                    session={activeStorySession}
                    onStartStory={handleStartStory}
                    onContinueStory={handleContinueStory}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    isGenerating={isGenerating}
                    onCancel={handleCancelGeneration}
                    isOnline={isOnline}
                    onOpenViewer={handleOpenStoryImageViewer}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                viewMode={viewMode}
                onViewChange={setViewMode}
                chatSessions={chatSessions}
                activeChatId={activeChatId}
                onSelectChat={setActiveChatId}
                onNewChat={createNewChat}
                onDeleteChat={handleDeleteChat}
                imageSessions={imageSessions}
                activeImageSessionId={activeImageSessionId}
                onSelectImageSession={setActiveImageSessionId}
                onNewImageSession={createNewImageSession}
                onDeleteImageSession={handleDeleteImageSession}
                storySessions={storySessions}
                activeStorySessionId={activeStorySessionId}
                onSelectStorySession={setActiveStorySessionId}
                onNewStorySession={createNewStorySession}
                onDeleteStorySession={handleDeleteStorySession}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenImageFeed={() => setImageFeedOpen(true)}
                onOpenTextFeed={() => setTextFeedOpen(true)}
                favoritedImages={favoritedImages}
                onOpenViewer={(images, startIndex) => setViewingImages({ images, startIndex })}
                onOpenFavorites={() => setFavoritesOpen(true)}
                installStatus={installStatus}
                onInstallPwa={handleInstallPwa}
            />

            <main className="flex-1 flex flex-col min-w-0">
                {renderView()}
            </main>
            
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onSettingsChange={handleSettingsChange}
                textModels={textModels}
                imageModels={imageModels}
                modelStatus={modelStatus}
                onCheckModels={handleCheckModels}
                isCheckingModels={isCheckingModels}
                onOpenThemeGenerator={() => setThemeGeneratorOpen(true)}
            />
            
            <SystemInstructionModal
                isOpen={isInstructionModalOpen}
                onClose={() => setInstructionModalOpen(false)}
                currentInstruction={activeChat?.systemInstruction || ''}
                onSave={handleSetSystemInstruction}
            />

            <ImageFeed 
                isOpen={isImageFeedOpen}
                onClose={() => setImageFeedOpen(false)}
                onPromptSelect={(prompt) => {
                    setViewMode('chat');
                    setPromptFromFeed({ prompt, timestamp: Date.now() });
                    setImageFeedOpen(false);
                    setSidebarOpen(false);
                }}
            />

            <TextFeed 
                isOpen={isTextFeedOpen}
                onClose={() => setTextFeedOpen(false)}
                onPromptSelect={(prompt) => {
                    setViewMode('chat');
                    setPromptFromFeed({ prompt, timestamp: Date.now() });
                    setTextFeedOpen(false);
                    setSidebarOpen(false);
                }}
            />

            {viewingImages && (
                <ImageViewerModal
                    isOpen={true}
                    onClose={() => setViewingImages(null)}
                    images={viewingImages.images}
                    startIndex={viewingImages.startIndex}
                    favoritedImageUrls={favoritedImageUrls}
                    onToggleFavorite={handleToggleFavorite}
                    onReEdit={handleReEdit}
                />
            )}
            
            <FavoritesViewModal
                isOpen={isFavoritesOpen}
                onClose={() => setFavoritesOpen(false)}
                favoritedImages={favoritedImages}
                onOpenViewer={(startIndex) => setViewingImages({ images: favoritedImages, startIndex })}
                onToggleFavorite={handleToggleFavorite}
                onReEdit={handleReEdit}
            />

            <ThemeGeneratorModal
                isOpen={isThemeGeneratorOpen}
                onClose={() => setThemeGeneratorOpen(false)}
                onApplyTheme={handleApplyAiTheme}
                addToast={addToast}
            />

            <NotificationManager 
                notifications={notifications} 
                onDismiss={(id) => setNotifications(n => n.filter(toast => toast.id !== id))} 
            />

            {showIosBanner && <IosInstallBanner onClose={() => setShowIosBanner(false)} />}
        </div>
    );
};

export default App;