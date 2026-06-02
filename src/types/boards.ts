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
  id: string;
  name: string;
  description: string | null;
  agenticTeamId: string;
  agenticTeamName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description: string | null;
  createdByAgentId: string;
  assigneeAgentId: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTaskComment {
  id: string;
  agentId: string;
  content: string;
  createdAt: string;
}

export interface TasksByStatus {
  tasks: Record<TaskStatus, BoardTask[]>;
}

export interface CreateBoardRequest {
  agenticTeamId: string;
  name: string;
  description?: string;
}

export interface CreateTaskRequest {
  type: TaskType;
  title: string;
  description?: string;
  createdByAgentId: string;
  assigneeAgentId?: string;
  parentTaskId?: string;
}

export interface ChangeTaskStatusRequest {
  status: TaskStatus;
  agentId: string;
}

export interface CreateCommentRequest {
  agentId: string;
  content: string;
}
