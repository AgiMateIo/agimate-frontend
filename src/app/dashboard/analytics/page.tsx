'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import MetricsCard from '@/components/dashboard/MetricsCard';

const revenueData = [
  { month: 'Jan', revenue: 1250000, orders: 420 },
  { month: 'Feb', revenue: 1820000, orders: 580 },
  { month: 'Mar', revenue: 1560000, orders: 510 },
  { month: 'Apr', revenue: 1980000, orders: 670 },
  { month: 'May', revenue: 2100000, orders: 720 },
  { month: 'Jun', revenue: 2450000, orders: 810 },
  { month: 'Jul', revenue: 1890000, orders: 630 },
  { month: 'Aug', revenue: 2670000, orders: 890 },
  { month: 'Sep', revenue: 2340000, orders: 780 },
  { month: 'Oct', revenue: 2560000, orders: 850 },
  { month: 'Nov', revenue: 2780000, orders: 920 },
  { month: 'Dec', revenue: 3100000, orders: 1050 },
];

const categoryData = [
  { name: 'Electronics', value: 45 },
  { name: 'Accessories', value: 25 },
  { name: 'Home & Garden', value: 15 },
  { name: 'Sports', value: 10 },
  { name: 'Other', value: 5 },
];

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const marketplaceData = [
  { name: 'Ozon', revenue: 12500000, share: 48 },
  { name: 'Wildberries', revenue: 10200000, share: 39 },
  { name: 'Yandex Market', revenue: 3400000, share: 13 },
];

export default function AnalyticsPage() {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted mt-1">Detailed insights into your marketplace performance</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Revenue (YTD)"
          value="26.1M RUB"
          delta={23.5}
          variant="success"
        />
        <MetricsCard
          title="Total Orders (YTD)"
          value="8,830"
          delta={18.2}
          variant="info"
        />
        <MetricsCard
          title="Conversion Rate"
          value="3.8%"
          delta={0.5}
          variant="warning"
        />
        <MetricsCard
          title="Return Rate"
          value="2.1%"
          delta={-0.3}
          variant="success"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-base font-semibold text-foreground mb-4">Revenue Trend (12 months)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenueAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenueAnalytics)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category and Marketplace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Sales by Category</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-muted">{entry.name} ({entry.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace Performance */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Revenue by Marketplace</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketplaceData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {marketplaceData.map((mp) => (
              <div key={mp.name} className="flex items-center justify-between text-sm">
                <span className="text-muted">{mp.name}</span>
                <span className="font-medium text-foreground">{mp.share}% of total</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
