import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedTheme, Notification } from '../types';
import CloseIcon from './icons/CloseIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import SparklesIcon from './icons/SparklesIcon';
import { generateTheme, getImageUrl } from '../services/pollinations';
import { triggerHapticFeedback } from '../lib/haptics';

interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyTheme: (theme: GeneratedTheme) => void;
    addToast: (message: string, type?: Notification['type']) => void;
    textModel: string;
}
type InternalTheme = GeneratedTheme & { id: string };

const ThemePreviewCard: React.FC<{ theme: InternalTheme; onApply: (theme: GeneratedTheme) => void; }> = ({ theme, onApply }) => {
    const customStyles = {
        '--color-background': theme.colors['--color-background'],
        '--color-surface': theme.colors['--color-surface'],
        '--color-surface-variant': theme.colors['--color-surface-variant'],
        '--color-primary': theme.colors['--color-primary'],
        '--color-primary-container': theme.colors['--color-primary-container'],
        '--color-secondary': theme.colors['--color-secondary'],
        '--color-outline': theme.colors['--color-outline'],
        '--color-on-background': theme.colors['--color-on-background'],
        '--color-on-surface': theme.colors['--color-on-surface'],
        '--color-on-surface-variant': theme.colors['--color-on-surface-variant'],
        '--color-on-primary': theme.colors['--color-on-primary'],
        '--color-on-primary-container': theme.colors['--color-on-primary-container'],
        '--color-on-secondary': theme.colors['--color-on-secondary'],
        '--color-shadow': theme.colors['--color-shadow'],
    } as React.CSSProperties;

    return (
        <div style={customStyles} className="bg-background rounded-2xl flex flex-col border border-outline transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 animate-fade-in overflow-hidden group">
            <div 
                style={{ backgroundImage: theme.wallpaperUrl ? `url(${theme.wallpaperUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} 
                className="w-full aspect-[9/16] relative flex flex-col bg-background"
            >
                 {!theme.wallpaperUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <SpinnerIcon className="w-8 h-8 text-white/50" />
                    </div>
                )}
                 {theme.wallpaperUrl && <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>}

                <div className="relative p-2 space-y-3 flex-1 flex flex-col justify-end">
                    <div className="flex items-start gap-2 justify-end animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="bg-primary-container text-on-primary-container p-2 rounded-lg max-w-[70%] shadow-md">
                            <p className="text-xs">This theme looks amazing!</p>
                        </div>
                        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-secondary overflow-hidden shadow-sm">
                            {theme.userDpUrl ? (
                                <img src={theme.userDpUrl} alt={theme.userDpIdea} className="w-full h-full object-cover"/>
                             ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <SpinnerIcon className="w-4 h-4 text-primary" />
                                </div>
                             )}
                        </div>
                    </div>
                    <div className="flex items-start gap-2 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                        <div className="w-6 h-6 rounded-full flex-shrink-0 bg-primary flex items-center justify-center shadow-sm">
                            <SparklesIcon className="w-4 h-4 text-on-primary" />
                        </div>
                        <div className="bg-surface p-2 rounded-lg max-w-[70%] shadow-md text-on-surface">
                            <p className="text-xs">I'm glad you think so. I've been styled with a custom palette.</p>
                        </div>
                    </div>
                </div>

                <div className="relative p-2 bg-black/20 backdrop-blur-sm mt-auto">
                    <div className="bg-surface rounded-full p-1 flex items-center justify-between shadow-inner">
                        <p className="text-xs text-on-surface-variant ml-2">Message SHIGEN...</p>
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-on-primary)" className="w-4 h-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-3 bg-surface">
                 <h4 className="font-bold text-center text-on-surface truncate" title={theme.name}>{theme.name}</h4>
                 <p className="text-xs text-center text-on-surface-variant truncate mb-3" title={theme.wallpaperIdea}>{theme.wallpaperIdea}</p>
                <button
                    onClick={() => {
                        triggerHapticFeedback('light');
                        onApply(theme);
                    }}
                    className="w-full mt-auto px-4 py-2 rounded-full text-sm font-semibold transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none bg-primary text-on-primary"
                >
                    Apply Theme
                </button>
            </div>
        </div>
    );
};


const ThemeGeneratorModal: React.FC<ThemeGeneratorModalProps> = ({ isOpen, onClose, onApplyTheme, addToast, textModel }) => {
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
            const imageModel = 'turbo';
            const avatarUrl = getImageUrl(theme.userDpIdea, { model: imageModel, safe: false, aspectRatio: '1:1' });
            const wallpaperUrl = getImageUrl(theme.wallpaperIdea, { model: imageModel, safe: false, aspectRatio: '9:16' });
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

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const themePromises = Array.from({ length: 4 }).map((_, i) => 
                generateTheme(idea, textModel, i + 1, signal)
            );

            const themeResults = await Promise.all(themePromises);
            if (signal.aborted) return;
            
            const themesWithIds: InternalTheme[] = themeResults.map((themeData, i) => ({
                ...themeData,
                id: `theme-${Date.now()}-${i}`
            }));

            setGeneratedThemes(themesWithIds);
            
            Promise.all(themesWithIds.map(theme => fetchImagesForTheme(theme, signal)));

        } catch (error) {
             if ((error as Error).name !== 'AbortError') {
                console.error("Theme generation failed:", error);
                addToast("Sorry, couldn't generate themes. The AI might be busy.", "error");
                setGeneratedThemes(null);
            }
        } finally {
             if (!signal.aborted) setIsLoading(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading && (!generatedThemes || generatedThemes.length === 0)) {
            return (
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <SpinnerIcon className="w-12 h-12 text-primary mb-4"/>
                    <p className="text-on-surface">Generating theme variations...</p>
                    <p className="text-sm text-on-surface-variant">This may take a moment.</p>
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
                <PaintBrushIcon className="w-16 h-16 text-primary mb-4"/>
                <h3 className="text-lg text-on-surface font-semibold">Generate a UI Theme with AI</h3>
                <p className="text-sm text-on-surface-variant mt-1 max-w-sm">Describe an idea, a mood, or a concept, and SHIGEN will generate four unique color palettes, avatars, and wallpapers for you to preview and apply.</p>
            </div>
        )
    };


    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center ${isOpen ? 'visible' : 'invisible'}`} onClick={onClose}>
            <div className="bg-background rounded-t-3xl md:rounded-2xl shadow-soft w-full max-w-4xl h-[90vh] flex flex-col p-6 relative animate-slide-in-up md:animate-spring-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <PaintBrushIcon className="w-6 h-6 text-primary"/>
                        <h2 className="text-xl font-semibold text-on-surface">AI Theme Generator</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface transition" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto -mr-3 pr-3">
                    {renderContent()}
                </div>

                <div className="flex-shrink-0 pt-4 mt-4 border-t border-outline">
                    <div className="flex items-center gap-3">
                        <input 
                            type="text"
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="e.g., 'deep sea bioluminescence' or 'vintage sci-fi'"
                            className="flex-grow bg-surface-variant border-outline rounded-full p-3 text-on-surface focus:ring-2 focus:ring-primary transition"
                            disabled={isLoading}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleGenerate(); }}
                        />
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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