'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import apiService from '@/services/api';
import type { Board, BoardTask, TasksByStatus, TaskStatus, AgentResponse } from '@/types';
import { TASK_STATUSES } from '@/types';
import KanbanBoard from '@/components/boards/KanbanBoard';
import BoardEmptyState from '@/components/boards/BoardEmptyState';
import TaskSlideOver from '@/components/boards/TaskSlideOver';
import CreateTaskModal from '@/components/boards/CreateTaskModal';

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

  const [selectedTaskPubId, setSelectedTaskPubId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const agentMap = useMemo(() => buildAgentMap(agents), [agents]);

  useSetBreadcrumb('board', t('title'));

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [boards, agentsList] = await Promise.all([
        apiService.getBoards(),
        apiService.getAgentsList(teamId),
      ]);

      setAgents(agentsList);

      const teamBoard = boards.find((b) => b.agenticTeamPubId === teamId) ?? null;
      if (!teamBoard) {
        setBoard(null);
        setColumns(null);
        setLoading(false);
        return;
      }

      const tasksByStatus = await apiService.getBoardTasks(teamBoard.pubId);
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
    async (taskPubId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
      if (!columns) return;

      // Deep copy for safe rollback
      const snapshot = {} as Record<TaskStatus, BoardTask[]>;
      for (const s of TASK_STATUSES) {
        snapshot[s] = [...columns[s]];
      }

      const task = columns[fromStatus].find((t) => t.pubId === taskPubId);
      if (!task) return;

      // Optimistic update
      const updated = { ...columns };
      updated[fromStatus] = updated[fromStatus].filter((t) => t.pubId !== taskPubId);
      updated[toStatus] = [{ ...task, status: toStatus }, ...updated[toStatus]];
      setColumns(updated);

      try {
        // Use the first available agent for the status change
        const agentPubId = agents[0]?.id;
        if (!agentPubId) return;
        await apiService.changeTaskStatus(taskPubId, { status: toStatus, agentPubId });
      } catch {
        setColumns(snapshot); // revert on failure
      }
    },
    [columns, agents]
  );

  const handleTaskCreated = useCallback(() => {
    setShowCreateTask(false);
    fetchData();
  }, [fetchData]);

  // Find the selected task from columns
  const selectedTask = useMemo(() => {
    if (!selectedTaskPubId || !columns) return null;
    return Object.values(columns).flat().find((t) => t.pubId === selectedTaskPubId) ?? null;
  }, [selectedTaskPubId, columns]);

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
    <div className="-mx-6 -mt-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
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
          onTaskClick={setSelectedTaskPubId}
          onAddTask={() => setShowCreateTask(true)}
        />
      )}

      {/* Slide-over */}
      {selectedTask && (
        <TaskSlideOver
          task={selectedTask}
          agentMap={agentMap}
          onClose={() => setSelectedTaskPubId(null)}
        />
      )}

      {/* Create task modal */}
      {showCreateTask && board && (
        <CreateTaskModal
          boardPubId={board.pubId}
          allTasks={allTasks}
          agentMap={agentMap}
          onClose={() => setShowCreateTask(false)}
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
}
