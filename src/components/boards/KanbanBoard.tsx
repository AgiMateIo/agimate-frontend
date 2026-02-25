'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { BoardTask, TaskStatus } from '@/types';
import { TASK_STATUSES } from '@/types';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  columns: Record<TaskStatus, BoardTask[]>;
  agentMap: Map<string, string>;
  onTaskMove: (taskPubId: string, from: TaskStatus, to: TaskStatus) => void;
  onTaskClick: (taskPubId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export default function KanbanBoard({
  columns,
  agentMap,
  onTaskMove,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = event.active.id as string;
      const task = Object.values(columns).flat().find((t) => t.pubId === taskId);
      setActiveTask(task ?? null);
    },
    [columns]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;

      // Determine the target status: either a column droppable id or a task's container
      let toStatus: TaskStatus | undefined;
      if (TASK_STATUSES.includes(over.id as TaskStatus)) {
        toStatus = over.id as TaskStatus;
      } else {
        // Dropped on another task — find which column it belongs to
        for (const [status, tasks] of Object.entries(columns)) {
          if (tasks.some((t) => t.pubId === over.id)) {
            toStatus = status as TaskStatus;
            break;
          }
        }
      }

      if (!toStatus) return;

      // Find the source column
      let fromStatus: TaskStatus | undefined;
      for (const [status, tasks] of Object.entries(columns)) {
        if (tasks.some((t) => t.pubId === taskId)) {
          fromStatus = status as TaskStatus;
          break;
        }
      }

      if (!fromStatus || fromStatus === toStatus) return;

      onTaskMove(taskId, fromStatus, toStatus);
    },
    [columns, onTaskMove]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-3 px-6 pb-6 min-w-max">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              agentMap={agentMap}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} agentMap={agentMap} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
