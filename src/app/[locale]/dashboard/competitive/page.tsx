'use client';

import SummaryCard from '@/components/competitive/SummaryCard';
import CompetitorsTable from '@/components/competitive/CompetitorsTable';
import CompetitiveEventCard from '@/components/competitive/CompetitiveEventCard';
import { competitiveSummary, competitors, competitiveEvents } from '@/data/competitive';

export default function CompetitivePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Competitive Intelligence</h1>
        <p className="text-muted mt-1">Market position and competitor activities</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Category rank"
          value={`#${competitiveSummary.rank}`}
          secondary={`out of ${competitiveSummary.totalSellers} sellers`}
        />
        <SummaryCard
          title="Top competitor"
          value={competitiveSummary.topCompetitorName}
          secondary={competitiveSummary.topCompetitorDelta}
        />
        <SummaryCard
          title="Today's insight"
          value={competitiveSummary.todayLabel}
          variant={competitiveSummary.todayType}
        />
      </div>

      {/* Table and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompetitorsTable competitors={competitors} />
        </div>
        <div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Recent Events</h3>
            <div className="space-y-3">
              {competitiveEvents.map((event) => (
                <CompetitiveEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
