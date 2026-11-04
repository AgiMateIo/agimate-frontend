import { useEffect, useRef } from 'react';

// Writes `--p` (0 → 1) on the element while its top travels from `start` to
// `end` of the viewport height. Only visible elements are measured; reduced
// motion pins the value to 1 so every scene renders in its finished state.
export function useScrollProgress<T extends HTMLElement>(start = 0.85, end = 0.35) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let visible = false;

    const set = (p: number) => el.style.setProperty('--p', p.toFixed(3));
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      const top = el.getBoundingClientRect().top;
      const p = (start * vh - top) / ((start - end) * vh);
      set(p < 0 ? 0 : p > 1 ? 1 : p);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const onReducedChange = () => {
      if (reduced.matches) set(1);
      else schedule();
    };

    if (reduced.matches) set(1);
    else schedule();

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) schedule();
        },
        { rootMargin: '20% 0px' },
      );
      io.observe(el);
    } else {
      visible = true;
    }

    const onScroll = () => {
      if (visible && !reduced.matches) schedule();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', onReducedChange);

    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', onReducedChange);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [start, end]);

  return ref;
}
