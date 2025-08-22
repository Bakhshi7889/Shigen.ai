
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-shigen-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-shigen-gray-500 hover:text-shigen-gray-300 transition" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <TuneIcon className="w-6 h-6 text-shigen-blue" />
                    <h2 className="text-xl font-semibold text-shigen-gray-300">Customize Persona</h2>
                </div>
                <p className="text-sm text-shigen-gray-500 mb-4">Set a system instruction to guide the AI's behavior and personality for this chat.</p>
                
                <div className="mb-4">
                    <label htmlFor="system-instruction" className="block text-sm font-medium text-shigen-gray-400 mb-1">System Instruction / Persona</label>
                    <textarea
                        id="system-instruction"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="e.g., You are a helpful assistant."
                        className="w-full bg-shigen-gray-700 border-shigen-gray-600 rounded-md p-2 text-shigen-gray-300 focus:ring-shigen-blue focus:border-shigen-blue transition h-32 resize-none"
                    />
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-medium text-shigen-gray-400 mb-2">Or, start with a preset:</h3>
                    <div className="flex flex-wrap gap-2">
                        {personaPresets.map(p => (
                            <button key={p.name} onClick={() => handlePresetClick(p.instruction)} className="px-3 py-1.5 text-sm bg-shigen-gray-700 hover:bg-shigen-gray-600 rounded-full transition-colors text-shigen-gray-300">
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-shigen-gray-300 hover:bg-shigen-gray-700 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-shigen-blue text-white hover:bg-blue-500 transition">
                        Save Persona
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemInstructionModal;
