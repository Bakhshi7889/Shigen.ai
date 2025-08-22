






import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedTheme, ThemeColors, Notification } from '../types';
import CloseIcon from './icons/CloseIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import SparklesIcon from './icons/SparklesIcon';
import { generateTheme, getImageUrl } from '../services/pollinations';
import { triggerHapticFeedback } from '../lib/haptics';
import ImageIcon from './icons/ImageIcon';
import UserIcon from './icons/UserIcon';
import ImageWithLoader from './ImageWithLoader';

interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyTheme: (theme: GeneratedTheme) => void;
    addToast: (message: string, type?: Notification['type']) => void;
}
type InternalTheme = GeneratedTheme & { id: string };

const ThemePreviewCard: React.FC<{ theme: InternalTheme; onApply: (theme: GeneratedTheme) => void; }> = ({ theme, onApply }) => {
    const customStyles = theme.colors as React.CSSProperties;
    const areImagesReady = !!theme.userDpUrl && !!theme.wallpaperUrl;

    return (
        <div style={customStyles} className="bg-[var(--bg-color-800)] rounded-lg flex flex-col border border-[var(--bg-color-700)] transition-all hover:border-[var(--accent-color)]/50 hover:shadow-2xl hover:shadow-[var(--accent-color)]/10 animate-fade-in overflow-hidden group">

            {/* Chat UI Preview */}
            <div 
                style={{ backgroundImage: theme.wallpaperUrl ? `url(${theme.wallpaperUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} 
                className="w-full aspect-[9/16] relative flex flex-col bg-[var(--bg-color-900)]"
            >
                 {!theme.wallpaperUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <SpinnerIcon className="w-8 h-8 text-white/50" />
                    </div>
                )}
                 {theme.wallpaperUrl && <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>}


                <div className="relative p-2 space-y-3 flex-1 flex flex-col justify-end">
                    {/* User message */}
                    <div className="flex items-start gap-2 justify-end animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="bg-[var(--bg-color-700)] text-[var(--text-color-primary)] p-2 rounded-lg max-w-[70%] shadow-md">
                            <p className="text-xs">This theme looks amazing!</p>
                        </div>
                        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-[var(--bg-color-600)] overflow-hidden shadow-sm">
                            {theme.userDpUrl ? (
                                <img src={theme.userDpUrl} alt={theme.userDpIdea} className="w-full h-full object-cover"/>
                             ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <SpinnerIcon className="w-4 h-4 text-[var(--accent-color)]" />
                                </div>
                             )}
                        </div>
                    </div>
                    {/* Bot message */}
                    <div className="flex items-start gap-2 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-sm">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-[var(--bg-color-800)] text-[var(--text-color-primary)] p-2 rounded-lg max-w-[70%] shadow-md">
                            <p className="text-xs">I'm glad you think so. I've been styled with a custom palette.</p>
                        </div>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="relative p-2 bg-black/20 backdrop-blur-sm mt-auto">
                    <div className="bg-[var(--bg-color-800)] rounded-full p-1 flex items-center justify-between shadow-inner">
                        <p className="text-xs text-[var(--text-color-secondary)] ml-2">Message SHIGEN...</p>
                        <div className="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--bg-color-900)" className="w-4 h-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-3 bg-[var(--bg-color-900)]">
                 <h4 className="font-bold text-center text-[var(--text-color-primary)] truncate" title={theme.name}>{theme.name}</h4>
                 <p className="text-xs text-center text-[var(--text-color-secondary)] truncate mb-3" title={theme.wallpaperIdea}>{theme.wallpaperIdea}</p>
                <button
                    onClick={() => {
                        if (!areImagesReady) return;
                        triggerHapticFeedback('light');
                        onApply(theme);
                    }}
                    disabled={!areImagesReady}
                    className="w-full mt-auto px-4 py-2 rounded-md text-sm font-semibold transition-transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-color-900)' }}
                >
                    {areImagesReady ? 'Apply Theme' : <span className="flex items-center justify-center gap-2"><SpinnerIcon className="w-4 h-4" /> Loading Assets...</span>}
                </button>
            </div>
        </div>
    );
};


const ThemeGeneratorModal: React.FC<ThemeGeneratorModalProps> = ({ isOpen, onClose, onApplyTheme, addToast }) => {
    const [idea, setIdea] = useState('');
    const [generatedThemes, setGeneratedThemes] = useState<InternalTheme[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            setGeneratedThemes(null);
            setIdea('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const fetchImagesForTheme = async (theme: InternalTheme, signal: AbortSignal) => {
        try {
            const imageModel = 'turbo'; // Use turbo for speed as requested.
            // Avatar Generation
            const avatarUrl = getImageUrl(theme.userDpIdea, { model: imageModel, safe: false, aspectRatio: '1:1' });
            // Wallpaper Generation
            const wallpaperUrl = getImageUrl(theme.wallpaperIdea, { model: imageModel, safe: false, aspectRatio: '9:16' });

            // Fetch both in parallel
            const [avatarResponse, wallpaperResponse] = await Promise.all([
                fetch(avatarUrl, { method: 'HEAD', signal }),
                fetch(wallpaperUrl, { method: 'HEAD', signal })
            ]);

            if (signal.aborted) return;

            setGeneratedThemes(current => current?.map(t => t.id === theme.id ? { ...t, userDpUrl: avatarUrl, wallpaperUrl: wallpaperUrl } : t) || null);
            
        } catch (imgError) {
            if ((imgError as Error).name !== 'AbortError') {
                console.error(`Failed to generate images for theme '${theme.name}':`, imgError);
                 setGeneratedThemes(current => current?.map(t => t.id === theme.id ? { ...t, name: `${t.name} (Image Failed)` } : t) || null);
            }
        }
    };
    
    const handleGenerate = async () => {
        if (!idea.trim()) {
            addToast("Please enter a theme idea.", "error");
            return;
        }
        
        setIsLoading(true);
        setGeneratedThemes([]);
        triggerHapticFeedback('medium');

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            // Generate all 4 theme data objects in parallel for speed
            const themePromises = Array.from({ length: 4 }).map((_, i) => 
                generateTheme(idea, 'mistral-nemo-roblox', i + 1, signal)
            );

            const themeResults = await Promise.all(themePromises);
            if (signal.aborted) return;
            
            const themesWithIds: InternalTheme[] = themeResults.map((themeData, i) => ({
                ...themeData,
                id: `theme-${Date.now()}-${i}`
            }));

            setGeneratedThemes(themesWithIds);
            
            // Fire off all image fetches in parallel now that we have the data
            await Promise.all(themesWithIds.map(theme => fetchImagesForTheme(theme, signal)));

        } catch (error) {
             if ((error as Error).name !== 'AbortError') {
                console.error("Theme generation failed:", error);
                addToast("Sorry, couldn't generate themes. The AI might be busy.", "error");
                setGeneratedThemes(null);
            }
        } finally {
             if (!signal.aborted) {
                setIsLoading(false);
            }
        }
    };
    
    const renderContent = () => {
        if (isLoading && (!generatedThemes || generatedThemes.length === 0)) {
            return (
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <SpinnerIcon className="w-12 h-12 text-shigen-blue mb-4"/>
                    <p className="text-shigen-gray-300">Generating theme variations...</p>
                    <p className="text-sm text-shigen-gray-500">This may take a moment.</p>
                </div>
            )
        }
        if (generatedThemes && generatedThemes.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedThemes.map((theme) => (
                        <ThemePreviewCard key={theme.id} theme={theme} onApply={onApplyTheme} />
                    ))}
                </div>
            )
        }
        return (
            <div className="flex flex-col items-center justify-center text-center h-full">
                <PaintBrushIcon className="w-16 h-16 text-shigen-blue mb-4"/>
                <h3 className="text-lg text-shigen-gray-300 font-semibold">Generate a UI Theme with AI</h3>
                <p className="text-sm text-shigen-gray-500 mt-1 max-w-sm">Describe an idea, a mood, or a concept, and SHIGEN will generate four unique color palettes, avatars, and wallpapers for you to preview and apply.</p>
            </div>
        )
    };


    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fade-in ${isOpen ? 'visible' : 'invisible'}`} onClick={onClose}>
            <div className="bg-shigen-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col p-6 relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <PaintBrushIcon className="w-6 h-6 text-shigen-blue"/>
                        <h2 className="text-xl font-semibold text-shigen-gray-300">AI Theme Generator</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-shigen-gray-500 hover:text-shigen-gray-300 transition" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto -mr-3 pr-3">
                    {renderContent()}
                </div>

                <div className="flex-shrink-0 pt-4 mt-4 border-t border-shigen-gray-700/50">
                    <div className="flex items-center gap-3">
                        <input 
                            type="text"
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="e.g., 'deep sea bioluminescence' or 'vintage sci-fi'"
                            className="flex-grow bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-3 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition"
                            disabled={isLoading}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleGenerate(); }}
                        />
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="px-6 py-3 rounded-md bg-shigen-blue text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
                            <span>Generate</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeGeneratorModal;