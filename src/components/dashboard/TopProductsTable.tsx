'use client';

import { Product } from '@/types';
import { StarIcon } from '@heroicons/react/24/solid';

interface TopProductsTableProps {
  products: Product[];
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground mb-4">Top Products</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3">Product</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Orders</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Revenue</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface-secondary transition-colors">
                <td className="py-3 text-sm font-medium text-foreground">{product.name}</td>
                <td className="py-3 text-sm text-muted text-right">{product.orders}</td>
                <td className="py-3 text-sm text-foreground text-right font-medium">{formatCurrency(product.revenue)}</td>
                <td className="py-3 text-right">
                  <span className="inline-flex items-center gap-1 text-sm text-foreground">
                    <StarIcon className="h-4 w-4 text-warning" />
                    {product.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
