// Dashboard types

export interface DashboardMetrics {
  revenueToday: number;
  revenueTodayDeltaPct: number;
  ordersMonth: number;
  ordersMonthDeltaPct: number;
  aov: number;
  aovDeltaPct: number;
  integrationsActive: number;
  integrationsTotal: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface Product {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  rating: number;
}
