'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import MetricsCard from '@/components/dashboard/MetricsCard';
import SalesChart from '@/components/dashboard/SalesChart';
import TopProductsTable from '@/components/dashboard/TopProductsTable';
import ActionsPreviewList from '@/components/smart-actions/ActionsPreviewList';
import { dashboardMetrics, salesChartData, topProducts } from '@/data/dashboard';
import { smartActions } from '@/data/smartActions';

export default function DashboardPage() {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(bcp47Locale, {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const highPriorityActions = smartActions.filter(
    (a) => a.severity === 'CRITICAL' || a.severity === 'HIGH'
  );

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Revenue today"
          value={formatCurrency(dashboardMetrics.revenueToday)}
          delta={dashboardMetrics.revenueTodayDeltaPct}
          variant="success"
        />
        <MetricsCard
          title="Orders (month)"
          value={dashboardMetrics.ordersMonth}
          delta={dashboardMetrics.ordersMonthDeltaPct}
          variant="info"
        />
        <MetricsCard
          title="Average order value"
          value={formatCurrency(dashboardMetrics.aov)}
          delta={dashboardMetrics.aovDeltaPct}
          variant="warning"
        />
        <MetricsCard
          title="Active integrations"
          value={`${dashboardMetrics.integrationsActive} / ${dashboardMetrics.integrationsTotal}`}
          variant="default"
        />
      </div>

      {/* Chart and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={salesChartData} />
        </div>
        <div>
          <TopProductsTable products={topProducts} />
        </div>
      </div>

      {/* Smart Actions Preview */}
      <ActionsPreviewList actions={highPriorityActions} limit={3} />
    </div>
  );
}
