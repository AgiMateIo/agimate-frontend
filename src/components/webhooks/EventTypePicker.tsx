'use client';

import { useState, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import SelectEventsModal from './SelectEventsModal';

interface EventTypePickerProps {
  selectedEventTypes: string[];
  onChange: (eventTypes: string[]) => void;
  error?: string;
}

export default function EventTypePicker({ selectedEventTypes, onChange, error }: EventTypePickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddEventType = (eventType: string) => {
    if (!eventType.trim()) return;
    if (selectedEventTypes.includes(eventType)) return;

    onChange([...selectedEventTypes, eventType]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemoveEventType = (eventType: string) => {
    onChange(selectedEventTypes.filter((et) => et !== eventType));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddEventType(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedEventTypes.length > 0) {
      handleRemoveEventType(selectedEventTypes[selectedEventTypes.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected Event Types */}
      {selectedEventTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEventTypes.map((eventType) => (
            <div
              key={eventType}
              className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-md text-sm"
            >
              <span className="font-mono">{eventType}</span>
              <button
                type="button"
                onClick={() => handleRemoveEventType(eventType)}
                className="text-accent hover:text-accent/80 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input + Browse */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedEventTypes.length === 0
              ? 'Enter custom event type'
              : 'Add more event types...'
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

      {selectedEventTypes.length === 0 && !error && (
        <p className="text-xs text-muted">
          Add one or more event types. You can enter custom event types or browse available ones.
        </p>
      )}

      <SelectEventsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedEventTypes={selectedEventTypes}
        onChange={onChange}
      />
    </div>
  );
}
