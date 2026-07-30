'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type CollisionDetection,
} from '@dnd-kit/core';
import type { BoardTask, TaskStatus } from '@/types';
import { TASK_STATUSES } from '@/types';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  columns: Record<TaskStatus, BoardTask[]>;
  agentMap: Map<string, string>;
  onTaskMove: (taskId: string, from: TaskStatus, to: TaskStatus) => void;
  onTaskClick: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
  highlightedIds?: Set<string>;
}

export default function KanbanBoard({
  columns,
  agentMap,
  onTaskMove,
  onTaskClick,
  onAddTask,
  highlightedIds,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  // Split by input device instead of one PointerSensor: a finger has to be able
  // to swipe the board sideways without picking a card up, so touch drags start
  // on a long press while the mouse keeps the immediate distance threshold.
  // Trade-off: a stylus emits pointer events and no longer drags.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  // Multi-container kanban collision: prefer pointer-within, fall back to
  // rectangle intersection. closestCorners misbehaves for middle columns —
  // near column boundaries it often resolves to the neighbouring column's
  // corner, making drops into IN_PROGRESS/REVIEW unreliable.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const columnHit = pointerCollisions.find((c) =>
        TASK_STATUSES.includes(c.id as TaskStatus)
      );
      return columnHit ? [columnHit] : [getFirstCollision(pointerCollisions)!];
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      const columnHit = rectCollisions.find((c) =>
        TASK_STATUSES.includes(c.id as TaskStatus)
      );
      return columnHit ? [columnHit] : [getFirstCollision(rectCollisions)!];
    }
    return [];
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = event.active.id as string;
      const task = Object.values(columns).flat().find((t) => t.id === taskId);
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
          if (tasks.some((t) => t.id === over.id)) {
            toStatus = status as TaskStatus;
            break;
          }
        }
      }

      if (!toStatus) return;

      // Find the source column
      let fromStatus: TaskStatus | undefined;
      for (const [status, tasks] of Object.entries(columns)) {
        if (tasks.some((t) => t.id === taskId)) {
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
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* The columns scroll inside the board instead of dragging the whole page
          sideways: four 256px columns never fit a phone. Snap makes it one
          column per swipe; from `md` up they share the width as before and the
          scroller only engages if the window is genuinely too narrow. dnd-kit
          auto-scrolls this container while a card is held near its edge. */}
      <div className="flex-1 flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-4 sm:px-6 sm:pb-6 md:snap-none">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            agentMap={agentMap}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            highlightedIds={highlightedIds}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} agentMap={agentMap} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
