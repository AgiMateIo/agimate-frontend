'use client';

import { useEffect } from 'react';

// Page-level landing motion: reveals blocks once as they enter the viewport and
// exposes page progress as `--landing-scroll` for the backdrop. Renders nothing;
// all movement lives in globals.css.
export default function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const backdrop = document.querySelector<HTMLElement>('[data-landing-scroll]');
    let io: IntersectionObserver | null = null;

    const revealAll = () => blocks.forEach((el) => el.classList.add('is-revealed'));

    if (reduced.matches || !('IntersectionObserver' in window)) {
      revealAll();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-revealed');
            io?.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      blocks.forEach((el) => io?.observe(el));
    }

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      if (!backdrop || reduced.matches) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      backdrop.style.setProperty(
        '--landing-scroll',
        (max > 0 ? window.scrollY / max : 0).toFixed(4),
      );
    };
    const scheduleScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    };

    const onReducedChange = () => {
      if (reduced.matches) revealAll();
      else scheduleScroll();
    };
    reduced.addEventListener('change', onReducedChange);

    // Always armed: the preference can be switched off after load.
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll);
    scheduleScroll();

    return () => {
      io?.disconnect();
      reduced.removeEventListener('change', onReducedChange);
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      backdrop?.style.removeProperty('--landing-scroll');
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
