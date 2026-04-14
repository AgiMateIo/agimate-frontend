export interface CentrifugoTokenResponse {
  connectionToken: string;
  subscriptionToken: string;
  channel: string;
  wsUrl: string;
}

export interface BoardTaskCreatedPayload {
  boardPubId: string;
  taskPubId: string;
  type: 'EPIC' | 'TASK' | 'SUBTASK';
  status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  title: string;
  description: string | null;
  createdByAgentPubId: string;
  assigneeAgentPubId: string | null;
  parentTaskPubId: string | null;
}

export interface BoardTaskStatusChangedPayload {
  boardPubId: string;
  taskPubId: string;
  oldStatus: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  newStatus: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
}

export interface BoardTaskCommentCreatedPayload {
  boardPubId: string;
  taskPubId: string;
  commentPubId: string;
  agentPubId: string;
  content: string;
}

export type BoardEvent =
  | { type: 'board.task.created'; payload: BoardTaskCreatedPayload }
  | { type: 'board.task.statusChanged'; payload: BoardTaskStatusChangedPayload }
  | { type: 'board.task.commentAdded'; payload: BoardTaskCommentCreatedPayload };
