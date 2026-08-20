'use client';

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
const SELECT_SIZES = {
  md: 'px-4 py-2.5 rounded-lg',
  sm: 'px-3 py-2 rounded-lg text-base sm:text-sm',
  xs: 'px-2 py-1 rounded-md text-xs',
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
    <select
      className={`${fullWidth ? 'w-full ' : ''}${SELECT_SIZES[size]} bg-surface-secondary border border-border text-foreground ${className}`}
      {...props}
    />
  );
}
