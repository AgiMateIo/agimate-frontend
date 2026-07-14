'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useSuspenseQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type {
  Board,
  BoardTask,
  AgentResponse,
  BoardTaskCreatedPayload,
  BoardTaskStatusChangedPayload,
  BoardTaskCommentCreatedPayload,
} from '@/types';
import KanbanBoard from '@/components/boards/KanbanBoard';
import BoardEmptyState from '@/components/boards/BoardEmptyState';
import TaskSlideOver from '@/components/boards/TaskSlideOver';
import CreateTaskModal from '@/components/boards/CreateTaskModal';
import { useBoardSubscription } from '@/realtime/useBoardSubscription';
import { agentsListOptions } from '@/queries/agents';
import {
  boardTasksOptions,
  useBoardsListQuery,
  useChangeTaskStatusMutation,
  useBoardCacheActions,
} from '@/queries/boards';

function buildAgentMap(agents: AgentResponse[]): Map<string, string> {
  return new Map(agents.map((a) => [a.id, a.name]));
}

function BoardView({ board, teamId }: { board: Board; teamId: string }) {
  const t = useTranslations('Board');

  // Tasks (this board) and agents (this team) fetched in parallel — two suspense
  // queries in one component would otherwise run serially.
  const [{ data: columns }, { data: agentsPage }] = useSuspenseQueries({
    queries: [boardTasksOptions(board.id), agentsListOptions(teamId)],
  });
  const agents = agentsPage.content;
  const agentMap = useMemo(() => buildAgentMap(agents), [agents]);

  const changeStatus = useChangeTaskStatusMutation(board.id);
  const { invalidateTasks, invalidateComments, upsertTask, moveTask } = useBoardCacheActions();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());

  const handleTaskMove = useCallback(
    (taskId: string, fromStatus: BoardTask['status'], toStatus: BoardTask['status']) => {
      // The status change is attributed to the first available agent.
      const agentId = agents[0]?.id;
      if (!agentId) return;
      changeStatus.mutate({ taskId, fromStatus, toStatus, agentId });
    },
    [agents, changeStatus]
  );

  // ===== Real-time event handlers =====

  const flashCard = useCallback((id: string) => {
    setHighlightedIds((prev) => new Set(prev).add(id));
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
      // Payload has no timestamps; synthesize "now" for the optimistic card.
      const now = new Date().toISOString();
      const task: BoardTask = {
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
      upsertTask(board.id, task);
      flashCard(p.taskId);
    },
    [board.id, upsertTask, flashCard]
  );

  const handleRealtimeStatusChanged = useCallback(
    (p: BoardTaskStatusChangedPayload) => {
      if (p.oldStatus === p.newStatus) return;
      moveTask(board.id, p.taskId, p.newStatus);
    },
    [board.id, moveTask]
  );

  const handleRealtimeCommentAdded = useCallback(
    (p: BoardTaskCommentCreatedPayload) => {
      invalidateComments(p.boardId, p.taskId);
    },
    [invalidateComments]
  );

  useBoardSubscription(board.id, {
    onTaskCreated: handleRealtimeTaskCreated,
    onTaskStatusChanged: handleRealtimeStatusChanged,
    onCommentAdded: handleRealtimeCommentAdded,
  });

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return Object.values(columns).flat().find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, columns]);

  const allTasks = useMemo(() => Object.values(columns).flat(), [columns]);

  return (
    <>
      {/* Board header */}
      <div className="px-6 pt-6 pb-4 shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{board.name}</h1>
          {board.description && (
            <p className="text-muted mt-1 text-sm">{board.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowCreateTask(true)}>
            {t('createTask')}
          </Button>
          <button
            onClick={() => invalidateTasks(board.id)}
            className="text-muted hover:text-foreground transition-colors p-2"
            aria-label={t('refresh')}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <KanbanBoard
        columns={columns}
        agentMap={agentMap}
        onTaskMove={handleTaskMove}
        onTaskClick={setSelectedTaskId}
        onAddTask={() => setShowCreateTask(true)}
        highlightedIds={highlightedIds}
      />

      {selectedTask && (
        <TaskSlideOver
          boardId={board.id}
          task={selectedTask}
          agentMap={agentMap}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          boardId={board.id}
          allTasks={allTasks}
          agentMap={agentMap}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => {
            setShowCreateTask(false);
            invalidateTasks(board.id);
          }}
        />
      )}
    </>
  );
}

function BoardResolver({ teamId }: { teamId: string }) {
  const t = useTranslations('Board');
  const { data: boards } = useBoardsListQuery();
  const { invalidateBoards } = useBoardCacheActions();

  const board = boards.find((b) => b.agenticTeamId === teamId) ?? null;

  if (!board) {
    return (
      <>
        <div className="px-6 pt-6 pb-4 shrink-0">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        </div>
        <div className="px-6">
          {/* A fresh board appears once the boards list refetches. */}
          <BoardEmptyState teamId={teamId} onCreated={() => invalidateBoards()} />
        </div>
      </>
    );
  }

  return <BoardView board={board} teamId={teamId} />;
}

export default function BoardPage() {
  const t = useTranslations('Board');
  const params = useParams();
  const teamId = params.id as string;

  useSetBreadcrumb('board', t('title'));

  return (
    <div className="-mx-6 -mt-6 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <ErrorBoundary resetKeys={[teamId]}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24 text-muted">{t('loading')}</div>
          }
        >
          <BoardResolver teamId={teamId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
