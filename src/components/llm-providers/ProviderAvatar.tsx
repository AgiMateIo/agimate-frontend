'use client';

import { SparklesIcon } from '@heroicons/react/24/outline';
import { LlmProviderType } from '@/types';

// Per-type avatar tile: a two-letter mark on a brand-tinted background. The
// platform provider gets its own success-green sparkle tile so it reads as
// special at a glance.
const STYLES: Record<LlmProviderType, { badge: string; className: string }> = {
  OPENAI: { badge: 'AI', className: 'bg-emerald-500/15 text-emerald-500' },
  ANTHROPIC: { badge: 'An', className: 'bg-orange-500/15 text-orange-500' },
  GEMINI: { badge: 'Gm', className: 'bg-blue-500/15 text-blue-500' },
  OPENAI_COMPATIBLE: { badge: 'OS', className: 'bg-violet-500/15 text-violet-500' },
};

interface ProviderAvatarProps {
  providerType: LlmProviderType;
  platform?: boolean;
  size?: 'md' | 'lg';
}

export function ProviderAvatar({ providerType, platform, size = 'md' }: ProviderAvatarProps) {
  const dim = size === 'lg' ? 'h-12 w-12 text-base' : 'h-11 w-11 text-sm';

  if (platform) {
    return (
      <div className={`${dim} rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0`}>
        <SparklesIcon className="h-5 w-5" />
      </div>
    );
  }

  const style = STYLES[providerType] ?? STYLES.OPENAI_COMPATIBLE;
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center font-bold shrink-0 ${style.className}`}>
      {style.badge}
    </div>
  );
}
