import React, { useState, useEffect, useRef } from 'react';
import type { Persona } from './types';
import CloseIcon from './components/icons/CloseIcon';
import UsersIcon from './components/icons/UsersIcon';
import PlusIcon from './components/icons/PlusIcon';
import TrashIcon from './components/icons/TrashIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import SpinnerIcon from './components/icons/SpinnerIcon';
import { getImageUrl } from './services/pollinations';
import { triggerHapticFeedback } from './lib/haptics';

interface PersonaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onUpdatePersonas: (personas: Persona[]) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PersonaManagerModal: React.FC<PersonaManagerModalProps> = ({ isOpen, onClose, personas, onUpdatePersonas, addToast }) => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [name, setName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selectedPersona) {
      setName(selectedPersona.name);
      setInstruction(selectedPersona.instruction);
    } else {
      setName('');
      setInstruction('');
    }
  }, [selectedPersona]);

  if (!isOpen) return null;

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleNewPersona = () => {
    setSelectedPersona(null);
  };

  const handleSave = () => {
    if (!name.trim() || !instruction.trim()) {
      addToast('Name and instruction cannot be empty.', 'error');
      return;
    }

    if (selectedPersona) {
      // Update existing
      const updatedPersonas = personas.map(p => p.id === selectedPersona.id ? { ...p, name, instruction } : p);
      onUpdatePersonas(updatedPersonas);
    } else {
      // Create new
      const newPersona: Persona = { id: `persona-${Date.now()}`, name, instruction };
      onUpdatePersonas([newPersona, ...personas]);
      setSelectedPersona(newPersona);
    }
    triggerHapticFeedback('light');
    addToast(`Persona "${name}" saved!`, 'success');
  };

  const handleDelete = () => {
    if (selectedPersona && window.confirm(`Are you sure you want to delete the "${selectedPersona.name}" persona?`)) {
      onUpdatePersonas(personas.filter(p => p.id !== selectedPersona.id));
      setSelectedPersona(null);
      triggerHapticFeedback('medium');
      addToast('Persona deleted.', 'info');
    }
  };

  const handleGenerateAvatar = async () => {
    if (!selectedPersona) return;
    setIsGeneratingAvatar(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const avatarPrompt = `expressive stylized illustrated avatar of a character based on this personality: ${selectedPersona.instruction}, clean vector art, vibrant colors, circular portrait`;
      const avatarUrl = getImageUrl(avatarPrompt, { model: 'flux', safe: true, aspectRatio: '1:1' });
      
      // We don't need to wait for the image to load, just update the URL
      const updatedPersonas = personas.map(p => p.id === selectedPersona.id ? { ...p, avatarUrl } : p);
      onUpdatePersonas(updatedPersonas);
      setSelectedPersona(prev => prev ? { ...prev, avatarUrl } : null);

    } catch (error) {
        if((error as Error).name !== 'AbortError') addToast("Failed to generate avatar.", "error");
    } finally {
        if(!signal.aborted) setIsGeneratingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="glassmorphic-surface rounded-2xl shadow-soft w-full max-w-4xl h-[80vh] flex relative animate-spring-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition z-10" aria-label="Close">
          <CloseIcon className="w-6 h-6" />
        </button>
        
        {/* Sidebar */}
        <aside className="w-1/3 border-r border-outline p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-on-surface">Personas</h2>
            <button onClick={handleNewPersona} className="p-2 rounded-full hover:bg-surface-variant">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto -mr-2 pr-2">
            <ul>
              {personas.map(p => (
                <li key={p.id}>
                  <button onClick={() => handleSelectPersona(p)} className={`w-full text-left p-2 my-1 rounded-lg flex items-center gap-3 transition-colors ${selectedPersona?.id === p.id ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-variant'}`}>
                    <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 overflow-hidden">
                        {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover"/> : <UsersIcon className="w-full h-full p-1.5 text-on-secondary" />}
                    </div>
                    <span className="font-semibold truncate">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Editor */}
        <main className="w-2/3 p-6 flex flex-col">
          {selectedPersona === null && !name ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <UsersIcon className="w-16 h-16 text-primary mb-4" />
              <h3 className="text-xl font-semibold">Create a New Persona</h3>
              <p className="text-on-surface-variant">Click the '+' button or fill out the form to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <h3 className="text-xl font-semibold mb-4">{selectedPersona ? 'Edit Persona' : 'New Persona'}</h3>
              <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-secondary flex-shrink-0 overflow-hidden relative group">
                        {selectedPersona?.avatarUrl ? <img src={selectedPersona.avatarUrl} alt={name} className="w-full h-full object-cover"/> : <UsersIcon className="w-full h-full p-4 text-on-secondary" />}
                        {selectedPersona && (
                            <button onClick={handleGenerateAvatar} disabled={isGeneratingAvatar} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {isGeneratingAvatar ? <SpinnerIcon className="w-8 h-8 text-white"/> : <SparklesIcon className="w-8 h-8 text-white"/>}
                            </button>
                        )}
                    </div>
                    <div>
                        <label htmlFor="persona-name" className="block text-sm font-medium text-on-surface-variant mb-1">Name</label>
                        <input id="persona-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Creative Writer" className="w-full bg-surface-variant rounded-xl p-2.5 text-on-surface focus:ring-2 focus:ring-primary" />
                    </div>
                </div>
                <div>
                  <label htmlFor="persona-instruction" className="block text-sm font-medium text-on-surface-variant mb-1">Instruction</label>
                  <textarea id="persona-instruction" value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="You are a helpful assistant..." className="w-full bg-surface-variant rounded-xl p-2.5 text-on-surface focus:ring-2 focus:ring-primary h-48 resize-none" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-outline">
                {selectedPersona && (
                  <button onClick={handleDelete} className="p-2 rounded-full text-red-400 hover:bg-red-500/10 transition">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
                <div className="flex-grow"></div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedPersona(null)} className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition">Cancel</button>
                  <button onClick={handleSave} className="px-6 py-2 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition">Save</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PersonaManagerModal;
