'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import apiService from '@/services/api';
import type {
  Board,
  BoardTask,
  TasksByStatus,
  TaskStatus,
  AgentResponse,
  BoardTaskCreatedPayload,
  BoardTaskStatusChangedPayload,
} from '@/types';
import { TASK_STATUSES } from '@/types';
import KanbanBoard from '@/components/boards/KanbanBoard';
import BoardEmptyState from '@/components/boards/BoardEmptyState';
import TaskSlideOver from '@/components/boards/TaskSlideOver';
import CreateTaskModal from '@/components/boards/CreateTaskModal';
import { useBoardSubscription } from '@/realtime/useBoardSubscription';
import { animateCardMove } from '@/utils/animateCardMove';

function buildAgentMap(agents: AgentResponse[]): Map<string, string> {
  return new Map(agents.map((a) => [a.id, a.name]));
}

function buildColumnMap(data: TasksByStatus | null): Record<TaskStatus, BoardTask[]> {
  const map = {} as Record<TaskStatus, BoardTask[]>;
  for (const status of TASK_STATUSES) {
    map[status] = data?.tasks?.[status] ?? [];
  }
  return map;
}

export default function BoardPage() {
  const t = useTranslations('Board');
  const params = useParams();
  const teamId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Record<TaskStatus, BoardTask[]> | null>(null);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());

  const agentMap = useMemo(() => buildAgentMap(agents), [agents]);

  useSetBreadcrumb('board', t('title'));

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [boards, agentsList] = await Promise.all([
        apiService.getBoards(),
        apiService.getAgentsList({ agenticTeamId: teamId }),
      ]);

      setAgents(agentsList.content);

      const teamBoard = boards.find((b) => b.agenticTeamId === teamId) ?? null;
      if (!teamBoard) {
        setBoard(null);
        setColumns(null);
        setLoading(false);
        return;
      }

      const tasksByStatus = await apiService.getBoardTasks(teamBoard.id);
      setBoard(teamBoard);
      setColumns(buildColumnMap(tasksByStatus));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [teamId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBoardCreated = useCallback((newBoard: Board) => {
    setBoard(newBoard);
    setColumns(buildColumnMap(null));
  }, []);

  const handleTaskMove = useCallback(
    async (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
      if (!columns) return;

      // Deep copy for safe rollback
      const snapshot = {} as Record<TaskStatus, BoardTask[]>;
      for (const s of TASK_STATUSES) {
        snapshot[s] = [...columns[s]];
      }

      const task = columns[fromStatus].find((t) => t.id === taskId);
      if (!task) return;

      // Use the first available agent for the status change
      const agentId = agents[0]?.id;
      if (!agentId) return;

      // Optimistic update with inter-column animation
      const updated = { ...columns };
      updated[fromStatus] = updated[fromStatus].filter((t) => t.id !== taskId);
      updated[toStatus] = [{ ...task, status: toStatus }, ...updated[toStatus]];
      animateCardMove(taskId, () => setColumns(updated));

      try {
        await apiService.changeTaskStatus(taskId, { status: toStatus, agentId });
      } catch {
        animateCardMove(taskId, () => setColumns(snapshot));
      }
    },
    [columns, agents]
  );

  const handleTaskCreated = useCallback(() => {
    setShowCreateTask(false);
    fetchData();
  }, [fetchData]);

  // ===== Real-time event handlers =====

  const flashCard = useCallback((id: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setHighlightedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1000);
  }, []);

  const handleRealtimeTaskCreated = useCallback(
    (p: BoardTaskCreatedPayload) => {
      setColumns((prev) => {
        if (!prev) return prev;
        const exists = Object.values(prev).some((tasks) =>
          tasks.some((t) => t.id === p.taskId)
        );
        if (exists) return prev;

        const now = new Date().toISOString();
        const newTask: BoardTask = {
          id: p.taskId,
          type: p.type,
          status: p.status,
          title: p.title,
          description: p.description,
          createdByAgentId: p.createdByAgentId,
          assigneeAgentId: p.assigneeAgentId,
          parentTaskId: p.parentTaskId,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, [p.status]: [newTask, ...prev[p.status]] };
      });
      flashCard(p.taskId);
    },
    [flashCard]
  );

  const handleRealtimeStatusChanged = useCallback(
    (p: BoardTaskStatusChangedPayload) => {
      if (!columns) return;
      if (p.oldStatus === p.newStatus) return;
      if (columns[p.newStatus].some((t) => t.id === p.taskId)) return;

      let task: BoardTask | undefined;
      for (const status of TASK_STATUSES) {
        const found = columns[status].find((t) => t.id === p.taskId);
        if (found) {
          task = found;
          break;
        }
      }
      if (!task) return;

      const next = {} as Record<TaskStatus, BoardTask[]>;
      for (const s of TASK_STATUSES) {
        next[s] = columns[s].filter((t) => t.id !== p.taskId);
      }
      next[p.newStatus] = [{ ...task, status: p.newStatus }, ...next[p.newStatus]];
      animateCardMove(p.taskId, () => setColumns(next));
    },
    [columns]
  );

  useBoardSubscription(board?.id ?? null, {
    onTaskCreated: handleRealtimeTaskCreated,
    onTaskStatusChanged: handleRealtimeStatusChanged,
  });

  // Find the selected task from columns
  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !columns) return null;
    return Object.values(columns).flat().find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, columns]);

  // All tasks flat for parent selection in create modal
  const allTasks = useMemo(() => {
    if (!columns) return [];
    return Object.values(columns).flat();
  }, [columns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="-mx-6 -mt-6 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Board header */}
      <div className="px-6 pt-6 pb-4 shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {board?.name ?? t('title')}
          </h1>
          {board?.description && (
            <p className="text-muted mt-1 text-sm">{board.description}</p>
          )}
        </div>
        {board && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowCreateTask(true)}>
              {t('createTask')}
            </Button>
            <button
              onClick={fetchData}
              className="text-muted hover:text-foreground transition-colors p-2"
              aria-label={t('refresh')}
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-6 pb-4 shrink-0">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!board || !columns ? (
        <div className="px-6">
          <BoardEmptyState teamId={teamId} onCreated={handleBoardCreated} />
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          agentMap={agentMap}
          onTaskMove={handleTaskMove}
          onTaskClick={setSelectedTaskId}
          onAddTask={() => setShowCreateTask(true)}
          highlightedIds={highlightedIds}
        />
      )}

      {/* Slide-over */}
      {selectedTask && (
        <TaskSlideOver
          task={selectedTask}
          agentMap={agentMap}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Create task modal */}
      {showCreateTask && board && (
        <CreateTaskModal
          boardId={board.id}
          allTasks={allTasks}
          agentMap={agentMap}
          onClose={() => setShowCreateTask(false)}
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
}
