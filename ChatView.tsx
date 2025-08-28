
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatSession, Message as MessageType, ImageContent, AudioContent, ViewerImage, RefineOption } from '../types';
import MenuIcon from './icons/MenuIcon';
import TuneIcon from './icons/TuneIcon';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import CloseIcon from './icons/CloseIcon';
import ImageIcon from './icons/ImageIcon';
import StarIcon from './icons/StarIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import ImageWithLoader from './ImageWithLoader';
import { triggerHapticFeedback } from '../lib/haptics';
import UserIcon from './icons/UserIcon';
import { extractPotentialImagePrompt } from '../services/pollinations';
import MessageMenu from './MessageMenu';
import EllipsisHorizontalIcon from './icons/EllipsisHorizontalIcon';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';

interface ChatViewProps {
  chatSession: ChatSession | undefined;
  onSendMessage: (prompt: string, options: { imageToEdit?: ImageContent, numImages?: number }) => void;
  onOpenSidebar: () => void;
  onOpenInstructionEditor: () => void;
  isGenerating: boolean;
  onCancel: () => void;
  onImageSelect: (imageContent: ImageContent | null) => void;
  selectedImage: ImageContent | null;
  onToggleFavorite: (messageId: string) => void;
  onContinue: (messageId: string) => void;
  onRefine: (messageId: string, option: RefineOption) => void;
  onShare: (messageId: string) => void;
  promptFromFeed: { prompt: string; timestamp: number };
  isOnline: boolean;
  onOpenViewer: (images: ViewerImage[], startIndex: number) => void;
  onGenerateAudioForMessage: (messageId: string) => void;
  onGenerateImageFromPrompt: (prompt: string, numImages: number) => void;
  customUserDp: string | null;
  onToggleAudio: (messageId: string, audioUrl: string) => void;
  currentlyPlayingMessageId: string | null;
  isAudioPlaying: boolean;
}

const BlinkingCursor: React.FC = () => <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />;

