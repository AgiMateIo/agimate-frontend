'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Source {
  id: string;
  label: string;
}

interface ItemInfo {
  name: string;
  description: string;
}

interface ItemGroup {
  deviceId: string;
  deviceName: string;
  items: ItemInfo[];
}

interface SelectItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  selectedItems: string[];
  onChange: (items: string[]) => void;
  fetchGroups: () => Promise<ItemGroup[]>;
}

export default function SelectItemsModal({
  isOpen,
  onClose,
  title,
  selectedItems,
  onChange,
  fetchGroups,
}: SelectItemsModalProps) {
  const [groups, setGroups] = useState<ItemGroup[] | null>(null);
  const [activeSource, setActiveSource] = useState<string>('');
  const loading = isOpen && groups === null;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    fetchGroups()
      .then((data) => {
        if (cancelled) return;
        setGroups(data);
        if (data.length > 0) {
          setActiveSource((prev) => prev || data[0].deviceId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch items:', err);
        setGroups([]);
      });

    return () => { cancelled = true; setGroups(null); };
  }, [isOpen, fetchGroups]);

  const sources: Source[] = groups.map((g) => ({
    id: g.deviceId,
    label: g.deviceName,
  }));

  const getItemsForSource = (): ItemInfo[] => {
    const group = groups.find((g) => g.deviceId === activeSource);
    return group?.items ?? [];
  };

  const items = getItemsForSource();

  const toggleItem = (name: string) => {
    if (selectedItems.includes(name)) {
      onChange(selectedItems.filter((i) => i !== name));
    } else {
      onChange([...selectedItems, name]);
    }
  };

  const removeItem = (name: string) => {
    onChange(selectedItems.filter((i) => i !== name));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: '400px' }}>
        {/* Left column: Sources */}
        <div className="w-48 shrink-0 border-r border-border bg-surface-secondary overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Loading...</div>
          ) : sources.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No sources available</div>
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

        {/* Right column: Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Loading...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No items available</div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItems.includes(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleItem(item.name)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item.name)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 shrink-0 accent-accent"
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-foreground">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted mt-0.5">{item.description}</div>
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
          {selectedItems.length === 0 ? (
            <span className="text-sm text-muted py-1">No items selected</span>
          ) : (
            selectedItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-md text-sm"
              >
                <span className="font-mono">{item}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
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
