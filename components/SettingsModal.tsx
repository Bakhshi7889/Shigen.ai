import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { Settings, ModelStatusMap, Theme, ModelStatus } from '../types';
import CloseIcon from './icons/CloseIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import UsersIcon from './icons/UsersIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
  textModels: string[];
  imageModels: string[];
  modelStatus: ModelStatusMap;
  onCheckModels: () => void;
  isCheckingModels: boolean;
  onOpenThemeGenerator: () => void;
  onOpenPersonaManager: () => void;
}

const themes: { id: Theme, name: string }[] = [
    { id: 'dark', name: 'Dark'},
    { id: 'light', name: 'Light' },
    { id: 'oceanic', name: 'Oceanic' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'monochrome', name: 'Monochrome' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, textModels, imageModels, modelStatus, onCheckModels, isCheckingModels, onOpenThemeGenerator, onOpenPersonaManager }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState({ startY: 0, currentY: 0, isDragging: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on the main modal body, not on scrollable content
    if (e.target !== modalContentRef.current && (e.target as HTMLElement).closest('.overflow-y-auto')) {
      return;
    }
    modalContentRef.current?.setPointerCapture(e.pointerId);
    setDragState({ startY: e.clientY, currentY: e.clientY, isDragging: true });
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    const deltaY = e.clientY - dragState.startY;
    // Only allow dragging down
    if (deltaY > 0) {
      setDragState(s => ({ ...s, currentY: e.clientY }));
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    modalContentRef.current?.releasePointerCapture(e.pointerId);
    const deltaY = dragState.currentY - dragState.startY;
    const DISMISS_THRESHOLD = 100; // pixels
    if (deltaY > DISMISS_THRESHOLD) {
      onClose();
    }
    setDragState({ startY: 0, currentY: 0, isDragging: false });
  };
  
  if (!isOpen) return null;

  const dragOffset = dragState.isDragging ? Math.max(0, dragState.currentY - dragState.startY) : 0;
  const modalStyle: React.CSSProperties = {
    transform: `translateY(${dragOffset}px)`,
    transition: dragState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, [e.target.name]: e.target.value });
  };
  
  const someModelsChecked = Object.values(modelStatus).some(s => s !== 'unchecked' && s !== 'checking');

  const sortedTextModels = useMemo(() => {
    return [...textModels]
      .sort((a, b) => {
        const statusA = modelStatus[a] || 'unchecked';
        const statusB = modelStatus[b] || 'unchecked';
        const score = (status: ModelStatus): number => status === 'available' ? 0 : status === 'checking' ? 1 : status === 'unchecked' ? 2 : 3;
        return score(statusA) - score(statusB) || a.localeCompare(b);
    });
  }, [textModels, modelStatus]);

    const sortedImageModels = useMemo(() => {
        return [...imageModels]
          .sort((a, b) => {
            const statusA = modelStatus[a] || 'unchecked';
            const statusB = modelStatus[b] || 'unchecked';
            const score = (status: ModelStatus): number => status === 'available' ? 0 : status === 'checking' ? 1 : status === 'unchecked' ? 2 : 3;
            return score(statusA) - score(statusB) || a.localeCompare(b);
        });
    }, [imageModels, modelStatus]);
  
  const renderModelOptions = (models: string[]) => {
    return models.map(model => {
        const status = modelStatus[model] || 'unchecked';
        const symbol = status === 'available' ? '🟢' : status === 'unavailable' ? '🔴' : status === 'checking' ? '🟡' : '⚪️';
        return <option key={model} value={model}>{symbol} {model}</option>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
        <div 
            ref={modalContentRef}
            style={modalStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="glassmorphic-surface rounded-t-3xl md:rounded-2xl shadow-strong w-full max-w-lg p-6 relative animate-slide-in-up md:animate-spring-in h-[90vh] md:h-auto flex flex-col touch-none" 
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-on-surface">Settings</h2>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto -mx-6 px-6 touch-pan-y">
                <div className="space-y-8">
                    <section>
                         <h3 className="text-base font-semibold text-on-surface-variant mb-3">Models</h3>
                         <div className="space-y-4">
                            <div>
                                <label htmlFor="textModel" className="block text-sm font-medium text-on-surface-variant mb-1.5">Chat & Story Model</label>
                                <select id="textModel" name="textModel" value={settings.textModel} onChange={handleSelectChange} className="w-full bg-surface-variant rounded-xl p-3 text-on-surface focus:ring-2 focus:ring-primary">
                                    {renderModelOptions(sortedTextModels)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="imageModel" className="block text-sm font-medium text-on-surface-variant mb-1.5">Image Generation Model</label>
                                <select id="imageModel" name="imageModel" value={settings.imageModel} onChange={handleSelectChange} className="w-full bg-surface-variant rounded-xl p-3 text-on-surface focus:ring-2 focus:ring-primary">
                                    {renderModelOptions(sortedImageModels)}
                                </select>
                            </div>
                            <div>
                                <button onClick={onCheckModels} disabled={isCheckingModels} className="w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold bg-surface-variant text-on-surface-variant hover:bg-outline disabled:opacity-50 transition-colors">
                                    {isCheckingModels ? <span className="flex items-center justify-center gap-2"><SpinnerIcon className="w-4 h-4" />Checking Models...</span> : `Check Model Status ${someModelsChecked ? '(Re-check)' : ''}`}
                                </button>
                            </div>
                         </div>
                    </section>

                    <div className="border-t border-outline"></div>
                    
                    <section>
                        <h3 className="text-base font-semibold text-on-surface-variant mb-3">Personalization</h3>
                        <div className="space-y-4">
                            <button onClick={onOpenPersonaManager} className="w-full text-center px-4 py-3 rounded-xl text-base font-semibold bg-surface-variant text-on-surface-variant hover:bg-outline disabled:opacity-50 transition-colors flex items-center justify-center gap-3">
                                <UsersIcon className="w-5 h-5" />
                                Manage AI Personas
                            </button>
                        </div>
                    </section>
                    
                    <div className="border-t border-outline"></div>

                     <section>
                        <h3 className="text-base font-semibold text-on-surface-variant mb-3">Appearance</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                 {themes.map(theme => (
                                    <button key={theme.id} onClick={() => onSettingsChange({ ...settings, theme: theme.id, aiTheme: null })} className={`w-full p-2.5 rounded-lg border-2 transition-colors text-left ${settings.theme === theme.id && !settings.aiTheme ? 'border-primary' : 'border-outline'}`}>
                                        <span className="font-semibold text-on-surface">{theme.name}</span>
                                    </button>
                                 ))}
                            </div>
                            <div className="flex flex-col gap-2">
                               <button onClick={onOpenThemeGenerator} className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg border-2 bg-gradient-to-br from-primary-container to-secondary transition-colors hover:border-primary/80 relative overflow-hidden group card-3d-effect">
                                    <span className="font-semibold text-on-primary-container z-10">AI Theme</span>
                                    <span className="text-xs text-on-primary-container/80 z-10">Generate with AI</span>
                                    <PaintBrushIcon className="w-12 h-12 absolute -right-2 -bottom-2 text-primary/20 group-hover:scale-110 transition-transform z-0"/>
                               </button>
                               {settings.aiTheme && (
                                    <button onClick={() => onSettingsChange({ ...settings, aiTheme: null })} className="text-xs text-center p-1.5 rounded-full bg-surface-variant text-on-surface-variant hover:bg-outline transition-colors">
                                        Clear AI Theme
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsModal;