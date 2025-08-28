

import React, { useState, useRef, useEffect } from 'react';
import type { StorySession, StoryBeat, FavoriteStoryBeat } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import ImageWithLoader from './ImageWithLoader';
import { triggerHapticFeedback } from '../lib/haptics';
import BookOpenIcon from './icons/BookOpenIcon';
import SendIcon from './icons/SendIcon';
import ViewGridIcon from './icons/ViewGridIcon';
import ViewListIcon from './icons/ViewListIcon';
import EditIcon from './icons/EditIcon';
import FilmIcon from './icons/FilmIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PaperClipIcon from './icons/PaperClipIcon';
import CloseIcon from './icons/CloseIcon';
import StarIcon from './icons/StarIcon';
import SparklesIcon from './icons/SparklesIcon';

interface StoryViewProps {
  session: StorySession | undefined;
  onStartStory: (premise: string) => void;
  onContinueStory: (prompt: string) => void;
  onOpenSidebar: () => void;
  isGenerating: boolean;
  onCancel: () => void;
  isOnline: boolean;
  onOpenViewer: (beatId: string) => void;
  onUpdateSession: (updates: Partial<StorySession>) => void;
  onToggleFavorite: (beat: StoryBeat) => void;
}

type StoryDisplayMode = 'comic' | 'scroll' | 'cinematic';

const ManualAddBeatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAddBeat: (data: { imageUrl: string; storyText: string }) => void;
}> = ({ isOpen, onClose, onAddBeat }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [storyText, setStoryText] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (imageUrl.trim() && storyText.trim()) {
            onAddBeat({ imageUrl, storyText });
            setImageUrl('');
            setStoryText('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="glassmorphic-surface rounded-2xl shadow-soft w-full max-w-lg p-6 relative animate-spring-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-semibold mb-4 text-on-surface">Manually Add Scene</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="imageUrl" className="block text-sm font-medium text-on-surface-variant mb-1.5">Image URL</label>
                        <input
                            id="imageUrl"
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            required
                            className="w-full bg-surface-variant rounded-xl p-2.5 text-on-surface focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="storyText" className="block text-sm font-medium text-on-surface-variant mb-1.5">Story Text</label>
                        <textarea
                            id="storyText"
                            value={storyText}
                            onChange={(e) => setStoryText(e.target.value)}
                            placeholder="The story continues..."
                            required
                            rows={4}
                            className="w-full bg-surface-variant rounded-xl p-2.5 text-on-surface resize-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 rounded-full bg-primary text-on-primary hover:opacity-90 transition">
                            Add Scene
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PremiseInput: React.FC<{ 
    onStart: (premise: string) => void; 
    isGenerating: boolean; 
}> = ({ onStart, isGenerating }) => {
    const [premise, setPremise] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (premise.trim() && !isGenerating) {
            triggerHapticFeedback('heavy');
            onStart(premise.trim());
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            <BookOpenIcon className="w-20 h-20 text-primary mb-4" />
            <h2 className="text-3xl font-bold text-on-surface mb-2">Illustrated Story Generator</h2>
            <p className="max-w-xl text-on-surface-variant mb-8">Describe the initial premise. The AI will create a main character and the opening scenes for your story.</p>
            
            <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-4">
                <div>
                    <label htmlFor="premise" className="text-left block text-sm font-medium text-on-surface-variant mb-1.5">Story Premise *</label>
                    <textarea
                        id="premise"
                        value={premise}
                        onChange={e => setPremise(e.target.value)}
                        placeholder="e.g., A lone detective in a city where it always rains neon..."
                        className="w-full bg-surface border-outline rounded-2xl p-4 text-base resize-none focus:ring-2 focus:ring-primary transition shadow-soft"
                        rows={3}
                        required
                        disabled={isGenerating}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isGenerating || !premise.trim()}
                    className="w-full flex items-center justify-center p-3 rounded-full text-lg font-bold transition-transform active:scale-95 disabled:opacity-50 bg-primary text-on-primary hover:opacity-90 mt-4"
                >
                    {isGenerating ? <SpinnerIcon className="w-7 h-7" /> : 'Generate Story'}
                </button>
            </form>
        </div>
    );
};

const StoryBeatCard: React.FC<{ beat: StoryBeat; onOpenViewer: (beatId: string) => void; displayMode: StoryDisplayMode; onToggleFavorite: (beat: StoryBeat) => void; }> = ({ beat, onOpenViewer, displayMode, onToggleFavorite }) => {
    const isComicMode = displayMode === 'comic';
    
    const content = (
        <>
            <div className={`w-full bg-surface-variant overflow-hidden relative group ${isComicMode ? 'aspect-[3/4] rounded-2xl' : 'aspect-video md:aspect-[3/4] rounded-t-2xl'}`}>
                {beat.isGenerating || !beat.imageUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-surface-variant shimmer">
                        <SparklesIcon className="w-10 h-10 text-primary/40 animate-pulse-slow" />
                        <p className="text-sm text-on-surface-variant font-semibold animate-pulse mt-2">{beat.storyText.includes("writing") || beat.storyText.includes("crafting") ? "Writing story..." : "Painting scene..."}</p>
                    </div>
                ) : (
                    <>
                        <ImageWithLoader src={beat.imageUrl} alt={beat.imagePrompt} />
                        <div
                            onClick={() => onOpenViewer(beat.id)} 
                            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                            <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full">Zoom</span>
                        </div>
                        <button onClick={() => onToggleFavorite(beat)} className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Favorite this scene">
                            <StarIcon className={`w-5 h-5 ${beat.isFavorited ? 'text-yellow-400' : ''}`} isFilled={!!beat.isFavorited} />
                        </button>
                    </>
                )}
            </div>
             {!beat.isGenerating && (
                <div className={`${isComicMode ? 'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white' : 'p-5 bg-surface text-on-surface rounded-b-2xl'}`}>
                    <p className={`whitespace-pre-wrap ${isComicMode ? 'text-sm' : ''}`}>{beat.storyText}</p>
                </div>
            )}
        </>
    );

    if (isComicMode) {
        return <div className="relative rounded-2xl shadow-soft animate-spring-in border border-outline overflow-hidden card-3d-effect">{content}</div>
    }

    return <div className="bg-surface border border-outline rounded-2xl shadow-soft animate-fade-in-up">{content}</div>;
};

const StoryContinuationControls: React.FC<{ onContinue: (prompt: string) => void; isGenerating: boolean; onOpenManualAdd: () => void; }> = ({ onContinue, isGenerating, onOpenManualAdd }) => {
    const [input, setInput] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isGenerating || !input.trim()) return;
        triggerHapticFeedback('medium');
        onContinue(input.trim());
        setInput('');
    };
    return (
        <div className={`fixed bottom-0 left-0 right-0 p-4 bg-transparent z-10 transition-opacity duration-300 ${isGenerating ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative glassmorphic rounded-3xl p-2 shadow-strong flex items-end gap-2 max-w-4xl mx-auto">
                <button
                    type="button"
                    onClick={onOpenManualAdd}
                    disabled={isGenerating}
                    className="p-3 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50"
                    aria-label="Manually add scene with image and text"
                >
                    <PaperClipIcon className="w-6 h-6" />
                </button>
                <form onSubmit={handleSubmit} className="flex-grow flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                        placeholder="What happens next?"
                        className="w-full bg-transparent pt-3 pb-2 px-2 text-base resize-none focus:outline-none text-on-surface"
                        rows={1}
                        style={{ minHeight: '48px' }}
                        disabled={isGenerating}
                    />
                    <button type="submit" disabled={isGenerating || !input.trim()} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 enabled:bg-primary enabled:text-on-primary">
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

const StoryHeader: React.FC<{
    session: StorySession;
    onUpdateSession: StoryViewProps['onUpdateSession'];
}> = ({ session, onUpdateSession }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [premise, setPremise] = useState(session.premise);
    const [character, setCharacter] = useState(session.characterDescription || '');

    useEffect(() => {
        setPremise(session.premise);
        setCharacter(session.characterDescription || '');
    }, [session.premise, session.characterDescription]);

    const handleSave = () => {
        onUpdateSession({ premise, characterDescription: character });
        setIsEditing(false);
    }
    
    if (isEditing) {
        return (
            <div className="bg-surface/50 p-4 rounded-2xl border border-outline space-y-3 animate-fade-in">
                <div>
                     <label className="text-xs font-semibold text-on-surface-variant">PREMISE</label>
                     <textarea value={premise} onChange={e => setPremise(e.target.value)} className="w-full bg-surface-variant p-2 rounded-lg mt-1"/>
                </div>
                <div>
                     <label className="text-xs font-semibold text-on-surface-variant">CHARACTER</label>
                     <textarea value={character} onChange={e => setCharacter(e.target.value)} className="w-full bg-surface-variant p-2 rounded-lg mt-1"/>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm rounded-full hover:bg-surface-variant">Cancel</button>
                    <button onClick={handleSave} className="px-3 py-1 text-sm rounded-full bg-primary text-on-primary">Save</button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface/50 p-4 rounded-2xl border border-outline relative group">
            <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-surface-variant transition-opacity">
                <EditIcon className="w-4 h-4" />
            </button>
            <div>
                <p className="text-xs font-semibold text-on-surface-variant">PREMISE</p>
                <p className="text-on-surface-variant mt-1 italic">"{session.premise}"</p>
            </div>
            {session.characterDescription && (
                <div className="mt-3 pt-3 border-t border-outline/50">
                    <p className="text-xs font-semibold text-on-surface-variant">CHARACTER</p>
                    <p className="text-on-surface-variant mt-1">"{session.characterDescription}"</p>
                </div>
            )}
        </div>
    )
}


const StoryView: React.FC<StoryViewProps> = ({
    session, onStartStory, onContinueStory, onOpenSidebar, isGenerating, onCancel, isOnline, onOpenViewer, onUpdateSession, onToggleFavorite
}) => {
    const mainRef = useRef<HTMLElement>(null);
    const [displayMode, setDisplayMode] = useState<StoryDisplayMode>('comic');
    const [cinematicIndex, setCinematicIndex] = useState(0);
    const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
    const lastBeatCount = useRef(session?.beats.length ?? 0);

    useEffect(() => {
        if (session?.beats) {
            if (session.beats.length > lastBeatCount.current) {
                if(displayMode === 'cinematic') {
                    setCinematicIndex(session.beats.length - 1);
                }
                if (mainRef.current && displayMode === 'scroll') {
                    mainRef.current.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
                }
            }
            if (cinematicIndex >= session.beats.length) {
                setCinematicIndex(Math.max(0, session.beats.length - 1));
            }
        }
        lastBeatCount.current = session?.beats.length ?? 0;
    }, [session?.beats, displayMode, cinematicIndex]);

    const handleDisplayModeChange = (mode: StoryDisplayMode) => {
        if (mode === 'cinematic') setCinematicIndex(session?.beats.length ? session.beats.length - 1 : 0);
        setDisplayMode(mode);
    };

    const handleAddManualBeat = ({ imageUrl, storyText }: { imageUrl: string; storyText: string }) => {
        if (!session) return;
        const newBeat: StoryBeat = {
            id: `beat-manual-${Date.now()}`,
            storyText,
            imageUrl,
            imagePrompt: 'Manually added image.',
            userPrompt: 'Manually added scene.',
            isGenerating: false,
        };
        onUpdateSession({ beats: [...session.beats, newBeat] });
        setIsManualAddModalOpen(false);
    };
    
    const renderStoryContent = () => {
        if (!session) return null;

        if (displayMode === 'cinematic') {
            const currentBeat = session.beats[cinematicIndex];
            return (
                <div className="flex flex-col items-center">
                    {currentBeat ? (
                         <div className="w-full max-w-lg animate-fade-in">
                            <StoryBeatCard beat={currentBeat} onOpenViewer={onOpenViewer} displayMode="scroll" onToggleFavorite={onToggleFavorite} />
                         </div>
                    ) : (
                        <div className="text-center text-on-surface-variant py-10">No scenes to display yet.</div>
                    )}
                   
                    {session.beats.length > 1 && (
                         <div className="flex items-center gap-4 mt-4 text-on-surface">
                            <button onClick={() => setCinematicIndex(p => p > 0 ? p - 1 : p)} disabled={cinematicIndex === 0} className="p-2 rounded-full hover:bg-surface-variant disabled:opacity-50">
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <span className="font-semibold">{cinematicIndex + 1} / {session.beats.length}</span>
                            <button onClick={() => setCinematicIndex(p => p < session.beats.length - 1 ? p + 1 : p)} disabled={cinematicIndex === session.beats.length - 1} className="p-2 rounded-full hover:bg-surface-variant disabled:opacity-50">
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                         </div>
                    )}
                </div>
            );
        }

        return (
             <div className={displayMode === 'comic' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-8'}>
                {session.beats.map((beat) => (
                    <StoryBeatCard key={beat.id} beat={beat} onOpenViewer={onOpenViewer} displayMode={displayMode} onToggleFavorite={onToggleFavorite} />
                ))}
             </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent">
            <header className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-background/80 backdrop-blur-md z-20">
                <div className="flex items-center space-x-2">
                    <div className="flex items-center gap-3">
                         <BookOpenIcon className="w-6 h-6 text-primary" />
                        <h1 className="text-lg font-semibold">{session?.title || 'New Story'}</h1>
                    </div>
                </div>
                 <div className='flex items-center gap-2'>
                    {!isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
                     {session && (session.premise || session.beats.length > 0) && (
                         <div className="p-1 bg-surface-variant rounded-full flex items-center">
                            <button onClick={() => handleDisplayModeChange('comic')} title="Comic View" className={`p-1.5 rounded-full ${displayMode === 'comic' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}><ViewGridIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleDisplayModeChange('scroll')} title="Scroll View" className={`p-1.5 rounded-full ${displayMode === 'scroll' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}><ViewListIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleDisplayModeChange('cinematic')} title="Cinematic View" className={`p-1.5 rounded-full ${displayMode === 'cinematic' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}><FilmIcon className="w-5 h-5"/></button>
                         </div>
                     )}
                    {isGenerating && (
                        <button onClick={onCancel} className="flex items-center justify-center gap-2 text-sm px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors"><SpinnerIcon className="w-4 h-4" /><span>Cancel</span></button>
                    )}
                 </div>
            </header>

            <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 relative">
                <div className="max-w-4xl mx-auto">
                    {session && !session.premise && session.beats.length === 0 && <PremiseInput onStart={onStartStory} isGenerating={isGenerating} />}
                    {session && (session.premise || session.beats.length > 0) && (
                        <div className="space-y-8">
                             {session.premise && <StoryHeader session={session} onUpdateSession={onUpdateSession} />}
                             {renderStoryContent()}
                        </div>
                    )}
                </div>
            </main>
            {session && (session.premise || session.beats.length > 0) && <StoryContinuationControls onContinue={onContinueStory} isGenerating={isGenerating} onOpenManualAdd={() => setIsManualAddModalOpen(true)} />}
            <ManualAddBeatModal isOpen={isManualAddModalOpen} onClose={() => setIsManualAddModalOpen(false)} onAddBeat={handleAddManualBeat} />
        </div>
    );
};

export default StoryView;