const ImageLoadingPlaceholder: React.FC<{ numImages: number }> = ({ numImages }) => {
    return (
        <div className={`grid gap-2.5 ${numImages > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {Array.from({ length: numImages }).map((_, index) => (
                <div key={index} className="bg-surface-variant rounded-xl aspect-square w-full shimmer flex items-center justify-center">
                    <SparklesIcon className="w-10 h-10 text-primary/40 animate-pulse-slow" />
                </div>
            ))}
        </div>
    );
};

const Message: React.FC<{ 
    message: MessageType,
    isGenerating: boolean;
    isLastMessage: boolean;
    onImageSelect: (imageContent: ImageContent | null) => void,
    selectedImage: ImageContent | null,
    onOpenViewer: (clickedUrl: string) => void;
    onGenerateAudioForMessage: (messageId: string) => void;
    onGenerateImageFromPrompt: (prompt: string, numImages: number) => void;
    customUserDp: string | null;
    onShowMenu: (messageId: string) => void;
    onToggleAudio: (messageId: string, audioUrl: string) => void;
    currentlyPlayingMessageId: string | null;
    isAudioPlaying: boolean;
    activeMessageMenu: string | null;
}> = ({ 
    message, isGenerating, isLastMessage, onImageSelect, selectedImage, 
    onOpenViewer, onGenerateAudioForMessage, onGenerateImageFromPrompt, customUserDp,
    onShowMenu, onToggleAudio, currentlyPlayingMessageId, isAudioPlaying, activeMessageMenu
}) => {
    const isUser = message.role === 'user';
    const isBotText = !isUser && message.type === 'text';

    const extractedPrompt = useMemo(() => {
        if (isBotText && typeof message.content === 'string') return extractPotentialImagePrompt(message.content);
        return null;
    }, [isBotText, message.content]);

    const isMediaMessage = message.type === 'image' || (message.type === 'loading' && typeof message.content === 'string' && (message.content as string).startsWith('IMAGE_GENERATION_LOADING::'));
    
    const renderContent = () => {
        switch (message.type) {
            case 'image':
                const imageContent = message.content as ImageContent;
                return (
                    <div className={`grid gap-2.5 ${imageContent.urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {imageContent.urls.map((url, index) => (
                           <ImageWithLoader 
                                key={index} 
                                src={url} 
                                alt={`Generated image: ${imageContent.config.prompt}`}
                                onClick={() => onOpenViewer(url)}
                                onDoubleClick={() => {
                                    triggerHapticFeedback('medium');
                                    onImageSelect(selectedImage?.urls[0] === url ? null : { ...imageContent, urls: [url] })
                                }}
                                isSelected={selectedImage?.urls.includes(url)}
                            />
                        ))}
                    </div>
                );
            case 'loading':
                const loadingContent = message.content as string;
                if (loadingContent.startsWith('IMAGE_GENERATION_LOADING::')) {
                    const numImages = parseInt(loadingContent.split('::')[1], 10) || 1;
                    return <ImageLoadingPlaceholder numImages={numImages} />;
                }
                return <div className="flex items-center gap-2"><SpinnerIcon className="w-5 h-5" /><span>{loadingContent || 'Generating...'}</span></div>;
            case 'audio': return null;
            case 'error': return <p className="text-red-400">{message.content as string}</p>;
            case 'text':
            default:
                const content = message.content as string;
                const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp))/gi;
                const parts = content.split(imageUrlRegex);
                const hasImageLinks = content.match(imageUrlRegex);
                const showGenerateButton = isBotText && !isGenerating && !!extractedPrompt && !hasImageLinks;
                
                const isThisAudioPlaying = currentlyPlayingMessageId === message.id && isAudioPlaying;
                const showAudioControls = isBotText && (message.isGeneratingAudio || message.audioUrl);
                const showListenButton = isBotText && !showAudioControls;

                return (
                   <div>
                        {parts.map((part, index) => {
                            if (part.match(imageUrlRegex)) {
                                return <ImageWithLoader key={index} src={part} alt="Image from text" onClick={() => onOpenViewer(part)} />;
                            }
                            return <p key={index} className="whitespace-pre-wrap break-words">{part}{isLastMessage && isGenerating && index === parts.length - 1 && <BlinkingCursor />}</p>;
                        })}
                        
                         <div className="flex flex-wrap gap-2 mt-3">
                            {showGenerateButton && extractedPrompt && (
                                <button onClick={() => onGenerateImageFromPrompt(extractedPrompt, 4)} className="flex items-center gap-2 text-sm px-4 py-2 bg-primary text-on-primary rounded-full transition-all hover:opacity-90 active:scale-95 group-hover:animate-subtle-bounce shadow-md hover:shadow-lg">
                                   <ImageIcon className="w-5 h-5" />
                                   <span>Generate with this prompt</span>
                                </button>
                            )}
                            {showListenButton && (
                                <button onClick={() => onGenerateAudioForMessage(message.id)} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-primary-container/50 hover:bg-primary-container rounded-full transition-colors text-on-primary-container">
                                   <SpeakerIcon className="w-4 h-4" />
                                   <span>Listen</span>
                                </button>
                            )}
                         </div>
                         {showAudioControls && (
                            <div className="flex items-center gap-3 mt-2 p-1.5 pr-3 bg-primary-container/50 rounded-full w-full max-w-[200px]">
                                <button 
                                    onClick={() => message.audioUrl && onToggleAudio(message.id, message.audioUrl)}
                                    disabled={message.isGeneratingAudio}
                                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50 transition"
                                    aria-label={isThisAudioPlaying ? "Pause audio" : "Play audio"}
                                >
                                    {message.isGeneratingAudio ? <SpinnerIcon className="w-5 h-5"/> : (isThisAudioPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>)}
                                </button>
                                <div className="w-full h-1 bg-primary/20 rounded-full relative">
                                    {/* Progress can be added here in the future */}
                                </div>
                            </div>
                         )}
                   </div>
                );
        }
    };

    return (
        <div className={`flex items-start gap-3 w-full animate-message-in ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                 <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center shadow-sm">
                    <SparklesIcon className="w-5 h-5 text-on-primary" />
                 </div>
            )}
            <div className={`relative group ${isMediaMessage ? 'w-full' : ''}`}>
                <div className={`rounded-2xl ${isMediaMessage ? '' : 'p-3'} ${isUser ? 'bg-primary-container text-on-primary-container rounded-br-lg' : isMediaMessage ? 'bg-transparent' : 'bg-surface text-on-surface rounded-bl-lg'}`}>
                    {renderContent()}
                </div>
                {!isMediaMessage && activeMessageMenu !== message.id && (
                    <button 
                        onClick={() => onShowMenu(message.id)} 
                        aria-label="Message options"
                        className={`absolute -bottom-3 ${isUser ? 'right-2' : 'left-2'} z-[5] p-1 rounded-full bg-surface border border-outline shadow-sm opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                        <EllipsisHorizontalIcon className="w-4 h-4 text-on-surface-variant" />
                    </button>
                )}
            </div>
             {isUser && (
                 <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 shadow-sm overflow-hidden">
                   {customUserDp ? <img src={customUserDp} alt="User" className="w-full h-full object-cover"/> : <UserIcon className="w-full h-full p-1.5 text-on-secondary" />}
                 </div>
            )}
        </div>
    );
};

