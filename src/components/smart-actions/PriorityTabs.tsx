'use client';

import { Priority } from '@/types';

interface PriorityTabsProps {
  activeTab: Priority | 'ALL';
  onChange: (tab: Priority | 'ALL') => void;
  counts: Record<Priority | 'ALL', number>;
}

const tabs: Array<{ value: Priority | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function PriorityTabs({ activeTab, onChange, counts }: PriorityTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
            ${activeTab === tab.value
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground hover:bg-surface'
            }`}
        >
          {tab.label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === tab.value
              ? 'bg-accent-foreground/20 text-accent-foreground'
              : 'bg-border text-muted'
          }`}>
            {counts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
}
