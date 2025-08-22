


import React, { useState, useRef, useEffect } from 'react';
import type { StorySession, StoryBeat } from '../types';
import MenuIcon from './icons/MenuIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ImageWithLoader from './ImageWithLoader';
import { triggerHapticFeedback } from '../lib/haptics';
import BookOpenIcon from './icons/BookOpenIcon';
import SendIcon from './icons/SendIcon';

interface StoryViewProps {
  session: StorySession | undefined;
  onStartStory: (premise: string) => void;
  onContinueStory: (prompt: string) => void;
  onOpenSidebar: () => void;
  isGenerating: boolean;
  onCancel: () => void;
  isOnline: boolean;
  onOpenViewer: (beatId: string) => void;
}

const PremiseInput: React.FC<{ onStart: (premise: string) => void; isGenerating: boolean; }> = ({ onStart, isGenerating }) => {
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
            <BookOpenIcon className="w-20 h-20 text-shigen-blue mb-4" />
            <h2 className="text-3xl font-bold text-shigen-gray-300 mb-2">Start a New Story</h2>
            <p className="max-w-md text-shigen-gray-500 mb-8">Describe the initial premise, character, or setting. The AI will generate an illustrated storyboard based on your idea.</p>
            
            <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
                <textarea
                    value={premise}
                    onChange={e => setPremise(e.target.value)}
                    placeholder="e.g., A lone detective in a city where it always rains neon..."
                    className="w-full bg-shigen-gray-800 border-shigen-gray-700 rounded-lg p-4 text-lg resize-none focus:ring-2 focus:ring-shigen-blue focus:border-shigen-blue transition"
                    rows={3}
                    disabled={isGenerating}
                />
                <button
                    type="submit"
                    disabled={isGenerating || !premise.trim()}
                    className="w-full flex items-center justify-center p-3 rounded-lg text-lg font-bold transition-colors disabled:opacity-50 bg-shigen-blue text-white hover:bg-blue-500"
                >
                    {isGenerating ? <SpinnerIcon className="w-7 h-7" /> : 'Generate Story'}
                </button>
            </form>
        </div>
    );
};

