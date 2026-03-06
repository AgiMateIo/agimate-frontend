'use client';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({
  label,
  required,
  error,
  children,
  hint,
}: FormFieldProps) {
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
