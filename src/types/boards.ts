// Board types

export type TaskStatus =
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE';

export type TaskType = 'EPIC' | 'TASK' | 'SUBTASK';

export const TASK_STATUSES: TaskStatus[] = [
  'BACKLOG', 'IN_PROGRESS', 'REVIEW', 'DONE',
];

export const TASK_TYPES: TaskType[] = ['EPIC', 'TASK', 'SUBTASK'];

export interface Board {
  pubId: string;
  name: string;
  description: string | null;
  agenticTeamPubId: string;
  agenticTeamName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTask {
  pubId: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description: string | null;
  createdByAgentPubId: string;
  assigneeAgentPubId: string | null;
  parentTaskPubId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTaskComment {
  pubId: string;
  agentPubId: string;
  content: string;
  createdAt: string;
}

export interface TasksByStatus {
  tasks: Record<TaskStatus, BoardTask[]>;
}

export interface CreateBoardRequest {
  agenticTeamPubId: string;
  name: string;
  description?: string;
}

export interface CreateTaskRequest {
  type: TaskType;
  title: string;
  description?: string;
  createdByAgentPubId: string;
  assigneeAgentPubId?: string;
  parentTaskPubId?: string;
}

export interface ChangeTaskStatusRequest {
  status: TaskStatus;
  agentPubId: string;
}

export interface CreateCommentRequest {
  agentPubId: string;
  content: string;
}
