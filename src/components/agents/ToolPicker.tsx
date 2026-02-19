'use client';

import { useState, useRef, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import apiService from '@/services/api';
import SelectItemsModal from './SelectItemsModal';

interface ToolPickerProps {
  selectedTools: string[];
  onChange: (tools: string[]) => void;
  error?: string;
}

export default function ToolPicker({ selectedTools, onChange, error }: ToolPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (tool: string) => {
    if (!tool.trim()) return;
    if (selectedTools.includes(tool)) return;
    onChange([...selectedTools, tool]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (tool: string) => {
    onChange(selectedTools.filter((t) => t !== tool));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAdd(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTools.length > 0) {
      handleRemove(selectedTools[selectedTools.length - 1]);
    }
  };

  const fetchGroups = useCallback(async () => {
    const groups = await apiService.getDeviceTools();
    return groups.map((g) => ({
      ...g,
      items: g.tools,
    }));
  }, []);

  return (
    <div className="space-y-2">
      {selectedTools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTools.map((tool) => (
            <div
              key={tool}
              className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-md text-sm"
            >
              <span className="font-mono">{tool}</span>
              <button
                type="button"
                onClick={() => handleRemove(tool)}
                className="text-accent hover:text-accent/80 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedTools.length === 0
              ? 'Enter tool name'
              : 'Add more tools...'
          }
          className={`flex-1 px-3 py-2 bg-surface border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent ${
            error ? 'border-error' : 'border-border'
          }`}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setModalOpen(true)}
        >
          Browse
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <SelectItemsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Select Tools"
        selectedItems={selectedTools}
        onChange={onChange}
        fetchGroups={fetchGroups}
      />
    </div>
  );
}
