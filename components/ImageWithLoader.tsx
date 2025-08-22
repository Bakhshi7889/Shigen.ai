
import React, { useState, useEffect, useRef } from 'react';
import StarIcon from './icons/StarIcon';

const MAX_RETRIES = 4;
const RETRY_DELAYS = [1000, 2000, 4000, 8000]; // in ms

const ImageWithLoader: React.FC<{
  src: string;
  alt: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  isSelected?: boolean;
  isFavorited?: boolean;
}> = ({ src, alt, onClick, onDoubleClick, isSelected, isFavorited }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const retryCountRef = useRef(0);
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        setStatus('loading');
        retryCountRef.current = 0;
        
        const tryLoadImage = () => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                setStatus('loaded');
            };
            img.onerror = () => {
                if (retryCountRef.current < MAX_RETRIES) {
                    const delay = RETRY_DELAYS[retryCountRef.current];
                    retryCountRef.current += 1;
                    setTimeout(tryLoadImage, delay);
                } else {
                    setStatus('error');
                }
            };
        };

        tryLoadImage();

    }, [src]);

    return (
        <div 
            className={`bg-shigen-gray-700 rounded-lg aspect-square w-full h-full flex items-center justify-center relative overflow-hidden transition-all duration-200 group ${onClick ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-shigen-blue ring-offset-2 ring-offset-shigen-gray-900' : ''}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            {status === 'loading' && (
                <div className="text-shigen-gray-500 text-sm animate-pulse">Loading...</div>
            )}
            {status === 'error' && (
                 <div className="text-red-400 text-xs text-center p-2">Error loading</div>
            )}
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100 animate-reveal' : 'opacity-0'}`}
            />
            {isFavorited && (
                <div className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full">
                    <StarIcon className="w-5 h-5 text-yellow-400" isFilled={true} />
                </div>
            )}
        </div>
    );
};

export default ImageWithLoader;
