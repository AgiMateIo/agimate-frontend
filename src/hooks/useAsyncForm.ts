import { useState, useCallback, useRef, useEffect } from 'react';
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

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const handleSubmit = useCallback(
    async (e: React.FormEvent, action: () => Promise<T>) => {
      e.preventDefault();
      setError(null);
      setFieldErrors({});
      setLoading(true);

      try {
        const result = await action();
        optionsRef.current.onSuccess?.(result);
        return result;
      } catch (err) {
        if (err instanceof ApiError && err.details) {
          setFieldErrors(err.details);
        } else {
          const errorMessage =
            err instanceof Error
              ? err.message
              : optionsRef.current.defaultError || 'An error occurred';
          setError(errorMessage);
        }
        optionsRef.current.onError?.(err instanceof Error ? err : new Error(optionsRef.current.defaultError || 'An error occurred'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
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
