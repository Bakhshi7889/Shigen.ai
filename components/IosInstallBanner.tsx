
import React from 'react';
import IosShareIcon from './icons/IosShareIcon';
import CloseIcon from './icons/CloseIcon';

const IosInstallBanner: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed bottom-4 left-4 right-4 z-[101] bg-surface text-on-surface p-4 rounded-2xl shadow-soft animate-fade-in-up md:max-w-md md:left-auto border border-outline">
        <button onClick={onClose} className="absolute -top-2 -right-2 p-1 bg-surface-variant rounded-full text-on-surface-variant hover:bg-outline transition-colors">
             <CloseIcon className="w-5 h-5" />
        </button>
        <p className="font-bold mb-2 text-on-surface">Install this Web App:</p>
        <ol className="text-sm space-y-2 text-on-surface-variant">
            <li className="flex items-center gap-2">
                <span>1. Tap the</span>
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-on-primary rounded-md">
                    <IosShareIcon className="w-4 h-4"/>
                </span>
                <span>button in your browser.</span>
            </li>
            <li className="flex items-center gap-2">
                <span>2. Scroll down and tap '<span className="font-semibold text-on-surface">Add to Home Screen</span>'.</span>
            </li>
        </ol>
    </div>
);

export default IosInstallBanner;
