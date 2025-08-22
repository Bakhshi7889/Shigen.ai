
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ImageGenConfig, ImageGeneration, ImageSession, FavoriteImage, PromptHelperStatus, Notification, ViewerImage } from '../types';
import MenuIcon from './icons/MenuIcon';
import ImageIcon from './icons/ImageIcon';
import MagicWandIcon from './icons/MagicWandIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ImageWithLoader from './ImageWithLoader';
import SparklesIcon from './icons/SparklesIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import PaperClipIcon from './icons/PaperClipIcon';
import CloseIcon from './icons/CloseIcon';
import { enhanceImagePrompt, getRandomImagePrompt } from '../services/pollinations';
import { triggerHapticFeedback } from '../lib/haptics';
import LockClosedIcon from './icons/LockClosedIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import BroomIcon from './icons/BroomIcon';

interface ImageGeneratorViewProps {
    session: ImageSession | undefined;
    defaultImageModel: string;
    imageModels: string[];
    isGenerating: boolean;
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

const AspectRatioButton: React.FC<{ value: string; current: string; onSelect: (value: string) => void; children: React.ReactNode; }> = 
({ value, current, onSelect, children }) => (
    <button type="button" onClick={() => onSelect(value)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${current === value ? 'bg-shigen-blue text-white' : 'bg-shigen-gray-700 text-shigen-gray-300 hover:bg-shigen-gray-600'}`}>
        {children}
    </button>
);

const ImageGeneratorView: React.FC<ImageGeneratorViewProps> = ({
    session, defaultImageModel, imageModels, isGenerating, onGenerate, onCancel, 
    onOpenSidebar, isOnline, onOpenViewer, favoritedImageUrls, reEditRequest, onReEditRequestConsumed,
    addToast, onReEdit
}) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [sourceImageUrl, setSourceImageUrl] = useState('');
    const [model, setModel] = useState(defaultImageModel);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [numImages, setNumImages] = useState(1);
    const [seed, setSeed] = useState<string>('');
    const [isSeedLocked, setIsSeedLocked] = useState<boolean>(false);
    
    const [promptHelperStatus, setPromptHelperStatus] = useState<PromptHelperStatus>('idle');
    const abortControllerRef = useRef<AbortController | null>(null);

    const allViewerImages = useMemo(() => {
        return session?.generations.flatMap(gen =>
            gen.imageContent.urls.map(url => ({ url, config: gen.config }))
        ) || [];
    }, [session]);
    
    const handleClearForm = useCallback(() => {
        setPrompt('');
        setNegativePrompt('');
        setSourceImageUrl('');
        setModel(defaultImageModel);
        setAspectRatio('1:1');
        setNumImages(1);
        setSeed('');
        setIsSeedLocked(false);
        onReEditRequestConsumed();
        triggerHapticFeedback('light');
    }, [defaultImageModel, onReEditRequestConsumed]);

    useEffect(() => {
        if (reEditRequest) {
            setPrompt(reEditRequest.prompt);
            setNegativePrompt(reEditRequest.negativePrompt || '');
            setModel(reEditRequest.model);
            setAspectRatio(reEditRequest.aspectRatio);
            setNumImages(reEditRequest.numImages);
            setSeed(reEditRequest.seed?.toString() || '');
            setSourceImageUrl(reEditRequest.sourceImageUrl || '');
            setIsSeedLocked(true); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [reEditRequest]);
    
    const handleRemoveReferenceImage = useCallback(() => {
        setSourceImageUrl('');
        if (isSeedLocked) {
           setIsSeedLocked(false);
           setSeed('');
        }
        onReEditRequestConsumed();
        addToast('Image reference removed.', 'info');
        triggerHapticFeedback('light');
    }, [isSeedLocked, onReEditRequestConsumed, addToast]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !isGenerating && promptHelperStatus === 'idle') {
            triggerHapticFeedback('heavy');
            let finalSeedNum: number | undefined = parseInt(seed, 10);
            if (isNaN(finalSeedNum)) { finalSeedNum = undefined; }
            if (!isSeedLocked && !reEditRequest) {
                finalSeedNum = Math.floor(Math.random() * 1000000000);
                setSeed(finalSeedNum.toString());
            }
            
            onGenerate({ prompt, negativePrompt, sourceImageUrl, model, aspectRatio, numImages, seed: finalSeedNum });
            
            if (reEditRequest) { onReEditRequestConsumed(); }
        }
    };
    
    const handleEnhance = async () => {
        if (!prompt.trim() || isPromptingBusy) return;
        setPromptHelperStatus('enhancing');
        
        if(abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const enhancedPrompt = await enhanceImagePrompt(prompt, abortControllerRef.current.signal);
            if (!abortControllerRef.current.signal.aborted) {
                setPrompt(enhancedPrompt);
                addToast("Prompt enhanced!", "success");
            }
        } catch (error) {
             if ((error as Error).name !== 'AbortError') {
                console.error("Failed to enhance prompt:", error);
                addToast("Could not enhance prompt.", "error");
             }
        } finally {
            if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
                setPromptHelperStatus('idle');
            }
        }
    };

    const handlePopulateForm = (config: ImageGenConfig) => {
        triggerHapticFeedback('light');
        onReEditRequestConsumed();
        setPrompt(config.prompt);
        setNegativePrompt(config.negativePrompt || '');
        setSourceImageUrl(config.sourceImageUrl || '');
        setModel(config.model);
        setAspectRatio(config.aspectRatio);
        setNumImages(config.numImages);
        setSeed(config.seed?.toString() || '');
        setIsSeedLocked(!!config.seed);
    };

    const Gallery: React.FC = () => (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {session?.generations.map(gen => (
                <div key={gen.id} className="bg-shigen-gray-800 rounded-lg p-3 flex flex-col gap-3 animate-fade-in-up">
                    <div className={`grid gap-2 ${gen.imageContent.urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {gen.imageContent.urls.map((url) => {
                            const absoluteIndex = allViewerImages.findIndex(img => img.url === url);
                            return <ImageWithLoader key={url} src={url} alt={gen.config.prompt} onClick={() => onOpenViewer(allViewerImages, absoluteIndex >= 0 ? absoluteIndex : 0)} isFavorited={favoritedImageUrls.has(url)} />
                        })}
                    </div>
                    <button onClick={() => handlePopulateForm(gen.config)} className="text-left text-xs p-2 bg-shigen-gray-700/50 rounded-md hover:bg-shigen-gray-700 transition-colors">
                        <p className="font-mono text-shigen-gray-300 line-clamp-2">{gen.config.prompt}</p>
                        {gen.config.negativePrompt && <p className="font-mono text-red-400/70 mt-1 line-clamp-1">Neg: {gen.config.negativePrompt}</p>}
                        {gen.config.sourceImageUrl && <p className="font-mono text-blue-400/70 mt-1 line-clamp-1 truncate">Ref: {gen.config.sourceImageUrl}</p>}
                    </button>
                </div>
            ))}
        </div>
    );
    
    const EmptyState: React.FC = () => (
        <div className="flex flex-col items-center justify-center h-full text-center px-4 text-shigen-gray-500">
            <SparklesIcon className="w-20 h-20 text-shigen-blue mb-4" />
            <h2 className="text-3xl font-bold text-shigen-gray-300 mb-2">Image Session</h2>
            <p className="max-w-md">Craft your perfect image with advanced controls. Your creations will appear here.</p>
        </div>
    );

    const isPromptingBusy = promptHelperStatus !== 'idle';
    const PromptHelperSpinner = () => <SpinnerIcon className="w-4 h-4" />;

    return (
        <div className="flex-1 flex flex-col h-screen bg-shigen-gray-900">
            <header className="flex items-center justify-between p-4 border-b border-shigen-gray-700/50 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <button onClick={onOpenSidebar} className="p-2 rounded-full hover:bg-shigen-gray-700 md:hidden" aria-label="Open sidebar"><MenuIcon className="w-6 h-6" /></button>
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-shigen-blue" />
                        <h1 className="text-lg font-medium">{session?.title || 'Image Generator'}</h1>
                    </div>
                     {!isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                <aside className="w-full md:max-w-sm bg-shigen-gray-800/50 md:border-r border-shigen-gray-700/50 p-6 md:overflow-y-auto shrink-0">
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-shigen-gray-300">Controls</h2>
                             <button type="button" onClick={handleClearForm} disabled={isGenerating || !isOnline || isPromptingBusy} className="flex items-center justify-center gap-2 text-sm px-3 py-1.5 bg-shigen-gray-700 hover:bg-shigen-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <BroomIcon className="w-4 h-4" /><span>Clear Form</span>
                            </button>
                        </div>
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-shigen-gray-400 mb-1">Prompt</label>
                            {sourceImageUrl && (
                                <div className="bg-shigen-gray-600/50 border border-shigen-gray-600 rounded-lg p-2 mb-2 animate-fade-in-up">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-sm">
                                      <PaperClipIcon className="w-5 h-5 text-shigen-blue flex-shrink-0" />
                                      <p className="text-shigen-gray-400 truncate">Referencing image for edit.</p>
                                    </div>
                                    <button type="button" onClick={handleRemoveReferenceImage} className="p-1 rounded-full text-shigen-gray-500 hover:bg-shigen-gray-700 hover:text-shigen-gray-300 transition-colors" aria-label="Remove image reference">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                            )}
                            <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A photorealistic robot..." className="w-full bg-shigen-gray-700 rounded-md p-2 h-24 resize-none" required disabled={isGenerating || !isOnline || isPromptingBusy} />
                            <div className="grid grid-cols-1 items-center gap-2 mt-2">
                                <button type="button" onClick={handleEnhance} disabled={!prompt.trim() || isGenerating || !isOnline || isPromptingBusy || !!reEditRequest} className="flex items-center justify-center gap-2 text-sm px-3 py-1.5 bg-shigen-gray-700 hover:bg-shigen-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{promptHelperStatus === 'enhancing' ? <PromptHelperSpinner /> : <SparklesIcon className="w-4 h-4" />}<span>Enhance</span></button>
                            </div>
                        </div>
                        
                        <div><label htmlFor="negativePrompt" className="block text-sm font-medium text-shigen-gray-400 mb-1">Negative Prompt (optional)</label><input id="negativePrompt" type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="blurry, text, watermark..." className="w-full bg-shigen-gray-700 rounded-md p-2" disabled={isGenerating || !isOnline || isPromptingBusy} /></div>
                        <div><label htmlFor="model" className="block text-sm font-medium text-shigen-gray-400 mb-1">Model</label><select id="model" value={model} onChange={(e) => setModel(e.target.value)} disabled={isGenerating || !isOnline || isPromptingBusy} className="w-full bg-shigen-gray-700 rounded-md p-2">{imageModels.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-shigen-gray-400 mb-2">Aspect Ratio</label><div className="flex flex-wrap gap-2"><AspectRatioButton value="1:1" current={aspectRatio} onSelect={setAspectRatio}>1:1</AspectRatioButton><AspectRatioButton value="16:9" current={aspectRatio} onSelect={setAspectRatio}>16:9</AspectRatioButton><AspectRatioButton value="9:16" current={aspectRatio} onSelect={setAspectRatio}>9:16</AspectRatioButton><AspectRatioButton value="4:3" current={aspectRatio} onSelect={setAspectRatio}>4:3</AspectRatioButton><AspectRatioButton value="3:4" current={aspectRatio} onSelect={setAspectRatio}>3:4</AspectRatioButton></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="numImages" className="block text-sm font-medium text-shigen-gray-400 mb-1">Images: <span className="font-bold text-shigen-gray-300">{numImages}</span></label>
                                <input id="numImages" type="range" min="1" max="8" step="1" value={numImages} onChange={e => setNumImages(parseInt(e.target.value, 10))} className="w-full h-2 bg-shigen-gray-700 rounded-lg appearance-none cursor-pointer accent-shigen-blue" disabled={isGenerating || !isOnline || isPromptingBusy} />
                            </div>
                             <div>
                                <label htmlFor="seed" className="block text-sm font-medium text-shigen-gray-400 mb-1">Seed</label>
                                <div className="flex items-center gap-2">
                                    <input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="Random" className="w-full bg-shigen-gray-700 rounded-md p-2" disabled={isGenerating || !isOnline || isPromptingBusy || isSeedLocked} />
                                    <button type="button" onClick={() => setIsSeedLocked(!isSeedLocked)} disabled={isGenerating || !isOnline || isPromptingBusy} className="p-2 rounded-full hover:bg-shigen-gray-600 transition-colors disabled:opacity-50" aria-label={isSeedLocked ? 'Unlock seed' : 'Lock seed'}>
                                        {isSeedLocked ? <LockClosedIcon className="w-5 h-5 text-shigen-blue" /> : <LockOpenIcon className="w-5 h-5 text-shigen-gray-500" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button type={isGenerating ? 'button' : 'submit'} onClick={isGenerating ? onCancel : undefined} disabled={!prompt.trim() || !isOnline || isPromptingBusy} className="w-full flex items-center justify-center p-3 rounded-lg text-lg font-bold transition-colors disabled:opacity-50 bg-shigen-blue text-white hover:bg-blue-500">{isGenerating ? <><SpinnerIcon className="w-7 h-7 mr-2" /><span>Generating...</span></> : reEditRequest ? <><SparklesIcon className="w-7 h-7 mr-2" /><span>Update Image</span></> : <><MagicWandIcon className="w-7 h-7 mr-2" /><span>Generate</span></> }</button>
                    </form>
                </aside>
                <main className="flex-1 md:overflow-y-auto p-6">
                    {!session || session.generations.length === 0 ? <EmptyState /> : (
                        <section aria-labelledby="gallery-heading" className="bg-shigen-gray-900/50 rounded-lg p-4 border border-shigen-gray-700/50">
                             <div className="pb-4 mb-4 border-b border-shigen-gray-700/50"><h2 id="gallery-heading" className="text-xl font-semibold text-shigen-gray-300">Generation History</h2><p className="text-sm text-shigen-gray-500 mt-1">Your creations for this session. Click any to reuse its settings.</p></div>
                            <Gallery />
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ImageGeneratorView;
