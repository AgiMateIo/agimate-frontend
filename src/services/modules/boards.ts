// modules/boards.ts
import { httpClient } from '../httpClient';
import { API } from '@/config/constants';
import type {
  Board,
  BoardTask,
  BoardTaskComment,
  TasksByStatus,
  CreateBoardRequest,
  CreateTaskRequest,
  ChangeTaskStatusRequest,
  CreateCommentRequest,
} from '@/types';

export const boardsApi = {
  // ========== BOARDS ==========

  async getBoards(): Promise<Board[]> {
    return httpClient.get<Board[]>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/`);
  },

  async createBoard(data: CreateBoardRequest): Promise<Board> {
    return httpClient.post<Board>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/`, data);
  },

  async getBoardTasks(boardId: string): Promise<TasksByStatus> {
    return httpClient.get<TasksByStatus>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/${boardId}/tasks/`);
  },

  async createBoardTask(boardId: string, data: CreateTaskRequest): Promise<BoardTask> {
    return httpClient.post<BoardTask>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/${boardId}/tasks/`, data);
  },

  async changeTaskStatus(taskId: string, data: ChangeTaskStatusRequest): Promise<BoardTask> {
    return httpClient.patch<BoardTask>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/status`, data);
  },

  async getTaskComments(taskId: string): Promise<BoardTaskComment[]> {
    return httpClient.get<BoardTaskComment[]>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/comments/`);
  },

  async createTaskComment(taskId: string, data: CreateCommentRequest): Promise<BoardTaskComment> {
    return httpClient.post<BoardTaskComment>(`${API.ENDPOINTS.CONTROL_API}/manage/boards/tasks/${taskId}/comments/`, data);
  },
};
