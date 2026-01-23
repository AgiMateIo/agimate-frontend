'use client';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
    secondary: 'bg-surface-secondary text-foreground hover:bg-border',
    danger: 'bg-error text-white hover:bg-error/90',
    warning: 'bg-warning text-white hover:bg-warning/90',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
