'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EyeSlashIcon } from '@heroicons/react/24/outline';
import { getAgentAvatarUrl } from '@/utils/avatar';
import type { AgentStarter, AgentStartersResponse } from '@/types';

// How many starters an empty chat offers before "show more": enough to show the
// range, few enough that the composer below stays the obvious way in.
const VISIBLE_STARTERS = 6;

const starterKey = (s: AgentStarter) => s.id ?? `${s.agentSkillId}:${s.text}`;

// The greeting and the ready-made first messages of an empty chat. The greeting
// is not a message — it is drawn as a card, never as a bubble in the thread.
export function ChatStarters({
  agentName,
  data,
  disabled,
  onPick,
  onHide,
}: {
  agentName: string;
  data: AgentStartersResponse;
  disabled: boolean;
  onPick: (text: string) => void;
  onHide: (starter: AgentStarter) => void;
}) {
  const t = useTranslations('Chat');
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? data.starters : data.starters.slice(0, VISIBLE_STARTERS);
  const rest = data.starters.length - shown.length;

  return (
    <div className="flex flex-col items-center gap-5 py-6 sm:py-10">
      <img src={getAgentAvatarUrl(agentName)} alt="" className="h-12 w-12 rounded-xl" />
      {data.greeting && (
        <p className="max-w-xl whitespace-pre-wrap break-words text-center text-sm text-foreground">
          {data.greeting}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="grid w-full gap-2 sm:grid-cols-2">
          {shown.map((starter) => (
            <li key={starterKey(starter)} className="group relative">
              {/* Shown whole, never cut: a skill's starter is somebody else's
                  text going out under the user's name. */}
              <button
                type="button"
                onClick={() => onPick(starter.text)}
                disabled={disabled}
                className={`flex h-full w-full flex-col items-start gap-0.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/60 hover:bg-surface-secondary disabled:cursor-default disabled:opacity-50 ${
                  starter.agentSkillId ? 'pr-9' : ''
                }`}
              >
                <span className="break-words text-sm text-foreground">{starter.text}</span>
                {starter.skillTitle && (
                  <span className="text-xs text-muted">
                    {t('starterFromSkill', { skill: starter.skillTitle })}
                  </span>
                )}
              </button>
              {/* Only a skill's starter can be hidden; the agent's own are
                  deleted in its settings instead. */}
              {starter.agentSkillId && (
                <button
                  type="button"
                  onClick={() => onHide(starter)}
                  title={t('hideStarter')}
                  aria-label={t('hideStarter')}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <EyeSlashIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-accent underline underline-offset-2 transition-colors hover:text-accent/80"
        >
          {t('moreStarters', { count: rest })}
        </button>
      )}
    </div>
  );
}
