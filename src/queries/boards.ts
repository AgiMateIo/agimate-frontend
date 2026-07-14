import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import apiService from '@/services/api';
import type { BoardTask, TaskStatus, TasksByStatus } from '@/types';
import { TASK_STATUSES } from '@/types';
import { animateCardMove } from '@/utils/animateCardMove';

// Cache shape for a board's tasks: a dense column map keyed by every status.
export type BoardColumns = Record<TaskStatus, BoardTask[]>;

// Normalize the server's (possibly sparse) TasksByStatus into a dense column map
// so every status key is present — callers can index by status without guards.
export function buildColumnMap(data: TasksByStatus | null): BoardColumns {
  const map = {} as BoardColumns;
  for (const status of TASK_STATUSES) {
    map[status] = data?.tasks?.[status] ?? [];
  }
  return map;
}

export const boardKeys = {
  all: ['boards'] as const,
  lists: () => [...boardKeys.all, 'list'] as const,
  list: () => [...boardKeys.lists()] as const,
  tasks: (boardId: string) => [...boardKeys.all, 'tasks', boardId] as const,
  comments: (boardId: string, taskId: string) =>
    [...boardKeys.all, 'comments', boardId, taskId] as const,
};

// There is no board-by-team endpoint — getBoards() returns all boards and the
// caller selects the one for its team by agenticTeamId.
export const boardsListOptions = () =>
  queryOptions({
    queryKey: boardKeys.list(),
    queryFn: () => apiService.getBoards(),
  });

// The cache stores the dense column map (not the raw TasksByStatus) so optimistic
// task moves and realtime updates operate on the same shape the board renders.
export const boardTasksOptions = (boardId: string) =>
  queryOptions({
    queryKey: boardKeys.tasks(boardId),
    queryFn: async () => buildColumnMap(await apiService.getBoardTasks(boardId)),
  });

export const taskCommentsOptions = (boardId: string, taskId: string) =>
  queryOptions({
    queryKey: boardKeys.comments(boardId, taskId),
    queryFn: () => apiService.getTaskComments(boardId, taskId),
  });

export function useBoardsListQuery() {
  return useSuspenseQuery(boardsListOptions());
}

export function useBoardTasksQuery(boardId: string) {
  return useSuspenseQuery(boardTasksOptions(boardId));
}

// Non-suspense: the comment list lives inside the task slide-over panel and renders
// its own inline loading/error, so it must not suspend a parent boundary.
export function useTaskCommentsQuery(boardId: string, taskId: string) {
  return useQuery(taskCommentsOptions(boardId, taskId));
}

export interface TaskMoveVars {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  agentId: string;
}

// Optimistically moves a card between columns (animated via View Transition), rolls
// back on error. Mirrors the connections update mutation's onMutate/onError shape.
export function useChangeTaskStatusMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, toStatus, agentId }: TaskMoveVars) =>
      apiService.changeTaskStatus(boardId, taskId, { status: toStatus, agentId }),
    onMutate: async ({ taskId, fromStatus, toStatus }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.tasks(boardId) });
      const previous = queryClient.getQueryData<BoardColumns>(boardKeys.tasks(boardId));
      const task = previous?.[fromStatus].find((t) => t.id === taskId);
      if (previous && task) {
        const next = { ...previous };
        next[fromStatus] = next[fromStatus].filter((t) => t.id !== taskId);
        next[toStatus] = [{ ...task, status: toStatus }, ...next[toStatus]];
        animateCardMove(taskId, () =>
          queryClient.setQueryData(boardKeys.tasks(boardId), next)
        );
      }
      return { previous };
    },
    onError: (_err, { taskId }, context) => {
      if (context?.previous) {
        animateCardMove(taskId, () =>
          queryClient.setQueryData(boardKeys.tasks(boardId), context.previous)
        );
      }
    },
  });
}

export function useBoardCacheActions() {
  const queryClient = useQueryClient();
  return {
    invalidateBoards: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() }),

    invalidateTasks: (boardId: string) =>
      queryClient.invalidateQueries({ queryKey: boardKeys.tasks(boardId) }),

    invalidateComments: (boardId: string, taskId: string) =>
      queryClient.invalidateQueries({ queryKey: boardKeys.comments(boardId, taskId) }),

    // Realtime: insert a task the server just created, unless the cache already has it.
    upsertTask: (boardId: string, task: BoardTask) =>
      queryClient.setQueryData<BoardColumns>(boardKeys.tasks(boardId), (prev) => {
        if (!prev) return prev;
        const exists = Object.values(prev).some((tasks) => tasks.some((t) => t.id === task.id));
        if (exists) return prev;
        return { ...prev, [task.status]: [task, ...prev[task.status]] };
      }),

    // Realtime: move a task to a new status. Reads fresh cache (not a stale closure),
    // which is why the pre-migration page could act on outdated columns.
    moveTask: (boardId: string, taskId: string, newStatus: TaskStatus) => {
      const prev = queryClient.getQueryData<BoardColumns>(boardKeys.tasks(boardId));
      if (!prev || prev[newStatus].some((t) => t.id === taskId)) return;
      let task: BoardTask | undefined;
      for (const s of TASK_STATUSES) {
        const found = prev[s].find((t) => t.id === taskId);
        if (found) {
          task = found;
          break;
        }
      }
      if (!task) return;
      const next = {} as BoardColumns;
      for (const s of TASK_STATUSES) {
        next[s] = prev[s].filter((t) => t.id !== taskId);
      }
      next[newStatus] = [{ ...task, status: newStatus }, ...next[newStatus]];
      animateCardMove(taskId, () => queryClient.setQueryData(boardKeys.tasks(boardId), next));
    },
  };
}
