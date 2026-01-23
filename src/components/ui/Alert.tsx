'use client';

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

export function Alert({ variant, children }: AlertProps) {
  const variants = {
    info: 'bg-surface-secondary border-border text-foreground',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    error: 'bg-error/10 border-error/20 text-error',
  };

  return (
    <div className={`rounded-lg p-3 border ${variants[variant]}`}>
      {typeof children === 'string' ? (
        <p className="text-sm">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
