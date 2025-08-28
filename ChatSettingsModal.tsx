import React from 'react';
import type { Persona } from './types';
import CloseIcon from './components/icons/CloseIcon';
import UsersIcon from './components/icons/UsersIcon';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  activePersonaId: string | null | undefined;
  onSetPersona: (personaId: string | null) => void;
  onOpenPersonaManager: () => void;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, personas, activePersonaId, onSetPersona, onOpenPersonaManager }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="glassmorphic-surface rounded-2xl shadow-soft p-6 w-full max-w-md relative animate-spring-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition" aria-label="Close">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <UsersIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-on-surface">Chat Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="persona-select" className="block text-sm font-medium text-on-surface-variant mb-1.5">Active AI Persona</label>
            <select
              id="persona-select"
              value={activePersonaId || 'default'}
              onChange={(e) => onSetPersona(e.target.value === 'default' ? null : e.target.value)}
              className="w-full bg-surface-variant rounded-xl p-2.5 text-on-surface focus:ring-2 focus:ring-primary"
            >
              <option value="default">Default Assistant</option>
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              onOpenPersonaManager();
              onClose();
            }}
            className="w-full text-center px-4 py-2 rounded-full text-sm font-semibold bg-surface-variant text-on-surface-variant hover:bg-outline transition-colors"
          >
            Manage Personas
          </button>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-primary text-on-primary hover:opacity-90 transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsModal;
