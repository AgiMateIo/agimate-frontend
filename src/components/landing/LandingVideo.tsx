'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PlayIcon } from '@heroicons/react/24/solid';

// The 30-second promo, one cut per locale. Click-to-play with preload="none":
// it has a soundtrack, and 3–4 MB shouldn't load for visitors who never press play.
// WebM (VP9) first, H.264 MP4 for Safari.
export default function LandingVideo() {
  const locale = useLocale() === 'en' ? 'en' : 'ru';
  const t = useTranslations('HomePage.hero');
  const base = `/video/agimate-ad-${locale}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  // Native controls only once playing, so the big button isn't competing with them.
  const [idle, setIdle] = useState(true);

  const play = () => {
    setIdle(false);
    videoRef.current?.play().catch(() => setIdle(true));
  };

  return (
    <div className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-accent/20 bg-surface shadow-card">
      <video
        key={locale}
        ref={videoRef}
        className="block aspect-video w-full"
        width={1920}
        height={1080}
        poster={`${base}-poster.webp`}
        controls={!idle}
        playsInline
        preload="none"
        aria-label={t('videoLabel')}
        onPlay={() => setIdle(false)}
        onEnded={() => setIdle(true)}
      >
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      {idle && (
        <button
          type="button"
          onClick={play}
          // Bottom of the frame: the poster's headline sits in the middle.
          className="group absolute inset-0 flex items-end justify-center pb-[4%] focus-visible:outline-none"
        >
          <span className="flex items-center gap-3 rounded-full bg-black/60 py-1.5 pl-1.5 pr-5 text-sm font-semibold text-white shadow-xl ring-1 ring-white/15 backdrop-blur transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-white sm:gap-4 sm:py-2 sm:pl-2 sm:pr-8 sm:text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40 sm:h-16 sm:w-16">
              <PlayIcon className="ml-0.5 h-5 w-5 sm:ml-1 sm:h-8 sm:w-8" />
            </span>
            {t('videoPlay')}
          </span>
        </button>
      )}
    </div>
  );
}