const StoryBeatCard: React.FC<{ beat: StoryBeat; onOpenViewer: (beatId: string) => void; }> = ({ beat, onOpenViewer }) => {
    const cardContent = () => {
        if (beat.isGenerating || !beat.imageUrl) {
            return (
                <>
                    <div className="w-full aspect-[3/4] bg-shigen-gray-700 rounded-t-lg overflow-hidden flex flex-col items-center justify-center">
                        {beat.isGenerating ? (
                            <SpinnerIcon className="w-10 h-10 text-shigen-blue" />
                        ) : (
                            <span className="text-red-400 font-bold">Image Error</span>
                        )}
                    </div>
                    <div className="p-5">
                         <p className="text-shigen-gray-300 whitespace-pre-wrap">{beat.storyText}</p>
                         {beat.isGenerating && <p className="text-sm text-shigen-gray-500 animate-pulse mt-2">Generating image...</p>}
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="w-full aspect-[3/4] bg-shigen-gray-700 rounded-t-lg overflow-hidden relative group">
                    <ImageWithLoader src={beat.imageUrl} alt={beat.imagePrompt} />
                    <div
                        onClick={() => onOpenViewer(beat.id)} 
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                          <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full">View Image</span>
                      </div>
                </div>
                <div className="p-5">
                    <p className="text-shigen-gray-300 whitespace-pre-wrap">{beat.storyText}</p>
                </div>
            </>
        )
    };
    
    return (
        <div className="bg-shigen-gray-800 border border-shigen-gray-700/50 rounded-lg shadow-lg animate-spring-in">
            {cardContent()}
        </div>
    );
};

const StoryContinuationControls: React.FC<{ onContinue: (prompt: string) => void; isGenerating: boolean; }> = ({ onContinue, isGenerating }) => {
    const [input, setInput] = useState('');
    
    const handleAction = (actionPrompt: string) => {
        if (isGenerating) return;
        triggerHapticFeedback('light');
        onContinue(actionPrompt);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isGenerating || !input.trim()) return;
        triggerHapticFeedback('medium');
        onContinue(input.trim());
        setInput('');
    };

    const actionButtons = [
        { label: "Continue", prompt: "Continue the story naturally." },
        { label: "Add Twist", prompt: "Introduce a surprising plot twist." },
        { label: "Spicy", prompt: "Make the story more intense, dramatic, or romantic." },
        { label: "Go Deeper", prompt: "Describe the current character's inner thoughts and feelings in more detail." }
    ];

    return (
        <div className="mt-8 animate-fade-in space-y-4">
            <div className="flex flex-wrap gap-2">
                {actionButtons.map(btn => (
                    <button key={btn.label} onClick={() => handleAction(btn.prompt)} disabled={isGenerating} className="px-3 py-1.5 text-sm bg-shigen-gray-700 hover:bg-shigen-gray-600 rounded-full transition-colors text-shigen-gray-300 disabled:opacity-50">
                        {btn.label}
                    </button>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { handleSubmit(e); } }}
                    placeholder="What happens next?"
                    className="w-full bg-shigen-gray-800 border-shigen-gray-700 rounded-lg p-4 pr-14 text-base resize-none focus:ring-2 focus:ring-shigen-blue focus:border-shigen-blue transition"
                    rows={2}
                    disabled={isGenerating}
                />
                 <button type="submit" disabled={isGenerating || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors disabled:opacity-50 enabled:bg-shigen-blue enabled:text-white">
                    <SendIcon className="w-6 h-6" />
                 </button>
            </form>
        </div>
    );
};


const StoryView: React.FC<StoryViewProps> = ({
    session, onStartStory, onContinueStory, onOpenSidebar, isGenerating, onCancel, isOnline, onOpenViewer,
}) => {
    const mainRef = useRef<HTMLElement>(null);
    const lastBeatCount = useRef(session?.beats.length ?? 0);

    useEffect(() => {
        if (mainRef.current && session && session.beats.length > lastBeatCount.current) {
            // Only scroll when a new beat is added, not when an existing one is updated (e.g. image loads)
            const mainEl = mainRef.current;
            mainEl.scrollTo({
                top: mainEl.scrollHeight,
                behavior: 'smooth'
            });
        }
        lastBeatCount.current = session?.beats.length ?? 0;
    }, [session?.beats]);
    
    return (
        <div className="flex-1 flex flex-col h-screen bg-shigen-gray-900">
            <header className="flex items-center justify-between p-4 border-b border-shigen-gray-700/50 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <button onClick={onOpenSidebar} className="p-2 rounded-full hover:bg-shigen-gray-700 md:hidden" aria-label="Open sidebar"><MenuIcon className="w-6 h-6" /></button>
                    <div className="flex items-center gap-3">
                         <BookOpenIcon className="w-6 h-6 text-shigen-blue" />
                        <h1 className="text-lg font-medium">{session?.title || 'New Story'}</h1>
                        {!isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
                    </div>
                </div>
                 {isGenerating && (
                    <button
                        onClick={onCancel}
                        className="flex items-center justify-center gap-2 text-sm px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
                        aria-label="Cancel generation"
                    >
                        <SpinnerIcon className="w-4 h-4" />
                        <span>Cancel</span>
                    </button>
                )}
            </header>

            <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto h-full">
                    {session && !session.premise && session.beats.length === 0 && <PremiseInput onStart={onStartStory} isGenerating={isGenerating} />}
                    {session && (session.premise || session.beats.length > 0) && (
                        <div className="space-y-8">
                             {session.premise && (
                                <div className="bg-shigen-gray-800/50 p-4 rounded-lg border border-shigen-gray-700/50 animate-fade-in-up">
                                    <h3 className="font-semibold text-lg text-shigen-gray-300">Story Premise</h3>
                                    <p className="text-shigen-gray-400 mt-1 italic">"{session.premise}"</p>
                                </div>
                            )}
                            {session.beats.map(beat => <StoryBeatCard key={beat.id} beat={beat} onOpenViewer={onOpenViewer} />)}
                            
                            {session.beats.length > 0 && !isGenerating && (
                                <StoryContinuationControls onContinue={onContinueStory} isGenerating={isGenerating} />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StoryView;