'use client';

import { useState, useEffect, useRef } from 'react';
import apiService from '@/services/api';
import { WebhookEventType } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EventTypePickerProps {
  selectedEventTypes: string[];
  onChange: (eventTypes: string[]) => void;
  error?: string;
}

export default function EventTypePicker({ selectedEventTypes, onChange, error }: EventTypePickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<WebhookEventType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions based on input
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await apiService.getEventTypes(inputValue);
        // Filter out already selected event types
        const filtered = results.filter(
          (et) => !selectedEventTypes.includes(et.eventType)
        );
        setSuggestions(filtered);
      } catch (error) {
        console.error('Failed to fetch event types:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, selectedEventTypes]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddEventType = (eventType: string) => {
    if (!eventType.trim()) return;

    // Check if already added
    if (selectedEventTypes.includes(eventType)) {
      return;
    }

    onChange([...selectedEventTypes, eventType]);
    setInputValue('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleRemoveEventType = (eventType: string) => {
    onChange(selectedEventTypes.filter((et) => et !== eventType));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there's a suggestion, use the first one
      if (suggestions.length > 0) {
        handleAddEventType(suggestions[0].eventType);
      } else if (inputValue.trim()) {
        // Otherwise, add the raw input value
        handleAddEventType(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedEventTypes.length > 0) {
      // Remove last event type if backspace is pressed with empty input
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

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={
            selectedEventTypes.length === 0
              ? 'Type to search event types (e.g., ozon)'
              : 'Add more event types...'
          }
          className={`w-full px-3 py-2 bg-surface border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent ${
            error ? 'border-error' : 'border-border'
          }`}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && (inputValue.trim() || loading) && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="px-4 py-3 text-sm text-muted">Loading...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleAddEventType(suggestion.eventType)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0"
                >
                  <div className="font-mono text-sm text-foreground">
                    {suggestion.eventType}
                  </div>
                  <div className="text-xs text-muted mt-1">{suggestion.title}</div>
                  {suggestion.description && (
                    <div className="text-xs text-muted mt-1">{suggestion.description}</div>
                  )}
                </button>
              ))
            ) : inputValue.trim() ? (
              <div className="px-4 py-3">
                <div className="text-sm text-muted mb-2">No matching event types found</div>
                <button
                  type="button"
                  onClick={() => handleAddEventType(inputValue.trim())}
                  className="text-sm text-accent hover:underline"
                >
                  Add "{inputValue.trim()}" as custom event type
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {selectedEventTypes.length === 0 && !error && (
        <p className="text-xs text-muted">
          Add one or more event types. You can search from available types or enter custom event types.
        </p>
      )}
    </div>
  );
}
