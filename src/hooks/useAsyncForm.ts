import { useState, useCallback } from 'react';
import { ApiError } from '@/services/api';

interface UseAsyncFormOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  defaultError?: string;
}

export function useAsyncForm<T = void>(options: UseAsyncFormOptions<T> = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (e: React.FormEvent, action: () => Promise<T>) => {
      e.preventDefault();
      setError(null);
      setFieldErrors({});
      setLoading(true);

      try {
        const result = await action();
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.details) {
          setFieldErrors(err.details);
        } else {
          const errorMessage =
            err instanceof Error
              ? err.message
              : options.defaultError || 'An error occurred';
          setError(errorMessage);
        }
        options.onError?.(err instanceof Error ? err : new Error(options.defaultError || 'An error occurred'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return {
    loading,
    error,
    fieldErrors,
    handleSubmit,
    setError,
    clearError,
  };
}
