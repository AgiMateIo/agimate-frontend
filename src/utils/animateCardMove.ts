import { flushSync } from 'react-dom';

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

/**
 * Wraps a columns-state update in a View Transition so every kanban card
 * (each carrying its own view-transition-name via TaskCard) morphs from
 * its old slot to its new one. The moving card physically flies between
 * columns; siblings slide to fill the gap / make room.
 *
 * flushSync forces React to commit the DOM update synchronously inside the
 * VT callback — without it, startViewTransition's new-snapshot would be
 * captured before React rendered, producing identical old/new snapshots
 * and no animation.
 *
 * Browsers without View Transitions (Firefox/Safari as of 2026) just run
 * the update instantly — graceful degradation.
 */
export function animateCardMove(_taskId: string, update: () => void): void {
  const doc = document as DocWithVT;
  if (typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
