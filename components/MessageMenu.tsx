import React from 'react';
import type { Message, RefineOption } from '../types';
import CopyIcon from './icons/CopyIcon';
import SparklesIcon from './icons/SparklesIcon';
import ShareIcon from './icons/ShareIcon';
import StarIcon from './icons/StarIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';

interface MessageMenuProps {
    message: Message;
    onRefine: (option: RefineOption) => void;
    onShare: () => void;
    onToggleFavorite: () => void;
    onClose: () => void;
    onContinue: () => void;
}

const MessageMenu: React.FC<MessageMenuProps> = ({ message, onRefine, onShare, onToggleFavorite, onClose, onContinue }) => {
    const isBotText = message.role === 'bot' && message.type === 'text';

    const menuItems = [
        { label: 'Copy', icon: <CopyIcon className="w-5 h-5" />, action: () => onRefine('copy'), show: message.type === 'text' },
        { label: 'Continue', icon: <ArrowPathIcon className="w-5 h-5" />, action: onContinue, show: isBotText },
        { label: 'Refine', icon: <SparklesIcon className="w-5 h-5" />, subMenu: [
            { label: 'Shorter', action: () => onRefine('shorter') },
            { label: 'Longer', action: () => onRefine('longer') },
            { label: 'Formal', action: () => onRefine('formal') },
            { label: 'Simple', action: () => onRefine('simple') },
        ], show: isBotText },
        { label: 'Share', icon: <ShareIcon className="w-5 h-5" />, action: onShare, show: message.type === 'text' && navigator.share },
        { label: message.isFavorited ? 'Unfavorite' : 'Favorite', icon: <StarIcon className="w-5 h-5" isFilled={!!message.isFavorited} />, action: onToggleFavorite, show: true },
    ];
    
    return (
        <div className="bg-surface rounded-2xl shadow-soft p-1.5 animate-spring-in border border-outline flex items-center gap-1">
            {menuItems.filter(item => item.show).map(item => (
                 item.subMenu ? (
                    <div key={item.label} className="relative group">
                        <button aria-label="Refine text" className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors">
                            {item.icon}
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-surface rounded-xl shadow-soft py-1 border border-outline opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            {item.subMenu.map(sub => (
                                <button key={sub.label} onClick={sub.action} className="block w-full text-left px-3 py-1.5 text-sm text-on-surface hover:bg-surface-variant">{sub.label}</button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <button key={item.label} onClick={item.action} aria-label={item.label} className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors">
                        {item.icon}
                    </button>
                )
            ))}
        </div>
    );
};

export default MessageMenu;
