
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatSession, Message as MessageType, ImageContent, AudioContent, ViewerImage, RefineOption } from '../types';
import MenuIcon from './icons/MenuIcon';
import TuneIcon from './icons/TuneIcon';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import MagicWandIcon from './icons/MagicWandIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import CloseIcon from './icons/CloseIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ImageIcon from './icons/ImageIcon';
import StarIcon from './icons/StarIcon';
import ShareIcon from './icons/ShareIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import ImageWithLoader from './ImageWithLoader';
import { triggerHapticFeedback } from '../lib/haptics';
import UserIcon from './icons/UserIcon';
import { extractPotentialImagePrompt } from '../services/pollinations';

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
}

const BlinkingCursor: React.FC = () => <span className="inline-block w-2 h-5 bg-shigen-blue animate-pulse ml-1" />;

const MessageActions: React.FC<{
    messageId: string;
    isHovered: boolean;
    isFavorited: boolean;
    onToggleFavorite: (id: string) => void;
    onShare: (id: string) => void;
}> = ({ messageId, isHovered, isFavorited, onToggleFavorite, onShare }) => (
    <div className={`absolute -right-2 top-0 flex flex-col items-center gap-2 transition-opacity duration-200 ${isHovered || isFavorited ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100'}`}>
        <button onClick={() => onToggleFavorite(messageId)} className={`p-1.5 rounded-full transition-colors ${isFavorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-shigen-gray-500 hover:text-shigen-gray-300'}`} aria-label={isFavorited ? 'Unfavorite message' : 'Favorite message'}>
            <StarIcon className="w-5 h-5" isFilled={!!isFavorited} />
        </button>
        <button onClick={() => onShare(messageId)} className="p-1.5 rounded-full text-shigen-gray-500 hover:text-shigen-gray-300 transition-colors" aria-label="Share message">
            <ShareIcon className="w-5 h-5" />
        </button>
    </div>
);

const RefineMenu: React.FC<{ onSelect: (option: RefineOption) => void }> = ({ onSelect }) => (
    <div className="bg-shigen-gray-700 rounded-md shadow-lg py-1 animate-fade-in">
        <button onClick={() => onSelect('shorter')} className="block w-full text-left px-3 py-1.5 text-sm text-shigen-gray-300 hover:bg-shigen-gray-600">Make Shorter</button>
        <button onClick={() => onSelect('longer')} className="block w-full text-left px-3 py-1.5 text-sm text-shigen-gray-300 hover:bg-shigen-gray-600">Make Longer</button>
        <button onClick={() => onSelect('formal')} className="block w-full text-left px-3 py-1.5 text-sm text-shigen-gray-300 hover:bg-shigen-gray-600">Make More Formal</button>
        <button onClick={() => onSelect('simple')} className="block w-full text-left px-3 py-1.5 text-sm text-shigen-gray-300 hover:bg-shigen-gray-600">Explain It Simply</button>
    </div>
);


