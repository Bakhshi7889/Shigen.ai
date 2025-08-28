

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ImageGenConfig, ImageGeneration, ImageSession, FavoriteImage, PromptHelperStatus, Notification, ViewerImage } from '../types';
import ImageIcon from './icons/ImageIcon';
import MagicWandIcon from './icons/MagicWandIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ImageWithLoader from './ImageWithLoader';
import SparklesIcon from './icons/SparklesIcon';
import CloseIcon from './icons/CloseIcon';
import { enhanceImagePrompt, getRandomImagePrompt } from '../services/pollinations';
import { triggerHapticFeedback } from '../lib/haptics';
import LockClosedIcon from './icons/LockClosedIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import BroomIcon from './icons/BroomIcon';
import TuneIcon from './icons/TuneIcon';

interface ImageGeneratorViewProps {
    session: ImageSession | undefined;
    defaultImageModel: string;
    imageModels: string[];
    isGenerating: boolean;
    pendingGeneration: ImageGenConfig | null;
    onGenerate: (config: Omit<ImageGenConfig, 'seed'> & { seed?: number }) => void;
    onCancel: () => void;
    onOpenSidebar: () => void;
    isOnline: boolean;
    onOpenViewer: (images: ViewerImage[], startIndex: number) => void;
    favoritedImageUrls: Set<string>;
    reEditRequest: ImageGenConfig | null;
    onReEditRequestConsumed: () => void;
    addToast: (message: string, type?: Notification['type']) => void;
    onReEdit: (config: ImageGenConfig) => void;
}

const commonNegatives = [ 'deformed', 'disfigured', 'blurry', 'low quality', 'text', 'watermark', 'ugly', 'duplicate', 'morbid', 'mutilated' ];

