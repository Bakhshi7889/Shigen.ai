import React from 'react';
import type { FavoriteItem, FavoriteImage, FavoriteMessage, FavoriteStoryBeat, ImageGenConfig } from '../types';
import CloseIcon from './icons/CloseIcon';
import StarIcon from './icons/StarIcon';
import EditIcon from './icons/EditIcon';
import ImageWithLoader from './ImageWithLoader';
import PhotoIcon from './icons/PhotoIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import BookOpenIcon from './icons/BookOpenIcon';

interface FavoritesViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteItem[];
  onOpenViewer: (startIndex: number) => void;
  onToggleFavorite: (item: FavoriteItem) => void;
  onReEdit: (config: ImageGenConfig) => void;
}

const FavoriteImageCard: React.FC<{ item: FavoriteImage; onOpen: () => void; onToggle: () => void; onReEdit: () => void; }> = ({ item, onOpen, onToggle, onReEdit }) => (
    <div className="relative group aspect-square">
        <ImageWithLoader src={item.url} alt={item.config.prompt} onClick={onOpen} />
        <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-yellow-400 hover:text-white transition-colors" aria-label="Unfavorite">
                <StarIcon className="w-5 h-5" isFilled={true} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onReEdit(); }} className="p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:text-primary transition-colors" aria-label="Re-edit">
                <EditIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const FavoriteMessageCard: React.FC<{ item: FavoriteMessage; onToggle: () => void; }> = ({ item, onToggle }) => (
    <div className="relative group aspect-square bg-surface-variant p-3 rounded-xl flex flex-col justify-between">
        <p className="text-sm text-on-surface-variant line-clamp-5 break-words">{item.content}</p>
        <div>
            <p className="text-xs text-on-surface-variant/70 truncate mt-2">{item.sessionTitle}</p>
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="absolute top-2 right-2 p-1.5 bg-black/20 rounded-full text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Unfavorite">
                <StarIcon className="w-4 h-4" isFilled={true} />
            </button>
        </div>
    </div>
);

const FavoriteStoryBeatCard: React.FC<{ item: FavoriteStoryBeat; onToggle: () => void; }> = ({ item, onToggle }) => (
    <div className="relative group aspect-square bg-surface rounded-xl overflow-hidden">
        <ImageWithLoader src={item.imageUrl} alt={item.storyText} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end">
            <p className="text-white text-sm line-clamp-3">{item.storyText}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Unfavorite">
            <StarIcon className="w-5 h-5" isFilled={true} />
        </button>
    </div>
);


const FavoritesViewModal: React.FC<FavoritesViewModalProps> = ({ isOpen, onClose, favorites, onOpenViewer, onToggleFavorite, onReEdit }) => {
  if (!isOpen) return null;

  const getImageFavorites = () => favorites.filter((f): f is FavoriteImage => f.type === 'image');

  const renderItem = (item: FavoriteItem) => {
      switch (item.type) {
          case 'image':
              const imageFavorites = getImageFavorites();
              const imageIndex = imageFavorites.findIndex(img => img.url === item.url);
              return (
                  <FavoriteImageCard 
                      key={item.url}
                      item={item}
                      onOpen={() => onOpenViewer(imageIndex >= 0 ? imageIndex : 0)}
                      onToggle={() => onToggleFavorite(item)}
                      onReEdit={() => {
                          onReEdit(item.config);
                          onClose();
                      }}
                  />
              );
          case 'message':
              return <FavoriteMessageCard key={item.id} item={item} onToggle={() => onToggleFavorite(item)} />;
          case 'story-beat':
              return <FavoriteStoryBeatCard key={item.id} item={item} onToggle={() => onToggleFavorite(item)} />;
          default:
              return null;
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="bg-background rounded-t-3xl md:rounded-2xl shadow-soft w-full max-w-4xl h-[90vh] flex flex-col p-6 relative animate-slide-in-up md:animate-spring-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <StarIcon className="w-6 h-6 text-yellow-400" isFilled={true} />
            <h2 className="text-xl font-semibold text-on-surface">Inspiration Board</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition" aria-label="Close saved images">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto -mr-3 pr-3">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant">
              <StarIcon className="w-16 h-16 mb-4" />
              <h3 className="text-lg font-semibold text-on-surface">Nothing Saved Yet</h3>
              <p className="max-w-xs">Click the star icon on any image, message, or story scene to save it to your board.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favorites.map(renderItem)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesViewModal;