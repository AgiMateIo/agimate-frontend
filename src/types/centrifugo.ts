import type { TaskStatus, TaskType } from './boards';

export interface CentrifugoTokenResponse {
  connectionToken: string;
  subscriptionToken: string;
  channel: string;
  wsUrl: string;
}

export interface BoardTaskCreatedPayload {
  boardId: string;
  taskId: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description: string | null;
  createdByAgentId: string;
  assigneeAgentId: string | null;
  parentTaskId: string | null;
}

export interface BoardTaskStatusChangedPayload {
  boardId: string;
  taskId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

// Fields of the task changed (not its status — that is `statusChanged`). The
// values themselves are not in the event: re-read the board's tasks.
export interface BoardTaskUpdatedPayload {
  boardId: string;
  taskId: string;
  changedFields: string[];
}

export interface BoardTaskCommentCreatedPayload {
  boardId: string;
  taskId: string;
  commentId: string;
  agentId: string;
  content: string;
}
