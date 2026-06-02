export interface CentrifugoTokenResponse {
  connectionToken: string;
  subscriptionToken: string;
  channel: string;
  wsUrl: string;
}

export interface BoardTaskCreatedPayload {
  boardId: string;
  taskId: string;
  type: 'EPIC' | 'TASK' | 'SUBTASK';
  status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  title: string;
  description: string | null;
  createdByAgentId: string;
  assigneeAgentId: string | null;
  parentTaskId: string | null;
}

export interface BoardTaskStatusChangedPayload {
  boardId: string;
  taskId: string;
  oldStatus: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  newStatus: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
}

export interface BoardTaskCommentCreatedPayload {
  boardId: string;
  taskId: string;
  commentId: string;
  agentId: string;
  content: string;
}

export type BoardEvent =
  | { type: 'board.task.created'; payload: BoardTaskCreatedPayload }
  | { type: 'board.task.statusChanged'; payload: BoardTaskStatusChangedPayload }
  | { type: 'board.task.commentAdded'; payload: BoardTaskCommentCreatedPayload };
