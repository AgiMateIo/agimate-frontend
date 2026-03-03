import { use, useMemo, useCallback, useState, useEffect } from 'react';

// Global cache for promises to survive Strict Mode double mounting
const promiseCache = new Map<string, Promise<unknown>>();

/**
 * Hook for caching promises with Suspense support
 *
 * This hook provides a clean way to manage promise caching for React Suspense.
 * It uses a global cache to survive React Strict Mode double mounting in development.
 *
 * @example
 * ```tsx
 * function MyComponent({ userId }: { userId: string }) {
 *   const { promise, invalidate } = usePromiseCache(
 *     () => apiService.getUser(userId),
 *     [userId],
 *     'user-cache' // unique cache key
 *   );
 *
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       <UserDetails userPromise={promise} onUpdate={invalidate} />
 *     </Suspense>
 *   );
 * }
 *
 * function UserDetails({ userPromise, onUpdate }: Props) {
 *   const user = use(userPromise); // Suspends until resolved
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function usePromiseCache<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = [],
  cacheKeyPrefix = 'default'
) {
  const [version, setVersion] = useState(0);

  // Create a unique cache key based on prefix, version, and dependencies
  const cacheKey = useMemo(
    () => {
      const depsKey = JSON.stringify(dependencies);
      return `${cacheKeyPrefix}-${version}-${depsKey}`;
    },
    [cacheKeyPrefix, version, dependencies]
  );

  // Create a new promise or reuse cached one
  const promise = useMemo(
    () => {
      const cached = promiseCache.get(cacheKey) as Promise<T> | undefined;
      if (cached) {
        return cached;
      }

      const newPromise = fetchFn();
      promiseCache.set(cacheKey, newPromise);
      return newPromise;
    },
    [cacheKey, fetchFn]
  );

  // Clean up cache entry on unmount
  useEffect(() => {
    return () => {
      promiseCache.delete(cacheKey);
    };
  }, [cacheKey]);

  // Invalidate the cache by incrementing version
  const invalidate = useCallback(() => {
    // Clear old cache entry
    promiseCache.delete(cacheKey);
    // Increment version to create new cache key
    setVersion(prev => prev + 1);
  }, [cacheKey]);

  return { promise, invalidate };
}

/**
 * Hook to consume a promise with Suspense
 *
 * This is a simple wrapper around React's use() hook for better semantics.
 * Your component must be wrapped in a <Suspense> boundary.
 *
 * @example
 * ```tsx
 * function UserDetails({ userPromise }: { userPromise: Promise<User> }) {
 *   const user = usePromise(userPromise);
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function usePromise<T>(promise: Promise<T>): T {
  return use(promise);
}
