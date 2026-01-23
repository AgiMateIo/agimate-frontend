import { DashboardMetrics, SalesDataPoint, Product } from '@/types';

export const dashboardMetrics: DashboardMetrics = {
  revenueToday: 245780,
  revenueTodayDeltaPct: 12.5,
  ordersMonth: 1847,
  ordersMonthDeltaPct: 8.3,
  aov: 3250,
  aovDeltaPct: -2.1,
  integrationsActive: 3,
  integrationsTotal: 5,
};

export const salesChartData: SalesDataPoint[] = [
  { date: '2024-12-01', revenue: 125000, orders: 42 },
  { date: '2024-12-02', revenue: 182000, orders: 58 },
  { date: '2024-12-03', revenue: 156000, orders: 51 },
  { date: '2024-12-04', revenue: 198000, orders: 67 },
  { date: '2024-12-05', revenue: 210000, orders: 72 },
  { date: '2024-12-06', revenue: 245000, orders: 81 },
  { date: '2024-12-07', revenue: 189000, orders: 63 },
  { date: '2024-12-08', revenue: 167000, orders: 55 },
  { date: '2024-12-09', revenue: 234000, orders: 78 },
  { date: '2024-12-10', revenue: 256000, orders: 85 },
  { date: '2024-12-11', revenue: 278000, orders: 92 },
  { date: '2024-12-12', revenue: 245780, orders: 82 },
];

export const topProducts: Product[] = [
  { id: '1', name: 'Wireless Earbuds Pro', orders: 234, revenue: 585000, rating: 4.8 },
  { id: '2', name: 'Smart Watch Series 5', orders: 189, revenue: 756000, rating: 4.6 },
  { id: '3', name: 'Portable Charger 20K', orders: 156, revenue: 234000, rating: 4.7 },
  { id: '4', name: 'Bluetooth Speaker Mini', orders: 142, revenue: 213000, rating: 4.5 },
  { id: '5', name: 'USB-C Hub 7-in-1', orders: 128, revenue: 192000, rating: 4.4 },
];
