// Competitive Intelligence types

export type EventType = 'price_drop' | 'price_increase' | 'new_promo' | 'stock_out' | 'new_competitor';

export interface CompetitiveSummary {
  rank: number;
  totalSellers: number;
  topCompetitorName: string;
  topCompetitorDelta: string;
  todayLabel: string;
  todayType: 'opportunity' | 'risk' | 'neutral';
}

export interface Competitor {
  id: string;
  name: string;
  price: number;
  rating: number;
  salesPerDay: number;
  promoStatus: string;
}

export interface CompetitiveEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  recommendedAction: string;
}
