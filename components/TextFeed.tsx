

import React, { useState, useEffect, useRef } from 'react';
import CloseIcon from './icons/CloseIcon';
import SignalIcon from './icons/SignalIcon';

interface TextFeedProps {
    isOpen: boolean;
    onClose: () => void;
    onPromptSelect: (prompt: string) => void;
}

interface FeedItem {
    id: string;
    prompt: string;
}

const TextFeed: React.FC<TextFeedProps> = ({ isOpen, onClose, onPromptSelect }) => {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [isFeedActive, setIsFeedActive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setIsFeedActive(false);
            setConnectionStatus('idle');
            return;
        }

        if (isFeedActive) {
            setConnectionStatus('connecting');
            const eventSource = new EventSource('https://text.pollinations.ai/feed');
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => setConnectionStatus('connected');

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const promptText = data.prompt || data.completion;
                    if (promptText && typeof promptText === 'string' && promptText.trim().length > 5) {
                        const newItem: FeedItem = {
                            id: `${Date.now()}-${Math.random()}`,
                            prompt: promptText.trim(),
                        };
                        setFeed(prevFeed => [newItem, ...prevFeed].slice(0, 100));
                    }
                } catch (error) {
                    // Silently ignore parsing errors
                }
            };

            eventSource.onerror = (error) => {
                console.error('EventSource for text failed:', error);
                setConnectionStatus('error');
                eventSource.close();
            };
        } else {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            setConnectionStatus('idle');
        }

        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, [isOpen, isFeedActive]);

    const handlePromptClick = (prompt: string) => {
        onPromptSelect(prompt);
    };

    const renderContent = () => {
        if (connectionStatus === 'error') {
            return (
                <div className="flex items-center justify-center h-full text-red-400">
                    <p>Connection failed. Please try again.</p>
                </div>
            );
        }

        if (feed.length > 0) {
            return feed.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handlePromptClick(item.prompt)}
                    className="w-full text-left p-3 bg-surface rounded-xl hover:bg-surface-variant transition-colors group animate-fade-in"
                    aria-label={`Use prompt: ${item.prompt}`}
                >
                    <p className="text-sm text-on-surface-variant font-mono group-hover:text-on-surface transition-colors">{item.prompt}</p>
                </button>
            ));
        }

        const statusMap = {
            connecting: "Connecting to live prompt feed...",
            connected: "Waiting for new prompts...",
            idle: 'Press "Start Feed" to see live prompts.'
        };
        return (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
                <p>{statusMap[connectionStatus]}</p>
            </div>
        );
    };

    return (
        <div className={`fixed inset-0 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full bg-background w-full max-w-md p-4 z-50 transform shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-outline`}>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <SignalIcon className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-semibold text-on-surface">Text Prompt Feed</h2>
                    </div>
                     <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setIsFeedActive(!isFeedActive)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                isFeedActive 
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                        >
                            {isFeedActive ? 'Stop Feed' : 'Start Feed'}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-variant transition text-on-surface-variant" aria-label="Close text feed">
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-on-surface-variant mb-4 flex-shrink-0 border-b border-outline pb-4">
                    See prompts others are using. Click any prompt to try it yourself.
                </p>
                <div className="flex-grow overflow-y-auto space-y-2 -mr-2 pr-2">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default TextFeed;