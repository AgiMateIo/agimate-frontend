'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  layout?: 'stacked' | 'inline';
}

export function FormField({
  label,
  required,
  error,
  children,
  hint,
  layout = 'stacked',
}: FormFieldProps) {
  if (layout === 'inline') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
        <label className="block text-sm font-medium text-foreground mb-1 sm:mb-0 sm:w-48 sm:shrink-0">
          {label} {required && '*'}
        </label>
        <div className="flex-1 min-w-0">
          {children}
          {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
          {error && <p className="text-xs text-error mt-1">{error}</p>}
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label} {required && '*'}
      </label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground ${className}`}
      {...props}
    />
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      className={`w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground resize-none ${className}`}
      {...props}
    />
  );
}

// md — a form field, matching Input; sm — a filter sitting next to one; xs — a
// dense row (pagination, the log toolbars). Padding and radius live here rather
// than in the base string because they cannot be passed in through className:
// Tailwind resolves conflicting utilities by their order in the built stylesheet,
// not by their order in the attribute, so px-4 beats px-3 whatever the caller
// writes.
//
// `text-base … sm:text-sm` on sm is 16px on mobile — iOS Safari zooms the page
// when a focused control's font is smaller — and 14px from the breakpoint up. md
// deliberately sets no size: it inherits the body's 16px and is already safe.
//
// The right padding is larger than the left on every size, and that asymmetry
// is the chevron's room: the native arrow is drawn by the platform wherever the
// platform likes — in the middle of the padding on one browser, tight against
// the border on the next — so it is turned off (`appearance-none`) and one is
// drawn here instead, at a fixed inset and in our own muted colour.
const SELECT_SIZES = {
  md: 'pl-4 pr-10 py-2.5 rounded-lg',
  sm: 'pl-3 pr-9 py-2 rounded-lg text-base sm:text-sm',
  xs: 'pl-2 pr-7 py-1 rounded-md text-xs',
} as const;

// Matches the right padding above, so the chevron sits inside it rather than on
// the border.
const CHEVRON = {
  md: 'right-3 h-4 w-4',
  sm: 'right-2.5 h-4 w-4',
  xs: 'right-1.5 h-3.5 w-3.5',
} as const;

export type SelectSize = keyof typeof SELECT_SIZES;

// The native `size` of a <select> is its number of visible rows, which nothing
// here wants; the name goes to the kit's scale instead, as on Modal and SearchToolbar.
type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: SelectSize;
  fullWidth?: boolean;
};

// Native <select> sharing Input's styling — the single dropdown primitive.
export function Select({
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}: SelectProps) {
  return (
    // The wrapper exists only to position the chevron; it takes the element's
    // width so a `fullWidth` select still fills its row and an inline one still
    // sits in a flex line.
    <span className={`relative inline-flex items-center ${fullWidth ? 'w-full' : ''}`}>
      <select
        className={`${fullWidth ? 'w-full ' : ''}${SELECT_SIZES[size]} appearance-none bg-surface-secondary border border-border text-foreground ${className}`}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className={`pointer-events-none absolute text-muted ${CHEVRON[size]}`}
      />
    </span>
  );
}
