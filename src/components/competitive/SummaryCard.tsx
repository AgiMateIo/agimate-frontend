'use client';

interface SummaryCardProps {
  title: string;
  value: string | number;
  secondary?: string;
  variant?: 'default' | 'opportunity' | 'risk' | 'neutral';
}

const variantStyles = {
  default: 'border-border',
  opportunity: 'border-l-4 border-l-success border-border',
  risk: 'border-l-4 border-l-error border-border',
  neutral: 'border-l-4 border-l-accent border-border',
};

export default function SummaryCard({ title, value, secondary, variant = 'default' }: SummaryCardProps) {
  return (
    <div className={`bg-surface rounded-xl border p-5 ${variantStyles[variant]}`}>
      <div className="text-sm font-medium text-muted mb-2">{title}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {secondary && (
        <div className="text-sm text-muted mt-1">{secondary}</div>
      )}
    </div>
  );
}