const SuggestionPills: React.FC<{ onSuggestionClick: (prompt: string) => void }> = ({ onSuggestionClick }) => {
    const suggestions = [ "Explain quantum computing", "Creative story ideas", "How do I make a website?", "What's for dinner?" ];
    return (
        <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-3 -mt-1 px-4">
            {suggestions.map(s => (
                <button 
                    key={s} 
                    onClick={() => onSuggestionClick(s)}
                    className="flex-shrink-0 px-4 py-2 bg-surface border border-outline rounded-full text-sm text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors active:scale-95"
                >
                    {s}
                </button>
            ))}
        </div>
    );
};

const EmptyState: React.FC<{ onSuggestionClick: (prompt: string) => void }> = ({ onSuggestionClick }) => (
    <div className="flex flex-col items-center justify-center text-center h-full px-4 text-on-surface-variant">
        <SparklesIcon className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold text-on-surface mb-2">How can I help you today?</h2>
        <div className="w-full max-w-sm flex flex-col gap-3 mt-6">
            <button onClick={() => onSuggestionClick('Write a poem about the ocean.')} className="w-full p-4 bg-surface rounded-3xl text-left text-sm hover:bg-surface-variant border border-outline transition">
                <p className="font-semibold text-on-surface">Write a poem</p>
                <p className="text-on-surface-variant">about the ocean's mysteries.</p>
            </button>
             <button onClick={() => onSuggestionClick('Explain the theory of relativity in simple terms.')} className="w-full p-4 bg-surface rounded-3xl text-left text-sm hover:bg-surface-variant border border-outline transition">
                <p className="font-semibold text-on-surface">Explain a concept</p>
                <p className="text-on-surface-variant">like the theory of relativity.</p>
            </button>
             <button onClick={() => onSuggestionClick('Give me ideas for a healthy dinner.')} className="w-full p-4 bg-surface rounded-3xl text-left text-sm hover:bg-surface-variant border border-outline transition">
                <p className="font-semibold text-on-surface">Get inspired</p>
                <p className="text-on-surface-variant">with ideas for a healthy dinner.</p>
            </button>
        </div>
    </div>
);

