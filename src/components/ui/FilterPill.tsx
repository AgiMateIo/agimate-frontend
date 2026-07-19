'use client';

// Toggleable filter chip for search toolbars (single- or multi-select rows).
export function FilterPill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
        active
          ? 'bg-accent text-white border-accent'
          : 'border-border text-muted hover:text-foreground hover:border-accent/50'
      }`}
    >
      {children}
    </button>
  );
}
