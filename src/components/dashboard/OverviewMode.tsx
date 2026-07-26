'use client';

import PlatformUsageWidget from '@/components/llm-providers/PlatformUsageWidget';
import type { DashboardResources } from '@/queries/dashboard';
import AttentionBanner from './AttentionBanner';
import QuickActions from './QuickActions';
import ResourceCardGrid from './ResourceCardGrid';
import SetupProgress from './SetupProgress';

export default function OverviewMode({
  resources,
  attentionCount,
}: {
  resources: DashboardResources;
  attentionCount: number;
}) {
  return (
    <div className="space-y-6">
      <AttentionBanner count={attentionCount} />
      <SetupProgress resources={resources} />
      <PlatformUsageWidget />
      <ResourceCardGrid resources={resources} />
      <QuickActions firstAgentId={resources.firstAgentId} />
    </div>
  );
}
