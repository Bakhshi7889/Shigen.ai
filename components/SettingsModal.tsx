import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { Settings, ModelStatusMap, Theme, ModelStatus } from '../types';
import CloseIcon from './icons/CloseIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import { getAudioUrl, isAudioModel } from '../services/pollinations';

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
}

const audioVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const themes: { id: Theme, name: string }[] = [
    { id: 'shigen', name: 'SHIGEN (Dark)'},
    { id: 'light', name: 'Paper (Light)' },
    { id: 'rose-gold', name: 'Rose Gold' },
    { id: 'ocean-deep', name: 'Ocean Deep' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, textModels, imageModels, modelStatus, onCheckModels, isCheckingModels, onOpenThemeGenerator }) => {
  if (!isOpen) return null;

  const [isVoicePreviewing, setIsVoicePreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Initialize audio element on mount
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleEnded = () => {
        setIsVoicePreviewing(false);
        if (audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
        }
    };

    const handleError = () => {
        console.error("Audio playback error.");
        setIsVoicePreviewing(false);
        if (audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
        }
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Cleanup function
    return () => {
        if (audioAbortControllerRef.current) {
            audioAbortControllerRef.current.abort();
        }
        if (audio) {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.pause();
            if (audio.src && audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(audio.src);
            }
        }
    };
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, [e.target.name]: e.target.value });
  };
  
  const handleVoiceChangeAndPlayback = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    onSettingsChange({ ...settings, audioVoice: newVoice });

    // Abort any ongoing fetch and stop any current playback
    if (audioAbortControllerRef.current) audioAbortControllerRef.current.abort();
    if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
        }
    }
    
    setIsVoicePreviewing(true);
    
    const controller = new AbortController();
    audioAbortControllerRef.current = controller;

    const sampleText = "This is a preview of the selected voice.";
    const audioUrl = getAudioUrl(sampleText, settings.audioModel, newVoice);

    try {
        const response = await fetch(audioUrl, { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`Audio fetch failed with status ${response.status}`);
        
        const audioBlob = await response.blob();
        if (controller.signal.aborted) return;
        
        if (audioBlob.size === 0 || !audioBlob.type.startsWith('audio/')) throw new Error('Received invalid audio data.');

        const blobUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
            audioRef.current.src = blobUrl;
            await audioRef.current.play();
        }

    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error("Failed to fetch or play audio preview:", err);
            // Ensure loading state is reset on error
            setIsVoicePreviewing(false);
        }
    }
  };
  
  const someModelsChecked = Object.values(modelStatus).some(s => s !== 'unchecked' && s !== 'checking');

  const sortedTextModels = useMemo(() => {
    return [...textModels]
      .sort((a, b) => {
        const statusA = modelStatus[a] || 'unchecked';
        const statusB = modelStatus[b] || 'unchecked';
        
        const score = (status: ModelStatus): number => {
            switch (status) {
                case 'available': return 0;
                case 'checking': return 1;
                case 'unchecked': return 2;
                case 'unavailable': return 3;
                default: return 4;
            }
        };

        const scoreA = score(statusA);
        const scoreB = score(statusB);

        if (scoreA !== scoreB) {
            return scoreA - scoreB;
        }

        return a.localeCompare(b);
    });
  }, [textModels, modelStatus]);

    const sortedImageModels = useMemo(() => {
        return [...imageModels]
          .sort((a, b) => {
            const statusA = modelStatus[a] || 'unchecked';
            const statusB = modelStatus[b] || 'unchecked';
            
            const score = (status: ModelStatus): number => {
                switch (status) {
                    case 'available': return 0;
                    case 'checking': return 1;
                    case 'unchecked': return 2;
                    case 'unavailable': return 3;
                    default: return 4;
                }
            };

            const scoreA = score(statusA);
            const scoreB = score(statusB);

            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }

            return a.localeCompare(b);
        });
    }, [imageModels, modelStatus]);
  
  const audioModels = useMemo(() => sortedTextModels.filter(m => isAudioModel(m)), [sortedTextModels]);
  const nonAudioModels = useMemo(() => sortedTextModels.filter(m => !isAudioModel(m)), [sortedTextModels]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="bg-shigen-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-shigen-gray-500 hover:text-shigen-gray-300 transition" aria-label="Close settings">
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-6 text-shigen-gray-300">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="textModel" className="block text-sm font-medium text-shigen-gray-500 mb-1">Text Model</label>
            <select id="textModel" name="textModel" value={settings.textModel} onChange={handleSelectChange} className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition">
              {nonAudioModels.map(model => {
                const status = modelStatus[model] || 'unchecked';
                let indicator = '';
                if (status === 'unavailable') indicator = ' ❌';
                if (status === 'checking') indicator = '...';
                if (status === 'available') indicator = ' ✅';

                return (
                  <option key={model} value={model} disabled={status === 'checking' || status === 'unavailable'}>
                    {model}{indicator}
                  </option>
                );
              })}
            </select>
            <div className="text-xs text-shigen-gray-500 mt-1.5 px-1 flex justify-between items-center">
                <span>
                    {someModelsChecked ? 'Status: ✅ Online, ❌ Offline.' : 'Check model status.'}
                </span>
                <button
                    onClick={onCheckModels}
                    disabled={isCheckingModels}
                    className="flex items-center gap-1 text-xs text-shigen-blue hover:underline disabled:opacity-50 disabled:cursor-wait"
                >
                    {isCheckingModels && <SpinnerIcon className="w-3 h-3" />}
                    {isCheckingModels ? 'Checking...' : 'Check Models'}
                </button>
            </div>
          </div>
          
           <div>
              <label htmlFor="audioModel" className="block text-sm font-medium text-shigen-gray-500 mb-1">Audio Model</label>
              <select id="audioModel" name="audioModel" value={settings.audioModel} onChange={handleSelectChange} className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition">
              {audioModels.map(model => {
                const status = modelStatus[model] || 'unchecked';
                let indicator = '';
                if (status === 'unavailable') indicator = ' ❌';
                if (status === 'checking') indicator = '...';
                if (status === 'available') indicator = ' ✅';

                return (
                  <option key={model} value={model} disabled={status === 'checking' || status === 'unavailable'}>
                    {model}{indicator}
                  </option>
                );
              })}
            </select>
           </div>
           
           <div>
              <label htmlFor="audioVoice" className="block text-sm font-medium text-shigen-gray-500 mb-1">Voice (for OpenAI models)</label>
              <div className="flex items-center gap-2">
                <select 
                  id="audioVoice" 
                  name="audioVoice" 
                  value={settings.audioVoice} 
                  onChange={handleVoiceChangeAndPlayback}
                  disabled={isVoicePreviewing} 
                  className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition disabled:opacity-50"
                >
                  {audioVoices.map(voice => <option key={voice} value={voice}>{voice.charAt(0).toUpperCase() + voice.slice(1)}</option>)}
                </select>
                {isVoicePreviewing && <SpinnerIcon className="w-5 h-5 text-shigen-blue" />}
              </div>
            </div>

          <div>
            <label htmlFor="imageModel" className="block text-sm font-medium text-shigen-gray-500 mb-1">Default Image Model</label>
            <select id="imageModel" name="imageModel" value={settings.imageModel} onChange={handleSelectChange} className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition">
              {sortedImageModels.map(model => {
                  const status = modelStatus[model] || 'unchecked';
                  let indicator = '';
                  if (status === 'unavailable') indicator = ' ❌';
                  if (status === 'checking') indicator = '...';
                  if (status === 'available') indicator = ' ✅';

                  return (
                    <option key={model} value={model} disabled={status === 'checking' || status === 'unavailable'}>
                      {model}{indicator}
                    </option>
                  );
              })}
            </select>
          </div>
          
           <div>
             <label htmlFor="theme" className="block text-sm font-medium text-shigen-gray-500 mb-1">Theme</label>
             <select id="theme" name="theme" value={settings.theme} onChange={handleSelectChange} className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition">
               {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
             </select>
           </div>

            <div className="border-t border-shigen-gray-700/50 pt-5">
                 <button
                    onClick={onOpenThemeGenerator}
                    className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-shigen-gray-700 hover:bg-shigen-gray-600 rounded-md transition-colors text-shigen-gray-300"
                >
                   <PaintBrushIcon className="w-5 h-5" />
                   <span>AI Theme Generator</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;