const Message: React.FC<{ 
    message: MessageType,
    isGenerating: boolean;
    isLastMessage: boolean;
    onImageSelect: (imageContent: ImageContent | null) => void,
    selectedImage: ImageContent | null,
    onToggleFavorite: (messageId: string) => void;
    onContinue: (messageId: string) => void;
    onRefine: (messageId: string, option: RefineOption) => void;
    onShare: (id: string) => void;
    onOpenViewer: (clickedUrl: string) => void;
    onGenerateAudioForMessage: (messageId: string) => void;
    onGenerateImageFromPrompt: (prompt: string, numImages: number) => void;
    customUserDp: string | null;
}> = ({ 
    message, isGenerating, isLastMessage, onImageSelect, selectedImage, 
    onToggleFavorite, onContinue, onRefine, onShare, onOpenViewer, 
    onGenerateAudioForMessage, onGenerateImageFromPrompt, customUserDp
}) => {
    const isUser = message.role === 'user';
    const [isHovered, setIsHovered] = useState(false);
    const [showRefineMenu, setShowRefineMenu] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isBotText = !isUser && message.type === 'text';

    const extractedPrompt = useMemo(() => {
        if (isBotText) {
            return extractPotentialImagePrompt(message.content as string);
        }
        return null;
    }, [isBotText, message.content]);

    const handleRefineSelect = (option: RefineOption) => {
        onRefine(message.id, option);
        setShowRefineMenu(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowRefineMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const iconAnimationClass = isGenerating && isLastMessage && !isUser ? 'animate-subtle-bounce' : '';
    const messageAnimationClass = !isUser && message.type !== 'loading' ? 'animate-spring-in' : 'animate-fade-in-up';

    const renderContent = () => {
        switch (message.type) {
            case 'image':
                const imageContent = message.content as ImageContent;
                return (
                    <div className={`mt-2 grid gap-2 max-w-lg ${imageContent.urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                const loadingText = (message.content as string) || 'Generating...';
                return <div className="flex items-center gap-2"><SpinnerIcon className="w-5 h-5" /><span>{loadingText}</span></div>;
            case 'audio': /* ... */ return null;
            case 'error': return <p className="text-red-400">{message.content as string}</p>;
            case 'text':
            default:
                const content = message.content as string;
                const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp))/gi;
                const parts = content.split(imageUrlRegex);
                const hasImageLinks = content.match(imageUrlRegex);
                const showGenerateButton = isBotText && !isGenerating && !!extractedPrompt && !hasImageLinks;
                const showContinueRefineButtons = isBotText && !isGenerating && !showGenerateButton;

                const BotTextActions = () => {
                    return (
                        <div className="flex items-center gap-2 mt-3">
                            {showGenerateButton && (
                                <button onClick={() => extractedPrompt && onGenerateImageFromPrompt(extractedPrompt, 4)} className="text-sm text-shigen-blue bg-shigen-blue/10 px-3 py-1 rounded-full hover:bg-shigen-blue/20 transition flex items-center gap-1.5">
                                    <MagicWandIcon className="w-4 h-4" /> Generate (4)
                                </button>
                            )}
                            {showContinueRefineButtons && (
                                 <div ref={wrapperRef} className="flex items-center gap-2 relative">
                                    <button onClick={() => onContinue(message.id)} className="text-sm text-shigen-blue bg-shigen-blue/10 px-3 py-1 rounded-full hover:bg-shigen-blue/20 transition">Continue</button>
                                    <button onClick={() => setShowRefineMenu(s => !s)} className="text-sm text-shigen-blue bg-shigen-blue/10 px-3 py-1 rounded-full hover:bg-shigen-blue/20 transition">Refine</button>
                                    {showRefineMenu && <div className="absolute top-full left-0 mt-2 z-10 w-40"><RefineMenu onSelect={handleRefineSelect} /></div>}
                                </div>
                            )}
                        </div>
                    );
                }
                
                return (
                    <div>
                        <div className="flex items-start gap-3">
                            <div className="whitespace-pre-wrap flex-1">{hasImageLinks ? parts.map((part, index) => (part && (index % 2 === 1 ? <div key={index} className="my-2 max-w-sm"><ImageWithLoader src={part} alt="Image from link" /></div> : <span key={index}>{part}</span>))) : content} {isGenerating && isLastMessage && !isUser && <BlinkingCursor />}</div>
                             {isBotText && content.trim() && (
                                <button onClick={() => onGenerateAudioForMessage(message.id)} className="text-shigen-gray-500 hover:text-shigen-gray-300 transition-colors p-1" aria-label="Play audio for message">
                                    {message.isGeneratingAudio ? <SpinnerIcon className="w-5 h-5" /> : <SpeakerIcon className="w-5 h-5" />}
                                </button>
                            )}
                        </div>
                        <BotTextActions />
                    </div>
                );
        }
    }

    return (
        <div className={`py-6 group ${messageAnimationClass}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isUser ? 'bg-shigen-gray-600' : 'bg-gradient-to-br from-blue-400 to-purple-500'} ${iconAnimationClass}`}>
                    {isUser ? (
                        customUserDp ? <img src={customUserDp} alt="User Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-white" />
                    ) : <SparklesIcon className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold">{isUser ? 'You' : 'SHIGEN'}</div>
                    <div className="mt-1 text-shigen-gray-300 text-base relative pr-10">
                        {renderContent()}
                         {!isUser && <MessageActions messageId={message.id} isHovered={isHovered} isFavorited={!!message.isFavorited} onToggleFavorite={onToggleFavorite} onShare={onShare}/>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ onPromptSelect: (prompt: string) => void }> = ({ onPromptSelect }) => {
    const suggestions = [
      {
        icon: <LightbulbIcon className="w-5 h-5" />,
        title: "Explain a concept",
        prompt: "Explain quantum computing in simple terms",
      },
      {
        icon: <MagicWandIcon className="w-5 h-5" />,
        title: "Brainstorm ideas",
        prompt: "Brainstorm names for a new coffee shop",
      },
      {
        icon: <ImageIcon className="w-5 h-5" />,
        title: "Create an image",
        prompt: "/generate a cinematic photo of a robot reading a book in a library",
      },
      {
        icon: <SparklesIcon className="w-5 h-5" />,
        title: "Write a poem",
        prompt: "Write a short poem about the rain",
      },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-shigen-gray-500 animate-fade-in">
            <div className="mb-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg mb-4">
                    <SparklesIcon className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-shigen-gray-300">SHIGEN</h1>
                <p className="text-lg">How can I help you today?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                {suggestions.map((item, index) => (
                    <button 
                        key={index} 
                        onClick={() => onPromptSelect(item.prompt)}
                        className="bg-shigen-gray-800/80 p-4 rounded-lg text-left hover:bg-shigen-gray-700/80 transition-colors border border-shigen-gray-700/50"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-shigen-gray-700 rounded-full text-shigen-gray-300">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="font-semibold text-shigen-gray-300">{item.title}</h3>
                                <p className="text-sm text-shigen-gray-500">{item.prompt}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ChatView: React.FC<ChatViewProps> = ({ 
    chatSession, onSendMessage, onOpenSidebar, onOpenInstructionEditor,
    isGenerating, onCancel, onImageSelect, selectedImage, 
    onToggleFavorite, onContinue, onRefine, onShare, promptFromFeed, isOnline,
    onOpenViewer, onGenerateAudioForMessage, onGenerateImageFromPrompt, customUserDp
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allViewerImages = useMemo(() => {
    if (!chatSession) return [];
    return chatSession.messages.flatMap(msg => (msg.type === 'image' && msg.content && typeof msg.content === 'object' && 'urls' in msg.content) ? (msg.content as ImageContent).urls.map(url => ({ url, config: (msg.content as ImageContent).config })) : []);
  }, [chatSession]);

  const handleOpenViewer = (clickedUrl: string) => {
    const startIndex = allViewerImages.findIndex(img => img.url === clickedUrl);
    if (startIndex !== -1) { onOpenViewer(allViewerImages, startIndex); }
  };

  useEffect(() => { if (promptFromFeed?.timestamp > 0) { setInput(promptFromFeed.prompt); textareaRef.current?.focus(); } }, [promptFromFeed]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [input]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatSession?.messages]);
  
  const handlePromptSelect = (prompt: string) => { onSendMessage(prompt, { imageToEdit: selectedImage || undefined }); setInput(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback('medium');
    const trimmedInput = input.trim();
    if (trimmedInput && !isGenerating) {
      onSendMessage(trimmedInput, { imageToEdit: selectedImage || undefined });
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-shigen-gray-900">
      <header className="flex items-center justify-between p-4 border-b border-shigen-gray-700/50 flex-shrink-0">
        <div className="flex items-center space-x-2">
            <button onClick={onOpenSidebar} className="p-2 rounded-full hover:bg-shigen-gray-700 md:hidden" aria-label="Open sidebar"><MenuIcon className="w-6 h-6" /></button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium">{chatSession?.title || 'New Chat'}</h1>
              <button onClick={onOpenInstructionEditor} className="p-1 rounded-full text-shigen-gray-500 hover:bg-shigen-gray-700 hover:text-shigen-gray-300 transition-colors" aria-label="Customize Persona"><TuneIcon className="w-5 h-5" /></button>
              {!isOnline && <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">Offline</span>}
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto h-full">
            {(!chatSession || chatSession.messages.length === 0) ? <EmptyState onPromptSelect={handlePromptSelect} /> : chatSession.messages.map((msg, index) => <Message key={msg.id} message={msg} isGenerating={isGenerating} isLastMessage={index === chatSession.messages.length - 1} onImageSelect={onImageSelect} selectedImage={selectedImage} onToggleFavorite={onToggleFavorite} onContinue={onContinue} onRefine={onRefine} onShare={onShare} onOpenViewer={handleOpenViewer} onGenerateAudioForMessage={onGenerateAudioForMessage} onGenerateImageFromPrompt={onGenerateImageFromPrompt} customUserDp={customUserDp} />)}
            <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto relative">
          {selectedImage && (
            <div className="bg-shigen-gray-800/60 backdrop-blur-md border border-shigen-gray-700 rounded-lg p-2 mb-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-sm">
                  <img src={selectedImage.urls[0] ?? ''} className="w-10 h-10 rounded-md object-cover" alt="Selected to edit" />
                  <p className="text-shigen-gray-400">Editing image. <span className="font-medium text-shigen-gray-300">Describe your changes.</span></p>
                </div>
                <button onClick={() => onImageSelect(null)} className="p-1.5 rounded-full text-shigen-gray-500 hover:bg-shigen-gray-600 hover:text-shigen-gray-300 transition-colors" aria-label="Cancel image edit"><CloseIcon className="w-5 h-5" /></button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="relative rounded-lg bg-shigen-gray-800 border border-shigen-gray-700/80 focus-within:border-shigen-blue transition-colors shadow-[0_0_20px_rgba(138,180,248,0.25),_0_0_8px_rgba(192,132,252,0.25)]">
             <div className="flex items-start p-2 pr-3">
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { handleSubmit(e); } }} placeholder={selectedImage ? "Describe changes to the image..." : "Message SHIGEN..."} className="w-full bg-transparent resize-none overflow-y-hidden focus:outline-none text-shigen-gray-300 p-2 pl-3" rows={1} disabled={(isGenerating && !selectedImage) || !isOnline} />
                <button type={isGenerating ? 'button' : 'submit'} onClick={isGenerating ? onCancel : undefined} disabled={(!input.trim() && !isGenerating) || !isOnline} className="ml-2 p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-shigen-blue enabled:text-white" aria-label={isGenerating ? "Cancel generation" : "Send message"}>
                  {isGenerating ? <SpinnerIcon className="w-6 h-6" /> : <SendIcon className="w-6 h-6" />}
                </button>
            </div>
          </form>
           <p className="text-center text-xs text-shigen-gray-500 mt-2">SHIGEN can make mistakes, so double-check its responses.</p>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;