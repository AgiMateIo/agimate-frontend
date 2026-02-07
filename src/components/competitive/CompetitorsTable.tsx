'use client';

import { useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { Competitor } from '@/types';
import { StarIcon } from '@heroicons/react/24/solid';

interface CompetitorsTableProps {
  competitors: Competitor[];
}

export default function CompetitorsTable({ competitors }: CompetitorsTableProps) {
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(bcp47Locale, {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground mb-4">Competitors</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3">Seller</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Price</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Rating</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Sales/day</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Promo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {competitors.map((competitor, index) => {
              const isYourStore = competitor.name === 'Your Store';
              return (
                <tr
                  key={competitor.id}
                  className={`${isYourStore ? 'bg-accent/5' : 'hover:bg-surface-secondary'} transition-colors`}
                >
                  <td className="py-3 text-sm font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="text-muted text-xs">#{index + 1}</span>
                      {competitor.name}
                      {isYourStore && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">You</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-foreground text-right font-medium">
                    {formatCurrency(competitor.price)}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-sm text-foreground">
                      <StarIcon className="h-4 w-4 text-warning" />
                      {competitor.rating}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-muted text-right">{competitor.salesPerDay}</td>
                  <td className="py-3 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      competitor.promoStatus === 'Active'
                        ? 'bg-success/10 text-success'
                        : competitor.promoStatus === 'Ending soon'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted/10 text-muted'
                    }`}>
                      {competitor.promoStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
