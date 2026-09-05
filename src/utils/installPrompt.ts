'use client';

import { useSyncExternalStore } from 'react';

/**
 * The browser's offer to install the dashboard as an app, held at page scope.
 *
 * Chrome fires `beforeinstallprompt` exactly once per page load, whenever it
 * decides the site qualifies — possibly long before the settings page mounts.
 * A component listening in its own effect would miss it, so the listener is
 * registered when this module is evaluated, and the dashboard layout imports
 * the module for that side effect alone. The event object is the only handle
 * on the prompt: it is kept here, spent once by `promptInstall`, and gone after.
 *
 * Browsers without the event (Safari, Firefox) simply never move `canPrompt`
 * off `false`; the card shows their own instructions instead.
 */

/** The non-standard event Chromium fires; not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** A prompt is in hand and can be shown by a click. */
  canPrompt: boolean;
  /** `appinstalled` fired during this page load. */
  installed: boolean;
  /** The page is running as an installed app (standalone window, home screen). */
  standalone: boolean;
}

const STANDALONE_QUERY = '(display-mode: standalone)';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let snapshot: InstallState | null = null;
const listeners = new Set<() => void>();

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // `navigator.standalone` is iOS Safari's own flag; older versions answer only it.
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(STANDALONE_QUERY).matches || nav.standalone === true;
}

function emit() {
  snapshot = null;
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stops Chrome's own mini-infobar on Android so the offer is made in one
    // place; the desktop address-bar icon stays either way.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
  window.matchMedia(STANDALONE_QUERY).addEventListener('change', emit);
}

// `useSyncExternalStore` needs a stable object until something changes, or React
// re-renders without end; `emit` drops the cache so the next read rebuilds it.
function getSnapshot(): InstallState {
  snapshot ??= { canPrompt: deferredPrompt !== null, installed, standalone: isStandalone() };
  return snapshot;
}

// The server cannot know the display mode, and neither can the first client
// render without a hydration mismatch — the card treats `null` as "not yet".
const getServerSnapshot = (): InstallState | null => null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInstallPrompt(): InstallState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Shows the browser's install dialog. Resolves to the person's answer; the
 * prompt is spent either way — Chrome will not fire another for this page load,
 * so a dismissed dialog leaves the card without a button until a reload.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed'> {
  const prompt = deferredPrompt;
  if (!prompt) return 'dismissed';
  deferredPrompt = null;
  emit();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}
