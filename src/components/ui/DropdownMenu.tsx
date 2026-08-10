'use client';

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { useTranslations } from 'next-intl';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  disabled?: boolean;
  // Destructive action — rendered in the error colour.
  danger?: boolean;
  // Draws a divider above the item, separating it from the group before it.
  separated?: boolean;
}

// The overflow menu for secondary actions: a header keeps one or two visible
// buttons and everything rarer moves in here. Closes on outside pointerdown,
// Escape and any item click. Renders nothing when handed an empty list, so
// callers can build `items` with spreads and not guard the whole block.
export function DropdownMenu({
  items,
  label,
}: {
  items: DropdownMenuItem[];
  label?: string;
}) {
  const t = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label ?? t('moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent/50 hover:text-foreground"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item, index) => (
            <div key={item.label}>
              {/* A separator above the first item would just draw a line under
                  the panel's own top edge. */}
              {item.separated && index > 0 && <div className="my-1 h-px bg-border" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                  item.danger
                    ? 'text-error hover:bg-error/10'
                    : 'text-foreground hover:bg-surface-secondary'
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
