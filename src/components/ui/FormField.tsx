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
