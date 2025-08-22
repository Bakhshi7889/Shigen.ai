
import React from 'react';
import type { FavoriteImage, ImageGenConfig } from '../types';
import CloseIcon from './icons/CloseIcon';
import StarIcon from './icons/StarIcon';
import EditIcon from './icons/EditIcon';
import ImageIcon from './icons/ImageIcon';
import ImageWithLoader from './ImageWithLoader';
import PhotoIcon from './icons/PhotoIcon';

interface FavoritesViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoritedImages: FavoriteImage[];
  onOpenViewer: (startIndex: number) => void;
  onToggleFavorite: (image: FavoriteImage) => void;
  onReEdit: (config: ImageGenConfig) => void;
}

const FavoritesViewModal: React.FC<FavoritesViewModalProps> = ({
  isOpen,
  onClose,
  favoritedImages,
  onOpenViewer,
  onToggleFavorite,
  onReEdit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fade-in" onClick={onClose}>
      <div
        className="bg-shigen-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col p-6 relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <StarIcon className="w-6 h-6 text-yellow-400" isFilled />
            <h2 className="text-xl font-semibold text-shigen-gray-300">Saved Images ({favoritedImages.length})</h2>
          </div>
          <button onClick={onClose} className="p-2 text-shigen-gray-500 hover:text-shigen-gray-300 transition" aria-label="Close saved images">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {favoritedImages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-shigen-gray-500">
            <PhotoIcon className="w-16 h-16 mb-4" />
            <p>You haven't saved any images yet.</p>
            <p className="text-sm">Click the star icon on an image to save it here.</p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto -mr-3 pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoritedImages.map((fav, index) => (
                <div key={fav.url} className="bg-shigen-gray-900/50 rounded-lg p-3 flex flex-col gap-3 group">
                  <div className="relative">
                     <ImageWithLoader
                        src={fav.url}
                        alt={fav.config.prompt}
                        isFavorited={true}
                      />
                      <div
                        onClick={() => onOpenViewer(index)} 
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                          <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full">View</span>
                      </div>
                  </div>
                  <div className="flex flex-col flex-grow justify-between gap-2">
                    <p className="text-xs font-mono text-shigen-gray-400 line-clamp-3">{fav.config.prompt}</p>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onToggleFavorite(fav)}
                        className="p-2 rounded-full text-yellow-400 bg-shigen-gray-700 hover:bg-shigen-gray-600 transition-colors"
                        aria-label="Unfavorite"
                      >
                          <StarIcon className="w-5 h-5" isFilled/>
                      </button>
                      <button
                        onClick={() => onReEdit(fav.config)}
                        className="p-2 rounded-full text-shigen-gray-300 bg-shigen-gray-700 hover:bg-shigen-gray-600 transition-colors"
                        aria-label="Re-edit prompt"
                      >
                          <EditIcon className="w-5 h-5"/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesViewModal;
