'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { WebhookEventType, DeviceTriggerGroup } from '@/types';

interface Source {
  id: string;
  label: string;
}

interface SelectEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEventTypes: string[];
  onChange: (eventTypes: string[]) => void;
}

export default function SelectEventsModal({
  isOpen,
  onClose,
  selectedEventTypes,
  onChange,
}: SelectEventsModalProps) {
  const [connectorEvents, setConnectorEvents] = useState<WebhookEventType[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<DeviceTriggerGroup[]>([]);
  const [activeSource, setActiveSource] = useState<string>('connectors');
  const [loading, setLoading] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    const fetchConnectors = apiService.getEventTypes()
      .then(setConnectorEvents)
      .catch((err) => {
        console.error('Failed to fetch connector events:', err);
        setConnectorEvents([]);
      });

    const fetchDevices = apiService.getDeviceTriggers()
      .then(setDeviceGroups)
      .catch((err) => {
        console.error('Failed to fetch device triggers:', err);
        setDeviceGroups([]);
      });

    Promise.all([fetchConnectors, fetchDevices]).finally(() => setLoading(false));
  }, [isOpen]);

  // Build source list
  const sources: Source[] = [
    { id: 'connectors', label: 'Connectors' },
    ...deviceGroups.map((g) => ({ id: g.deviceId, label: g.deviceName })),
  ];

  // Reset to first source if active source no longer exists
  useEffect(() => {
    if (sources.length > 0 && !sources.find((s) => s.id === activeSource)) {
      setActiveSource(sources[0].id);
    }
  }, [sources, activeSource]);

  // Get events for the active source
  const getEventsForSource = (): { eventType: string; description: string }[] => {
    if (activeSource === 'connectors') {
      return connectorEvents.map((e) => ({
        eventType: e.eventType,
        description: e.title || e.description,
      }));
    }

    const group = deviceGroups.find((g) => g.deviceId === activeSource);
    if (!group) return [];

    return group.triggers.map((t) => ({
      eventType: t.name,
      description: t.description,
    }));
  };

  const events = getEventsForSource();

  const toggleEvent = (eventType: string) => {
    if (selectedEventTypes.includes(eventType)) {
      onChange(selectedEventTypes.filter((et) => et !== eventType));
    } else {
      onChange([...selectedEventTypes, eventType]);
    }
  };

  const removeEvent = (eventType: string) => {
    onChange(selectedEventTypes.filter((et) => et !== eventType));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Events" size="xl">
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: '400px' }}>
        {/* Left column: Sources */}
        <div className="w-48 shrink-0 border-r border-border bg-surface-secondary overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Loading...</div>
          ) : (
            sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setActiveSource(source.id)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  activeSource === source.id
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-foreground hover:bg-surface'
                }`}
              >
                {source.label}
              </button>
            ))
          )}
        </div>

        {/* Right column: Events */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No events available</div>
          ) : (
            events.map((event) => {
              const isSelected = selectedEventTypes.includes(event.eventType);
              return (
                <button
                  key={event.eventType}
                  type="button"
                  onClick={() => toggleEvent(event.eventType)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEvent(event.eventType)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 shrink-0 accent-accent"
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-foreground">{event.eventType}</div>
                    {event.description && (
                      <div className="text-xs text-muted mt-0.5">{event.description}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom bar: Selected tags + Done */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex-1 flex flex-wrap gap-2 min-h-[36px]">
          {selectedEventTypes.length === 0 ? (
            <span className="text-sm text-muted py-1">No events selected</span>
          ) : (
            selectedEventTypes.map((eventType) => (
              <div
                key={eventType}
                className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-md text-sm"
              >
                <span className="font-mono">{eventType}</span>
                <button
                  type="button"
                  onClick={() => removeEvent(eventType)}
                  className="text-accent hover:text-accent/80 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        <Button onClick={onClose} className="shrink-0">Done</Button>
      </div>
    </Modal>
  );
}