const ControlsPanel: React.FC<Omit<ImageGeneratorViewProps, 'session' | 'pendingGeneration' | 'onOpenViewer' | 'favoritedImageUrls' | 'addToast' | 'onReEdit' | 'onOpenSidebar' | 'onCancel'>> = 
({ defaultImageModel, imageModels, isGenerating, onGenerate, isOnline, reEditRequest, onReEditRequestConsumed }) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [model, setModel] = useState(defaultImageModel);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [numImages, setNumImages] = useState(1);
    const [seed, setSeed] = useState<string>('');
    const [isSeedLocked, setIsSeedLocked] = useState<boolean>(false);
    
    useEffect(() => {
        if (reEditRequest) {
            setPrompt(reEditRequest.prompt);
            setNegativePrompt(reEditRequest.negativePrompt || '');
            setModel(reEditRequest.model);
            setAspectRatio(reEditRequest.aspectRatio);
            setNumImages(reEditRequest.numImages);
            setSeed(reEditRequest.seed?.toString() || '');
            setIsSeedLocked(true);
        }
    }, [reEditRequest]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !isGenerating) {
            triggerHapticFeedback('heavy');
            let finalSeedNum: number | undefined = parseInt(seed, 10);
            if (isNaN(finalSeedNum)) { finalSeedNum = undefined; }
            if (!isSeedLocked && !reEditRequest) {
                finalSeedNum = Math.floor(Math.random() * 1000000000);
                setSeed(finalSeedNum.toString());
            }
            onGenerate({ prompt, negativePrompt, model, aspectRatio, numImages, seed: finalSeedNum });
            if (reEditRequest) { onReEditRequestConsumed(); }
        }
    };

    const handleNegativePillClick = (neg: string) => {
        setNegativePrompt(current => {
            const parts = current.split(',').map(p => p.trim()).filter(Boolean);
            const exists = parts.includes(neg);
            if (exists) {
                return parts.filter(p => p !== neg).join(', ');
            } else {
                return [...parts, neg].join(', ');
            }
        });
    };

    const activeNegativePills = useMemo(() => {
        return new Set(negativePrompt.split(',').map(p => p.trim()));
    }, [negativePrompt]);

    return (
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col p-4 space-y-4 glassmorphic-surface rounded-3xl animate-water-open">
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-on-surface-variant mb-1.5">Prompt</label>
                    <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A photorealistic robot..." className="w-full bg-surface-variant rounded-xl p-2.5 h-24 resize-none focus:ring-2 focus:ring-primary focus:border-primary" required disabled={isGenerating || !isOnline} />
                </div>
                <div>
                    <label htmlFor="negativePrompt" className="block text-sm font-medium text-on-surface-variant mb-1.5">Negative Prompt</label>
                    <textarea id="negativePrompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="blurry, text, watermark..." className="w-full bg-surface-variant rounded-xl p-2.5 resize-none" disabled={isGenerating || !isOnline} rows={2}/>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {commonNegatives.map(neg => (
                            <button key={neg} type="button" onClick={() => handleNegativePillClick(neg)} className={`px-3 py-1 text-xs rounded-full transition-colors ${activeNegativePills.has(neg) ? 'bg-primary text-on-primary' : 'bg-surface-variant hover:bg-outline text-on-surface-variant'}`}>
                                {neg}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="model" className="block text-sm font-medium text-on-surface-variant mb-1.5">Model</label>
                    <select id="model" value={model} onChange={(e) => setModel(e.target.value)} disabled={isGenerating || !isOnline} className="w-full bg-surface-variant rounded-xl p-2.5">
                        {imageModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ar => (
                             <button key={ar} type="button" onClick={() => setAspectRatio(ar)} className={`py-2 text-sm font-semibold rounded-lg transition-colors ${aspectRatio === ar ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-on-surface-variant hover:bg-primary-container/50'}`}>
                                {ar}
                             </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="numImages" className="block text-sm font-medium text-on-surface-variant mb-1">Images: <span className="font-bold text-on-surface">{numImages}</span></label>
                        <input id="numImages" type="range" min="1" max="8" step="1" value={numImages} onChange={e => setNumImages(parseInt(e.target.value, 10))} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" disabled={isGenerating || !isOnline} />
                    </div>
                     <div>
                        <label htmlFor="seed" className="block text-sm font-medium text-on-surface-variant mb-1">Seed</label>
                        <div className="flex items-center gap-2">
                            <input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="Random" className="w-full bg-surface-variant rounded-xl p-2" disabled={isGenerating || !isOnline || isSeedLocked} />
                            <button type="button" onClick={() => setIsSeedLocked(!isSeedLocked)} disabled={isGenerating || !isOnline} className="p-2 rounded-full hover:bg-surface-variant transition-colors disabled:opacity-50" aria-label={isSeedLocked ? 'Unlock seed' : 'Lock seed'}>
                                {isSeedLocked ? <LockClosedIcon className="w-5 h-5 text-primary" /> : <LockOpenIcon className="w-5 h-5 text-on-surface-variant" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 pt-4">
                <button type="submit" disabled={!prompt.trim() || !isOnline || isGenerating} className="w-full flex items-center justify-center p-3 rounded-full text-lg font-bold transition-transform active:scale-95 disabled:opacity-50 bg-primary text-on-primary hover:opacity-90">
                    {isGenerating ? <><SpinnerIcon className="w-7 h-7 mr-2" /><span>Generating...</span></> : reEditRequest ? <><SparklesIcon className="w-7 h-7 mr-2" /><span>Update Image</span></> : <><MagicWandIcon className="w-7 h-7 mr-2" /><span>Generate</span></> }
                </button>
            </div>
        </form>
    );
}

const ImageGeneratorView: React.FC<ImageGeneratorViewProps> = (props) => {
    const { session, pendingGeneration, onOpenViewer, favoritedImageUrls, isGenerating } = props;

    const allViewerImages = useMemo(() => {
        return session?.generations.flatMap(gen =>
            gen.imageContent.urls.map(url => ({ url, config: gen.config }))
        ) || [];
    }, [session]);

    const handlePopulateForm = (config: ImageGenConfig) => {
        triggerHapticFeedback('light');
        props.onReEdit(config);
    };

    const PendingGeneration: React.FC<{ config: ImageGenConfig }> = ({ config }) => (
        <div className="bg-surface rounded-2xl p-3 flex flex-col gap-3 animate-fade-in-up border border-primary/50">
             <div className={`grid gap-2 ${config.numImages > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {Array.from({ length: config.numImages }).map((_, i) => (
                    <div key={i} className="bg-surface-variant rounded-xl aspect-square w-full h-full flex flex-col items-center justify-center text-center shimmer p-4">
                        <SparklesIcon className="w-10 h-10 text-primary/40 animate-pulse-slow" />
                        <p className="text-xs mt-2 text-on-surface-variant/80 font-semibold animate-pulse">Creating...</p>
                    </div>
                ))}
            </div>
            <div className="text-left text-xs p-2.5 bg-surface-variant/50 rounded-xl">
                 <p className="font-mono text-on-surface line-clamp-2">{config.prompt}</p>
            </div>
        </div>
    );
    
    const EmptyState: React.FC = () => (
        <div className="flex flex-col items-center justify-center h-full text-center px-4 text-on-surface-variant">
            <SparklesIcon className="w-20 h-20 text-primary mb-4" />
            <h2 className="text-3xl font-bold text-on-surface mb-2">Image Session</h2>
            <p className="max-w-md">Craft your perfect image using the controls. Your creations will appear here.</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full bg-transparent relative overflow-hidden">
            <aside className="w-full md:w-2/5 lg:w-1/3 xl:w-1/4 flex flex-col flex-shrink-0 h-full">
                <header className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-background/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-primary" />
                        <h1 className="text-lg font-semibold">{session?.title || 'Image Generator'}</h1>
                    </div>
                    {!props.isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
                </header>
                <div className="flex-1 overflow-y-auto">
                    <ControlsPanel {...props} />
                </div>
                 {isGenerating && (
                    <div className="p-4 border-t border-outline">
                         <button onClick={props.onCancel} className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full hover:bg-red-500/20 transition-colors">
                            <SpinnerIcon className="w-4 h-4" />
                            <span>Cancel Generation</span>
                        </button>
                    </div>
                )}
            </aside>
            <main className="flex-1 overflow-y-auto p-4 md:border-l md:border-outline">
                {(!session || (session.generations.length === 0 && !pendingGeneration)) ? <EmptyState /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pendingGeneration && <PendingGeneration config={pendingGeneration}/>}
                        {session?.generations.map(gen => (
                            <div key={gen.id} className="bg-surface rounded-2xl p-3 flex flex-col gap-3 animate-fade-in-up border border-outline card-3d-effect">
                                <div className={`grid gap-2 ${gen.imageContent.urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {gen.imageContent.urls.map((url) => {
                                        const absoluteIndex = allViewerImages.findIndex(img => img.url === url);
                                        return <ImageWithLoader key={url} src={url} alt={gen.config.prompt} onClick={() => onOpenViewer(allViewerImages, absoluteIndex >= 0 ? absoluteIndex : 0)} isFavorited={favoritedImageUrls.has(url)} />
                                    })}
                                </div>
                                <button onClick={() => handlePopulateForm(gen.config)} className="text-left text-xs p-2.5 bg-surface-variant/50 rounded-xl hover:bg-surface-variant transition-colors">
                                    <p className="font-mono text-on-surface line-clamp-2">{gen.config.prompt}</p>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ImageGeneratorView;