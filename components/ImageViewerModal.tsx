import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { FavoriteImage, ImageGenConfig, ViewerImage } from '../types';
import CloseIcon from './icons/CloseIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import DownloadIcon from './icons/DownloadIcon';
import StarIcon from './icons/StarIcon';
import EditIcon from './icons/EditIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import { triggerHapticFeedback } from '../lib/haptics';

interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: ViewerImage[];
    startIndex: number;
    favoritedImageUrls: Set<string>;
    onToggleFavorite: (image: FavoriteImage) => void;
    onReEdit: (config: ImageGenConfig) => void;
}

const mimeTypeToExtension: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, images, startIndex, favoritedImageUrls, onToggleFavorite, onReEdit }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Zoom & Pan state
    const [isZoomed, setIsZoomed] = useState(false);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    
    // Swipe gesture state
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    const imageRef = useRef<HTMLImageElement | null>(null);
    const modalContentRef = useRef<HTMLDivElement | null>(null);
    const lastTapTime = useRef(0);

    const currentImage = images[currentIndex];
    const isFavorited = !!currentImage && favoritedImageUrls.has(currentImage.url);

    const resetZoomAndPan = useCallback(() => {
        setIsZoomed(false);
        setPan({ x: 0, y: 0 });
        setIsPanning(false);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
    }, []);

    useEffect(() => {
        if (isOpen) setCurrentIndex(startIndex);
        else resetZoomAndPan();
    }, [isOpen, startIndex, resetZoomAndPan]);

    useEffect(() => {
        setIsLoaded(false);
        resetZoomAndPan();
    }, [currentIndex, resetZoomAndPan]);
    
    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    }, [images.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowLeft' && !isZoomed) handlePrev();
            if (e.key === 'ArrowRight' && !isZoomed) handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handlePrev, handleNext, onClose, isZoomed]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) onClose();
    };
    
    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        
        imageRef.current?.setPointerCapture(e.pointerId);

        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) { // Double tap
            triggerHapticFeedback('light');
            setIsZoomed(prev => {
                if (!prev) return true;
                resetZoomAndPan();
                return false;
            });
        } else if (isZoomed) { // Start panning
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else { // Start swipe gesture
            setDragStart({ x: e.clientX, y: e.clientY });
        }
        lastTapTime.current = now;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isPanning && isZoomed) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        } else if (dragStart && !isZoomed) {
            const dx = e.clientX - dragStart.x;
            setDragOffset({ x: dx, y: 0 });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        imageRef.current?.releasePointerCapture(e.pointerId);
        
        if (dragStart && !isZoomed) {
            const dx = e.clientX - dragStart.x;
            const SWIPE_THRESHOLD = 50; // pixels
            if (dx > SWIPE_THRESHOLD) {
                handlePrev();
            } else if (dx < -SWIPE_THRESHOLD) {
                handleNext();
            }
            setDragStart(null);
            setDragOffset({ x: 0, y: 0 });
        }

        if (isPanning) setIsPanning(false);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation(); if (!currentImage) return; setIsDownloading(true); triggerHapticFeedback('light');
        try {
            const response = await fetch(currentImage.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
            const safePrompt = currentImage.config.prompt.replace(/[^a-z0-9]/gi, '_').slice(0, 50);
            const extension = mimeTypeToExtension[blob.type] || 'jpg';
            a.download = `${safePrompt}_${Date.now()}.${extension}`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
        } catch (error) { console.error("Download failed:", error); } finally { setIsDownloading(false); }
    };
    
    if (!isOpen || !currentImage) return null;
    
    const imageTransform = `translateX(${dragOffset.x}px) scale(${isZoomed ? 2.5 : 1}) translate(${pan.x}px, ${pan.y}px)`;
    const imageTransition = (isPanning || (dragStart && !isZoomed)) ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';


    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={handleBackdropClick}>
            <div ref={modalContentRef} className="w-full h-full flex flex-col pointer-events-none">
                <div className="p-4 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-auto">
                    <div className="flex justify-between items-start max-w-6xl mx-auto">
                         <div className="text-white/80 text-xs sm:text-sm font-mono glassmorphic p-2 rounded-xl">
                            <p className="line-clamp-1">Model: {currentImage.config.model}</p>
                            <p>Seed: {currentImage.config.seed}</p>
                         </div>
                         <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-2 rounded-full z-20 glassmorphic" aria-label="Close viewer">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
                    {!isLoaded && <SpinnerIcon className="w-12 h-12 text-white" />}
                    <img ref={imageRef} key={currentImage.url} src={currentImage.url} alt={currentImage.config.prompt}
                        className={`max-w-full max-h-full object-contain rounded-2xl shadow-2xl touch-none ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isPanning ? 'cursor-grabbing' : isZoomed ? 'cursor-grab' : 'cursor-default'} pointer-events-auto`}
                        style={{ transform: imageTransform, transition: imageTransition, willChange: 'transform' }}
                        onLoad={() => setIsLoaded(true)} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />
                </div>

                <div className="p-4 bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-auto">
                    <p className="text-white text-center text-sm mb-4 line-clamp-2 px-8">{currentImage.config.prompt}</p>
                    <div className="flex items-center justify-center space-x-4 glassmorphic p-3 rounded-full max-w-sm mx-auto">
                        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite({ type: 'image', url: currentImage.url, config: currentImage.config }); }} className="text-white/80 hover:text-white transition-colors p-2" aria-label="Favorite image">
                            <StarIcon className={`w-7 h-7 ${isFavorited ? 'text-yellow-400' : ''}`} isFilled={isFavorited} />
                        </button>
                        <button onClick={handleDownload} disabled={isDownloading} className="text-white/80 hover:text-white transition-colors p-2 disabled:opacity-50" aria-label="Download image">
                            {isDownloading ? <SpinnerIcon className="w-7 h-7"/> : <DownloadIcon className="w-7 h-7" />}
                        </button>
                         <button onClick={(e) => { e.stopPropagation(); onReEdit(currentImage.config); }} className="text-white/80 hover:text-white transition-colors p-2" aria-label="Re-edit image">
                            <EditIcon className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>

            {images.length > 1 && !isZoomed && !dragStart && (
                <>
                    <button onClick={handlePrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/30 transition-all p-3 rounded-full z-50 pointer-events-auto glassmorphic" aria-label="Previous image">
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button onClick={handleNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-black/30 transition-all p-3 rounded-full z-50 pointer-events-auto glassmorphic" aria-label="Next image">
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                </>
            )}
        </div>
    );
};

export default ImageViewerModal;