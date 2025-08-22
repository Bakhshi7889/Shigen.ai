

import React, { useState } from 'react';
import type { ChatSession, ImageSession, ViewMode, FavoriteImage, ViewerImage, StorySession } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import ImageIcon from './icons/ImageIcon';
import SettingsIcon from './icons/SettingsIcon';
import SignalIcon from './icons/SignalIcon';
import PhotoIcon from './icons/PhotoIcon';
import DownloadIcon from './icons/DownloadIcon';
import BookOpenIcon from './icons/BookOpenIcon';

type InstallStatus = 'unsupported' | 'available' | 'installed' | 'ios';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  
  imageSessions: ImageSession[];
  activeImageSessionId: string | null;
  onSelectImageSession: (id: string) => void;
  onNewImageSession: () => void;
  onDeleteImageSession: (id: string) => void;
  
  storySessions: StorySession[];
  activeStorySessionId: string | null;
  onSelectStorySession: (id: string) => void;
  onNewStorySession: () => void;
  onDeleteStorySession: (id: string) => void;

  onOpenSettings: () => void;
  onOpenImageFeed: () => void;
  onOpenTextFeed: () => void;
  favoritedImages: FavoriteImage[];
  onOpenViewer: (images: ViewerImage[], startIndex: number) => void;
  onOpenFavorites: () => void;
  installStatus: InstallStatus;
  onInstallPwa: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, onClose, viewMode, onViewChange,
    chatSessions, activeChatId, onSelectChat, onNewChat, onDeleteChat,
    imageSessions, activeImageSessionId, onSelectImageSession, onNewImageSession, onDeleteImageSession,
    storySessions, activeStorySessionId, onSelectStorySession, onNewStorySession, onDeleteStorySession,
    onOpenSettings, onOpenImageFeed, onOpenTextFeed, 
    favoritedImages, onOpenViewer, onOpenFavorites, installStatus, onInstallPwa
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChatSessions = chatSessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredImageSessions = imageSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStorySessions = storySessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
        onDeleteChat(sessionId);
    }
  }
  
  const handleDeleteImageSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this image session?')) {
        onDeleteImageSession(sessionId);
    }
  }
  
  const handleDeleteStorySession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this story?')) {
        onDeleteStorySession(sessionId);
    }
  }

  const handleViewChange = (mode: ViewMode) => {
      onViewChange(mode);
      setSearchQuery('');
  }
  
  const ViewSwitcher: React.FC = () => (
    <div className="flex items-center space-x-1 p-1 bg-shigen-gray-900/50 rounded-lg mb-4">
        <button
            onClick={() => handleViewChange('chat')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                viewMode === 'chat' ? 'bg-shigen-gray-700 text-shigen-gray-300' : 'text-shigen-gray-500 hover:bg-shigen-gray-700/50 hover:text-shigen-gray-300'
            }`}
        >
            <ChatBubbleIcon className="w-5 h-5" />
            <span>Chat</span>
        </button>
        <button
            onClick={() => handleViewChange('image-generator')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                viewMode === 'image-generator' ? 'bg-shigen-gray-700 text-shigen-gray-300' : 'text-shigen-gray-500 hover:bg-shigen-gray-700/50 hover:text-shigen-gray-300'
            }`}
        >
            <ImageIcon className="w-5 h-5" />
            <span>Images</span>
        </button>
        <button
            onClick={() => handleViewChange('story')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                viewMode === 'story' ? 'bg-shigen-gray-700 text-shigen-gray-300' : 'text-shigen-gray-500 hover:bg-shigen-gray-700/50 hover:text-shigen-gray-300'
            }`}
        >
            <BookOpenIcon className="w-5 h-5" />
            <span>Story</span>
        </button>
    </div>
  );
  
  const SearchAndNew: React.FC<{
      title: string;
      onNew: () => void;
      searchPlaceholder: string;
  }> = ({ title, onNew, searchPlaceholder }) => (
    <>
        <div className="flex items-center justify-between mb-4">
           <h1 className="text-xl font-semibold text-shigen-gray-300">{title}</h1>
           <button onClick={onNew} className="p-2 rounded-full hover:bg-shigen-gray-700 transition" aria-label={`Create new ${title}`}>
              <PlusIcon className="h-6 w-6" />
           </button>
        </div>
        
        <div className="relative mb-4">
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-shigen-gray-700 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-shigen-blue" 
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-shigen-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
    </>
  );

  const UtilityButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; }> = ({ icon, label, onClick }) => (
      <button
        onClick={() => { onClick(); onClose(); }}
        className="w-full flex items-center space-x-4 px-4 py-2 my-0.5 rounded-full text-sm text-shigen-gray-300 hover:bg-shigen-gray-700 transition-colors"
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
            className={`w-full flex items-center space-x-4 px-4 py-2 my-0.5 rounded-full text-sm font-semibold transition-colors ${
                canInstall
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-shigen-gray-500 bg-shigen-gray-700/50 cursor-not-allowed'
            }`}
          >
            <DownloadIcon className="w-5 h-5" />
            <span>{buttonText}</span>
        </button>
    );
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <aside className={`fixed top-0 left-0 h-full bg-shigen-gray-800 w-72 p-4 z-40 transform transition-transform md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        
        <ViewSwitcher />
        
        <div className="flex-grow overflow-y-auto -mr-2 pr-2">
            {viewMode === 'chat' && (
                <>
                    <SearchAndNew title="Chats" onNew={onNewChat} searchPlaceholder="Search for chats" />
                    <nav>
                      <h2 className="text-sm font-bold text-shigen-gray-500 px-2 my-2">Recent</h2>
                      <ul>
                        {filteredChatSessions.map((session) => (
                          <li key={session.id} className="group relative">
                            <button onClick={() => onSelectChat(session.id)} className={`w-full text-left px-4 py-2 my-1 rounded-full text-sm truncate transition-colors ${activeChatId === session.id ? 'bg-shigen-blue/20 text-shigen-blue' : 'hover:bg-shigen-gray-700 text-shigen-gray-300'}`}>
                              {session.title}
                            </button>
                            <button onClick={(e) => handleDeleteChat(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-shigen-gray-500 opacity-0 group-hover:opacity-100 hover:bg-shigen-gray-600 hover:text-shigen-gray-300 transition-all" aria-label="Delete chat">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                </>
            )}
            
            {viewMode === 'image-generator' && (
                 <>
                    <SearchAndNew title="Image Sessions" onNew={onNewImageSession} searchPlaceholder="Search for sessions" />
                    <nav>
                      <h2 className="text-sm font-bold text-shigen-gray-500 px-2 my-2">Recent</h2>
                      <ul>
                        {filteredImageSessions.map((session) => (
                          <li key={session.id} className="group relative">
                            <button onClick={() => onSelectImageSession(session.id)} className={`w-full text-left px-4 py-2 my-1 rounded-full text-sm truncate transition-colors ${activeImageSessionId === session.id ? 'bg-shigen-blue/20 text-shigen-blue' : 'hover:bg-shigen-gray-700 text-shigen-gray-300'}`}>
                              {session.title}
                            </button>
                            <button onClick={(e) => handleDeleteImageSession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-shigen-gray-500 opacity-0 group-hover:opacity-100 hover:bg-shigen-gray-600 hover:text-shigen-gray-300 transition-all" aria-label="Delete image session">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                </>
            )}

            {viewMode === 'story' && (
                <>
                    <SearchAndNew title="Stories" onNew={onNewStorySession} searchPlaceholder="Search for stories" />
                    <nav>
                      <h2 className="text-sm font-bold text-shigen-gray-500 px-2 my-2">Recent</h2>
                      <ul>
                        {filteredStorySessions.map((session) => (
                          <li key={session.id} className="group relative">
                            <button onClick={() => onSelectStorySession(session.id)} className={`w-full text-left px-4 py-2 my-1 rounded-full text-sm truncate transition-colors ${activeStorySessionId === session.id ? 'bg-shigen-blue/20 text-shigen-blue' : 'hover:bg-shigen-gray-700 text-shigen-gray-300'}`}>
                              {session.title}
                            </button>
                            <button onClick={(e) => handleDeleteStorySession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-shigen-gray-500 opacity-0 group-hover:opacity-100 hover:bg-shigen-gray-600 hover:text-shigen-gray-300 transition-all" aria-label="Delete story">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                </>
            )}
        </div>

        <div className="flex-shrink-0 pt-4 mt-4 border-t border-shigen-gray-700 space-y-2">
            {favoritedImages.length > 0 && (
                 <div className="pb-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex items-center space-x-2">
                            <StarIcon className="w-5 h-5 text-yellow-400" isFilled={true} />
                            <h2 className="text-sm font-bold text-shigen-gray-500">Saved</h2>
                        </div>
                        <button onClick={() => { onOpenFavorites(); onClose(); }} className="text-xs text-shigen-blue hover:underline">
                            View All ({favoritedImages.length})
                        </button>
                    </div>
                    <div className="flex items-center space-x-2 px-1 overflow-x-auto pb-2">
                        {favoritedImages.slice(0, 4).map((fav, index) => (
                            <button key={fav.url} onClick={() => onOpenViewer(favoritedImages, index)} className="aspect-square w-16 h-16 flex-shrink-0 rounded-md overflow-hidden hover:opacity-80 transition-opacity">
                                <img src={fav.url} alt={fav.config.prompt} className="w-full h-full object-cover"/>
                            </button>
                        ))}
                    </div>
                 </div>
            )}
            <div className="space-y-1">
                 <UtilityButton icon={<PhotoIcon className="w-5 h-5" />} label="Image Feed" onClick={onOpenImageFeed} />
                 <UtilityButton icon={<SignalIcon className="w-5 h-5" />} label="Text Feed" onClick={onOpenTextFeed} />
                 <InstallButton />
                 <UtilityButton icon={<SettingsIcon className="w-5 h-5" />} label="Settings" onClick={onOpenSettings} />
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
