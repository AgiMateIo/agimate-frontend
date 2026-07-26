'use client';

import PlatformUsageWidget from '@/components/llm-providers/PlatformUsageWidget';
import type { DashboardResources } from '@/queries/dashboard';
import QuickActions from './QuickActions';
import ResourceCardGrid from './ResourceCardGrid';
import SetupProgress from './SetupProgress';

export default function OverviewMode({
  resources,
}: {
  resources: DashboardResources;
}) {
  return (
    <div className="space-y-6">
      <SetupProgress resources={resources} />
      <PlatformUsageWidget />
      <ResourceCardGrid resources={resources} />
      <QuickActions firstAgentId={resources.firstAgentId} />
    </div>
  );
}
