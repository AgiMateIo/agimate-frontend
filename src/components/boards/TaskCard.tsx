'use client';

import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import type { BoardTask } from '@/types';

interface TaskCardProps {
  task: BoardTask;
  agentMap: Map<string, string>;
  onClick?: () => void;
  isDragOverlay?: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  EPIC: 'bg-purple-500/20 text-purple-400',
  TASK: 'bg-blue-500/20 text-blue-400',
  SUBTASK: 'bg-surface-secondary text-muted',
};

export default function TaskCard({ task, agentMap, onClick, isDragOverlay = false }: TaskCardProps) {
  const t = useTranslations('Board');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.pubId, disabled: isDragOverlay });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  const assigneeName = task.assigneeAgentPubId
    ? agentMap.get(task.assigneeAgentPubId) ?? t('unknownAgent')
    : null;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={onClick}
      className={`bg-surface rounded-lg p-3 border border-border cursor-pointer
        hover:border-accent/40 transition-colors space-y-2 select-none
        ${isDragOverlay ? 'shadow-lg ring-2 ring-accent/30 rotate-2' : ''}`}
    >
      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${TYPE_BADGE[task.type] ?? ''}`}>
        {t(`type.${task.type}`)}
      </span>

      <p className="text-sm font-medium text-foreground line-clamp-2">{task.title}</p>

      {assigneeName && (
        <div className="flex items-center gap-1 text-xs text-muted">
          <UserCircleIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{assigneeName}</span>
        </div>
      )}
    </div>
  );
}
