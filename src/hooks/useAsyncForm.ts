import { useState, useCallback } from 'react';

interface UseAsyncFormOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  defaultError?: string;
}

export function useAsyncForm<T = void>(options: UseAsyncFormOptions<T> = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, action: () => Promise<T>) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const result = await action();
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : options.defaultError || 'An error occurred';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    handleSubmit,
    setError,
    clearError,
  };
}
