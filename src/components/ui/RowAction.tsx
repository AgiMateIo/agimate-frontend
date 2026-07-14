import type { ComponentType, SVGProps } from 'react';

// Compact bordered icon+label action that sits inline with the field/row it operates
// on (rotate key, edit, refresh …). Distinct from Button: tertiary weight, outline only.
interface RowActionProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}

export function RowAction({ icon: Icon, label, onClick, disabled, spinning }: RowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:border-accent/50 transition-colors disabled:opacity-50 shrink-0"
    >
      <Icon className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}
