'use client';

import { useTranslations } from 'next-intl';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { BoardTask, TaskStatus } from '@/types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: BoardTask[];
  agentMap: Map<string, string>;
  onTaskClick: (taskPubId: string) => void;
  onAddTask: (status: TaskStatus) => void;
  highlightedIds?: Set<string>;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  BACKLOG: 'bg-surface-secondary',
  IN_PROGRESS: 'bg-warning/10',
  REVIEW: 'bg-purple-500/10',
  DONE: 'bg-success/10',
};

export default function KanbanColumn({
  status,
  tasks,
  agentMap,
  onTaskClick,
  onAddTask,
  highlightedIds,
}: KanbanColumnProps) {
  const t = useTranslations('Board');

  const { setNodeRef, isOver } = useDroppable({ id: status });

  const taskIds = tasks.map((task) => task.pubId);

  return (
    <div className="flex flex-col flex-1 min-w-64">
      <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STATUS_COLORS[status]}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {t(`status.${status}`)}
          </span>
          <span className="text-xs text-muted bg-surface rounded-full px-1.5 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="text-muted hover:text-foreground transition-colors"
          aria-label={t('addTask')}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-b-lg border border-t-0 border-border p-2 space-y-2 min-h-32
            ${isOver ? 'bg-accent/5 border-accent/30' : 'bg-surface-secondary/50'}`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.pubId}
              task={task}
              agentMap={agentMap}
              onClick={() => onTaskClick(task.pubId)}
              highlighted={highlightedIds?.has(task.pubId)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