const ChatView: React.FC<ChatViewProps> = ({ chatSession, onSendMessage, onOpenSidebar, onOpenInstructionEditor, isGenerating, onCancel, onImageSelect, selectedImage, onToggleFavorite, onContinue, onRefine, onShare, promptFromFeed, isOnline, onOpenViewer, onGenerateAudioForMessage, onGenerateImageFromPrompt, customUserDp, onToggleAudio, currentlyPlayingMessageId, isAudioPlaying }) => {
  const [input, setInput] = useState('');
  const mainRef = useRef<HTMLDivElement>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  
  const allViewerImages = useMemo(() => {
    return chatSession?.messages
      .filter(m => m.type === 'image')
      .flatMap(m => (m.content as ImageContent).urls.map(url => ({ url, config: (m.content as ImageContent).config }))) || [];
  }, [chatSession]);

  const handleOpenViewerForUrl = (clickedUrl: string) => {
    const index = allViewerImages.findIndex(img => img.url === clickedUrl);
    if (index !== -1) {
      onOpenViewer(allViewerImages, index);
    }
  };

  const handleShowMenu = (messageId: string) => {
    triggerHapticFeedback('light');
    setActiveMessageMenu(prev => prev === messageId ? null : messageId);
  }

  const handleSendMessageWrapper = () => {
    if (input.trim() || selectedImage) {
        triggerHapticFeedback('medium');
        onSendMessage(input.trim(), { imageToEdit: selectedImage as ImageContent, numImages: 1 });
        setInput('');
        onImageSelect(null);
    }
  };
  
  useEffect(() => {
      const mainEl = mainRef.current;
      if (mainEl) {
        // Only autoscroll if user is near the bottom.
        const isScrolledToBottom = mainEl.scrollHeight - mainEl.clientHeight <= mainEl.scrollTop + 100;
        if (isScrolledToBottom) {
             mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
        }
      }
  }, [chatSession?.messages.length, chatSession?.messages[chatSession.messages.length - 1]?.content]);

  useEffect(() => {
    if (promptFromFeed.prompt && promptFromFeed.timestamp > 0) {
      setInput(promptFromFeed.prompt);
    }
  }, [promptFromFeed]);
  
  const renderMessages = () => {
    if (!chatSession || chatSession.messages.length === 0) {
      return <EmptyState onSuggestionClick={setInput} />;
    }
    return (
      <div className="space-y-4">
        {chatSession.messages.filter(m => m.type !== 'audio').map((message, index) => (
          <div key={message.id} className="relative">
             <Message
                message={message}
                isGenerating={isGenerating}
                isLastMessage={index === chatSession.messages.length - 1}
                onImageSelect={onImageSelect}
                selectedImage={selectedImage}
                onOpenViewer={handleOpenViewerForUrl}
                onGenerateAudioForMessage={onGenerateAudioForMessage}
                onGenerateImageFromPrompt={onGenerateImageFromPrompt}
                customUserDp={customUserDp}
                onShowMenu={handleShowMenu}
                onToggleAudio={onToggleAudio}
                currentlyPlayingMessageId={currentlyPlayingMessageId}
                isAudioPlaying={isAudioPlaying}
                activeMessageMenu={activeMessageMenu}
            />
            {activeMessageMenu === message.id && (
                <div className={`absolute z-10 ${message.role === 'user' ? 'right-10' : 'left-10'} -bottom-4`}>
                    <MessageMenu 
                        message={message}
                        onRefine={(option) => { onRefine(message.id, option); setActiveMessageMenu(null); }}
                        onShare={() => { onShare(message.id); setActiveMessageMenu(null); }}
                        onToggleFavorite={() => { onToggleFavorite(message.id); setActiveMessageMenu(null); }}
                        onClose={() => setActiveMessageMenu(null)}
                    />
                </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <header className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center space-x-2">
            <button onClick={onOpenSidebar} className="p-2 rounded-full hover:bg-surface-variant md:hidden" aria-label="Open sidebar"><MenuIcon className="w-6 h-6" /></button>
            <h1 className="text-lg font-semibold">{chatSession?.title || 'New Chat'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
          <button onClick={onOpenInstructionEditor} className="p-2 rounded-full hover:bg-surface-variant" aria-label="Edit system instruction"><TuneIcon className="w-6 h-6" /></button>
        </div>
      </header>
      
      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6" onClick={() => setActiveMessageMenu(null)}>
        <div className="max-w-3xl mx-auto">
            {chatSession?.messages.length === 0 && <SuggestionPills onSuggestionClick={setInput} />}
            {renderMessages()}
        </div>
      </main>

      <footer className="flex-shrink-0 p-4 bg-background/80 backdrop-blur-md border-t border-outline">
        <div className="max-w-3xl mx-auto">
             {isGenerating && (
              <div className="flex justify-center mb-3">
                  <button onClick={onCancel} className="flex items-center gap-2 text-sm px-4 py-2 bg-surface border border-outline rounded-full hover:bg-surface-variant transition-colors">
                      <SpinnerIcon className="w-4 h-4" />
                      <span>Cancel</span>
                  </button>
              </div>
            )}
             {selectedImage && (
                <div className="bg-surface border border-outline rounded-xl p-2 mb-2 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm">
                      <ImageIcon className="w-5 h-5 text-primary flex-shrink-0" />
                      <p className="text-on-surface-variant">Editing 1 image. Describe your changes.</p>
                    </div>
                    <button onClick={() => onImageSelect(null)} className="p-1 rounded-full text-on-surface-variant hover:bg-outline hover:text-on-surface transition-colors" aria-label="Cancel image edit">
                        <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
             )}
            <div className="relative flex items-center">
                <div className="relative flex-grow">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessageWrapper(); } }}
                        placeholder="Message SHIGEN... (try 'draw a robot')"
                        className="w-full bg-surface-variant rounded-2xl p-3 pr-14 resize-none text-base border border-transparent focus:ring-2 focus:ring-primary focus:border-primary transition"
                        rows={1}
                        style={{ minHeight: '52px' }}
                        disabled={isGenerating}
                    />
                     <button 
                        onClick={handleSendMessageWrapper} 
                        disabled={(!input.trim() && !selectedImage) || isGenerating} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 enabled:bg-primary enabled:text-on-primary"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;