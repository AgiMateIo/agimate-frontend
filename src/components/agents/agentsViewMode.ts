'use client';

import { usePersistentValue } from '@/hooks/usePersistentValue';
import { createViewModeStore } from '@/utils/viewMode';

const modeStore = createViewModeStore('agents:view-mode');

export function useAgentsViewMode() {
  return { mode: usePersistentValue(modeStore), setMode: modeStore.set };
}
