'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

type BreadcrumbOverrides = Record<string, string>;

interface BreadcrumbContextValue {
  getOverrides: () => BreadcrumbOverrides;
  setOverride: (segment: string, label: string) => void;
  subscribe: (callback: () => void) => () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const overridesRef = useRef<BreadcrumbOverrides>({});
  const listenersRef = useRef(new Set<() => void>());

  const getOverrides = useCallback(() => overridesRef.current, []);

  const subscribe = useCallback((callback: () => void) => {
    listenersRef.current.add(callback);
    return () => listenersRef.current.delete(callback);
  }, []);

  const setOverride = useCallback((segment: string, label: string) => {
    if (overridesRef.current[segment] !== label) {
      overridesRef.current = { ...overridesRef.current, [segment]: label };
      listenersRef.current.forEach((cb) => cb());
    }
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ getOverrides, setOverride, subscribe }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbOverrides() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumbOverrides must be used within BreadcrumbProvider');
  return useSyncExternalStore(ctx.subscribe, ctx.getOverrides, ctx.getOverrides);
}

export function useSetBreadcrumb(segment: string, label: string | undefined) {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useSetBreadcrumb must be used within BreadcrumbProvider');
  useEffect(() => {
    if (label) {
      ctx.setOverride(segment, label);
    }
  }, [ctx, segment, label]);
}
