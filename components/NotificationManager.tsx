import React, { useState, useEffect, useRef } from 'react';
import type { Notification } from '../types';
import CloseIcon from './icons/CloseIcon';

interface NotificationManagerProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

const getIconForType = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return '✅';
        case 'error':
            return '❌';
        case 'info':
        default:
            return 'ℹ️';
    }
};

const getColorsForType = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return 'bg-green-500/20 border-green-500/30 text-green-300';
        case 'error':
            return 'bg-red-500/20 border-red-500/30 text-red-300';
        case 'info':
        default:
            return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
    }
}

const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
    const [isHovered, setIsHovered] = useState(false);
    const dismissTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isHovered) {
            dismissTimerRef.current = window.setTimeout(() => {
                onDismiss(notification.id);
            }, 5000); // 5 seconds
        }

        return () => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, [notification.id, onDismiss, isHovered]);
    
    return (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
            w-full max-w-sm rounded-lg shadow-lg flex items-start p-4 mb-3
            border backdrop-blur-md animate-fade-in-up
            ${getColorsForType(notification.type)}
        `}>
            <div className="flex-shrink-0 mr-3 text-lg">{getIconForType(notification.type)}</div>
            <div className="flex-grow text-sm font-medium">
                {notification.message}
            </div>
            <button
                onClick={() => onDismiss(notification.id)}
                className="ml-4 p-1 -mr-2 -mt-2 text-current opacity-70 hover:opacity-100 rounded-full"
                aria-label="Dismiss notification"
            >
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
    );
};


const NotificationManager: React.FC<NotificationManagerProps> = ({ notifications, onDismiss }) => {
    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm">
            {notifications.map(notification => (
                <NotificationToast key={notification.id} notification={notification} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

export default NotificationManager;