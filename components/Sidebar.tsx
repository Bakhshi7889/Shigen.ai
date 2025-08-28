

import React, { useState, useMemo } from 'react';
import type { HistoryItem, ViewMode, FavoriteItem, ViewerImage } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import SettingsIcon from './icons/SettingsIcon';
import SignalIcon from './icons/SignalIcon';
import PhotoIcon from './icons/PhotoIcon';
import DownloadIcon from './icons/DownloadIcon';
import CloseIcon from './icons/CloseIcon';

type InstallStatus = 'unsupported' | 'available' | 'installed' | 'ios';

interface MenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  activeIds: {
    chat: string | null;
    image: string | null;
    story: string | null;
  };
  onSelectHistoryItem: (id: string, type: ViewMode) => void;
  onNewSession: (type: ViewMode) => void;
  onDeleteSession: (id: string, type: ViewMode) => void;
  onOpenSettings: () => void;
  onOpenImageFeed: () => void;
  onOpenTextFeed: () => void;
  favorites: FavoriteItem[];
  onOpenFavorites: () => void;
  installStatus: InstallStatus;
  onInstallPwa: () => void;
}

const MenuSheet: React.FC<MenuSheetProps> = ({ 
    isOpen, onClose,
    history, activeIds, onSelectHistoryItem, onNewSession, onDeleteSession,
    onOpenSettings, onOpenImageFeed, onOpenTextFeed, 
    favorites, onOpenFavorites, installStatus, onInstallPwa
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'story'>('chat');

  const filteredHistory = useMemo(() => {
    return history.filter(item => 
      (searchQuery.trim() ? true : item.type === (activeTab === 'image' ? 'image-generator' : activeTab)) &&
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, activeTab, searchQuery]);

  const handleDelete = (e: React.MouseEvent, id: string, type: ViewMode) => {
    e.stopPropagation();
    const typeName = type === 'image-generator' ? 'image session' : type;
    if (window.confirm(`Are you sure you want to delete this ${typeName}?`)) {
        onDeleteSession(id, type);
    }
  }
  
  const UtilityButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; }> = ({ icon, label, onClick }) => (
      <button
        onClick={() => { onClick(); onClose(); }}
        className="w-full flex items-center space-x-4 px-4 py-2.5 my-0.5 rounded-full text-sm text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
      >
        {icon}
        <span>{label}</span>
      </button>
  );
  
  const InstallButton: React.FC = () => {
    const isInstalled = installStatus === 'installed';
    const canInstall = installStatus === 'available' || installStatus === 'ios';
    let buttonText = 'Install App';
    if (isInstalled) buttonText = 'App Installed';
    if (installStatus === 'unsupported') buttonText = 'Install Not Supported';

    return (
        <button
            onClick={() => { if (canInstall) { onInstallPwa(); onClose(); } }}
            disabled={!canInstall}
            className={`w-full flex items-center space-x-4 px-4 py-2.5 my-0.5 rounded-full text-sm font-semibold transition-colors ${
                canInstall
                    ? 'text-on-primary bg-primary hover:opacity-90'
                    : 'text-on-surface-variant bg-surface-variant/50 cursor-not-allowed'
            }`}
          >
            <DownloadIcon className="w-5 h-5" />
            <span>{buttonText}</span>
        </button>
    );
  };

  const getActiveIdForView = (view: ViewMode) => {
    if (view === 'chat') return activeIds.chat;
    if (view === 'image-generator') return activeIds.image;
    if (view === 'story') return activeIds.story;
    return null;
  }

  const renderHistoryList = () => (
    <nav className="flex-1 flex flex-col">
      <div className="p-1 bg-surface-variant rounded-full flex gap-1 mb-2">
        {(['chat', 'image', 'story'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full capitalize ${activeTab === tab ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'}`}
          >
            {tab === 'image' ? 'Images' : tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {filteredHistory.map((item: HistoryItem) => (
            <li key={item.id} className="group relative pr-2">
              <button 
                onClick={() => onSelectHistoryItem(item.id, item.type)} 
                className={`w-full text-left pl-4 pr-12 py-2.5 rounded-lg font-semibold transition-colors truncate ${item.id === getActiveIdForView(item.type) ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-variant'}`}
              >
                {item.title}
              </button>
              <button 
                onClick={(e) => handleDelete(e, item.id, item.type)} 
                aria-label={`Delete ${item.title}`}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-outline hover:text-on-surface"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button onClick={() => onNewSession(activeTab === 'image' ? 'image-generator' : activeTab)} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-on-primary px-4 py-2.5 rounded-full hover:opacity-90 transition active:scale-95">
        <PlusIcon className="h-5 w-5" />
        <span>New {activeTab === 'image' ? 'Image Session' : activeTab}</span>
      </button>
    </nav>
  );

  return (
    <>
      <div className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-background rounded-t-3xl shadow-strong h-[85vh] max-h-[600px] flex flex-col p-4 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex-shrink-0 flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Menu</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-surface-variant">
            <CloseIcon className="w-6 h-6"/>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-y-auto">
          <div className="md:w-1/2 flex flex-col">
            <h3 className="font-bold text-on-surface-variant mb-2 px-2">History</h3>
            {renderHistoryList()}
          </div>
          <div className="md:w-1/2">
            <h3 className="font-bold text-on-surface-variant mb-2 px-2">Utilities</h3>
            <UtilityButton icon={<StarIcon className="w-5 h-5" />} label={`Inspiration (${favorites.length})`} onClick={onOpenFavorites} />
            <UtilityButton icon={<PhotoIcon className="w-5 h-5" />} label="Image Feed" onClick={onOpenImageFeed} />
            <UtilityButton icon={<SignalIcon className="w-5 h-5" />} label="Text Prompt Feed" onClick={onOpenTextFeed} />
            <UtilityButton icon={<SettingsIcon className="w-5 h-5" />} label="Settings" onClick={onOpenSettings} />
            <div className="mt-2">
              <InstallButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuSheet;