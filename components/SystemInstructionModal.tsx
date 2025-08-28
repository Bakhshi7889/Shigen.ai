import React, { useState, useEffect } from 'react';
import CloseIcon from './icons/CloseIcon';
import TuneIcon from './icons/TuneIcon';
import { personaPresets } from '../lib/personas';


interface SystemInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstruction: string;
  onSave: (newInstruction: string) => void;
}

const SystemInstructionModal: React.FC<SystemInstructionModalProps> = ({ isOpen, onClose, currentInstruction, onSave }) => {
    const [instruction, setInstruction] = useState(currentInstruction);

    useEffect(() => {
        if (isOpen) {
            setInstruction(currentInstruction);
        }
    }, [currentInstruction, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(instruction);
    };

    const handlePresetClick = (presetInstruction: string) => {
        setInstruction(presetInstruction);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="glassmorphic-surface rounded-2xl shadow-soft p-6 w-full max-w-lg relative animate-spring-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <TuneIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold text-on-surface">Customize Persona</h2>
                </div>
                <p className="text-sm text-on-surface-variant mb-4">Set a system instruction to guide the AI's behavior and personality for this chat.</p>
                
                <div className="mb-4">
                    <label htmlFor="system-instruction" className="block text-sm font-medium text-on-surface-variant mb-1.5">System Instruction / Persona</label>
                    <textarea
                        id="system-instruction"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="e.g., You are a helpful assistant."
                        className="w-full bg-surface-variant border-outline rounded-xl p-2.5 text-on-surface focus:ring-2 focus:ring-primary h-32 resize-none"
                    />
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-medium text-on-surface-variant mb-2">Or, start with a preset:</h3>
                    <div className="flex flex-wrap gap-2">
                        {personaPresets.map(p => (
                            <button key={p.name} onClick={() => handlePresetClick(p.instruction)} className="px-3 py-1.5 text-sm bg-surface-variant hover:bg-outline rounded-full transition-colors text-on-surface-variant">
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-full bg-primary text-on-primary hover:opacity-90 transition">
                        Save Persona
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemInstructionModal;