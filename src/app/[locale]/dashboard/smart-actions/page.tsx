'use client';

import { useState, useMemo } from 'react';
import PriorityTabs from '@/components/smart-actions/PriorityTabs';
import SmartActionCard from '@/components/smart-actions/SmartActionCard';
import { smartActions } from '@/data/smartActions';
import { Priority } from '@/types';

export default function SmartActionsPage() {
  const [activeTab, setActiveTab] = useState<Priority | 'ALL'>('ALL');

  const filteredActions = useMemo(() => {
    if (activeTab === 'ALL') return smartActions;
    return smartActions.filter((action) => action.severity === activeTab);
  }, [activeTab]);

  const counts = useMemo(() => {
    return {
      ALL: smartActions.length,
      CRITICAL: smartActions.filter((a) => a.severity === 'CRITICAL').length,
      HIGH: smartActions.filter((a) => a.severity === 'HIGH').length,
      MEDIUM: smartActions.filter((a) => a.severity === 'MEDIUM').length,
      LOW: smartActions.filter((a) => a.severity === 'LOW').length,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Smart Actions</h1>
        <p className="text-muted mt-1">Automatic recommendations based on your data</p>
      </div>

      {/* Priority Tabs */}
      <PriorityTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.length > 0 ? (
          filteredActions.map((action) => (
            <SmartActionCard key={action.id} action={action} />
          ))
        ) : (
          <div className="text-center py-12 text-muted">
            No actions found for this priority level.
          </div>
        )}
      </div>
    </div>
  );
}
