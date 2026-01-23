import { CompetitiveSummary, Competitor, CompetitiveEvent } from '@/types';

export const competitiveSummary: CompetitiveSummary = {
  rank: 3,
  totalSellers: 156,
  topCompetitorName: 'TechMaster Store',
  topCompetitorDelta: '+5% this week',
  todayLabel: 'Price opportunity detected',
  todayType: 'opportunity',
};

export const competitors: Competitor[] = [
  { id: '1', name: 'TechMaster Store', price: 2890, rating: 4.7, salesPerDay: 45, promoStatus: 'Active' },
  { id: '2', name: 'GadgetWorld', price: 2950, rating: 4.5, salesPerDay: 38, promoStatus: 'None' },
  { id: '3', name: 'Your Store', price: 2990, rating: 4.8, salesPerDay: 42, promoStatus: 'None' },
  { id: '4', name: 'ElectroHub', price: 3100, rating: 4.3, salesPerDay: 28, promoStatus: 'Ending soon' },
  { id: '5', name: 'SmartBuy', price: 3200, rating: 4.4, salesPerDay: 22, promoStatus: 'None' },
  { id: '6', name: 'TechZone', price: 2850, rating: 4.2, salesPerDay: 35, promoStatus: 'Active' },
];

export const competitiveEvents: CompetitiveEvent[] = [
  {
    id: '1',
    type: 'price_drop',
    title: 'Competitor price drop detected',
    description: 'TechMaster Store reduced price by 8% on Wireless Earbuds category.',
    timestamp: '2024-12-15T14:30:00Z',
    recommendedAction: 'Consider matching price or highlighting your USPs in listings.',
  },
  {
    id: '2',
    type: 'new_promo',
    title: 'New promotion launched',
    description: 'GadgetWorld started "Holiday Sale" with up to 25% discounts.',
    timestamp: '2024-12-15T11:00:00Z',
    recommendedAction: 'Monitor sales impact and prepare counter-promotion if needed.',
  },
  {
    id: '3',
    type: 'stock_out',
    title: 'Competitor out of stock',
    description: 'ElectroHub is out of stock on Smart Watch Series 5.',
    timestamp: '2024-12-14T18:45:00Z',
    recommendedAction: 'Opportunity to capture their market share. Consider targeted ads.',
  },
  {
    id: '4',
    type: 'new_competitor',
    title: 'New seller entered category',
    description: 'NewTech Store joined the Wireless Earbuds category with competitive pricing.',
    timestamp: '2024-12-14T09:20:00Z',
    recommendedAction: 'Analyze their pricing strategy and product positioning.',
  },
];
