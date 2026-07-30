'use client';

import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import type { BoardTask } from '@/types';
import { TYPE_BADGE } from './taskBadges';

interface TaskCardProps {
  task: BoardTask;
  agentMap: Map<string, string>;
  onClick?: () => void;
  isDragOverlay?: boolean;
  highlighted?: boolean;
}

export default function TaskCard({
  task,
  agentMap,
  onClick,
  isDragOverlay = false,
  highlighted = false,
}: TaskCardProps) {
  const t = useTranslations('Board');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay });

  const style: React.CSSProperties | undefined = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        // Per-card view-transition-name lets VT treat each card as a stable
        // element; on setColumns the moving card morphs from its old slot
        // to the new one (true flight), while siblings glide to their new
        // positions instead of a muddy root cross-fade.
        viewTransitionName: `task-${task.id.replace(/-/g, '_')}`,
      };

  const assigneeName = task.assigneeAgentId
    ? agentMap.get(task.assigneeAgentId) ?? t('unknownAgent')
    : null;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      data-task-pubid={isDragOverlay ? undefined : task.id}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={onClick}
      // touch-manipulation, not touch-none: the browser keeps scrolling the
      // board until the TouchSensor's long press wins the gesture.
      className={`bg-surface rounded-lg p-3 border border-border cursor-pointer touch-manipulation
        hover:border-accent/40 transition-colors space-y-2 select-none
        ${isDragOverlay ? 'shadow-lg ring-2 ring-accent/30 rotate-2' : ''}
        ${highlighted && !isDragOverlay && !isDragging ? 'animate-task-arrive' : ''}`}
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
