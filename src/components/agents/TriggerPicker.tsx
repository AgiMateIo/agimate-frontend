'use client';

import { useState, useRef, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import apiService from '@/services/api';
import SelectItemsModal from './SelectItemsModal';

interface TriggerPickerProps {
  selectedTriggers: string[];
  onChange: (triggers: string[]) => void;
  error?: string;
}

export default function TriggerPicker({ selectedTriggers, onChange, error }: TriggerPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (trigger: string) => {
    if (!trigger.trim()) return;
    if (selectedTriggers.includes(trigger)) return;
    onChange([...selectedTriggers, trigger]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (trigger: string) => {
    onChange(selectedTriggers.filter((t) => t !== trigger));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAdd(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTriggers.length > 0) {
      handleRemove(selectedTriggers[selectedTriggers.length - 1]);
    }
  };

  const fetchGroups = useCallback(async () => {
    const groups = await apiService.getDeviceTriggers();
    return groups.map((g) => ({
      ...g,
      items: g.triggers,
    }));
  }, []);

  return (
    <div className="space-y-2">
      {selectedTriggers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTriggers.map((trigger) => (
            <div
              key={trigger}
              className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-md text-sm"
            >
              <span className="font-mono">{trigger}</span>
              <button
                type="button"
                onClick={() => handleRemove(trigger)}
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
            selectedTriggers.length === 0
              ? 'Enter trigger name'
              : 'Add more triggers...'
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
        title="Select Triggers"
        selectedItems={selectedTriggers}
        onChange={onChange}
        fetchGroups={fetchGroups}
      />
    </div>
  );
}
